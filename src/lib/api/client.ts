/**
 * Client-side API service for fetching data from Next.js API routes.
 * Falls back gracefully when the database is not configured (status 503).
 */

import type {
  User,
  Farm,
  Garden,
  Device,
  Alert,
  AlertRule,
  Schedule,
  SystemLog,
  BackupRecord,
  AIAnalysis,
  GardenSensorSummary,
  ZoneThresholds,
  ChartDataPoint,
} from "@/types";

const BASE = "/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (res.status === 503) return null; // DB not configured, use local data
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────

export async function apiGetUsers(): Promise<User[] | null> {
  return fetchJson<User[]>(`${BASE}/users`);
}

export async function apiCreateUser(
  username: string, email: string, password: string,
  fullName?: string | null, phone?: string | null, roleId?: number,
): Promise<{ ok: boolean; userId?: string } | null> {
  return fetchJson<{ ok: boolean; userId?: string }>(`${BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, fullName, phone, roleId }),
  });
}

export async function apiUpdateUser(
  userId: string, fullName?: string, phone?: string | null,
  roleId?: number, isActive?: boolean,
): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/users`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, fullName, phone, roleId, isActive }),
  });
  return r?.ok ?? false;
}

export async function apiDeleteUser(userId: string): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/users?userId=${userId}`, { method: "DELETE" });
  return r?.ok ?? false;
}

export async function apiGetFarms(): Promise<Farm[] | null> {
  return fetchJson<Farm[]>(`${BASE}/farms`);
}

export async function apiCreateFarm(
  name: string,
  location: string,
  ownerUserId?: number,
): Promise<{ ok: boolean; farmId?: string } | null> {
  return fetchJson<{ ok: boolean; farmId?: string }>(`${BASE}/farms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, location, ownerUserId }),
  });
}

export async function apiUpdateFarm(
  farmId: string, name?: string, location?: string, status?: string,
): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/farms`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ farmId, name, location, status }),
  });
  return r?.ok ?? false;
}

export async function apiDeleteFarm(farmId: string): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/farms?farmId=${farmId}`, { method: "DELETE" });
  return r?.ok ?? false;
}

export async function apiGetGardens(farmId?: string): Promise<Garden[] | null> {
  const params = farmId ? `?farmId=${farmId}` : "";
  return fetchJson<Garden[]>(`${BASE}/gardens${params}`);
}

export async function apiCreateGarden(
  farmId: string, name: string, plantTypeId?: number | null,
  area?: number | null, location?: string | null,
): Promise<{ ok: boolean; gardenId?: string } | null> {
  return fetchJson<{ ok: boolean; gardenId?: string }>(`${BASE}/gardens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ farmId, name, plantTypeId, area, location }),
  });
}

export async function apiUpdateGarden(
  gardenId: string, name?: string, plantTypeId?: number | null,
  area?: number | null, location?: string | null, status?: string,
): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/gardens`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gardenId, name, plantTypeId, area, location, status }),
  });
  return r?.ok ?? false;
}

export async function apiDeleteGarden(gardenId: string): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/gardens?gardenId=${gardenId}`, { method: "DELETE" });
  return r?.ok ?? false;
}

export async function apiGetDevices(gardenId?: string): Promise<Device[] | null> {
  const params = gardenId ? `?gardenId=${gardenId}` : "";
  return fetchJson<Device[]>(`${BASE}/devices${params}`);
}

export async function apiCreateDevice(
  deviceCode: string, name: string, deviceTypeId: number,
  gardenId: string, installLocation?: string | null, isControllable?: boolean,
): Promise<{ ok: boolean; deviceId?: string } | null> {
  return fetchJson<{ ok: boolean; deviceId?: string }>(`${BASE}/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceCode, name, deviceTypeId, gardenId, installLocation, isControllable }),
  });
}

export async function apiUpdateDevice(
  deviceId: string, name?: string, status?: string, installLocation?: string,
): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/devices`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, name, status, installLocation }),
  });
  return r?.ok ?? false;
}

export async function apiDeleteDevice(deviceId: string): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/devices?deviceId=${deviceId}`, { method: "DELETE" });
  return r?.ok ?? false;
}

export async function apiGetSensorSummaries(): Promise<GardenSensorSummary[] | null> {
  return fetchJson<GardenSensorSummary[]>(`${BASE}/sensors`);
}

export async function apiGetAlerts(): Promise<Alert[] | null> {
  return fetchJson<Alert[]>(`${BASE}/alerts`);
}

export async function apiUpdateAlert(
  alertId: string,
  status: "processing" | "resolved",
  userId: string,
): Promise<boolean> {
  const result = await fetchJson<{ ok: boolean }>(`${BASE}/alerts`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alertId, status, userId }),
  });
  return result?.ok ?? false;
}

export async function apiGetAlertRules(): Promise<AlertRule[] | null> {
  return fetchJson<AlertRule[]>(`${BASE}/alert-rules`);
}

export async function apiCreateAlertRule(
  name: string, severity: string, gardenId?: string | null,
  messageTemplate?: string, createdBy?: number | null,
  conditions?: Array<{ metricType: string; operator: string; value1: number; value2?: number | null }>,
): Promise<{ ok: boolean; ruleId?: string } | null> {
  return fetchJson<{ ok: boolean; ruleId?: string }>(`${BASE}/alert-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, severity, gardenId, messageTemplate, createdBy, conditions }),
  });
}

export async function apiUpdateAlertRule(
  ruleId: string, name?: string, severity?: string,
  messageTemplate?: string, isActive?: boolean,
): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/alert-rules`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ruleId, name, severity, messageTemplate, isActive }),
  });
  return r?.ok ?? false;
}

export async function apiDeleteAlertRule(ruleId: string): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/alert-rules?ruleId=${ruleId}`, { method: "DELETE" });
  return r?.ok ?? false;
}

export async function apiGetSchedules(): Promise<Schedule[] | null> {
  return fetchJson<Schedule[]>(`${BASE}/schedules`);
}

export async function apiCreateSchedule(
  gardenId: string, deviceId: string, scheduleType?: string,
  startTime?: string, endTime?: string, dayOfWeek?: number | null,
  durationSeconds?: number | null, createdBy?: number | null,
): Promise<{ ok: boolean; scheduleId?: string } | null> {
  return fetchJson<{ ok: boolean; scheduleId?: string }>(`${BASE}/schedules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gardenId, deviceId, scheduleType, startTime, endTime, dayOfWeek, durationSeconds, createdBy }),
  });
}

export async function apiUpdateSchedule(
  scheduleId: string, scheduleType?: string, startTime?: string,
  endTime?: string, dayOfWeek?: number | null, durationSeconds?: number | null,
  isActive?: boolean,
): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/schedules`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduleId, scheduleType, startTime, endTime, dayOfWeek, durationSeconds, isActive }),
  });
  return r?.ok ?? false;
}

export async function apiDeleteSchedule(scheduleId: string): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/schedules?scheduleId=${scheduleId}`, { method: "DELETE" });
  return r?.ok ?? false;
}

export async function apiGetLogs(limit = 100): Promise<SystemLog[] | null> {
  return fetchJson<SystemLog[]>(`${BASE}/logs?limit=${limit}`);
}

export async function apiGetBackups(): Promise<BackupRecord[] | null> {
  return fetchJson<BackupRecord[]>(`${BASE}/backups`);
}

export async function apiCreateBackup(
  backupType: string, filePath: string, createdBy?: number | null,
): Promise<{ ok: boolean; backupId?: string } | null> {
  return fetchJson<{ ok: boolean; backupId?: string }>(`${BASE}/backups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backupType, filePath, createdBy }),
  });
}

export async function apiUpdateBackup(
  backupId: string, status?: string, fileSizeBytes?: number, markCompleted?: boolean,
): Promise<boolean> {
  const r = await fetchJson<{ ok: boolean }>(`${BASE}/backups`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backupId, status, fileSizeBytes, markCompleted }),
  });
  return r?.ok ?? false;
}

export async function apiGetAIAnalyses(): Promise<AIAnalysis[] | null> {
  return fetchJson<AIAnalysis[]>(`${BASE}/ai`);
}

export async function apiGetThresholds(): Promise<ZoneThresholds[] | null> {
  return fetchJson<ZoneThresholds[]>(`${BASE}/thresholds`);
}

export async function apiGetSensorChartData(
  gardenIds: string[],
  hours = 24,
): Promise<{
  temperatureChartData: ChartDataPoint[];
  humidityAirChartData: ChartDataPoint[];
  humiditySoilChartData: ChartDataPoint[];
  lightChartData: ChartDataPoint[];
} | null> {
  const params = new URLSearchParams();
  gardenIds.forEach((id) => params.append("gardenId", id));
  params.set("hours", String(hours));
  return fetchJson(`${BASE}/sensors/chart?${params.toString()}`);
}

export async function apiSendDeviceCommand(
  deviceId: string,
  command: string,
  params: Record<string, unknown> = {},
  userId?: string,
): Promise<boolean> {
  const result = await fetchJson<{ ok: boolean }>(`${BASE}/devices/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, command, params, userId }),
  });
  return result?.ok ?? false;
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<{ ok: boolean; user?: User; reason?: string } | null> {
  return fetchJson<{ ok: boolean; user?: User; reason?: string }>(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Check if the API is available (DB configured).
 * Returns true if the API responds with valid data, false otherwise.
 */
export async function apiHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/farms`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
