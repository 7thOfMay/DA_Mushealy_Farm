/**
 * Hook to hydrate the Zustand store from the MySQL API.
 * All data comes from the database — no mock/demo fallback.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  apiGetFarms,
  apiGetGardens,
  apiGetDevices,
  apiGetSensorSummaries,
  apiGetAlerts,
  apiGetAlertRules,
  apiGetSchedules,
  apiGetLogs,
  apiGetBackups,
  apiGetAIAnalyses,
  apiGetUsers,
  apiHealthCheck,
} from "@/lib/api/client";

export function useApiHydration() {
  const hydrated = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

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
      }

      setStatus("ready");
    })();
  }, []);

  return status;
}
