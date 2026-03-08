"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  LayoutDashboard, Sprout, Cpu, CalendarClock, AlertTriangle,
  BarChart3, BrainCircuit, ClipboardList, Users, Settings2,
  LogOut, X, Leaf,
} from "lucide-react";
import type { UserRole } from "@/types";

const navItems: {
  label: string;
  href: string;
  icon: typeof Leaf;
  section: string;
  alertKey?: boolean;
  roles: UserRole[];
}[] = [
  { label: "Tổng quan",  href: "/dashboard", icon: LayoutDashboard, section: "CHÍNH",     roles: ["ADMIN", "FARMER"] },
  { label: "Khu vườn",   href: "/gardens",   icon: Sprout,          section: "CHÍNH",     roles: ["ADMIN", "FARMER"] },
  { label: "Thiết bị",   href: "/devices",   icon: Cpu,             section: "CHÍNH",     roles: ["ADMIN", "FARMER"] },
  { label: "Lịch trình", href: "/schedules", icon: CalendarClock,   section: "QUẢN LÝ",  roles: ["ADMIN", "FARMER"] },
  { label: "Cảnh báo",   href: "/alerts",    icon: AlertTriangle,   section: "QUẢN LÝ",  alertKey: true, roles: ["ADMIN", "FARMER"] },
  { label: "Báo cáo",    href: "/reports",   icon: BarChart3,       section: "PHÂN TÍCH", roles: ["ADMIN", "FARMER"] },
  { label: "AI Module",  href: "/ai",        icon: BrainCircuit,    section: "PHÂN TÍCH", roles: ["ADMIN", "FARMER"] },
  { label: "Nhật ký",    href: "/logs",      icon: ClipboardList,   section: "HỆ THỐNG", roles: ["ADMIN"] },
  { label: "Tài khoản",  href: "/users",     icon: Users,           section: "HỆ THỐNG", roles: ["ADMIN"] },
  { label: "Hồ sơ",      href: "/profile",   icon: Settings2,       section: "HỆ THỐNG", roles: ["ADMIN", "FARMER"] },
];

const sections = ["CHÍNH", "QUẢN LÝ", "PHÂN TÍCH", "HỆ THỐNG"];

function getInitials(name: string) {
  return name.split(" ").slice(-2).map((n) => n[0]).join("").toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const alerts = useAppStore((s) => s.alerts);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const loggedInUser = useAppStore((s) => s.loggedInUser);
  const logout = useAppStore((s) => s.logout);

  const role: UserRole = loggedInUser?.role ?? "ADMIN";
  const displayName = loggedInUser?.name ?? "Nguyễn Văn An";
  const roleLabel = role === "ADMIN" ? "Quản trị viên" : "Nông dân";
  const initials = getInitials(displayName);

  const unhandledAlerts = alerts.filter((a) => a.status === "DETECTED").length;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    if (sidebarOpen) toggleSidebar();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-[#1B4332] flex flex-col z-40 transition-transform duration-300",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-[8px] bg-white/15 flex items-center justify-center flex-shrink-0">
            <Leaf size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[1rem] leading-none">NôngTech</p>
            <p className="text-white/50 text-[0.6875rem] uppercase tracking-widest mt-0.5">Smart Farm</p>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {sections.map((section) => {
            const items = navItems.filter((i) => i.section === section && i.roles.includes(role));
            if (!items.length) return null;
            return (
              <div key={section}>
                <p className="text-white/40 text-[0.625rem] uppercase tracking-[2px] px-3 pt-5 pb-1.5 font-semibold">
                  {section}
                </p>
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => sidebarOpen && toggleSidebar()}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[0.875rem] font-medium transition-all mb-0.5 relative",
                        active
                          ? "bg-white/15 text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#52B788] before:rounded-r-full"
                          : "text-white/70 hover:bg-white/7 hover:text-white"
                      )}
                    >
                      <Icon size={18} strokeWidth={1.5} className="flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.alertKey && unhandledAlerts > 0 && (
                        <span className="bg-[#C0392B] text-white text-[0.625rem] font-bold px-1.5 py-0.5 rounded-[10px] leading-none">
                          {unhandledAlerts}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          {/* Role badge */}
          <div className="px-3 mb-1">
            <span className={cn(
              "text-[0.5625rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
              role === "ADMIN"
                ? "bg-[#52B788]/20 text-[#52B788]"
                : "bg-[#E67E22]/20 text-[#E67E22]"
            )}>
              {role === "ADMIN" ? "⚙ Quản trị viên" : "🌱 Nông dân"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-white/10 cursor-pointer transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-[#40916C] flex items-center justify-center text-white text-[0.75rem] font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-white text-[0.8125rem] font-medium truncate">{displayName}</p>
              <p className="text-white/50 text-[0.6875rem]">{roleLabel}</p>
            </div>
            <LogOut size={14} className="text-white/40 group-hover:text-white/80 flex-shrink-0 transition-colors" />
          </button>
        </div>
      </aside>
    </>
  );
}
