import type {
  AIAnalysis,
  Alert,
  AlertRule,
  BackupRecord,
  ChartDataPoint,
  CropType,
  Device,
  Farm,
  Garden,
  GardenSensorSummary,
  PlantTypeInfo,
  Schedule,
  SystemLog,
  User,
} from "@/types";

export const RUNTIME_SNAPSHOT_VERSION = 1;
export const RUNTIME_SNAPSHOT_SCHEMA = "runtime-state-v1";

export interface RuntimeStateSnapshot {
  farms: Farm[];
  cropTypes: CropType[];
  plantTypeInfos: PlantTypeInfo[];
  gardens: Garden[];
  devices: Device[];
  sensorSummaries: GardenSensorSummary[];
  temperatureChartData: ChartDataPoint[];
  humidityAirChartData: ChartDataPoint[];
  humiditySoilChartData: ChartDataPoint[];
  lightChartData: ChartDataPoint[];
  alerts: Alert[];
  alertRules: AlertRule[];
  schedules: Schedule[];
  logs: SystemLog[];
  backupRecords: BackupRecord[];
  aiAnalyses: AIAnalysis[];
  users: User[];
}

export interface RuntimeSnapshotEnvelope {
  version: number;
  exportedAt: string;
  snapshotMeta?: {
    appVersion: string;
    schema: string;
  };
  data: RuntimeStateSnapshot;
}

export interface MigratableRuntimeSnapshot {
  version: number;
  snapshotMeta?: {
    appVersion?: string;
    schema?: string;
  };
  data: Partial<RuntimeStateSnapshot>;
}

export interface RuntimeImportPreview {
  version: number;
  appVersion: string;
  schema: string;
  counts: {
    farms: number;
    gardens: number;
    devices: number;
    alerts: number;
    users: number;
  };
  warnings: string[];
}

export function normalizeRuntimeSnapshot(
  parsed: Partial<RuntimeStateSnapshot>,
  defaults: RuntimeStateSnapshot
): RuntimeStateSnapshot {
  return {
    farms: Array.isArray(parsed.farms) ? parsed.farms : defaults.farms,
    cropTypes: Array.isArray(parsed.cropTypes) ? parsed.cropTypes : defaults.cropTypes,
    plantTypeInfos: Array.isArray(parsed.plantTypeInfos) ? parsed.plantTypeInfos : defaults.plantTypeInfos,
    gardens: Array.isArray(parsed.gardens) ? parsed.gardens : defaults.gardens,
    devices: Array.isArray(parsed.devices) ? parsed.devices : defaults.devices,
    sensorSummaries: Array.isArray(parsed.sensorSummaries) ? parsed.sensorSummaries : defaults.sensorSummaries,
    temperatureChartData: Array.isArray(parsed.temperatureChartData) ? parsed.temperatureChartData : defaults.temperatureChartData,
    humidityAirChartData: Array.isArray(parsed.humidityAirChartData) ? parsed.humidityAirChartData : defaults.humidityAirChartData,
    humiditySoilChartData: Array.isArray(parsed.humiditySoilChartData) ? parsed.humiditySoilChartData : defaults.humiditySoilChartData,
    lightChartData: Array.isArray(parsed.lightChartData) ? parsed.lightChartData : defaults.lightChartData,
    alerts: Array.isArray(parsed.alerts) ? parsed.alerts : defaults.alerts,
    alertRules: Array.isArray(parsed.alertRules) ? parsed.alertRules : defaults.alertRules,
    schedules: Array.isArray(parsed.schedules) ? parsed.schedules : defaults.schedules,
    logs: Array.isArray(parsed.logs) ? parsed.logs : defaults.logs,
    backupRecords: Array.isArray(parsed.backupRecords) ? parsed.backupRecords : defaults.backupRecords,
    aiAnalyses: Array.isArray(parsed.aiAnalyses) ? parsed.aiAnalyses : defaults.aiAnalyses,
    users: Array.isArray(parsed.users) ? parsed.users : defaults.users,
  };
}

function isRuntimeSnapshotEnvelope(value: unknown): value is RuntimeSnapshotEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RuntimeSnapshotEnvelope>;
  return typeof candidate.version === "number" && !!candidate.data && typeof candidate.data === "object";
}

export function parseRuntimeSnapshotPayload(payload: unknown): MigratableRuntimeSnapshot | null {
  if (isRuntimeSnapshotEnvelope(payload)) {
    return {
      version: payload.version,
      snapshotMeta: payload.snapshotMeta,
      data: payload.data,
    };
  }

  if (payload && typeof payload === "object") {
    return { version: 0, data: payload as Partial<RuntimeStateSnapshot> };
  }

  return null;
}

export function migrateRuntimeSnapshot(input: MigratableRuntimeSnapshot): Partial<RuntimeStateSnapshot> {
  if (input.version <= RUNTIME_SNAPSHOT_VERSION) {
    return input.data;
  }

  return input.data;
}

export function extractRuntimeSnapshot(payload: unknown, defaults: RuntimeStateSnapshot): RuntimeStateSnapshot {
  const parsed = parseRuntimeSnapshotPayload(payload);
  if (!parsed) return defaults;
  const migrated = migrateRuntimeSnapshot(parsed);
  return normalizeRuntimeSnapshot(migrated, defaults);
}

export function buildRuntimeImportPreview(input: MigratableRuntimeSnapshot): RuntimeImportPreview {
  const warnings: string[] = [];
  const version = input.version;
  const appVersion = input.snapshotMeta?.appVersion ?? "unknown";
  const schema = input.snapshotMeta?.schema ?? "legacy";

  if (version > RUNTIME_SNAPSHOT_VERSION) {
    warnings.push(`Phiên bản dữ liệu (${version}) mới hơn app hiện tại (${RUNTIME_SNAPSHOT_VERSION}).`);
  }
  if (schema !== "legacy" && schema !== RUNTIME_SNAPSHOT_SCHEMA) {
    warnings.push(`Schema dữ liệu ${schema} không khớp với schema app ${RUNTIME_SNAPSHOT_SCHEMA}.`);
  }

  const data = input.data;
  return {
    version,
    appVersion,
    schema,
    counts: {
      farms: Array.isArray(data.farms) ? data.farms.length : 0,
      gardens: Array.isArray(data.gardens) ? data.gardens.length : 0,
      devices: Array.isArray(data.devices) ? data.devices.length : 0,
      alerts: Array.isArray(data.alerts) ? data.alerts.length : 0,
      users: Array.isArray(data.users) ? data.users.length : 0,
    },
    warnings,
  };
}

export function createRuntimeSnapshotEnvelope(
  data: RuntimeStateSnapshot,
  appVersion: string,
  exportedAt: string = new Date().toISOString()
): RuntimeSnapshotEnvelope {
  return {
    version: RUNTIME_SNAPSHOT_VERSION,
    exportedAt,
    snapshotMeta: {
      appVersion,
      schema: RUNTIME_SNAPSHOT_SCHEMA,
    },
    data,
  };
}
