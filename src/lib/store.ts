import { create } from "zustand";
import type { Device, Alert, User, Farm, Garden, SystemLog, AlertRule, Schedule, BackupRecord, AIAnalysis, CropType, PlantTypeInfo, GardenSensorSummary, ChartDataPoint } from "@/types";
import {
  seedDevices,
  seedAlerts,
  seedFarms,
  seedCropTypes,
  seedGardens,
  seedPlantTypeInfos,
  seedSystemLogs,
  seedAlertRules,
  seedSchedules,
  seedUsers,
  seedAiAnalyses,
  seedBackupRecords,
  seedSensorSummaries,
  seedTemperatureChartData,
  seedHumidityAirChartData,
  seedHumiditySoilChartData,
  seedLightChartData,
} from "@/lib/seedData";
import {
  buildRuntimeImportPreview,
  createRuntimeSnapshotEnvelope,
  extractRuntimeSnapshot,
  migrateRuntimeSnapshot,
  normalizeRuntimeSnapshot,
  parseRuntimeSnapshotPayload,
  type RuntimeImportPreview,
  type RuntimeStateSnapshot,
} from "@/lib/runtimeSnapshot";

const USER_PASSWORDS_STORAGE_KEY = "nongtech-user-passwords-v1";
const SESSION_USER_ID_STORAGE_KEY = "nongtech-session-user-id";
const CURRENT_FARM_STORAGE_KEY = "nongtech-current-farm-id";
const SELECTED_FARMER_STORAGE_KEY = "nongtech-selected-farmer-id";
const RUNTIME_STATE_STORAGE_KEY = "nongtech-runtime-state-v1";
const RUNTIME_DATA_OPS_HISTORY_STORAGE_KEY = "nongtech-runtime-ops-history-v1";
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

interface RuntimeDataOpHistoryItem {
  id: string;
  type: "EXPORT" | "IMPORT" | "RESET";
  createdAt: string;
  success: boolean;
  summary: string;
}

function getDefaultRuntimeSnapshot(): RuntimeStateSnapshot {
  return {
    farms: seedFarms,
    cropTypes: seedCropTypes,
    plantTypeInfos: seedPlantTypeInfos,
    gardens: seedGardens,
    devices: seedDevices,
    sensorSummaries: seedSensorSummaries,
    temperatureChartData: seedTemperatureChartData,
    humidityAirChartData: seedHumidityAirChartData,
    humiditySoilChartData: seedHumiditySoilChartData,
    lightChartData: seedLightChartData,
    alerts: seedAlerts,
    alertRules: seedAlertRules,
    schedules: seedSchedules,
    logs: seedSystemLogs,
    backupRecords: seedBackupRecords,
    aiAnalyses: seedAiAnalyses,
    users: seedUsers,
  };
}

function loadRuntimeSnapshot(): RuntimeStateSnapshot {
  const defaults = getDefaultRuntimeSnapshot();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(RUNTIME_STATE_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as unknown;
    return extractRuntimeSnapshot(parsed, defaults);
  } catch {
    return defaults;
  }
}

function saveRuntimeSnapshot(snapshot: RuntimeStateSnapshot) {
  if (typeof window === "undefined") return;
  const envelope = createRuntimeSnapshotEnvelope(snapshot, APP_VERSION);
  window.localStorage.setItem(RUNTIME_STATE_STORAGE_KEY, JSON.stringify(envelope));
}

function loadRuntimeDataOpsHistory(): RuntimeDataOpHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RUNTIME_DATA_OPS_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RuntimeDataOpHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRuntimeDataOpsHistory(history: RuntimeDataOpHistoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUNTIME_DATA_OPS_HISTORY_STORAGE_KEY, JSON.stringify(history));
}

function loadUserPasswords(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USER_PASSWORDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveUserPasswords(passwords: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));
}

function loadLoggedInUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_USER_ID_STORAGE_KEY);
    if (!raw) return null;
    // Try parsing as full user object first, then fall back to ID lookup
    try {
      const parsed = JSON.parse(raw) as User;
      if (parsed && typeof parsed === "object" && parsed.id && parsed.email) {
        return parsed;
      }
    } catch {
      // Legacy format: plain user ID string — can't resolve without mock data
    }
    return null;
  } catch {
    return null;
  }
}

function saveLoggedInUserId(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) {
    window.localStorage.setItem(SESSION_USER_ID_STORAGE_KEY, JSON.stringify(user));
    return;
  }
  window.localStorage.removeItem(SESSION_USER_ID_STORAGE_KEY);
}

function loadCurrentFarmId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CURRENT_FARM_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function saveCurrentFarmId(farmId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CURRENT_FARM_STORAGE_KEY, farmId);
}

function loadSelectedFarmerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SELECTED_FARMER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveSelectedFarmerId(farmerId: string | null) {
  if (typeof window === "undefined") return;
  if (!farmerId) {
    window.localStorage.removeItem(SELECTED_FARMER_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SELECTED_FARMER_STORAGE_KEY, farmerId);
}

function syncAuthCookies(user: User | null) {
  if (typeof document === "undefined") return;
  if (!user) {
    document.cookie = "nongtech_auth=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "nongtech_role=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "nongtech_status=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "nongtech_farms=; path=/; max-age=0; SameSite=Lax";
    return;
  }

  const thirtyDays = 60 * 60 * 24 * 30;
  document.cookie = `nongtech_auth=1; path=/; max-age=${thirtyDays}; SameSite=Lax`;
  document.cookie = `nongtech_role=${user.role}; path=/; max-age=${thirtyDays}; SameSite=Lax`;
  document.cookie = `nongtech_status=${user.status}; path=/; max-age=${thirtyDays}; SameSite=Lax`;
  document.cookie = `nongtech_farms=${(user.assignedFarmIds ?? []).join("|")}; path=/; max-age=${thirtyDays}; SameSite=Lax`;
}

// Extend Alert type to include Toast for store
interface AppToast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  dismissing?: boolean;
}

interface AppState {
  // Farm context
  farms: Farm[];
  cropTypes: CropType[];
  plantTypeInfos: PlantTypeInfo[];
  currentFarmId: string | null;
  selectedFarmerId: string | null;
  setCurrentFarmId: (farmId: string) => void;
  setSelectedFarmerId: (farmerId: string | null) => void;
  addFarm: (farm: Farm) => void;
  updateFarm: (farmId: string, patch: Partial<Farm>) => void;

  // Gardens
  gardens: Garden[];
  addGarden: (garden: Garden) => void;
  updateGarden: (gardenId: string, patch: Partial<Garden>) => void;

  // Devices
  devices: Device[];
  toggleDevice: (deviceId: string) => void;
  addDevice: (device: Device) => void;

  // Sensor snapshots + chart series
  sensorSummaries: GardenSensorSummary[];
  updateGardenSensorSummary: (
    gardenId: string,
    patch: Partial<Pick<GardenSensorSummary, "temperature" | "humidityAir" | "humiditySoil" | "light">>
  ) => void;
  temperatureChartData: ChartDataPoint[];
  humidityAirChartData: ChartDataPoint[];
  humiditySoilChartData: ChartDataPoint[];
  lightChartData: ChartDataPoint[];

  // Alerts
  alerts: Alert[];
  processAlert: (alertId: string, userName: string) => void;
  resolveAlert: (alertId: string, userName: string) => void;

  // Alert rules
  alertRules: AlertRule[];
  addAlertRule: (rule: AlertRule) => void;
  updateAlertRule: (ruleId: string, patch: Partial<AlertRule>) => void;
  deleteAlertRule: (ruleId: string) => void;
  toggleAlertRule: (ruleId: string) => void;

  // Schedules
  schedules: Schedule[];
  addSchedule: (schedule: Schedule) => void;
  updateSchedule: (scheduleId: string, patch: Partial<Schedule>) => void;
  deleteSchedule: (scheduleId: string) => void;
  toggleSchedule: (scheduleId: string) => void;

  // Logs
  logs: SystemLog[];
  addLog: (log: SystemLog) => void;

  // Backups
  backupRecords: BackupRecord[];
  addBackupRecord: (record: BackupRecord) => void;
  updateBackupRecord: (recordId: string, patch: Partial<BackupRecord>) => void;

  // AI analyses
  aiAnalyses: AIAnalysis[];
  addAiAnalysis: (analysis: AIAnalysis) => void;

  // Toasts
  toasts: AppToast[];
  addToast: (toast: Omit<AppToast, "id">) => void;
  dismissToast: (id: string) => void;

  // Sidebar state
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Auth
  users: User[];
  addUser: (user: User) => void;
  updateUser: (userId: string, patch: Partial<User>) => void;
  toggleUserStatus: (userId: string) => void;
  userPasswords: Record<string, string>;
  setUserPassword: (userId: string, password: string) => void;
  resetUserPassword: (userId: string) => void;
  loggedInUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  resetRuntimeData: () => void;
  exportRuntimeDataJson: () => string;
  previewRuntimeDataJson: (json: string) => { ok: boolean; message: string; preview?: RuntimeImportPreview };
  importRuntimeDataJson: (json: string) => { ok: boolean; message: string };
  runtimeDataOpsHistory: RuntimeDataOpHistoryItem[];
  clearRuntimeDataOpsHistory: () => void;
}

const initialRuntimeSnapshot = loadRuntimeSnapshot();

export const useAppStore = create<AppState>((set) => ({
  farms: initialRuntimeSnapshot.farms,
  cropTypes: initialRuntimeSnapshot.cropTypes,
  plantTypeInfos: initialRuntimeSnapshot.plantTypeInfos,
  currentFarmId: loadCurrentFarmId(),
  selectedFarmerId: loadSelectedFarmerId(),
  setCurrentFarmId: (farmId) => {
    saveCurrentFarmId(farmId);
    set({ currentFarmId: farmId });
  },
  setSelectedFarmerId: (farmerId) => {
    saveSelectedFarmerId(farmerId);
    set({ selectedFarmerId: farmerId });
  },
  addFarm: (farm) =>
    set((state) => ({
      farms: [farm, ...state.farms],
    })),
  updateFarm: (farmId, patch) =>
    set((state) => ({
      farms: state.farms.map((farm) => (farm.id === farmId ? { ...farm, ...patch } : farm)),
    })),

  gardens: initialRuntimeSnapshot.gardens,
  addGarden: (garden) =>
    set((state) => ({
      gardens: [garden, ...state.gardens],
    })),
  updateGarden: (gardenId, patch) =>
    set((state) => ({
      gardens: state.gardens.map((garden) => (garden.id === gardenId ? { ...garden, ...patch } : garden)),
    })),

  devices: initialRuntimeSnapshot.devices,
  toggleDevice: (deviceId) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, isOn: !d.isOn, lastUpdated: new Date().toISOString() } : d
      ),
    })),
  addDevice: (device) =>
    set((state) => ({
      devices: [device, ...state.devices],
    })),

  sensorSummaries: initialRuntimeSnapshot.sensorSummaries,
  updateGardenSensorSummary: (gardenId, patch) =>
    set((state) => ({
      sensorSummaries: state.sensorSummaries.map((summary) =>
        summary.gardenId === gardenId
          ? { ...summary, ...patch, updatedAt: new Date().toISOString() }
          : summary
      ),
    })),
  temperatureChartData: initialRuntimeSnapshot.temperatureChartData,
  humidityAirChartData: initialRuntimeSnapshot.humidityAirChartData,
  humiditySoilChartData: initialRuntimeSnapshot.humiditySoilChartData,
  lightChartData: initialRuntimeSnapshot.lightChartData,

  alerts: initialRuntimeSnapshot.alerts,
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

  alertRules: initialRuntimeSnapshot.alertRules,
  addAlertRule: (rule) =>
    set((state) => ({
      alertRules: [rule, ...state.alertRules],
    })),
  updateAlertRule: (ruleId, patch) =>
    set((state) => ({
      alertRules: state.alertRules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)),
    })),
  deleteAlertRule: (ruleId) =>
    set((state) => ({
      alertRules: state.alertRules.filter((rule) => rule.id !== ruleId),
    })),
  toggleAlertRule: (ruleId) =>
    set((state) => ({
      alertRules: state.alertRules.map((rule) => (rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule)),
    })),

  schedules: initialRuntimeSnapshot.schedules,
  addSchedule: (schedule) =>
    set((state) => ({
      schedules: [schedule, ...state.schedules],
    })),
  updateSchedule: (scheduleId, patch) =>
    set((state) => ({
      schedules: state.schedules.map((schedule) => (schedule.id === scheduleId ? { ...schedule, ...patch } : schedule)),
    })),
  deleteSchedule: (scheduleId) =>
    set((state) => ({
      schedules: state.schedules.filter((schedule) => schedule.id !== scheduleId),
    })),
  toggleSchedule: (scheduleId) =>
    set((state) => ({
      schedules: state.schedules.map((schedule) => (schedule.id === scheduleId ? { ...schedule, isActive: !schedule.isActive } : schedule)),
    })),

  logs: initialRuntimeSnapshot.logs,
  addLog: (log) =>
    set((state) => ({
      logs: [log, ...state.logs],
    })),

  backupRecords: initialRuntimeSnapshot.backupRecords,
  addBackupRecord: (record) =>
    set((state) => ({
      backupRecords: [record, ...state.backupRecords],
    })),
  updateBackupRecord: (recordId, patch) =>
    set((state) => ({
      backupRecords: state.backupRecords.map((record) => (record.id === recordId ? { ...record, ...patch } : record)),
    })),

  aiAnalyses: initialRuntimeSnapshot.aiAnalyses,
  addAiAnalysis: (analysis) =>
    set((state) => ({
      aiAnalyses: [analysis, ...state.aiAnalyses],
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

  users: initialRuntimeSnapshot.users,
  addUser: (user) =>
    set((state) => ({
      users: [user, ...state.users],
    })),
  updateUser: (userId, patch) =>
    set((state) => {
      const nextUsers = state.users.map((user) => (user.id === userId ? { ...user, ...patch } : user));
      const nextLoggedInUser =
        state.loggedInUser?.id === userId
          ? { ...state.loggedInUser, ...patch }
          : state.loggedInUser;

      if (state.loggedInUser?.id === userId) {
        saveLoggedInUserId(nextLoggedInUser ?? null);
        syncAuthCookies(nextLoggedInUser ?? null);
      }

      return {
        users: nextUsers,
        loggedInUser: nextLoggedInUser,
      };
    }),
  toggleUserStatus: (userId) =>
    set((state) => {
      const nextUsers = state.users.map((user) =>
        user.id === userId
          ? {
              ...user,
              status: (user.status === "active" ? "inactive" : "active") as User["status"],
            }
          : user
      );
      const nextLoggedInUser =
        state.loggedInUser?.id === userId
          ? {
              ...state.loggedInUser,
              status: (state.loggedInUser.status === "active" ? "inactive" : "active") as User["status"],
            }
          : state.loggedInUser;

      if (state.loggedInUser?.id === userId) {
        saveLoggedInUserId(nextLoggedInUser ?? null);
        syncAuthCookies(nextLoggedInUser ?? null);
      }

      return {
        users: nextUsers,
        loggedInUser: nextLoggedInUser,
      };
    }),

  userPasswords: loadUserPasswords(),
  setUserPassword: (userId, password) =>
    set((state) => {
      const nextPasswords = { ...state.userPasswords, [userId]: password };
      saveUserPasswords(nextPasswords);
      return { userPasswords: nextPasswords };
    }),
  resetUserPassword: (userId) =>
    set((state) => {
      const nextPasswords = { ...state.userPasswords };
      delete nextPasswords[userId];
      saveUserPasswords(nextPasswords);
      return { userPasswords: nextPasswords };
    }),

  loggedInUser: loadLoggedInUser(),
  login: (user) => {
    saveLoggedInUserId(user);
    syncAuthCookies(user);
    set({ loggedInUser: user, selectedFarmerId: null });
  },
  logout: () => {
    saveLoggedInUserId(null);
    saveSelectedFarmerId(null);
    syncAuthCookies(null);
    set({ loggedInUser: null, selectedFarmerId: null });
  },
  resetRuntimeData: () => {
    const defaults = getDefaultRuntimeSnapshot();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(RUNTIME_STATE_STORAGE_KEY);
      window.localStorage.removeItem(USER_PASSWORDS_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_USER_ID_STORAGE_KEY);
      window.localStorage.removeItem(CURRENT_FARM_STORAGE_KEY);
      window.localStorage.removeItem(SELECTED_FARMER_STORAGE_KEY);
    }
    syncAuthCookies(null);
    const nextHistory: RuntimeDataOpHistoryItem[] = [
      {
        id: `op_${Date.now()}`,
        type: "RESET" as const,
        createdAt: new Date().toISOString(),
        success: true,
        summary: "Khôi phục dữ liệu runtime về mặc định",
      },
      ...useAppStore.getState().runtimeDataOpsHistory,
    ].slice(0, 30);
    saveRuntimeDataOpsHistory(nextHistory);
    set({
      farms: defaults.farms,
      cropTypes: defaults.cropTypes,
      plantTypeInfos: defaults.plantTypeInfos,
      gardens: defaults.gardens,
      devices: defaults.devices,
      sensorSummaries: defaults.sensorSummaries,
      temperatureChartData: defaults.temperatureChartData,
      humidityAirChartData: defaults.humidityAirChartData,
      humiditySoilChartData: defaults.humiditySoilChartData,
      lightChartData: defaults.lightChartData,
      alerts: defaults.alerts,
      alertRules: defaults.alertRules,
      schedules: defaults.schedules,
      logs: defaults.logs,
      backupRecords: defaults.backupRecords,
      aiAnalyses: defaults.aiAnalyses,
      users: defaults.users,
      userPasswords: {},
      loggedInUser: null,
      currentFarmId: defaults.farms[0]?.id ?? null,
      selectedFarmerId: null,
      runtimeDataOpsHistory: nextHistory,
    });
  },
  exportRuntimeDataJson: () => {
    const snapshot = toRuntimeSnapshot(useAppStore.getState());
    const envelope = createRuntimeSnapshotEnvelope(snapshot, APP_VERSION);
    const nextHistory: RuntimeDataOpHistoryItem[] = [
      {
        id: `op_${Date.now()}`,
        type: "EXPORT" as const,
        createdAt: new Date().toISOString(),
        success: true,
        summary: `Xuất dữ liệu (${snapshot.farms.length} farm, ${snapshot.gardens.length} vườn)`,
      },
      ...useAppStore.getState().runtimeDataOpsHistory,
    ].slice(0, 30);
    saveRuntimeDataOpsHistory(nextHistory);
    useAppStore.setState({ runtimeDataOpsHistory: nextHistory });
    return JSON.stringify(envelope, null, 2);
  },
  previewRuntimeDataJson: (json) => {
    try {
      const parsed = JSON.parse(json) as unknown;
      const candidate = parseRuntimeSnapshotPayload(parsed);
      if (!candidate) {
        return { ok: false, message: "Không đọc được cấu trúc dữ liệu import" };
      }
      const preview = buildRuntimeImportPreview(candidate);
      return { ok: true, message: "Preview dữ liệu thành công", preview };
    } catch {
      return { ok: false, message: "File JSON không hợp lệ" };
    }
  },
  importRuntimeDataJson: (json) => {
    try {
      const parsed = JSON.parse(json) as unknown;
      const defaults = getDefaultRuntimeSnapshot();
      const candidate = parseRuntimeSnapshotPayload(parsed);
      if (!candidate) {
        return { ok: false, message: "Không đọc được cấu trúc dữ liệu import" };
      }
      const migrated = migrateRuntimeSnapshot(candidate);
      const nextSnapshot = normalizeRuntimeSnapshot(migrated, defaults);
      const preview = buildRuntimeImportPreview(candidate);
      set((state) => {
        const nextCurrentFarmId = state.currentFarmId && nextSnapshot.farms.some((farm) => farm.id === state.currentFarmId)
          ? state.currentFarmId
          : nextSnapshot.farms[0]?.id ?? null;

        if (nextCurrentFarmId) {
          saveCurrentFarmId(nextCurrentFarmId);
        } else if (typeof window !== "undefined") {
          window.localStorage.removeItem(CURRENT_FARM_STORAGE_KEY);
        }

        const nextLoggedInUser = state.loggedInUser && nextSnapshot.users.some((user) => user.id === state.loggedInUser?.id)
          ? state.loggedInUser
          : null;

        if (!nextLoggedInUser) {
          saveLoggedInUserId(null);
          saveSelectedFarmerId(null);
          syncAuthCookies(null);
        }

        const nextHistory: RuntimeDataOpHistoryItem[] = [
          {
            id: `op_${Date.now()}`,
            type: "IMPORT" as const,
            createdAt: new Date().toISOString(),
            success: true,
            summary: `Import dữ liệu (${preview.counts.farms} farm, ${preview.counts.gardens} vườn, cảnh báo: ${preview.warnings.length})`,
          },
          ...state.runtimeDataOpsHistory,
        ].slice(0, 30);
        saveRuntimeDataOpsHistory(nextHistory);

        return {
          farms: nextSnapshot.farms,
          cropTypes: nextSnapshot.cropTypes,
          plantTypeInfos: nextSnapshot.plantTypeInfos,
          gardens: nextSnapshot.gardens,
          devices: nextSnapshot.devices,
          sensorSummaries: nextSnapshot.sensorSummaries,
          temperatureChartData: nextSnapshot.temperatureChartData,
          humidityAirChartData: nextSnapshot.humidityAirChartData,
          humiditySoilChartData: nextSnapshot.humiditySoilChartData,
          lightChartData: nextSnapshot.lightChartData,
          alerts: nextSnapshot.alerts,
          alertRules: nextSnapshot.alertRules,
          schedules: nextSnapshot.schedules,
          logs: nextSnapshot.logs,
          backupRecords: nextSnapshot.backupRecords,
          aiAnalyses: nextSnapshot.aiAnalyses,
          users: nextSnapshot.users,
          currentFarmId: nextCurrentFarmId,
          loggedInUser: nextLoggedInUser,
          selectedFarmerId: nextLoggedInUser?.role === "ADMIN" ? state.selectedFarmerId : null,
          runtimeDataOpsHistory: nextHistory,
        };
      });

      return { ok: true, message: "Import dữ liệu thành công" };
    } catch {
      const nextHistory: RuntimeDataOpHistoryItem[] = [
        {
          id: `op_${Date.now()}`,
          type: "IMPORT" as const,
          createdAt: new Date().toISOString(),
          success: false,
          summary: "Import dữ liệu thất bại (JSON không hợp lệ)",
        },
        ...useAppStore.getState().runtimeDataOpsHistory,
      ].slice(0, 30);
      saveRuntimeDataOpsHistory(nextHistory);
      useAppStore.setState({ runtimeDataOpsHistory: nextHistory });
      return { ok: false, message: "File JSON không hợp lệ" };
    }
  },
  runtimeDataOpsHistory: loadRuntimeDataOpsHistory(),
  clearRuntimeDataOpsHistory: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(RUNTIME_DATA_OPS_HISTORY_STORAGE_KEY);
    }
    set({ runtimeDataOpsHistory: [] });
  },
}));

const toRuntimeSnapshot = (state: AppState): RuntimeStateSnapshot => ({
  farms: state.farms,
  cropTypes: state.cropTypes,
  plantTypeInfos: state.plantTypeInfos,
  gardens: state.gardens,
  devices: state.devices,
  sensorSummaries: state.sensorSummaries,
  temperatureChartData: state.temperatureChartData,
  humidityAirChartData: state.humidityAirChartData,
  humiditySoilChartData: state.humiditySoilChartData,
  lightChartData: state.lightChartData,
  alerts: state.alerts,
  alertRules: state.alertRules,
  schedules: state.schedules,
  logs: state.logs,
  backupRecords: state.backupRecords,
  aiAnalyses: state.aiAnalyses,
  users: state.users,
});

if (typeof window !== "undefined") {
  useAppStore.subscribe((state) => {
    saveRuntimeSnapshot(toRuntimeSnapshot(state));
  });
}
