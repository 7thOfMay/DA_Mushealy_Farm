import { NextResponse } from "next/server";
import { isDbConfigured, query } from "@/backend/config/db";

export const dynamic = "force-dynamic";

type JournalKind = "sensor" | "alert" | "command" | "audit";

type JournalEntry = {
  id: string;
  kind: JournalKind;
  timestamp: string;
  title: string;
  description: string;
  farmId?: string;
  farmName?: string;
  gardenId?: string;
  gardenName?: string;
  deviceId?: string;
  deviceName?: string;
  actorName?: string;
  metricType?: "temperature" | "humidity_air" | "humidity_soil" | "light";
  value?: number;
  unit?: string;
  severity?: string;
  status?: string;
  before?: string;
  after?: string;
};

type JournalMetricType = NonNullable<JournalEntry["metricType"]>;

type Summary = {
  total: number;
  sensor: number;
  alert: number;
  command: number;
  audit: number;
};

type SensorRow = {
  sensor_data_id: number;
  recorded_at: Date | string;
  value: number;
  farm_id: number;
  farm_name: string;
  zone_id: number;
  zone_name: string;
  device_id: number;
  device_name: string;
  device_type_id: number;
  type_name: string;
  unit: string | null;
};

type AlertRow = {
  alert_id: number;
  created_at: Date | string;
  message: string;
  severity: string;
  status: string;
  actual_value: number | null;
  metric_type: string | null;
  farm_id: number;
  farm_name: string;
  zone_id: number;
  zone_name: string;
  device_id: number | null;
  device_name: string | null;
};

type CommandRow = {
  command_id: number;
  issued_at: Date | string;
  executed_at: Date | string | null;
  command_type: string;
  status: string;
  parameters: unknown;
  actor_name: string | null;
  farm_id: number;
  farm_name: string;
  zone_id: number;
  zone_name: string;
  device_id: number;
  device_name: string;
};

type AuditRow = {
  log_id: number;
  created_at: Date | string;
  action_type: string;
  description: string;
  value_before: unknown;
  value_after: unknown;
  user_name: string | null;
  farm_id: number | null;
  farm_name: string | null;
  zone_id: number | null;
  zone_name: string | null;
  device_id: number | null;
  device_name: string | null;
};

function sid(prefix: string, id: number) {
  return `${prefix}${id}`;
}

function safeIso(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}

function metricLabel(metricType: string | null): JournalMetricType | undefined {
  switch (metricType) {
    case "temperature":
      return "temperature";
    case "air_humidity":
      return "humidity_air";
    case "soil_moisture":
      return "humidity_soil";
    case "light":
      return "light";
    default:
      return undefined;
  }
}

function metricFromDeviceType(deviceTypeId: number): JournalMetricType | undefined {
  switch (deviceTypeId) {
    case 1:
      return "temperature";
    case 2:
      return "humidity_air";
    case 3:
      return "humidity_soil";
    case 4:
      return "light";
    default:
      return undefined;
  }
}

function buildCommonFilter(
  hours: number,
  farmId: number | null,
  gardenId: number | null,
  timestampColumn: string,
  farmColumn: string,
  gardenColumn: string,
) {
  const params: Array<number | string> = [hours];
  const clauses = [`${timestampColumn} >= NOW() - INTERVAL '1 hour' * $1`];

  if (farmId !== null) {
    params.push(farmId);
    clauses.push(`${farmColumn} = $${params.length}`);
  }

  if (gardenId !== null) {
    params.push(gardenId);
    clauses.push(`${gardenColumn} = $${params.length}`);
  }

  return { params, where: clauses.join(" AND ") };
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const hours = Math.min(Math.max(parseInt(searchParams.get("hours") ?? "168", 10) || 168, 1), 24 * 30);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "300", 10) || 300, 50), 1000);
    const farmId = searchParams.get("farmId");
    const gardenId = searchParams.get("gardenId");
    const metricTypeFilter = searchParams.get("metricType");
    const search = (searchParams.get("q") ?? "").trim().toLowerCase();
    const kinds = new Set(
      (searchParams.get("kinds") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );

    const farmNum = farmId ? parseInt(farmId.replace(/^f/, ""), 10) : null;
    const gardenNum = gardenId ? parseInt(gardenId.replace(/^g/, ""), 10) : null;

    const sensorFilter = buildCommonFilter(hours, farmNum, gardenNum, "sd.recorded_at", "f.farm_id", "z.zone_id");
    const alertFilter = buildCommonFilter(hours, farmNum, gardenNum, "a.created_at", "f.farm_id", "z.zone_id");
    const commandFilter = buildCommonFilter(hours, farmNum, gardenNum, "dc.issued_at", "f.farm_id", "z.zone_id");
    const auditFilter = buildCommonFilter(hours, farmNum, gardenNum, "sl.created_at", "COALESCE(fd.farm_id, fz.farm_id, ff.farm_id)", "COALESCE(zd.zone_id, zz.zone_id)");

    const [sensorRows, alertRows, commandRows, auditRows] = await Promise.all([
      query<SensorRow>(`
        SELECT sd.sensor_data_id, sd.recorded_at, sd.value,
               f.farm_id, f.farm_name, z.zone_id, z.zone_name,
               d.device_id, d.device_name, d.device_type_id, dt.type_name, dt.unit
        FROM sensor_data sd
        JOIN devices d ON d.device_id = sd.device_id
        JOIN device_types dt ON dt.device_type_id = d.device_type_id
        JOIN farm_zones z ON z.zone_id = d.zone_id
        JOIN farms f ON f.farm_id = z.farm_id
        WHERE dt.category = 'sensor' AND ${sensorFilter.where}
        ORDER BY sd.recorded_at DESC
        LIMIT ${limit}
      `, sensorFilter.params),
      query<AlertRow>(`
        SELECT a.alert_id, a.created_at, a.message, a.severity, a.status, a.actual_value, a.metric_type,
               f.farm_id, f.farm_name, z.zone_id, z.zone_name,
               d.device_id, d.device_name
        FROM alerts a
        JOIN farm_zones z ON z.zone_id = a.zone_id
        JOIN farms f ON f.farm_id = z.farm_id
        LEFT JOIN devices d ON d.device_id = a.device_id
        WHERE ${alertFilter.where}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `, alertFilter.params),
      query<CommandRow>(`
        SELECT dc.command_id, dc.issued_at, dc.executed_at, dc.command_type, dc.status, dc.parameters,
               u.full_name AS actor_name,
               f.farm_id, f.farm_name, z.zone_id, z.zone_name,
               d.device_id, d.device_name
        FROM device_commands dc
        JOIN devices d ON d.device_id = dc.device_id
        JOIN farm_zones z ON z.zone_id = d.zone_id
        JOIN farms f ON f.farm_id = z.farm_id
        LEFT JOIN users u ON u.user_id = dc.issued_by
        WHERE ${commandFilter.where}
        ORDER BY dc.issued_at DESC
        LIMIT ${limit}
      `, commandFilter.params),
      query<AuditRow>(`
        SELECT sl.log_id, sl.created_at, sl.action_type, sl.description, sl.value_before, sl.value_after,
               u.full_name AS user_name,
               COALESCE(fd.farm_id, fz.farm_id, ff.farm_id) AS farm_id,
               COALESCE(fd.farm_name, fz.farm_name, ff.farm_name) AS farm_name,
               COALESCE(zd.zone_id, zz.zone_id) AS zone_id,
               COALESCE(zd.zone_name, zz.zone_name) AS zone_name,
               d.device_id, d.device_name
        FROM system_logs sl
        LEFT JOIN users u ON u.user_id = sl.user_id
        LEFT JOIN devices d ON sl.entity_type = 'devices' AND sl.entity_id = d.device_id
        LEFT JOIN farm_zones zd ON zd.zone_id = d.zone_id
        LEFT JOIN farms fd ON fd.farm_id = zd.farm_id
        LEFT JOIN farm_zones zz ON sl.entity_type = 'farm_zones' AND sl.entity_id = zz.zone_id
        LEFT JOIN farms fz ON fz.farm_id = zz.farm_id
        LEFT JOIN farms ff ON sl.entity_type = 'farms' AND sl.entity_id = ff.farm_id
        WHERE ${auditFilter.where}
        ORDER BY sl.created_at DESC
        LIMIT ${limit}
      `, auditFilter.params),
    ]);

    const entries: JournalEntry[] = [
      ...sensorRows.map((row) => ({
        id: sid("sj", row.sensor_data_id),
        kind: "sensor" as const,
        timestamp: safeIso(row.recorded_at),
        title: `${row.device_name} ghi nhận dữ liệu`,
        description: `${row.type_name} tại ${row.zone_name}: ${Number(row.value).toFixed(2)} ${row.unit ?? ""}`.trim(),
        farmId: sid("f", row.farm_id),
        farmName: row.farm_name,
        gardenId: sid("g", row.zone_id),
        gardenName: row.zone_name,
        deviceId: sid("d", row.device_id),
        deviceName: row.device_name,
        metricType: metricFromDeviceType(row.device_type_id),
        value: Number(row.value),
        unit: row.unit ?? undefined,
      })),
      ...alertRows.map((row) => ({
        id: sid("aj", row.alert_id),
        kind: "alert" as const,
        timestamp: safeIso(row.created_at),
        title: `Cảnh báo ${row.severity}`,
        description: row.message,
        farmId: sid("f", row.farm_id),
        farmName: row.farm_name,
        gardenId: sid("g", row.zone_id),
        gardenName: row.zone_name,
        deviceId: row.device_id ? sid("d", row.device_id) : undefined,
        deviceName: row.device_name ?? undefined,
        metricType: metricLabel(row.metric_type),
        value: row.actual_value ?? undefined,
        severity: row.severity,
        status: row.status,
      })),
      ...commandRows.map((row) => ({
        id: sid("cj", row.command_id),
        kind: "command" as const,
        timestamp: safeIso(row.issued_at),
        title: `Lệnh thiết bị ${row.command_type}`,
        description: `${row.device_name} - trạng thái ${row.status}`,
        farmId: sid("f", row.farm_id),
        farmName: row.farm_name,
        gardenId: sid("g", row.zone_id),
        gardenName: row.zone_name,
        deviceId: sid("d", row.device_id),
        deviceName: row.device_name,
        actorName: row.actor_name ?? "Hệ thống",
        status: row.status,
        after: row.parameters ? JSON.stringify(row.parameters) : undefined,
      })),
      ...auditRows.map((row) => ({
        id: sid("lj", row.log_id),
        kind: "audit" as const,
        timestamp: safeIso(row.created_at),
        title: `Nhật ký hệ thống ${row.action_type}`,
        description: row.description,
        farmId: row.farm_id ? sid("f", row.farm_id) : undefined,
        farmName: row.farm_name ?? undefined,
        gardenId: row.zone_id ? sid("g", row.zone_id) : undefined,
        gardenName: row.zone_name ?? undefined,
        deviceId: row.device_id ? sid("d", row.device_id) : undefined,
        deviceName: row.device_name ?? undefined,
        actorName: row.user_name ?? "Hệ thống",
        before: row.value_before ? JSON.stringify(row.value_before) : undefined,
        after: row.value_after ? JSON.stringify(row.value_after) : undefined,
      })),
    ];

    const filtered = entries
      .filter((entry) => (kinds.size > 0 ? kinds.has(entry.kind) : true))
      .filter((entry) => (metricTypeFilter && metricTypeFilter !== "all" ? entry.metricType === metricTypeFilter : true))
      .filter((entry) => {
        if (!search) return true;
        const haystack = [
          entry.title,
          entry.description,
          entry.farmName ?? "",
          entry.gardenName ?? "",
          entry.deviceName ?? "",
          entry.actorName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    const summary = filtered.reduce<Summary>(
      (acc, entry) => {
        acc.total += 1;
        acc[entry.kind] += 1;
        return acc;
      },
      { total: 0, sensor: 0, alert: 0, command: 0, audit: 0 },
    );

    return NextResponse.json({ entries: filtered, summary });
  } catch (err) {
    console.error("[API /logs/journal]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
