import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { fetchSensorSummaries } from "@/lib/api/queries";

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
