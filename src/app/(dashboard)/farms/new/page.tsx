"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { useAppStore } from "@/frontend/context/store";
import { apiCreateFarm } from "@/frontend/services/client";
import { FormErrorBanner, InlineFieldError } from "@/frontend/components/shared";

export default function NewFarmPage() {
  const router = useRouter();
  const setCurrentFarmId = useAppStore((state) => state.setCurrentFarmId);
  const addFarm = useAppStore((state) => state.addFarm);
  const loggedInUser = useAppStore((state) => state.loggedInUser);
  const addToast = useAppStore((state) => state.addToast);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Tên nông trại là bắt buộc.");
      setFormError("Vui lòng nhập tên nông trại trước khi lưu.");
      return;
    }

    setSubmitting(true);
    try {
      const ownerUserId = loggedInUser?.id ? Number(loggedInUser.id.replace(/\D/g, "")) : undefined;
      const result = await apiCreateFarm(name.trim(), location.trim() || "Chưa cập nhật", ownerUserId);

      if (result?.ok && result.farmId) {
        addFarm({
          id: result.farmId,
          name: name.trim(),
          location: location.trim() || "Chưa cập nhật",
          ownerId: loggedInUser?.id ?? "u1",
          createdAt: new Date().toISOString(),
          status: "active",
          description: description.trim() || undefined,
        });
        addToast({ type: "success", message: `Đã tạo nông trại ${name.trim()}` });
        setCurrentFarmId(result.farmId);
        router.push(`/farms/${result.farmId}`);
      } else {
        setFormError("Không thể tạo nông trại. Vui lòng thử lại.");
      }
    } catch {
      setFormError("Lỗi kết nối server. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Topbar title="Tạo nông trại mới" subtitle="Thêm nông trại và cấu hình thông tin ban đầu" />
      <div className="p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <FormErrorBanner message={formError} />
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Tên nông trại*</label>
            <input
              className={`input-field ${nameError ? "border-[#C0392B]" : ""}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
                setFormError(null);
              }}
              required
            />
            <InlineFieldError message={nameError} />
          </div>
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Địa điểm</label>
            <input className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Mô tả</label>
            <textarea className="input-field min-h-[110px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => router.back()}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={!name.trim() || submitting}>{submitting ? "Đang lưu..." : "Lưu nông trại"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
