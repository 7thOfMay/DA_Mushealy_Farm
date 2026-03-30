import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/lib/db";
import { fetchAlerts, updateAlertStatus } from "@/lib/api/queries";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const alerts = await fetchAlerts();
  return NextResponse.json(alerts);
}

export async function PATCH(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await request.json() as {
    alertId?: string;
    status?: "processing" | "resolved";
    userId?: string;
  };

  if (!body.alertId || !body.status || !body.userId) {
    return NextResponse.json({ error: "alertId, status, and userId are required" }, { status: 400 });
  }

  const alertNumId = parseInt(body.alertId.replace(/^a/, ""), 10);
  const userNumId = parseInt(body.userId.replace(/^u/, ""), 10);

  if (isNaN(alertNumId) || isNaN(userNumId)) {
    return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
  }

  await updateAlertStatus(alertNumId, body.status, userNumId);
  return NextResponse.json({ ok: true });
}
