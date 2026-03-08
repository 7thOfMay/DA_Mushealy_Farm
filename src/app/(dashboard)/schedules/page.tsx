"use client";

import { useState } from "react";
import { CalendarClock, Plus, Repeat } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { schedules } from "@/lib/mockData";
import { gardens } from "@/lib/mockData";
import { Badge, EmptyState } from "@/components/shared/index";
import { cn } from "@/lib/utils";

const repeatLabel = { once: "Một lần", daily: "Hàng ngày", weekly: "Hàng tuần" };
const repeatVariant = { once: "default", daily: "ok", weekly: "info" } as const;

export default function SchedulesPage() {
  const [showModal, setShowModal] = useState(false);

  const groupedByDate = schedules.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {} as Record<string, typeof schedules>);

  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div>
      <Topbar title="Lịch trình" subtitle="Quản lý lịch tự động cho thiết bị" />

      <div className="p-8">
        <div className="flex justify-end mb-5">
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} />
            Thêm lịch trình
          </button>
        </div>

        {/* Days grouped */}
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const items = groupedByDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
            const dateObj = new Date(date + "T00:00:00");
            const label = dateObj.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

            return (
              <div key={date}>
                <h2 className="text-[0.875rem] font-semibold text-[#5C7A6A] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CalendarClock size={14} />
                  {label}
                </h2>
                <div className="space-y-2">
                  {items.map((s) => {
                    const gardenColor = gardens.find((g) => g.id === s.gardenId)?.color ?? "#5C7A6A";
                    return (
                      <div key={s.id} className="card p-4 flex items-center gap-4 border-l-4" style={{ borderLeftColor: gardenColor }}>
                        {/* Time */}
                        <div className="text-center flex-shrink-0 w-14">
                          <p className="font-bold text-[1rem] text-[#1A2E1F]" style={{ fontFamily: "'DM Mono', monospace" }}>{s.startTime}</p>
                          {s.endTime && <p className="text-[0.6875rem] text-[#5C7A6A]">{s.endTime}</p>}
                        </div>

                        <div className="w-px h-10 bg-[#E2E8E4]" />

                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-[0.9375rem] text-[#1A2E1F]">{s.deviceName}</p>
                            <span className={cn(
                              "text-[0.6875rem] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-wide",
                              s.action === "ON" ? "bg-[#27AE60]/15 text-[#1B7A3F]" : "bg-[#C0392B]/15 text-[#9B1C1C]"
                            )}>
                              {s.action === "ON" ? "Bật" : "Tắt"}
                            </span>
                          </div>
                          <p className="text-[0.8125rem] text-[#5C7A6A]">{s.gardenName}</p>
                        </div>

                        {/* Repeat badge */}
                        <Badge variant={repeatVariant[s.repeat]}>
                          <Repeat size={10} className="mr-1" />
                          {repeatLabel[s.repeat]}
                        </Badge>

                        {/* Active indicator */}
                        <div className={cn("w-2 h-2 rounded-full", s.isActive ? "bg-[#27AE60]" : "bg-[#CBD5E1]")} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {schedules.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title="Chưa có lịch trình"
            description="Tạo lịch trình tự động để điều khiển thiết bị"
            action={{ label: "Thêm lịch trình", onClick: () => setShowModal(true) }}
          />
        )}
      </div>

      {/* Simple modal placeholder */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-[12px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-6 w-full max-w-[480px]">
            <h2 className="font-bold text-[1.125rem] text-[#1A2E1F] mb-5">Thêm lịch trình mới</h2>
            <p className="text-[0.875rem] text-[#5C7A6A] mb-4 bg-[#F7F8F6] rounded-[8px] p-3">
              Tính năng này sẽ được kết nối với backend trong phiên bản tiếp theo.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
