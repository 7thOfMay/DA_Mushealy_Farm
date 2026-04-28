import { NextResponse } from "next/server";
import { isDbConfigured } from "@/backend/config/db";
import { fetchSensorSummaries } from "@/backend/services/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const summaries = await fetchSensorSummaries();
    return NextResponse.json(summaries);
  } catch (err) {
    console.error("[API GET /sensors]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
