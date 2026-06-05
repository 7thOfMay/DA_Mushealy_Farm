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
    [farms, users, loggedInUser, selectedFarmerId],
  );

  const filteredFarms = visibleFarms.filter((farm) => {
    if (filter === "all") return true;
    if (filter === "active") return farm.status === "active";
    return farm.status === "paused";
  });

  return (
    <div>
      <Topbar
        title="Danh sách nông trại"
        subtitle={`${filteredFarms.length} nông trại hiển thị`}
        titleVariant="section"
      />
      <div className="space-y-5 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Tất cả" },
              { id: "active", label: "Đang hoạt động" },
              { id: "paused", label: "Tạm dừng" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id as FarmFilter)}
                className={cn(
                  "rounded-[20px] border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                  filter === item.id
                    ? "border-[#1B4332] bg-[#1B4332] text-white"
                    : "border-[#E2E8E4] bg-white text-[#5C7A6A] hover:border-[#1B4332] hover:text-[#1B4332]",
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                <div key={farm.id} className="card overflow-hidden border-l-4 p-0" style={{ borderLeftColor: statusColor }}>
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[1.125rem] font-bold leading-tight text-[#1A2E1F]">{farm.name}</h3>
                        <div className="mt-1 flex items-center gap-2 text-[0.75rem] text-[#5C7A6A]">
                          <MapPin size={12} />
                          <span>{farm.location}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
                        <button className="text-[#5C7A6A] hover:text-[#1B4332]">
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mb-3 text-[0.8125rem] text-[#5C7A6A]">
                      {farmGardens.length} khu vườn · {farmDevices.length} thiết bị · {farmAlerts.filter((alert) => alert.status !== "RESOLVED").length} cảnh báo
                    </div>

                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {cropTags.map((cropTag) => {
                        const crop = plantTypeInfos.find((item) => item.id === (farmGardens.find((garden) => garden.cropTypeId === cropTag)?.plantType));
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
