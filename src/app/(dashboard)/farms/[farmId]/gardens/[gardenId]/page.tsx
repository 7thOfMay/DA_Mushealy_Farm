"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect } from "react";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { Badge, EmptyState, StatusDot } from "@/frontend/components/shared";
import { ThresholdCard } from "@/frontend/components/threshold/ThresholdCard";
import { getCropTypeById, getGardenSensorSummary } from "@/frontend/services";
import { useAppStore } from "@/frontend/context/store";
import { formatDateTime, timeAgo } from "@/frontend/utils/utils";
import { AlertTriangle, ClipboardList, Cpu, Droplet, Droplets, Sun, Thermometer } from "lucide-react";

const statusBadgeVariant = {
  OK: "ok",
  WARN: "warn",
  ALERT: "danger",
} as const;

const statusLabel = {
  OK: "Bình thường",
  WARN: "Cảnh báo",
  ALERT: "Nguy hiểm",
} as const;

export default function FarmGardenDetailPage() {
  const { farmId, gardenId } = useParams<{ farmId: string; gardenId: string }>();
  const farms = useAppStore((state) => state.farms);
  const gardens = useAppStore((state) => state.gardens);
  const devices = useAppStore((state) => state.devices);
  const alerts = useAppStore((state) => state.alerts);
  const logs = useAppStore((state) => state.logs);
  const setCurrentFarmId = useAppStore((state) => state.setCurrentFarmId);

  useEffect(() => {
    if (farmId) setCurrentFarmId(farmId);
  }, [farmId, setCurrentFarmId]);

  const farm = farms.find((item) => item.id === farmId);
  const garden = gardens.find((item) => item.id === gardenId && item.farmId === farmId);

  if (!farm || !garden) return notFound();

  const sensor = getGardenSensorSummary(garden);
  const cropType = getCropTypeById(garden.cropTypeId);

  const gardenDevices = devices.filter((device) => device.gardenId === garden.id);
  const gardenAlerts = alerts.filter((alert) => alert.gardenId === garden.id);
  const unresolvedAlerts = gardenAlerts.filter((alert) => alert.status !== "RESOLVED");
  const gardenLogs = logs.filter((log) => log.gardenId === garden.id).slice(0, 8);

  const metrics = sensor ? [
    { label: "Nhiệt độ", value: sensor.temperature, unit: "°C", icon: Thermometer },
    { label: "Độ ẩm KK", value: sensor.humidityAir, unit: "%", icon: Droplets },
    { label: "Độ ẩm đất", value: sensor.humiditySoil, unit: "%", icon: Droplet },
    { label: "Ánh sáng", value: (sensor.light / 1000).toFixed(1), unit: "klux", icon: Sun },
  ] : [];

  const currentReadings: Record<string, number> = sensor ? {
    temperature: sensor.temperature,
    humidity_soil: sensor.humiditySoil,
    humidity_air: sensor.humidityAir,
    light_hours: sensor.light,
  } : {};

  const thresholdSeverity = cropType?.thresholds.reduce<"normal" | "warning" | "critical">((acc, threshold) => {
    const raw = currentReadings[threshold.sensor_type];
    const value = threshold.sensor_type === "light_hours" ? raw / 3600 : raw;
    if (typeof value !== "number") return acc;

    const isCritical = (typeof threshold.critical_min === "number" && value < threshold.critical_min)
      || (typeof threshold.critical_max === "number" && value > threshold.critical_max);
    if (isCritical) return "critical";

    const isWarning = (typeof threshold.warning_min === "number" && value < threshold.warning_min)
      || (typeof threshold.warning_max === "number" && value > threshold.warning_max);
    if (isWarning && acc === "normal") return "warning";

    return acc;
  }, "normal") ?? "normal";

  return (
    <div>
      <Topbar title={garden.name} subtitle={`${farm.name} · ${garden.plantLabel}`} />
      <div className="p-8 space-y-6">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[0.75rem] uppercase tracking-wide text-[#5C7A6A] mb-1">Khu vườn / {garden.name}</p>
              <h2 className="text-[1.8rem] text-[#1A2E1F]" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>{garden.name}</h2>
              <p className="text-[0.875rem] text-[#5C7A6A] mt-1">{garden.description ?? "Chưa có mô tả"}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Badge variant={statusBadgeVariant[garden.status]}>{statusLabel[garden.status]}</Badge>
              <span className="text-[0.75rem] text-[#5C7A6A] px-2.5 py-1 rounded-full bg-[#F7F8F6]">{garden.area ?? `${garden.areaM2 ?? 0}m²`}</span>
              <Link href={`/farms/${farm.id}/gardens/${garden.id}/edit`} className="btn-secondary">Chỉnh sửa</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="bg-[#F7F8F6] rounded-[10px] p-3">
                  <Icon size={16} className="text-[#1B4332] mb-2" />
                  <p className="text-[0.6875rem] text-[#5C7A6A] uppercase tracking-wide">{metric.label}</p>
                  <p className="text-[1.35rem] font-bold text-[#1A2E1F] mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {metric.value}
                    <span className="text-[0.75rem] text-[#5C7A6A] ml-1">{metric.unit}</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-[#E2E8E4] flex items-center justify-between flex-wrap gap-2">
            <p className="text-[0.75rem] text-[#5C7A6A]">Cập nhật cảm biến: {sensor ? timeAgo(sensor.updatedAt) : "Chưa có dữ liệu"}</p>
            <div className="flex gap-2">
              <Link href={`/farms/${farm.id}/devices`} className="btn-secondary">Thiết bị</Link>
              <Link href={`/farms/${farm.id}/schedules`} className="btn-secondary">Lịch trình</Link>
              <Link href={`/farms/${farm.id}/alerts`} className="btn-secondary">Cảnh báo</Link>
            </div>
          </div>

          {cropType && (
            <div className="mt-5">
              <h3 className="text-[0.875rem] font-semibold text-[#1A2E1F] mb-3">Ngưỡng môi trường</h3>
              <div
                className={
                  thresholdSeverity === "critical"
                    ? "rounded-[12px] border-2 border-[#C0392B] p-1 animate-pulse"
                    : thresholdSeverity === "warning"
                      ? "rounded-[12px] border-2 border-[#E67E22] p-1"
                      : "rounded-[12px]"
                }
              >
                <ThresholdCard cropType={cropType} currentReadings={currentReadings} showCurrentValues />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr] gap-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E2E8E4] flex items-center justify-between">
              <h3 className="font-semibold text-[#1A2E1F]">Thiết bị trong khu vườn</h3>
              <span className="text-[0.75rem] text-[#5C7A6A]">{gardenDevices.length} thiết bị</span>
            </div>
            {gardenDevices.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={Cpu} title="Chưa có thiết bị" description="Hãy thêm thiết bị trong trang quản lý thiết bị của nông trại." />
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8E4]">
                {gardenDevices.map((device) => (
                  <div key={device.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">{device.name}</p>
                      <p className="text-[0.75rem] text-[#5C7A6A]">{device.type} · Cập nhật {timeAgo(device.lastUpdated)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusDot status={device.status} />
                      <span className="text-[0.75rem] text-[#5C7A6A] capitalize">{device.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1A2E1F]">Cảnh báo gần đây</h3>
                <Badge variant={unresolvedAlerts.length > 0 ? "danger" : "ok"}>{unresolvedAlerts.length} chưa xử lý</Badge>
              </div>
              {gardenAlerts.length === 0 ? (
                <p className="text-[0.8125rem] text-[#5C7A6A] mt-3">Không có cảnh báo nào cho khu vườn này.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {gardenAlerts.slice(0, 4).map((alert) => (
                    <div key={alert.id} className="rounded-[10px] border border-[#E2E8E4] p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-[#C0392B] mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.8125rem] text-[#1A2E1F] font-medium truncate">{alert.message}</p>
                          <p className="text-[0.6875rem] text-[#5C7A6A] mt-0.5">{formatDateTime(alert.detectedAt)}</p>
                        </div>
                        <Badge variant={alert.status === "DETECTED" ? "danger" : alert.status === "PROCESSING" ? "warn" : "ok"}>
                          {alert.status === "DETECTED" ? "Phát hiện" : alert.status === "PROCESSING" ? "Đang xử lý" : "Đã xử lý"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-[#1A2E1F]">Nhật ký thao tác</h3>
                <ClipboardList size={16} className="text-[#5C7A6A]" />
              </div>
              {gardenLogs.length === 0 ? (
                <p className="text-[0.8125rem] text-[#5C7A6A]">Chưa có nhật ký cho khu vườn này.</p>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {gardenLogs.map((log) => (
                    <div key={log.id} className="rounded-[10px] bg-[#F7F8F6] px-3 py-2">
                      <p className="text-[0.8125rem] text-[#1A2E1F]">{log.description}</p>
                      <p className="text-[0.6875rem] text-[#5C7A6A] mt-0.5">{log.userName} · {timeAgo(log.timestamp)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
