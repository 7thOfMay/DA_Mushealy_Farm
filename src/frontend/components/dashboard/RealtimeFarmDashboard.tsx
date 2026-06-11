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

const WINDOW_OPTIONS = [
  { value: 10, label: "10 phut" },
  { value: 15, label: "15 phut" },
  { value: 60, label: "1 gio" },
] as const;

const RESOLUTION_OPTIONS = [
  { value: 500, label: "500ms" },
  { value: 1000, label: "1 giay" },
  { value: 5000, label: "5 giay" },
  { value: 10000, label: "10 giay" },
] as const;

const METRICS: Array<{
  key: MetricKey;
  label: string;
  unit: string;
  icon: typeof Thermometer;
  domain: [number, number];
}> = [
  { key: "temperature", label: "Nhiet do", unit: "°C", icon: Thermometer, domain: [15, 40] },
  { key: "humidityAir", label: "Am khong khi", unit: "%", icon: Droplets, domain: [30, 100] },
  { key: "humiditySoil", label: "Am dat", unit: "%", icon: Activity, domain: [0, 100] },
  { key: "light", label: "Anh sang", unit: "lux", icon: SunMedium, domain: [0, 25000] },
];

function getMetricValue(summary: ReturnType<typeof useAppStore.getState>["sensorSummaries"][number], metric: MetricKey) {
  if (metric === "temperature") return summary.temperature;
  if (metric === "humidityAir") return summary.humidityAir;
  if (metric === "humiditySoil") return summary.humiditySoil;
  return summary.light;
}

function formatSummaryValue(metric: MetricKey, value: number) {
  if (metric === "light") return Math.round(value).toLocaleString("vi-VN");
  return value.toFixed(1);
}

function formatResolutionLabel(bucketMs: number) {
  if (bucketMs < 1000) return `${bucketMs}ms`;
  if (bucketMs % 1000 === 0) return `${bucketMs / 1000} giay`;
  return `${(bucketMs / 1000).toFixed(1)} giay`;
}

function formatTickLabel(value: string, bucketMs: number) {
  const [time, milliseconds] = value.split(".");
  const timeParts = time.split(":");
  if (timeParts.length !== 3) return value;

  const suffix = `${timeParts[1]}:${timeParts[2]}`;
  if (bucketMs < 1000 && milliseconds) {
    return `${suffix}.${milliseconds}`;
  }
  return suffix;
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
  const [windowMinutes, setWindowMinutes] = useState<number>(15);
  const [bucketMs, setBucketMs] = useState<number>(5000);
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sensorSummaries = useAppStore((state) => state.sensorSummaries);

  const chartGardens = useMemo(() => farmGardens.slice(0, 3), [farmGardens]);
  const chartGardenIds = useMemo(() => chartGardens.map((garden) => garden.id).join("|"), [chartGardens]);
  const activeConfig = METRICS.find((metric) => metric.key === activeMetric) ?? METRICS[0];
  const refreshMs = Math.min(10_000, Math.max(3_000, bucketMs >= 5000 ? bucketMs : 3_000));

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
          windowMinutes: String(windowMinutes),
          resolution: "realtime",
          bucketMs: String(bucketMs),
        });
        gardenIds.forEach((gardenId) => params.append("gardenId", gardenId));

        const response = await fetch(`/api/sensors/chart?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Khong the tai du lieu realtime");
        }

        const next = (await response.json()) as ChartResponse;
        if (!cancelled) {
          setChartData(next);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Khong the tai du lieu realtime");
          setLoading(false);
        }
      }
    };

    setLoading(true);
    void loadChart();
    const interval = setInterval(loadChart, refreshMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [bucketMs, chartGardenIds, refreshMs, windowMinutes]);

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
    return chartGardens
      .map((garden) => {
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
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [activeMetric, chartGardens, sensorSummaries]);

  return (
    <section className="card p-5" data-tour="farm-realtime-dashboard">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[0.72rem] uppercase tracking-[0.22em] text-[#5C7A6A]">Realtime monitor</p>
          <h3 className="text-[1.15rem] font-semibold text-[#1A2E1F]">
            Dashboard realtime {windowMinutes} phut gan nhat
          </h3>
          <p className="text-[0.82rem] text-[#5C7A6A]">
            Doc DB theo cua so ngan va bucket {formatResolutionLabel(bucketMs)} de theo doi du lieu day.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-[#D6E1D8] bg-[#F7F8F6] p-1">
            {WINDOW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setWindowMinutes(option.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-[0.78rem] transition-colors",
                  windowMinutes === option.value
                    ? "bg-[#1B4332] text-white"
                    : "text-[#2F5D45] hover:bg-[#EAF3ED]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-[#D6E1D8] bg-[#F7F8F6] p-1">
            {RESOLUTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setBucketMs(option.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-[0.78rem] transition-colors",
                  bucketMs === option.value
                    ? "bg-[#1B4332] text-white"
                    : "text-[#2F5D45] hover:bg-[#EAF3ED]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="rounded-full border border-[#D6E1D8] bg-[#F7F8F6] px-3 py-1 text-[0.78rem] text-[#2F5D45]">
            Toi da {chartGardens.length} khu vuon hien thi dong thoi
          </div>
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
              type="button"
              onClick={() => setActiveMetric(metric.key)}
              className={cn(
                "rounded-[14px] border px-4 py-3 text-left transition-all",
                activeMetric === metric.key
                  ? "border-[#1B4332] bg-[#EAF3ED] text-[#163928] shadow-[0_16px_40px_rgba(27,67,50,0.12)]"
                  : "border-[#E2E8E4] bg-[#F7F8F6] text-[#1A2E1F] hover:border-[#B7CDBE]",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon size={16} className={activeMetric === metric.key ? "text-[#1B4332]" : "text-[#2F5D45]"} />
                <span className={cn("text-[0.72rem]", activeMetric === metric.key ? "text-[#426854]" : "text-[#5C7A6A]")}>
                  trung binh realtime
                </span>
              </div>
              <p className={cn("text-[0.82rem] font-semibold", activeMetric === metric.key ? "text-[#163928]" : "text-[#1A2E1F]")}>
                {metric.label}
              </p>
              <p className={cn("mt-1 text-[1.2rem] font-bold", activeMetric === metric.key ? "text-[#163928]" : "text-[#1A2E1F]")}>
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
              Cap nhat: {new Date(card.updatedAt).toLocaleTimeString("vi-VN")}
            </p>
          </div>
        ))}
      </div>

      <div className="h-[340px] rounded-[16px] border border-[#E2E8E4] bg-[#FCFDFC] p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[#5C7A6A]">
            Mushy dang lay du lieu ban doi xiu nhe!
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-center text-[#A33A2B]">{error}</div>
        ) : series.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[#5C7A6A]">
            Chua co du du lieu realtime trong cua so {windowMinutes} phut gan nhat.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#E6ECE8" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                minTickGap={bucketMs < 1000 ? 46 : 28}
                tick={{ fontSize: 11, fill: "#5C7A6A", fontFamily: "'DM Mono', monospace" }}
                tickFormatter={(value) => formatTickLabel(value, bucketMs)}
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
                  strokeWidth={2.2}
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
