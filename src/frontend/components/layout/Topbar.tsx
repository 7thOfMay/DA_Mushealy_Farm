"use client";

import { useEffect, useState } from "react";
import { Bell, CloudSun, Menu } from "lucide-react";
import { useAppStore } from "@/frontend/context/store";
import { cn } from "@/frontend/utils/utils";

interface TopbarProps {
  title: string;
  subtitle?: string;
  titleVariant?: "display" | "section";
}

export function Topbar({ title, subtitle, titleVariant = "display" }: TopbarProps) {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const alerts = useAppStore((s) => s.alerts);
  const unhandledAlerts = alerts.filter((alert) => alert.status === "DETECTED").length;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLive] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-[#E2E8E4] bg-[#F7F8F6] px-8 py-5">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-[8px] p-2 transition-colors hover:bg-[#E2E8E4] lg:hidden"
        >
          <Menu size={20} className="text-[#1A2E1F]" />
        </button>
        <div>
          <h1
            className={cn(
              "leading-tight text-[#1A2E1F]",
              titleVariant === "display"
                ? "text-[1.75rem]"
                : "text-[1.625rem] font-semibold tracking-tight",
            )}
            style={titleVariant === "display"
              ? { fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }
              : undefined}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-[0.8125rem] text-[#5C7A6A]">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 rounded-[20px] border border-[#E2E8E4] bg-white px-3 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:flex">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isLive ? "animate-pulse-dot bg-[#27AE60]" : "bg-[#E67E22]",
            )}
          />
          <span className="text-[0.6875rem] font-semibold text-[#5C7A6A]">
            {isLive
              ? "Đang cập nhật"
              : `Cập nhật lúc ${currentTime.getHours().toString().padStart(2, "0")}:${currentTime.getMinutes().toString().padStart(2, "0")}`}
          </span>
        </div>

        <div className="hidden items-center gap-1.5 rounded-[20px] border border-[#E2E8E4] bg-white px-3 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:flex">
          <CloudSun size={14} className="text-[#F39C12]" />
          <span className="text-[0.6875rem] font-semibold text-[#5C7A6A]">28°C · Nắng</span>
        </div>

        <button className="relative rounded-[8px] p-2 transition-colors hover:bg-[#E2E8E4]">
          <Bell size={18} className="text-[#5C7A6A]" />
          {unhandledAlerts > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C0392B] text-[0.5625rem] font-bold leading-none text-white">
              {unhandledAlerts}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
