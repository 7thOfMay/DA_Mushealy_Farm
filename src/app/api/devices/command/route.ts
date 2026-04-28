import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/backend/config/db";
import { sendDeviceCommand, insertSystemLog } from "@/backend/services/queries";

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

  return NextResponse.json({ ok: true });
}
