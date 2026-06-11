import type { Farm, User } from "@/types";

interface ScopeInput {
  farms: Farm[];
  users: User[];
  loggedInUser: User | null;
  selectedFarmerId?: string | null;
}

export function getManagedFarmers(users: User[], loggedInUser: User | null): User[] {
  const farmers = users.filter((user) => user.role === "FARMER");
  if (!loggedInUser || loggedInUser.role !== "ADMIN") return [];

  const managedIds = loggedInUser.managedFarmerIds ?? [];
  if (managedIds.length === 0) return farmers;

  const managedIdSet = new Set(managedIds);
  return farmers.filter((farmer) => managedIdSet.has(farmer.id));
}

export function getDefaultAdminFarmerId(users: User[], loggedInUser: User | null): string | null {
  const managedFarmers = getManagedFarmers(users, loggedInUser);
  return managedFarmers[0]?.id ?? null;
}

export function getVisibleFarmsForViewer(input: ScopeInput): Farm[] {
  const { farms, loggedInUser } = input;

  if (!loggedInUser) return farms;

  if (loggedInUser.role === "FARMER") {
    const ownFarms = farms.filter((farm) => farm.ownerId === loggedInUser.id);
    if (ownFarms.length > 0) return ownFarms;

    const assigned = new Set(loggedInUser.assignedFarmIds ?? []);
    return farms.filter((farm) => assigned.has(farm.id));
  }

  // ADMIN: always sees all farms (full visibility regardless of selectedFarmerId)
  return farms;
}

export function getVisibleFarmIdSet(input: ScopeInput): Set<string> {
  return new Set(getVisibleFarmsForViewer(input).map((farm) => farm.id));
}
