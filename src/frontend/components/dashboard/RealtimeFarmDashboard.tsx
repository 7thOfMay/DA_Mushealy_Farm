"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Droplets, SunMedium, Thermometer } from "lucide-react";
import { useAppStore } from "@/frontend/context/store";
import { cn } from "@/frontend/utils/utils";
import type { ChartDataPoint, Garden } from "@/types";

type MetricKey = "temperature" | "humidityAir" | "humiditySoil" | "light";

type ChartResponse = {
  temperatureChartData: ChartDataPoint[];
  humidityAirChartData: ChartDataPoint[];
  humiditySoilChartData: ChartDataPoint[];
  lightChartData: ChartDataPoint[];
};

const METRICS: Array<{
  key: MetricKey;
  label: string;
  unit: string;
  icon: typeof Thermometer;
  domain: [number, number];
}> = [
  { key: "temperature", label: "Nhiệt độ", unit: "°C", icon: Thermometer, domain: [15, 40] },
  { key: "humidityAir", label: "Ẩm không khí", unit: "%", icon: Droplets, domain: [30, 100] },
  { key: "humiditySoil", label: "Ẩm đất", unit: "%", icon: Activity, domain: [0, 100] },
  { key: "light", label: "Ánh sáng", unit: "lux", icon: SunMedium, domain: [0, 25000] },
];

function getMetricValue(summary: ReturnType<typeof useAppStore.getState>["sensorSummaries"][number], metric: MetricKey) {
  if (metric === "temperature") return summary.temperature;
  if (metric === "humidityAir") return summary.humidityAir;
  if (metric === "humiditySoil") return summary.humiditySoil;
  return summary.light;
}

function formatSummaryValue(metric: MetricKey, value: number) {
  if (metric === "light") return value.toLocaleString("vi-VN");
  return value.toFixed(1);
}

function formatTickLabel(value: string) {
  const parts = value.split(":");
  if (parts.length === 3) return `${parts[1]}:${parts[2]}`;
  return value;
}

function RealtimeTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; name: string; value: number; color: string }>;
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[12px] border border-white/10 bg-[#10281d]/95 px-3 py-2 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      <p className="mb-2 text-[0.7rem] uppercase tracking-[0.2em] text-white/60">{label}</p>
      {payload.map((item) => (
        <div key={item.dataKey} className="mb-1 flex min-w-[170px] items-center justify-between gap-4 last:mb-0">
          <span className="text-[0.78rem] text-white/75">{item.name}</span>
          <span className="font-semibold" style={{ color: item.color }}>
            {item.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RealtimeFarmDashboard({ farmGardens }: { farmGardens: Garden[] }) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("temperature");
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sensorSummaries = useAppStore((state) => state.sensorSummaries);

  const chartGardens = useMemo(() => farmGardens.slice(0, 3), [farmGardens]);
  const chartGardenIds = useMemo(() => chartGardens.map((garden) => garden.id).join("|"), [chartGardens]);
  const activeConfig = METRICS.find((metric) => metric.key === activeMetric) ?? METRICS[0];

  useEffect(() => {
    if (!chartGardenIds) {
      setChartData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadChart = async () => {
      try {
        const gardenIds = chartGardenIds.split("|").filter(Boolean);
        const params = new URLSearchParams({
          hours: "1",
          resolution: "realtime",
          bucketSeconds: "5",
        });
        gardenIds.forEach((gardenId) => params.append("gardenId", gardenId));

        const response = await fetch(`/api/sensors/chart?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Không thể tải dữ liệu realtime");
        }

        const next = (await response.json()) as ChartResponse;
        if (!cancelled) {
          setChartData(next);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không thể tải dữ liệu realtime");
          setLoading(false);
        }
      }
    };

    void loadChart();
    const interval = setInterval(loadChart, 5_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [chartGardenIds]);

  const series = useMemo(() => {
    if (!chartData) return [];

    const sourceMap: Record<MetricKey, ChartDataPoint[]> = {
      temperature: chartData.temperatureChartData,
      humidityAir: chartData.humidityAirChartData,
      humiditySoil: chartData.humiditySoilChartData,
      light: chartData.lightChartData,
    };

    return sourceMap[activeMetric].map((point) => {
      const nextPoint: Record<string, string | number> = { time: point.time };
      chartGardens.forEach((_, index) => {
        const key = `garden${index + 1}` as keyof ChartDataPoint;
        const value = point[key];
        if (typeof value === "number") {
          nextPoint[`garden${index + 1}`] = Number(value.toFixed(activeMetric === "light" ? 0 : 2));
        }
      });
      return nextPoint;
    });
  }, [activeMetric, chartData, chartGardens]);

  const latestCards = useMemo(() => {
    return chartGardens.map((garden) => {
      const summary = sensorSummaries.find((item) => item.gardenId === garden.id);
      if (!summary) return null;
      return {
        id: garden.id,
        name: garden.name,
        color: garden.color,
        numericValue: getMetricValue(summary, activeMetric),
        value: formatSummaryValue(activeMetric, getMetricValue(summary, activeMetric)),
        updatedAt: summary.updatedAt,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [activeMetric, chartGardens, sensorSummaries]);

  return (
    <section className="card p-5" data-tour="farm-realtime-dashboard">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[0.72rem] uppercase tracking-[0.22em] text-[#5C7A6A]">Realtime monitor</p>
          <h3 className="text-[1.15rem] font-semibold text-[#1A2E1F]">Dashboard realtime 1 giờ gần nhất</h3>
          <p className="text-[0.82rem] text-[#5C7A6A]">
            Ghi dữ liệu từ DB theo nhịp 5 giây để demo cảm biến và thiết bị rõ hơn.
          </p>
        </div>
        <div className="rounded-full border border-[#D6E1D8] bg-[#F7F8F6] px-3 py-1 text-[0.78rem] text-[#2F5D45]">
          Tối đa {chartGardens.length} khu vườn hiển thị đồng thời
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          const values = latestCards.map((item) => item.numericValue).filter((value) => Number.isFinite(value));
          const avg = values.length
            ? metric.key === "light"
              ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
              : values.reduce((sum, value) => sum + value, 0) / values.length
            : null;

          return (
            <button
              key={metric.key}
              onClick={() => setActiveMetric(metric.key)}
              className={cn(
                "rounded-[14px] border px-4 py-3 text-left transition-all",
                activeMetric === metric.key
                  ? "border-[#1B4332] bg-[#163d2d] text-white shadow-[0_16px_40px_rgba(27,67,50,0.18)]"
                  : "border-[#E2E8E4] bg-[#F7F8F6] text-[#1A2E1F] hover:border-[#B7CDBE]",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon size={16} className={activeMetric === metric.key ? "text-[#DDEBDF]" : "text-[#2F5D45]"} />
                <span className={cn("text-[0.72rem]", activeMetric === metric.key ? "text-white/70" : "text-[#5C7A6A]")}>
                  trung bình realtime
                </span>
              </div>
              <p className={cn("text-[0.82rem] font-semibold", activeMetric === metric.key ? "text-white" : "text-[#1A2E1F]")}>
                {metric.label}
              </p>
              <p className={cn("mt-1 text-[1.2rem] font-bold", activeMetric === metric.key ? "text-white" : "text-[#1A2E1F]")}>
                {avg === null ? "--" : metric.key === "light" ? Math.round(avg).toLocaleString("vi-VN") : avg.toFixed(1)}
                <span className="ml-1 text-[0.8rem] font-medium">{metric.unit}</span>
              </p>
            </button>
          );
        })}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        {latestCards.map((card) => (
          <div key={card.id} className="rounded-[14px] border border-[#E2E8E4] bg-white px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: card.color }} />
                <p className="font-semibold text-[#1A2E1F]">{card.name}</p>
              </div>
              <span className="rounded-full bg-[#F0FAF3] px-2.5 py-1 text-[0.72rem] text-[#2F5D45]">live</span>
            </div>
            <p className="text-[1.3rem] font-bold text-[#1A2E1F]">
              {card.value} {activeConfig.unit}
            </p>
            <p className="mt-1 text-[0.76rem] text-[#5C7A6A]">
              Cập nhật: {new Date(card.updatedAt).toLocaleTimeString("vi-VN")}
            </p>
          </div>
        ))}
      </div>

      <div className="h-[340px] rounded-[16px] border border-[#E2E8E4] bg-[#FCFDFC] p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[#5C7A6A]">
            Mushy đang lấy dữ liệu bạn đợi xíu nhé!
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-center text-[#A33A2B]">{error}</div>
        ) : series.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[#5C7A6A]">
            Chưa có đủ dữ liệu realtime trong 1 giờ gần nhất.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#E6ECE8" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                minTickGap={28}
                tick={{ fontSize: 11, fill: "#5C7A6A", fontFamily: "'DM Mono', monospace" }}
                tickFormatter={formatTickLabel}
                axisLine={{ stroke: "#E2E8E4" }}
                tickLine={false}
              />
              <YAxis
                domain={activeConfig.domain}
                tick={{ fontSize: 11, fill: "#5C7A6A", fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<RealtimeTooltip unit={activeConfig.unit} />} />
              {chartGardens.map((garden, index) => (
                <Line
                  key={garden.id}
                  type="monotone"
                  dataKey={`garden${index + 1}`}
                  stroke={garden.color}
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name={garden.name}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
