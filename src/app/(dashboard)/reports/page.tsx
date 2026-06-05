"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
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
import { getManagedFarmers, getVisibleFarmsForViewer } from "@/frontend/utils/dataScope";
import { cn } from "@/frontend/utils/utils";
import type { Alert, ChartDataPoint, Garden, GardenSensorSummary, Schedule } from "@/types";

type DashboardRange = "1h" | "24h" | "72h" | "1w" | "1m";
type ComparisonMetric = "temperature" | "humiditySoil" | "light";
type CorrelationPair = "temp-soil" | "temp-light" | "soil-light";

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
  name: string;
  color: string;
  time: string;
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

function isFiniteMetric(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
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
  const [comparisonMetric, setComparisonMetric] = useState<ComparisonMetric>("temperature");
  const [correlationPair, setCorrelationPair] = useState<CorrelationPair>("temp-soil");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<DashboardPayload>(EMPTY_PAYLOAD);

  const selectedRange = RANGE_OPTIONS.find((option) => option.key === range) ?? RANGE_OPTIONS[1];
  const isShortRange = range === "1h";

  useEffect(() => {
    if (!selectedFarm) {
      setPayload(EMPTY_PAYLOAD);
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
        const visibleGardens = gardens.slice(0, 3);
        const chartParams = new URLSearchParams();
        chartParams.set("hours", String(selectedRange.hours));
        visibleGardens.forEach((garden) => chartParams.append("gardenId", garden.id));

        const [sensorResponse, alertResponse, scheduleResponse, chartResponse] = await Promise.all([
          fetch("/api/sensors", { cache: "no-store" }),
          fetch("/api/alerts", { cache: "no-store" }),
          fetch("/api/schedules", { cache: "no-store" }),
          visibleGardens.length
            ? fetch(`/api/sensors/chart?${chartParams.toString()}`, { cache: "no-store" })
            : Promise.resolve(new Response(JSON.stringify(EMPTY_PAYLOAD.chartData), { status: 200 })),
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
          alerts: alerts.filter((alert) => {
            if (!gardenIds.has(alert.gardenId)) return false;
            return new Date(alert.detectedAt).getTime() >= windowStart;
          }),
          schedules: schedules.filter((schedule) => gardenIds.has(schedule.gardenId)),
          chartData,
        });
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

  const chartGardens = payload.gardens.slice(0, 3);

  const mapSeriesByFarm = (data: ChartDataPoint[]) =>
    data.map((point) => {
      const row: Record<string, string | number> = { time: point.time };
      chartGardens.forEach((garden, index) => {
        const sourceKey = `garden${index + 1}` as "garden1" | "garden2" | "garden3";
        row[garden.id] = Number(point[sourceKey] ?? 0);
      });
      return row;
    });

  const temperatureSeries = mapSeriesByFarm(payload.chartData.temperatureChartData);
  const humiditySoilSeries = mapSeriesByFarm(payload.chartData.humiditySoilChartData);
  const lightSeries = mapSeriesByFarm(payload.chartData.lightChartData);

  const combinedTrendData = temperatureSeries.map((point, index) => {
    const humidityPoint = humiditySoilSeries[index] ?? {};
    const lightPoint = lightSeries[index] ?? {};
    const valuesTemp = chartGardens.map((garden) => Number(point[garden.id] ?? 0)).filter((value) => value > 0);
    const valuesHumidity = chartGardens.map((garden) => Number(humidityPoint[garden.id] ?? 0)).filter((value) => value > 0);
    const valuesLight = chartGardens.map((garden) => Number(lightPoint[garden.id] ?? 0)).filter((value) => value > 0);

    return {
      time: String(point.time),
      avgTemp: Number(averageOf(valuesTemp).toFixed(2)),
      avgHumidity: Number(averageOf(valuesHumidity).toFixed(2)),
      avgLight: Number((averageOf(valuesLight) / 1000).toFixed(2)),
    };
  });

  const summaries = payload.gardens
    .map((garden) => payload.sensorSummaries.find((summary) => summary.gardenId === garden.id) ?? null)
    .filter((summary): summary is GardenSensorSummary => summary !== null);

  const avgTemperature = averageOf(summaries.map((summary) => summary.temperature));
  const avgSoilHumidity = averageOf(summaries.map((summary) => summary.humiditySoil));
  const avgLight = averageOf(summaries.map((summary) => summary.light));
  const estimatedPumpHours =
    (payload.schedules.reduce((sum, schedule) => {
      if (schedule.action !== "ON") return sum;
      if (schedule.timeConfig?.durationMin) return sum + schedule.timeConfig.durationMin;
      if (schedule.thresholdConfig?.durationMin) return sum + schedule.thresholdConfig.durationMin;
      return sum + 30;
    }, 0) / 60) * Math.max(1, selectedRange.hours / 24);

  const statCards = [
    { label: "Nhiệt độ TB", value: avgTemperature.toFixed(1), unit: "°C", icon: Thermometer, color: "#E67E22" },
    { label: "Độ ẩm đất TB", value: avgSoilHumidity.toFixed(1), unit: "%", icon: Droplets, color: "#2980B9" },
    { label: "Ánh sáng TB", value: (avgLight / 1000).toFixed(1), unit: "k lux", icon: SunMedium, color: "#F39C12" },
    { label: "Giờ bơm ước tính", value: estimatedPumpHours.toFixed(1), unit: "h", icon: Clock3, color: "#1B4332" },
  ];

  const comparisonRows = payload.gardens
    .map((garden) => {
      const summary = payload.sensorSummaries.find((item) => item.gardenId === garden.id);
      if (!summary) return null;
      return {
        id: garden.id,
        label: garden.plantLabel,
        color: garden.color,
        temperature: summary.temperature,
        humiditySoil: summary.humiditySoil,
        light: Number((summary.light / 1000).toFixed(2)),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const comparisonChartData = comparisonRows.map((row) => ({
    name: row.label,
    value: row[comparisonMetric],
    color: row.color,
  }));

  const alertTypeData = [
    { name: "Nhiệt độ", value: payload.alerts.filter((alert) => alert.sensorType === "temperature").length, color: "#C0392B" },
    { name: "Độ ẩm", value: payload.alerts.filter((alert) => alert.sensorType === "humidity_air" || alert.sensorType === "humidity_soil").length, color: "#2980B9" },
    { name: "Ánh sáng", value: payload.alerts.filter((alert) => alert.sensorType === "light").length, color: "#F39C12" },
    { name: "Thiết bị", value: payload.alerts.filter((alert) => !alert.sensorType).length, color: "#5C7A6A" },
  ].filter((entry) => entry.value > 0);

  const correlationData: CorrelationPoint[] = temperatureSeries.flatMap((tempPoint, index) => {
    const soilPoint = humiditySoilSeries[index] ?? {};
    const lightPoint = lightSeries[index] ?? {};

    return chartGardens.flatMap((garden) => {
      const temperature = Number(tempPoint[garden.id] ?? NaN);
      const humiditySoil = Number(soilPoint[garden.id] ?? NaN);
      const light = Number(lightPoint[garden.id] ?? NaN);

      if (correlationPair === "temp-light") {
        if (!isFiniteMetric(temperature) || !isFiniteMetric(light)) return [];
        return [{ x: temperature, y: Number((light / 1000).toFixed(2)), name: garden.plantLabel, color: garden.color, time: String(tempPoint.time) }];
      }

      if (correlationPair === "soil-light") {
        if (!isFiniteMetric(humiditySoil) || !isFiniteMetric(light)) return [];
        return [{ x: humiditySoil, y: Number((light / 1000).toFixed(2)), name: garden.plantLabel, color: garden.color, time: String(tempPoint.time) }];
      }

      if (!isFiniteMetric(temperature) || !isFiniteMetric(humiditySoil)) return [];
      return [{ x: temperature, y: humiditySoil, name: garden.plantLabel, color: garden.color, time: String(tempPoint.time) }];
    });
  });

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

          <div className="rounded-[8px] border border-[#E2E8E4] bg-white px-3 py-2 text-[0.8125rem] text-[#5C7A6A]">
            Cập nhật dữ liệu mỗi 10 giây từ database
          </div>
        </div>

        {loading && <div className="card p-6 text-[0.875rem] text-[#5C7A6A]">Đang tải dashboard từ database...</div>}

        {error && (
          <div className="max-w-3xl">
            <ErrorState title="Không thể tải dashboard" description={error} />
          </div>
        )}

        {!loading && !error && (
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
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Biểu đồ xu hướng nhiệt độ</h3>
                  <span className="text-[0.75rem] text-[#5C7A6A]">{selectedRange.label}</span>
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={temperatureSeries}>
                      <CartesianGrid stroke="#E2E8E4" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      {chartGardens.map((garden) => (
                        <Line
                          key={garden.id}
                          type={isShortRange ? "stepAfter" : "monotone"}
                          dataKey={garden.id}
                          stroke={garden.color}
                          strokeWidth={2}
                          dot={isShortRange ? { r: 2 } : false}
                          activeDot={{ r: 4 }}
                          name={garden.plantLabel}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Biểu đồ kết hợp nhiệt độ - độ ẩm - ánh sáng</h3>
                  <span className="text-[0.75rem] text-[#5C7A6A]">Combo chart</span>
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={combinedTrendData}>
                      <CartesianGrid stroke="#E2E8E4" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="avgHumidity" fill="#2980B9" name="Độ ẩm đất TB (%)" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="left" type="monotone" dataKey="avgTemp" stroke="#E67E22" strokeWidth={2} dot={false} name="Nhiệt độ TB (°C)" />
                      <Line yAxisId="right" type="monotone" dataKey="avgLight" stroke="#F39C12" strokeWidth={2} dot={false} name="Ánh sáng TB (k lux)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">So sánh chỉ số giữa các khu vườn</h3>
                  <select
                    className="rounded-[8px] border border-[#E2E8E4] bg-white px-3 py-2 text-[0.75rem] text-[#1A2E1F]"
                    value={comparisonMetric}
                    onChange={(event) => setComparisonMetric(event.target.value as ComparisonMetric)}
                  >
                    <option value="temperature">Nhiệt độ</option>
                    <option value="humiditySoil">Độ ẩm đất</option>
                    <option value="light">Ánh sáng</option>
                  </select>
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonChartData}>
                      <CartesianGrid stroke="#E2E8E4" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {comparisonChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Tương quan giữa các chỉ số</h3>
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
                        <XAxis dataKey="x" name="Trục X" tick={{ fontSize: 10, fill: "#5C7A6A" }} />
                        <YAxis dataKey="y" name="Trục Y" tick={{ fontSize: 10, fill: "#5C7A6A" }} />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          formatter={(value) => (typeof value === "number" ? value.toFixed(2) : String(value ?? ""))}
                          labelFormatter={(_, points) => {
                            const point = points?.[0]?.payload as CorrelationPoint | undefined;
                            return point ? `${point.name} • ${point.time}` : "";
                          }}
                        />
                        <Scatter data={correlationData} fill="#1B4332">
                          {correlationData.map((entry, index) => (
                            <Cell key={`${entry.name}-${entry.time}-${index}`} fill={entry.color} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.9fr]">
              <div className="card p-5">
                <h3 className="mb-4 text-[0.9375rem] font-semibold text-[#1A2E1F]">Bảng so sánh nhanh khu vườn</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-[#E2E8E4] bg-[#F7F8F6]">
                      <tr>
                        <th className="px-5 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A]">Khu vườn</th>
                        <th className="px-5 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A]">Nhiệt độ</th>
                        <th className="px-5 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A]">Độ ẩm đất</th>
                        <th className="px-5 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A]">Ánh sáng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8E4]">
                      {comparisonRows.map((row) => (
                        <tr key={row.id} className="hover:bg-[#F7F8F6]">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                              <span className="text-[0.875rem] font-medium text-[#1A2E1F]">{row.label}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono-data font-bold text-[#1A2E1F]">{row.temperature}°C</td>
                          <td className="px-5 py-3 font-mono-data font-bold text-[#1A2E1F]">{row.humiditySoil}%</td>
                          <td className="px-5 py-3 font-mono-data font-bold text-[#1A2E1F]">{row.light}k lux</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="mb-4 text-[0.9375rem] font-semibold text-[#1A2E1F]">Cơ cấu cảnh báo</h3>
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
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Khu vườn theo dõi</h3>
                </div>
                <p className="text-[1.875rem] font-bold text-[#1A2E1F]">{payload.gardens.length}</p>
              </div>
              <div className="card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-[#C0392B]" />
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Cảnh báo trong kỳ</h3>
                </div>
                <p className="text-[1.875rem] font-bold text-[#1A2E1F]">{payload.alerts.length}</p>
              </div>
              <div className="card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Clock3 size={16} className="text-[#2980B9]" />
                  <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Lịch tưới đang áp dụng</h3>
                </div>
                <p className="text-[1.875rem] font-bold text-[#1A2E1F]">{payload.schedules.length}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
