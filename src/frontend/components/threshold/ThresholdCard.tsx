"use client";

import { Thermometer, Droplet, Cloud, Sun } from "lucide-react";
import { cn } from "@/frontend/utils/utils";
import type { CropThreshold, CropType } from "@/frontend/utils/cropThresholds";

interface ThresholdCardProps {
  cropType: CropType;
  currentReadings?: Record<string, number>;
  showCurrentValues?: boolean;
}

const cropBadgeTheme: Record<string, string> = {
  "Cà chua": "text-[#E74C3C] bg-[#FDECEA]",
  "Cải xanh": "text-[#27AE60] bg-[#EAF8F0]",
  "Nha đam": "text-[#F39C12] bg-[#FFF4DF]",
};

const sensorLabel: Record<CropThreshold["sensor_type"], string> = {
  temperature: "Nhiệt độ",
  humidity_soil: "Độ ẩm đất",
  humidity_air: "Độ ẩm không khí",
  light_hours: "Ánh sáng",
};

const sensorIcon = {
  temperature: Thermometer,
  humidity_soil: Droplet,
  humidity_air: Cloud,
  light_hours: Sun,
} as const;

const sensorTooltips: Partial<Record<CropThreshold["sensor_type"], Partial<Record<string, string>>>> = {
  temperature: {
    critical_max: "Trên ngưỡng này cây bị stress nhiệt nặng, ngừng sinh trưởng hoặc héo.",
    critical_min: "Dưới ngưỡng này cây chậm phát triển hoặc có nguy cơ chết lạnh.",
  },
  humidity_soil: {
    critical_max: "Vượt ngưỡng này dễ gây úng và thối rễ.",
    critical_min: "Dưới ngưỡng này cây thiếu nước kéo dài, giảm năng suất.",
  },
  light_hours: {
    warning_min: "Thiếu ánh sáng làm cây giảm quang hợp và phát triển kém.",
    warning_max: "Ánh sáng quá nhiều có thể gây cháy lá ở một số giai đoạn.",
  },
};

function toDisplayValue(sensorType: CropThreshold["sensor_type"], value: number) {
  if (sensorType === "light_hours") return Number((value / 3600).toFixed(1));
  return value;
}

function getScaleBounds(threshold: CropThreshold) {
  const values = [
    threshold.critical_min,
    threshold.warning_min,
    threshold.optimal_min,
    threshold.optimal_max,
    threshold.warning_max,
    threshold.critical_max,
  ].filter((value): value is number => typeof value === "number");

  if (!values.length) return { min: 0, max: 100 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

function toPercent(value: number, min: number, max: number) {
  return ((value - min) / (max - min)) * 100;
}

function currentSeverity(threshold: CropThreshold, currentValue?: number) {
  if (typeof currentValue !== "number") return "normal" as const;

  if (typeof threshold.critical_min === "number" && currentValue < threshold.critical_min) return "critical" as const;
  if (typeof threshold.critical_max === "number" && currentValue > threshold.critical_max) return "critical" as const;

  if (typeof threshold.warning_min === "number" && currentValue < threshold.warning_min) return "warning" as const;
  if (typeof threshold.warning_max === "number" && currentValue > threshold.warning_max) return "warning" as const;

  return "normal" as const;
}

export function ThresholdCard({ cropType, currentReadings, showCurrentValues = true }: ThresholdCardProps) {
  return (
    <div className="bg-white border border-[#E2E8E4] rounded-[12px] p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-[1rem] font-semibold text-[#1A2E1F]">{cropType.name}</h3>
        <span className={cn("text-[0.6875rem] font-semibold px-2 py-1 rounded-full", cropBadgeTheme[cropType.name] ?? "text-[#1B4332] bg-[#F0FAF3]")}>{cropType.name.toUpperCase()}</span>
      </div>

      <div className="space-y-3">
        {cropType.thresholds.map((threshold) => {
          const Icon = sensorIcon[threshold.sensor_type];
          const scale = getScaleBounds(threshold);
          const currentRaw = currentReadings?.[threshold.sensor_type];
          const currentValue = typeof currentRaw === "number" ? toDisplayValue(threshold.sensor_type, currentRaw) : undefined;
          const severity = currentSeverity(threshold, currentValue);

          const criticalMin = typeof threshold.critical_min === "number" ? toPercent(threshold.critical_min, scale.min, scale.max) : 0;
          const criticalMax = typeof threshold.critical_max === "number" ? toPercent(threshold.critical_max, scale.min, scale.max) : 100;
          const warningMin = typeof threshold.warning_min === "number" ? toPercent(threshold.warning_min, scale.min, scale.max) : criticalMin;
          const warningMax = typeof threshold.warning_max === "number" ? toPercent(threshold.warning_max, scale.min, scale.max) : criticalMax;
          const optimalMin = typeof threshold.optimal_min === "number" ? toPercent(threshold.optimal_min, scale.min, scale.max) : warningMin;
          const optimalMax = typeof threshold.optimal_max === "number" ? toPercent(threshold.optimal_max, scale.min, scale.max) : warningMax;
          const currentPos = typeof currentValue === "number" ? Math.max(0, Math.min(100, toPercent(currentValue, scale.min, scale.max))) : null;

          return (
            <div
              key={threshold.sensor_type}
              className={cn(
                "rounded-[10px] border p-3",
                severity === "critical" ? "border-[#F4CACA]" : severity === "warning" ? "border-[#F6DEC1]" : "border-[#E2E8E4]"
              )}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-[#1B4332]" />
                  <p className="text-[0.8125rem] font-medium text-[#1A2E1F]">{sensorLabel[threshold.sensor_type]}</p>
                </div>
                <p className="text-[0.75rem] text-[#5C7A6A]">
                  {typeof threshold.optimal_min === "number" ? threshold.optimal_min : "-"}
                  {" - "}
                  {typeof threshold.optimal_max === "number" ? threshold.optimal_max : "-"}
                  {threshold.unit}
                </p>
              </div>

              <div className="relative h-3 rounded-full bg-[#EEF3EF] overflow-hidden border border-[#E2E8E4]">
                <div className="absolute inset-y-0 left-0 bg-[#FDECEA]" style={{ width: `${warningMin}%` }} title={sensorTooltips[threshold.sensor_type]?.critical_min ?? "Vùng nguy hiểm thấp"} />
                <div className="absolute inset-y-0 bg-[#FFF3CD]" style={{ left: `${warningMin}%`, width: `${Math.max(0, optimalMin - warningMin)}%` }} title={sensorTooltips[threshold.sensor_type]?.warning_min ?? "Vùng cảnh báo thấp"} />
                <div className="absolute inset-y-0 bg-[#EAF8F0]" style={{ left: `${optimalMin}%`, width: `${Math.max(0, optimalMax - optimalMin)}%` }} title="Vùng tối ưu" />
                <div className="absolute inset-y-0 bg-[#FFF3CD]" style={{ left: `${optimalMax}%`, width: `${Math.max(0, warningMax - optimalMax)}%` }} title={sensorTooltips[threshold.sensor_type]?.warning_max ?? "Vùng cảnh báo cao"} />
                <div className="absolute inset-y-0 bg-[#FDECEA]" style={{ left: `${warningMax}%`, width: `${Math.max(0, 100 - warningMax)}%` }} title={sensorTooltips[threshold.sensor_type]?.critical_max ?? "Vùng nguy hiểm cao"} />

                {showCurrentValues && currentPos !== null && (
                  <div className="absolute -top-[5px] w-[2px] h-[18px] bg-[#1A2E1F] rounded-full" style={{ left: `${currentPos}%` }} />
                )}
              </div>

              {showCurrentValues && typeof currentValue === "number" && (
                <p className="mt-2 text-[0.75rem] text-[#1A2E1F]" style={{ fontFamily: "'DM Mono', monospace" }}>
                  Hiện tại: {currentValue}{threshold.unit}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[#E2E8E4] flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 rounded-full bg-[#F7F8F6] text-[0.6875rem] text-[#5C7A6A]">
          Thu hoạch: {cropType.harvest_days_min} - {cropType.harvest_days_max} ngày
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[#F7F8F6] text-[0.6875rem] text-[#5C7A6A]">
          Tưới: {cropType.watering_frequency}
        </span>
      </div>
    </div>
  );
}
