"use client";

import { Sprout, Cpu, Droplets, AlertTriangle } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { GardenStation } from "@/components/dashboard/GardenStation";
import { SensorChart } from "@/components/dashboard/SensorChart";
import { AlertPanel } from "@/components/dashboard/AlertPanel";
import { DeviceQuickControl } from "@/components/dashboard/DeviceQuickControl";
import { useAppStore } from "@/lib/store";
import { gardens, sensorSummaries } from "@/lib/mockData";

export default function DashboardPage() {
  const devices = useAppStore((s) => s.devices);
  const alerts = useAppStore((s) => s.alerts);

  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const activePumps = devices.filter((d) => d.type === "pump" && d.isOn).length;
  const unhandledAlerts = alerts.filter((a) => a.status === "DETECTED").length;

  return (
    <div>
      <Topbar
        title="Tổng quan"
        subtitle={`Trang trại NôngTech — ${new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}`}
      />

      <div className="p-8 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={Sprout}
            label="Khu vườn hoạt động"
            value={`${gardens.length} / ${gardens.length}`}
            badge="ĐẦY ĐỦ"
            badgeVariant="ok"
          />
          <StatCard
            icon={Cpu}
            label="Thiết bị trực tuyến"
            value={`${onlineDevices} / ${devices.length}`}
            badge={onlineDevices < devices.length ? "WARN" : "OK"}
            badgeVariant={onlineDevices < devices.length ? "warn" : "ok"}
            accent={onlineDevices < devices.length}
          />
          <StatCard
            icon={Droplets}
            label="Máy bơm đang chạy"
            value={`${activePumps}`}
            badge={activePumps > 0 ? "ĐANG BƠM" : "TẮT"}
            badgeVariant={activePumps > 0 ? "ok" : "default"}
          />
          <StatCard
            icon={AlertTriangle}
            label="Cảnh báo chưa xử lý"
            value={`${unhandledAlerts}`}
            badge={unhandledAlerts > 0 ? "CẦN XỬLÝ" : "SẠCH"}
            badgeVariant={unhandledAlerts > 0 ? "danger" : "ok"}
            accent={unhandledAlerts > 0}
          />
        </div>

        {/* Garden Stations */}
        <div>
          <h2 className="font-semibold text-[0.75rem] uppercase tracking-[2px] text-[#5C7A6A] mb-3">
            Trạm Khu Vườn
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gardens.map((garden) => {
              const sensors = sensorSummaries.find((s) => s.gardenId === garden.id)!;
              return <GardenStation key={garden.id} garden={garden} sensors={sensors} />;
            })}
          </div>
        </div>

        {/* Chart + Alerts */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <SensorChart />
          <AlertPanel />
        </div>

        {/* Device Quick Control */}
        <DeviceQuickControl />
      </div>
    </div>
  );
}
