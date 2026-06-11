import { NextResponse } from "next/server";
import { isDbConfigured } from "@/backend/config/db";
import { fetchSensorChartData } from "@/backend/services/queries";
import type { ChartDataPoint } from "@/types";

export const dynamic = "force-dynamic";

const TYPE_MAP: Record<number, "temperature" | "humidityAir" | "humiditySoil" | "light"> = {
  1: "temperature",
  2: "humidityAir",
  3: "humiditySoil",
  4: "light",
};

function getBucketMinutes(hours: number) {
  if (hours <= 1) return 10;
  if (hours <= 24) return 60;
  if (hours <= 72) return 180;
  if (hours <= 168) return 360;
  return 1440;
}

function formatBucketLabel(date: Date, bucketMinutes: number) {
  if (bucketMinutes >= 1440) {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  if (bucketMinutes < 60) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function floorToBucket(date: Date, bucketMinutes: number) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const totalMinutes = next.getHours() * 60 + next.getMinutes();
  const flooredMinutes = totalMinutes - (totalMinutes % bucketMinutes);
  next.setHours(Math.floor(flooredMinutes / 60), flooredMinutes % 60, 0, 0);
  return next;
}

type BucketRecord = {
  time: string;
  timestamp: number;
  garden1Sum?: number;
  garden1Count?: number;
  garden2Sum?: number;
  garden2Count?: number;
  garden3Sum?: number;
  garden3Count?: number;
};

type BucketStatKey =
  | "garden1Sum"
  | "garden1Count"
  | "garden2Sum"
  | "garden2Count"
  | "garden3Sum"
  | "garden3Count";

type BucketStrategy =
  | { unit: "minutes"; size: number }
  | { unit: "milliseconds"; size: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function resolveBucketStrategy(
  hours: number,
  resolution: string | null,
  bucketSecondsRaw: string | null,
  bucketMsRaw: string | null,
): BucketStrategy {
  if (resolution === "realtime") {
    const parsedMs = parseInt(bucketMsRaw ?? "", 10);
    const parsedSeconds = parseFloat(bucketSecondsRaw ?? "");
    const fallbackMs = hours <= 1 ? 5_000 : 30_000;
    const bucketMs = Number.isFinite(parsedMs) && parsedMs > 0
      ? parsedMs
      : Number.isFinite(parsedSeconds) && parsedSeconds > 0
        ? Math.round(parsedSeconds * 1000)
        : fallbackMs;
    return {
      unit: "milliseconds",
      size: clamp(bucketMs, 100, hours <= 1 ? 60_000 : 300_000),
    };
  }

  return {
    unit: "minutes",
    size: getBucketMinutes(hours),
  };
}

function formatBucketTime(date: Date, strategy: BucketStrategy) {
  if (strategy.unit === "milliseconds") {
    const base = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
    if (strategy.size < 1000) {
      return `${base}.${String(date.getMilliseconds()).padStart(3, "0")}`;
    }
    return base;
  }

  return formatBucketLabel(date, strategy.size);
}

function floorToResolvedBucket(date: Date, strategy: BucketStrategy) {
  if (strategy.unit === "milliseconds") {
    const bucketMs = strategy.size;
    return new Date(Math.floor(date.getTime() / bucketMs) * bucketMs);
  }

  return floorToBucket(date, strategy.size);
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const gardenIds = searchParams.getAll("gardenId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const startAt = searchParams.get("startAt");
  const endAt = searchParams.get("endAt");
  const windowMinutesRaw = searchParams.get("windowMinutes");
  const resolution = searchParams.get("resolution");
  const bucketSeconds = searchParams.get("bucketSeconds");
  const bucketMs = searchParams.get("bucketMs");
  const windowMinutes = Math.min(Math.max(parseInt(windowMinutesRaw ?? "0", 10) || 0, 0), 24 * 60 * 30);
  const fallbackHours = Math.min(parseFloat(searchParams.get("hours") ?? "24") || 24, 24 * 30);
  const derivedHours =
    startAt && endAt
      ? Math.min(
          Math.max(
            0.01,
            (new Date(endAt).getTime() - new Date(startAt).getTime()) / (60 * 60 * 1000),
          ),
          24 * 30,
        )
      : startDate && endDate
      ? Math.min(
          Math.max(
            1,
            Math.ceil((new Date(`${endDate}T23:59:59`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / (60 * 60 * 1000)),
          ),
          24 * 30,
        )
      : windowMinutes > 0
        ? windowMinutes / 60
        : fallbackHours;
  const hours = derivedHours;

  if (!gardenIds.length) {
    return NextResponse.json({
      temperatureChartData: [],
      humidityAirChartData: [],
      humiditySoilChartData: [],
      lightChartData: [],
    });
  }

  const zoneIds = gardenIds
    .map((id) => parseInt(id.replace(/^g/, ""), 10))
    .filter((value) => !isNaN(value));

  if (!zoneIds.length) {
    return NextResponse.json({
      temperatureChartData: [],
      humidityAirChartData: [],
      humiditySoilChartData: [],
      lightChartData: [],
    });
  }

  let rows;
  try {
    rows = await fetchSensorChartData(zoneIds, hours, {
      startAt,
      endAt,
    });
  } catch (err) {
    console.error("[API GET /sensors/chart]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const filteredRows =
    startAt && endAt
      ? rows.filter((row) => {
          const reading = row as { recorded_at: Date | string };
          const recordedAt = new Date(reading.recorded_at).getTime();
          return recordedAt >= new Date(startAt).getTime() && recordedAt <= new Date(endAt).getTime();
        })
      : startDate && endDate
      ? rows.filter((row) => {
          const reading = row as { recorded_at: Date | string };
          const recordedAt = new Date(reading.recorded_at).getTime();
          return (
            recordedAt >= new Date(`${startDate}T00:00:00`).getTime() &&
            recordedAt < new Date(`${endDate}T23:59:59.999`).getTime()
          );
        })
      : rows;

  const bucketStrategy = resolveBucketStrategy(hours, resolution, bucketSeconds, bucketMs);
  const gardenIndex = new Map<number, string>();
  zoneIds.forEach((zoneId, index) => gardenIndex.set(zoneId, `garden${index + 1}`));

  type BucketMap = Map<string, BucketRecord>;
  const buckets: Record<string, BucketMap> = {
    temperature: new Map(),
    humidityAir: new Map(),
    humiditySoil: new Map(),
    light: new Map(),
  };

  for (const row of filteredRows) {
    const reading = row as { zone_id: number; device_type_id: number; value: number; recorded_at: Date };
    const sensorType = TYPE_MAP[reading.device_type_id];
    if (!sensorType) continue;

    const gardenKey = gardenIndex.get(reading.zone_id);
    if (!gardenKey) continue;

    const bucketDate = floorToResolvedBucket(new Date(reading.recorded_at), bucketStrategy);
    const bucketKey = `${sensorType}:${bucketDate.toISOString()}`;
    const time = formatBucketTime(bucketDate, bucketStrategy);
    const bucket = buckets[sensorType];

    if (!bucket.has(bucketKey)) {
      bucket.set(bucketKey, {
        time,
        timestamp: bucketDate.getTime(),
      });
    }

    const target = bucket.get(bucketKey)!;
    const sumKey = `${gardenKey}Sum` as BucketStatKey;
    const countKey = `${gardenKey}Count` as BucketStatKey;
    target[sumKey] = (target[sumKey] ?? 0) + Number(reading.value);
    target[countKey] = (target[countKey] ?? 0) + 1;
  }

  const toArray = (bucket: BucketMap): ChartDataPoint[] =>
    Array.from(bucket.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((entry) => ({
        time: entry.time,
        garden1: entry.garden1Count ? Number(((entry.garden1Sum ?? 0) / entry.garden1Count).toFixed(2)) : undefined,
        garden2: entry.garden2Count ? Number(((entry.garden2Sum ?? 0) / entry.garden2Count).toFixed(2)) : undefined,
        garden3: entry.garden3Count ? Number(((entry.garden3Sum ?? 0) / entry.garden3Count).toFixed(2)) : undefined,
      }));

  return NextResponse.json({
    temperatureChartData: toArray(buckets.temperature),
    humidityAirChartData: toArray(buckets.humidityAir),
    humiditySoilChartData: toArray(buckets.humiditySoil),
    lightChartData: toArray(buckets.light),
  });
}
