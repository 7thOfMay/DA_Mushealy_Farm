import { NextResponse } from "next/server";
import { query } from "@/backend/config/db";

export const dynamic = "force-dynamic";

type SensorDeviceRow = {
  device_id: number;
  zone_id: number;
  device_type_id: number;
};

type SeedAction = "seed" | "cleanup" | "realtime" | "reset-devices";

type SeedRequestBody = {
  action?: SeedAction;
  timestamps?: string[];
  startAt?: string;
  count?: number;
  intervalMinutes?: number;
  intervalSeconds?: number;
  batchSize?: number;
  totalRows?: number;
};

const SENSOR_TYPE_IDS = [1, 2, 3, 4] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTimestamp(value: Date) {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function buildMockTimestamps(body: SeedRequestBody) {
  if (Array.isArray(body.timestamps) && body.timestamps.length > 0) {
    return body.timestamps.map((timestamp) => {
      const value = new Date(timestamp);
      value.setSeconds(0, 0);
      return value;
    });
  }

  const count = Math.max(1, Math.min(body.count ?? 5, 50));
  const intervalMinutes = Math.max(1, Math.min(body.intervalMinutes ?? 180, 1440));
  const now = new Date();
  now.setSeconds(0, 0);

  if (body.startAt) {
    const start = new Date(body.startAt);
    if (!Number.isNaN(start.getTime())) {
      const normalized = new Date(start);
      normalized.setSeconds(0, 0);
      return Array.from({ length: count }, (_, index) =>
        new Date(normalized.getTime() + index * intervalMinutes * 60 * 1000),
      );
    }
  }

  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
  const daysAgo = (days: number, hour: number, minute: number) => {
    const value = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    value.setHours(hour, minute, 0, 0);
    return value;
  };

  return [
    minutesAgo(10),
    hoursAgo(2),
    hoursAgo(11),
    daysAgo(2, 8, 15),
    daysAgo(11, 16, 45),
  ];
}

function mockValue(deviceTypeId: number, zoneIndex: number, timeIndex: number) {
  switch (deviceTypeId) {
    case 1:
      return 24.5 + zoneIndex * 1.4 + timeIndex * 0.6;
    case 2:
      return 62 + zoneIndex * 4 + timeIndex * 3;
    case 3:
      return 38 + zoneIndex * 5 + timeIndex * 4;
    case 4:
      return 12000 + zoneIndex * 2500 + timeIndex * 1800;
    default:
      return 0;
  }
}

function mockRealtimeValue(deviceTypeId: number, zoneIndex: number, tickIndex: number) {
  const wave = Math.sin((tickIndex + 1) / 2 + zoneIndex);
  switch (deviceTypeId) {
    case 1:
      return 25.2 + zoneIndex * 1.1 + wave * 1.6 + tickIndex * 0.08;
    case 2:
      return 64 + zoneIndex * 3.8 + wave * 5.2 - tickIndex * 0.05;
    case 3:
      return 44 + zoneIndex * 4.5 + wave * 6.1 - tickIndex * 0.12;
    case 4:
      return 14500 + zoneIndex * 2100 + wave * 1800 + tickIndex * 140;
    default:
      return 0;
  }
}

async function loadTargetDevices() {
  const rows = await query<SensorDeviceRow>(`
    SELECT d.device_id, d.zone_id, d.device_type_id
    FROM devices d
    JOIN device_types dt ON dt.device_type_id = d.device_type_id
    WHERE dt.category = 'sensor'
      AND d.device_type_id IN (1, 2, 3, 4)
    ORDER BY d.zone_id ASC, d.device_type_id ASC, d.device_id ASC
  `);

  const zoneOrder: number[] = [];
  const seenZones = new Set<number>();
  const byZone = new Map<number, Map<number, SensorDeviceRow>>();

  for (const row of rows) {
    if (!seenZones.has(row.zone_id)) {
      seenZones.add(row.zone_id);
      zoneOrder.push(row.zone_id);
    }
    if (!byZone.has(row.zone_id)) {
      byZone.set(row.zone_id, new Map<number, SensorDeviceRow>());
    }
    const typeMap = byZone.get(row.zone_id)!;
    if (!typeMap.has(row.device_type_id)) {
      typeMap.set(row.device_type_id, row);
    }
  }

  const pickedZones = zoneOrder.slice(0, 3);
  const devices: SensorDeviceRow[] = [];

  for (const zoneId of pickedZones) {
    const typeMap = byZone.get(zoneId);
    if (!typeMap) continue;
    for (const typeId of SENSOR_TYPE_IDS) {
      const device = typeMap.get(typeId);
      if (device) devices.push(device);
    }
  }

  return devices;
}

async function insertBulkSeedRows(
  devices: SensorDeviceRow[],
  timestamps: Date[],
  synced: boolean,
) {
  const inserts: Array<number | string | boolean | null> = [];
  const valueGroups: string[] = [];

  devices.forEach((device, zoneIndex) => {
    timestamps.forEach((timestamp, timeIndex) => {
      const offset = inserts.length;
      inserts.push(
        device.device_id,
        Number(mockValue(device.device_type_id, zoneIndex, timeIndex).toFixed(2)),
        normalizeTimestamp(timestamp),
        synced,
      );
      valueGroups.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
    });
  });

  return query<{ sensor_data_id: number; device_id: number; recorded_at: string }>(`
    INSERT INTO sensor_data (device_id, value, recorded_at, synced)
    VALUES ${valueGroups.join(", ")}
    RETURNING sensor_data_id, device_id, recorded_at
  `, inserts);
}

async function insertRealtimeBurstRows(
  devices: SensorDeviceRow[],
  tickIndex: number,
  batchSize: number,
) {
  const now = new Date();
  const inserts: Array<number | string | boolean | null> = [];
  const valueGroups: string[] = [];
  const sample: Array<{ deviceId: number; value: number; recordedAt: string }> = [];

  Array.from({ length: batchSize }, (_, index) => {
    const device = devices[(tickIndex * batchSize + index) % devices.length];
    return { device, zoneIndex: index };
  }).forEach(({ device, zoneIndex }) => {
    const offset = inserts.length;
    const value = Number(mockRealtimeValue(device.device_type_id, zoneIndex, tickIndex).toFixed(2));
    const recordedAt = new Date(now.getTime() + zoneIndex * 850);
    const normalized = normalizeTimestamp(recordedAt);
    inserts.push(device.device_id, value, normalized, false);
    valueGroups.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
    sample.push({
      deviceId: device.device_id,
      value,
      recordedAt: recordedAt.toISOString(),
    });
  });

  const inserted = await query<{ sensor_data_id: number; device_id: number; recorded_at: string }>(`
    INSERT INTO sensor_data (device_id, value, recorded_at, synced)
    VALUES ${valueGroups.join(", ")}
    RETURNING sensor_data_id, device_id, recorded_at
  `, inserts);

  return {
    insertedRows: inserted.length,
    sample,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SeedRequestBody;
  const action = body.action ?? "seed";

  // Reset tất cả thiết bị về 'online' (kết nối, chưa hoạt động)
  if (action === "reset-devices") {
    await query(`UPDATE devices SET status = 'online', last_updated = NOW()`, []);
    return NextResponse.json({ ok: true, action: "reset-devices", message: "Tất cả thiết bị đã được reset về trạng thái online" });
  }

  const devices = await loadTargetDevices();
  if (!devices.length) {
    return NextResponse.json({ error: "Không tìm thấy thiết bị cảm biến để mock" }, { status: 400 });
  }

  if (action === "realtime") {
    const totalRows = Math.max(1, Math.min(body.totalRows ?? 100, 240));
    const intervalSeconds = Math.max(1, Math.min(body.intervalSeconds ?? 3, 30));
    const batchSize = Math.max(1, Math.min(body.batchSize ?? 2, devices.length));
    const burstCount = Math.ceil(totalRows / batchSize);
    let insertedRows = 0;
    const bursts: Array<{ tick: number; insertedRows: number; sample: Array<{ deviceId: number; value: number; recordedAt: string }> }> = [];

    for (let tick = 0; tick < burstCount; tick += 1) {
      const remainingRows = totalRows - insertedRows;
      const currentBatchSize = Math.min(batchSize, remainingRows);
      const burst = await insertRealtimeBurstRows(devices, tick, currentBatchSize);
      insertedRows += burst.insertedRows;
      bursts.push({
        tick: tick + 1,
        insertedRows: burst.insertedRows,
        sample: burst.sample,
      });

      if (tick < burstCount - 1) {
        await sleep(intervalSeconds * 1000);
      }
    }

    return NextResponse.json({
      ok: true,
      action: "realtime",
      insertedRows,
      requestedRows: totalRows,
      intervalSeconds,
      batchSize,
      burstCount,
      bursts: bursts.slice(0, 12),
    });
  }

  const timestamps = buildMockTimestamps(body);

  if (action === "cleanup") {
    const values: Array<number | string | boolean | null> = [];
    const devicePlaceholders = devices.map((device, index) => {
      values.push(device.device_id);
      return `$${index + 1}`;
    });
    const timePlaceholders = timestamps.map((timestamp, index) => {
      values.push(normalizeTimestamp(timestamp));
      return `$${devices.length + index + 1}`;
    });
    values.push(false);

    const deleted = await query<{ sensor_data_id: number }>(`
      DELETE FROM sensor_data
      WHERE device_id IN (${devicePlaceholders.join(", ")})
        AND recorded_at IN (${timePlaceholders.join(", ")})
        AND synced = $${values.length}
      RETURNING sensor_data_id
    `, values);

    return NextResponse.json({
      ok: true,
      action: "cleanup",
      deletedRows: deleted.length,
      targetDevices: devices.length,
      timestamps: timestamps.map((value) => value.toISOString()),
    });
  }

  const inserted = await insertBulkSeedRows(devices, timestamps, true);

  return NextResponse.json({
    ok: true,
    action: "seed",
    insertedRows: inserted.length,
    targetDevices: devices.length,
    timestamps: timestamps.map((value) => value.toISOString()),
    sampleIds: inserted.slice(0, 10).map((row) => row.sensor_data_id),
  });
}
