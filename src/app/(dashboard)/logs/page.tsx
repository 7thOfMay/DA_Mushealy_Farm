"use client";

import { Power, Settings2, AlertTriangle, LogIn, LogOut, Plus, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { systemLogs } from "@/lib/mockData";
import { timeAgo, formatDateTime } from "@/lib/utils";
import type { LogActionType } from "@/types";

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
  const sorted = [...systemLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div>
      <Topbar title="Nhật ký hệ thống" subtitle={`${sorted.length} hoạt động được ghi nhận`} />

      <div className="p-8">
        <div className="card overflow-hidden">
          <div className="divide-y divide-[#E2E8E4]">
            {sorted.map((log) => {
              const config = actionConfig[log.actionType];
              const Icon = config.icon;
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[#F7F8F6] transition-colors">
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
        </div>
      </div>
    </div>
  );
}
