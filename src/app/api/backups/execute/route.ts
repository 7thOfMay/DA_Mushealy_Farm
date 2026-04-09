import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir, stat } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth.server";
import { insertBackup, updateBackup, insertSystemLog } from "@/lib/api/queries";

const execFileAsync = promisify(execFile);

const BACKUP_DIR = path.join(process.cwd(), "backups");

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Chỉ Admin mới có quyền sao lưu cơ sở dữ liệu" }, { status: 403 });
  }

  try {
    const body = await request.json() as {
      backupType?: "manual" | "auto";
      createdBy?: number | null;
    };

    const backupType = body.backupType ?? "manual";
    const createdBy = body.createdBy ?? null;

    // Ensure backup directory exists
    await mkdir(BACKUP_DIR, { recursive: true });

    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const fileName = `smart_farm_${backupType}_${stamp}.sql`;
    const filePath = path.join(BACKUP_DIR, fileName);

    // Create backup record with in_progress status
    const backupId = await insertBackup(backupType, fileName, createdBy);

    // Build pg_dump connection string from environment
    const pgHost = process.env.POSTGRES_HOST || process.env.DB_HOST || process.env.PGHOST || "localhost";
    const pgPort = process.env.POSTGRES_PORT || process.env.DB_PORT || process.env.PGPORT || "5432";
    const pgUser = process.env.POSTGRES_USER || process.env.DB_USER || process.env.PGUSER || "postgres";
    const pgPassword = process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || process.env.PGPASSWORD || "";
    const pgDatabase = process.env.POSTGRES_DATABASE || process.env.DB_NAME || process.env.PGDATABASE || "smart_farm";

    try {
      // Execute pg_dump
      const { stdout } = await execFileAsync("pg_dump", [
        "-h", pgHost,
        "-p", pgPort,
        "-U", pgUser,
        "-d", pgDatabase,
        "--no-owner",
        "--no-acl",
        "--format=plain",
      ], {
        env: { ...process.env, PGPASSWORD: pgPassword },
        maxBuffer: 100 * 1024 * 1024, // 100MB
        timeout: 120000, // 2 minutes
      });

      // Write dump to file
      await writeFile(filePath, stdout, "utf-8");

      // Get file size
      const fileStat = await stat(filePath);
      const fileSizeBytes = fileStat.size;

      // Update backup record
      await updateBackup(backupId, {
        status: "completed",
        file_size_bytes: fileSizeBytes,
        completed_at: true,
      });

      // Log
      const sizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(2);
      await insertSystemLog(
        createdBy,
        "backup",
        "backup",
        backupId,
        `Sao lưu CSDL thành công: ${fileName} (${sizeMb} MB)`,
        null,
        null,
      );

      return NextResponse.json({
        ok: true,
        backupId: `bk${backupId}`,
        fileName,
        fileSizeBytes,
        fileSizeMb: sizeMb,
      });
    } catch (dumpError) {
      // pg_dump failed - update record as failed
      await updateBackup(backupId, { status: "failed" });
      await insertSystemLog(
        createdBy,
        "backup",
        "backup",
        backupId,
        `Sao lưu CSDL thất bại: ${String(dumpError)}`,
        null,
        null,
      );

      console.error("[BACKUP] pg_dump failed:", dumpError);
      return NextResponse.json({
        ok: false,
        backupId: `bk${backupId}`,
        error: "pg_dump failed. Ensure pg_dump is available in PATH.",
      }, { status: 500 });
    }
  } catch (err) {
    console.error("[API POST /backups/execute]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
