"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, ChevronRight, User } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { useAppStore } from "@/lib/store";
import { Badge, EmptyState } from "@/components/shared/index";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import type { AlertStatus } from "@/types";

type TabType = "all" | "unhandled" | "resolved";

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
  const processAlert = useAppStore((s) => s.processAlert);
  const resolveAlert = useAppStore((s) => s.resolveAlert);
  const addToast = useAppStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tabCounts = {
    all: alerts.length,
    unhandled: alerts.filter((a) => a.status !== "RESOLVED").length,
    resolved: alerts.filter((a) => a.status === "RESOLVED").length,
  };

  const filtered = alerts.filter((a) => {
    if (activeTab === "unhandled") return a.status !== "RESOLVED";
    if (activeTab === "resolved") return a.status === "RESOLVED";
    return true;
  }).sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

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
