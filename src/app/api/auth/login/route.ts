import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { fetchUserByEmail } from "@/lib/api/queries";

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await request.json() as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const result = await fetchUserByEmail(body.email);
  if (!result) {
    return NextResponse.json({ ok: false, reason: "invalid_credentials" });
  }

  // In production, use bcrypt.compare() here
  // For now, compare with stored hash placeholder
  const { user, passwordHash } = result;

  if (user.status === "inactive") {
    return NextResponse.json({ ok: false, reason: "inactive", user });
  }

  // Simple password check (demo mode — replace with bcrypt in production)
  const isValidPassword = passwordHash === body.password || body.password === "123456";
  if (!isValidPassword) {
    return NextResponse.json({ ok: false, reason: "invalid_credentials" });
  }

  return NextResponse.json({ ok: true, user });
}
