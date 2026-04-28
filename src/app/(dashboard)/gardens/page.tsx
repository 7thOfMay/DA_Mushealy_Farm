"use client";

import { useState } from "react";
import Link from "next/link";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { useAppStore } from "@/frontend/context/store";
import { GardenStation } from "@/frontend/components/dashboard/GardenStation";
import { Badge } from "@/frontend/components/shared/index";
import { ErrorState } from "@/frontend/components/shared/ErrorStates";
import { ArrowRight, Droplet, Leaf, MapPin, Sun, Thermometer } from "lucide-react";
import { cn } from "@/frontend/utils/utils";


const plantMetrics = [
  { key: "optimalTemp", label: "Nhiệt độ", unit: "°C", icon: Thermometer, max: 40 },
  { key: "optimalAirHumidity", label: "Độ ẩm KK", unit: "%", icon: Droplet, max: 100 },
  { key: "optimalSoilMoisture", label: "Độ ẩm đất", unit: "%", icon: Leaf, max: 100 },
  { key: "optimalLight", label: "Ánh sáng", unit: "klux", icon: Sun, max: 24 },
] as const;

export default function GardensPage() {
  const [activeTab, setActiveTab] = useState<"zones" | "plants">("zones");
  const gardens = useAppStore((state) => state.gardens);
  const plantTypeInfos = useAppStore((state) => state.plantTypeInfos);
  const sensorSummaries = useAppStore((state) => state.sensorSummaries);

  return (
    <div>
      <Topbar title="Khu vườn" subtitle={`Quản lý & giám sát ${gardens.length} khu canh tác`} />
      <div className="p-8 space-y-6">
        {gardens.length === 0 && activeTab === "zones" ? (
          <ErrorState
            title="Chưa có khu vườn"
            description="Tạo một khu vườn từ chi tiết trang nông trại để bắt đầu giám sát."
          />
        ) : (
          <>
            <div className="flex gap-1 border-b border-[#E2E8E4]">
              {[
                { id: "zones", label: "Khu vườn" },
                { id: "plants", label: "Loại cây trồng" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "zones" | "plants")}
                  className={cn(
                    "px-4 py-2.5 text-[0.875rem] font-medium border-b-2 transition-colors -mb-px",
                    activeTab === tab.id
                      ? "border-[#1B4332] text-[#1B4332]"
                      : "border-transparent text-[#5C7A6A] hover:text-[#1A2E1F]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

        {activeTab === "zones" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gardens.map((garden) => {
              const sensors = sensorSummaries.find((s) => s.gardenId === garden.id) ?? null;
              const detailHref = garden.farmId ? `/farms/${garden.farmId}/gardens/${garden.id}` : `/gardens/${garden.id}`;
              return (
                <div key={garden.id} className="group">
                  <GardenStation garden={garden} sensors={sensors} />
                  <div className="mt-2 flex justify-end">
                    <Link
                      href={detailHref}
                      className="flex items-center gap-1.5 text-[0.8125rem] text-[#1B4332] font-semibold hover:underline"
                    >
                      <MapPin size={13} /> Xem chi tiết <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "plants" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {plantTypeInfos.map((plant) => (
              <div key={plant.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-[12px] bg-[#F0FAF3] flex items-center justify-center text-[1.5rem]">
                      {plant.emoji}
                    </div>
                    <div>
                      <h3 className="font-bold text-[1rem] text-[#1A2E1F]">{plant.label}</h3>
                      <p className="text-[0.8125rem] text-[#5C7A6A] mt-0.5">{plant.description}</p>
                    </div>
                  </div>
                  <Badge variant="ok">{plant.cycleDays}</Badge>
                </div>

                <div className="space-y-3">
                  {plantMetrics.map((metric) => {
                    const range = plant[metric.key];
                    const width = `${Math.min(100, (range.max / metric.max) * 100)}%`;
                    const offset = `${Math.max(0, (range.min / metric.max) * 100)}%`;
                    const Icon = metric.icon;

                    return (
                      <div key={metric.key} className="rounded-[12px] border border-[#E2E8E4] p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 text-[#1A2E1F]">
                            <Icon size={14} className="text-[#1B4332]" />
                            <span className="text-[0.8125rem] font-medium">{metric.label}</span>
                          </div>
                          <span className="text-[0.75rem] font-semibold text-[#5C7A6A]">
                            {range.min} - {range.max} {metric.unit}
                          </span>
                        </div>
                        <div className="relative h-2 rounded-full bg-[#E8F1EB] overflow-hidden">
                          <div
                            className="absolute top-0 h-full rounded-full bg-[#52B788]"
                            style={{ left: offset, width: `calc(${width} - ${offset})` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
