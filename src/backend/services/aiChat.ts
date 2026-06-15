import { query, queryOne } from "@/backend/config/db";
import type {
  AIDashboardContext,
  AIChatMessage,
  AIChatSessionDetail,
  AIChatSessionSummary,
  AIChatRole,
  AlertSeverity,
  AlertStatus,
  DeviceType,
} from "@/types";

const SESSION_LIMIT = 10;

type SessionRow = {
  chat_session_id: number;
  user_id: number;
  zone_id: number;
  zone_name: string;
  title: string;
  updated_at: Date | string;
  message_count: number;
  preview: string | null;
};

type MessageRow = {
  chat_message_id: number;
  role: AIChatRole;
  content: string;
  image_url: string | null;
  created_at: Date | string;
};

type GardenRow = {
  zone_id: number;
  zone_name: string;
  farm_id: number;
  farm_name: string;
  plant_name: string | null;
  status: string;
  area_m2: number | null;
};

type SensorRow = {
  metric_type: string;
  value: number;
  recorded_at: Date | string;
};

type ThresholdRow = {
  metric_type: string;
  min_value: number | null;
  max_value: number | null;
};

type DeviceRow = {
  device_id: number;
  device_name: string;
  device_type_id: number;
  status: string;
  last_updated: Date | string | null;
};

type ScheduleRow = {
  schedule_id: number;
  device_name: string;
  start_time: string | null;
  schedule_type: string | null;
  is_active: boolean;
  duration_seconds: number | null;
};

type AlertRow = {
  alert_id: number;
  severity: string;
  status: string;
  message: string;
  created_at: Date | string;
};

type LogRow = {
  log_id: number;
  action_type: string;
  description: string;
  created_at: Date | string;
};

function sid(prefix: string, id: number) {
  return `${prefix}${id}`;
}

function numericId(value: string, prefix: string) {
  const num = Number.parseInt(value.replace(new RegExp(`^${prefix}`), ""), 10);
  return Number.isFinite(num) ? num : null;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}

function diffMinutesFromNow(value: Date | string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

function mapDeviceType(deviceTypeId: number): DeviceType {
  switch (deviceTypeId) {
    case 1:
      return "sensor_temp";
    case 2:
      return "sensor_humidity_air";
    case 3:
      return "sensor_humidity_soil";
    case 4:
      return "sensor_light";
    case 7:
    case 8:
      return "led_rgb";
    default:
      return "pump";
  }
}

function mapAlertSeverity(severity: string): AlertSeverity {
  switch (severity) {
    case "critical":
      return "high";
    case "info":
      return "low";
    default:
      return "medium";
  }
}

function mapAlertStatus(status: string): AlertStatus {
  switch (status) {
    case "processing":
      return "PROCESSING";
    case "resolved":
      return "RESOLVED";
    default:
      return "DETECTED";
  }
}

function mapSessionSummary(row: SessionRow): AIChatSessionSummary {
  return {
    id: sid("aics", row.chat_session_id),
    gardenId: sid("g", row.zone_id),
    gardenName: row.zone_name,
    title: row.title,
    preview: row.preview?.trim() || "Chưa có nội dung",
    updatedAt: toIso(row.updated_at),
    messageCount: Number(row.message_count ?? 0),
  };
}

function mapMessage(row: MessageRow): AIChatMessage {
  return {
    id: sid("aicm", row.chat_message_id),
    role: row.role,
    content: row.content,
    createdAt: toIso(row.created_at),
    imageUrl: row.image_url,
  };
}

export async function ensureAiChatTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS ai_chat_sessions (
      chat_session_id BIGSERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      zone_id INT NOT NULL REFERENCES farm_zones(zone_id) ON DELETE CASCADE,
      title VARCHAR(160) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      chat_message_id BIGSERIAL PRIMARY KEY,
      chat_session_id BIGINT NOT NULL REFERENCES ai_chat_sessions(chat_session_id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant')),
      content TEXT NOT NULL,
      image_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_zone_updated
    ON ai_chat_sessions (user_id, zone_id, updated_at DESC)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_created
    ON ai_chat_messages (chat_session_id, created_at ASC)
  `);
}

export async function fetchAiChatSessions(userId: string, gardenId: string) {
  await ensureAiChatTables();

  const userNum = numericId(userId, "u");
  const zoneNum = numericId(gardenId, "g");
  if (!userNum || !zoneNum) return [];

  const rows = await query<SessionRow>(`
    SELECT s.chat_session_id, s.user_id, s.zone_id, z.zone_name, s.title, s.updated_at,
           COUNT(m.chat_message_id)::int AS message_count,
           COALESCE(
             (
               SELECT LEFT(m2.content, 160)
               FROM ai_chat_messages m2
               WHERE m2.chat_session_id = s.chat_session_id
               ORDER BY m2.created_at DESC
               LIMIT 1
             ),
             ''
           ) AS preview
    FROM ai_chat_sessions s
    JOIN farm_zones z ON z.zone_id = s.zone_id
    LEFT JOIN ai_chat_messages m ON m.chat_session_id = s.chat_session_id
    WHERE s.user_id = $1 AND s.zone_id = $2
    GROUP BY s.chat_session_id, z.zone_name
    ORDER BY s.updated_at DESC
    LIMIT $3
  `, [userNum, zoneNum, SESSION_LIMIT]);

  return rows.map(mapSessionSummary);
}

export async function fetchAiChatSessionDetail(sessionId: string, userId: string) {
  await ensureAiChatTables();

  const sessionNum = numericId(sessionId, "aics");
  const userNum = numericId(userId, "u");
  if (!sessionNum || !userNum) return null;

  const session = await queryOne<SessionRow>(`
    SELECT s.chat_session_id, s.user_id, s.zone_id, z.zone_name, s.title, s.updated_at,
           COUNT(m.chat_message_id)::int AS message_count,
           COALESCE(
             (
               SELECT LEFT(m2.content, 160)
               FROM ai_chat_messages m2
               WHERE m2.chat_session_id = s.chat_session_id
               ORDER BY m2.created_at DESC
               LIMIT 1
             ),
             ''
           ) AS preview
    FROM ai_chat_sessions s
    JOIN farm_zones z ON z.zone_id = s.zone_id
    LEFT JOIN ai_chat_messages m ON m.chat_session_id = s.chat_session_id
    WHERE s.chat_session_id = $1 AND s.user_id = $2
    GROUP BY s.chat_session_id, z.zone_name
  `, [sessionNum, userNum]);

  if (!session) return null;

  const messages = await query<MessageRow>(`
    SELECT chat_message_id, role, content, image_url, created_at
    FROM ai_chat_messages
    WHERE chat_session_id = $1
    ORDER BY created_at ASC
  `, [sessionNum]);

  return {
    ...mapSessionSummary(session),
    messages: messages.map(mapMessage),
  } satisfies AIChatSessionDetail;
}

export async function createAiChatSession(userId: string, gardenId: string, title: string) {
  await ensureAiChatTables();

  const userNum = numericId(userId, "u");
  const zoneNum = numericId(gardenId, "g");
  if (!userNum || !zoneNum) {
    throw new Error("Invalid AI chat identifiers");
  }

  const row = await queryOne<{ chat_session_id: number }>(`
    INSERT INTO ai_chat_sessions (user_id, zone_id, title)
    VALUES ($1, $2, $3)
    RETURNING chat_session_id
  `, [userNum, zoneNum, title]);

  await pruneAiChatSessions(userNum, zoneNum);

  return sid("aics", row!.chat_session_id);
}

async function pruneAiChatSessions(userId: number, zoneId: number) {
  await query(`
    DELETE FROM ai_chat_sessions
    WHERE chat_session_id IN (
      SELECT chat_session_id
      FROM ai_chat_sessions
      WHERE user_id = $1 AND zone_id = $2
      ORDER BY updated_at DESC
      OFFSET $3
    )
  `, [userId, zoneId, SESSION_LIMIT]);
}

export async function insertAiChatMessage(
  sessionId: string,
  role: AIChatRole,
  content: string,
  imageUrl?: string | null,
) {
  await ensureAiChatTables();

  const sessionNum = numericId(sessionId, "aics");
  if (!sessionNum) {
    throw new Error("Invalid AI chat session");
  }

  const row = await queryOne<{ chat_message_id: number; created_at: Date | string }>(`
    INSERT INTO ai_chat_messages (chat_session_id, role, content, image_url)
    VALUES ($1, $2, $3, $4)
    RETURNING chat_message_id, created_at
  `, [sessionNum, role, content, imageUrl ?? null]);

  await query(`
    UPDATE ai_chat_sessions
    SET updated_at = NOW()
    WHERE chat_session_id = $1
  `, [sessionNum]);

  return {
    id: sid("aicm", row!.chat_message_id),
    role,
    content,
    createdAt: toIso(row!.created_at),
    imageUrl: imageUrl ?? null,
  } satisfies AIChatMessage;
}

export async function renameAiChatSession(sessionId: string, title: string) {
  const sessionNum = numericId(sessionId, "aics");
  if (!sessionNum) return;

  await query(`
    UPDATE ai_chat_sessions
    SET title = $2, updated_at = NOW()
    WHERE chat_session_id = $1
  `, [sessionNum, title]);
}

export async function deleteAiChatSession(sessionId: string, userId: string) {
  await ensureAiChatTables();

  const sessionNum = numericId(sessionId, "aics");
  const userNum = numericId(userId, "u");
  if (!sessionNum || !userNum) return false;

  await query(`
    DELETE FROM ai_chat_sessions
    WHERE chat_session_id = $1 AND user_id = $2
  `, [sessionNum, userNum]);

  return true;
}

export async function fetchGardenDashboardContext(gardenId: string) {
  const zoneNum = numericId(gardenId, "g");
  if (!zoneNum) return null;

  const garden = await queryOne<GardenRow>(`
    SELECT z.zone_id, z.zone_name, z.farm_id, f.farm_name, pt.plant_name, z.status, z.area_m2
    FROM farm_zones z
    JOIN farms f ON f.farm_id = z.farm_id
    LEFT JOIN plant_types pt ON pt.plant_type_id = z.plant_type_id
    WHERE z.zone_id = $1
  `, [zoneNum]);

  if (!garden) return null;

  const [sensors, thresholds, devices, schedules, alerts, recentLogs] = await Promise.all([
    query<SensorRow>(`
      SELECT metric_type, value, recorded_at
      FROM (
        SELECT
          CASE d.device_type_id
            WHEN 1 THEN 'temperature'
            WHEN 2 THEN 'humidityAir'
            WHEN 3 THEN 'humiditySoil'
            WHEN 4 THEN 'light'
          END AS metric_type,
          sd.value,
          sd.recorded_at,
          ROW_NUMBER() OVER (PARTITION BY d.device_type_id ORDER BY sd.recorded_at DESC) AS rn
        FROM sensor_data sd
        JOIN devices d ON d.device_id = sd.device_id
        JOIN device_types dt ON dt.device_type_id = d.device_type_id
        WHERE d.zone_id = $1 AND dt.category = 'sensor'
      ) latest
      WHERE rn = 1
    `, [zoneNum]),
    query<ThresholdRow>(`
      SELECT
        CASE metric_type
          WHEN 'air_humidity' THEN 'humidityAir'
          WHEN 'soil_moisture' THEN 'humiditySoil'
          ELSE metric_type
        END AS metric_type,
        min_value,
        max_value
      FROM zone_thresholds
      WHERE zone_id = $1
    `, [zoneNum]),
    query<DeviceRow>(`
      SELECT device_id, device_name, device_type_id, status, last_updated
      FROM devices
      WHERE zone_id = $1
      ORDER BY device_type_id, device_name
    `, [zoneNum]),
    query<ScheduleRow>(`
      SELECT s.schedule_id, d.device_name,
             TO_CHAR(s.start_time, 'HH24:MI') AS start_time,
             s.schedule_type, s.is_active, s.duration_seconds
      FROM schedules s
      JOIN devices d ON d.device_id = s.device_id
      WHERE s.zone_id = $1
      ORDER BY s.is_active DESC, s.start_time NULLS LAST, s.created_at DESC
      LIMIT 8
    `, [zoneNum]),
    query<AlertRow>(`
      SELECT alert_id, severity, status, message, created_at
      FROM alerts
      WHERE zone_id = $1
      ORDER BY created_at DESC
      LIMIT 6
    `, [zoneNum]),
    query<LogRow>(`
      SELECT sl.log_id, sl.action_type, sl.description, sl.created_at
      FROM system_logs sl
      LEFT JOIN devices d ON sl.entity_type = 'devices' AND sl.entity_id = d.device_id
      LEFT JOIN farm_zones z1 ON z1.zone_id = d.zone_id
      LEFT JOIN farm_zones z2 ON sl.entity_type = 'gardens' AND sl.entity_id = z2.zone_id
      LEFT JOIN schedules s ON sl.entity_type = 'schedules' AND sl.entity_id = s.schedule_id
      LEFT JOIN farm_zones z3 ON z3.zone_id = s.zone_id
      WHERE COALESCE(z1.zone_id, z2.zone_id, z3.zone_id) = $1
      ORDER BY sl.created_at DESC
      LIMIT 6
    `, [zoneNum]),
  ]);

  const latestSensors: AIDashboardContext["latestSensors"] = {};
  for (const row of sensors) {
    if (row.metric_type === "temperature") latestSensors.temperature = row.value;
    if (row.metric_type === "humidityAir") latestSensors.humidityAir = row.value;
    if (row.metric_type === "humiditySoil") latestSensors.humiditySoil = row.value;
    if (row.metric_type === "light") latestSensors.light = row.value;
    latestSensors.updatedAt = toIso(row.recorded_at);
  }

  latestSensors.ageMinutes = diffMinutesFromNow(latestSensors.updatedAt);
  latestSensors.isStale = latestSensors.ageMinutes !== null ? latestSensors.ageMinutes >= 60 : true;

  const thresholdMap: AIDashboardContext["thresholds"] = {};
  for (const row of thresholds) {
    const next = row.min_value === null && row.max_value === null
      ? null
      : {
          min: Number(row.min_value ?? 0),
          max: Number(row.max_value ?? 0),
        };
    if (row.metric_type === "temperature") thresholdMap.temperature = next;
    if (row.metric_type === "humidityAir") thresholdMap.humidityAir = next;
    if (row.metric_type === "humiditySoil") thresholdMap.humiditySoil = next;
    if (row.metric_type === "light") thresholdMap.light = next;
  }

  return {
    gardenId: sid("g", garden.zone_id),
    gardenName: garden.zone_name,
    farmId: sid("f", garden.farm_id),
    farmName: garden.farm_name,
    plantLabel: garden.plant_name ?? undefined,
    status: garden.status,
    areaM2: garden.area_m2,
    latestSensors,
    thresholds: thresholdMap,
    devices: devices.map((row) => ({
      id: sid("d", row.device_id),
      name: row.device_name,
      type: mapDeviceType(row.device_type_id),
      status: row.status,
      isOn: row.status === "active",
      lastUpdated: row.last_updated ? toIso(row.last_updated) : null,
    })),
    schedules: schedules.map((row) => ({
      id: sid("s", row.schedule_id),
      deviceName: row.device_name,
      startTime: row.start_time,
      repeat: row.schedule_type,
      isActive: row.is_active,
      durationSeconds: row.duration_seconds,
    })),
    alerts: alerts.map((row) => ({
      id: sid("a", row.alert_id),
      severity: mapAlertSeverity(row.severity),
      status: mapAlertStatus(row.status),
      message: row.message,
      detectedAt: toIso(row.created_at),
    })),
    recentLogs: recentLogs.map((row) => ({
      id: sid("log", row.log_id),
      title: row.action_type,
      description: row.description,
      createdAt: toIso(row.created_at),
    })),
  } satisfies AIDashboardContext;
}

export function buildSessionTitle(message: string) {
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length <= 60 ? compact : `${compact.slice(0, 57)}...`;
}
