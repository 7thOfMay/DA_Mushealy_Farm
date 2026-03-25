import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { fetchZoneThresholds } from "@/lib/api/queries";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const thresholds = await fetchZoneThresholds();
  return NextResponse.json(thresholds);
}
