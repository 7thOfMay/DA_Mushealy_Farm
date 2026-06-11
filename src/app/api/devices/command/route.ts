import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isDbConfigured, query } from "@/backend/config/db";
import { sendDeviceCommand, insertSystemLog } from "@/backend/services/queries";

// Map device_type_id → CoreIoT device key
const DEVICE_TYPE_TO_COREIOT: Record<number, "pump" | "light"> = {
  5: "pump",   // pump
  6: "pump",
  7: "light",  // led_rgb
  8: "light",
  9: "pump",   // fan → pump channel
  10: "pump",  // valve → pump channel
};

const GATEWAY_URL =
  process.env.GATEWAY_URL ?? "https://da-mushealy-farm-1.onrender.com";

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await request.json() as {
    deviceId?: string;
    command?: string;
    params?: Record<string, unknown>;
    userId?: string;
  };

  if (!body.deviceId || !body.command) {
    return NextResponse.json({ error: "deviceId and command are required" }, { status: 400 });
  }

  const deviceNumId = parseInt(body.deviceId.replace(/^d/, ""), 10);
  const userNumId = body.userId ? parseInt(body.userId.replace(/^u/, ""), 10) : null;

  if (isNaN(deviceNumId)) {
    return NextResponse.json({ error: "Invalid deviceId" }, { status: 400 });
  }

  await sendDeviceCommand(deviceNumId, body.command, body.params ?? {}, userNumId);

  await insertSystemLog(
    userNumId,
    "device_toggle",
    "devices",
    deviceNumId,
    `${body.command} thiết bị #${deviceNumId}`,
  );

  // Gửi lệnh tới CoreIoT thông qua gateway để điều khiển thiết bị vật lý
  try {
    const deviceRow = await query<{ device_type_id: number }>(
      `SELECT device_type_id FROM devices WHERE device_id = $1`,
      [deviceNumId],
    );
    const typeId = deviceRow[0]?.device_type_id;
    const coreiotDevice = typeId ? DEVICE_TYPE_TO_COREIOT[typeId] : undefined;

    if (coreiotDevice) {
      const coreiotStatus = body.command === "turn_on" ? "true" : "false";
      await fetch(`${GATEWAY_URL}/api/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: coreiotDevice, status: coreiotStatus }),
        signal: AbortSignal.timeout(8000),
      });
    }
  } catch (err) {
    // Không fail toàn bộ request nếu gateway timeout (Render free tier có thể sleep)
    console.warn("[Command] CoreIoT control failed (non-critical):", err);
  }

  return NextResponse.json({ ok: true });
}
