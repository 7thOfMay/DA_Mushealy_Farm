import { NextResponse } from "next/server";
import { query } from "@/backend/config/db";

export const dynamic = "force-dynamic";

// Mapping key từ CoreIoT payload → device_id trong DB
// Khớp với FEED_TO_DEVICE trong gateway/config.py
const FEED_TO_DEVICE: Record<string, number> = {
  temperature:  1,
  humidity:     2,
  soil:         3,
  light:        4,
  pump_status:  5,
  light_status: 8,
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

  const now = new Date().toISOString();
  const inserts: Promise<unknown>[] = [];

  for (const key of Object.keys(FEED_TO_DEVICE)) {
    if (!(key in body)) continue;

    let val = body[key];
    // boolean → 0/1
    if (typeof val === "boolean") val = val ? 1 : 0;
    const numVal = Number(val);
    if (isNaN(numVal)) continue;

    const deviceId = FEED_TO_DEVICE[key];
    inserts.push(
      query(
        `INSERT INTO sensor_data (device_id, value, recorded_at, synced)
         VALUES ($1, $2, $3, TRUE)`,
        [deviceId, numVal, now],
      ).then(() =>
        query(
          `UPDATE devices SET status = 'online', last_updated = $1 WHERE device_id = $2`,
          [now, deviceId],
        ),
      ),
    );
  }

  if (inserts.length === 0) {
    return NextResponse.json({ error: "No recognized sensor keys in payload" }, { status: 400 });
  }

  try {
    await Promise.all(inserts);
    console.log(`[Telemetry] Saved ${inserts.length} readings at ${now}`);
    return NextResponse.json({ status: "success", saved: inserts.length });
  } catch (err) {
    console.error("[Telemetry] DB error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Health check cho CoreIoT ping
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "/api/telemetry" });
}
