import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { fetchSensorChartData } from "@/lib/api/queries";
import type { ChartDataPoint } from "@/types";

export const dynamic = "force-dynamic";

// device_type_id → sensor category
const TYPE_MAP: Record<number, "temperature" | "humidityAir" | "humiditySoil" | "light"> = {
  1: "temperature",
  2: "humidityAir",
  3: "humiditySoil",
  4: "light",
};

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const gardenIds = searchParams.getAll("gardenId");
  const hours = Math.min(parseInt(searchParams.get("hours") ?? "24", 10) || 24, 168);

  if (!gardenIds.length) {
    return NextResponse.json({
      temperatureChartData: [],
      humidityAirChartData: [],
      humiditySoilChartData: [],
      lightChartData: [],
    });
  }

  // Convert "g5" → 5
  const zoneIds = gardenIds
    .map((id) => parseInt(id.replace(/^g/, ""), 10))
    .filter((n) => !isNaN(n));

  if (!zoneIds.length) {
    return NextResponse.json({
      temperatureChartData: [],
      humidityAirChartData: [],
      humiditySoilChartData: [],
      lightChartData: [],
    });
  }

  const rows = await fetchSensorChartData(zoneIds, hours);

  // Build a gardenIndex map: zoneId → "garden1" | "garden2" | "garden3"
  const gardenIndex = new Map<number, string>();
  zoneIds.forEach((zid, i) => gardenIndex.set(zid, `garden${i + 1}`));

  // Group data by type → by hour bucket → by garden
  type BucketMap = Map<string, Record<string, number | string>>;

  const buckets: Record<string, BucketMap> = {
    temperature: new Map(),
    humidityAir: new Map(),
    humiditySoil: new Map(),
    light: new Map(),
  };

  for (const row of rows) {
    const r = row as { zone_id: number; device_type_id: number; value: number; recorded_at: Date };
    const sensorType = TYPE_MAP[r.device_type_id];
    if (!sensorType) continue;

    const gKey = gardenIndex.get(r.zone_id);
    if (!gKey) continue;

    const dt = new Date(r.recorded_at);
    const timeLabel = `${String(dt.getHours()).padStart(2, "0")}:00`;

    const bucket = buckets[sensorType];
    if (!bucket.has(timeLabel)) {
      bucket.set(timeLabel, { time: timeLabel });
    }
    // Keep latest value per garden per hour bucket
    bucket.get(timeLabel)![gKey] = Number(r.value);
  }

  const toArray = (bucket: BucketMap): ChartDataPoint[] =>
    Array.from(bucket.values()).map((entry) => ({
      time: entry.time as string,
      garden1: entry.garden1 as number | undefined,
      garden2: entry.garden2 as number | undefined,
      garden3: entry.garden3 as number | undefined,
    }));

  return NextResponse.json({
    temperatureChartData: toArray(buckets.temperature),
    humidityAirChartData: toArray(buckets.humidityAir),
    humiditySoilChartData: toArray(buckets.humiditySoil),
    lightChartData: toArray(buckets.light),
  });
}
