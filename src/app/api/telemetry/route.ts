import { NextResponse } from "next/server";
import { query } from "@/backend/config/db";

export const dynamic = "force-dynamic";

// Mapping key từ CoreIoT payload → device_code trong DB
// Dùng device_code thay vì hardcode device_id để tránh sai khi re-seed
const FEED_TO_DEVICE_CODE: Record<string, string> = {
  temperature:  "DEV-TEMP-01",
  humidity:     "DEV-AIR-01",
  soil:         "DEV-SOIL-01",
  light:        "DEV-LIGHT-01",
  pump_status:  "DEV-PUMP-01",
  light_status: "DEV-LAMP-01",
};

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Empty payload" }, { status: 400 });
  }

  // Lấy các key có trong payload
  const activeKeys = Object.keys(FEED_TO_DEVICE_CODE).filter((k) => k in body);
  if (activeKeys.length === 0) {
    return NextResponse.json({ error: "No recognized sensor keys in payload" }, { status: 400 });
  }

  // Lookup device_id và zone_id từ device_code một lần duy nhất
  const codes = activeKeys.map((k) => FEED_TO_DEVICE_CODE[k]);
  const placeholders = codes.map((_, i) => `$${i + 1}`).join(", ");
  const deviceRows = await query<{ device_id: number; device_code: string; zone_id: number }>(
    `SELECT device_id, device_code, zone_id FROM devices WHERE device_code IN (${placeholders})`,
    codes,
  );

  if (deviceRows.length === 0) {
    return NextResponse.json({ error: "No matching devices found in DB" }, { status: 400 });
  }

  const codeToRow = new Map(deviceRows.map((r) => [r.device_code, r]));

  // Thu thập tất cả zone_id có trong telemetry này
  const zoneIdSet = new Set<number>();
  for (const r of deviceRows) zoneIdSet.add(r.zone_id);
  const affectedZoneIds = Array.from(zoneIdSet);

  const now = new Date().toISOString();
  const inserts: Promise<unknown>[] = [];

  for (const key of activeKeys) {
    const row = codeToRow.get(FEED_TO_DEVICE_CODE[key]);
    if (!row) continue;

    let val = body[key];
    // boolean → 0/1
    if (typeof val === "boolean") val = val ? 1 : 0;
    const numVal = Number(val);
    if (isNaN(numVal)) continue;

    inserts.push(
      query(
        `INSERT INTO sensor_data (device_id, value, recorded_at, synced)
         VALUES ($1, $2, $3, TRUE)`,
        [row.device_id, numVal, now],
      ),
    );
  }

  // Khi telemetry đến từ một zone → mark TẤT CẢ thiết bị trong zone đó là online
  // (bao gồm cả pump, fan, valve không có feed riêng)
  const zoneIdPlaceholders = affectedZoneIds.map((_, i) => `$${i + 2}`).join(", ");
  inserts.push(
    query(
      `UPDATE devices SET status = 'online', last_updated = $1
       WHERE zone_id IN (${zoneIdPlaceholders})`,
      [now, ...affectedZoneIds],
    ),
  );

  try {
    await Promise.all(inserts);
    console.log(`[Telemetry] Saved ${inserts.length - 1} readings, marked zones ${affectedZoneIds} online at ${now}`);
    return NextResponse.json({ status: "success", saved: inserts.length - 1, zonesOnline: affectedZoneIds });
  } catch (err) {
    console.error("[Telemetry] DB error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Health check cho CoreIoT ping
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "/api/telemetry" });
}
