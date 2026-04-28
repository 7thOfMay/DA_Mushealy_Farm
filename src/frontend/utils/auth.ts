import type { User } from "@/types";

export function isAdmin(user: User | null): boolean {
  return user?.role === "ADMIN";
}

export function isActiveUser(user: User | null): boolean {
  return !!user && user.status === "active";
}

export function hasFarmAccess(user: User | null, farmId: string): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const allowed = user.assignedFarmIds ?? [];
  return allowed.includes(farmId);
}

export function getAuthStorageKeys() {
  return {
    authCookie: "nongtech_auth",
    roleCookie: "nongtech_role",
    sessionUserId: "nongtech-session-user-id",
  };
}
