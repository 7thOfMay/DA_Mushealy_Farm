/**
 * Mappers: convert MySQL row data → Frontend types
 * Maps DB column names/enums to the frontend interfaces defined in @/types.
 */

import type {
  User,
  UserRole,
  Farm,
  Garden,
  PlantType,
  Device,
  DeviceType,
  Alert,
  AlertSeverity,
  AlertStatus,
  SensorType,
  AlertRule,
  ThresholdCondition,
  Schedule,
  ScheduleType,
  RepeatType,
  ScheduleAction,
  SystemLog,
  LogActionType,
  BackupRecord,
  BackupType,
  BackupStatus,
  AIAnalysis,
  GardenSensorSummary,
  ZoneThresholds,
} from "@/types";
import type { RowDataPacket } from "mysql2/promise";

// ─── Helpers ────────────────────────────────────────────────────────

function toISOString(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString();
  return new Date(d).toISOString();
}

function sid(prefix: string, id: number): string {
  return `${prefix}${id}`;
}

// ─── Role mapping ───────────────────────────────────────────────────

const ROLE_MAP: Record<string, UserRole> = {
  Admin: "ADMIN",
  Farmer: "FARMER",
  User: "FARMER", // SQL "User" role maps to FARMER in frontend
};

// ─── Plant type mapping ─────────────────────────────────────────────

const PLANT_NAME_MAP: Record<string, PlantType> = {
  "Cải xanh": "CAI_XANH",
  "Cà chua": "CA_CHUA",
  "Nha đam": "NHA_DAM",
};

const PLANT_COLOR_MAP: Record<PlantType, string> = {
  CAI_XANH: "#1B4332",
  CA_CHUA: "#E67E22",
  NHA_DAM: "#2980B9",
};

const PLANT_LABEL_MAP: Record<PlantType, string> = {
  CAI_XANH: "Cải Xanh",
  CA_CHUA: "Cà Chua",
  NHA_DAM: "Nha Đam",
};

// ─── Device type mapping ────────────────────────────────────────────

const DEVICE_TYPE_MAP: Record<number, DeviceType> = {
  1: "sensor_temp",
  2: "sensor_humidity_air",
  3: "sensor_humidity_soil",
  4: "sensor_light",
  5: "pump",
  6: "pump", // Hệ thống tưới → pump
  7: "led_rgb",
  8: "led_rgb", // Đèn chiếu sáng → led_rgb
  9: "pump", // Quạt → pump (actuator)
  10: "pump", // Van nước → pump (actuator)
};

// ─── Severity mapping ───────────────────────────────────────────────

const SEVERITY_MAP: Record<string, AlertSeverity> = {
  critical: "high",
  warning: "medium",
  info: "low",
};

const SEVERITY_REVERSE_MAP: Record<string, "CRITICAL" | "WARNING" | "INFO"> = {
  critical: "CRITICAL",
  warning: "WARNING",
  info: "INFO",
};

// ─── Alert status mapping ───────────────────────────────────────────

const ALERT_STATUS_MAP: Record<string, AlertStatus> = {
  detected: "DETECTED",
  processing: "PROCESSING",
  resolved: "RESOLVED",
};

// ─── Sensor / metric type mapping ───────────────────────────────────

const METRIC_TYPE_MAP: Record<string, SensorType> = {
  temperature: "temperature",
  air_humidity: "humidity_air",
  soil_moisture: "humidity_soil",
  light: "light",
};

// ─── Log action type mapping ────────────────────────────────────────

const LOG_ACTION_MAP: Record<string, LogActionType> = {
  device_toggle: "DEVICE_TOGGLE",
  config_change: "CONFIG_CHANGE",
  alert: "ALERT_ACTION",
  user_access: "USER_LOGIN",
  schedule_change: "SCHEDULE_CREATE",
  system_event: "CONFIG_CHANGE",
  rule_change: "CONFIG_CHANGE",
  backup_restore: "CONFIG_CHANGE",
};

// ─── Schedule mapping ───────────────────────────────────────────────

const EXEC_MODE_MAP: Record<string, ScheduleType> = {
  manual: "MANUAL",
  automatic: "TIME_BASED",
  threshold_based: "THRESHOLD_BASED",
};

const SCHEDULE_REPEAT_MAP: Record<string, RepeatType> = {
  hourly: "daily",
  daily: "daily",
  weekly: "weekly",
};

// ─── Backup mapping ────────────────────────────────────────────────

const BACKUP_STATUS_MAP: Record<string, BackupStatus> = {
  completed: "success",
  failed: "failed",
  in_progress: "in_progress",
};

// ─── Row interfaces (what DB returns) ──────────────────────────────

export interface UserRow extends RowDataPacket {
  user_id: number;
  username: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  phone: string | null;
  role_name: string;
  is_active: 0 | 1;
  created_at: Date;
  assigned_garden_ids: string | null;
  assigned_farm_ids: string | null;
}

export interface FarmRow extends RowDataPacket {
  farm_id: number;
  farm_code: string;
  farm_name: string;
  owner_name: string | null;
  location_desc: string | null;
  area_m2: number | null;
  status: string;
  created_at: Date;
  owner_user_id: number | null;
}

export interface GardenRow extends RowDataPacket {
  zone_id: number;
  farm_id: number;
  zone_name: string;
  plant_type_id: number | null;
  plant_name: string | null;
  area_m2: number | null;
  location_desc: string | null;
  status: string;
  created_at: Date;
  active_alert_count: number;
}

export interface DeviceRow extends RowDataPacket {
  device_id: number;
  device_code: string;
  device_name: string;
  device_type_id: number;
  type_name: string;
  category: string;
  zone_id: number;
  zone_name: string;
  install_location: string | null;
  is_controllable: 0 | 1;
  status: string;
  last_updated: Date | null;
  latest_value: number | null;
  unit: string | null;
}

export interface AlertRow extends RowDataPacket {
  alert_id: number;
  zone_id: number;
  zone_name: string;
  farm_id: number;
  farm_name: string;
  device_id: number | null;
  device_name: string | null;
  alert_rule_id: number | null;
  alert_type: string;
  source_type: string;
  severity: string;
  metric_type: string | null;
  threshold_value: number | null;
  actual_value: number | null;
  message: string;
  status: string;
  acknowledged_by: number | null;
  ack_user_name: string | null;
  resolved_by: number | null;
  res_user_name: string | null;
  created_at: Date;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
}

export interface AlertRuleRow extends RowDataPacket {
  alert_rule_id: number;
  rule_name: string;
  plant_type_id: number | null;
  zone_id: number | null;
  farm_id: number | null;
  severity: string;
  message_template: string;
  is_active: 0 | 1;
  created_by: number | null;
  created_at: Date;
}

export interface AlertRuleConditionRow extends RowDataPacket {
  condition_id: number;
  alert_rule_id: number;
  metric_type: string;
  operator: string;
  value1: number;
  value2: number | null;
  logical_group: string;
}

export interface AlertActionRow extends RowDataPacket {
  alert_action_id: number;
  alert_rule_id: number;
  action_type: string;
  target_device_id: number | null;
  action_params: Record<string, unknown> | null;
}

export interface ScheduleRow extends RowDataPacket {
  schedule_id: number;
  zone_id: number;
  zone_name: string;
  device_id: number;
  device_name: string;
  execution_mode: string;
  schedule_type: string | null;
  start_time: string | null;
  end_time: string | null;
  day_of_week: number | null;
  duration_seconds: number | null;
  is_active: 0 | 1;
  created_by: number | null;
  created_at: Date;
}

export interface LogRow extends RowDataPacket {
  log_id: number;
  user_id: number | null;
  user_name: string | null;
  action_type: string;
  entity_type: string;
  entity_id: number | null;
  description: string;
  value_before: unknown;
  value_after: unknown;
  ip_address: string | null;
  created_at: Date;
}

export interface BackupRow extends RowDataPacket {
  backup_id: number;
  backup_type: string;
  file_path: string;
  file_size_bytes: number | null;
  status: string;
  created_by: number | null;
  creator_name: string | null;
  created_at: Date;
  completed_at: Date | null;
  notes: string | null;
}

export interface AIEventRow extends RowDataPacket {
  event_id: number;
  zone_id: number;
  zone_name: string;
  detection_type: string;
  image_path: string;
  result_label: string;
  confidence: number;
  details: Record<string, unknown> | null;
  alert_id: number | null;
  created_at: Date;
  detected_by_user: number | null;
}

export interface SensorLatestRow extends RowDataPacket {
  zone_id: number;
  device_type_id: number;
  value: number;
  recorded_at: Date;
}

// ─── Mapper functions ──────────────────────────────────────────────

export function mapUser(row: UserRow): User {
  const gardenIds = row.assigned_garden_ids
    ? row.assigned_garden_ids.split(",").map((id) => sid("g", Number(id)))
    : [];
  const farmIds = row.assigned_farm_ids
    ? row.assigned_farm_ids.split(",").map((id) => sid("f", Number(id)))
    : [];

  return {
    id: sid("u", row.user_id),
    name: row.full_name ?? row.username,
    email: row.email,
    role: ROLE_MAP[row.role_name] ?? "FARMER",
    phone: row.phone ?? undefined,
    assignedGardens: gardenIds,
    assignedFarmIds: farmIds,
    status: row.is_active ? "active" : "inactive",
    createdAt: toISOString(row.created_at),
  };
}

export function mapFarm(row: FarmRow): Farm {
  return {
    id: sid("f", row.farm_id),
    name: row.farm_name,
    location: row.location_desc ?? "",
    ownerId: row.owner_user_id ? sid("u", row.owner_user_id) : "",
    createdAt: toISOString(row.created_at),
    status: row.status === "active" ? "active" : "paused",
    description: `${row.farm_code} — ${row.area_m2 ?? 0}m²`,
  };
}

export function mapGarden(row: GardenRow): Garden {
  const plantType = row.plant_name ? (PLANT_NAME_MAP[row.plant_name] ?? "CAI_XANH") : "CAI_XANH";

  let status: Garden["status"] = "OK";
  if (row.active_alert_count > 0) {
    status = row.active_alert_count >= 2 ? "ALERT" : "WARN";
  }

  return {
    id: sid("g", row.zone_id),
    farmId: sid("f", row.farm_id),
    cropTypeId: row.plant_type_id
      ? `crop_${plantType.toLowerCase()}`
      : undefined,
    name: row.zone_name,
    plantType,
    plantLabel: PLANT_LABEL_MAP[plantType] ?? row.plant_name ?? "",
    color: PLANT_COLOR_MAP[plantType] ?? "#1B4332",
    status,
    description: row.location_desc ?? undefined,
    area: row.area_m2 ? `${row.area_m2}m²` : undefined,
    areaM2: row.area_m2 ?? undefined,
    createdAt: toISOString(row.created_at),
  };
}

export function mapDevice(row: DeviceRow): Device {
  return {
    id: sid("d", row.device_id),
    name: row.device_name,
    type: DEVICE_TYPE_MAP[row.device_type_id] ?? "pump",
    gardenId: sid("g", row.zone_id),
    gardenName: row.zone_name,
    hardwareId: row.device_code,
    status: row.status as Device["status"],
    isOn: row.status === "active",
    lastUpdated: toISOString(row.last_updated),
    lastValue: row.latest_value != null ? Number(row.latest_value) : undefined,
    lastUnit: row.unit ?? undefined,
    locationNote: row.install_location ?? undefined,
  };
}

export function mapAlert(row: AlertRow): Alert {
  return {
    id: sid("a", row.alert_id),
    farmId: sid("f", row.farm_id),
    farmName: row.farm_name,
    gardenId: sid("g", row.zone_id),
    gardenName: row.zone_name,
    deviceId: row.device_id ? sid("d", row.device_id) : undefined,
    deviceName: row.device_name ?? undefined,
    sensorType: row.metric_type ? METRIC_TYPE_MAP[row.metric_type] : undefined,
    severity: SEVERITY_MAP[row.severity] ?? "medium",
    status: ALERT_STATUS_MAP[row.status] ?? "DETECTED",
    message: row.message,
    value: row.actual_value ?? undefined,
    threshold: row.threshold_value ?? undefined,
    detectedAt: toISOString(row.created_at),
    processingAt: row.acknowledged_at ? toISOString(row.acknowledged_at) : undefined,
    resolvedAt: row.resolved_at ? toISOString(row.resolved_at) : undefined,
    processedBy: row.ack_user_name ?? row.res_user_name ?? undefined,
  };
}

export function mapAlertRule(
  row: AlertRuleRow,
  conditions: AlertRuleConditionRow[],
  actions: AlertActionRow[],
): AlertRule {
  const mappedConditions: ThresholdCondition[] = conditions.map((c) => ({
    sensorType: METRIC_TYPE_MAP[c.metric_type] ?? "temperature",
    operator: c.operator as ThresholdCondition["operator"],
    value: Number(c.value1),
    unit: c.metric_type === "temperature" ? "°C" : c.metric_type === "light" ? "lux" : "%",
  }));

  const deviceAction = actions.find(
    (a) => a.action_type === "turn_on_device" || a.action_type === "turn_off_device",
  );
  const autoAction = deviceAction?.target_device_id
    ? {
        deviceId: sid("d", deviceAction.target_device_id),
        action: (deviceAction.action_type === "turn_on_device" ? "ON" : "OFF") as ScheduleAction,
        durationMin: Math.round(
          ((deviceAction.action_params as Record<string, number> | null)?.duration_seconds ?? 300) / 60,
        ),
      }
    : undefined;

  const logic = conditions.length > 0 ? (conditions[0].logical_group as "AND" | "OR") : "AND";

  return {
    id: sid("ar", row.alert_rule_id),
    farmId: row.farm_id ? sid("f", row.farm_id) : "",
    gardenId: row.zone_id ? sid("g", row.zone_id) : undefined,
    cropTypeId: row.plant_type_id
      ? `crop_${Object.entries(PLANT_NAME_MAP).find(([, v]) => v)![1].toLowerCase()}`
      : "",
    name: row.rule_name,
    severity: SEVERITY_REVERSE_MAP[row.severity] ?? "WARNING",
    logic,
    conditions: mappedConditions,
    autoAction,
    isActive: !!row.is_active,
    createdBy: row.created_by ? sid("u", row.created_by) : "",
    createdAt: toISOString(row.created_at),
  };
}

export function mapSchedule(row: ScheduleRow): Schedule {
  const scheduleType = EXEC_MODE_MAP[row.execution_mode] ?? "TIME_BASED";
  const repeat: RepeatType = row.schedule_type
    ? (SCHEDULE_REPEAT_MAP[row.schedule_type] ?? "daily")
    : row.execution_mode === "manual"
      ? "once"
      : "daily";

  const startTime = row.start_time
    ? row.start_time.substring(0, 5)
    : "00:00";
  const endTime = row.end_time
    ? row.end_time.substring(0, 5)
    : undefined;

  return {
    id: sid("s", row.schedule_id),
    deviceId: sid("d", row.device_id),
    deviceName: row.device_name,
    gardenId: sid("g", row.zone_id),
    gardenName: row.zone_name,
    scheduleType: scheduleType,
    action: "ON" as ScheduleAction,
    startTime,
    endTime,
    date: toISOString(row.created_at).split("T")[0],
    repeat,
    isActive: !!row.is_active,
  };
}

export function mapSystemLog(row: LogRow): SystemLog {
  return {
    id: sid("l", Number(row.log_id)),
    actionType: LOG_ACTION_MAP[row.action_type] ?? "CONFIG_CHANGE",
    description: row.description,
    userId: row.user_id ? sid("u", row.user_id) : "",
    userName: row.user_name ?? "Hệ thống",
    gardenId: row.entity_type === "farm_zones" && row.entity_id ? sid("g", row.entity_id) : undefined,
    deviceId: row.entity_type === "devices" && row.entity_id ? sid("d", row.entity_id) : undefined,
    oldValue: row.value_before ? JSON.stringify(row.value_before) : undefined,
    newValue: row.value_after ? JSON.stringify(row.value_after) : undefined,
    timestamp: toISOString(row.created_at),
  };
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function mapBackup(row: BackupRow): BackupRecord {
  const fileName = row.file_path.split("/").pop() ?? row.file_path;
  return {
    id: sid("bk", row.backup_id),
    type: row.backup_type as BackupType,
    status: BACKUP_STATUS_MAP[row.status] ?? "in_progress",
    createdAt: toISOString(row.created_at),
    fileSize: formatFileSize(row.file_size_bytes),
    fileName,
    createdBy: row.creator_name ?? "Hệ thống",
    note: row.notes ?? undefined,
  };
}

export function mapAIAnalysis(row: AIEventRow): AIAnalysis {
  const details = row.details as Record<string, string> | null;
  return {
    id: sid("ai", row.event_id),
    imageUrl: row.image_path,
    gardenId: sid("g", row.zone_id),
    gardenName: row.zone_name,
    result: row.result_label,
    confidence: Number(row.confidence) * 100,
    recommendation: details?.note ?? "",
    timestamp: toISOString(row.created_at),
  };
}

export function mapSensorSummary(
  zoneId: number,
  rows: SensorLatestRow[],
): GardenSensorSummary {
  let temperature = 0;
  let humidityAir = 0;
  let humiditySoil = 0;
  let light = 0;
  let latestAt: Date | null = null;

  for (const r of rows) {
    const val = Number(r.value);
    switch (r.device_type_id) {
      case 1: temperature = val; break;
      case 2: humidityAir = val; break;
      case 3: humiditySoil = val; break;
      case 4: light = val; break;
    }
    if (!latestAt || new Date(r.recorded_at) > latestAt) {
      latestAt = new Date(r.recorded_at);
    }
  }

  return {
    gardenId: sid("g", zoneId),
    temperature,
    humidityAir,
    humiditySoil,
    light,
    updatedAt: latestAt ? latestAt.toISOString() : new Date().toISOString(),
  };
}

export function mapZoneThresholds(
  zoneId: number,
  rows: Array<RowDataPacket & { metric_type: string; min_value: number; max_value: number }>,
): ZoneThresholds {
  const thresholds: ZoneThresholds = {
    gardenId: sid("g", zoneId),
    temperature: { min: 0, max: 50 },
    humidityAir: { min: 0, max: 100 },
    humiditySoil: { min: 0, max: 100 },
    light: { min: 0, max: 100000 },
  };

  for (const r of rows) {
    const min = Number(r.min_value);
    const max = Number(r.max_value);
    switch (r.metric_type) {
      case "temperature": thresholds.temperature = { min, max }; break;
      case "air_humidity": thresholds.humidityAir = { min, max }; break;
      case "soil_moisture": thresholds.humiditySoil = { min, max }; break;
      case "light": thresholds.light = { min, max }; break;
    }
  }

  return thresholds;
}
