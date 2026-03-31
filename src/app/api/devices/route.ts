import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";
import { fetchDevices, fetchDevicesByZoneId, insertDevice, updateDevice, deleteDevice } from "@/lib/api/queries";

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const gardenId = searchParams.get("gardenId");

    if (gardenId) {
      const numId = parseInt(gardenId.replace(/^g/, ""), 10);
      if (isNaN(numId)) {
        return NextResponse.json({ error: "Invalid gardenId" }, { status: 400 });
      }
      const devices = await fetchDevicesByZoneId(numId);
      return NextResponse.json(devices);
    }

    const devices = await fetchDevices();
    return NextResponse.json(devices);
  } catch (err) {
    console.error("[API GET /devices]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json() as {
      deviceCode?: string; name?: string; deviceTypeId?: number;
      gardenId?: string; installLocation?: string | null; isControllable?: boolean;
    };
    if (!body.deviceCode?.trim() || !body.name?.trim() || !body.deviceTypeId || !body.gardenId) {
      return NextResponse.json({ error: "deviceCode, name, deviceTypeId, and gardenId are required" }, { status: 400 });
    }
    const numZoneId = parseInt(body.gardenId.replace(/^g/, ""), 10);
    if (isNaN(numZoneId)) {
      return NextResponse.json({ error: "Invalid gardenId" }, { status: 400 });
    }
    const deviceId = await insertDevice(
      body.deviceCode.trim(), body.name.trim(), body.deviceTypeId,
      numZoneId, body.installLocation ?? null, body.isControllable ?? false,
    );
    return NextResponse.json({ ok: true, deviceId: `d${deviceId}` });
  } catch (err) {
    console.error("[API POST /devices]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json() as {
      deviceId?: string; name?: string; status?: string; installLocation?: string;
    };
    if (!body.deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
    }
    const numId = parseInt(body.deviceId.replace(/^d/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid deviceId" }, { status: 400 });
    }
    await updateDevice(numId, {
      device_name: body.name, status: body.status, install_location: body.installLocation,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API PUT /devices]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
    }
    const numId = parseInt(deviceId.replace(/^d/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid deviceId" }, { status: 400 });
    }
    await deleteDevice(numId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API DELETE /devices]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
