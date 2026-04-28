import type { User, CropType, PlantTypeInfo, Farm, Garden, Device, Alert, AlertRule, Schedule, SystemLog, BackupRecord, AIAnalysis, GardenSensorSummary, ChartDataPoint } from "@/types";

/**
 * Seed data — all runtime data (farms, devices, alerts, users, etc.)
 * comes exclusively from the MySQL database via the API hydration hook.
 * Empty arrays serve as initial store state before hydration completes.
 */

export const seedCropTypes: CropType[] = [];
export const seedPlantTypeInfos: PlantTypeInfo[] = [];
export const seedDevices: Device[] = [];
export const seedAlerts: Alert[] = [];
export const seedFarms: Farm[] = [];
export const seedGardens: Garden[] = [];
export const seedSystemLogs: SystemLog[] = [];
export const seedAlertRules: AlertRule[] = [];
export const seedSchedules: Schedule[] = [];
export const seedUsers: User[] = [];
export const seedAiAnalyses: AIAnalysis[] = [];
export const seedBackupRecords: BackupRecord[] = [];
export const seedSensorSummaries: GardenSensorSummary[] = [];
export const seedTemperatureChartData: ChartDataPoint[] = [];
export const seedHumidityAirChartData: ChartDataPoint[] = [];
export const seedHumiditySoilChartData: ChartDataPoint[] = [];
export const seedLightChartData: ChartDataPoint[] = [];

