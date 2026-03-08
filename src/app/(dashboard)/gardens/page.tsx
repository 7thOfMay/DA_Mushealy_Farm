"use client";

import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { gardens, sensorSummaries } from "@/lib/mockData";
import { GardenStation } from "@/components/dashboard/GardenStation";
import { ArrowRight, MapPin } from "lucide-react";

export default function GardensPage() {
  return (
    <div>
      <Topbar title="Khu vườn" subtitle="Quản lý & giám sát 3 khu canh tác" />
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gardens.map((garden) => {
            const sensors = sensorSummaries.find((s) => s.gardenId === garden.id)!;
            return (
              <div key={garden.id} className="group">
                <GardenStation garden={garden} sensors={sensors} />
                <div className="mt-2 flex justify-end">
                  <Link
                    href={`/gardens/${garden.id}`}
                    className="flex items-center gap-1.5 text-[0.8125rem] text-[#1B4332] font-semibold hover:underline"
                  >
                    <MapPin size={13} /> Xem chi tiết <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
