"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { useAppStore } from "@/lib/store";
import { FormErrorBanner, InlineFieldError } from "@/components/shared";
import { apiUpdateFarm } from "@/lib/api/client";

export default function EditFarmPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const router = useRouter();
  const farms = useAppStore((state) => state.farms);
  const updateFarm = useAppStore((state) => state.updateFarm);
  const addToast = useAppStore((state) => state.addToast);

  const farm = useMemo(() => farms.find((item) => item.id === farmId), [farms, farmId]);

  const [name, setName] = useState(farm?.name ?? "");
  const [location, setLocation] = useState(farm?.location ?? "");
  const [description, setDescription] = useState(farm?.description ?? "");
  const [status, setStatus] = useState<"active" | "paused" | "warning">(farm?.status ?? "active");
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!farm) {
    return (
      <div>
        <Topbar title="Sửa nông trại" subtitle="Không tìm thấy nông trại" />
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Tên nông trại là bắt buộc.");
      setFormError("Vui lòng nhập tên nông trại trước khi lưu.");
      return;
    }

    setSubmitting(true);
    try {
      await apiUpdateFarm(farm.id, name.trim(), location.trim() || "Chưa cập nhật", status);
    } catch { /* fallback to local */ }
    setSubmitting(false);

    updateFarm(farm.id, {
      name: name.trim(),
      location: location.trim() || "Chưa cập nhật",
      description: description.trim() || undefined,
      status,
    });

    addToast({ type: "success", message: `Đã cập nhật ${name.trim()}` });
    router.push(`/farms/${farm.id}`);
  };

  return (
    <div>
      <Topbar title="Sửa nông trại" subtitle={`Cập nhật thông tin ${farm.name}`} />
      <div className="p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <FormErrorBanner message={formError} />
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Tên nông trại*</label>
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
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Địa điểm</label>
            <input className="input-field" value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Trạng thái</label>
            <select className="input-field" value={status} onChange={(event) => setStatus(event.target.value as "active" | "paused" | "warning") }>
              <option value="active">Đang hoạt động</option>
              <option value="warning">Cần chú ý</option>
              <option value="paused">Tạm dừng</option>
            </select>
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
