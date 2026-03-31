"use client";

import Link from "next/link";
import { Thermometer, Droplet, Droplets, Sun, ArrowRight } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { ToggleSwitch } from "@/components/shared/ToggleSwitch";
import { useAppStore } from "@/lib/store";
import { GardenVisual } from "@/components/dashboard/GardenVisual";
import { apiUpdateDevice, apiSendDeviceCommand } from "@/lib/api/client";
import type { Garden, GardenSensorSummary } from "@/types";

interface GardenStationProps {
  garden: Garden;
  sensors: GardenSensorSummary | null;
}

const statusColors = {
  OK: "#27AE60",
  WARN: "#E67E22",
  ALERT: "#C0392B",
};

const statusLabel = {
  OK: "Bình thường",
  WARN: "Cảnh báo",
  ALERT: "Nguy hiểm",
};

export function GardenStation({ garden, sensors }: GardenStationProps) {
  const devices = useAppStore((s) => s.devices);
  const cropTypes = useAppStore((s) => s.cropTypes);
  const toggleDevice = useAppStore((s) => s.toggleDevice);
  const addToast = useAppStore((s) => s.addToast);
  const loggedInUser = useAppStore((s) => s.loggedInUser);

  const pump = devices.find((d) => d.gardenId === garden.id && d.type === "pump");
  const crop = cropTypes.find((item) => item.id === garden.cropTypeId);

  if (!sensors) {
    return (
      <div className="bg-white border border-[#E2E8E4] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="h-1 w-full" style={{ backgroundColor: statusColors[garden.status] }} />
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-[1.0625rem] text-[#1A2E1F] leading-tight">{garden.name}</h3>
              <span className="inline-block mt-1 text-[0.6875rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-[4px]" style={{ backgroundColor: garden.color + "18", color: garden.color }}>{garden.plantLabel}</span>
            </div>
          </div>
          <div className="text-center py-8">
            <p className="text-[0.875rem] text-[#5C7A6A]">Chưa có dữ liệu cảm biến</p>
            <p className="text-[0.75rem] text-[#5C7A6A]/60 mt-1">Kết nối thiết bị để bắt đầu giám sát</p>
          </div>
        </div>
      </div>
    );
  }

  const soilPct = Math.min(Math.max(sensors.humiditySoil, 0), 100);

  const getSensorState = (value: number, min?: number, max?: number) => {
    if (min === undefined || max === undefined) return "normal" as const;
    if (value < min || value > max) return "bad" as const;
    if (value <= min + (max - min) * 0.1 || value >= max - (max - min) * 0.1) return "warn" as const;
    return "normal" as const;
  };

  const handleTogglePump = async () => {
    if (!pump) return;
    const cmd = pump.isOn ? "turn_off" : "turn_on";
    try {
      await apiUpdateDevice(pump.id, undefined, pump.isOn ? "online" : "active");
      await apiSendDeviceCommand(pump.id, cmd, {}, loggedInUser?.id);
    } catch {}
    toggleDevice(pump.id);
    addToast({
      type: "success",
      message: `${pump.isOn ? "Đã tắt" : "Đã bật"} ${pump.name}`,
    });
  };

  const metrics = [
    {
      icon: Thermometer,
      label: "Nhiệt độ",
      value: `${sensors.temperature}°C`,
      unit: "°C",
      state: getSensorState(sensors.temperature, crop?.thresholdsJson.temperature.min, crop?.thresholdsJson.temperature.max),
    },
    {
      icon: Droplets,
      label: "Độ ẩm KK",
      value: `${sensors.humidityAir}%`,
      unit: "%",
      state: getSensorState(sensors.humidityAir, crop?.thresholdsJson.humidityAir.min, crop?.thresholdsJson.humidityAir.max),
    },
    {
      icon: Droplet,
      label: "Độ ẩm đất",
      value: `${sensors.humiditySoil}%`,
      unit: "%",
      state: getSensorState(sensors.humiditySoil, crop?.thresholdsJson.humiditySoil.min, crop?.thresholdsJson.humiditySoil.max),
    },
    {
      icon: Sun,
      label: "Ánh sáng",
      value: `${(sensors.light / 1000).toFixed(1)}k`,
      unit: "lux",
      state: getSensorState(sensors.light, crop?.thresholdsJson.light.min, crop?.thresholdsJson.light.max),
    },
  ];

  const anomalyCount = metrics.filter((item) => item.state !== "normal").length;

  return (
    <div className="bg-white border border-[#E2E8E4] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Status bar */}
      <div className="h-1 w-full" style={{ backgroundColor: statusColors[garden.status] }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-[1.0625rem] text-[#1A2E1F] leading-tight">{garden.name}</h3>
            <span
              className="inline-block mt-1 text-[0.6875rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-[4px]"
              style={{
                backgroundColor: garden.color + "18",
                color: garden.color,
              }}
            >
              {garden.plantLabel}
            </span>
          </div>
          <span
            className="text-[0.6875rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-[4px]"
            style={{
              backgroundColor: statusColors[garden.status] + "18",
              color: statusColors[garden.status],
            }}
          >
            {statusLabel[garden.status]}
          </span>
        </div>

        {anomalyCount > 0 && (
          <div className="mb-3 text-[0.6875rem] rounded-[8px] border border-[#F4CACA] bg-[#FFF5F5] text-[#C0392B] px-2.5 py-1.5">
            Phát hiện {anomalyCount} chỉ số lệch ngưỡng cây trồng.
          </div>
        )}

        {/* Sensor grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="bg-[#F7F8F6] rounded-[8px] p-3 border"
                style={{
                  borderColor:
                    m.state === "bad" ? "#F4CACA" : m.state === "warn" ? "#F6DEC1" : "#E2E8E4",
                  backgroundColor:
                    m.state === "bad" ? "#FFF5F5" : m.state === "warn" ? "#FFF9F2" : "#F7F8F6",
                }}
              >
                <Icon size={13} strokeWidth={1.5} className="text-[#5C7A6A] mb-1.5" />
                <p
                  className="leading-none mb-0.5 font-bold text-[#1A2E1F]"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.25rem" }}
                >
                  {m.value}
                </p>
                <p className="text-[0.6875rem] text-[#5C7A6A] uppercase tracking-wide font-medium">{m.label}</p>
              </div>
            );
          })}
        </div>

        {/* Soil moisture progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[0.6875rem] text-[#5C7A6A] uppercase tracking-wide font-semibold">Độ ẩm đất</span>
            <span className="text-[0.6875rem] font-bold" style={{ fontFamily: "'DM Mono', monospace", color: soilPct < 50 ? "#E67E22" : "#27AE60" }}>
              {soilPct}%
            </span>
          </div>
          <div className="relative h-1.5 bg-[#E2E8E4] rounded-full overflow-visible">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${soilPct}%`,
                backgroundColor: soilPct < 30 ? "#C0392B" : soilPct < 50 ? "#E67E22" : "#27AE60",
              }}
            />
            {/* Threshold marker at 50% */}
            <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[#E67E22] rounded-full" style={{ left: "50%" }} />
          </div>
        </div>

        {/* Pump control row */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E2E8E4]">
          <div className="flex items-center gap-2">
            <Droplets size={14} strokeWidth={1.5} className={pump?.isOn ? "text-[#2980B9]" : "text-[#5C7A6A]"} />
            <span className="text-[0.8125rem] text-[#5C7A6A]">
              {pump?.isOn ? "Máy bơm đang chạy" : "Máy bơm tắt"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={pump?.isOn ?? false}
              onChange={handleTogglePump}
              size="sm"
            />
            <Link
              href={garden.farmId ? `/farms/${garden.farmId}/gardens/${garden.id}` : `/gardens/${garden.id}`}
              className="text-[#1B4332] hover:text-[#40916C] transition-colors"
            >
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Last updated */}
        <p className="text-[0.6875rem] text-[#5C7A6A]/60 mt-2">
          Cập nhật {timeAgo(sensors.updatedAt)}
        </p>
      </div>

      {/* Interactive garden illustration */}
      <div className="border-t border-[#E2E8E4]">
        <GardenVisual garden={garden} summary={sensors} pumpOn={pump?.isOn ?? false} />
      </div>
    </div>
  );
}
