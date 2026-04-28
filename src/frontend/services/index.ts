import { useAppStore } from "@/frontend/context/store";
import { cropTypeSeeds, getCropTypeSeedById, type CropType } from "@/frontend/utils/cropThresholds";
import type { Garden, GardenSensorSummary } from "@/types";

export function getCropTypes(): CropType[] {
  return cropTypeSeeds;
}

export function getCropTypeById(cropTypeId?: string): CropType | null {
  return getCropTypeSeedById(cropTypeId);
}

export function getGardenSensorSummary(garden: Garden): GardenSensorSummary | null {
  const sensorSummaries = useAppStore.getState().sensorSummaries;
  return sensorSummaries.find((summary) => summary.gardenId === garden.id) ?? null;
}
