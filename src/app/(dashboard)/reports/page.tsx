"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Clock3, Droplets, Leaf, SunMedium, Thermometer } from "lucide-react";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { ErrorState } from "@/frontend/components/shared/ErrorStates";
import { useAppStore } from "@/frontend/context/store";
import { apiGetThresholds } from "@/frontend/services/client";
import { getManagedFarmers, getVisibleFarmsForViewer } from "@/frontend/utils/dataScope";
import { cn } from "@/frontend/utils/utils";
import type { Alert, ChartDataPoint, Garden, GardenSensorSummary, Schedule, ZoneThresholds } from "@/types";

type DashboardRange = "1h" | "24h" | "72h" | "1w" | "1m";
type CorrelationPair = "temp-soil" | "temp-light" | "soil-light";
type DistributionMetric = "temperature" | "humidityAir" | "humiditySoil" | "light";

type DashboardPayload = {
  gardens: Garden[];
  sensorSummaries: GardenSensorSummary[];
  alerts: Alert[];
  schedules: Schedule[];
  chartData: {
    temperatureChartData: ChartDataPoint[];
    humidityAirChartData: ChartDataPoint[];
    humiditySoilChartData: ChartDataPoint[];
    lightChartData: ChartDataPoint[];
  };
};

type CorrelationPoint = {
  x: number;
  y: number;
  time: string;
};

type GardenSeriesPoint = {
  time: string;
  temperature?: number;
  humiditySoil?: number;
  humidityAir?: number;
  light?: number;
};

const RANGE_OPTIONS: Array<{ key: DashboardRange; label: string; hours: number }> = [
  { key: "1h", label: "1 giờ gần nhất", hours: 1 },
  { key: "24h", label: "24 giờ gần nhất", hours: 24 },
  { key: "72h", label: "72 giờ gần nhất", hours: 72 },
  { key: "1w", label: "1 tuần", hours: 24 * 7 },
  { key: "1m", label: "1 tháng", hours: 24 * 30 },
];

const EMPTY_PAYLOAD: DashboardPayload = {
  gardens: [],
  sensorSummaries: [],
  alerts: [],
  schedules: [],
  chartData: {
    temperatureChartData: [],
    humidityAirChartData: [],
    humiditySoilChartData: [],
    lightChartData: [],
  },
};

function averageOf(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toWindowStart(hours: number) {
  return Date.now() - hours * 60 * 60 * 1000;
}

function pickGardenValue(point: ChartDataPoint, index: number) {
  const key = `garden${index + 1}` as "garden1" | "garden2" | "garden3";
  const value = point[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function hasSeriesData(series: GardenSeriesPoint[], keys: Array<keyof GardenSeriesPoint>) {
  return series.some((point) => keys.some((key) => typeof point[key] === "number"));
}

function classifyDistribution(
  series: GardenSeriesPoint[],
  metric: DistributionMetric,
  thresholds: ZoneThresholds | null,
) {
  if (!thresholds) return [];

  const threshold =
    metric === "temperature"
      ? thresholds.temperature
      : metric === "humidityAir"
        ? thresholds.humidityAir
        : metric === "humiditySoil"
          ? thresholds.humiditySoil
          : thresholds.light;

  const counts = { low: 0, optimal: 0, high: 0 };

  for (const point of series) {
    const value = point[metric];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (value < threshold.min) counts.low += 1;
    else if (value > threshold.max) counts.high += 1;
    else counts.optimal += 1;
  }

  return [
    { name: "Thấp", value: counts.low, color: "#2980B9" },
    { name: "Hợp lý", value: counts.optimal, color: "#1B4332" },
    { name: "Cao", value: counts.high, color: "#C0392B" },
  ].filter((item) => item.value > 0);
}

export default function ReportsPage() {
  const farms = useAppStore((state) => state.farms);
  const users = useAppStore((state) => state.users);
  const loggedInUser = useAppStore((state) => state.loggedInUser);
  const selectedFarmerId = useAppStore((state) => state.selectedFarmerId);
  const setSelectedFarmerId = useAppStore((state) => state.setSelectedFarmerId);
  const currentFarmId = useAppStore((state) => state.currentFarmId);

  const managedFarmers = getManagedFarmers(users, loggedInUser);
  const visibleFarms = getVisibleFarmsForViewer({ farms, users, loggedInUser, selectedFarmerId });
  const selectedFarm = visibleFarms.find((farm) => farm.id === currentFarmId) ?? visibleFarms[0] ?? null;

  const [range, setRange] = useState<DashboardRange>("24h");
  const [correlationPair, setCorrelationPair] = useState<CorrelationPair>("temp-soil");
  const [distributionMetric, setDistributionMetric] = useState<DistributionMetric>("temperature");
  const [selectedGardenId, setSelectedGardenId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<DashboardPayload>(EMPTY_PAYLOAD);
  const [thresholds, setThresholds] = useState<ZoneThresholds[]>([]);

  const selectedRange = RANGE_OPTIONS.find((option) => option.key === range) ?? RANGE_OPTIONS[1];
  const isShortRange = range === "1h";

  useEffect(() => {
    if (!selectedFarm) {
      setPayload(EMPTY_PAYLOAD);
      setThresholds([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setError(null);

        const gardensResponse = await fetch(`/api/gardens?farmId=${selectedFarm.id}`, { cache: "no-store" });
        if (!gardensResponse.ok) {
          throw new Error("Không thể tải danh sách khu vườn");
        }

        const gardens = (await gardensResponse.json()) as Garden[];
        const chartGardens = gardens.slice(0, 3);
        const chartParams = new URLSearchParams();
        chartParams.set("hours", String(selectedRange.hours));
        chartGardens.forEach((garden) => chartParams.append("gardenId", garden.id));

        const [sensorResponse, alertResponse, scheduleResponse, chartResponse, thresholdRows] = await Promise.all([
          fetch("/api/sensors", { cache: "no-store" }),
          fetch("/api/alerts", { cache: "no-store" }),
          fetch("/api/schedules", { cache: "no-store" }),
          chartGardens.length
            ? fetch(`/api/sensors/chart?${chartParams.toString()}`, { cache: "no-store" })
            : Promise.resolve(new Response(JSON.stringify(EMPTY_PAYLOAD.chartData), { status: 200 })),
          apiGetThresholds(),
        ]);

        if (!sensorResponse.ok || !alertResponse.ok || !scheduleResponse.ok || !chartResponse.ok) {
          throw new Error("Không thể tải dữ liệu dashboard từ database");
        }

        const [sensorSummaries, alerts, schedules, chartData] = await Promise.all([
          sensorResponse.json() as Promise<GardenSensorSummary[]>,
          alertResponse.json() as Promise<Alert[]>,
          scheduleResponse.json() as Promise<Schedule[]>,
          chartResponse.json() as Promise<DashboardPayload["chartData"]>,
        ]);

        if (cancelled) return;

        const gardenIds = new Set(gardens.map((garden) => garden.id));
        const windowStart = toWindowStart(selectedRange.hours);

        setPayload({
          gardens,
          sensorSummaries: sensorSummaries.filter((summary) => gardenIds.has(summary.gardenId)),
          alerts: alerts.filter((alert) => gardenIds.has(alert.gardenId) && new Date(alert.detectedAt).getTime() >= windowStart),
          schedules: schedules.filter((schedule) => gardenIds.has(schedule.gardenId)),
          chartData,
        });
        setThresholds((thresholdRows ?? []).filter((item) => gardenIds.has(item.gardenId)));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không thể tải dashboard");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    void loadDashboard();
    const interval = window.setInterval(loadDashboard, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedFarm, selectedRange.hours]);

  useEffect(() => {
    if (!payload.gardens.length) {
      setSelectedGardenId("");
      return;
    }
    const stillExists = payload.gardens.some((garden) => garden.id === selectedGardenId);
    if (!stillExists) {
      setSelectedGardenId(payload.gardens[0].id);
    }
  }, [payload.gardens, selectedGardenId]);

  const selectedGarden = payload.gardens.find((garden) => garden.id === selectedGardenId) ?? payload.gardens[0] ?? null;
  const selectedSummary = payload.sensorSummaries.find((summary) => summary.gardenId === selectedGarden?.id) ?? null;
  const selectedAlerts = payload.alerts.filter((alert) => alert.gardenId === selectedGarden?.id);
  const selectedSchedules = payload.schedules.filter((schedule) => schedule.gardenId === selectedGarden?.id);
  const chartGardens = payload.gardens.slice(0, 3);
  const selectedGardenChartIndex = chartGardens.findIndex((garden) => garden.id === selectedGarden?.id);

  const gardenSeries = useMemo<GardenSeriesPoint[]>(() => {
    if (!selectedGarden || selectedGardenChartIndex < 0) return [];

    const timeMap = new Map<string, GardenSeriesPoint>();
    const seriesConfigs = [
      { source: payload.chartData.temperatureChartData, field: "temperature" as const },
      { source: payload.chartData.humidityAirChartData, field: "humidityAir" as const },
      { source: payload.chartData.humiditySoilChartData, field: "humiditySoil" as const },
      { source: payload.chartData.lightChartData, field: "light" as const },
    ];

    for (const config of seriesConfigs) {
      for (const point of config.source) {
        const value = pickGardenValue(point, selectedGardenChartIndex);
        if (typeof value !== "number") continue;
        const existing = timeMap.get(point.time) ?? { time: point.time };
        existing[config.field] = value;
        timeMap.set(point.time, existing);
      }
    }

    return Array.from(timeMap.values()).sort((a, b) => a.time.localeCompare(b.time));
  }, [payload.chartData, selectedGarden, selectedGardenChartIndex]);

  const combinedTrendData = gardenSeries.map((point) => ({
    time: point.time,
    temperature: point.temperature ?? null,
    humiditySoil: point.humiditySoil ?? null,
    humidityAir: point.humidityAir ?? null,
    light: typeof point.light === "number" ? Number((point.light / 1000).toFixed(2)) : null,
  }));

  const correlationData: CorrelationPoint[] = gardenSeries.flatMap((point) => {
    if (correlationPair === "temp-light") {
      if (typeof point.temperature !== "number" || typeof point.light !== "number") return [];
      return [{ x: point.temperature, y: Number((point.light / 1000).toFixed(2)), time: point.time }];
    }
    if (correlationPair === "soil-light") {
      if (typeof point.humiditySoil !== "number" || typeof point.light !== "number") return [];
      return [{ x: point.humiditySoil, y: Number((point.light / 1000).toFixed(2)), time: point.time }];
    }
    if (typeof point.temperature !== "number" || typeof point.humiditySoil !== "number") return [];
    return [{ x: point.temperature, y: point.humiditySoil, time: point.time }];
  });

  const hasLineData = hasSeriesData(gardenSeries, ["temperature"]);
  const hasComboData = hasSeriesData(gardenSeries, ["temperature", "humiditySoil", "light"]);
  const hasHumidityAirData = hasSeriesData(gardenSeries, ["humidityAir"]);
  const hasHumiditySoilData = hasSeriesData(gardenSeries, ["humiditySoil"]);
  const hasLightData = hasSeriesData(gardenSeries, ["light"]);

  const selectedThreshold = thresholds.find((item) => item.gardenId === selectedGarden?.id) ?? null;
  const distributionData = classifyDistribution(gardenSeries, distributionMetric, selectedThreshold);
  const distributionLabels: Record<DistributionMetric, string> = {
    temperature: "Nhiệt độ",
    humidityAir: "Độ ẩm không khí",
    humiditySoil: "Độ ẩm đất",
    light: "Ánh sáng",
  };

  const humidityAirTrendData = gardenSeries.map((point) => ({ time: point.time, value: point.humidityAir ?? null }));
  const humiditySoilTrendData = gardenSeries.map((point) => ({ time: point.time, value: point.humiditySoil ?? null }));
  const lightTrendData = gardenSeries.map((point) => ({
    time: point.time,
    value: typeof point.light === "number" ? Number((point.light / 1000).toFixed(2)) : null,
  }));

  const avgTemperature = selectedSummary?.temperature ?? averageOf(gardenSeries.map((point) => point.temperature).filter((value): value is number => typeof value === "number"));
  const avgSoilHumidity = selectedSummary?.humiditySoil ?? averageOf(gardenSeries.map((point) => point.humiditySoil).filter((value): value is number => typeof value === "number"));
  const avgLight = selectedSummary?.light ?? averageOf(gardenSeries.map((point) => point.light).filter((value): value is number => typeof value === "number"));
  const estimatedPumpHours =
    (selectedSchedules.reduce((sum, schedule) => {
      if (schedule.action !== "ON") return sum;
      if (schedule.timeConfig?.durationMin) return sum + schedule.timeConfig.durationMin;
      if (schedule.thresholdConfig?.durationMin) return sum + schedule.thresholdConfig.durationMin;
      return sum + 30;
    }, 0) / 60) * Math.max(1, selectedRange.hours / 24);

  const statCards = [
    { label: "Nhiệt độ", value: avgTemperature.toFixed(1), unit: "°C", icon: Thermometer, color: "#E67E22" },
    { label: "Độ ẩm đất", value: avgSoilHumidity.toFixed(1), unit: "%", icon: Droplets, color: "#2980B9" },
    { label: "Ánh sáng", value: (avgLight / 1000).toFixed(1), unit: "k lux", icon: SunMedium, color: "#F39C12" },
    { label: "Giờ bơm ước tính", value: estimatedPumpHours.toFixed(1), unit: "h", icon: Clock3, color: "#1B4332" },
  ];

  const alertTypeData = [
    { name: "Nhiệt độ", value: selectedAlerts.filter((alert) => alert.sensorType === "temperature").length, color: "#C0392B" },
    { name: "Độ ẩm", value: selectedAlerts.filter((alert) => alert.sensorType === "humidity_air" || alert.sensorType === "humidity_soil").length, color: "#2980B9" },
    { name: "Ánh sáng", value: selectedAlerts.filter((alert) => alert.sensorType === "light").length, color: "#F39C12" },
    { name: "Thiết bị", value: selectedAlerts.filter((alert) => !alert.sensorType).length, color: "#5C7A6A" },
  ].filter((entry) => entry.value > 0);

  if (!selectedFarm) {
    return (
      <div>
        <Topbar title="Báo cáo & Phân tích" subtitle="Dashboard dữ liệu nông trại theo thời gian thực" />
        <div className="max-w-3xl p-8">
          <ErrorState
            title="Chưa có nông trại để hiển thị dashboard"
            description="Hãy chọn nông dân phù hợp hoặc tạo nông trại trước khi sử dụng chế độ dashboard."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Báo cáo & Phân tích" subtitle="Dashboard dữ liệu nông trại theo thời gian thực" />

      <div className="space-y-6 p-8">
        {loggedInUser?.role === "ADMIN" && managedFarmers.length > 0 && (
          <div className="card max-w-[420px] p-4">
            <label className="mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A]">
              Nông dân đang xem dashboard
            </label>
            <select
              className="input-field"
              value={selectedFarmerId ?? managedFarmers[0].id}
              onChange={(event) => setSelectedFarmerId(event.target.value)}
            >
              {managedFarmers.map((farmer) => (
                <option key={farmer.id} value={farmer.id}>
                  {farmer.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-[#E2E8E4] bg-white p-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => setRange(option.key)}
                className={cn(
                  "rounded-[6px] px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                  range === option.key ? "bg-[#1B4332] text-white" : "text-[#5C7A6A] hover:bg-[#F0FAF3]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-[8px] border border-[#E2E8E4] bg-white px-3 py-2 text-[0.8125rem] text-[#1A2E1F]"
              value={selectedGarden?.id ?? ""}
              onChange={(event) => setSelectedGardenId(event.target.value)}
            >
              {payload.gardens.map((garden) => (
                <option key={garden.id} value={garden.id}>
                  {garden.name} - {garden.plantLabel}
                </option>
              ))}
            </select>

            <div className="rounded-[8px] border border-[#E2E8E4] bg-white px-3 py-2 text-[0.8125rem] text-[#5C7A6A]">
              Cập nhật dữ liệu mỗi 10 giây từ database
            </div>
          </div>
        </div>

        {loading && <div className="card p-6 text-[0.875rem] text-[#5C7A6A]">Đang tải dashboard từ database...</div>}

        {error && (
          <div className="max-w-3xl">
            <ErrorState title="Không thể tải dashboard" description={error} />
          </div>
        )}

        {!loading && !error && selectedGarden && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="card p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${card.color}18` }}>
                        <Icon size={16} strokeWidth={1.5} style={{ color: card.color }} />
                      </div>
                      <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A]">{card.label}</span>
                    </div>
                    <p className="font-mono-data text-[2rem] font-bold text-[#1A2E1F]">
                      {card.value}
                      <span className="ml-1.5 text-[0.875rem] text-[#5C7A6A]">{card.unit}</span>
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Xu hướng nhiệt độ của {selectedGarden.name}</h3>
                  <span className="text-[0.75rem] text-[#5C7A6A]">{selectedRange.label}</span>
                </div>
                <div className="h-[260px]">
                  {!hasLineData ? (
                    <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[#D7E2DB] bg-[#F7F8F6] px-6 text-center text-[0.875rem] text-[#5C7A6A]">
                      Không có dữ liệu cảm biến trong khoảng thời gian này.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={gardenSeries}>
                        <CartesianGrid stroke="#E2E8E4" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Line
                          type={isShortRange ? "stepAfter" : "monotone"}
                          dataKey="temperature"
                          stroke={selectedGarden.color}
                          strokeWidth={2}
                          dot={isShortRange ? { r: 2 } : false}
                          activeDot={{ r: 4 }}
                          name={`${selectedGarden.plantLabel} (°C)`}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Nhiệt độ - độ ẩm - ánh sáng theo {selectedGarden.name}</h3>
                  <span className="text-[0.75rem] text-[#5C7A6A]">Combo chart</span>
                </div>
                <div className="h-[260px]">
                  {!hasComboData ? (
                    <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[#D7E2DB] bg-[#F7F8F6] px-6 text-center text-[0.875rem] text-[#5C7A6A]">
                      Không có đủ dữ liệu để vẽ biểu đồ kết hợp.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={combinedTrendData}>
                        <CartesianGrid stroke="#E2E8E4" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="humiditySoil" fill="#2980B9" name="Độ ẩm đất (%)" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#E67E22" strokeWidth={2} dot={false} name="Nhiệt độ (°C)" />
                        <Line yAxisId="right" type="monotone" dataKey="light" stroke="#F39C12" strokeWidth={2} dot={false} name="Ánh sáng (k lux)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-4 xl:grid-cols-2">
              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Độ ẩm không khí của {selectedGarden.name}</h3>
                  <span className="text-[0.75rem] text-[#5C7A6A]">%</span>
                </div>
                <div className="h-[220px]">
                  {!hasHumidityAirData ? (
                    <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[#D7E2DB] bg-[#F7F8F6] px-6 text-center text-[0.875rem] text-[#5C7A6A]">
                      Không có dữ liệu độ ẩm không khí trong khoảng này.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={humidityAirTrendData}>
                        <CartesianGrid stroke="#E2E8E4" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Line type={isShortRange ? "stepAfter" : "monotone"} dataKey="value" stroke="#2D9CDB" strokeWidth={2} dot={isShortRange ? { r: 2 } : false} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Độ ẩm đất của {selectedGarden.name}</h3>
                  <span className="text-[0.75rem] text-[#5C7A6A]">%</span>
                </div>
                <div className="h-[220px]">
                  {!hasHumiditySoilData ? (
                    <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[#D7E2DB] bg-[#F7F8F6] px-6 text-center text-[0.875rem] text-[#5C7A6A]">
                      Không có dữ liệu độ ẩm đất trong khoảng này.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={humiditySoilTrendData}>
                        <CartesianGrid stroke="#E2E8E4" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Line type={isShortRange ? "stepAfter" : "monotone"} dataKey="value" stroke="#2980B9" strokeWidth={2} dot={isShortRange ? { r: 2 } : false} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Ánh sáng của {selectedGarden.name}</h3>
                  <span className="text-[0.75rem] text-[#5C7A6A]">k lux</span>
                </div>
                <div className="h-[220px]">
                  {!hasLightData ? (
                    <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[#D7E2DB] bg-[#F7F8F6] px-6 text-center text-[0.875rem] text-[#5C7A6A]">
                      Không có dữ liệu ánh sáng trong khoảng này.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lightTrendData}>
                        <CartesianGrid stroke="#E2E8E4" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Line type={isShortRange ? "stepAfter" : "monotone"} dataKey="value" stroke="#F39C12" strokeWidth={2} dot={isShortRange ? { r: 2 } : false} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Phân loại ghi nhận theo ngưỡng</h3>
                  <select
                    className="rounded-[8px] border border-[#E2E8E4] bg-white px-3 py-2 text-[0.75rem] text-[#1A2E1F]"
                    value={distributionMetric}
                    onChange={(event) => setDistributionMetric(event.target.value as DistributionMetric)}
                  >
                    <option value="temperature">Nhiệt độ</option>
                    <option value="humidityAir">Độ ẩm không khí</option>
                    <option value="humiditySoil">Độ ẩm đất</option>
                    <option value="light">Ánh sáng</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-[220px] flex-1">
                    {!selectedThreshold || distributionData.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[#D7E2DB] bg-[#F7F8F6] px-6 text-center text-[0.875rem] text-[#5C7A6A]">
                        Chưa đủ dữ liệu hoặc chưa có ngưỡng để phân loại {distributionLabels[distributionMetric].toLowerCase()}.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={distributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={40}>
                            {distributionData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="space-y-2">
                    {selectedThreshold && (
                      <div className="rounded-[8px] bg-[#F7F8F6] px-3 py-2 text-[0.75rem] text-[#5C7A6A]">
                        Ngưỡng {distributionLabels[distributionMetric].toLowerCase()}:{" "}
                        {distributionMetric === "temperature"
                          ? `${selectedThreshold.temperature.min} - ${selectedThreshold.temperature.max} °C`
                          : distributionMetric === "humidityAir"
                            ? `${selectedThreshold.humidityAir.min} - ${selectedThreshold.humidityAir.max} %`
                            : distributionMetric === "humiditySoil"
                              ? `${selectedThreshold.humiditySoil.min} - ${selectedThreshold.humiditySoil.max} %`
                              : `${selectedThreshold.light.min} - ${selectedThreshold.light.max} lux`}
                      </div>
                    )}
                    {distributionData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-[0.8125rem] text-[#5C7A6A]">{entry.name}</span>
                        <span className="ml-1 text-[0.8125rem] font-bold text-[#1A2E1F]">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Tương quan chỉ số của {selectedGarden.name}</h3>
                  <select
                    className="rounded-[8px] border border-[#E2E8E4] bg-white px-3 py-2 text-[0.75rem] text-[#1A2E1F]"
                    value={correlationPair}
                    onChange={(event) => setCorrelationPair(event.target.value as CorrelationPair)}
                  >
                    <option value="temp-soil">Nhiệt độ - Độ ẩm đất</option>
                    <option value="temp-light">Nhiệt độ - Ánh sáng</option>
                    <option value="soil-light">Độ ẩm đất - Ánh sáng</option>
                  </select>
                </div>
                <div className="h-[260px]">
                  {correlationData.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[#D7E2DB] bg-[#F7F8F6] px-6 text-center text-[0.875rem] text-[#5C7A6A]">
                      Chưa đủ dữ liệu tương quan trong khoảng thời gian này.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid stroke="#E2E8E4" strokeDasharray="3 3" />
                        <XAxis dataKey="x" tick={{ fontSize: 10, fill: "#5C7A6A" }} />
                        <YAxis dataKey="y" tick={{ fontSize: 10, fill: "#5C7A6A" }} />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          formatter={(value) => (typeof value === "number" ? value.toFixed(2) : String(value ?? ""))}
                          labelFormatter={(_, points) => {
                            const point = points?.[0]?.payload as CorrelationPoint | undefined;
                            return point ? `${selectedGarden.plantLabel} • ${point.time}` : "";
                          }}
                        />
                        <Scatter data={correlationData} fill={selectedGarden.color}>
                          {correlationData.map((point, index) => (
                            <Cell key={`${point.time}-${index}`} fill={selectedGarden.color} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="mb-4 text-[0.9375rem] font-semibold text-[#1A2E1F]">Cơ cấu cảnh báo của {selectedGarden.name}</h3>
                <div className="flex items-center gap-4">
                  <div className="h-[220px] flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={alertTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={42}>
                          {alertTypeData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    {alertTypeData.length === 0 && (
                      <div className="text-[0.8125rem] text-[#5C7A6A]">Không có cảnh báo trong khoảng thời gian này.</div>
                    )}
                    {alertTypeData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-[0.8125rem] text-[#5C7A6A]">{entry.name}</span>
                        <span className="ml-1 text-[0.8125rem] font-bold text-[#1A2E1F]">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Leaf size={16} className="text-[#1B4332]" />
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Khu vườn đang xem</h3>
                </div>
                <p className="text-[1.125rem] font-bold text-[#1A2E1F]">{selectedGarden.name}</p>
                <p className="mt-1 text-[0.8125rem] text-[#5C7A6A]">{selectedGarden.plantLabel}</p>
              </div>

              <div className="card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-[#C0392B]" />
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Cảnh báo trong kỳ</h3>
                </div>
                <p className="text-[1.875rem] font-bold text-[#1A2E1F]">{selectedAlerts.length}</p>
              </div>

              <div className="card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Clock3 size={16} className="text-[#2980B9]" />
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Lịch tưới áp dụng</h3>
                </div>
                <p className="text-[1.875rem] font-bold text-[#1A2E1F]">{selectedSchedules.length}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
