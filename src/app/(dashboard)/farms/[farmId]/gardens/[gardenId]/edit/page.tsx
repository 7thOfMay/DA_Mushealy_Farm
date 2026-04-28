"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { useAppStore } from "@/frontend/context/store";
import { FormErrorBanner, InlineFieldError } from "@/frontend/components/shared";
import { apiUpdateGarden } from "@/frontend/services/client";
import type { PlantType } from "@/types";

const colorMap: Record<PlantType, string> = {
  CAI_XANH: "#1B4332",
  CA_CHUA: "#E67E22",
  NHA_DAM: "#2980B9",
};

export default function EditGardenPage() {
  const { farmId, gardenId } = useParams<{ farmId: string; gardenId: string }>();
  const router = useRouter();
  const gardens = useAppStore((state) => state.gardens);
  const cropTypes = useAppStore((state) => state.cropTypes);
  const plantTypeInfos = useAppStore((state) => state.plantTypeInfos);
  const updateGarden = useAppStore((state) => state.updateGarden);
  const addToast = useAppStore((state) => state.addToast);
  const addLog = useAppStore((state) => state.addLog);
  const loggedInUser = useAppStore((state) => state.loggedInUser);

  const garden = useMemo(() => gardens.find((item) => item.id === gardenId && item.farmId === farmId), [gardens, gardenId, farmId]);

  const [name, setName] = useState(garden?.name ?? "");
  const [plantType, setPlantType] = useState<PlantType>(garden?.plantType ?? "CAI_XANH");
  const [cropTypeId, setCropTypeId] = useState(garden?.cropTypeId ?? cropTypes[0]?.id ?? "");
  const [areaM2, setAreaM2] = useState(garden?.areaM2 ?? 250);
  const [description, setDescription] = useState(garden?.description ?? "");
  const [status, setStatus] = useState<"OK" | "WARN" | "ALERT">(garden?.status ?? "OK");
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const plantInfo = useMemo(() => plantTypeInfos.find((item) => item.id === plantType), [plantType, plantTypeInfos]);

  if (!garden) {
    return <div><Topbar title="Sửa khu vườn" subtitle="Không tìm thấy khu vườn" /></div>;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextNameError = name.trim() ? null : "Tên khu vườn là bắt buộc.";
    const nextAreaError = areaM2 > 0 ? null : "Diện tích phải lớn hơn 0.";
    setNameError(nextNameError);
    setAreaError(nextAreaError);

    if (nextNameError || nextAreaError) {
      setFormError("Vui lòng kiểm tra lại thông tin khu vườn trước khi lưu.");
      return;
    }

    const nextName = name.trim();
    const plantTypeMap: Record<string, number> = { CAI_XANH: 1, CA_CHUA: 2, NHA_DAM: 3 };
    const statusMap: Record<string, string> = { OK: "active", WARN: "warning", ALERT: "alert" };

    setSubmitting(true);
    try {
      await apiUpdateGarden(garden.id, nextName, plantTypeMap[plantType] ?? null, areaM2, description.trim() || null, statusMap[status]);
    } catch { /* fallback to local */ }
    setSubmitting(false);

    updateGarden(garden.id, {
      name: nextName,
      plantType,
      plantLabel: plantInfo?.label ?? garden.plantLabel,
      color: colorMap[plantType],
      cropTypeId,
      areaM2,
      area: `${areaM2}m²`,
      description: description.trim() || undefined,
      status,
    });

    addLog({
      id: `log_${Date.now()}`,
      actionType: "CONFIG_CHANGE",
      description: `Cập nhật khu vườn: ${nextName}`,
      userId: loggedInUser?.id ?? "u1",
      userName: loggedInUser?.name ?? "System Admin",
      gardenId: garden.id,
      gardenName: nextName,
      oldValue: garden.name,
      newValue: nextName,
      timestamp: new Date().toISOString(),
    });

    addToast({ type: "success", message: `Đã cập nhật ${nextName}` });
    router.push(`/farms/${farmId}/gardens/${garden.id}`);
  };

  return (
    <div>
      <Topbar title="Sửa khu vườn" subtitle={`Cập nhật thông tin ${garden.name}`} />
      <div className="p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <FormErrorBanner message={formError} />
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Tên khu vườn*</label>
            <input
              className={`input-field ${nameError ? "border-[#C0392B]" : ""}`}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(null);
                setFormError(null);
              }}
              required
            />
            <InlineFieldError message={nameError} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Loại cây</label>
              <select className="input-field" value={plantType} onChange={(event) => setPlantType(event.target.value as PlantType)}>
                {plantTypeInfos.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Crop profile</label>
              <select className="input-field" value={cropTypeId} onChange={(event) => setCropTypeId(event.target.value)}>
                {cropTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Diện tích (m²)</label>
              <input
                type="number"
                className={`input-field ${areaError ? "border-[#C0392B]" : ""}`}
                value={areaM2}
                onChange={(event) => {
                  setAreaM2(Number(event.target.value));
                  setAreaError(null);
                  setFormError(null);
                }}
                min={1}
              />
              <InlineFieldError message={areaError} />
            </div>
            <div>
              <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Trạng thái</label>
              <select className="input-field" value={status} onChange={(event) => setStatus(event.target.value as "OK" | "WARN" | "ALERT")}>
                <option value="OK">Bình thường</option>
                <option value="WARN">Cảnh báo</option>
                <option value="ALERT">Nguy hiểm</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Mô tả</label>
            <textarea className="input-field min-h-[110px] resize-none" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => router.back()}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={!name.trim() || submitting}>{submitting ? "Đang lưu..." : "Lưu thay đổi"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
