"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { useAppStore } from "@/frontend/context/store";

export default function LegacyGardenRoutePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const gardens = useAppStore((state) => state.gardens);
  const setCurrentFarmId = useAppStore((state) => state.setCurrentFarmId);

  const garden = gardens.find((item) => item.id === id);

  useEffect(() => {
    if (!garden?.farmId) return;
    setCurrentFarmId(garden.farmId);
    router.replace(`/farms/${garden.farmId}/gardens/${garden.id}`);
  }, [garden, router, setCurrentFarmId]);

  if (!garden) {
    return (
      <div>
        <Topbar title="Khu vườn" subtitle="Không tìm thấy khu vườn" />
        <div className="p-8">
          <div className="card p-6">
            <p className="text-[0.875rem] text-[#5C7A6A]">Khu vườn bạn truy cập không tồn tại hoặc đã bị xóa.</p>
            <Link href="/farms" className="btn-primary mt-4 inline-flex">Quay lại danh sách nông trại</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!garden.farmId) {
    return (
      <div>
        <Topbar title={garden.name} subtitle="Garden không gắn farm" />
        <div className="p-8">
          <div className="card p-6">
            <p className="text-[0.875rem] text-[#5C7A6A]">Garden này chưa được ánh xạ vào nông trại, hãy cập nhật dữ liệu và thử lại.</p>
            <Link href="/farms" className="btn-primary mt-4 inline-flex">Quay lại danh sách nông trại</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Đang chuyển hướng" subtitle={`Đưa bạn tới ${garden.name} theo kiến trúc farm-scoped`} />
      <div className="p-8">
        <div className="card p-6">
          <p className="text-[0.875rem] text-[#5C7A6A]">Nếu chưa tự chuyển, bấm nút bên dưới.</p>
          <Link href={`/farms/${garden.farmId}/gardens/${garden.id}`} className="btn-primary mt-4 inline-flex">Mở chi tiết khu vườn</Link>
        </div>
      </div>
    </div>
  );
}
