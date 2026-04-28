import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/backend/config/db";
import { fetchSchedules, insertSchedule, updateSchedule, deleteSchedule } from "@/backend/services/queries";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const schedules = await fetchSchedules();
    return NextResponse.json(schedules);
  } catch (err) {
    console.error("[API GET /schedules]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json() as {
      gardenId?: string; deviceId?: string; scheduleType?: string;
      startTime?: string; endTime?: string; dayOfWeek?: number | null;
      durationSeconds?: number | null; createdBy?: number | null;
    };
    if (!body.gardenId || !body.deviceId) {
      return NextResponse.json({ error: "gardenId and deviceId are required" }, { status: 400 });
    }
    const numZoneId = parseInt(body.gardenId.replace(/^g/, ""), 10);
    const numDeviceId = parseInt(body.deviceId.replace(/^d/, ""), 10);
    if (isNaN(numZoneId) || isNaN(numDeviceId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }
    const scheduleId = await insertSchedule(
      numZoneId, numDeviceId, body.scheduleType ?? null,
      body.startTime ?? null, body.endTime ?? null,
      body.dayOfWeek ?? null, body.durationSeconds ?? null, body.createdBy ?? null,
    );
    return NextResponse.json({ ok: true, scheduleId: `sc${scheduleId}` });
  } catch (err) {
    console.error("[API POST /schedules]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json() as {
      scheduleId?: string; scheduleType?: string; startTime?: string;
      endTime?: string; dayOfWeek?: number | null; durationSeconds?: number | null;
      isActive?: boolean;
    };
    if (!body.scheduleId) {
      return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
    }
    const numId = parseInt(body.scheduleId.replace(/^sc/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid scheduleId" }, { status: 400 });
    }
    await updateSchedule(numId, {
      schedule_type: body.scheduleType, start_time: body.startTime,
      end_time: body.endTime, day_of_week: body.dayOfWeek,
      duration_seconds: body.durationSeconds, is_active: body.isActive,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API PUT /schedules]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");
    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
    }
    const numId = parseInt(scheduleId.replace(/^sc/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid scheduleId" }, { status: 400 });
    }
    await deleteSchedule(numId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API DELETE /schedules]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
