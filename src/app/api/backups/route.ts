import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/lib/db";
import { fetchBackups, insertBackup, updateBackup } from "@/lib/api/queries";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const backups = await fetchBackups();
    return NextResponse.json(backups);
  } catch (err) {
    console.error("[API GET /backups]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json() as {
      backupType?: string; filePath?: string; createdBy?: number | null;
    };
    if (!body.backupType?.trim() || !body.filePath?.trim()) {
      return NextResponse.json({ error: "backupType and filePath are required" }, { status: 400 });
    }
    const backupId = await insertBackup(
      body.backupType.trim(), body.filePath.trim(), body.createdBy ?? null,
    );
    return NextResponse.json({ ok: true, backupId: `bk${backupId}` });
  } catch (err) {
    console.error("[API POST /backups]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json() as {
      backupId?: string; status?: string; fileSizeBytes?: number; markCompleted?: boolean;
    };
    if (!body.backupId) {
      return NextResponse.json({ error: "backupId is required" }, { status: 400 });
    }
    const numId = parseInt(body.backupId.replace(/^bk/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid backupId" }, { status: 400 });
    }
    await updateBackup(numId, {
      status: body.status, file_size_bytes: body.fileSizeBytes,
      completed_at: body.markCompleted,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API PUT /backups]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
