import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { fetchSensorSummaries } from "@/lib/api/queries";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const summaries = await fetchSensorSummaries();
  return NextResponse.json(summaries);
}
