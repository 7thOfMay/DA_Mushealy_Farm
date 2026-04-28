export type DashboardLanding = "farms" | "alerts" | "logs";

export interface LocalSettings {
  autoRefreshSec: number;
  notifyHighAlerts: boolean;
  soundEnabled: boolean;
  compactMode: boolean;
  dashboardLanding: DashboardLanding;
}

export const SETTINGS_KEY = "nongtech-settings-v1";

export const defaultLocalSettings: LocalSettings = {
  autoRefreshSec: 30,
  notifyHighAlerts: true,
  soundEnabled: true,
  compactMode: false,
  dashboardLanding: "farms",
};

export function loadLocalSettings(): LocalSettings {
  if (typeof window === "undefined") return defaultLocalSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultLocalSettings;
    const parsed = JSON.parse(raw) as Partial<LocalSettings>;
    return { ...defaultLocalSettings, ...parsed };
  } catch {
    return defaultLocalSettings;
  }
}

export function getDashboardLandingPath(settings: LocalSettings = loadLocalSettings()): "/farms" | "/alerts" | "/logs" {
  if (settings.dashboardLanding === "alerts") return "/alerts";
  if (settings.dashboardLanding === "logs") return "/logs";
  return "/farms";
}
