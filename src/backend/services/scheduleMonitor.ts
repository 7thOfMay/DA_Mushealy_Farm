import { query, queryOne } from "@/backend/config/db";

const MISSED_IRRIGATION_LOCK_ID = 48217031;
const MISSED_GRACE_MINUTES = 10;

type ScheduleCandidateRow = {
  schedule_id: number;
  zone_id: number;
  zone_name: string;
  farm_id: number;
  farm_name: string;
  device_id: number;
  device_name: string;
  device_status: string;
  start_time: string;
  duration_seconds: number | null;
  schedule_type: "daily" | "weekly";
  day_of_week: number | null;
};

function toTimeLabel(startTime: string) {
  return startTime.slice(0, 5);
}

function buildCause(deviceStatus: string) {
  if (deviceStatus === "offline") {
    return "Thiết bị đang offline nên không thể thực hiện tưới đúng giờ.";
  }

  if (deviceStatus === "error") {
    return "Thiết bị đang ở trạng thái lỗi, cần kiểm tra phần cứng hoặc gateway điều khiển.";
  }

  return "Chưa ghi nhận lệnh bật bơm trong khung giờ dự kiến. Cần kiểm tra gateway, kết nối thiết bị hoặc cấu hình lịch.";
}

function buildAlertMessage(row: ScheduleCandidateRow) {
  const timeLabel = toTimeLabel(row.start_time);
  return `Lịch tưới ${timeLabel} của khu vườn ${row.zone_name} không được thực hiện đúng giờ. ${buildCause(row.device_status)}`;
}

async function acquireLock() {
  const row = await queryOne<{ locked: boolean }>(
    "SELECT pg_try_advisory_lock($1) AS locked",
    [MISSED_IRRIGATION_LOCK_ID],
  );

  return row?.locked ?? false;
}

async function releaseLock() {
  await query("SELECT pg_advisory_unlock($1)", [MISSED_IRRIGATION_LOCK_ID]);
}

export async function ensureMissedIrrigationAlerts() {
  const locked = await acquireLock();
  if (!locked) return;

  try {
    const candidates = await query<ScheduleCandidateRow>(
      `
        SELECT
          s.schedule_id,
          s.zone_id,
          z.zone_name,
          z.farm_id,
          f.farm_name,
          s.device_id,
          d.device_name,
          d.status AS device_status,
          s.start_time::text AS start_time,
          s.duration_seconds,
          s.schedule_type,
          s.day_of_week
        FROM schedules s
        JOIN farm_zones z ON z.zone_id = s.zone_id
        JOIN farms f ON f.farm_id = z.farm_id
        JOIN devices d ON d.device_id = s.device_id
        JOIN device_types dt ON dt.device_type_id = d.device_type_id
        WHERE s.is_active = TRUE
          AND s.execution_mode = 'automatic'
          AND s.schedule_type IN ('daily', 'weekly')
          AND s.start_time IS NOT NULL
          AND (
            dt.type_name ILIKE '%pump%'
            OR d.device_name ILIKE '%pump%'
            OR d.device_name ILIKE '%bơm%'
            OR d.device_name ILIKE '%bom%'
          )
          AND (
            s.schedule_type = 'daily'
            OR (s.schedule_type = 'weekly' AND s.day_of_week = EXTRACT(DOW FROM NOW())::int)
          )
          AND NOW() >= date_trunc('day', NOW()) + s.start_time + INTERVAL '1 minute' * $1
          AND NOT EXISTS (
            SELECT 1
            FROM device_commands dc
            WHERE dc.device_id = s.device_id
              AND dc.command_type IN ('turn_on', 'pump_on', 'start_pump', 'start_irrigation')
              AND dc.status IN ('pending', 'sent', 'executed')
              AND dc.issued_at >= date_trunc('day', NOW()) + s.start_time - INTERVAL '5 minutes'
              AND dc.issued_at <= NOW()
          )
        ORDER BY s.schedule_id
      `,
      [MISSED_GRACE_MINUTES],
    );

    for (const row of candidates) {
      const message = buildAlertMessage(row);
      const existingAlert = await queryOne<{ alert_id: number }>(
        `
          SELECT alert_id
          FROM alerts
          WHERE zone_id = $1
            AND device_id = $2
            AND alert_type = 'system'
            AND source_type = 'system'
            AND created_at >= date_trunc('day', NOW())
            AND message = $3
          LIMIT 1
        `,
        [row.zone_id, row.device_id, message],
      );

      if (existingAlert) {
        continue;
      }

      const insertedAlert = await queryOne<{ alert_id: number }>(
        `
          INSERT INTO alerts (
            zone_id,
            device_id,
            alert_type,
            source_type,
            severity,
            message,
            status
          )
          VALUES ($1, $2, 'system', 'system', 'warning', $3, 'detected')
          RETURNING alert_id
        `,
        [row.zone_id, row.device_id, message],
      );

      await query(
        `
          INSERT INTO system_logs (
            user_id,
            action_type,
            entity_type,
            entity_id,
            description,
            value_before,
            value_after
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          null,
          "alert",
          "farm_zones",
          row.zone_id,
          `Missed irrigation schedule detected for ${row.zone_name} at ${toTimeLabel(row.start_time)}`,
          null,
          JSON.stringify({
            alertId: insertedAlert?.alert_id ?? null,
            scheduleId: row.schedule_id,
            farmId: row.farm_id,
            farmName: row.farm_name,
            gardenId: row.zone_id,
            gardenName: row.zone_name,
            deviceId: row.device_id,
            deviceName: row.device_name,
            scheduledTime: toTimeLabel(row.start_time),
            durationSeconds: row.duration_seconds ?? null,
            reason: buildCause(row.device_status),
          }),
        ],
      );
    }
  } finally {
    await releaseLock();
  }
}
