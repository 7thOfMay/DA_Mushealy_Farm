"use client";

import { useEffect, useMemo, useState } from "react";
import { Power, Settings2, AlertTriangle, LogIn, LogOut, Plus, Trash2, Search, Filter } from "lucide-react";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/frontend/components/shared/index";
import { ErrorState } from "@/frontend/components/shared/ErrorStates";
import { getVisibleFarmsForViewer } from "@/frontend/utils/dataScope";
import { cn, timeAgo, formatDateTime } from "@/frontend/utils/utils";
import type { LogActionType } from "@/types";
import { useAppStore } from "@/frontend/context/store";

const actionConfig: Record<LogActionType, { icon: typeof Power; color: string; bg: string; label: string }> = {
  DEVICE_TOGGLE: { icon: Power, color: "#1B4332", bg: "#F0FAF3", label: "Bật/Tắt thiết bị" },
  CONFIG_CHANGE: { icon: Settings2, color: "#2980B9", bg: "#EBF5FB", label: "Thay đổi cấu hình" },
  ALERT_ACTION: { icon: AlertTriangle, color: "#E67E22", bg: "#FEF9EE", label: "Xử lý cảnh báo" },
  USER_LOGIN: { icon: LogIn, color: "#27AE60", bg: "#DCFCE7", label: "Đăng nhập" },
  USER_LOGOUT: { icon: LogOut, color: "#5C7A6A", bg: "#F1F5F9", label: "Đăng xuất" },
  DEVICE_ADD: { icon: Plus, color: "#1B4332", bg: "#F0FAF3", label: "Thêm thiết bị" },
  DEVICE_REMOVE: { icon: Trash2, color: "#C0392B", bg: "#FEE2E2", label: "Xóa thiết bị" },
  SCHEDULE_CREATE: { icon: Power, color: "#F39C12", bg: "#FEF3C7", label: "Tạo lịch trình" },
};

export default function LogsPage() {
  const currentFarmId = useAppStore((state) => state.currentFarmId);
  const farms = useAppStore((state) => state.farms);
  const users = useAppStore((state) => state.users);
  const selectedFarmerId = useAppStore((state) => state.selectedFarmerId);
  const loggedInUser = useAppStore((state) => state.loggedInUser);
  const gardens = useAppStore((state) => state.gardens);
  const logs = useAppStore((state) => state.logs);
  const temperatureChartData = useAppStore((state) => state.temperatureChartData);
  const humiditySoilChartData = useAppStore((state) => state.humiditySoilChartData);
  const [isMounted, setIsMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | LogActionType>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "7d" | "30d">("7d");
  const [chartType, setChartType] = useState<"temperature" | "humidity_soil">("temperature");
  const [focusedHour, setFocusedHour] = useState<number | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const visibleFarms = useMemo(
    () => getVisibleFarmsForViewer({ farms, users, loggedInUser, selectedFarmerId }),
    [farms, users, loggedInUser, selectedFarmerId]
  );
  const visibleFarmIds = useMemo(() => new Set(visibleFarms.map((farm) => farm.id)), [visibleFarms]);
  const scopedGardens = useMemo(
    () => gardens.filter((garden) => garden.farmId && visibleFarmIds.has(garden.farmId)),
    [gardens, visibleFarmIds]
  );

  const farmGardenIds = useMemo(
    () => new Set(scopedGardens.filter((garden) => !currentFarmId || garden.farmId === currentFarmId).map((garden) => garden.id)),
    [scopedGardens, currentFarmId]
  );

  const sorted = [...logs]
    .filter((log) => !log.gardenId || farmGardenIds.has(log.gardenId))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const uniqueDates = useMemo(() => {
    const values = Array.from(new Set(sorted.map((log) => log.timestamp.slice(0, 10))));
    return values.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [sorted]);

  const [selectedDate, setSelectedDate] = useState<string>(uniqueDates[0] ?? "");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedDate && uniqueDates.length) {
      setSelectedDate(uniqueDates[0]);
    }
    if (selectedDate && uniqueDates.length && !uniqueDates.includes(selectedDate)) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [selectedDate, uniqueDates]);

  const now = Date.now();
  const filtered = sorted.filter((log) => {
    const matchesSearch = !search || [log.description, log.userName, log.gardenName ?? ""].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === "all" || log.actionType === actionFilter;

    let matchesTime = true;
    const ageMs = now - new Date(log.timestamp).getTime();
    if (timeFilter === "today") matchesTime = ageMs <= 24 * 60 * 60 * 1000;
    if (timeFilter === "7d") matchesTime = ageMs <= 7 * 24 * 60 * 60 * 1000;
    if (timeFilter === "30d") matchesTime = ageMs <= 30 * 24 * 60 * 60 * 1000;

    const matchesDate = !selectedDate || log.timestamp.startsWith(selectedDate);
    const matchesFocusedHour = focusedHour === null || new Date(log.timestamp).getHours() === focusedHour;

    return matchesSearch && matchesAction && matchesTime && matchesDate && matchesFocusedHour;
  });

  const chartData = chartType === "temperature" ? temperatureChartData : humiditySoilChartData;
  const eventHours = new Set(filtered.map((log) => new Date(log.timestamp).getHours()));
  const chartGardenCount = Math.max(1, scopedGardens.filter((garden) => !currentFarmId || garden.farmId === currentFarmId).slice(0, 3).length);

  const chartSeries = chartData.map((item) => {
    const hour = Number(item.time.split(":")[0]);
    const total = Array.from({ length: chartGardenCount }).reduce<number>((sum, _, idx) => {
      const key = `garden${idx + 1}` as "garden1" | "garden2" | "garden3";
      return sum + Number(item[key] ?? 0);
    }, 0);
    const value = total / chartGardenCount;
    return {
      time: item.time,
      value: Number(value.toFixed(1)),
      hour,
      event: eventHours.has(hour),
    };
  });

  const onClickEventMarker = (hour: number) => {
    setFocusedHour(hour);
    const match = filtered.find((log) => new Date(log.timestamp).getHours() === hour);
    if (match) setSelectedLogId(match.id);
  };

  if (visibleFarms.length === 0) {
    return (
      <div>
        <Topbar title="Nhật ký hệ thống" subtitle="Chưa có dữ liệu trong phạm vi quản lý" />
        <div className="p-8 max-w-3xl">
          <ErrorState
            title="Không có nhật ký để hiển thị"
            description="Hãy chọn nông dân ở sidebar hoặc tạo nông trại để bắt đầu theo dõi nhật ký."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Nhật ký hệ thống" subtitle={`${filtered.length} / ${sorted.length} hoạt động đang hiển thị`} />

      <div className="p-8">
        <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr] gap-4 mb-5">
          <div className="card p-3">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-2">Ngày hoạt động</p>
            <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
              {uniqueDates.map((dateKey) => (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-[10px] text-[0.8125rem] border transition-colors",
                    selectedDate === dateKey
                      ? "bg-[#1B4332] text-white border-[#1B4332]"
                      : "bg-white text-[#1A2E1F] border-[#E2E8E4] hover:border-[#1B4332]"
                  )}
                >
                  {new Date(dateKey).toLocaleDateString("vi-VN")}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A]">Sensor Chart</p>
                <p className="text-[0.8125rem] text-[#1A2E1F]">Marker đỏ thể hiện khung giờ có event log</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setChartType("temperature")} className={cn("px-3 py-1.5 rounded-[20px] text-[0.75rem] border", chartType === "temperature" ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-[#E2E8E4] text-[#5C7A6A]")}>Nhiệt độ</button>
                <button onClick={() => setChartType("humidity_soil")} className={cn("px-3 py-1.5 rounded-[20px] text-[0.75rem] border", chartType === "humidity_soil" ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-[#E2E8E4] text-[#5C7A6A]")}>Ẩm đất</button>
              </div>
            </div>
            <div className="h-[220px]">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSeries}>
                    <XAxis dataKey="time" tick={{ fill: "#5C7A6A", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#5C7A6A", fontSize: 11 }} />
                    <Tooltip formatter={(value) => [typeof value === "number" ? value : 0, chartType === "temperature" ? "°C" : "%"]} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#1B4332"
                      strokeWidth={2}
                      dot={(props) => {
                        const dataPoint = props.payload as { event?: boolean; hour?: number };
                        if (!dataPoint.event || typeof dataPoint.hour !== "number") {
                          return <circle cx={props.cx} cy={props.cy} r={2} fill="#1B4332" />;
                        }
                        return (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={focusedHour === dataPoint.hour ? 5 : 4}
                            fill="#C0392B"
                            stroke="#FFFFFF"
                            strokeWidth={1.5}
                            style={{ cursor: "pointer" }}
                            onClick={() => onClickEventMarker(dataPoint.hour as number)}
                          />
                        );
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full rounded-[10px] bg-[#F7F8F6] border border-[#E2E8E4]" />
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[0.6875rem] text-[#5C7A6A]">Giờ có event:</span>
              {Array.from(eventHours).sort((a, b) => a - b).map((hour) => (
                <button
                  key={hour}
                  onClick={() => setFocusedHour((prev) => prev === hour ? null : hour)}
                  className={cn(
                    "text-[0.6875rem] px-2 py-0.5 rounded-[999px] border",
                    focusedHour === hour
                      ? "bg-[#C0392B] text-white border-[#C0392B]"
                      : "bg-[#FEE2E2] text-[#C0392B] border-[#F4CACA]"
                  )}
                >
                  {hour.toString().padStart(2, "0")}:00
                </button>
              ))}
              {focusedHour !== null && (
                <button
                  onClick={() => setFocusedHour(null)}
                  className="text-[0.6875rem] px-2 py-0.5 rounded-[999px] border border-[#E2E8E4] text-[#5C7A6A]"
                >
                  Bỏ lọc giờ
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card p-4 mb-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C7A6A]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo mô tả, người thao tác hoặc khu vườn"
                className="input-field pl-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={14} className="text-[#5C7A6A]" />
              {[
                { id: "all", label: "Tất cả" },
                { id: "today", label: "Hôm nay" },
                { id: "7d", label: "7 ngày" },
                { id: "30d", label: "30 ngày" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTimeFilter(item.id as typeof timeFilter)}
                  className={cn(
                    "px-3 py-1.5 rounded-[20px] text-[0.8125rem] font-medium border transition-colors",
                    timeFilter === item.id
                      ? "bg-[#1B4332] text-white border-[#1B4332]"
                      : "bg-white text-[#5C7A6A] border-[#E2E8E4] hover:border-[#1B4332] hover:text-[#1B4332]"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActionFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-[20px] text-[0.8125rem] font-medium border transition-colors",
                actionFilter === "all"
                  ? "bg-[#1B4332] text-white border-[#1B4332]"
                  : "bg-white text-[#5C7A6A] border-[#E2E8E4] hover:border-[#1B4332] hover:text-[#1B4332]"
              )}
            >
              Tất cả hành động
            </button>
            {(Object.keys(actionConfig) as LogActionType[]).map((type) => (
              <button
                key={type}
                onClick={() => setActionFilter(type)}
                className={cn(
                  "px-3 py-1.5 rounded-[20px] text-[0.8125rem] font-medium border transition-colors",
                  actionFilter === type
                    ? "bg-[#1B4332] text-white border-[#1B4332]"
                    : "bg-white text-[#5C7A6A] border-[#E2E8E4] hover:border-[#1B4332] hover:text-[#1B4332]"
                )}
              >
                {actionConfig[type].label}
              </button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Không có nhật ký phù hợp"
              description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc thời gian/hành động."
            />
          ) : (
            <div className="divide-y divide-[#E2E8E4]">
              {filtered.map((log) => {
                const config = actionConfig[log.actionType];
                const Icon = config.icon;
                const rowHour = new Date(log.timestamp).getHours();
                return (
                  <div
                    key={log.id}
                    onClick={() => {
                      setSelectedLogId(log.id);
                      setFocusedHour(rowHour);
                    }}
                    className={cn(
                      "flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer",
                      selectedLogId === log.id ? "bg-[#F0FAF3]" : "hover:bg-[#F7F8F6]"
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: config.bg }}
                    >
                      <Icon size={14} style={{ color: config.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[0.875rem] font-medium text-[#1A2E1F]">{log.description}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[0.75rem] text-[#5C7A6A]">{log.userName}</span>
                        {log.gardenName && <span className="text-[0.75rem] text-[#5C7A6A]">· {log.gardenName}</span>}
                      </div>
                      {log.oldValue && log.newValue && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[0.75rem] line-through text-[#C0392B] font-mono">{log.oldValue}</span>
                          <span className="text-[0.75rem] text-[#5C7A6A]">→</span>
                          <span className="text-[0.75rem] text-[#27AE60] font-bold font-mono">{log.newValue}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-[0.6875rem] text-[#5C7A6A]">{timeAgo(log.timestamp)}</p>
                      <p className="text-[0.625rem] text-[#5C7A6A]/60 mt-0.5">{formatDateTime(log.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
