import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { fetchSystemLogs } from "@/lib/api/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);
    const safeLimit = Math.min(Math.max(1, limit), 500);

    const logs = await fetchSystemLogs(safeLimit);
    return NextResponse.json(logs);
  } catch (err) {
    console.error("[API /logs]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
