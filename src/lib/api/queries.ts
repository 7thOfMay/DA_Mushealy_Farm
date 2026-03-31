/**
 * SQL queries for fetching data from MySQL smart_farm database.
 * Each function returns the frontend-compatible type via mappers.
 */

import { query, queryOne, getPool } from "@/lib/db";
import {
  mapUser,
  mapFarm,
  mapGarden,
  mapDevice,
  mapAlert,
  mapAlertRule,
  mapSchedule,
  mapSystemLog,
  mapBackup,
  mapAIAnalysis,
  mapSensorSummary,
  mapZoneThresholds,
  type UserRow,
  type FarmRow,
  type GardenRow,
  type DeviceRow,
  type AlertRow,
  type AlertRuleRow,
  type AlertRuleConditionRow,
  type AlertActionRow,
  type ScheduleRow,
  type LogRow,
  type BackupRow,
  type AIEventRow,
  type SensorLatestRow,
} from "@/lib/api/mappers";
import type { RowDataPacket } from "mysql2/promise";

// ─── Users ──────────────────────────────────────────────────────────

export async function fetchUsers() {
  const rows = await query<UserRow[]>(`
    SELECT u.user_id, u.username, u.email, u.password_hash, u.full_name, u.phone,
           r.role_name, u.is_active, u.created_at,
           GROUP_CONCAT(DISTINCT uza.zone_id) AS assigned_garden_ids,
           GROUP_CONCAT(DISTINCT fua.farm_id) AS assigned_farm_ids
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    LEFT JOIN user_zone_access uza ON u.user_id = uza.user_id
    LEFT JOIN farm_user_access fua ON u.user_id = fua.user_id
    GROUP BY u.user_id
    ORDER BY u.created_at DESC
  `);
  return rows.map(mapUser);
}

export async function fetchUserByEmail(email: string) {
  const row = await queryOne<UserRow>(`
    SELECT u.user_id, u.username, u.email, u.password_hash, u.full_name, u.phone,
           r.role_name, u.is_active, u.created_at,
           GROUP_CONCAT(DISTINCT uza.zone_id) AS assigned_garden_ids,
           GROUP_CONCAT(DISTINCT fua.farm_id) AS assigned_farm_ids
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    LEFT JOIN user_zone_access uza ON u.user_id = uza.user_id
    LEFT JOIN farm_user_access fua ON u.user_id = fua.user_id
    WHERE u.email = ?
    GROUP BY u.user_id
  `, [email]);
  if (!row) return null;
  return { user: mapUser(row), passwordHash: row.password_hash };
}

// ─── Farms ──────────────────────────────────────────────────────────

export async function fetchFarms() {
  const rows = await query<FarmRow[]>(`
    SELECT f.farm_id, f.farm_code, f.farm_name, f.owner_name,
           f.location_desc, f.area_m2, f.status, f.created_at,
           (SELECT fua.user_id FROM farm_user_access fua WHERE fua.farm_id = f.farm_id LIMIT 1) AS owner_user_id
    FROM farms f
    ORDER BY f.created_at DESC
  `);
  return rows.map(mapFarm);
}

export async function fetchFarmsByUserId(userId: number) {
  const rows = await query<FarmRow[]>(`
    SELECT f.farm_id, f.farm_code, f.farm_name, f.owner_name,
           f.location_desc, f.area_m2, f.status, f.created_at,
           fua.user_id AS owner_user_id
    FROM farms f
    JOIN farm_user_access fua ON f.farm_id = fua.farm_id
    WHERE fua.user_id = ?
    ORDER BY f.created_at DESC
  `, [userId]);
  return rows.map(mapFarm);
}

export async function insertFarm(
  farmName: string,
  locationDesc: string | null,
  ownerUserId: number | null,
): Promise<number> {
  const farmCode = `FARM_${Date.now()}`;
  const [result] = await getPool().execute(
    `INSERT INTO farms (farm_code, farm_name, location_desc, status) VALUES (?, ?, ?, 'active')`,
    [farmCode, farmName, locationDesc],
  );
  const insertId = (result as { insertId: number }).insertId;

  if (ownerUserId) {
    await getPool().execute(
      `INSERT INTO farm_user_access (farm_id, user_id) VALUES (?, ?)`,
      [insertId, ownerUserId],
    );
  }

  return insertId;
}

// ─── Gardens (Zones) ────────────────────────────────────────────────

export async function fetchGardens() {
  const rows = await query<GardenRow[]>(`
    SELECT fz.zone_id, fz.farm_id, fz.zone_name, fz.plant_type_id,
           pt.plant_name, fz.area_m2, fz.location_desc, fz.status, fz.created_at,
           (SELECT COUNT(*) FROM alerts a WHERE a.zone_id = fz.zone_id AND a.status IN ('detected','processing')) AS active_alert_count
    FROM farm_zones fz
    LEFT JOIN plant_types pt ON fz.plant_type_id = pt.plant_type_id
    ORDER BY fz.created_at DESC
  `);
  return rows.map(mapGarden);
}

export async function fetchGardensByFarmId(farmId: number) {
  const rows = await query<GardenRow[]>(`
    SELECT fz.zone_id, fz.farm_id, fz.zone_name, fz.plant_type_id,
           pt.plant_name, fz.area_m2, fz.location_desc, fz.status, fz.created_at,
           (SELECT COUNT(*) FROM alerts a WHERE a.zone_id = fz.zone_id AND a.status IN ('detected','processing')) AS active_alert_count
    FROM farm_zones fz
    LEFT JOIN plant_types pt ON fz.plant_type_id = pt.plant_type_id
    WHERE fz.farm_id = ?
    ORDER BY fz.created_at DESC
  `, [farmId]);
  return rows.map(mapGarden);
}

// ─── Devices ────────────────────────────────────────────────────────

export async function fetchDevices() {
  const rows = await query<DeviceRow[]>(`
    SELECT d.device_id, d.device_code, d.device_name, d.device_type_id,
           dt.type_name, dt.category, dt.unit, d.zone_id, fz.zone_name,
           d.install_location, d.is_controllable, d.status, d.last_updated,
           latest_sd.last_value
    FROM devices d
    JOIN device_types dt ON d.device_type_id = dt.device_type_id
    JOIN farm_zones fz ON d.zone_id = fz.zone_id
    LEFT JOIN (
      SELECT sd.device_id, sd.value AS last_value
      FROM sensor_data sd
      INNER JOIN (SELECT device_id, MAX(recorded_at) AS max_time FROM sensor_data GROUP BY device_id) m
        ON sd.device_id = m.device_id AND sd.recorded_at = m.max_time
    ) latest_sd ON d.device_id = latest_sd.device_id
    ORDER BY d.created_at DESC
  `);
  return rows.map(mapDevice);
}

export async function fetchDevicesByZoneId(zoneId: number) {
  const rows = await query<DeviceRow[]>(`
    SELECT d.device_id, d.device_code, d.device_name, d.device_type_id,
           dt.type_name, dt.category, dt.unit, d.zone_id, fz.zone_name,
           d.install_location, d.is_controllable, d.status, d.last_updated,
           latest_sd.last_value
    FROM devices d
    JOIN device_types dt ON d.device_type_id = dt.device_type_id
    JOIN farm_zones fz ON d.zone_id = fz.zone_id
    LEFT JOIN (
      SELECT sd.device_id, sd.value AS last_value
      FROM sensor_data sd
      INNER JOIN (SELECT device_id, MAX(recorded_at) AS max_time FROM sensor_data GROUP BY device_id) m
        ON sd.device_id = m.device_id AND sd.recorded_at = m.max_time
    ) latest_sd ON d.device_id = latest_sd.device_id
    WHERE d.zone_id = ?
    ORDER BY d.created_at DESC
  `, [zoneId]);
  return rows.map(mapDevice);
}

// ─── Sensor Data ────────────────────────────────────────────────────

export async function fetchSensorSummaries() {
  // Get latest sensor reading per device type per zone
  const rows = await query<SensorLatestRow[]>(`
    SELECT sd.device_id, d.zone_id, d.device_type_id, sd.value, sd.recorded_at
    FROM sensor_data sd
    JOIN (
      SELECT device_id, MAX(recorded_at) AS max_time
      FROM sensor_data
      GROUP BY device_id
    ) latest ON sd.device_id = latest.device_id AND sd.recorded_at = latest.max_time
    JOIN devices d ON sd.device_id = d.device_id
    JOIN device_types dt ON d.device_type_id = dt.device_type_id
    WHERE dt.category = 'sensor'
    ORDER BY d.zone_id
  `);

  // Group by zone_id
  const zoneMap = new Map<number, SensorLatestRow[]>();
  for (const r of rows) {
    const list = zoneMap.get(r.zone_id) ?? [];
    list.push(r);
    zoneMap.set(r.zone_id, list);
  }

  return Array.from(zoneMap.entries()).map(([zoneId, zoneRows]) =>
    mapSensorSummary(zoneId, zoneRows),
  );
}

export async function fetchSensorChartData(zoneIds: number[], hours = 24) {
  const placeholders = zoneIds.map(() => "?").join(",");
  const rows = await query<RowDataPacket[]>(`
    SELECT d.zone_id, d.device_type_id, sd.value, sd.recorded_at
    FROM sensor_data sd
    JOIN devices d ON sd.device_id = d.device_id
    JOIN device_types dt ON d.device_type_id = dt.device_type_id
    WHERE dt.category = 'sensor'
      AND d.zone_id IN (${placeholders})
      AND sd.recorded_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
    ORDER BY sd.recorded_at ASC
  `, [...zoneIds, hours]);

  return rows;
}

// ─── Alerts ─────────────────────────────────────────────────────────

export async function fetchAlerts() {
  const rows = await query<AlertRow[]>(`
    SELECT a.alert_id, a.zone_id, fz.zone_name, fz.farm_id, f.farm_name,
           a.device_id, d.device_name, a.alert_rule_id, a.alert_type,
           a.source_type, a.severity, a.metric_type, a.threshold_value,
           a.actual_value, a.message, a.status,
           a.acknowledged_by, ack_u.full_name AS ack_user_name,
           a.resolved_by, res_u.full_name AS res_user_name,
           a.created_at, a.acknowledged_at, a.resolved_at
    FROM alerts a
    JOIN farm_zones fz ON a.zone_id = fz.zone_id
    JOIN farms f ON fz.farm_id = f.farm_id
    LEFT JOIN devices d ON a.device_id = d.device_id
    LEFT JOIN users ack_u ON a.acknowledged_by = ack_u.user_id
    LEFT JOIN users res_u ON a.resolved_by = res_u.user_id
    ORDER BY a.created_at DESC
  `);
  return rows.map(mapAlert);
}

export async function updateAlertStatus(
  alertId: number,
  status: "processing" | "resolved",
  userId: number,
) {
  if (status === "processing") {
    await query(`
      UPDATE alerts SET status = 'processing', acknowledged_by = ?, acknowledged_at = NOW()
      WHERE alert_id = ?
    `, [userId, alertId]);
  } else {
    await query(`
      UPDATE alerts SET status = 'resolved', resolved_by = ?, resolved_at = NOW()
      WHERE alert_id = ?
    `, [userId, alertId]);
  }
}

// ─── Alert Rules ────────────────────────────────────────────────────

export async function fetchAlertRules() {
  const rules = await query<AlertRuleRow[]>(`
    SELECT ar.alert_rule_id, ar.rule_name, ar.plant_type_id, ar.zone_id,
           fz.farm_id, ar.severity, ar.message_template, ar.is_active,
           ar.created_by, ar.created_at
    FROM alert_rules ar
    LEFT JOIN farm_zones fz ON ar.zone_id = fz.zone_id
    ORDER BY ar.created_at DESC
  `);

  const conditions = await query<AlertRuleConditionRow[]>(`
    SELECT * FROM alert_rule_conditions ORDER BY alert_rule_id, condition_id
  `);

  const actions = await query<AlertActionRow[]>(`
    SELECT * FROM alert_actions ORDER BY alert_rule_id
  `);

  return rules.map((rule) =>
    mapAlertRule(
      rule,
      conditions.filter((c) => c.alert_rule_id === rule.alert_rule_id),
      actions.filter((a) => a.alert_rule_id === rule.alert_rule_id),
    ),
  );
}

// ─── Schedules ──────────────────────────────────────────────────────

export async function fetchSchedules() {
  const rows = await query<ScheduleRow[]>(`
    SELECT s.schedule_id, s.zone_id, fz.zone_name, s.device_id, d.device_name,
           s.execution_mode, s.schedule_type, s.start_time, s.end_time,
           s.day_of_week, s.duration_seconds, s.is_active, s.created_by, s.created_at
    FROM schedules s
    JOIN farm_zones fz ON s.zone_id = fz.zone_id
    JOIN devices d ON s.device_id = d.device_id
    ORDER BY s.created_at DESC
  `);
  return rows.map(mapSchedule);
}

// ─── System Logs ────────────────────────────────────────────────────

export async function fetchSystemLogs(limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const rows = await query<LogRow[]>(`
    SELECT sl.log_id, sl.user_id, u.full_name AS user_name,
           sl.action_type, sl.entity_type, sl.entity_id,
           sl.description, sl.value_before, sl.value_after,
           sl.ip_address, sl.created_at
    FROM system_logs sl
    LEFT JOIN users u ON sl.user_id = u.user_id
    ORDER BY sl.created_at DESC
    LIMIT ${safeLimit}
  `);
  return rows.map(mapSystemLog);
}

// ─── Backups ────────────────────────────────────────────────────────

export async function fetchBackups() {
  const rows = await query<BackupRow[]>(`
    SELECT db.backup_id, db.backup_type, db.file_path, db.file_size_bytes,
           db.status, db.created_by, u.full_name AS creator_name,
           db.created_at, db.completed_at, db.notes
    FROM data_backups db
    LEFT JOIN users u ON db.created_by = u.user_id
    ORDER BY db.created_at DESC
  `);
  return rows.map(mapBackup);
}

// ─── AI Detection Events ───────────────────────────────────────────

export async function fetchAIAnalyses() {
  const rows = await query<AIEventRow[]>(`
    SELECT ai.event_id, ai.zone_id, fz.zone_name, ai.detection_type,
           ai.image_path, ai.result_label, ai.confidence, ai.details,
           ai.alert_id, ai.created_at, ai.detected_by_user
    FROM ai_detection_events ai
    JOIN farm_zones fz ON ai.zone_id = fz.zone_id
    ORDER BY ai.created_at DESC
  `);
  return rows.map(mapAIAnalysis);
}

// ─── Zone Thresholds ────────────────────────────────────────────────

export async function fetchZoneThresholds() {
  const rows = await query<RowDataPacket[]>(`
    SELECT zone_id, metric_type, min_value, max_value
    FROM zone_thresholds
    ORDER BY zone_id
  `);

  const zoneMap = new Map<number, Array<RowDataPacket & { metric_type: string; min_value: number; max_value: number }>>();
  for (const r of rows) {
    const list = zoneMap.get(r.zone_id as number) ?? [];
    list.push(r as RowDataPacket & { metric_type: string; min_value: number; max_value: number });
    zoneMap.set(r.zone_id as number, list);
  }

  return Array.from(zoneMap.entries()).map(([zoneId, zoneRows]) =>
    mapZoneThresholds(zoneId, zoneRows),
  );
}

// ─── Device Commands ────────────────────────────────────────────────

export async function sendDeviceCommand(
  deviceId: number,
  commandType: string,
  params: Record<string, unknown>,
  issuedBy: number | null,
) {
  await query(`
    INSERT INTO device_commands (device_id, command_type, parameters, status, issued_by)
    VALUES (?, ?, ?, 'pending', ?)
  `, [deviceId, commandType, JSON.stringify(params), issuedBy]);
}

// ─── System Log Insert ──────────────────────────────────────────────

export async function insertSystemLog(
  userId: number | null,
  actionType: string,
  entityType: string,
  entityId: number | null,
  description: string,
  valueBefore?: unknown,
  valueAfter?: unknown,
) {
  await query(`
    INSERT INTO system_logs (user_id, action_type, entity_type, entity_id, description, value_before, value_after)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    userId,
    actionType,
    entityType,
    entityId,
    description,
    valueBefore ? JSON.stringify(valueBefore) : null,
    valueAfter ? JSON.stringify(valueAfter) : null,
  ]);
}

// ═══════════════════════════════════════════════════════════════════
// WRITE OPERATIONS (INSERT / UPDATE / DELETE)
// ═══════════════════════════════════════════════════════════════════

// ─── Farm Write ─────────────────────────────────────────────────────

export async function updateFarm(
  farmId: number,
  patch: { farm_name?: string; location_desc?: string; status?: string },
) {
  const sets: string[] = [];
  const vals: (string | number)[] = [];
  if (patch.farm_name) { sets.push("farm_name = ?"); vals.push(patch.farm_name); }
  if (patch.location_desc !== undefined) { sets.push("location_desc = ?"); vals.push(patch.location_desc); }
  if (patch.status) { sets.push("status = ?"); vals.push(patch.status); }
  if (sets.length === 0) return;
  vals.push(farmId);
  await query(`UPDATE farms SET ${sets.join(", ")} WHERE farm_id = ?`, vals);
}

export async function deleteFarm(farmId: number) {
  await query(`DELETE FROM farm_user_access WHERE farm_id = ?`, [farmId]);
  await query(`DELETE FROM farms WHERE farm_id = ?`, [farmId]);
}

// ─── Garden / Zone Write ────────────────────────────────────────────

export async function insertGarden(
  farmId: number,
  zoneName: string,
  plantTypeId: number | null,
  areaM2: number | null,
  locationDesc: string | null,
): Promise<number> {
  const [result] = await getPool().execute(
    `INSERT INTO farm_zones (farm_id, zone_name, plant_type_id, area_m2, location_desc, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [farmId, zoneName, plantTypeId, areaM2, locationDesc],
  );
  return (result as { insertId: number }).insertId;
}

export async function updateGarden(
  zoneId: number,
  patch: { zone_name?: string; plant_type_id?: number | null; area_m2?: number | null; location_desc?: string | null; status?: string },
) {
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.zone_name) { sets.push("zone_name = ?"); vals.push(patch.zone_name); }
  if (patch.plant_type_id !== undefined) { sets.push("plant_type_id = ?"); vals.push(patch.plant_type_id); }
  if (patch.area_m2 !== undefined) { sets.push("area_m2 = ?"); vals.push(patch.area_m2); }
  if (patch.location_desc !== undefined) { sets.push("location_desc = ?"); vals.push(patch.location_desc); }
  if (patch.status) { sets.push("status = ?"); vals.push(patch.status); }
  if (sets.length === 0) return;
  vals.push(zoneId);
  await query(`UPDATE farm_zones SET ${sets.join(", ")} WHERE zone_id = ?`, vals);
}

export async function deleteGarden(zoneId: number) {
  await query(`DELETE FROM farm_zones WHERE zone_id = ?`, [zoneId]);
}

// ─── Device Write ───────────────────────────────────────────────────

export async function insertDevice(
  deviceCode: string,
  deviceName: string,
  deviceTypeId: number,
  zoneId: number,
  installLocation: string | null,
  isControllable: boolean,
): Promise<number> {
  const [result] = await getPool().execute(
    `INSERT INTO devices (device_code, device_name, device_type_id, zone_id, install_location, is_controllable, status)
     VALUES (?, ?, ?, ?, ?, ?, 'offline')`,
    [deviceCode, deviceName, deviceTypeId, zoneId, installLocation, isControllable ? 1 : 0],
  );
  return (result as { insertId: number }).insertId;
}

export async function updateDevice(
  deviceId: number,
  patch: { device_name?: string; status?: string; install_location?: string },
) {
  const sets: string[] = [];
  const vals: (string | number)[] = [];
  if (patch.device_name) { sets.push("device_name = ?"); vals.push(patch.device_name); }
  if (patch.status) { sets.push("status = ?"); vals.push(patch.status); }
  if (patch.install_location !== undefined) { sets.push("install_location = ?"); vals.push(patch.install_location); }
  if (sets.length === 0) return;
  sets.push("last_updated = NOW()");
  vals.push(deviceId);
  await query(`UPDATE devices SET ${sets.join(", ")} WHERE device_id = ?`, vals);
}

export async function deleteDevice(deviceId: number) {
  await query(`DELETE FROM devices WHERE device_id = ?`, [deviceId]);
}

// ─── Schedule Write ─────────────────────────────────────────────────

export async function insertSchedule(
  zoneId: number,
  deviceId: number,
  scheduleType: string | null,
  startTime: string | null,
  endTime: string | null,
  dayOfWeek: number | null,
  durationSeconds: number | null,
  createdBy: number | null,
): Promise<number> {
  const [result] = await getPool().execute(
    `INSERT INTO schedules (zone_id, device_id, execution_mode, schedule_type, start_time, end_time, day_of_week, duration_seconds, is_active, created_by)
     VALUES (?, ?, 'automatic', ?, ?, ?, ?, ?, TRUE, ?)`,
    [zoneId, deviceId, scheduleType, startTime, endTime, dayOfWeek, durationSeconds, createdBy],
  );
  return (result as { insertId: number }).insertId;
}

export async function updateSchedule(
  scheduleId: number,
  patch: { schedule_type?: string; start_time?: string; end_time?: string; day_of_week?: number | null; duration_seconds?: number | null; is_active?: boolean },
) {
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.schedule_type) { sets.push("schedule_type = ?"); vals.push(patch.schedule_type); }
  if (patch.start_time) { sets.push("start_time = ?"); vals.push(patch.start_time); }
  if (patch.end_time !== undefined) { sets.push("end_time = ?"); vals.push(patch.end_time); }
  if (patch.day_of_week !== undefined) { sets.push("day_of_week = ?"); vals.push(patch.day_of_week); }
  if (patch.duration_seconds !== undefined) { sets.push("duration_seconds = ?"); vals.push(patch.duration_seconds); }
  if (patch.is_active !== undefined) { sets.push("is_active = ?"); vals.push(patch.is_active ? 1 : 0); }
  if (sets.length === 0) return;
  vals.push(scheduleId);
  await query(`UPDATE schedules SET ${sets.join(", ")} WHERE schedule_id = ?`, vals);
}

export async function deleteSchedule(scheduleId: number) {
  await query(`DELETE FROM schedules WHERE schedule_id = ?`, [scheduleId]);
}

// ─── Alert Rule Write ───────────────────────────────────────────────

export async function insertAlertRule(
  ruleName: string,
  zoneId: number | null,
  severity: string,
  messageTemplate: string,
  createdBy: number | null,
  conditions: Array<{ metricType: string; operator: string; value1: number; value2?: number | null }>,
): Promise<number> {
  const [result] = await getPool().execute(
    `INSERT INTO alert_rules (rule_name, zone_id, severity, message_template, is_active, created_by)
     VALUES (?, ?, ?, ?, TRUE, ?)`,
    [ruleName, zoneId, severity, messageTemplate, createdBy],
  );
  const ruleId = (result as { insertId: number }).insertId;

  for (const c of conditions) {
    await getPool().execute(
      `INSERT INTO alert_rule_conditions (alert_rule_id, metric_type, operator, value1, value2, logical_group)
       VALUES (?, ?, ?, ?, ?, 'AND')`,
      [ruleId, c.metricType, c.operator, c.value1, c.value2 ?? null],
    );
  }

  return ruleId;
}

export async function updateAlertRule(
  ruleId: number,
  patch: { rule_name?: string; severity?: string; message_template?: string; is_active?: boolean },
) {
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.rule_name) { sets.push("rule_name = ?"); vals.push(patch.rule_name); }
  if (patch.severity) { sets.push("severity = ?"); vals.push(patch.severity); }
  if (patch.message_template) { sets.push("message_template = ?"); vals.push(patch.message_template); }
  if (patch.is_active !== undefined) { sets.push("is_active = ?"); vals.push(patch.is_active ? 1 : 0); }
  if (sets.length === 0) return;
  vals.push(ruleId);
  await query(`UPDATE alert_rules SET ${sets.join(", ")} WHERE alert_rule_id = ?`, vals);
}

export async function deleteAlertRule(ruleId: number) {
  await query(`DELETE FROM alert_rule_conditions WHERE alert_rule_id = ?`, [ruleId]);
  await query(`DELETE FROM alert_actions WHERE alert_rule_id = ?`, [ruleId]);
  await query(`DELETE FROM alert_rules WHERE alert_rule_id = ?`, [ruleId]);
}

// ─── User Write ─────────────────────────────────────────────────────

export async function insertUser(
  username: string,
  email: string,
  passwordHash: string,
  fullName: string | null,
  phone: string | null,
  roleId: number,
): Promise<number> {
  const [result] = await getPool().execute(
    `INSERT INTO users (username, email, password_hash, full_name, phone, role_id, is_active)
     VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
    [username, email, passwordHash, fullName, phone, roleId],
  );
  return (result as { insertId: number }).insertId;
}

export async function updateUser(
  userId: number,
  patch: { full_name?: string; phone?: string | null; role_id?: number; is_active?: boolean },
) {
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.full_name) { sets.push("full_name = ?"); vals.push(patch.full_name); }
  if (patch.phone !== undefined) { sets.push("phone = ?"); vals.push(patch.phone); }
  if (patch.role_id) { sets.push("role_id = ?"); vals.push(patch.role_id); }
  if (patch.is_active !== undefined) { sets.push("is_active = ?"); vals.push(patch.is_active ? 1 : 0); }
  if (sets.length === 0) return;
  vals.push(userId);
  await query(`UPDATE users SET ${sets.join(", ")} WHERE user_id = ?`, vals);
}

export async function deleteUser(userId: number) {
  await query(`DELETE FROM farm_user_access WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM user_zone_access WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM users WHERE user_id = ?`, [userId]);
}

// ─── Backup Write ───────────────────────────────────────────────────

export async function insertBackup(
  backupType: string,
  filePath: string,
  createdBy: number | null,
): Promise<number> {
  const [result] = await getPool().execute(
    `INSERT INTO data_backups (backup_type, file_path, status, created_by)
     VALUES (?, ?, 'pending', ?)`,
    [backupType, filePath, createdBy],
  );
  return (result as { insertId: number }).insertId;
}

export async function updateBackup(
  backupId: number,
  patch: { status?: string; file_size_bytes?: number; completed_at?: boolean },
) {
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.status) { sets.push("status = ?"); vals.push(patch.status); }
  if (patch.file_size_bytes) { sets.push("file_size_bytes = ?"); vals.push(patch.file_size_bytes); }
  if (patch.completed_at) { sets.push("completed_at = NOW()"); }
  if (sets.length === 0) return;
  vals.push(backupId);
  await query(`UPDATE data_backups SET ${sets.join(", ")} WHERE backup_id = ?`, vals);
}
