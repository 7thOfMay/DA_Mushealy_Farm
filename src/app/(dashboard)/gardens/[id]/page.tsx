"use client";

import { useState } from "react";
import { useParams, notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { gardens, sensorSummaries, systemLogs } from "@/lib/mockData";
import { useAppStore } from "@/lib/store";
import { Badge, StatusDot, EmptyState } from "@/components/shared/index";
import { ToggleSwitch } from "@/components/shared/ToggleSwitch";
import { cn, timeAgo, formatDateTime } from "@/lib/utils";
import {
  Thermometer, Droplets, Droplet, Sun, Cpu, Power,
  AlertTriangle, ClipboardList, LayoutDashboard
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { temperatureChartData } from "@/lib/mockData";

const tabs = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "devices", label: "Thiết bị", icon: Cpu },
  { id: "alerts", label: "Cảnh báo", icon: AlertTriangle },
  { id: "logs", label: "Nhật ký", icon: ClipboardList },
];

const statusColors: Record<string, string> = { OK: "#27AE60", WARN: "#E67E22", ALERT: "#C0392B" };
const statusLabels: Record<string, string> = { OK: "Bình thường", WARN: "Cảnh báo", ALERT: "Nguy hiểm" };
const statusBadgeVariant: Record<string, "ok" | "warn" | "danger"> = { OK: "ok", WARN: "warn", ALERT: "danger" };

export default function GardenDetailPage() {
  const params = useParams();
  const gardenId = params.id as string;
  const garden = gardens.find((g) => g.id === gardenId);
  const sensors = sensorSummaries.find((s) => s.gardenId === gardenId);

  const [activeTab, setActiveTab] = useState("overview");
  const storeDevices = useAppStore((s) => s.devices);
  const toggleDevice = useAppStore((s) => s.toggleDevice);
  const addToast = useAppStore((s) => s.addToast);
  const storeAlerts = useAppStore((s) => s.alerts);

  if (!garden || !sensors) return notFound();

  const gardenDevices = storeDevices.filter((d) => d.gardenId === gardenId);
  const gardenAlerts = storeAlerts.filter((a) => a.gardenId === gardenId);
  const gardenLogs = systemLogs.filter((l) => l.gardenId === gardenId);

  const metrics = [
    { icon: Thermometer, label: "Nhiệt độ", value: `${sensors.temperature}`, unit: "°C" },
    { icon: Droplets, label: "Độ ẩm KK", value: `${sensors.humidityAir}`, unit: "%" },
    { icon: Droplet, label: "Độ ẩm đất", value: `${sensors.humiditySoil}`, unit: "%" },
    { icon: Sun, label: "Ánh sáng", value: `${(sensors.light / 1000).toFixed(1)}`, unit: "klux" },
  ];

  return (
    <div>
      <Topbar
        title={garden.name}
        subtitle={`${garden.plantLabel} · ${garden.area ?? ""}`}
      />
      <div className="p-8">
        {/* Hero */}
        <div className="card p-5 mb-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: garden.color + "20" }}>
            <span className="text-[1.5rem]">{garden.plantType === "CAI_XANH" ? "🥬" : garden.plantType === "CA_CHUA" ? "🍅" : "🌵"}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-bold text-[1.25rem] text-[#1A2E1F]">{garden.name}</h2>
              <Badge variant={statusBadgeVariant[garden.status]}>{statusLabels[garden.status]}</Badge>
            </div>
            <p className="text-[0.875rem] text-[#5C7A6A]">{garden.description}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors[garden.status] }} />
            <span className="text-[0.875rem] font-semibold" style={{ color: statusColors[garden.status] }}>
              {statusLabels[garden.status]}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#E2E8E4]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-[0.875rem] font-medium border-b-2 transition-colors -mb-px",
                  activeTab === tab.id
                    ? "border-[#1B4332] text-[#1B4332]"
                    : "border-transparent text-[#5C7A6A] hover:text-[#1A2E1F]"
                )}
              >
                <Icon size={15} strokeWidth={1.5} />
                {tab.label}
                {tab.id === "alerts" && gardenAlerts.filter((a) => a.status !== "RESOLVED").length > 0 && (
                  <span className="bg-[#C0392B] text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full">
                    {gardenAlerts.filter((a) => a.status !== "RESOLVED").length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab: Tổng quan */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Big sensor readings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="card p-5 text-center">
                    <Icon size={22} strokeWidth={1.5} className="text-[#1B4332] mx-auto mb-3" />
                    <p
                      className="text-[#1A2E1F] font-bold leading-none mb-1"
                      style={{ fontFamily: "'DM Mono', monospace", fontSize: "2.75rem" }}
                    >
                      {m.value}
                      <span className="text-[1rem] text-[#5C7A6A] ml-1">{m.unit}</span>
                    </p>
                    <p className="text-[0.75rem] text-[#5C7A6A] uppercase tracking-wide font-semibold">{m.label}</p>
                  </div>
                );
              })}
            </div>

            {/* 7-day trend chart (using 24h data as placeholder) */}
            <div className="card p-5">
              <h3 className="font-semibold text-[1rem] text-[#1A2E1F] mb-4">Xu hướng nhiệt độ (24h)</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={temperatureChartData.filter((_, i) => i % 2 === 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E4" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#5C7A6A" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5C7A6A" }} tickLine={false} axisLine={false} domain={[15, 40]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey={`garden${gardenId.slice(1)}`}
                      stroke={garden.color}
                      strokeWidth={2}
                      dot={false}
                      name="Nhiệt độ"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Thiết bị */}
        {activeTab === "devices" && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F7F8F6] border-b border-[#E2E8E4]">
                <tr>
                  {["ID", "Tên thiết bị", "Loại", "Trạng thái", "Cập nhật cuối", "Điều khiển"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4]">
                {gardenDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-[#F7F8F6] transition-colors">
                    <td className="px-4 py-3 text-[0.75rem] font-mono text-[#5C7A6A]">{d.id.toUpperCase()}</td>
                    <td className="px-4 py-3 text-[0.875rem] font-medium text-[#1A2E1F]">{d.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{d.type === "pump" ? "Máy bơm" : d.type === "led_rgb" ? "Đèn LED" : "Cảm biến"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={d.status} />
                        <span className="text-[0.8125rem] text-[#5C7A6A] capitalize">
                          {d.status === "online" ? "Trực tuyến" : d.status === "offline" ? "Ngoại tuyến" : "Lỗi"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[0.75rem] text-[#5C7A6A]">{timeAgo(d.lastUpdated)}</td>
                    <td className="px-4 py-3">
                      {(d.type === "pump" || d.type === "led_rgb") ? (
                        <ToggleSwitch
                          checked={d.isOn}
                          onChange={() => {
                            toggleDevice(d.id);
                            addToast({ type: "success", message: `${d.isOn ? "Đã tắt" : "Đã bật"} ${d.name}` });
                          }}
                          disabled={d.status !== "online"}
                          size="sm"
                        />
                      ) : (
                        <span className="text-[0.75rem] text-[#5C7A6A]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Cảnh báo */}
        {activeTab === "alerts" && (
          <div className="space-y-3">
            {gardenAlerts.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="Không có cảnh báo" description="Khu vườn này không có cảnh báo nào." />
            ) : (
              gardenAlerts.map((a) => (
                <div key={a.id} className="card p-4 flex items-start gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    a.severity === "high" ? "bg-[#FEE2E2]" : a.severity === "medium" ? "bg-[#FEF3C7]" : "bg-[#DCFCE7]"
                  )}>
                    <AlertTriangle size={14} className={a.severity === "high" ? "text-[#C0392B]" : a.severity === "medium" ? "text-[#E67E22]" : "text-[#27AE60]"} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[0.875rem] font-medium text-[#1A2E1F]">{a.message}</p>
                    {a.value && <p className="text-[0.75rem] text-[#5C7A6A] mt-0.5">Giá trị: {a.value} / Ngưỡng: {a.threshold}</p>}
                    <p className="text-[0.6875rem] text-[#5C7A6A] mt-1">{formatDateTime(a.detectedAt)}</p>
                  </div>
                  <Badge variant={a.status === "DETECTED" ? "danger" : a.status === "PROCESSING" ? "warn" : "ok"}>
                    {a.status === "DETECTED" ? "Phát hiện" : a.status === "PROCESSING" ? "Đang xử lý" : "Đã giải quyết"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Nhật ký */}
        {activeTab === "logs" && (
          <div className="card overflow-hidden">
            {gardenLogs.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Chưa có nhật ký" description="Không có hoạt động nào được ghi nhận." />
            ) : (
              <div className="divide-y divide-[#E2E8E4]">
                {gardenLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-4">
                    <div className="w-7 h-7 rounded-full bg-[#F0FAF3] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Power size={12} className="text-[#1B4332]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[0.875rem] text-[#1A2E1F]">{log.description}</p>
                      <p className="text-[0.75rem] text-[#5C7A6A] mt-0.5">
                        {log.userName} · {timeAgo(log.timestamp)}
                      </p>
                      {log.oldValue && log.newValue && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[0.75rem] line-through text-[#C0392B]">{log.oldValue}</span>
                          <span className="text-[0.75rem] text-[#5C7A6A]">→</span>
                          <span className="text-[0.75rem] text-[#27AE60] font-semibold">{log.newValue}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[0.6875rem] text-[#5C7A6A] whitespace-nowrap">{timeAgo(log.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
