"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { useAppStore } from "@/frontend/context/store";
import { FormErrorBanner, InlineFieldError } from "@/frontend/components/shared";
import { apiCreateGarden } from "@/frontend/services/client";
import type { PlantType } from "@/types";

const colorMap: Record<PlantType, string> = {
  CAI_XANH: "#1B4332",
  CA_CHUA: "#E67E22",
  NHA_DAM: "#2980B9",
};

export default function NewGardenPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const router = useRouter();
  const farms = useAppStore((state) => state.farms);
  const cropTypes = useAppStore((state) => state.cropTypes);
  const plantTypeInfos = useAppStore((state) => state.plantTypeInfos);
  const addGarden = useAppStore((state) => state.addGarden);
  const addToast = useAppStore((state) => state.addToast);
  const addLog = useAppStore((state) => state.addLog);
  const loggedInUser = useAppStore((state) => state.loggedInUser);

  const farm = farms.find((item) => item.id === farmId);
  const [name, setName] = useState("");
  const [plantType, setPlantType] = useState<PlantType>("CAI_XANH");
  const [cropTypeId, setCropTypeId] = useState(cropTypes[0]?.id ?? "");
  const [areaM2, setAreaM2] = useState(250);
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const plantInfo = useMemo(() => plantTypeInfos.find((item) => item.id === plantType), [plantType, plantTypeInfos]);

  if (!farm) {
    return <div><Topbar title="Tạo khu vườn" subtitle="Không tìm thấy nông trại" /></div>;
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

    const gardenName = name.trim();
    const plantTypeMap: Record<string, number> = { CAI_XANH: 1, CA_CHUA: 2, NHA_DAM: 3 };

    setSubmitting(true);
    let serverId: string | undefined;
    try {
      const result = await apiCreateGarden(farmId, gardenName, plantTypeMap[plantType] ?? null, areaM2, description.trim() || null);
      serverId = result?.gardenId;
    } catch { /* fallback to local */ }
    setSubmitting(false);

    const id = serverId || `g${Date.now()}`;
    addGarden({
      id,
      farmId,
      cropTypeId,
      name: gardenName,
      plantType,
      plantLabel: plantInfo?.label ?? "Chưa xác định",
      color: colorMap[plantType],
      status: "OK",
      description: description.trim() || undefined,
      area: `${areaM2}m²`,
      areaM2,
      createdAt: new Date().toISOString(),
    });

    addLog({
      id: `log_${Date.now()}`,
      actionType: "CONFIG_CHANGE",
      description: `Tạo khu vườn mới: ${gardenName}`,
      userId: loggedInUser?.id ?? "u1",
      userName: loggedInUser?.name ?? "System Admin",
      gardenId: id,
      gardenName,
      timestamp: new Date().toISOString(),
    });

    addToast({ type: "success", message: `Đã tạo khu vườn ${gardenName}` });
    router.push(`/farms/${farmId}/gardens/${id}`);
  };

  return (
    <div>
      <Topbar title="Tạo khu vườn" subtitle={`${farm.name} · Thêm khu vườn mới`} />
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
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Mô tả</label>
            <textarea className="input-field min-h-[110px] resize-none" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => router.back()}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={!name.trim() || submitting}>{submitting ? "Đang lưu..." : "Lưu khu vườn"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
