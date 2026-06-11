import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isDbConfigured, query } from "@/backend/config/db";
import { sendDeviceCommand, insertSystemLog } from "@/backend/services/queries";

// Map device_type_id → CoreIoT RPC method
const DEVICE_TYPE_TO_RPC: Record<number, string> = {
  5: "setPumpStatus",
  6: "setPumpStatus",
  7: "setLightStatus",
  8: "setLightStatus",
  9: "setPumpStatus",   // fan
  10: "setPumpStatus",  // valve
};

const COREIOT_URL = "https://app.coreiot.io";
const COREIOT_TOKEN =
  process.env.COREIOT_TOKEN ?? "1omr8yulbsmbyugm9yof";

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

  // Gọi CoreIoT trực tiếp để điều khiển thiết bị vật lý
  // Flow: Vercel → CoreIoT → IoT Device (không cần qua gateway)
  try {
    const deviceRow = await query<{ device_type_id: number }>(
      `SELECT device_type_id FROM devices WHERE device_id = $1`,
      [deviceNumId],
    );
    const typeId = deviceRow[0]?.device_type_id;
    const rpcMethod = typeId ? DEVICE_TYPE_TO_RPC[typeId] : undefined;

    if (rpcMethod) {
      const isOn = body.command === "turn_on";
      await fetch(`${COREIOT_URL}/api/v1/${COREIOT_TOKEN}/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _trigger_rpc: true,
          method: rpcMethod,
          params: String(isOn),
        }),
        signal: AbortSignal.timeout(8000),
      });
    }
  } catch (err) {
    // Không fail request nếu CoreIoT không trả lời (non-critical)
    console.warn("[Command] CoreIoT RPC failed (non-critical):", err);
  }

  return NextResponse.json({ ok: true });
}
