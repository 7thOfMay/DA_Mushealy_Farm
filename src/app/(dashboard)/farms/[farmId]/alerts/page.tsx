"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/frontend/context/store";
import AlertsPage from "@/app/(dashboard)/alerts/page";

export default function FarmAlertsRedirectPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const setCurrentFarmId = useAppStore((state) => state.setCurrentFarmId);

  useEffect(() => {
    setCurrentFarmId(farmId);
  }, [farmId, setCurrentFarmId]);

  return <AlertsPage />;
}
