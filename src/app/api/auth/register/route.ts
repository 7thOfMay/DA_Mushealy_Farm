import { NextResponse } from "next/server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/lib/db";
import { fetchUserByEmail, insertUser, insertSystemLog } from "@/lib/api/queries";

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await request.json() as {
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
  };

  if (!body.fullName?.trim() || !body.email?.trim() || !body.password) {
    return NextResponse.json({ error: "Họ tên, email và mật khẩu là bắt buộc" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const fullName = body.fullName.trim();

  if (body.password.length < 6) {
    return NextResponse.json({ ok: false, reason: "password_too_short" });
  }

  // Check duplicate email
  const existing = await fetchUserByEmail(email);
  if (existing) {
    return NextResponse.json({ ok: false, reason: "email_exists" });
  }

  // Generate username from email prefix
  const username = email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "");

  // Hash password with SHA-256 (consistent with existing user creation in /api/users)
  const passwordHash = createHash("sha256").update(body.password).digest("hex");

  // Role 3 = User, is_active = false (requires admin approval)
  const userId = await insertUser(
    username,
    email,
    passwordHash,
    fullName,
    body.phone?.trim() || null,
    3,
    false,
  );

  // Log the registration
  await insertSystemLog(
    null,
    "user_register",
    "user",
    userId,
    `Đăng ký tài khoản mới: ${fullName} (${email})`,
    null,
    null,
  );

  return NextResponse.json({ ok: true, userId: `u${userId}` });
}
