import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { fetchZoneThresholds } from "@/lib/api/queries";

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
