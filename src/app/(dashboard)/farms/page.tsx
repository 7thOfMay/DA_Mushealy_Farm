"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { useAppStore } from "@/frontend/context/store";
import { Badge, EmptyState } from "@/frontend/components/shared/index";
import { getVisibleFarmsForViewer } from "@/frontend/utils/dataScope";
import { cn, timeAgo } from "@/frontend/utils/utils";
import { MapPin, MoreHorizontal, Sprout } from "lucide-react";

type FarmFilter = "all" | "active" | "paused";

export default function FarmsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FarmFilter>("all");
  const loggedInUser = useAppStore((state) => state.loggedInUser);
  const users = useAppStore((state) => state.users);
  const selectedFarmerId = useAppStore((state) => state.selectedFarmerId);
  const farms = useAppStore((state) => state.farms);
  const gardens = useAppStore((state) => state.gardens);
  const devices = useAppStore((state) => state.devices);
  const alerts = useAppStore((state) => state.alerts);
  const plantTypeInfos = useAppStore((state) => state.plantTypeInfos);
  const role = loggedInUser?.role ?? "ADMIN";
  const setCurrentFarmId = useAppStore((state) => state.setCurrentFarmId);

  const visibleFarms = useMemo(
    () => getVisibleFarmsForViewer({ farms, users, loggedInUser, selectedFarmerId }),
    [farms, users, loggedInUser, selectedFarmerId]
  );

  const filteredFarms = visibleFarms.filter((farm) => {
    if (filter === "all") return true;
    if (filter === "active") return farm.status === "active";
    return farm.status === "paused";
  });

  return (
    <div>
      <Topbar title="Danh sách Nông trại" subtitle={`${filteredFarms.length} nông trại hiển thị`} />
      <div className="p-8 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: "all", label: "Tất cả" },
              { id: "active", label: "Đang hoạt động" },
              { id: "paused", label: "Tạm dừng" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id as FarmFilter)}
                className={cn(
                  "px-3 py-1.5 rounded-[20px] text-[0.8125rem] font-medium border transition-colors",
                  filter === item.id
                    ? "bg-[#1B4332] text-white border-[#1B4332]"
                    : "bg-white text-[#5C7A6A] border-[#E2E8E4] hover:border-[#1B4332] hover:text-[#1B4332]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Link href="/farms/new" className="btn-primary">+ Thêm nông trại</Link>
        </div>

        {filteredFarms.length === 0 && (
          <EmptyState
            icon={Sprout}
            title="Chưa có nông trại nào"
            description={role === "ADMIN"
              ? "Hãy chọn nông dân ở sidebar hoặc thêm nông trại mới cho nông dân đang quản lý."
              : "Bạn chưa có nông trại nào. Hãy thêm nông trại để bắt đầu quản lý hệ thống 2 cấp Farm/Garden."}
            action={{ label: "Thêm nông trại", onClick: () => router.push("/farms/new") }}
          />
        )}

        {filteredFarms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredFarms.map((farm) => {
              const farmGardens = gardens.filter((garden) => garden.farmId === farm.id);
              const farmGardenIds = new Set(farmGardens.map((garden) => garden.id));
              const farmDevices = devices.filter((device) => farmGardenIds.has(device.gardenId));
              const farmAlerts = alerts.filter((alert) => farmGardenIds.has(alert.gardenId));
              const cropTags = Array.from(new Set(farmGardens.map((garden) => garden.cropTypeId)));
              const statusColor = farmAlerts.some((alert) => alert.status === "DETECTED")
                ? "#C0392B"
                : farm.status === "warning"
                  ? "#E67E22"
                  : "#27AE60";
              return (
                <div key={farm.id} className="card p-0 overflow-hidden border-l-4" style={{ borderLeftColor: statusColor }}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-[1.125rem] text-[#1A2E1F] leading-tight">{farm.name}</h3>
                        <div className="mt-1 flex items-center gap-2 text-[0.75rem] text-[#5C7A6A]">
                          <MapPin size={12} />
                          <span>{farm.location}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                        <button className="text-[#5C7A6A] hover:text-[#1B4332]">
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="text-[0.8125rem] text-[#5C7A6A] mb-3">
                      {farmGardens.length} khu vườn · {farmDevices.length} thiết bị · {farmAlerts.filter((a) => a.status !== "RESOLVED").length} cảnh báo
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {cropTags.map((cropTag) => {
                        const crop = plantTypeInfos.find((item) => item.id === (farmGardens.find((g) => g.cropTypeId === cropTag)?.plantType));
                        return <Badge key={cropTag} variant="default">{crop?.label ?? "Khác"}</Badge>;
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[0.6875rem] text-[#5C7A6A]">Cập nhật {timeAgo(farm.createdAt)}</p>
                      <Link
                        href={`/farms/${farm.id}`}
                        onClick={() => setCurrentFarmId(farm.id)}
                        className="btn-primary"
                      >
                        Xem chi tiết
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
