import type {
  Garden,
  Device,
  Alert,
  Schedule,
  User,
  SystemLog,
  GardenSensorSummary,
  ChartDataPoint,
  AIAnalysis,
} from "@/types";

// ========================
// GARDENS
// ========================
export const gardens: Garden[] = [
  {
    id: "g1",
    name: "Vườn Cải Xanh",
    plantType: "CAI_XANH",
    plantLabel: "Cải Xanh",
    color: "#1B4332",
    status: "OK",
    description: "Khu canh tác rau cải xanh hữu cơ",
    area: "500m²",
    createdAt: "2025-11-01T08:00:00.000Z",
  },
  {
    id: "g2",
    name: "Vườn Cà Chua",
    plantType: "CA_CHUA",
    plantLabel: "Cà Chua",
    color: "#E67E22",
    status: "WARN",
    description: "Khu canh tác cà chua ghép",
    area: "750m²",
    createdAt: "2025-11-01T08:00:00.000Z",
  },
  {
    id: "g3",
    name: "Vườn Nha Đam",
    plantType: "NHA_DAM",
    plantLabel: "Nha Đam",
    color: "#2980B9",
    status: "OK",
    description: "Khu canh tác nha đam xuất khẩu",
    area: "300m²",
    createdAt: "2025-11-15T08:00:00.000Z",
  },
];

// ========================
// SENSOR SUMMARIES
// ========================
export const sensorSummaries: GardenSensorSummary[] = [
  {
    gardenId: "g1",
    temperature: 26.4,
    humidityAir: 68,
    humiditySoil: 74,
    light: 12400,
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    gardenId: "g2",
    temperature: 32.1,
    humidityAir: 55,
    humiditySoil: 41,
    light: 18700,
    updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
  {
    gardenId: "g3",
    temperature: 28.8,
    humidityAir: 72,
    humiditySoil: 82,
    light: 9200,
    updatedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
  },
];

// ========================
// DEVICES
// ========================
export const devices: Device[] = [
  { id: "d1", name: "Máy bơm Vườn 1", type: "pump", gardenId: "g1", gardenName: "Vườn Cải Xanh", status: "online", isOn: true, lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: "d2", name: "Đèn LED Vườn 1", type: "led_rgb", gardenId: "g1", gardenName: "Vườn Cải Xanh", status: "online", isOn: true, lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
  { id: "d3", name: "Cảm biến Nhiệt độ V1", type: "sensor_temp", gardenId: "g1", gardenName: "Vườn Cải Xanh", status: "online", isOn: true, lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: "d4", name: "Cảm biến Độ ẩm đất V1", type: "sensor_humidity_soil", gardenId: "g1", gardenName: "Vườn Cải Xanh", status: "online", isOn: true, lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: "d5", name: "Máy bơm Vườn 2", type: "pump", gardenId: "g2", gardenName: "Vườn Cà Chua", status: "online", isOn: true, lastUpdated: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
  { id: "d6", name: "Đèn LED Vườn 2", type: "led_rgb", gardenId: "g2", gardenName: "Vườn Cà Chua", status: "error", isOn: false, lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
  { id: "d7", name: "Cảm biến Nhiệt độ V2", type: "sensor_temp", gardenId: "g2", gardenName: "Vườn Cà Chua", status: "online", isOn: true, lastUpdated: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
  { id: "d8", name: "Cảm biến Ánh sáng V2", type: "sensor_light", gardenId: "g2", gardenName: "Vườn Cà Chua", status: "online", isOn: true, lastUpdated: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
  { id: "d9", name: "Máy bơm Vườn 3", type: "pump", gardenId: "g3", gardenName: "Vườn Nha Đam", status: "online", isOn: false, lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: "d10", name: "Đèn LED Vườn 3", type: "led_rgb", gardenId: "g3", gardenName: "Vườn Nha Đam", status: "online", isOn: true, lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
  { id: "d11", name: "Cảm biến Độ ẩm KK V3", type: "sensor_humidity_air", gardenId: "g3", gardenName: "Vườn Nha Đam", status: "online", isOn: true, lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: "d12", name: "Cảm biến Ánh sáng V1", type: "sensor_light", gardenId: "g1", gardenName: "Vườn Cải Xanh", status: "online", isOn: true, lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: "d13", name: "Cảm biến Độ ẩm KK V2", type: "sensor_humidity_air", gardenId: "g2", gardenName: "Vườn Cà Chua", status: "offline", isOn: false, lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "d14", name: "Cảm biến Nhiệt độ V3", type: "sensor_temp", gardenId: "g3", gardenName: "Vườn Nha Đam", status: "online", isOn: true, lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
];

// ========================
// ALERTS
// ========================
export const alerts: Alert[] = [
  {
    id: "a1",
    gardenId: "g2",
    gardenName: "Vườn Cà Chua",
    sensorType: "temperature",
    severity: "high",
    status: "DETECTED",
    message: "Nhiệt độ vượt ngưỡng tối đa",
    value: 32.1,
    threshold: 30,
    detectedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: "a2",
    gardenId: "g2",
    gardenName: "Vườn Cà Chua",
    sensorType: "humidity_soil",
    severity: "medium",
    status: "PROCESSING",
    message: "Độ ẩm đất dưới ngưỡng tối thiểu",
    value: 41,
    threshold: 50,
    detectedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    processingAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    processedBy: "Nguyễn Văn A",
  },
  {
    id: "a3",
    gardenId: "g2",
    gardenName: "Vườn Cà Chua",
    deviceId: "d6",
    deviceName: "Đèn LED Vườn 2",
    severity: "medium",
    status: "DETECTED",
    message: "Thiết bị mất kết nối",
    detectedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "a4",
    gardenId: "g1",
    gardenName: "Vườn Cải Xanh",
    sensorType: "humidity_air",
    severity: "low",
    status: "RESOLVED",
    message: "Độ ẩm không khí cao bất thường",
    value: 91,
    threshold: 85,
    detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    processingAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    processedBy: "Trần Thị B",
  },
  {
    id: "a5",
    gardenId: "g3",
    gardenName: "Vườn Nha Đam",
    sensorType: "light",
    severity: "low",
    status: "RESOLVED",
    message: "Cường độ ánh sáng thấp kéo dài",
    value: 2100,
    threshold: 3000,
    detectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    processingAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    processedBy: "Nguyễn Văn A",
  },
];

// ========================
// SCHEDULES
// ========================
export const schedules: Schedule[] = [
  { id: "s1", deviceId: "d1", deviceName: "Máy bơm Vườn 1", gardenId: "g1", gardenName: "Vườn Cải Xanh", action: "ON", startTime: "06:00", endTime: "06:30", date: "2026-03-08", repeat: "daily", isActive: true },
  { id: "s2", deviceId: "d1", deviceName: "Máy bơm Vườn 1", gardenId: "g1", gardenName: "Vườn Cải Xanh", action: "ON", startTime: "16:00", endTime: "16:30", date: "2026-03-08", repeat: "daily", isActive: true },
  { id: "s3", deviceId: "d5", deviceName: "Máy bơm Vườn 2", gardenId: "g2", gardenName: "Vườn Cà Chua", action: "ON", startTime: "07:00", endTime: "07:45", date: "2026-03-08", repeat: "daily", isActive: true },
  { id: "s4", deviceId: "d2", deviceName: "Đèn LED Vườn 1", gardenId: "g1", gardenName: "Vườn Cải Xanh", action: "ON", startTime: "18:00", endTime: "20:00", date: "2026-03-08", repeat: "daily", isActive: true },
  { id: "s5", deviceId: "d9", deviceName: "Máy bơm Vườn 3", gardenId: "g3", gardenName: "Vườn Nha Đam", action: "ON", startTime: "05:30", endTime: "06:00", date: "2026-03-09", repeat: "weekly", isActive: true },
  { id: "s6", deviceId: "d10", deviceName: "Đèn LED Vườn 3", gardenId: "g3", gardenName: "Vườn Nha Đam", action: "OFF", startTime: "22:00", date: "2026-03-08", repeat: "once", isActive: true },
];

// ========================
// USERS
// ========================
export const users: User[] = [
  {
    id: "u1",
    name: "Nguyễn Văn An",
    email: "an.nguyen@nongtech.vn",
    role: "ADMIN",
    phone: "0901234567",
    assignedGardens: ["g1", "g2", "g3"],
    status: "active",
    createdAt: "2025-10-01T08:00:00.000Z",
  },
  {
    id: "u2",
    name: "Trần Thị Bích",
    email: "bich.tran@nongtech.vn",
    role: "FARMER",
    phone: "0912345678",
    assignedGardens: ["g1", "g2"],
    status: "active",
    createdAt: "2025-10-15T08:00:00.000Z",
  },
  {
    id: "u3",
    name: "Lê Minh Cường",
    email: "cuong.le@nongtech.vn",
    role: "FARMER",
    phone: "0923456789",
    assignedGardens: ["g3"],
    status: "active",
    createdAt: "2025-11-01T08:00:00.000Z",
  },
  {
    id: "u4",
    name: "Phạm Thị Dung",
    email: "dung.pham@nongtech.vn",
    role: "FARMER",
    phone: "0934567890",
    assignedGardens: ["g2"],
    status: "inactive",
    createdAt: "2025-12-01T08:00:00.000Z",
  },
];

// Current logged-in user (for demo)
export const currentUser: User = users[0];

// ========================
// SYSTEM LOGS
// ========================
export const systemLogs: SystemLog[] = [
  { id: "l1", actionType: "DEVICE_TOGGLE", description: "Bật máy bơm Vườn 1", userId: "u2", userName: "Trần Thị Bích", gardenId: "g1", gardenName: "Vườn Cải Xanh", deviceId: "d1", timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: "l2", actionType: "ALERT_ACTION", description: "Xác nhận xử lý cảnh báo độ ẩm đất", userId: "u1", userName: "Nguyễn Văn An", gardenId: "g2", gardenName: "Vườn Cà Chua", timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
  { id: "l3", actionType: "CONFIG_CHANGE", description: "Thay đổi ngưỡng cảnh báo nhiệt độ", userId: "u1", userName: "Nguyễn Văn An", gardenId: "g2", gardenName: "Vườn Cà Chua", oldValue: "35°C", newValue: "30°C", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "l4", actionType: "SCHEDULE_CREATE", description: "Tạo lịch tưới tự động Vườn 3", userId: "u3", userName: "Lê Minh Cường", gardenId: "g3", gardenName: "Vườn Nha Đam", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  { id: "l5", actionType: "USER_LOGIN", description: "Đăng nhập hệ thống", userId: "u2", userName: "Trần Thị Bích", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: "l6", actionType: "DEVICE_TOGGLE", description: "Tắt đèn LED Vườn 2", userId: "u2", userName: "Trần Thị Bích", gardenId: "g2", gardenName: "Vườn Cà Chua", deviceId: "d6", timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
  { id: "l7", actionType: "USER_LOGIN", description: "Đăng nhập hệ thống", userId: "u1", userName: "Nguyễn Văn An", timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  { id: "l8", actionType: "ALERT_ACTION", description: "Đóng cảnh báo độ ẩm không khí", userId: "u1", userName: "Nguyễn Văn An", gardenId: "g1", gardenName: "Vườn Cải Xanh", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
];

// ========================
// CHART DATA (24h)
// ========================
function generateChartData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();
    const timeLabel = `${hour.toString().padStart(2, "0")}:00`;
    // Temperature follows a day-night cycle
    const baseTemp = 20 + 8 * Math.sin((hour - 6) * Math.PI / 12);
    data.push({
      time: timeLabel,
      garden1: parseFloat((baseTemp + 1.5 + Math.random() * 2).toFixed(1)),
      garden2: parseFloat((baseTemp + 5.0 + Math.random() * 2).toFixed(1)),
      garden3: parseFloat((baseTemp + 3.0 + Math.random() * 2).toFixed(1)),
    });
  }
  return data;
}

function generateHumidityData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();
    const timeLabel = `${hour.toString().padStart(2, "0")}:00`;
    data.push({
      time: timeLabel,
      garden1: parseFloat((70 + 10 * Math.sin(hour * Math.PI / 12) + Math.random() * 5).toFixed(1)),
      garden2: parseFloat((50 + 8 * Math.sin(hour * Math.PI / 12) + Math.random() * 5).toFixed(1)),
      garden3: parseFloat((78 + 6 * Math.sin(hour * Math.PI / 12) + Math.random() * 5).toFixed(1)),
    });
  }
  return data;
}

function generateSoilData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();
    const timeLabel = `${hour.toString().padStart(2, "0")}:00`;
    // Drops after watering at 6am and 4pm then rebounds
    let base1 = 70, base2 = 40; const base3 = 80;
    if (hour >= 6 && hour < 9) { base1 = 75 + (hour - 6) * 2; base2 = 45 + (hour - 6) * 2; }
    if (hour >= 16 && hour < 19) { base1 = 72 + (hour - 16) * 2; base2 = 43 + (hour - 16) * 2; }
    data.push({
      time: timeLabel,
      garden1: parseFloat((base1 + Math.random() * 4).toFixed(1)),
      garden2: parseFloat((base2 + Math.random() * 4).toFixed(1)),
      garden3: parseFloat((base3 + Math.random() * 3).toFixed(1)),
    });
  }
  return data;
}

function generateLightData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();
    const timeLabel = `${hour.toString().padStart(2, "0")}:00`;
    const lightCurve = Math.max(0, 20000 * Math.sin((hour - 6) * Math.PI / 12));
    data.push({
      time: timeLabel,
      garden1: Math.round(lightCurve * 0.9 + Math.random() * 1000),
      garden2: Math.round(lightCurve * 1.1 + Math.random() * 1200),
      garden3: Math.round(lightCurve * 0.7 + Math.random() * 800),
    });
  }
  return data;
}

export const temperatureChartData = generateChartData();
export const humidityAirChartData = generateHumidityData();
export const humiditySoilChartData = generateSoilData();
export const lightChartData = generateLightData();

// ========================
// AI ANALYSES
// ========================
export const aiAnalyses: AIAnalysis[] = [
  {
    id: "ai1",
    imageUrl: "https://images.unsplash.com/photo-1560493676-04071185765c?w=300&q=80",
    gardenId: "g2",
    gardenName: "Vườn Cà Chua",
    result: "Vàng lá do thiếu nướ",
    confidence: 87.3,
    recommendation: "Tăng lịch tưới lên 2 lần/ngày, kiểm tra hệ thống bơm",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ai2",
    imageUrl: "https://images.unsplash.com/photo-1595829279802-0dfd38c56e15?w=300&q=80",
    gardenId: "g1",
    gardenName: "Vườn Cải Xanh",
    result: "Cây phát triển bình thường",
    confidence: 94.1,
    recommendation: "Không cần can thiệp. Tiếp tục chế độ chăm sóc hiện tại.",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ai3",
    imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&q=80",
    gardenId: "g3",
    gardenName: "Vườn Nha Đam",
    result: "Phát hiện dấu hiệu sâu bệnh nhẹ",
    confidence: 62.7,
    recommendation: "Phun thuốc trừ sâu sinh học, theo dõi trong 3 ngày tiếp theo",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];
