"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  temperatureChartData,
  humidityAirChartData,
  humiditySoilChartData,
  lightChartData,
} from "@/lib/mockData";
import { gardens } from "@/lib/mockData";

type TabKey = "temperature" | "humidity_air" | "humidity_soil" | "light";

const tabConfig: {
  key: TabKey;
  label: string;
  unit: string;
  threshold?: number;
  domain: [number, number];
}[] = [
  { key: "temperature", label: "Nhiệt độ", unit: "°C", threshold: 30, domain: [15, 40] },
  { key: "humidity_air", label: "Độ ẩm KK", unit: "%", threshold: 85, domain: [30, 100] },
  { key: "humidity_soil", label: "Độ ẩm đất", unit: "%", threshold: 50, domain: [0, 100] },
  { key: "light", label: "Ánh sáng", unit: "lux", domain: [0, 25000] },
];

const dataMap: Record<TabKey, typeof temperatureChartData> = {
  temperature: temperatureChartData,
  humidity_air: humidityAirChartData,
  humidity_soil: humiditySoilChartData,
  light: lightChartData,
};

interface TooltipEntry { dataKey: string; name: string; value: number; color: string; }
interface CustomTooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string; unit: string; threshold?: number; }
function CustomTooltip({ active, payload, label, unit, threshold }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E2E8E4] rounded-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] p-3 min-w-[160px]">
      <p className="text-[0.6875rem] text-[#5C7A6A] font-semibold uppercase tracking-wide mb-2">{label}</p>
      {payload.map((p: TooltipEntry) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <span className="text-[0.75rem] text-[#5C7A6A]">{p.name}</span>
          <span
            className="text-[0.8125rem] font-bold"
            style={{
              fontFamily: "'DM Mono', monospace",
              color: threshold && p.value > threshold ? "#E67E22" : p.color,
            }}
          >
            {p.value}{unit}
          </span>
        </div>
      ))}
      {threshold && (
        <div className="mt-2 pt-2 border-t border-[#E2E8E4]">
          <p className="text-[0.6875rem] text-[#E67E22]">Ngưỡng: {threshold}{unit}</p>
        </div>
      )}
    </div>
  );
}

export function SensorChart() {
  const [activeTab, setActiveTab] = useState<TabKey>("temperature");
  const config = tabConfig.find((t) => t.key === activeTab)!;
  const data = dataMap[activeTab];

  // Show every 2 hours on x-axis
  const tickFormatter = (v: string) => v.endsWith(":00") && parseInt(v.split(":")[0]) % 2 === 0 ? v : "";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[1.0625rem] text-[#1A2E1F]">Dữ liệu cảm biến (24h)</h2>
        <div className="flex gap-1">
          {tabConfig.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "px-3 py-1.5 text-[0.75rem] font-semibold rounded-[6px] transition-colors",
                activeTab === t.key
                  ? "bg-[#1B4332] text-white"
                  : "text-[#5C7A6A] hover:bg-[#F0FAF3]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Garden legend */}
      <div className="flex items-center gap-4 mb-4">
        {gardens.map((g) => (
          <div key={g.id} className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: g.color }} />
            <span className="text-[0.75rem] text-[#5C7A6A]">{g.plantLabel}</span>
          </div>
        ))}
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E4" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#5C7A6A", fontFamily: "'DM Mono', monospace" }}
              tickFormatter={tickFormatter}
              axisLine={{ stroke: "#E2E8E4" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#5C7A6A", fontFamily: "'DM Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              domain={config.domain}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={<CustomTooltip unit={config.unit} threshold={config.threshold} />}
            />
            {config.threshold && (
              <ReferenceLine
                y={config.threshold}
                stroke="#E67E22"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: `Ngưỡng ${config.threshold}${config.unit}`, position: "insideTopRight", fontSize: 10, fill: "#E67E22" }}
              />
            )}
            {gardens.map((g) => (
              <Line
                key={g.id}
                type="monotone"
                dataKey={`garden${g.id.slice(1)}`}
                stroke={g.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                name={g.plantLabel}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
