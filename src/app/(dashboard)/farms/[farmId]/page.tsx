"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { Badge, EmptyState } from "@/frontend/components/shared/index";
import { useAppStore } from "@/frontend/context/store";

import { GardenStation } from "@/frontend/components/dashboard/GardenStation";
import { Cpu, Sprout, AlertTriangle, Activity, ShieldAlert } from "lucide-react";

export default function FarmDetailPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const farms = useAppStore((state) => state.farms);
  const gardens = useAppStore((state) => state.gardens);
  const farm = farms.find((item) => item.id === farmId);
  const devices = useAppStore((state) => state.devices);
  const alerts = useAppStore((state) => state.alerts);
  const sensorSummaries = useAppStore((state) => state.sensorSummaries);

  if (!farm) return notFound();

  const farmGardens = gardens.filter((garden) => garden.farmId === farm.id);
  const farmGardenIds = new Set(farmGardens.map((garden) => garden.id));
  const farmDevices = devices.filter((device) => farmGardenIds.has(device.gardenId));
  const farmAlerts = alerts.filter((alert) => farmGardenIds.has(alert.gardenId));

  const onlineDevices = farmDevices.filter((device) => device.status === "online" || device.status === "active").length;
  const unresolvedAlerts = farmAlerts.filter((alert) => alert.status !== "RESOLVED").length;
  const uptime = farmDevices.length > 0 ? Math.round((onlineDevices / farmDevices.length) * 100) : 100;

  return (
    <div>
      <Topbar title={farm.name} subtitle={`${farm.location} · ${farm.description ?? "Không có mô tả"}`} />
      <div className="p-8 space-y-6">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[0.75rem] uppercase tracking-wide text-[#5C7A6A] mb-1">Nông trại / {farm.name}</p>
              <h2 className="text-[2rem] text-[#1A2E1F]" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>{farm.name}</h2>
            </div>
            <div className="flex gap-2">
              <Badge variant={farm.status === "active" ? "ok" : farm.status === "warning" ? "warn" : "default"}>
                {farm.status === "active" ? "Đang hoạt động" : farm.status === "warning" ? "Cần chú ý" : "Tạm dừng"}
              </Badge>
              <Link href={`/farms/${farm.id}/edit`} className="btn-secondary">Chỉnh sửa</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
            <div className="bg-[#F7F8F6] rounded-[10px] p-3">
              <p className="text-[0.6875rem] text-[#5C7A6A] uppercase tracking-wide">Tổng khu vườn</p>
              <p className="text-[1.5rem] font-bold text-[#1A2E1F] mt-1">{farmGardens.length}</p>
            </div>
            <div className="bg-[#F7F8F6] rounded-[10px] p-3">
              <p className="text-[0.6875rem] text-[#5C7A6A] uppercase tracking-wide">Thiết bị online</p>
              <p className="text-[1.5rem] font-bold text-[#1A2E1F] mt-1">{onlineDevices}/{farmDevices.length}</p>
            </div>
            <div className="bg-[#F7F8F6] rounded-[10px] p-3">
              <p className="text-[0.6875rem] text-[#5C7A6A] uppercase tracking-wide">Cảnh báo chưa xử lý</p>
              <p className="text-[1.5rem] font-bold text-[#1A2E1F] mt-1">{unresolvedAlerts}</p>
            </div>
            <div className="bg-[#F7F8F6] rounded-[10px] p-3">
              <p className="text-[0.6875rem] text-[#5C7A6A] uppercase tracking-wide">Uptime</p>
              <p className="text-[1.5rem] font-bold text-[#1A2E1F] mt-1">{uptime}%</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[1rem] text-[#1A2E1F]">Các khu vườn</h3>
            <Link href={`/farms/${farm.id}/gardens/new`} className="btn-primary">+ Thêm khu vườn</Link>
          </div>

          {farmGardens.length === 0 ? (
            <EmptyState icon={Sprout} title="Chưa có khu vườn nào" description="Thêm khu vườn đầu tiên để bắt đầu vận hành nông trại." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {farmGardens.map((garden) => {
                const summary = sensorSummaries.find((item) => item.gardenId === garden.id) ?? null;
                return <GardenStation key={garden.id} garden={garden} sensors={summary} />;
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Link href={`/farms/${farm.id}/devices`} className="card p-4 hover:border-[#1B4332] transition-colors">
            <Cpu size={18} className="text-[#1B4332] mb-2" />
            <p className="font-semibold text-[#1A2E1F]">Thiết bị</p>
            <p className="text-[0.8125rem] text-[#5C7A6A]">Quản lý cảm biến và thiết bị điều khiển của farm.</p>
          </Link>
          <Link href={`/farms/${farm.id}/schedules`} className="card p-4 hover:border-[#1B4332] transition-colors">
            <Activity size={18} className="text-[#1B4332] mb-2" />
            <p className="font-semibold text-[#1A2E1F]">Lịch trình</p>
            <p className="text-[0.8125rem] text-[#5C7A6A]">Lập lịch theo giờ và theo ngưỡng cho thiết bị.</p>
          </Link>
          <Link href={`/farms/${farm.id}/alerts`} className="card p-4 hover:border-[#1B4332] transition-colors">
            <AlertTriangle size={18} className="text-[#1B4332] mb-2" />
            <p className="font-semibold text-[#1A2E1F]">Cảnh báo</p>
            <p className="text-[0.8125rem] text-[#5C7A6A]">Theo dõi cảnh báo đa cảm biến cross-farm.</p>
          </Link>
          <Link href={`/farms/${farm.id}/alert-rules`} className="card p-4 hover:border-[#1B4332] transition-colors">
            <ShieldAlert size={18} className="text-[#1B4332] mb-2" />
            <p className="font-semibold text-[#1A2E1F]">Alert Rules</p>
            <p className="text-[0.8125rem] text-[#5C7A6A]">Quản lý rule cảnh báo theo crop và đa cảm biến.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
