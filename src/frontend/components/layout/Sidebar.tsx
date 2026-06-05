"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/frontend/utils/utils";
import { useAppStore } from "@/frontend/context/store";
import { getDefaultAdminFarmerId, getManagedFarmers, getVisibleFarmsForViewer } from "@/frontend/utils/dataScope";
import {
  LayoutDashboard,
  Sprout,
  Cpu,
  CalendarClock,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  ClipboardList,
  Users,
  Settings2,
  LogOut,
  X,
  ChevronsUpDown,
  Plus,
} from "lucide-react";
import type { UserRole } from "@/types";

const navItems: Array<{
  label: string;
  href: (farmId: string | null) => string;
  icon: typeof LayoutDashboard;
  section: string;
  alertKey?: boolean;
  roles: UserRole[];
}> = [
  { label: "Tổng quan", href: (farmId) => (farmId ? `/farms/${farmId}` : "/farms"), icon: LayoutDashboard, section: "CHÍNH", roles: ["ADMIN", "FARMER"] },
  { label: "Khu vườn", href: (farmId) => (farmId ? `/farms/${farmId}` : "/farms"), icon: Sprout, section: "CHÍNH", roles: ["ADMIN", "FARMER"] },
  { label: "Thiết bị", href: (farmId) => (farmId ? `/farms/${farmId}/devices` : "/farms"), icon: Cpu, section: "CHÍNH", roles: ["ADMIN", "FARMER"] },
  { label: "Lịch trình", href: (farmId) => (farmId ? `/farms/${farmId}/schedules` : "/farms"), icon: CalendarClock, section: "QUẢN LÝ", roles: ["ADMIN", "FARMER"] },
  { label: "Cảnh báo", href: (farmId) => (farmId ? `/farms/${farmId}/alerts` : "/alerts"), icon: AlertTriangle, section: "QUẢN LÝ", alertKey: true, roles: ["ADMIN", "FARMER"] },
  { label: "Alert Rules", href: (farmId) => (farmId ? `/farms/${farmId}/alert-rules` : "/farms"), icon: AlertTriangle, section: "QUẢN LÝ", roles: ["ADMIN", "FARMER"] },
  { label: "Báo cáo", href: () => "/reports", icon: BarChart3, section: "PHÂN TÍCH", roles: ["ADMIN", "FARMER"] },
  { label: "AI Phân tích", href: () => "/ai", icon: BrainCircuit, section: "PHÂN TÍCH", roles: ["ADMIN", "FARMER"] },
  { label: "Nhật ký", href: (farmId) => (farmId ? `/farms/${farmId}/logs` : "/logs"), icon: ClipboardList, section: "HỆ THỐNG", roles: ["ADMIN", "FARMER"] },
  { label: "Quản lý TK", href: () => "/users", icon: Users, section: "HỆ THỐNG", roles: ["ADMIN"] },
  { label: "QA Lab", href: () => "/qa", icon: ClipboardList, section: "HỆ THỐNG", roles: ["ADMIN"] },
  { label: "Cài đặt", href: () => "/settings", icon: Settings2, section: "HỆ THỐNG", roles: ["ADMIN"] },
  { label: "Hồ sơ", href: () => "/profile", icon: Settings2, section: "HỆ THỐNG", roles: ["ADMIN", "FARMER"] },
];

const sections = ["CHÍNH", "QUẢN LÝ", "PHÂN TÍCH", "HỆ THỐNG"];

function getInitials(name: string) {
  return name.split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const farms = useAppStore((s) => s.farms);
  const currentFarmId = useAppStore((s) => s.currentFarmId);
  const selectedFarmerId = useAppStore((s) => s.selectedFarmerId);
  const setCurrentFarmId = useAppStore((s) => s.setCurrentFarmId);
  const setSelectedFarmerId = useAppStore((s) => s.setSelectedFarmerId);
  const alerts = useAppStore((s) => s.alerts);
  const gardens = useAppStore((s) => s.gardens);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const loggedInUser = useAppStore((s) => s.loggedInUser);
  const users = useAppStore((s) => s.users);
  const logout = useAppStore((s) => s.logout);

  const role: UserRole = loggedInUser?.role ?? "ADMIN";
  const displayName = loggedInUser?.name ?? "Nguyễn Văn An";
  const roleLabel = role === "ADMIN" ? "Kỹ sư vận hành" : "Nông dân";
  const initials = getInitials(displayName);

  const managedFarmers = useMemo(
    () => getManagedFarmers(users, loggedInUser),
    [users, loggedInUser],
  );

  const visibleFarms = useMemo(
    () => getVisibleFarmsForViewer({ farms, users, loggedInUser, selectedFarmerId }),
    [farms, users, loggedInUser, selectedFarmerId],
  );

  const visibleFarmIds = useMemo(() => new Set(visibleFarms.map((farm) => farm.id)), [visibleFarms]);
  const gardenFarmMap = useMemo(
    () => new Map(gardens.map((garden) => [garden.id, garden.farmId ?? null])),
    [gardens],
  );
  const unhandledAlerts = alerts.filter((alert) => {
    if (alert.status !== "DETECTED") return false;
    const farmId = alert.farmId ?? gardenFarmMap.get(alert.gardenId) ?? null;
    return Boolean(farmId && visibleFarmIds.has(farmId));
  }).length;

  const activeFarm = visibleFarms.find((farm) => farm.id === currentFarmId) ?? visibleFarms[0] ?? null;

  useEffect(() => {
    if (role === "ADMIN") {
      const defaultFarmerId = getDefaultAdminFarmerId(users, loggedInUser);
      if (!selectedFarmerId && defaultFarmerId) {
        setSelectedFarmerId(defaultFarmerId);
      }
    }

    if (!visibleFarms.length) return;
    if (!currentFarmId || !visibleFarms.some((farm) => farm.id === currentFarmId)) {
      setCurrentFarmId(visibleFarms[0].id);
      return;
    }
    if (role === "FARMER" && visibleFarms.length === 1 && pathname === "/farms") {
      router.replace(`/farms/${visibleFarms[0].id}`);
    }
  }, [
    visibleFarms,
    currentFarmId,
    setCurrentFarmId,
    role,
    pathname,
    router,
    users,
    loggedInUser,
    selectedFarmerId,
    setSelectedFarmerId,
  ]);

  const isActive = (href: string) => {
    if (href === "/farms") return pathname === "/farms";
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    if (sidebarOpen) toggleSidebar();
    router.push("/login");
  };

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={toggleSidebar} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-[#1B4332] transition-transform duration-300",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white/15">
            <Image src="/mushealy-logo.png" alt="Mushealy" width={24} height={24} className="object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[1rem] font-bold leading-none text-[#FFF9E8]">Mushealy</p>
            <p className="mt-0.5 text-[0.625rem] uppercase tracking-widest text-[#F4EBD0]/75">Smart Farm System</p>
          </div>
          <button onClick={toggleSidebar} className="text-[#FFF9E8]/75 hover:text-[#FFF9E8] lg:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pt-3">
          {visibleFarms.length > 0 ? (
            <div className="rounded-[10px] border border-white/20 bg-white/10 p-2">
              {role === "ADMIN" && managedFarmers.length > 0 && (
                <>
                  <label
                    htmlFor="sidebar-farmer-select"
                    className="px-1 text-[0.625rem] font-semibold uppercase tracking-[2px] text-[#FFF7DB]"
                  >
                    Nông dân quản lý
                  </label>
                  <div className="relative mb-2 mt-1">
                    <select
                      id="sidebar-farmer-select"
                      name="sidebar-farmer-select"
                      className="w-full appearance-none rounded-[8px] border border-white/20 bg-white px-3 py-2 text-[0.8125rem] font-semibold text-[#1A2E1F] shadow-inner outline-none"
                      value={selectedFarmerId ?? ""}
                      onChange={(e) => setSelectedFarmerId(e.target.value || null)}
                    >
                      {managedFarmers.map((farmer) => (
                        <option key={farmer.id} value={farmer.id} className="text-[#1A2E1F]">
                          {farmer.name}
                        </option>
                      ))}
                    </select>
                    <ChevronsUpDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5C7A6A]" />
                  </div>
                </>
              )}

              <label
                htmlFor="sidebar-farm-select"
                className="px-1 text-[0.625rem] font-semibold uppercase tracking-[2px] text-[#FFF7DB]"
              >
                Nông trại hiện tại
              </label>
              <div className="relative mt-1">
                <select
                  id="sidebar-farm-select"
                  name="sidebar-farm-select"
                  className="w-full appearance-none rounded-[8px] border border-white/20 bg-white px-3 py-2 text-[0.8125rem] font-semibold text-[#1A2E1F] shadow-inner outline-none"
                  value={activeFarm?.id ?? ""}
                  onChange={(e) => {
                    setCurrentFarmId(e.target.value);
                    router.push(`/farms/${e.target.value}`);
                  }}
                >
                  {visibleFarms.map((farm) => (
                    <option key={farm.id} value={farm.id} className="text-[#1A2E1F]">
                      {farm.name}
                    </option>
                  ))}
                </select>
                <ChevronsUpDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5C7A6A]" />
              </div>
              <button
                onClick={() => router.push("/farms/new")}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[8px] py-1.5 text-[0.75rem] font-medium text-[#FFF7DB] transition-colors hover:bg-white/10 hover:text-white"
              >
                <Plus size={13} />
                Thêm nông trại
              </button>
            </div>
          ) : (
            <div className="rounded-[10px] border border-white/20 bg-white/10 px-3 py-2">
              <p className="text-[0.75rem] text-[#F4EBD0]/85">Chưa có nông trại phù hợp ngữ cảnh.</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {sections.map((section) => {
            const items = navItems.filter((item) => item.section === section && item.roles.includes(role));
            if (!items.length) return null;

            return (
              <div key={section}>
                <p className="px-3 pb-1.5 pt-5 text-[0.625rem] font-semibold uppercase tracking-[2px] text-[#F4EBD0]/70">
                  {section}
                </p>
                {items.map((item) => {
                  const Icon = item.icon;
                  const href = item.href(activeFarm?.id ?? null);
                  const active = isActive(href);

                  return (
                    <Link
                      key={`${item.label}-${href}`}
                      href={href}
                      onClick={() => sidebarOpen && toggleSidebar()}
                      className={cn(
                        "relative mb-0.5 flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[0.875rem] font-medium transition-all",
                        active
                          ? "bg-white/15 text-white before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-r-full before:bg-[#52B788]"
                          : "text-[#FFF7DB] hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon size={18} strokeWidth={1.5} className="flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.alertKey && unhandledAlerts > 0 && (
                        <span className="rounded-[10px] bg-[#C0392B] px-1.5 py-0.5 text-[0.625rem] font-bold leading-none text-white">
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

        <div className="border-t border-white/10 p-3">
          <div className="mb-1 px-3">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-widest",
                role === "ADMIN" ? "bg-[#52B788]/20 text-[#9BE2BF]" : "bg-[#E67E22]/20 text-[#FFD199]",
              )}
            >
              {roleLabel}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="group flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2.5 transition-colors hover:bg-white/10"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#40916C] text-[0.75rem] font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[0.8125rem] font-medium text-[#FFF9E8]">{displayName}</p>
              <p className="text-[0.6875rem] text-[#F4EBD0]/70">{roleLabel}</p>
            </div>
            <LogOut size={14} className="flex-shrink-0 text-[#F4EBD0]/60 transition-colors group-hover:text-[#FFF9E8]" />
          </button>
        </div>
      </aside>
    </>
  );
}
