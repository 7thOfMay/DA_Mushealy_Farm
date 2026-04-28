/**
 * Hook to hydrate the Zustand store from the MySQL API.
 * All data comes from the database — no mock/demo fallback.
 * After initial hydration, polls devices + sensors every POLL_INTERVAL ms.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/frontend/context/store";
import {
  apiGetFarms,
  apiGetGardens,
  apiGetDevices,
  apiGetSensorSummaries,
  apiGetSensorChartData,
  apiGetAlerts,
  apiGetAlertRules,
  apiGetSchedules,
  apiGetLogs,
  apiGetBackups,
  apiGetAIAnalyses,
  apiGetUsers,
  apiHealthCheck,
} from "@/frontend/services/client";

const POLL_INTERVAL = 3_000; // 3 seconds for live data
const CHART_POLL_INTERVAL = 30_000; // 30 seconds for chart data
const TOGGLE_LOCK_MS = 12_000; // keep optimistic state for 12s after toggle

/** Device IDs recently toggled — poll will not overwrite their status/isOn */
const _deviceToggleLocks = new Map<string, number>();

/** Call this right after a device toggle to protect its optimistic state from the next poll. */
export function lockDeviceToggle(deviceId: string) {
  _deviceToggleLocks.set(deviceId, Date.now());
}

export function useApiHydration() {
  const hydrated = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chartPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshLiveData = useCallback(async () => {
    const [devices, sensorSummaries, alerts] = await Promise.all([
      apiGetDevices(),
      apiGetSensorSummaries(),
      apiGetAlerts(),
    ]);
    const patch: Record<string, unknown> = {};
    if (devices) {
      // Merge: preserve optimistic isOn/status for recently-toggled devices
      const now = Date.now();
      const currentDevices = useAppStore.getState().devices;
      const merged = devices.map((fresh) => {
        const lockedAt = _deviceToggleLocks.get(fresh.id);
        if (lockedAt && now - lockedAt < TOGGLE_LOCK_MS) {
          // Keep local isOn + status, take everything else from server
          const local = currentDevices.find((d) => d.id === fresh.id);
          if (local) {
            // If server already agrees, release lock early
            if (fresh.isOn === local.isOn) {
              _deviceToggleLocks.delete(fresh.id);
              return fresh;
            }
            return { ...fresh, isOn: local.isOn, status: local.status };
          }
        } else if (lockedAt) {
          _deviceToggleLocks.delete(fresh.id);
        }
        return fresh;
      });
      patch.devices = merged;
    }
    if (sensorSummaries) patch.sensorSummaries = sensorSummaries;
    if (alerts) patch.alerts = alerts;

  }, []);

  const refreshChartData = useCallback(async () => {
    const gardens = useAppStore.getState().gardens;
    const currentFarmId = useAppStore.getState().currentFarmId;
    const farmGardenIds = gardens
      .filter((g) => !currentFarmId || g.farmId === currentFarmId)
      .slice(0, 3)
      .map((g) => g.id);
    if (farmGardenIds.length > 0) {
      const chartData = await apiGetSensorChartData(farmGardenIds);
      if (chartData) {
        useAppStore.setState({
          temperatureChartData: chartData.temperatureChartData,
          humidityAirChartData: chartData.humidityAirChartData,
          humiditySoilChartData: chartData.humiditySoilChartData,
          lightChartData: chartData.lightChartData,
        });
      }
    }
  }, []);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    (async () => {
      const isApiAvailable = await apiHealthCheck();
      if (!isApiAvailable) {
        console.error("[useApiHydration] Database API unavailable. Configure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env.local");
        setStatus("error");
        return;
      }

      // Fetch all data in parallel
      const [
        farms,
        gardens,
        devices,
        sensorSummaries,
        alerts,
        alertRules,
        schedules,
        logs,
        backupRecords,
        aiAnalyses,
        users,
      ] = await Promise.all([
        apiGetFarms(),
        apiGetGardens(),
        apiGetDevices(),
        apiGetSensorSummaries(),
        apiGetAlerts(),
        apiGetAlertRules(),
        apiGetSchedules(),
        apiGetLogs(),
        apiGetBackups(),
        apiGetAIAnalyses(),
        apiGetUsers(),
      ]);

      const patch: Record<string, unknown> = {};
      if (farms) patch.farms = farms;
      if (gardens) patch.gardens = gardens;
      if (devices) patch.devices = devices;
      if (sensorSummaries) patch.sensorSummaries = sensorSummaries;
      if (alerts) patch.alerts = alerts;
      if (alertRules) patch.alertRules = alertRules;
      if (schedules) patch.schedules = schedules;
      if (logs) patch.logs = logs;
      if (backupRecords) patch.backupRecords = backupRecords;
      if (aiAnalyses) patch.aiAnalyses = aiAnalyses;
      if (users) patch.users = users;

      if (Object.keys(patch).length > 0) {
        useAppStore.setState(patch);

        if (farms && farms.length > 0) {
          const currentFarmId = useAppStore.getState().currentFarmId;
          if (!currentFarmId || !farms.some((f) => f.id === currentFarmId)) {
            useAppStore.getState().setCurrentFarmId(farms[0].id);
          }
        }

        // Fetch chart data after gardens are loaded
        if (gardens && gardens.length > 0) {
          const cFarmId = useAppStore.getState().currentFarmId;
          const farmGardenIds = gardens
            .filter((g) => !cFarmId || g.farmId === cFarmId)
            .slice(0, 3)
            .map((g) => g.id);
          if (farmGardenIds.length > 0) {
            const chartData = await apiGetSensorChartData(farmGardenIds);
            if (chartData) {
              useAppStore.setState({
                temperatureChartData: chartData.temperatureChartData,
                humidityAirChartData: chartData.humidityAirChartData,
                humiditySoilChartData: chartData.humiditySoilChartData,
                lightChartData: chartData.lightChartData,
              });
            }
          }
        }
      }

      setStatus("ready");

      // Start polling for live data (fast) and chart data (slow)
      pollRef.current = setInterval(refreshLiveData, POLL_INTERVAL);
      chartPollRef.current = setInterval(refreshChartData, CHART_POLL_INTERVAL);
    })();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (chartPollRef.current) clearInterval(chartPollRef.current);
    };
  }, [refreshLiveData, refreshChartData]);

  return status;
}
