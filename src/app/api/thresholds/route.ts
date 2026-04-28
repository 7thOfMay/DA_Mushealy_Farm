import { NextResponse } from "next/server";
import { isDbConfigured } from "@/backend/config/db";
import { fetchZoneThresholds } from "@/backend/services/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const thresholds = await fetchZoneThresholds();
    return NextResponse.json(thresholds);
  } catch (err) {
    console.error("[API GET /thresholds]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
