"use client";

import { useMemo } from "react";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { Badge } from "@/frontend/components/shared/index";
import { useAppStore } from "@/frontend/context/store";
import type { BackupRecord, Schedule } from "@/types";
import { Beaker, Bug, CalendarClock, DatabaseBackup, FileText } from "lucide-react";

export default function QALabPage() {
  const farms = useAppStore((state) => state.farms);
  const currentFarmId = useAppStore((state) => state.currentFarmId);
  const gardens = useAppStore((state) => state.gardens);
  const devices = useAppStore((state) => state.devices);
  const alerts = useAppStore((state) => state.alerts);
  const schedules = useAppStore((state) => state.schedules);
  const logs = useAppStore((state) => state.logs);
  const addSchedule = useAppStore((state) => state.addSchedule);
  const addBackupRecord = useAppStore((state) => state.addBackupRecord);
  const addLog = useAppStore((state) => state.addLog);
  const addToast = useAppStore((state) => state.addToast);
  const loggedInUser = useAppStore((state) => state.loggedInUser);

  const activeFarm = farms.find((farm) => farm.id === currentFarmId) ?? farms[0] ?? null;

  const farmGardens = useMemo(
    () => gardens.filter((garden) => garden.farmId === activeFarm?.id),
    [gardens, activeFarm?.id]
  );

  const canCreateSchedule = useMemo(() => {
    for (const garden of farmGardens) {
      const actuator = devices.find((device) => device.gardenId === garden.id && (device.type === "pump" || device.type === "led_rgb"));
      if (actuator) return true;
    }
    return false;
  }, [farmGardens, devices]);

  const createSyntheticSchedule = () => {
    const garden = farmGardens[0];
    if (!garden) {
      addToast({ type: "warning", message: "Khong tim thay khu vuon de tao schedule test" });
      return;
    }

    const actuator = devices.find((device) => device.gardenId === garden.id && (device.type === "pump" || device.type === "led_rgb"));
    if (!actuator) {
      addToast({ type: "warning", message: "Khong tim thay thiet bi bom/den de tao schedule test" });
      return;
    }

    const now = new Date();
    const startTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const endAt = new Date(now.getTime() + 20 * 60 * 1000);
    const endTime = `${endAt.getHours().toString().padStart(2, "0")}:${endAt.getMinutes().toString().padStart(2, "0")}`;

    const schedule: Schedule = {
      id: `qa_s${Date.now()}`,
      name: "QA synthetic schedule",
      scheduleType: "TIME_BASED",
      deviceId: actuator.id,
      deviceName: actuator.name,
      gardenId: garden.id,
      gardenName: garden.name,
      action: "ON",
      startTime,
      endTime,
      date: new Date().toISOString().slice(0, 10),
      repeat: "once",
      isActive: true,
      timeConfig: {
        days: [now.getDay()],
        startTime,
        durationMin: 20,
        action: "ON",
      },
    };

    addSchedule(schedule);
    addLog({
      id: `log_${Date.now()}`,
      actionType: "CONFIG_CHANGE",
      description: `QA tao schedule ${schedule.id}`,
      userId: loggedInUser?.id ?? "u1",
      userName: loggedInUser?.name ?? "System Admin",
      timestamp: new Date().toISOString(),
    });
    addToast({ type: "success", message: "Da tao schedule test" });
  };

  const createSyntheticBackupFailure = () => {
    const createdAt = new Date().toISOString();
    const backup: BackupRecord = {
      id: `qa_bk${Date.now()}`,
      type: "manual",
      status: "failed",
      createdAt,
      fileSize: "0 MB",
      fileName: `qa_backup_${createdAt.slice(0, 10).replaceAll("-", "")}_${createdAt.slice(11, 16).replace(":", "")}.sql.gz`,
      createdBy: loggedInUser?.name ?? "System Admin",
      note: "Ban ghi test QA - mo phong loi",
    };

    addBackupRecord(backup);
    addLog({
      id: `log_${Date.now()}`,
      actionType: "CONFIG_CHANGE",
      description: `QA tao backup loi ${backup.id}`,
      userId: loggedInUser?.id ?? "u1",
      userName: loggedInUser?.name ?? "System Admin",
      timestamp: new Date().toISOString(),
    });
    addToast({ type: "warning", message: "Da tao backup loi de test" });
  };

  const writeSyntheticLog = () => {
    addLog({
      id: `log_${Date.now()}`,
      actionType: "CONFIG_CHANGE",
      description: "QA synthetic log event",
      userId: loggedInUser?.id ?? "u1",
      userName: loggedInUser?.name ?? "System Admin",
      timestamp: new Date().toISOString(),
    });
    addToast({ type: "info", message: "Da ghi log test" });
  };

  return (
    <div>
      <Topbar title="QA Lab" subtitle="Tap hop thao tac test nhanh cho ban demo" />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard label="Nong trai" value={String(farms.length)} icon={Beaker} note={activeFarm ? `Dang chon: ${activeFarm.name}` : "Chua chon nong trai"} />
          <MetricCard label="Khu vuon" value={String(farmGardens.length)} icon={Bug} note="Theo nong trai dang active" />
          <MetricCard label="Canh bao" value={String(alerts.length)} icon={CalendarClock} note="Tong su kien canh bao" />
          <MetricCard label="Logs" value={String(logs.length)} icon={FileText} note="Tong system logs" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-[1rem] text-[#1A2E1F]">Scenario: Schedule</h3>
              <Badge variant="ok">Ready</Badge>
            </div>
            <p className="text-[0.8125rem] text-[#5C7A6A]">Tao schedule test de kiem tra list, toggle, delete va log.</p>
            <button className="btn-primary w-full justify-center" onClick={createSyntheticSchedule} disabled={!canCreateSchedule}>
              <CalendarClock size={15} />
              Tao schedule test
            </button>
            {!canCreateSchedule && <p className="text-[0.75rem] text-[#C0392B]">Can it nhat 1 khu vuon co bom/den de tao schedule.</p>}
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-[1rem] text-[#1A2E1F]">Scenario: Backup Failure</h3>
              <Badge variant="warn">Chaos</Badge>
            </div>
            <p className="text-[0.8125rem] text-[#5C7A6A]">Tao backup that bai de test retry flow va thong ke backup.</p>
            <button className="btn-secondary w-full justify-center text-[#C0392B] border-[#EBC0BA] hover:bg-[#FDF0EE]" onClick={createSyntheticBackupFailure}>
              <DatabaseBackup size={15} />
              Tao backup loi
            </button>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-[1rem] text-[#1A2E1F]">Scenario: Log</h3>
              <Badge variant="info">Observe</Badge>
            </div>
            <p className="text-[0.8125rem] text-[#5C7A6A]">Ghi nhanh log test de doi chieu bo loc va timeline.</p>
            <button className="btn-secondary w-full justify-center" onClick={writeSyntheticLog}>
              <FileText size={15} />
              Ghi log test
            </button>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[1rem] text-[#1A2E1F]">State Snapshot</h3>
          <p className="text-[0.8125rem] text-[#5C7A6A] mt-1">Gia tri nay cap nhat real-time theo store de support smoke test nhanh.</p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <SnapshotCell label="Schedules" value={String(schedules.length)} />
            <SnapshotCell label="Backups" value={String(useAppStore.getState().backupRecords.length)} />
            <SnapshotCell label="Alerts" value={String(alerts.length)} />
            <SnapshotCell label="Logs" value={String(logs.length)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, note }: { label: string; value: string; icon: typeof Beaker; note: string }) {
  return (
    <div className="card p-5">
      <div className="w-10 h-10 rounded-[10px] bg-[#F0FAF3] flex items-center justify-center mb-3">
        <Icon size={19} className="text-[#1B4332]" />
      </div>
      <p className="text-[0.75rem] uppercase tracking-wide font-semibold text-[#5C7A6A] mb-1">{label}</p>
      <p className="text-[1.75rem] leading-none font-bold text-[#1A2E1F] mb-2">{value}</p>
      <p className="text-[0.8125rem] text-[#5C7A6A]">{note}</p>
    </div>
  );
}

function SnapshotCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[#E2E8E4] px-3 py-2 bg-[#F7F8F6]">
      <p className="text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold">{label}</p>
      <p className="text-[1.125rem] font-bold text-[#1A2E1F] mt-1">{value}</p>
    </div>
  );
}
