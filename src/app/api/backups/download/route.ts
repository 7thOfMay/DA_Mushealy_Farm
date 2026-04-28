import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/backend/config/db";
import { queryOne } from "@/backend/config/db";
import { isAdminRequest } from "@/backend/middleware/auth";

const BACKUP_DIR = path.join(process.cwd(), "backups");

export async function GET(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Chỉ Admin mới có quyền tải xuống bản sao lưu CSDL" }, { status: 403 });
  }

  const backupId = request.nextUrl.searchParams.get("backupId");
  if (!backupId) {
    return NextResponse.json({ error: "backupId is required" }, { status: 400 });
  }

  const numId = parseInt(backupId.replace(/^bk/, ""), 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid backupId" }, { status: 400 });
  }

  try {
    // Fetch backup record
    const row = await queryOne<{ file_path: string; status: string }>(
      "SELECT file_path, status FROM data_backups WHERE backup_id = $1",
      [numId],
    );

    if (!row) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    if (row.status !== "completed") {
      return NextResponse.json({ error: "Backup is not completed" }, { status: 400 });
    }

    const filePath = path.join(BACKUP_DIR, row.file_path);

    // Check file exists
    try {
      await stat(filePath);
    } catch {
      return NextResponse.json({ error: "Backup file not found on disk" }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${row.file_path}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (err) {
    console.error("[API GET /backups/download]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
