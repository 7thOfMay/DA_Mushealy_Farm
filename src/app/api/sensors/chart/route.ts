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

function getBucketHours(hours: number) {
  if (hours <= 24) return 1;
  if (hours <= 72) return 3;
  if (hours <= 168) return 6;
  return 24;
}

function formatBucketLabel(date: Date, bucketHours: number) {
  if (bucketHours >= 24) {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
}

function floorToBucket(date: Date, bucketHours: number) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  const hour = next.getHours();
  next.setHours(hour - (hour % bucketHours));
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

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const gardenIds = searchParams.getAll("gardenId");
  const hours = Math.min(parseInt(searchParams.get("hours") ?? "24", 10) || 24, 24 * 30);

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
    rows = await fetchSensorChartData(zoneIds, hours);
  } catch (err) {
    console.error("[API GET /sensors/chart]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const bucketHours = getBucketHours(hours);
  const gardenIndex = new Map<number, string>();
  zoneIds.forEach((zoneId, index) => gardenIndex.set(zoneId, `garden${index + 1}`));

  type BucketMap = Map<string, BucketRecord>;
  const buckets: Record<string, BucketMap> = {
    temperature: new Map(),
    humidityAir: new Map(),
    humiditySoil: new Map(),
    light: new Map(),
  };

  for (const row of rows) {
    const reading = row as { zone_id: number; device_type_id: number; value: number; recorded_at: Date };
    const sensorType = TYPE_MAP[reading.device_type_id];
    if (!sensorType) continue;

    const gardenKey = gardenIndex.get(reading.zone_id);
    if (!gardenKey) continue;

    const bucketDate = floorToBucket(new Date(reading.recorded_at), bucketHours);
    const bucketKey = `${sensorType}:${bucketDate.toISOString()}`;
    const time = formatBucketLabel(bucketDate, bucketHours);
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
