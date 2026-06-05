"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/frontend/utils/utils";
import { useAppStore } from "@/frontend/context/store";
import { getDefaultAdminFarmerId, getManagedFarmers, getVisibleFarmsForViewer } from "@/frontend/utils/dataScope";
import {
  LayoutDashboard, Sprout, Cpu, CalendarClock, AlertTriangle,
  BarChart3, BrainCircuit, ClipboardList, Users, Settings2,
  LogOut, X, ChevronsUpDown, Plus,
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
  { label: "Tá»•ng quan", href: (farmId) => farmId ? `/farms/${farmId}` : "/farms", icon: LayoutDashboard, section: "CHÃNH", roles: ["ADMIN", "FARMER"] },
  { label: "Khu vÆ°á»n", href: (farmId) => farmId ? `/farms/${farmId}` : "/farms", icon: Sprout, section: "CHÃNH", roles: ["ADMIN", "FARMER"] },
  { label: "Thiáº¿t bá»‹", href: (farmId) => farmId ? `/farms/${farmId}/devices` : "/farms", icon: Cpu, section: "CHÃNH", roles: ["ADMIN", "FARMER"] },
  { label: "Lá»‹ch trÃ¬nh", href: (farmId) => farmId ? `/farms/${farmId}/schedules` : "/farms", icon: CalendarClock, section: "QUáº¢N LÃ", roles: ["ADMIN", "FARMER"] },
  { label: "Cáº£nh bÃ¡o", href: (farmId) => farmId ? `/farms/${farmId}/alerts` : "/alerts", icon: AlertTriangle, section: "QUáº¢N LÃ", alertKey: true, roles: ["ADMIN", "FARMER"] },
  { label: "Alert Rules", href: (farmId) => farmId ? `/farms/${farmId}/alert-rules` : "/farms", icon: AlertTriangle, section: "QUáº¢N LÃ", roles: ["ADMIN", "FARMER"] },
  { label: "BÃ¡o cÃ¡o", href: () => "/reports", icon: BarChart3, section: "PHÃ‚N TÃCH", roles: ["ADMIN", "FARMER"] },
  { label: "AI PhÃ¢n tÃ­ch", href: () => "/ai", icon: BrainCircuit, section: "PHÃ‚N TÃCH", roles: ["ADMIN", "FARMER"] },
  { label: "Nháº­t kÃ½", href: (farmId) => farmId ? `/farms/${farmId}/logs` : "/logs", icon: ClipboardList, section: "Há»† THá»NG", roles: ["ADMIN", "FARMER"] },
  { label: "Quáº£n lÃ½ TK", href: () => "/users", icon: Users, section: "Há»† THá»NG", roles: ["ADMIN"] },
  { label: "QA Lab", href: () => "/qa", icon: ClipboardList, section: "Há»† THá»NG", roles: ["ADMIN"] },
  { label: "CÃ i Ä‘áº·t", href: () => "/settings", icon: Settings2, section: "Há»† THá»NG", roles: ["ADMIN"] },
  { label: "Há»“ sÆ¡", href: () => "/profile", icon: Settings2, section: "Há»† THá»NG", roles: ["ADMIN", "FARMER"] },
];

const sections = ["CHÃNH", "QUáº¢N LÃ", "PHÃ‚N TÃCH", "Há»† THá»NG"];

function getInitials(name: string) {
  return name.split(" ").slice(-2).map((n) => n[0]).join("").toUpperCase();
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
  const displayName = loggedInUser?.name ?? "Nguyá»…n VÄƒn An";
  const roleLabel = role === "ADMIN" ? "Ká»¹ sÆ° váº­n hÃ nh" : "NÃ´ng dÃ¢n";
  const initials = getInitials(displayName);

  const managedFarmers = useMemo(
    () => getManagedFarmers(users, loggedInUser),
    [users, loggedInUser]
  );

  const visibleFarms = useMemo(
    () => getVisibleFarmsForViewer({ farms, users, loggedInUser, selectedFarmerId }),
    [farms, users, loggedInUser, selectedFarmerId]
  );

  const visibleFarmIds = useMemo(() => new Set(visibleFarms.map((farm) => farm.id)), [visibleFarms]);
  const gardenFarmMap = useMemo(
    () => new Map(gardens.map((garden) => [garden.id, garden.farmId ?? null])),
    [gardens]
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
  }, [visibleFarms, currentFarmId, setCurrentFarmId, role, pathname, router, users, loggedInUser, selectedFarmerId, setSelectedFarmerId]);

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
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-[#1B4332] flex flex-col z-40 transition-transform duration-300",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-[8px] bg-white/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <Image src="/mushealy-logo.png" alt="Mushealy" width={24} height={24} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[1rem] leading-none">Mushealy</p>
            <p className="text-white/60 text-[0.625rem] uppercase tracking-widest mt-0.5">Smart Farm System</p>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-white/70 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pt-3">
          {visibleFarms.length > 0 ? (
            <div className="bg-white/10 rounded-[10px] border border-white/10 p-2">
              {role === "ADMIN" && managedFarmers.length > 0 && (
                <>
                  <label htmlFor="sidebar-farmer-select" className="text-white text-[0.625rem] uppercase tracking-[2px] px-1 font-semibold">NÃ´ng dÃ¢n quáº£n lÃ½</label>
                  <div className="relative mt-1 mb-2">
                    <select
                      id="sidebar-farmer-select"
                      name="sidebar-farmer-select"
                      className="w-full appearance-none bg-white text-[#1A2E1F] text-[0.8125rem] font-semibold px-3 py-2 rounded-[8px] outline-none border border-white/20 shadow-inner"
                      value={selectedFarmerId ?? ""}
                      onChange={(e) => setSelectedFarmerId(e.target.value || null)}
                    >
                      {managedFarmers.map((farmer) => (
                        <option key={farmer.id} value={farmer.id} className="text-[#1A2E1F]">
                          {farmer.name}
                        </option>
                      ))}
                    </select>
                    <ChevronsUpDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C7A6A] pointer-events-none" />
                  </div>
                </>
              )}

              <label htmlFor="sidebar-farm-select" className="text-white text-[0.625rem] uppercase tracking-[2px] px-1 font-semibold">NÃ´ng tráº¡i hiá»‡n táº¡i</label>
              <div className="relative mt-1">
                <select
                  id="sidebar-farm-select"
                  name="sidebar-farm-select"
                  className="w-full appearance-none bg-white text-[#1A2E1F] text-[0.8125rem] font-semibold px-3 py-2 rounded-[8px] outline-none border border-white/20 shadow-inner"
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
                <ChevronsUpDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C7A6A] pointer-events-none" />
              </div>
              <button
                onClick={() => router.push("/farms/new")}
                className="mt-2 w-full flex items-center justify-center gap-1.5 text-[0.75rem] font-medium text-white hover:text-white py-1.5 rounded-[8px] hover:bg-white/10 transition-colors"
              >
                <Plus size={13} />
                ThÃªm nÃ´ng tráº¡i
              </button>
            </div>
          ) : (
            <div className="bg-white/10 rounded-[10px] border border-white/10 px-3 py-2">
              <p className="text-white/70 text-[0.75rem]">ChÆ°a cÃ³ nÃ´ng tráº¡i phÃ¹ há»£p ngá»¯ cáº£nh.</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {sections.map((section) => {
            const items = navItems.filter((i) => i.section === section && i.roles.includes(role));
            if (!items.length) return null;
            return (
              <div key={section}>
                <p className="text-white/60 text-[0.625rem] uppercase tracking-[2px] px-3 pt-5 pb-1.5 font-semibold">
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
                        "flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[0.875rem] font-medium transition-all mb-0.5 relative",
                        active
                          ? "bg-white/15 text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#52B788] before:rounded-r-full"
                          : "text-white/90 hover:bg-white/10 hover:text-white"
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

        <div className="p-3 border-t border-white/10">
          <div className="px-3 mb-1">
            <span className={cn(
              "text-[0.5625rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
              role === "ADMIN"
                ? "bg-[#52B788]/20 text-[#52B788]"
                : "bg-[#E67E22]/20 text-[#E67E22]"
            )}>
              {roleLabel}
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
              <p className="text-white/60 text-[0.6875rem]">{roleLabel}</p>
            </div>
            <LogOut size={14} className="text-white/50 group-hover:text-white/80 flex-shrink-0 transition-colors" />
          </button>
        </div>
      </aside>
    </>
  );
}
