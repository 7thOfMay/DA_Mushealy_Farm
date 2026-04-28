"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, ChevronRight, User } from "lucide-react";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { useAppStore } from "@/frontend/context/store";
import { Badge, EmptyState } from "@/frontend/components/shared/index";
import { ErrorState } from "@/frontend/components/shared/ErrorStates";
import { getVisibleFarmsForViewer } from "@/frontend/utils/dataScope";
import { cn, formatDateTime, timeAgo } from "@/frontend/utils/utils";
import type { AlertStatus } from "@/types";

type TabType = "all" | "unhandled" | "resolved";
type DateRangeType = "all" | "24h" | "7d";

const severityConfig = {
  high: { color: "#C0392B", bg: "#FEE2E2", label: "Cao" },
  medium: { color: "#E67E22", bg: "#FEF3C7", label: "Trung bình" },
  low: { color: "#27AE60", bg: "#DCFCE7", label: "Thấp" },
};

const statusConfig = {
  DETECTED: { label: "Phát hiện", variant: "danger" as const, step: 0 },
  PROCESSING: { label: "Đang xử lý", variant: "warn" as const, step: 1 },
  RESOLVED: { label: "Đã giải quyết", variant: "ok" as const, step: 2 },
};

export default function AlertsPage() {
  const alerts = useAppStore((s) => s.alerts);
  const farms = useAppStore((s) => s.farms);
  const users = useAppStore((s) => s.users);
  const selectedFarmerId = useAppStore((s) => s.selectedFarmerId);
  const loggedInUser = useAppStore((s) => s.loggedInUser);
  const gardens = useAppStore((s) => s.gardens);
  const currentFarmId = useAppStore((s) => s.currentFarmId);
  const processAlert = useAppStore((s) => s.processAlert);
  const resolveAlert = useAppStore((s) => s.resolveAlert);
  const addToast = useAppStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [farmFilter, setFarmFilter] = useState<string>(currentFarmId ?? "all");
  const [gardenFilter, setGardenFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [dateRange, setDateRange] = useState<DateRangeType>("all");

  const visibleFarms = useMemo(
    () => getVisibleFarmsForViewer({ farms, users, loggedInUser, selectedFarmerId }),
    [farms, users, loggedInUser, selectedFarmerId]
  );
  const visibleFarmIds = useMemo(() => new Set(visibleFarms.map((farm) => farm.id)), [visibleFarms]);
  const scopedGardens = useMemo(
    () => gardens.filter((garden) => garden.farmId && visibleFarmIds.has(garden.farmId)),
    [gardens, visibleFarmIds]
  );

  const now = Date.now();
  const farmByGardenId = useMemo(
    () => new Map(scopedGardens.map((garden) => [garden.id, garden.farmId ?? null])),
    [scopedGardens]
  );

  const scopedAlerts = useMemo(
    () => alerts.filter((alert) => {
      const resolvedFarmId = alert.farmId ?? farmByGardenId.get(alert.gardenId) ?? null;
      return Boolean(resolvedFarmId && visibleFarmIds.has(resolvedFarmId));
    }),
    [alerts, farmByGardenId, visibleFarmIds]
  );

  const tabCounts = {
    all: scopedAlerts.length,
    unhandled: scopedAlerts.filter((a) => a.status !== "RESOLVED").length,
    resolved: scopedAlerts.filter((a) => a.status === "RESOLVED").length,
  };

  const farmScopedGardens = scopedGardens.filter((garden) => {
    if (farmFilter === "all") return true;
    return garden.farmId === farmFilter;
  });

  useEffect(() => {
    if (currentFarmId && visibleFarmIds.has(currentFarmId)) {
      setFarmFilter(currentFarmId);
      setGardenFilter("all");
      return;
    }
    setFarmFilter("all");
  }, [currentFarmId, visibleFarmIds]);

  const filtered = scopedAlerts
    .filter((alert) => {
      if (activeTab === "unhandled" && alert.status === "RESOLVED") return false;
      if (activeTab === "resolved" && alert.status !== "RESOLVED") return false;

      const resolvedFarmId = alert.farmId ?? farmByGardenId.get(alert.gardenId) ?? null;
      if (farmFilter !== "all" && resolvedFarmId !== farmFilter) return false;
      if (gardenFilter !== "all" && alert.gardenId !== gardenFilter) return false;
      if (severityFilter !== "all" && alert.severity !== severityFilter) return false;

      const ageMs = now - new Date(alert.detectedAt).getTime();
      if (dateRange === "24h" && ageMs > 24 * 60 * 60 * 1000) return false;
      if (dateRange === "7d" && ageMs > 7 * 24 * 60 * 60 * 1000) return false;

      return true;
    })
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

  if (visibleFarms.length === 0) {
    return (
      <div>
        <Topbar title="Cảnh báo" subtitle="Chưa có nông dân hoặc nông trại trong phạm vi quản lý" />
        <div className="p-8 max-w-3xl">
          <ErrorState
            title="Không có dữ liệu cảnh báo trong ngữ cảnh hiện tại"
            description="Hãy chọn nông dân ở sidebar hoặc tạo nông trại để bắt đầu theo dõi cảnh báo."
          />
        </div>
      </div>
    );
  }

  const handleProcess = (alertId: string) => {
    processAlert(alertId, "Nguyễn Văn An");
    addToast({ type: "warning", message: "Đang xử lý cảnh báo..." });
  };

  const handleResolve = (alertId: string) => {
    resolveAlert(alertId, "Nguyễn Văn An");
    addToast({ type: "success", message: "Đã đóng cảnh báo thành công!" });
  };

  return (
    <div>
      <Topbar
        title="Cảnh báo"
        subtitle={`${tabCounts.unhandled} chưa xử lý · ${tabCounts.resolved} đã giải quyết`}
      />
      <div className="p-8">
        {/* 3-tab filter */}
        <div className="flex gap-1 mb-6 border-b border-[#E2E8E4]">
          {(["all", "unhandled", "resolved"] as TabType[]).map((tab) => {
            const labels = { all: "Tất cả", unhandled: "Chưa xử lý", resolved: "Đã giải quyết" };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-[0.875rem] font-medium border-b-2 transition-colors -mb-px",
                  activeTab === tab ? "border-[#1B4332] text-[#1B4332]" : "border-transparent text-[#5C7A6A] hover:text-[#1A2E1F]"
                )}
              >
                {labels[tab]}
                <span className={cn(
                  "text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full",
                  activeTab === tab ? "bg-[#1B4332] text-white" : "bg-[#E2E8E4] text-[#5C7A6A]"
                )}>
                  {tabCounts[tab]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="card p-4 mb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Nông trại</label>
            <select
              className="input-field"
              value={farmFilter}
              onChange={(event) => {
                setFarmFilter(event.target.value);
                setGardenFilter("all");
              }}
            >
              <option value="all">Tất cả nông trại</option>
              {visibleFarms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Khu vườn</label>
            <select className="input-field" value={gardenFilter} onChange={(event) => setGardenFilter(event.target.value)}>
              <option value="all">Tất cả khu vườn</option>
              {farmScopedGardens.map((garden) => (
                <option key={garden.id} value={garden.id}>{garden.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Mức độ</label>
            <select className="input-field" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)}>
              <option value="all">Tất cả mức</option>
              <option value="high">Cao</option>
              <option value="medium">Trung bình</option>
              <option value="low">Thấp</option>
            </select>
          </div>
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Thời gian</label>
            <select className="input-field" value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRangeType)}>
              <option value="all">Toàn bộ</option>
              <option value="24h">24 giờ qua</option>
              <option value="7d">7 ngày qua</option>
            </select>
          </div>
        </div>

        {farmFilter !== "all" && (
          <div className="mb-5 flex justify-end">
            <Link href={`/farms/${farmFilter}/alert-rules`} className="btn-secondary">
              Mở Alert Rules của farm này
            </Link>
          </div>
        )}

        {/* Alert list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Không có cảnh báo"
            description="Không có cảnh báo nào trong danh mục này."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((alert) => {
              const sev = severityConfig[alert.severity];
              const stat = statusConfig[alert.status];
              const isExpanded = expandedId === alert.id;

              return (
                <div key={alert.id} className="card overflow-hidden">
                  {/* Main row */}
                  <div
                    className="flex items-start gap-4 p-4 cursor-pointer hover:bg-[#F7F8F6] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: sev.bg }}
                    >
                      <AlertTriangle size={15} style={{ color: sev.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[0.9375rem] font-medium text-[#1A2E1F]">{alert.message}</p>
                          <p className="text-[0.8125rem] text-[#5C7A6A] mt-0.5">
                            {alert.gardenName} {alert.deviceName ? `· ${alert.deviceName}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={stat.variant}>{stat.label}</Badge>
                          <ChevronRight
                            size={16}
                            className={cn("text-[#5C7A6A] transition-transform", isExpanded && "rotate-90")}
                          />
                        </div>
                      </div>

                      {alert.value && (
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[0.75rem] font-semibold" style={{ fontFamily: "'DM Mono', monospace", color: sev.color }}>
                            {alert.value} {alert.sensorType === "temperature" ? "°C" : "%"}
                          </span>
                          <span className="text-[0.75rem] text-[#5C7A6A]">Ngưỡng: {alert.threshold}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[0.6875rem] text-[#5C7A6A] flex items-center gap-1">
                          <Clock size={10} /> {timeAgo(alert.detectedAt)}
                        </span>
                        {alert.farmName && (
                          <span className="text-[0.6875rem] text-[#5C7A6A]">{alert.farmName}</span>
                        )}
                        <Badge variant={alert.severity === "high" ? "danger" : alert.severity === "medium" ? "warn" : "ok"}>
                          Mức {sev.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-[#E2E8E4] px-4 py-4 bg-[#F7F8F6]">
                      {/* Timeline workflow */}
                      <h4 className="text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold mb-3">Tiến trình xử lý</h4>
                      <div className="flex items-start gap-0 mb-4">
                        {(["DETECTED", "PROCESSING", "RESOLVED"] as AlertStatus[]).map((step, idx) => {
                          const stepStat = statusConfig[step];
                          const isActive = stat.step >= idx;
                          const isCurrent = alert.status === step;
                          const timestamps: Record<string, string | undefined> = {
                            DETECTED: alert.detectedAt,
                            PROCESSING: alert.processingAt,
                            RESOLVED: alert.resolvedAt,
                          };
                          return (
                            <div key={step} className="flex-1 flex items-start gap-0">
                              <div className="flex flex-col items-center">
                                <div className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-bold border-2",
                                  isActive ? "border-[#1B4332] bg-[#1B4332] text-white" : "border-[#E2E8E4] bg-white text-[#5C7A6A]"
                                )}>
                                  {idx + 1}
                                </div>
                                {idx < 2 && (
                                  <div className={cn("h-px w-full mt-3", isActive && stat.step > idx ? "bg-[#1B4332]" : "bg-[#E2E8E4]")} />
                                )}
                              </div>
                              <div className="ml-2 flex-1">
                                <p className={cn("text-[0.75rem] font-semibold", isActive ? "text-[#1A2E1F]" : "text-[#5C7A6A]")}>
                                  {stepStat.label}
                                </p>
                                {timestamps[step] && (
                                  <p className="text-[0.6875rem] text-[#5C7A6A]">{formatDateTime(timestamps[step]!)}</p>
                                )}
                                {isCurrent && alert.processedBy && step !== "DETECTED" && (
                                  <p className="text-[0.6875rem] text-[#5C7A6A] flex items-center gap-1">
                                    <User size={10} /> {alert.processedBy}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {(alert.snapshot || alert.autoActionMessage) && (
                        <div className="mb-4 rounded-[10px] border border-[#E2E8E4] bg-white p-3">
                          <p className="text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold mb-2">Ngữ cảnh cảnh báo</p>
                          {alert.snapshot && (
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(alert.snapshot).map(([key, value]) => (
                                <span key={key} className="text-[0.6875rem] px-2 py-1 rounded-[20px] bg-[#F7F8F6] border border-[#E2E8E4] text-[#1A2E1F]">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                          {alert.autoActionMessage && (
                            <p className="text-[0.75rem] text-[#1A2E1F] mt-2">{alert.autoActionMessage}</p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {alert.status !== "RESOLVED" && (
                        <div className="flex gap-2">
                          {alert.status === "DETECTED" && (
                            <button onClick={() => handleProcess(alert.id)} className="btn-secondary text-[0.8125rem] py-1.5 px-4">
                              Xác nhận xử lý
                            </button>
                          )}
                          <button onClick={() => handleResolve(alert.id)} className="btn-primary text-[0.8125rem] py-1.5 px-4">
                            <CheckCircle size={14} />
                            Đóng cảnh báo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
