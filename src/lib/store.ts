import { create } from "zustand";
import type { Device, Alert, User } from "@/types";
import { devices as initialDevices, alerts as initialAlerts } from "@/lib/mockData";

// Extend Alert type to include Toast for store
interface AppToast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  dismissing?: boolean;
}

interface AppState {
  // Devices
  devices: Device[];
  toggleDevice: (deviceId: string) => void;

  // Alerts
  alerts: Alert[];
  processAlert: (alertId: string, userName: string) => void;
  resolveAlert: (alertId: string, userName: string) => void;

  // Toasts
  toasts: AppToast[];
  addToast: (toast: Omit<AppToast, "id">) => void;
  dismissToast: (id: string) => void;

  // Sidebar state
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Auth
  loggedInUser: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  devices: initialDevices,
  toggleDevice: (deviceId) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, isOn: !d.isOn, lastUpdated: new Date().toISOString() } : d
      ),
    })),

  alerts: initialAlerts,
  processAlert: (alertId, userName) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId
          ? { ...a, status: "PROCESSING" as const, processingAt: new Date().toISOString(), processedBy: userName }
          : a
      ),
    })),
  resolveAlert: (alertId, userName) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: "RESOLVED" as const,
              resolvedAt: new Date().toISOString(),
              processedBy: userName,
              processingAt: a.processingAt ?? new Date().toISOString(),
            }
          : a
      ),
    })),

  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: Math.random().toString(36).slice(2) },
      ],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  loggedInUser: null,
  login: (user) => set({ loggedInUser: user }),
  logout: () => set({ loggedInUser: null }),
}));
