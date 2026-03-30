// ========================
// Garden / Plant Types
// ========================
export type PlantType = "CAI_XANH" | "CA_CHUA" | "NHA_DAM";

export interface CropType {
  id: string;
  name: string;
  thresholdsJson: {
    temperature: { min: number; max: number };
    humidityAir: { min: number; max: number };
    humiditySoil: { min: number; max: number };
    light: { min: number; max: number };
  };
  wateringScheduleJson: {
    morning: string;
    afternoon: string;
  };
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  ownerId: string;
  createdAt: string;
  status: "active" | "paused" | "warning";
  description?: string;
}

export interface PlantTypeInfo {
  id: PlantType;
  label: string;
  emoji: string;
  description: string;
  cycleDays: string;
  optimalTemp: { min: number; max: number };
  optimalAirHumidity: { min: number; max: number };
  optimalSoilMoisture: { min: number; max: number };
  optimalLight: { min: number; max: number }; // klux
}

export interface ZoneThresholds {
  gardenId: string;
  temperature: { min: number; max: number };
  humidityAir: { min: number; max: number };
  humiditySoil: { min: number; max: number };
  light: { min: number; max: number }; // lux
}

export interface Garden {
  id: string;
  farmId?: string;
  cropTypeId?: string;
  name: string;
  plantType: PlantType;
  plantLabel: string;
  color: string; // accent color for this garden
  status: "OK" | "WARN" | "ALERT";
  description?: string;
  area?: string;
  areaM2?: number;
  createdAt: string;
}

// ========================
// Sensor Types
// ========================
export type SensorType = "temperature" | "humidity_air" | "humidity_soil" | "light";

export interface SensorReading {
  id: string;
  deviceId: string;
  gardenId: string;
  type: SensorType;
  value: number;
  unit: string;
  timestamp: string;
}

export interface SensorThreshold {
  type: SensorType;
  min: number;
  max: number;
  unit: string;
  label: string;
}

export interface GardenSensorSummary {
  gardenId: string;
  temperature: number;
  humidityAir: number;
  humiditySoil: number;
  light: number;
  updatedAt: string;
}

// ========================
// Device Types
// ========================
export type DeviceType = "pump" | "led_rgb" | "sensor_temp" | "sensor_humidity_air" | "sensor_humidity_soil" | "sensor_light";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  gardenId: string;
  gardenName: string;
  hardwareId?: string;
  status: "online" | "offline" | "error";
  isOn: boolean;
  lastUpdated: string;
  lastValue?: number;
  lastUnit?: string;
  lastSeenAt?: string;
  locationNote?: string;
  description?: string;
}

// ========================
// Schedule Types
// ========================
export type RepeatType = "once" | "daily" | "weekly";
export type ScheduleAction = "ON" | "OFF";
export type ScheduleType = "MANUAL" | "TIME_BASED" | "THRESHOLD_BASED";

export interface ThresholdCondition {
  sensorType: SensorType;
  operator: "<" | ">" | "<=" | ">=" | "==";
  value: number;
  unit: string;
}

export interface ThresholdConfig {
  logic: "AND" | "OR";
  conditions: ThresholdCondition[];
  action: ScheduleAction;
  durationMin: number;
  cooldownMin: number;
}

export interface TimeConfig {
  days: number[];
  startTime: string;
  durationMin: number;
  action: ScheduleAction;
}

export interface Schedule {
  id: string;
  deviceId: string;
  deviceName: string;
  gardenId: string;
  gardenName: string;
  scheduleType?: ScheduleType;
  name?: string;
  action: ScheduleAction;
  startTime: string; // HH:MM
  endTime?: string;
  date: string; // YYYY-MM-DD
  repeat: RepeatType;
  isActive: boolean;
  timeConfig?: TimeConfig;
  thresholdConfig?: ThresholdConfig;
}

// ========================
// Alert Types
// ========================
export type AlertSeverity = "high" | "medium" | "low";
export type AlertStatus = "DETECTED" | "PROCESSING" | "RESOLVED";

export interface Alert {
  id: string;
  farmId?: string;
  farmName?: string;
  gardenId: string;
  gardenName: string;
  deviceId?: string;
  deviceName?: string;
  sensorType?: SensorType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  value?: number;
  threshold?: number;
  detectedAt: string;
  processingAt?: string;
  resolvedAt?: string;
  processedBy?: string;
  snapshot?: Partial<Record<SensorType, number>>;
  autoActionMessage?: string;
}

export interface AlertRule {
  id: string;
  farmId: string;
  gardenId?: string;
  cropTypeId: string;
  name: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  logic: "AND" | "OR";
  conditions: ThresholdCondition[];
  autoAction?: {
    deviceId: string;
    action: ScheduleAction;
    durationMin: number;
  };
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

// ========================
// User / Auth Types
// ========================
export type UserRole = "ADMIN" | "FARMER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  assignedGardens: string[];
  assignedFarmIds?: string[];
  managedFarmerIds?: string[];
  status: "active" | "inactive";
  avatar?: string;
  createdAt: string;
}

// ========================
// Log Types
// ========================
export type LogActionType = "DEVICE_TOGGLE" | "CONFIG_CHANGE" | "ALERT_ACTION" | "USER_LOGIN" | "USER_LOGOUT" | "DEVICE_ADD" | "DEVICE_REMOVE" | "SCHEDULE_CREATE";

export interface SystemLog {
  id: string;
  actionType: LogActionType;
  description: string;
  userId: string;
  userName: string;
  gardenId?: string;
  gardenName?: string;
  deviceId?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

// ========================
// Chart Data
// ========================
export interface ChartDataPoint {
  time: string;
  garden1?: number;
  garden2?: number;
  garden3?: number;
}

// ========================
// Backup
// ========================
export type BackupType = "manual" | "auto";
export type BackupStatus = "success" | "failed" | "in_progress";

export interface BackupRecord {
  id: string;
  type: BackupType;
  status: BackupStatus;
  createdAt: string;
  fileSize: string;
  fileName: string;
  createdBy: string;
  note?: string;
}

// ========================
// AI Module
// ========================
export interface AIAnalysis {
  id: string;
  imageUrl: string;
  gardenId: string;
  gardenName: string;
  result: string;
  confidence: number;
  recommendation: string;
  timestamp: string;
}
