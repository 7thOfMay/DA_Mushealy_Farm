"use client";

import { useEffect, useRef, useState } from "react";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { CatalogManager } from "@/frontend/components/management/CatalogManager";
import { DeleteGuard } from "@/frontend/components/management/DeleteGuard";
import { ErrorState } from "@/frontend/components/shared/ErrorStates";
import { useAppStore } from "@/frontend/context/store";
import { SETTINGS_KEY, defaultLocalSettings, type DashboardLanding, type LocalSettings } from "@/frontend/utils/localSettings";

export default function SettingsPage() {
  const farms = useAppStore((state) => state.farms);
  const currentFarmId = useAppStore((state) => state.currentFarmId);
  const setCurrentFarmId = useAppStore((state) => state.setCurrentFarmId);
  const addToast = useAppStore((state) => state.addToast);
  const resetRuntimeData = useAppStore((state) => state.resetRuntimeData);
  const exportRuntimeDataJson = useAppStore((state) => state.exportRuntimeDataJson);
  const previewRuntimeDataJson = useAppStore((state) => state.previewRuntimeDataJson);
  const importRuntimeDataJson = useAppStore((state) => state.importRuntimeDataJson);
  const runtimeDataOpsHistory = useAppStore((state) => state.runtimeDataOpsHistory);
  const clearRuntimeDataOpsHistory = useAppStore((state) => state.clearRuntimeDataOpsHistory);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [catalogItems, setCatalogItems] = useState([
    { id: "cat_1", name: "Rau ăn lá", description: "Nhóm cây chu kỳ ngắn", active: true },
    { id: "cat_2", name: "Cà chua", description: "Nhóm cây ăn quả", active: true },
    { id: "cat_3", name: "Nha đam", description: "Nhóm cây dược liệu", active: false },
  ]);

  const [settings, setSettings] = useState<LocalSettings>(defaultLocalSettings);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<LocalSettings>;
      setSettings({ ...defaultLocalSettings, ...parsed });
    } catch {
      setSettings(defaultLocalSettings);
    }
  }, []);

  const updateSettings = <K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    addToast({ type: "success", message: "Đã lưu cài đặt hệ thống" });
  };

  const handleResetRuntimeData = () => {
    const confirmed = window.confirm("Khôi phục toàn bộ dữ liệu runtime về seed mặc định? Hành động này sẽ đăng xuất phiên hiện tại.");
    if (!confirmed) return;
    resetRuntimeData();
    addToast({ type: "success", message: "Đã khôi phục dữ liệu hệ thống về mặc định" });
  };

  const handleExportRuntimeData = () => {
    const json = exportRuntimeDataJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    anchor.href = url;
    anchor.download = `nongtech-runtime-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    addToast({ type: "success", message: "Đã xuất dữ liệu runtime" });
  };

  const handlePickImportFile = () => {
    importInputRef.current?.click();
  };

  const handleImportRuntimeData: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const previewResult = previewRuntimeDataJson(text);
      if (!previewResult.ok || !previewResult.preview) {
        addToast({ type: "error", message: previewResult.message });
        return;
      }

      const { preview } = previewResult;
      const summary = `Farm:${preview.counts.farms} | Garden:${preview.counts.gardens} | Device:${preview.counts.devices} | Alert:${preview.counts.alerts} | User:${preview.counts.users}`;
      const warningText = preview.warnings.length ? `\n\nCảnh báo:\n- ${preview.warnings.join("\n- ")}` : "";
      const confirmed = window.confirm(`Preview import\nVersion: ${preview.version}\nApp: ${preview.appVersion}\nSchema: ${preview.schema}\n${summary}${warningText}\n\nTiếp tục import?`);
      if (!confirmed) return;

      const result = importRuntimeDataJson(text);
      addToast({ type: result.ok ? "success" : "error", message: result.message });
    } catch {
      addToast({ type: "error", message: "Không thể đọc file JSON" });
    } finally {
      event.target.value = "";
    }
  };

  const handleClearRuntimeHistory = () => {
    const confirmed = window.confirm("Xóa toàn bộ lịch sử thao tác dữ liệu runtime?");
    if (!confirmed) return;
    clearRuntimeDataOpsHistory();
    addToast({ type: "success", message: "Đã xóa lịch sử thao tác dữ liệu" });
  };

  return (
    <div>
      <Topbar title="Cài đặt" subtitle="Thông báo, tần suất đồng bộ và hành vi dashboard" />
      {farms.length === 0 ? (
        <div className="p-8">
          <ErrorState
            title="Chưa có nông trại"
            description="Tạo nông trại trước để cấu hình ngữ cảnh mặc định và các cài đặt liên quan."
          />
        </div>
      ) : (
        <div className="p-8 space-y-4 max-w-3xl">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-[#1A2E1F] text-[1rem]">Cài đặt vận hành</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Tự làm mới dữ liệu (giây)</label>
              <input
                type="number"
                className="input-field"
                min={10}
                max={300}
                value={settings.autoRefreshSec}
                onChange={(event) => updateSettings("autoRefreshSec", Number(event.target.value))}
              />
            </div>

            <div>
              <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Trang mặc định sau đăng nhập</label>
              <select
                className="input-field"
                value={settings.dashboardLanding}
                onChange={(event) => updateSettings("dashboardLanding", event.target.value as DashboardLanding)}
              >
                <option value="farms">Danh sách nông trại</option>
                <option value="alerts">Cảnh báo</option>
                <option value="logs">Nhật ký hệ thống</option>
              </select>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8E4] p-4 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[0.875rem] text-[#1A2E1F]">Bật thông báo cảnh báo mức cao</span>
              <input
                type="checkbox"
                checked={settings.notifyHighAlerts}
                onChange={(event) => updateSettings("notifyHighAlerts", event.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[0.875rem] text-[#1A2E1F]">Âm báo khi có cảnh báo mới</span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(event) => updateSettings("soundEnabled", event.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[0.875rem] text-[#1A2E1F]">Chế độ giao diện gọn (compact)</span>
              <input
                type="checkbox"
                checked={settings.compactMode}
                onChange={(event) => updateSettings("compactMode", event.target.checked)}
              />
            </label>
          </div>
        </div>

        <div className="card p-6 space-y-3">
          <h2 className="font-semibold text-[#1A2E1F] text-[1rem]">Ngữ cảnh nông trại mặc định</h2>
          <p className="text-[0.8125rem] text-[#5C7A6A]">Chọn farm làm ngữ cảnh mặc định cho các trang tổng quan và thao tác nhanh.</p>

          <select
            className="input-field max-w-[360px]"
            value={currentFarmId ?? ""}
            onChange={(event) => setCurrentFarmId(event.target.value)}
          >
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>{farm.name}</option>
            ))}
          </select>

          <div className="pt-2">
            <button onClick={saveSettings} className="btn-primary">Lưu cài đặt</button>
          </div>
        </div>

        <div className="card p-6 space-y-3">
          <h2 className="font-semibold text-[#1A2E1F] text-[1rem]">Quản lý dữ liệu runtime</h2>
          <p className="text-[0.8125rem] text-[#5C7A6A]">
            Dữ liệu vận hành được tải từ cơ sở dữ liệu MySQL. Có thể xuất/nhập dữ liệu runtime dưới dạng JSON.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportRuntimeData}
              className="btn-secondary"
            >
              Xuất dữ liệu JSON
            </button>
            <button
              onClick={handlePickImportFile}
              className="btn-secondary"
            >
              Nhập dữ liệu JSON
            </button>
            <button
              onClick={handleResetRuntimeData}
              className="btn-secondary border-[#C0392B] text-[#C0392B] hover:bg-[#FEE2E2]"
            >
              Khôi phục dữ liệu mặc định
            </button>
            <DeleteGuard
              title="Xóa lịch sử thao tác runtime"
              description="Hành động này sẽ xóa toàn bộ nhật ký import/export/reset trong cài đặt."
              confirmToken="CLEAR"
              confirmLabel="Xóa lịch sử"
              onConfirm={handleClearRuntimeHistory}
            />
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportRuntimeData}
          />

          <div className="pt-2 border-t border-[#E2E8E4]">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A]">Lịch sử thao tác</p>
              {runtimeDataOpsHistory.length > 0 && (
                <button onClick={handleClearRuntimeHistory} className="text-[0.75rem] text-[#C0392B] hover:underline">
                  Xóa lịch sử
                </button>
              )}
            </div>
            {runtimeDataOpsHistory.length === 0 ? (
              <p className="text-[0.8125rem] text-[#5C7A6A]">Chưa có thao tác nào.</p>
            ) : (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {runtimeDataOpsHistory.map((entry) => (
                  <div key={entry.id} className="rounded-[10px] border border-[#E2E8E4] bg-[#F7F8F6] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[0.75rem] font-semibold text-[#1A2E1F]">
                        {entry.type} · {entry.success ? "SUCCESS" : "FAILED"}
                      </p>
                      <p className="text-[0.6875rem] text-[#5C7A6A]">{new Date(entry.createdAt).toLocaleString("vi-VN")}</p>
                    </div>
                    <p className="text-[0.75rem] text-[#5C7A6A] mt-0.5">{entry.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <CatalogManager
          title="Danh mục cây trồng"
          items={catalogItems}
          onCreate={(name) => {
            const next = { id: `cat_${Date.now()}`, name, description: "Tạo từ Settings", active: true };
            setCatalogItems((prev) => [next, ...prev]);
            addToast({ type: "success", message: `Đã thêm danh mục ${name}` });
          }}
          onToggle={(id) => {
            setCatalogItems((prev) => prev.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
          }}
        />
        </div>
      )}
    </div>
  );
}
