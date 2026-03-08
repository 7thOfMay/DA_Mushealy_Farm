"use client";

import { Bell, Menu, CloudSun } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const alerts = useAppStore((s) => s.alerts);
  const unhandledAlerts = alerts.filter((a) => a.status === "DETECTED").length;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLive] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between py-5 px-8 border-b border-[#E2E8E4] bg-[#F7F8F6]">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-[8px] hover:bg-[#E2E8E4] transition-colors"
        >
          <Menu size={20} className="text-[#1A2E1F]" />
        </button>
        <div>
          <h1
            className="text-[1.75rem] text-[#1A2E1F] leading-tight"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-[0.8125rem] text-[#5C7A6A] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Live badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-white border border-[#E2E8E4] rounded-[20px] px-3 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isLive ? "bg-[#27AE60] animate-pulse-dot" : "bg-[#E67E22]"
            )}
          />
          <span className="text-[0.6875rem] font-semibold text-[#5C7A6A]">
            {isLive
              ? "Đang cập nhật"
              : `Cập nhật lúc ${currentTime.getHours().toString().padStart(2, "0")}:${currentTime.getMinutes().toString().padStart(2, "0")}`}
          </span>
        </div>

        {/* Weather pill */}
        <div className="hidden md:flex items-center gap-1.5 bg-white border border-[#E2E8E4] rounded-[20px] px-3 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CloudSun size={14} className="text-[#F39C12]" />
          <span className="text-[0.6875rem] font-semibold text-[#5C7A6A]">28°C · Nắng</span>
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-[8px] hover:bg-[#E2E8E4] transition-colors">
          <Bell size={18} className="text-[#5C7A6A]" />
          {unhandledAlerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C0392B] rounded-full flex items-center justify-center text-white text-[0.5625rem] font-bold leading-none">
              {unhandledAlerts}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
