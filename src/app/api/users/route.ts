import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/backend/config/db";
import { fetchUsers, insertUser, updateUser, deleteUser } from "@/backend/services/queries";
import { isAdminRequest } from "@/backend/middleware/auth";
import { createHash } from "crypto";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const users = await fetchUsers();
    return NextResponse.json(users);
  } catch (err) {
    console.error("[API GET /users]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Chỉ Admin mới có quyền tạo tài khoản" }, { status: 403 });
  }
  try {
    const body = await request.json() as {
      username?: string; email?: string; password?: string;
      fullName?: string | null; phone?: string | null; roleId?: number;
    };
    if (!body.username?.trim() || !body.email?.trim() || !body.password) {
      return NextResponse.json({ error: "username, email, and password are required" }, { status: 400 });
    }
    const passwordHash = createHash("sha256").update(body.password).digest("hex");
    const userId = await insertUser(
      body.username.trim(), body.email.trim(), passwordHash,
      body.fullName ?? null, body.phone ?? null, body.roleId ?? 3,
    );
    return NextResponse.json({ ok: true, userId: `u${userId}` });
  } catch (err) {
    console.error("[API POST /users]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Chỉ Admin mới có quyền chỉnh sửa tài khoản" }, { status: 403 });
  }
  try {
    const body = await request.json() as {
      userId?: string; fullName?: string; phone?: string | null;
      roleId?: number; isActive?: boolean;
    };
    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const numId = parseInt(body.userId.replace(/^u/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    await updateUser(numId, {
      full_name: body.fullName, phone: body.phone,
      role_id: body.roleId, is_active: body.isActive,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API PUT /users]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Chỉ Admin mới có quyền xóa tài khoản" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const numId = parseInt(userId.replace(/^u/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    await deleteUser(numId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API DELETE /users]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
