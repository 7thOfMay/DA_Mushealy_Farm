export interface CropThreshold {
  sensor_type: "temperature" | "humidity_soil" | "humidity_air" | "light_hours";
  optimal_min?: number;
  optimal_max?: number;
  warning_min?: number;
  warning_max?: number;
  critical_min?: number;
  critical_max?: number;
  unit: string;
}

export interface CropType {
  id: string;
  name: string;
  description: string;
  harvest_days_min: number;
  harvest_days_max: number;
  watering_frequency: string;
  thresholds: CropThreshold[];
}

export const cropTypeSeeds: CropType[] = [
  {
    id: "crop_ca_chua",
    name: "Cà chua",
    description: "Nhạy cảm giai đoạn ra hoa đậu trái. Tưới đều tránh nứt quả.",
    harvest_days_min: 50,
    harvest_days_max: 90,
    watering_frequency: "Tưới đều hằng ngày, tăng nhẹ khi nắng gắt",
    thresholds: [
      {
        sensor_type: "temperature",
        warning_min: 20,
        warning_max: 30,
        critical_min: 10,
        critical_max: 35,
        optimal_min: 22,
        optimal_max: 26,
        unit: "°C",
      },
      {
        sensor_type: "humidity_soil",
        warning_min: 60,
        warning_max: 90,
        critical_min: 50,
        critical_max: 95,
        optimal_min: 60,
        optimal_max: 85,
        unit: "%",
      },
      {
        sensor_type: "light_hours",
        warning_min: 5,
        optimal_min: 6,
        optimal_max: 8,
        unit: "giờ/ngày",
      },
    ],
  },
  {
    id: "crop_cai_xanh",
    name: "Cải xanh",
    description: "Tưới 2 lần/ngày. Thu hoạch nhanh 35-40 ngày.",
    harvest_days_min: 35,
    harvest_days_max: 40,
    watering_frequency: "2 lần/ngày",
    thresholds: [
      {
        sensor_type: "temperature",
        warning_max: 18,
        critical_min: 5,
        critical_max: 27,
        optimal_min: 15,
        optimal_max: 18,
        unit: "°C",
      },
      {
        sensor_type: "humidity_soil",
        critical_min: 50,
        critical_max: 70,
        optimal_min: 50,
        optimal_max: 70,
        unit: "%",
      },
      {
        sensor_type: "light_hours",
        warning_min: 4,
        warning_max: 6,
        optimal_min: 4,
        optimal_max: 6,
        unit: "giờ/ngày",
      },
    ],
  },
  {
    id: "crop_nha_dam",
    name: "Nha đam",
    description: "Ưa ánh sáng nhẹ 6-8h/ngày, tránh trực tiếp. Tưới 3-5 ngày/lần.",
    harvest_days_min: 730,
    harvest_days_max: 1095,
    watering_frequency: "3-5 ngày/lần",
    thresholds: [
      {
        sensor_type: "temperature",
        warning_min: 20,
        warning_max: 25,
        critical_min: 5,
        critical_max: 30,
        optimal_min: 20,
        optimal_max: 25,
        unit: "°C",
      },
      {
        sensor_type: "humidity_soil",
        warning_max: 50,
        critical_min: 30,
        critical_max: 60,
        optimal_min: 40,
        optimal_max: 50,
        unit: "%",
      },
      {
        sensor_type: "light_hours",
        optimal_min: 6,
        optimal_max: 8,
        unit: "giờ/ngày",
      },
    ],
  },
];

export function getCropTypeSeedById(cropTypeId?: string): CropType | null {
  if (!cropTypeId) return null;
  return cropTypeSeeds.find((item) => item.id === cropTypeId) ?? null;
}
