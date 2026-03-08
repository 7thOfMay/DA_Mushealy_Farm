"use client";

import { useState } from "react";
import { Download, Thermometer, Droplets, Sun, Clock } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { gardens, temperatureChartData, humiditySoilChartData, lightChartData } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

type DateRange = "today" | "7days" | "30days" | "custom";

const summaryStats = [
  { label: "Nhiệt độ TB", value: "27.8", unit: "°C", icon: Thermometer, color: "#E67E22" },
  { label: "Độ ẩm đất TB", value: "65.7", unit: "%", icon: Droplets, color: "#2980B9" },
  { label: "Giờ bơm tổng", value: "18.5", unit: "h", icon: Clock, color: "#1B4332" },
  { label: "Ngày tăng trưởng", value: "127", unit: "ngày", icon: Sun, color: "#F39C12" },
];

const comparisonData = [
  { garden: "Cải Xanh", temp: 26.4, humidity: 74, light: 12.4, color: "#1B4332" },
  { garden: "Cà Chua", temp: 32.1, humidity: 41, light: 18.7, color: "#E67E22" },
  { garden: "Nha Đam", temp: 28.8, humidity: 82, light: 9.2, color: "#2980B9" },
];

const alertTypesData = [
  { name: "Nhiệt độ", value: 3, color: "#C0392B" },
  { name: "Độ ẩm", value: 5, color: "#2980B9" },
  { name: "Ánh sáng", value: 2, color: "#F39C12" },
  { name: "Thiết bị", value: 1, color: "#5C7A6A" },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("7days");

  const dateRangeButtons: { key: DateRange; label: string }[] = [
    { key: "today", label: "Hôm nay" },
    { key: "7days", label: "7 ngày" },
    { key: "30days", label: "30 ngày" },
    { key: "custom", label: "Tùy chọn" },
  ];

  return (
    <div>
      <Topbar title="Báo cáo & Phân tích" subtitle="Thống kê tổng hợp hệ thống nông trại" />

      <div className="p-8 space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Date range */}
          <div className="flex items-center gap-2 bg-white border border-[#E2E8E4] rounded-[8px] p-1">
            {dateRangeButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => setDateRange(btn.key)}
                className={cn(
                  "px-3 py-1.5 text-[0.8125rem] font-medium rounded-[6px] transition-colors",
                  dateRange === btn.key ? "bg-[#1B4332] text-white" : "text-[#5C7A6A] hover:bg-[#F0FAF3]"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-[0.875rem] py-2 px-4">
              <Download size={15} />
              Xuất Excel
            </button>
            <button className="btn-primary text-[0.875rem] py-2 px-4">
              <Download size={15} />
              Xuất PDF
            </button>
          </div>
        </div>

        {/* Section 1: Summary stats */}
        <div>
          <h2 className="text-[0.75rem] uppercase tracking-[2px] text-[#5C7A6A] font-semibold mb-3">Tổng hợp vụ mùa</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryStats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: s.color + "18" }}>
                      <Icon size={16} strokeWidth={1.5} style={{ color: s.color }} />
                    </div>
                    <span className="text-[0.75rem] uppercase tracking-wide text-[#5C7A6A] font-semibold">{s.label}</span>
                  </div>
                  <p className="font-bold text-[#1A2E1F]" style={{ fontFamily: "'DM Mono', monospace", fontSize: "2rem" }}>
                    {s.value}
                    <span className="text-[0.875rem] text-[#5C7A6A] ml-1.5">{s.unit}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Trend charts */}
        <div>
          <h2 className="text-[0.75rem] uppercase tracking-[2px] text-[#5C7A6A] font-semibold mb-3">Biểu đồ xu hướng</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Temperature */}
            <div className="card p-5">
              <h3 className="font-semibold text-[0.9375rem] text-[#1A2E1F] mb-4">Nhiệt độ (°C)</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={temperatureChartData.filter((_, i) => i % 3 === 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E4" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} domain={[15, 40]} />
                    <Tooltip />
                    {gardens.map((g) => (
                      <Line key={g.id} type="monotone" dataKey={`garden${g.id.slice(1)}`} stroke={g.color} strokeWidth={2} dot={false} name={g.plantLabel} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Soil humidity */}
            <div className="card p-5">
              <h3 className="font-semibold text-[0.9375rem] text-[#1A2E1F] mb-4">Độ ẩm đất (%)</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={humiditySoilChartData.filter((_, i) => i % 3 === 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E4" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip />
                    {gardens.map((g) => (
                      <Line key={g.id} type="monotone" dataKey={`garden${g.id.slice(1)}`} stroke={g.color} strokeWidth={2} dot={false} name={g.plantLabel} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Garden comparison table */}
        <div>
          <h2 className="text-[0.75rem] uppercase tracking-[2px] text-[#5C7A6A] font-semibold mb-3">So sánh khu vườn</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F7F8F6] border-b border-[#E2E8E4]">
                <tr>
                  <th className="text-left px-5 py-3 text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold">Khu vườn</th>
                  <th className="text-left px-5 py-3 text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold">Nhiệt độ TB</th>
                  <th className="text-left px-5 py-3 text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold">Độ ẩm đất TB</th>
                  <th className="text-left px-5 py-3 text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold">Ánh sáng TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4]">
                {comparisonData.map((row) => {
                  const bestTemp = comparisonData.reduce((a, b) => a.temp < b.temp ? a : b).garden === row.garden;
                  const bestHumidity = comparisonData.reduce((a, b) => a.humidity > b.humidity ? a : b).garden === row.garden;
                  const bestLight = comparisonData.reduce((a, b) => a.light > b.light ? a : b).garden === row.garden;
                  return (
                    <tr key={row.garden} className="hover:bg-[#F7F8F6]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="font-medium text-[0.875rem] text-[#1A2E1F]">{row.garden}</span>
                        </div>
                      </td>
                      <td className={cn("px-5 py-3 font-mono-data font-bold", bestTemp ? "text-[#27AE60]" : "text-[#1A2E1F]")}>
                        {row.temp}°C {bestTemp && <span className="text-[0.625rem] bg-[#27AE60]/15 text-[#27AE60] px-1 rounded ml-1">TỐTINHẤT</span>}
                      </td>
                      <td className={cn("px-5 py-3 font-mono-data font-bold", bestHumidity ? "text-[#27AE60]" : "text-[#1A2E1F]")}>
                        {row.humidity}% {bestHumidity && <span className="text-[0.625rem] bg-[#27AE60]/15 text-[#27AE60] px-1 rounded ml-1">TỐTNHẤT</span>}
                      </td>
                      <td className={cn("px-5 py-3 font-mono-data font-bold", bestLight ? "text-[#27AE60]" : "text-[#1A2E1F]")}>
                        {row.light}k lux {bestLight && <span className="text-[0.625rem] bg-[#27AE60]/15 text-[#27AE60] px-1 rounded ml-1">TỐTNHẤT</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4 & 5: Light chart + Alert pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Light chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-[0.9375rem] text-[#1A2E1F] mb-4">Tích lũy ánh sáng (lux × 1000)</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lightChartData.filter((_, i) => i % 4 === 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E4" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => typeof v === "number" ? `${(v / 1000).toFixed(1)}k lux` : v} />
                  {gardens.map((g) => (
                    <Bar key={g.id} dataKey={`garden${g.id.slice(1)}`} fill={g.color} name={g.plantLabel} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alert types pie */}
          <div className="card p-5">
            <h3 className="font-semibold text-[0.9375rem] text-[#1A2E1F] mb-4">Phân loại cảnh báo</h3>
            <div className="flex items-center gap-4">
              <div className="h-[180px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={alertTypesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                      {alertTypesData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {alertTypesData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-[0.8125rem] text-[#5C7A6A]">{entry.name}</span>
                    <span className="text-[0.8125rem] font-bold text-[#1A2E1F] ml-1" style={{ fontFamily: "'DM Mono', monospace" }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
