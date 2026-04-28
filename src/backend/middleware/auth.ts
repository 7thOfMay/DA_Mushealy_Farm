/**
 * Server-only auth utilities for API routes.
 * Do NOT import this file from client components.
 */
import { cookies } from "next/headers";

/**
 * Check if the current request is from an authenticated Admin user.
 * Reads the nongtech_role cookie set during login.
 */
export function isAdminRequest(): boolean {
  try {
    const cookieStore = cookies();
    const auth = cookieStore.get("nongtech_auth")?.value;
    const role = cookieStore.get("nongtech_role")?.value;
    return auth === "1" && role === "ADMIN";
  } catch {
    return false;
  }
}
