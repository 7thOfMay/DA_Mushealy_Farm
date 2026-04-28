"use client";

import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { timeAgo } from "@/frontend/utils/utils";
import { useAppStore } from "@/frontend/context/store";
import Link from "next/link";

const severityConfig = {
  high: { color: "#C0392B", bg: "#FEE2E2" },
  medium: { color: "#E67E22", bg: "#FEF3C7" },
  low: { color: "#27AE60", bg: "#DCFCE7" },
};

const statusConfig = {
  DETECTED: { label: "Phát hiện", color: "#C0392B", bg: "#FEE2E2" },
  PROCESSING: { label: "Đang xử lý", color: "#E67E22", bg: "#FEF3C7" },
  RESOLVED: { label: "Đã giải quyết", color: "#27AE60", bg: "#DCFCE7" },
};

export function AlertPanel() {
  const alerts = useAppStore((s) => s.alerts);
  const activeAlerts = alerts.filter((a) => a.status !== "RESOLVED").slice(0, 6);

  return (
    <div className="card flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-[#E2E8E4]">
        <h2 className="font-semibold text-[1.0625rem] text-[#1A2E1F]">Cảnh báo gần đây</h2>
        <Link href="/alerts" className="text-[0.75rem] text-[#1B4332] font-semibold hover:underline">
          Xem tất cả
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <CheckCircle size={40} strokeWidth={1} className="text-[#27AE60]/40 mb-2" />
            <p className="text-[0.875rem] text-[#5C7A6A]">Không có cảnh báo nào</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8E4]">
            {activeAlerts.map((alert) => {
              const sev = severityConfig[alert.severity];
              const stat = statusConfig[alert.status];
              return (
                <div key={alert.id} className="p-4 hover:bg-[#F7F8F6] transition-colors">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: sev.bg }}
                    >
                      <AlertTriangle size={13} style={{ color: sev.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8125rem] text-[#1A2E1F] font-medium leading-snug">{alert.message}</p>
                      <p className="text-[0.6875rem] text-[#5C7A6A] mt-0.5">{alert.gardenName}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className="text-[0.6875rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[4px]"
                          style={{ backgroundColor: stat.bg, color: stat.color }}
                        >
                          {stat.label}
                        </span>
                        <span className="text-[0.6875rem] text-[#5C7A6A] flex items-center gap-1">
                          <Clock size={10} />
                          {timeAgo(alert.detectedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
