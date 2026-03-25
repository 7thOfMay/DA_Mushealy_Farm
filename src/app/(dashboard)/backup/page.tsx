"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Badge } from "@/components/shared/index";
import { useAppStore } from "@/lib/store";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { apiCreateBackup, apiUpdateBackup } from "@/lib/api/client";
import type { BackupRecord } from "@/types";
import { DatabaseBackup, Download, HardDrive, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";

const BACKUP_PAYLOADS_STORAGE_KEY = "nongtech-backup-payloads-v1";

function loadBackupPayloads(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BACKUP_PAYLOADS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveBackupPayloads(payloads: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BACKUP_PAYLOADS_STORAGE_KEY, JSON.stringify(payloads));
}

const statusVariant: Record<BackupRecord["status"], "ok" | "warn" | "danger" | "info"> = {
  success: "ok",
  failed: "danger",
  in_progress: "info",
};

const statusLabel: Record<BackupRecord["status"], string> = {
  success: "Thành công",
  failed: "Thất bại",
  in_progress: "Đang chạy",
};

const typeLabel: Record<BackupRecord["type"], string> = {
  manual: "Thủ công",
  auto: "Tự động",
};

export default function BackupPage() {
  const addToast = useAppStore((state) => state.addToast);
  const records = useAppStore((state) => state.backupRecords);
  const addBackupRecord = useAppStore((state) => state.addBackupRecord);
  const updateBackupRecord = useAppStore((state) => state.updateBackupRecord);
  const addLog = useAppStore((state) => state.addLog);
  const exportRuntimeDataJson = useAppStore((state) => state.exportRuntimeDataJson);
  const previewRuntimeDataJson = useAppStore((state) => state.previewRuntimeDataJson);
  const importRuntimeDataJson = useAppStore((state) => state.importRuntimeDataJson);
  const loggedInUser = useAppStore((state) => state.loggedInUser);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backupPayloads, setBackupPayloads] = useState<Record<string, string>>({});

  useEffect(() => {
    setBackupPayloads(loadBackupPayloads());
  }, []);

  const totalStorage = records
    .map((record) => Number.parseFloat(record.fileSize))
    .filter((size) => Number.isFinite(size))
    .reduce((sum, size) => sum + size, 0)
    .toFixed(1);

  const lastBackup = records[0];
  const failedCount = records.filter((record) => record.status === "failed").length;

  const handleManualBackup = () => {
    if (isRunningBackup) return;

    setIsRunningBackup(true);
    setProgress(12);

    const checkpoints = [28, 46, 72, 100];
    checkpoints.forEach((value, index) => {
      window.setTimeout(() => {
        setProgress(value);
      }, (index + 1) * 500);
    });

    window.setTimeout(() => {
      const createdAt = new Date().toISOString();
      const payload = exportRuntimeDataJson();
      const sizeInMb = (new Blob([payload], { type: "application/json" }).size / (1024 * 1024)).toFixed(1);
      const backupId = `bk${Date.now()}`;
      const newRecord: BackupRecord = {
        id: backupId,
        type: "manual",
        status: "success",
        createdAt,
        fileSize: `${sizeInMb} MB`,
        fileName: `backup_${createdAt.slice(0, 10).replaceAll("-", "")}_${createdAt.slice(11, 16).replace(":", "")}.runtime.json`,
        createdBy: loggedInUser?.name ?? "System Admin",
        note: "Backup runtime dữ liệu từ giao diện quản trị",
      };

      const nextPayloads = { ...loadBackupPayloads(), [backupId]: payload };
      saveBackupPayloads(nextPayloads);
      setBackupPayloads(nextPayloads);

      addBackupRecord(newRecord);
      apiCreateBackup("manual", newRecord.fileName ?? "backup.json", null).catch(() => {});
      addLog({
        id: `log_${Date.now()}`,
        actionType: "CONFIG_CHANGE",
        description: `Tạo bản sao lưu thủ công ${newRecord.id.toUpperCase()}`,
        userId: loggedInUser?.id ?? "u1",
        userName: loggedInUser?.name ?? "System Admin",
        timestamp: new Date().toISOString(),
      });
      setIsRunningBackup(false);
      setProgress(0);
      addToast({ type: "success", message: "Đã tạo bản sao lưu runtime mới" });
    }, 2500);
  };

  const handleRetryBackup = (record: BackupRecord) => {
    updateBackupRecord(record.id, {
      status: "in_progress",
      note: "Dang retry backup...",
    });
    apiUpdateBackup(record.id, "in_progress").catch(() => {});

    window.setTimeout(() => {
      updateBackupRecord(record.id, {
        status: "success",
        fileSize: record.fileSize === "0 MB" ? "11.2 MB" : record.fileSize,
        note: `Retry thành công lúc ${formatDateTime(new Date().toISOString())}`,
      });
      addLog({
        id: `log_${Date.now()}`,
        actionType: "CONFIG_CHANGE",
        description: `Retry backup ${record.id.toUpperCase()} thành công`,
        userId: loggedInUser?.id ?? "u1",
        userName: loggedInUser?.name ?? "System Admin",
        timestamp: new Date().toISOString(),
      });
      addToast({ type: "success", message: `Đã retry thành công ${record.id.toUpperCase()}` });
    }, 1200);
  };

  const handleRestoreBackup = (record: BackupRecord) => {
    const payload = backupPayloads[record.id];
    if (!payload) {
      addToast({ type: "warning", message: `Không tìm thấy payload cho ${record.id.toUpperCase()} trong trình duyệt hiện tại` });
      return;
    }

    const preview = previewRuntimeDataJson(payload);
    if (!preview.ok || !preview.preview) {
      addToast({ type: "error", message: "Payload backup không hợp lệ, không thể khôi phục" });
      updateBackupRecord(record.id, {
        status: "failed",
        note: "Khôi phục thất bại: payload không hợp lệ",
      });
      return;
    }

    const confirmRestore = window.confirm(
      `Khôi phục backup ${record.id.toUpperCase()}?\n\n` +
      `Version: ${preview.preview.version}\n` +
      `Farm: ${preview.preview.counts.farms} · Garden: ${preview.preview.counts.gardens} · Device: ${preview.preview.counts.devices}`
    );
    if (!confirmRestore) return;

    updateBackupRecord(record.id, {
      status: "in_progress",
      note: "Đang khôi phục dữ liệu runtime...",
    });
    addToast({ type: "warning", message: `Đang khôi phục từ ${record.id.toUpperCase()}` });

    window.setTimeout(() => {
      const restored = importRuntimeDataJson(payload);
      updateBackupRecord(record.id, {
        status: restored.ok ? "success" : "failed",
        note: restored.ok
          ? `Đã khôi phục bởi ${loggedInUser?.name ?? "System Admin"}`
          : `Khôi phục thất bại: ${restored.message}`,
      });
      addLog({
        id: `log_${Date.now()}`,
        actionType: "CONFIG_CHANGE",
        description: `${restored.ok ? "Khôi phục" : "Khôi phục thất bại"} backup ${record.id.toUpperCase()}`,
        userId: loggedInUser?.id ?? "u1",
        userName: loggedInUser?.name ?? "System Admin",
        timestamp: new Date().toISOString(),
      });
      addToast({
        type: restored.ok ? "success" : "error",
        message: restored.ok
          ? `Khôi phục ${record.id.toUpperCase()} thành công`
          : `Khôi phục ${record.id.toUpperCase()} thất bại`,
      });
    }, 1800);
  };

  const handleDownloadBackup = (record: BackupRecord) => {
    const payload = backupPayloads[record.id];
    if (!payload) {
      addToast({ type: "warning", message: `Backup ${record.id.toUpperCase()} không có payload local để tải xuống` });
      return;
    }

    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = record.fileName.endsWith(".json") ? record.fileName : `${record.fileName}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast({ type: "info", message: `Đã tải xuống ${record.fileName}` });
  };

  return (
    <div>
      <Topbar title="Sao lưu hệ thống" subtitle="Theo dõi bản sao lưu, dung lượng và thao tác khôi phục" />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: "Tổng bản sao lưu",
              value: `${records.length}`,
              note: `${records.filter((record) => record.status === "success").length} bản thành công`,
              icon: DatabaseBackup,
            },
            {
              label: "Lần sao lưu gần nhất",
              value: lastBackup ? timeAgo(lastBackup.createdAt) : "Chưa có",
              note: lastBackup ? formatDateTime(lastBackup.createdAt) : "Không có dữ liệu",
              icon: RefreshCw,
            },
            {
              label: "Dung lượng lưu trữ",
              value: `${totalStorage} MB`,
              note: "Tổng dung lượng file backup khả dụng",
              icon: HardDrive,
            },
            {
              label: "Bản lỗi cần kiểm tra",
              value: `${failedCount}`,
              note: failedCount > 0 ? "Nên rà soát lịch tự động và kết nối lưu trữ" : "Không có lỗi gần đây",
              icon: TriangleAlert,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="card p-5">
                <div className="w-10 h-10 rounded-[10px] bg-[#F0FAF3] flex items-center justify-center mb-4">
                  <Icon size={20} className="text-[#1B4332]" />
                </div>
                <p className="text-[0.75rem] uppercase tracking-wide font-semibold text-[#5C7A6A] mb-1">{item.label}</p>
                <p className="text-[1.75rem] leading-none font-bold text-[#1A2E1F] mb-2">{item.value}</p>
                <p className="text-[0.8125rem] text-[#5C7A6A]">{item.note}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold text-[1rem] text-[#1A2E1F]">Sao lưu thủ công</h2>
                <p className="text-[0.8125rem] text-[#5C7A6A] mt-1">Tạo nhanh một bản snapshot dữ liệu hiện tại.</p>
              </div>
              <Badge variant="info">Admin</Badge>
            </div>

            <button onClick={handleManualBackup} disabled={isRunningBackup} className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed">
              <DatabaseBackup size={16} />
              {isRunningBackup ? "Đang sao lưu..." : "Tạo bản sao lưu mới"}
            </button>

            <div className="mt-4 rounded-[12px] bg-[#F7F8F6] p-4">
              <div className="flex items-center justify-between text-[0.8125rem] text-[#5C7A6A] mb-2">
                <span>Tiến độ</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#E2E8E4] overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-300", isRunningBackup ? "bg-[#1B4332]" : "bg-[#52B788]")}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[0.75rem] text-[#5C7A6A] mt-3">
                Backup thủ công đang lưu payload runtime cục bộ trên trình duyệt để tải xuống và khôi phục ngay.
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8E4] flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-semibold text-[1rem] text-[#1A2E1F]">Lịch sử sao lưu</h2>
                <p className="text-[0.8125rem] text-[#5C7A6A] mt-1">Danh sách file backup gần nhất và trạng thái hoàn tất.</p>
              </div>
              <Badge variant="default">{records.length} bản ghi</Badge>
            </div>

            <table className="w-full">
              <thead className="bg-[#F7F8F6] border-b border-[#E2E8E4]">
                <tr>
                  {[
                    "Mã",
                    "Loại",
                    "Trạng thái",
                    "Thời gian",
                    "Dung lượng",
                    "Tệp sao lưu",
                    "Người tạo",
                    "Thao tác",
                  ].map((header) => (
                    <th key={header} className="text-left px-4 py-3 text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4]">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-[#F7F8F6] transition-colors">
                    <td className="px-4 py-3 text-[0.75rem] font-mono text-[#5C7A6A]">{record.id.toUpperCase()}</td>
                    <td className="px-4 py-3"><Badge variant="default">{typeLabel[record.type]}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={statusVariant[record.status]}>{statusLabel[record.status]}</Badge></td>
                    <td className="px-4 py-3 text-[0.8125rem] text-[#5C7A6A] whitespace-nowrap">{formatDateTime(record.createdAt)}</td>
                    <td className="px-4 py-3 text-[0.8125rem] text-[#1A2E1F] whitespace-nowrap">{record.fileSize}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-[0.8125rem] font-medium text-[#1A2E1F]">{record.fileName}</p>
                        {record.note && <p className="text-[0.75rem] text-[#5C7A6A] mt-0.5">{record.note}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-[#5C7A6A] whitespace-nowrap">{record.createdBy}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadBackup(record)}
                          className="px-2.5 py-2 rounded-[8px] border border-[#E2E8E4] text-[#1B4332] hover:bg-[#F0FAF3] transition-colors"
                          disabled={record.status !== "success"}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleRestoreBackup(record)}
                          className="px-2.5 py-2 rounded-[8px] border border-[#E2E8E4] text-[#1B4332] hover:bg-[#F0FAF3] transition-colors"
                          disabled={record.status !== "success"}
                        >
                          <RotateCcw size={14} />
                        </button>
                        {record.status === "failed" && (
                          <button
                            onClick={() => handleRetryBackup(record)}
                            className="px-2.5 py-2 rounded-[8px] border border-[#E2E8E4] text-[#C0392B] hover:bg-[#FDF0EE] transition-colors"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}