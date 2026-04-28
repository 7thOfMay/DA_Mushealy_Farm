"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/frontend/context/store";
import LogsPage from "@/app/(dashboard)/logs/page";

export default function FarmLogsRedirectPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const setCurrentFarmId = useAppStore((state) => state.setCurrentFarmId);

  useEffect(() => {
    setCurrentFarmId(farmId);
  }, [farmId, setCurrentFarmId]);

  return <LogsPage />;
}
