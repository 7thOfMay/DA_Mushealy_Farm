import { NextResponse } from "next/server";
import { query } from "@/backend/config/db";

export const dynamic = "force-dynamic";

type SensorDeviceRow = {
  device_id: number;
  zone_id: number;
  device_type_id: number;
};

const SENSOR_TYPE_IDS = [1, 2, 3, 4] as const;

function buildMockTimestamps() {
  const now = new Date();
  now.setSeconds(0, 0);

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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: "seed" | "cleanup" };
  const action = body.action ?? "seed";

  const devices = await loadTargetDevices();
  if (!devices.length) {
    return NextResponse.json({ error: "Không tìm thấy thiết bị cảm biến để mock" }, { status: 400 });
  }

  const timestamps = buildMockTimestamps();

  if (action === "cleanup") {
    const values: Array<number | string | boolean | null> = [];
    const devicePlaceholders = devices.map((device, index) => {
      values.push(device.device_id);
      return `$${index + 1}`;
    });
    const timePlaceholders = timestamps.map((timestamp, index) => {
      values.push(timestamp.toISOString().slice(0, 19).replace("T", " "));
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

  const inserts: Array<number | string | boolean | null> = [];
  const valueGroups: string[] = [];

  devices.forEach((device, zoneIndex) => {
    timestamps.forEach((timestamp, timeIndex) => {
      const offset = inserts.length;
      inserts.push(
        device.device_id,
        Number(mockValue(device.device_type_id, zoneIndex, timeIndex).toFixed(2)),
        timestamp.toISOString().slice(0, 19).replace("T", " "),
        false,
      );
      valueGroups.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
    });
  });

  const inserted = await query<{ sensor_data_id: number; device_id: number; recorded_at: string }>(`
    INSERT INTO sensor_data (device_id, value, recorded_at, synced)
    VALUES ${valueGroups.join(", ")}
    RETURNING sensor_data_id, device_id, recorded_at
  `, inserts);

  return NextResponse.json({
    ok: true,
    action: "seed",
    insertedRows: inserted.length,
    targetDevices: devices.length,
    timestamps: timestamps.map((value) => value.toISOString()),
    sampleIds: inserted.slice(0, 10).map((row) => row.sensor_data_id),
  });
}
