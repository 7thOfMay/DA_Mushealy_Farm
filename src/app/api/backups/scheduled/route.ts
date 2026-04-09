import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Scheduled backup endpoint.
 * Meant to be called by a cron job (e.g., Vercel Cron, external scheduler).
 * GET /api/backups/scheduled
 */
export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/backups/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupType: "auto", createdBy: null }),
    });

    const data = await res.json();

    if (data.ok) {
      return NextResponse.json({
        ok: true,
        message: `Scheduled backup completed: ${data.fileName} (${data.fileSizeMb} MB)`,
        backupId: data.backupId,
      });
    }

    return NextResponse.json({
      ok: false,
      message: "Scheduled backup failed",
      error: data.error,
    }, { status: 500 });
  } catch (err) {
    console.error("[SCHEDULED BACKUP]", err);
    return NextResponse.json({
      ok: false,
      message: "Scheduled backup error",
      error: String(err),
    }, { status: 500 });
  }
}
