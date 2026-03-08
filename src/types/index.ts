// ========================
// Garden / Plant Types
// ========================
export type PlantType = "CAI_XANH" | "CA_CHUA" | "NHA_DAM";

export interface Garden {
  id: string;
  name: string;
  plantType: PlantType;
  plantLabel: string;
  color: string; // accent color for this garden
  status: "OK" | "WARN" | "ALERT";
  description?: string;
  area?: string;
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
  status: "online" | "offline" | "error";
  isOn: boolean;
  lastUpdated: string;
  description?: string;
}

// ========================
// Schedule Types
// ========================
export type RepeatType = "once" | "daily" | "weekly";
export type ScheduleAction = "ON" | "OFF";

export interface Schedule {
  id: string;
  deviceId: string;
  deviceName: string;
  gardenId: string;
  gardenName: string;
  action: ScheduleAction;
  startTime: string; // HH:MM
  endTime?: string;
  date: string; // YYYY-MM-DD
  repeat: RepeatType;
  isActive: boolean;
}

// ========================
// Alert Types
// ========================
export type AlertSeverity = "high" | "medium" | "low";
export type AlertStatus = "DETECTED" | "PROCESSING" | "RESOLVED";

export interface Alert {
  id: string;
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
