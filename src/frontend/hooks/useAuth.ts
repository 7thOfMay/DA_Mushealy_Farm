"use client";

import { useMemo } from "react";
import { useAppStore } from "@/frontend/context/store";
import { hasFarmAccess, isActiveUser, isAdmin } from "@/frontend/utils/auth";

export function useAuth() {
  const loggedInUser = useAppStore((state) => state.loggedInUser);

  return useMemo(
    () => ({
      user: loggedInUser,
      isAuthenticated: !!loggedInUser,
      isAdmin: isAdmin(loggedInUser),
      isActive: isActiveUser(loggedInUser),
      canAccessFarm: (farmId: string) => hasFarmAccess(loggedInUser, farmId),
    }),
    [loggedInUser]
  );
}
