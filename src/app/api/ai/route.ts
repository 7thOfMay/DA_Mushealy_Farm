import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/lib/db";
import { fetchAIAnalyses } from "@/lib/api/queries";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const analyses = await fetchAIAnalyses();
    return NextResponse.json(analyses);
  } catch (err) {
    console.error("[API GET /ai]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
