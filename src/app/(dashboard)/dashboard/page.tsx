"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { useAppStore } from "@/frontend/context/store";
import { getVisibleFarmsForViewer } from "@/frontend/utils/dataScope";
import { getDashboardLandingPath } from "@/frontend/utils/localSettings";

export default function DashboardPage() {
  const router = useRouter();
  const farms = useAppStore((state) => state.farms);
  const users = useAppStore((state) => state.users);
  const loggedInUser = useAppStore((state) => state.loggedInUser);
  const selectedFarmerId = useAppStore((state) => state.selectedFarmerId);
  const currentFarmId = useAppStore((state) => state.currentFarmId);
  const setCurrentFarmId = useAppStore((state) => state.setCurrentFarmId);

  const visibleFarms = getVisibleFarmsForViewer({ farms, users, loggedInUser, selectedFarmerId });

  useEffect(() => {
    const landingPath = getDashboardLandingPath();
    if (landingPath !== "/farms") {
      router.replace(landingPath);
      return;
    }

    const fallbackFarmId = currentFarmId ?? visibleFarms[0]?.id ?? null;
    if (!fallbackFarmId) {
      router.replace("/farms");
      return;
    }
    if (!currentFarmId) setCurrentFarmId(fallbackFarmId);
    router.replace(`/farms/${fallbackFarmId}`);
  }, [currentFarmId, visibleFarms, router, setCurrentFarmId]);

  if (!visibleFarms.length) {
    return (
      <div>
        <Topbar title="Tổng quan" subtitle="Chưa có nông trại để hiển thị" />
        <div className="p-8">
          <div className="card p-6">
            <p className="text-[0.875rem] text-[#5C7A6A]">Tạo nông trại đầu tiên để bắt đầu theo dõi dữ liệu dashboard.</p>
            <Link href="/farms/new" className="btn-primary mt-4 inline-flex">Tạo nông trại mới</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Tổng quan" subtitle="Đang chuyển đến dashboard theo nông trại" />
      <div className="p-8">
        <div className="card p-6">
          <p className="text-[0.875rem] text-[#5C7A6A]">Nếu chưa tự chuyển, bấm nút bên dưới.</p>
          <Link href={`/farms/${currentFarmId ?? visibleFarms[0].id}`} className="btn-primary mt-4 inline-flex">Mở dashboard theo farm</Link>
        </div>
      </div>
    </div>
  );
}
