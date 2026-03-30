"use client";

import { useEffect, useState } from "react";
import { Thermometer, Droplets, Sun, Clock } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { ExportConfig, type ExportFormat } from "@/components/reports/ExportConfig";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { ErrorState } from "@/components/shared/ErrorStates";
import { useAppStore } from "@/lib/store";
import { getManagedFarmers, getVisibleFarmsForViewer } from "@/lib/dataScope";
import type { GardenSensorSummary } from "@/types";

import { cn } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

type DateRange = "today" | "7days" | "30days" | "custom";

export default function ReportsPage() {
  const farms = useAppStore((state) => state.farms);
  const users = useAppStore((state) => state.users);
  const selectedFarmerId = useAppStore((state) => state.selectedFarmerId);
  const setSelectedFarmerId = useAppStore((state) => state.setSelectedFarmerId);
  const currentFarmId = useAppStore((state) => state.currentFarmId);
  const gardens = useAppStore((state) => state.gardens);
  const alerts = useAppStore((state) => state.alerts);
  const schedules = useAppStore((state) => state.schedules);
  const addLog = useAppStore((state) => state.addLog);
  const addToast = useAppStore((state) => state.addToast);
  const loggedInUser = useAppStore((state) => state.loggedInUser);
  const sensorSummaries = useAppStore((state) => state.sensorSummaries);
  const temperatureChartData = useAppStore((state) => state.temperatureChartData);
  const humiditySoilChartData = useAppStore((state) => state.humiditySoilChartData);
  const lightChartData = useAppStore((state) => state.lightChartData);

  const [dateRange, setDateRange] = useState<DateRange>("7days");
  const [isMounted, setIsMounted] = useState(false);

  const managedFarmers = getManagedFarmers(users, loggedInUser);
  const visibleFarms = getVisibleFarmsForViewer({ farms, users, loggedInUser, selectedFarmerId });

  const selectedFarm = visibleFarms.find((farm) => farm.id === currentFarmId) ?? visibleFarms[0] ?? null;
  const farmGardens = gardens.filter((garden) => garden.farmId === selectedFarm?.id);
  const farmGardenIds = new Set(farmGardens.map((garden) => garden.id));
  const farmAlerts = alerts.filter((alert) => farmGardenIds.has(alert.gardenId));
  const farmSchedules = schedules.filter((schedule) => farmGardenIds.has(schedule.gardenId));
  const chartGardens = farmGardens.slice(0, 3);

  const mapSeriesByFarm = (data: typeof temperatureChartData) =>
    data.map((point) => {
      const row: Record<string, string | number> = { time: point.time };
      chartGardens.forEach((garden, idx) => {
        const sourceKey = `garden${idx + 1}` as "garden1" | "garden2" | "garden3";
        row[garden.id] = Number(point[sourceKey] ?? 0);
      });
      return row;
    });

  const temperatureSeries = mapSeriesByFarm(temperatureChartData);
  const humiditySoilSeries = mapSeriesByFarm(humiditySoilChartData);
  const lightSeries = mapSeriesByFarm(lightChartData);

  const summaries = farmGardens
    .map((garden) => sensorSummaries.find((summary) => summary.gardenId === garden.id) ?? null)
    .filter((s): s is GardenSensorSummary => s !== null);

  const avgTemperature = summaries.length
    ? summaries.reduce((sum, summary) => sum + summary.temperature, 0) / summaries.length
    : 0;
  const avgSoilHumidity = summaries.length
    ? summaries.reduce((sum, summary) => sum + summary.humiditySoil, 0) / summaries.length
    : 0;

  const estimatedPumpHours = (farmSchedules.reduce((sum, schedule) => {
    if (schedule.action !== "ON") return sum;
    if (schedule.timeConfig?.durationMin) return sum + schedule.timeConfig.durationMin;
    if (schedule.thresholdConfig?.durationMin) return sum + schedule.thresholdConfig.durationMin;
    return sum + 30;
  }, 0) / 60) * (dateRange === "today" ? 1 : dateRange === "7days" ? 7 : 30);

  const avgGrowthDays = farmGardens.length
    ? farmGardens.reduce((sum, garden) => sum + Math.max(0, Math.floor((Date.now() - new Date(garden.createdAt).getTime()) / (24 * 60 * 60 * 1000))), 0) / farmGardens.length
    : 0;

  const summaryStats = [
    { label: "Nhiệt độ TB", value: avgTemperature.toFixed(1), unit: "°C", icon: Thermometer, color: "#E67E22" },
    { label: "Độ ẩm đất TB", value: avgSoilHumidity.toFixed(1), unit: "%", icon: Droplets, color: "#2980B9" },
    { label: "Giờ bơm ước tính", value: estimatedPumpHours.toFixed(1), unit: "h", icon: Clock, color: "#1B4332" },
    { label: "Ngày tăng trưởng", value: avgGrowthDays.toFixed(0), unit: "ngày", icon: Sun, color: "#F39C12" },
  ];

  const comparisonData = farmGardens
    .map((garden) => {
      const summary = sensorSummaries.find((item) => item.gardenId === garden.id);
      if (!summary) return null;
      return {
        garden: garden.plantLabel,
        temp: summary.temperature,
        humidity: summary.humiditySoil,
        light: Number((summary.light / 1000).toFixed(1)),
        color: garden.color,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const alertTypesData = [
    { name: "Nhiệt độ", value: farmAlerts.filter((alert) => alert.sensorType === "temperature").length, color: "#C0392B" },
    { name: "Độ ẩm", value: farmAlerts.filter((alert) => alert.sensorType === "humidity_air" || alert.sensorType === "humidity_soil").length, color: "#2980B9" },
    { name: "Ánh sáng", value: farmAlerts.filter((alert) => alert.sensorType === "light").length, color: "#F39C12" },
    { name: "Thiết bị", value: farmAlerts.filter((alert) => !alert.sensorType).length, color: "#5C7A6A" },
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const dateRangeButtons: { key: DateRange; label: string }[] = [
    { key: "today", label: "Hôm nay" },
    { key: "7days", label: "7 ngày" },
    { key: "30days", label: "30 ngày" },
    { key: "custom", label: "Tùy chọn" },
  ];

  const dateRangeLabel = dateRangeButtons.find((item) => item.key === dateRange)?.label ?? "7 ngày";

  const handleExport = (format: ExportFormat, includeCharts: boolean, includeRaw: boolean) => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const safeFarm = (selectedFarm?.name ?? "toan-he-thong").replace(/\s+/g, "-").toLowerCase();

    if (format === "excel") {
      const csvRows = [
        ["Garden", "Temp", "SoilHumidity", "LightKLux"],
        ...comparisonData.map((row) => [row.garden, String(row.temp), String(row.humidity), String(row.light)]),
      ];
      if (includeRaw) {
        csvRows.push([]);
        csvRows.push(["Range", dateRangeLabel]);
        csvRows.push(["Gardens", String(farmGardens.length)]);
        csvRows.push(["Alerts", String(farmAlerts.length)]);
      }
      const csv = csvRows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report_${safeFarm}_${stamp}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      addToast({ type: "success", message: "Đã xuất báo cáo CSV" });
    } else {
      const win = window.open("", "_blank", "width=960,height=720");
      if (win) {
        const lines = comparisonData
          .map((row) => `<tr><td>${row.garden}</td><td>${row.temp}</td><td>${row.humidity}</td><td>${row.light}</td></tr>`)
          .join("");
        win.document.write(`<!doctype html><html><head><title>Report ${safeFarm}</title><style>body{font-family:Arial,sans-serif;padding:24px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;text-align:left} h1{margin:0 0 8px} p{color:#555}</style></head><body><h1>Report: ${selectedFarm?.name ?? "Toàn hệ thống"}</h1><p>Range: ${dateRangeLabel} | Gardens: ${farmGardens.length} | Alerts: ${farmAlerts.length}</p><table><thead><tr><th>Garden</th><th>Temp</th><th>SoilHumidity</th><th>LightKLux</th></tr></thead><tbody>${lines}</tbody></table></body></html>`);
        win.document.close();
        win.focus();
        win.print();
      }
      addToast({ type: "success", message: "Đã mở bản in PDF" });
    }

    addLog({
      id: `log_${Date.now()}`,
      actionType: "CONFIG_CHANGE",
      description: `Xuat bao cao ${format.toUpperCase()} ${selectedFarm?.name ?? "toan he thong"} (charts:${includeCharts ? "1" : "0"}, raw:${includeRaw ? "1" : "0"})`,
      userId: loggedInUser?.id ?? "u1",
      userName: loggedInUser?.name ?? "System Admin",
      timestamp: new Date().toISOString(),
    });
  };

  if (!selectedFarm || farmGardens.length === 0) {
    return (
      <div>
        <Topbar title="Báo cáo & Phân tích" subtitle="Thống kê tổng hợp hệ thống nông trại" />
        <div className="p-8 max-w-3xl">
          <ErrorState
            title="Không có dữ liệu để xuất báo cáo"
            description={loggedInUser?.role === "ADMIN"
              ? "Hãy chọn nông dân ở sidebar/bộ lọc bên dưới hoặc thêm khu vườn trước khi dùng module báo cáo."
              : "Hãy tạo nông trại hoặc thêm khu vườn trước khi dùng module báo cáo."}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Báo cáo & Phân tích" subtitle="Thống kê tổng hợp hệ thống nông trại" />

      <div className="p-8 space-y-6">
        {loggedInUser?.role === "ADMIN" && managedFarmers.length > 0 && (
          <div className="card p-4 max-w-[420px]">
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">
              Nông dân đang xem báo cáo
            </label>
            <select
              className="input-field"
              value={selectedFarmerId ?? managedFarmers[0].id}
              onChange={(event) => setSelectedFarmerId(event.target.value)}
            >
              {managedFarmers.map((farmer) => (
                <option key={farmer.id} value={farmer.id}>{farmer.name}</option>
              ))}
            </select>
          </div>
        )}

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

          <ExportConfig disabled={!selectedFarm} onExport={handleExport} />
        </div>

        <ReportPreview
          farmName={selectedFarm?.name ?? "Toàn hệ thống"}
          dateRangeLabel={dateRangeLabel}
          gardens={farmGardens.length}
          alerts={farmAlerts.length}
          generatedBy={loggedInUser?.name ?? "System Admin"}
        />

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
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={temperatureSeries.filter((_, i) => i % 3 === 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E4" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} domain={[15, 40]} />
                      <Tooltip />
                      {chartGardens.map((g) => (
                        <Line key={g.id} type="monotone" dataKey={g.id} stroke={g.color} strokeWidth={2} dot={false} name={g.plantLabel} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full rounded-[10px] bg-[#F7F8F6] border border-[#E2E8E4]" />
                )}
              </div>
            </div>

            {/* Soil humidity */}
            <div className="card p-5">
              <h3 className="font-semibold text-[0.9375rem] text-[#1A2E1F] mb-4">Độ ẩm đất (%)</h3>
              <div className="h-[200px]">
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={humiditySoilSeries.filter((_, i) => i % 3 === 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E4" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip />
                      {chartGardens.map((g) => (
                        <Line key={g.id} type="monotone" dataKey={g.id} stroke={g.color} strokeWidth={2} dot={false} name={g.plantLabel} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full rounded-[10px] bg-[#F7F8F6] border border-[#E2E8E4]" />
                )}
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
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lightSeries.filter((_, i) => i % 4 === 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E4" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#5C7A6A" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => typeof v === "number" ? `${(v / 1000).toFixed(1)}k lux` : v} />
                    {chartGardens.map((g) => (
                      <Bar key={g.id} dataKey={g.id} fill={g.color} name={g.plantLabel} radius={[2, 2, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full rounded-[10px] bg-[#F7F8F6] border border-[#E2E8E4]" />
              )}
            </div>
          </div>

          {/* Alert types pie */}
          <div className="card p-5">
            <h3 className="font-semibold text-[0.9375rem] text-[#1A2E1F] mb-4">Phân loại cảnh báo</h3>
            <div className="flex items-center gap-4">
              <div className="h-[180px] flex-1">
                {isMounted ? (
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
                ) : (
                  <div className="h-full rounded-[10px] bg-[#F7F8F6] border border-[#E2E8E4]" />
                )}
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
