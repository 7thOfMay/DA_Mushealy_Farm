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

type HistoryMetricAggregateRow = {
  metric_type: string;
  total_records: number;
  first_recorded_at: Date | string | null;
  last_recorded_at: Date | string | null;
  min_value: number | null;
  max_value: number | null;
  avg_value: number | null;
  last_24h_records: number;
  last_24h_avg: number | null;
  last_24h_min: number | null;
  last_24h_max: number | null;
  last_7d_records: number;
  last_7d_avg: number | null;
  last_7d_min: number | null;
  last_7d_max: number | null;
  last_30d_records: number;
  last_30d_avg: number | null;
  last_30d_min: number | null;
  last_30d_max: number | null;
};

type HistorySampleRow = {
  metric_type: string;
  value: number;
  recorded_at: Date | string;
};

type HistoryDailyRow = {
  metric_type: string;
  bucket_date: Date | string;
  records: number;
  avg_value: number | null;
  min_value: number | null;
  max_value: number | null;
};

type HistoryCoverageRow = {
  first_recorded_at: Date | string | null;
  last_recorded_at: Date | string | null;
  total_records: number;
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

type AlertSummaryRow = {
  total_alerts: number;
  last_24h: number;
  last_7d: number;
  last_30d: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
};

type LogRow = {
  log_id: number;
  action_type: string;
  description: string;
  created_at: Date | string;
};

type LogSummaryRow = {
  total_logs: number;
  last_7d: number;
  last_30d: number;
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

function mapMetricKey(metricType: string) {
  if (metricType === "temperature") return "temperature" as const;
  if (metricType === "humidityAir") return "humidity_air" as const;
  if (metricType === "humiditySoil") return "humidity_soil" as const;
  if (metricType === "light") return "light" as const;
  return null;
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

  const sensorHistorySourceSql = `
    SELECT d.device_type_id, sd.value, sd.recorded_at
    FROM sensor_data sd
    JOIN devices d ON d.device_id = sd.device_id
    JOIN device_types dt ON dt.device_type_id = d.device_type_id
    WHERE d.zone_id = $1 AND dt.category = 'sensor'
    UNION ALL
    SELECT d.device_type_id, sda.value, sda.recorded_at
    FROM sensor_data_archive sda
    JOIN devices d ON d.device_id = sda.device_id
    JOIN device_types dt ON dt.device_type_id = d.device_type_id
    WHERE d.zone_id = $1 AND dt.category = 'sensor'
  `;

  const [sensors, thresholds, devices, schedules, alerts, recentLogs, historyCoverage, historyMetrics, historySamples, historyDaily, alertSummary, logSummary] = await Promise.all([
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
    queryOne<HistoryCoverageRow>(`
      WITH zone_sensor_data AS (
        ${sensorHistorySourceSql}
      )
      SELECT
        MIN(recorded_at) AS first_recorded_at,
        MAX(recorded_at) AS last_recorded_at,
        COUNT(*)::int AS total_records
      FROM zone_sensor_data
    `, [zoneNum]),
    query<HistoryMetricAggregateRow>(`
      WITH zone_sensor_data AS (
        ${sensorHistorySourceSql}
      )
      SELECT
        CASE device_type_id
          WHEN 1 THEN 'temperature'
          WHEN 2 THEN 'humidityAir'
          WHEN 3 THEN 'humiditySoil'
          WHEN 4 THEN 'light'
        END AS metric_type,
        COUNT(*)::int AS total_records,
        MIN(recorded_at) AS first_recorded_at,
        MAX(recorded_at) AS last_recorded_at,
        MIN(value) AS min_value,
        MAX(value) AS max_value,
        AVG(value) AS avg_value,
        COUNT(*) FILTER (WHERE recorded_at >= NOW() - INTERVAL '24 hours')::int AS last_24h_records,
        AVG(value) FILTER (WHERE recorded_at >= NOW() - INTERVAL '24 hours') AS last_24h_avg,
        MIN(value) FILTER (WHERE recorded_at >= NOW() - INTERVAL '24 hours') AS last_24h_min,
        MAX(value) FILTER (WHERE recorded_at >= NOW() - INTERVAL '24 hours') AS last_24h_max,
        COUNT(*) FILTER (WHERE recorded_at >= NOW() - INTERVAL '7 days')::int AS last_7d_records,
        AVG(value) FILTER (WHERE recorded_at >= NOW() - INTERVAL '7 days') AS last_7d_avg,
        MIN(value) FILTER (WHERE recorded_at >= NOW() - INTERVAL '7 days') AS last_7d_min,
        MAX(value) FILTER (WHERE recorded_at >= NOW() - INTERVAL '7 days') AS last_7d_max,
        COUNT(*) FILTER (WHERE recorded_at >= NOW() - INTERVAL '30 days')::int AS last_30d_records,
        AVG(value) FILTER (WHERE recorded_at >= NOW() - INTERVAL '30 days') AS last_30d_avg,
        MIN(value) FILTER (WHERE recorded_at >= NOW() - INTERVAL '30 days') AS last_30d_min,
        MAX(value) FILTER (WHERE recorded_at >= NOW() - INTERVAL '30 days') AS last_30d_max
      FROM zone_sensor_data
      GROUP BY device_type_id
    `, [zoneNum]),
    query<HistorySampleRow>(`
      WITH zone_sensor_data AS (
        ${sensorHistorySourceSql}
      ),
      ranked AS (
        SELECT
          CASE device_type_id
            WHEN 1 THEN 'temperature'
            WHEN 2 THEN 'humidityAir'
            WHEN 3 THEN 'humiditySoil'
            WHEN 4 THEN 'light'
          END AS metric_type,
          value,
          recorded_at,
          ROW_NUMBER() OVER (PARTITION BY device_type_id ORDER BY recorded_at DESC) AS rn
        FROM zone_sensor_data
      )
      SELECT metric_type, value, recorded_at
      FROM ranked
      WHERE rn <= 8
      ORDER BY metric_type, recorded_at DESC
    `, [zoneNum]),
    query<HistoryDailyRow>(`
      WITH zone_sensor_data AS (
        ${sensorHistorySourceSql}
      )
      SELECT
        CASE device_type_id
          WHEN 1 THEN 'temperature'
          WHEN 2 THEN 'humidityAir'
          WHEN 3 THEN 'humiditySoil'
          WHEN 4 THEN 'light'
        END AS metric_type,
        DATE_TRUNC('day', recorded_at) AS bucket_date,
        COUNT(*)::int AS records,
        AVG(value) AS avg_value,
        MIN(value) AS min_value,
        MAX(value) AS max_value
      FROM zone_sensor_data
      WHERE recorded_at >= NOW() - INTERVAL '14 days'
      GROUP BY device_type_id, DATE_TRUNC('day', recorded_at)
      ORDER BY bucket_date DESC
    `, [zoneNum]),
    queryOne<AlertSummaryRow>(`
      SELECT
        COUNT(*)::int AS total_alerts,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS last_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS last_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30d,
        COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_count,
        COUNT(*) FILTER (WHERE severity = 'warning')::int AS warning_count,
        COUNT(*) FILTER (WHERE severity = 'info')::int AS info_count
      FROM alerts
      WHERE zone_id = $1
    `, [zoneNum]),
    queryOne<LogSummaryRow>(`
      SELECT
        COUNT(*)::int AS total_logs,
        COUNT(*) FILTER (WHERE sl.created_at >= NOW() - INTERVAL '7 days')::int AS last_7d,
        COUNT(*) FILTER (WHERE sl.created_at >= NOW() - INTERVAL '30 days')::int AS last_30d
      FROM system_logs sl
      LEFT JOIN devices d ON sl.entity_type = 'devices' AND sl.entity_id = d.device_id
      LEFT JOIN farm_zones z1 ON z1.zone_id = d.zone_id
      LEFT JOIN farm_zones z2 ON sl.entity_type = 'gardens' AND sl.entity_id = z2.zone_id
      LEFT JOIN schedules s ON sl.entity_type = 'schedules' AND sl.entity_id = s.schedule_id
      LEFT JOIN farm_zones z3 ON z3.zone_id = s.zone_id
      WHERE COALESCE(z1.zone_id, z2.zone_id, z3.zone_id) = $1
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

  const historyMetricsMap: NonNullable<AIDashboardContext["history"]>["metrics"] = {};

  for (const row of historyMetrics) {
    const metricKey = mapMetricKey(row.metric_type);
    if (!metricKey) continue;

    historyMetricsMap[metricKey] = {
      totalRecords: Number(row.total_records ?? 0),
      firstRecordedAt: row.first_recorded_at ? toIso(row.first_recorded_at) : null,
      lastRecordedAt: row.last_recorded_at ? toIso(row.last_recorded_at) : null,
      min: row.min_value === null ? null : Number(row.min_value),
      max: row.max_value === null ? null : Number(row.max_value),
      avg: row.avg_value === null ? null : Number(row.avg_value),
      windows: {
        last24h: row.last_24h_records > 0 ? {
          records: Number(row.last_24h_records),
          avg: row.last_24h_avg === null ? null : Number(row.last_24h_avg),
          min: row.last_24h_min === null ? null : Number(row.last_24h_min),
          max: row.last_24h_max === null ? null : Number(row.last_24h_max),
        } : null,
        last7d: row.last_7d_records > 0 ? {
          records: Number(row.last_7d_records),
          avg: row.last_7d_avg === null ? null : Number(row.last_7d_avg),
          min: row.last_7d_min === null ? null : Number(row.last_7d_min),
          max: row.last_7d_max === null ? null : Number(row.last_7d_max),
        } : null,
        last30d: row.last_30d_records > 0 ? {
          records: Number(row.last_30d_records),
          avg: row.last_30d_avg === null ? null : Number(row.last_30d_avg),
          min: row.last_30d_min === null ? null : Number(row.last_30d_min),
          max: row.last_30d_max === null ? null : Number(row.last_30d_max),
        } : null,
      },
      recentSamples: [],
      dailyRollups: [],
    };
  }

  for (const row of historySamples) {
    const metricKey = mapMetricKey(row.metric_type);
    if (!metricKey) continue;
    historyMetricsMap[metricKey] ??= {
      totalRecords: 0,
      windows: {},
      recentSamples: [],
      dailyRollups: [],
    };
    historyMetricsMap[metricKey]!.recentSamples.push({
      value: Number(row.value),
      recordedAt: toIso(row.recorded_at),
    });
  }

  for (const row of historyDaily) {
    const metricKey = mapMetricKey(row.metric_type);
    if (!metricKey) continue;
    historyMetricsMap[metricKey] ??= {
      totalRecords: 0,
      windows: {},
      recentSamples: [],
      dailyRollups: [],
    };
    historyMetricsMap[metricKey]!.dailyRollups.push({
      date: toIso(row.bucket_date).slice(0, 10),
      records: Number(row.records ?? 0),
      avg: row.avg_value === null ? null : Number(row.avg_value),
      min: row.min_value === null ? null : Number(row.min_value),
      max: row.max_value === null ? null : Number(row.max_value),
    });
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
    history: {
      coverage: {
        firstRecordedAt: historyCoverage?.first_recorded_at ? toIso(historyCoverage.first_recorded_at) : null,
        lastRecordedAt: historyCoverage?.last_recorded_at ? toIso(historyCoverage.last_recorded_at) : null,
        totalRecords: Number(historyCoverage?.total_records ?? 0),
        includesArchive: true,
      },
      metrics: historyMetricsMap,
      alerts: {
        total: Number(alertSummary?.total_alerts ?? 0),
        last24h: Number(alertSummary?.last_24h ?? 0),
        last7d: Number(alertSummary?.last_7d ?? 0),
        last30d: Number(alertSummary?.last_30d ?? 0),
        bySeverity: {
          high: Number(alertSummary?.critical_count ?? 0),
          medium: Number(alertSummary?.warning_count ?? 0),
          low: Number(alertSummary?.info_count ?? 0),
        },
      },
      logs: {
        total: Number(logSummary?.total_logs ?? 0),
        last7d: Number(logSummary?.last_7d ?? 0),
        last30d: Number(logSummary?.last_30d ?? 0),
      },
    },
  } satisfies AIDashboardContext;
}

export function buildSessionTitle(message: string) {
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length <= 60 ? compact : `${compact.slice(0, 57)}...`;
}
