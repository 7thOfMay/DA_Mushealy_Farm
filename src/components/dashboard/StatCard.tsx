"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  badge?: string;
  badgeVariant?: "ok" | "warn" | "danger" | "default";
  accent?: boolean;
}

export function StatCard({ icon: Icon, label, value, sub, badge, badgeVariant = "default", accent }: StatCardProps) {
  const badgeColors = {
    ok: "bg-[#27AE60]/15 text-[#1B7A3F]",
    warn: "bg-[#E67E22]/15 text-[#9A4B0A]",
    danger: "bg-[#C0392B]/15 text-[#9B1C1C]",
    default: "bg-white/15 text-white",
  };

  return (
    <div
      className={cn(
        "rounded-[12px] p-5 border shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
        accent
          ? "bg-[#1B4332] border-[#163728] text-white"
          : "bg-white border-[#E2E8E4] text-[#1A2E1F]"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-9 h-9 rounded-[8px] flex items-center justify-center",
            accent ? "bg-white/15" : "bg-[#F0FAF3]"
          )}
        >
          <Icon size={18} strokeWidth={1.5} className={accent ? "text-white" : "text-[#1B4332]"} />
        </div>
        {badge && (
          <span
            className={cn(
              "text-[0.6875rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-[4px]",
              accent ? badgeColors.default : badgeColors[badgeVariant]
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <p
        className="font-mono-data font-bold leading-none mb-1.5"
        style={{ fontSize: "2.25rem", fontFamily: "'DM Mono', monospace" }}
      >
        {value}
      </p>
      <p
        className={cn(
          "text-[0.75rem] font-semibold uppercase tracking-wide",
          accent ? "text-white/60" : "text-[#5C7A6A]"
        )}
      >
        {label}
      </p>
      {sub && (
        <p className={cn("text-[0.6875rem] mt-0.5", accent ? "text-white/40" : "text-[#5C7A6A]/70")}>{sub}</p>
      )}
    </div>
  );
}
