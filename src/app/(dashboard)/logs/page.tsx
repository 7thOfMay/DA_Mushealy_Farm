"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Cpu, Filter, History, Search, Settings2, Waves } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { EmptyState } from "@/frontend/components/shared";
import { ErrorState } from "@/frontend/components/shared/ErrorStates";
import { useAppStore } from "@/frontend/context/store";
import { getVisibleFarmsForViewer } from "@/frontend/utils/dataScope";
import { cn, formatDateTime, timeAgo } from "@/frontend/utils/utils";
import type { ChartDataPoint, Garden } from "@/types";

type JournalKind = "sensor" | "alert" | "command" | "audit";
type MetricFilter = "all" | "temperature" | "humidity_air" | "humidity_soil" | "light";
type TimeFilter = "1h" | "24h" | "7d" | "30d";
type ViewMode = "dashboard" | "list";

type JournalEntry = {
  id: string;
  kind: JournalKind;
  timestamp: string;
  title: string;
  description: string;
  farmId?: string;
  farmName?: string;
  gardenId?: string;
  gardenName?: string;
  deviceId?: string;
  deviceName?: string;
  actorName?: string;
  metricType?: "temperature" | "humidity_air" | "humidity_soil" | "light";
  value?: number;
  unit?: string;
  severity?: string;
  status?: string;
  before?: string;
  after?: string;
};

type JournalSummary = {
  total: number;
  sensor: number;
  alert: number;
  command: number;
  audit: number;
};

type JournalResponse = {
  entries: JournalEntry[];
  summary: JournalSummary;
};

type ChartResponse = {
  temperatureChartData: ChartDataPoint[];
  humidityAirChartData: ChartDataPoint[];
  humiditySoilChartData: ChartDataPoint[];
  lightChartData: ChartDataPoint[];
};

const TIME_FILTERS: Array<{ key: TimeFilter; label: string; hours: number }> = [
  { key: "1h", label: "1 giờ", hours: 1 },
  { key: "24h", label: "Hôm nay", hours: 24 },
  { key: "7d", label: "7 ngày", hours: 24 * 7 },
  { key: "30d", label: "30 ngày", hours: 24 * 30 },
];

const KIND_FILTERS: Array<{ key: "all" | JournalKind; label: string }> = [
  { key: "all", label: "Tất cả bản ghi" },
  { key: "sensor", label: "Cảm biến" },
  { key: "alert", label: "Cảnh báo" },
  { key: "command", label: "Lệnh thiết bị" },
  { key: "audit", label: "Nhật ký hệ thống" },
];

const METRIC_FILTERS: Array<{ key: MetricFilter; label: string }> = [
  { key: "all", label: "Tất cả chỉ số" },
  { key: "temperature", label: "Nhiệt độ" },
  { key: "humidity_air", label: "Ẩm không khí" },
  { key: "humidity_soil", label: "Ẩm đất" },
  { key: "light", label: "Ánh sáng" },
];

const ENTRY_STYLE: Record<JournalKind, { icon: typeof Waves; color: string; bg: string; label: string }> = {
  sensor: { icon: Waves, color: "#1B4332", bg: "#F0FAF3", label: "Cảm biến" },
  alert: { icon: AlertTriangle, color: "#C0392B", bg: "#FEE2E2", label: "Cảnh báo" },
  command: { icon: Cpu, color: "#2980B9", bg: "#EBF5FB", label: "Lệnh thiết bị" },
  audit: { icon: History, color: "#5C7A6A", bg: "#F1F5F9", label: "Nhật ký hệ thống" },
};

function getHours(filter: TimeFilter) {
  return TIME_FILTERS.find((item) => item.key === filter)?.hours ?? 24 * 7;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateRange(filter: TimeFilter) {
  const now = new Date();
  const end = formatDateInput(now);
  const start = new Date(now);
  const daysBack = filter === "1h" ? 0 : filter === "24h" ? 0 : filter === "7d" ? 6 : 29;
  start.setDate(start.getDate() - daysBack);
  return { start: formatDateInput(start), end };
}

function toGardenSeries(chartData: ChartResponse, selectedGarden: Garden, visibleGardens: Garden[], metric: MetricFilter) {
  const gardenIndex = visibleGardens.findIndex((garden) => garden.id === selectedGarden.id);
  if (gardenIndex < 0) return [];

  const source =
    metric === "temperature"
      ? chartData.temperatureChartData
      : metric === "humidity_air"
        ? chartData.humidityAirChartData
        : metric === "humidity_soil"
          ? chartData.humiditySoilChartData
          : chartData.lightChartData;

  return source
    .map((point) => {
      const key = `garden${gardenIndex + 1}` as "garden1" | "garden2" | "garden3";
      const value = point[key];
      return typeof value === "number"
        ? { time: point.time, value: metric === "light" ? Number((value / 1000).toFixed(2)) : value }
        : null;
    })
    .filter((item): item is { time: string; value: number } => item !== null);
}

export default function LogsPage() {
  const currentFarmId = useAppStore((state) => state.currentFarmId);
  const farms = useAppStore((state) => state.farms);
  const users = useAppStore((state) => state.users);
  const gardens = useAppStore((state) => state.gardens);
  const selectedFarmerId = useAppStore((state) => state.selectedFarmerId);
  const loggedInUser = useAppStore((state) => state.loggedInUser);

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | JournalKind>("all");
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7d");
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [dateRange, setDateRange] = useState(() => buildDateRange("7d"));
  const [selectedGardenId, setSelectedGardenId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journal, setJournal] = useState<JournalResponse>({ entries: [], summary: { total: 0, sensor: 0, alert: 0, command: 0, audit: 0 } });
  const [chartData, setChartData] = useState<ChartResponse>({
    temperatureChartData: [],
    humidityAirChartData: [],
    humiditySoilChartData: [],
    lightChartData: [],
  });

  const visibleFarms = useMemo(
    () => getVisibleFarmsForViewer({ farms, users, loggedInUser, selectedFarmerId }),
    [farms, users, loggedInUser, selectedFarmerId],
  );

  const visibleFarmIds = useMemo(() => new Set(visibleFarms.map((farm) => farm.id)), [visibleFarms]);
  const scopedGardens = useMemo(
    () => gardens.filter((garden) => !!garden.farmId && visibleFarmIds.has(garden.farmId)),
    [gardens, visibleFarmIds],
  );

  const farmScopedGardens = useMemo(
    () => scopedGardens.filter((garden) => !currentFarmId || garden.farmId === currentFarmId),
    [scopedGardens, currentFarmId],
  );

  useEffect(() => {
    if (!farmScopedGardens.length) {
      setSelectedGardenId("");
      return;
    }
    if (!farmScopedGardens.some((garden) => garden.id === selectedGardenId)) {
      setSelectedGardenId(farmScopedGardens[0].id);
    }
  }, [farmScopedGardens, selectedGardenId]);

  const selectedGarden = farmScopedGardens.find((garden) => garden.id === selectedGardenId) ?? farmScopedGardens[0] ?? null;
  const chartMetric = metricFilter === "all" ? "temperature" : metricFilter;

  useEffect(() => {
    setDateRange(buildDateRange(timeFilter));
  }, [timeFilter]);

  useEffect(() => {
    if (!visibleFarms.length) {
      setLoading(false);
      setJournal({ entries: [], summary: { total: 0, sensor: 0, alert: 0, command: 0, audit: 0 } });
      return;
    }

    const hours = getHours(timeFilter);
    let cancelled = false;

    const loadJournal = async () => {
      try {
        setError(null);
        const params = new URLSearchParams();
        params.set("hours", String(hours));
        params.set("limit", "500");
        params.set("startDate", dateRange.start);
        params.set("endDate", dateRange.end);
        if (currentFarmId) params.set("farmId", currentFarmId);
        if (selectedGarden?.id) params.set("gardenId", selectedGarden.id);
        if (search.trim()) params.set("q", search.trim());
        if (kindFilter !== "all") params.set("kinds", kindFilter);
        if (metricFilter !== "all") params.set("metricType", metricFilter);

        const journalResponse = await fetch(`/api/logs/journal?${params.toString()}`, { cache: "no-store" });
        if (!journalResponse.ok) {
          throw new Error("Không thể tải nhật ký tổng thể");
        }

        const nextJournal = (await journalResponse.json()) as JournalResponse;

        let nextChart: ChartResponse = {
          temperatureChartData: [],
          humidityAirChartData: [],
          humiditySoilChartData: [],
          lightChartData: [],
        };

        if (selectedGarden?.id) {
          const chartParams = new URLSearchParams();
          chartParams.set("hours", String(hours));
          chartParams.set("startDate", dateRange.start);
          chartParams.set("endDate", dateRange.end);
          chartParams.append("gardenId", selectedGarden.id);
          const chartResponse = await fetch(`/api/sensors/chart?${chartParams.toString()}`, { cache: "no-store" });
          if (chartResponse.ok) {
            nextChart = (await chartResponse.json()) as ChartResponse;
          }
        }

        if (!cancelled) {
          setJournal(nextJournal);
          setChartData(nextChart);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không thể tải nhật ký");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    void loadJournal();
    const interval = window.setInterval(loadJournal, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [visibleFarms.length, currentFarmId, selectedGarden?.id, search, kindFilter, metricFilter, timeFilter, dateRange.start, dateRange.end]);

  const chartSeries = useMemo(
    () => (selectedGarden ? toGardenSeries(chartData, selectedGarden, farmScopedGardens.slice(0, 3), chartMetric) : []),
    [chartData, selectedGarden, farmScopedGardens, chartMetric],
  );

  const metricUnit = chartMetric === "temperature" ? "°C" : chartMetric === "light" ? "k lux" : "%";

  if (visibleFarms.length === 0) {
    return (
      <div>
        <Topbar title="Nhật ký tổng thể" subtitle="Chưa có dữ liệu trong phạm vi quản lý" />
        <div className="max-w-3xl p-8">
          <ErrorState
            title="Không có nhật ký để hiển thị"
            description="Hãy chọn nông dân ở sidebar hoặc tạo nông trại để bắt đầu theo dõi lịch sử dữ liệu."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Nhật ký tổng thể" subtitle={`${journal.summary.total} bản ghi đang hiển thị`} />

      <div className="space-y-5 p-8">
        <div className="flex items-center gap-2">
          {[
            { key: "dashboard" as const, label: "Dashboard nhật ký" },
            { key: "list" as const, label: "Danh sách bản ghi" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setViewMode(item.key)}
              className={cn(
                "rounded-[999px] border px-4 py-2 text-[0.875rem] font-medium transition-colors",
                viewMode === item.key
                  ? "border-[#1B4332] bg-[#1B4332] text-white"
                  : "border-[#E2E8E4] bg-white text-[#5C7A6A] hover:border-[#1B4332] hover:text-[#1B4332]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Cảm biến", value: journal.summary.sensor, color: "#1B4332", icon: Waves },
            { label: "Cảnh báo", value: journal.summary.alert, color: "#C0392B", icon: AlertTriangle },
            { label: "Lệnh thiết bị", value: journal.summary.command, color: "#2980B9", icon: Cpu },
            { label: "Nhật ký hệ thống", value: journal.summary.audit, color: "#5C7A6A", icon: History },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={16} style={{ color: item.color }} />
                  <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A]">{item.label}</span>
                </div>
                <p className="text-[2rem] font-bold text-[#1A2E1F]">{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C7A6A]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo mô tả, thiết bị, người thao tác hoặc khu vườn"
                className="input-field pl-10"
              />
            </div>

            <select
              className="rounded-[8px] border border-[#E2E8E4] bg-white px-3 py-2 text-[0.8125rem] text-[#1A2E1F]"
              value={selectedGarden?.id ?? ""}
              onChange={(event) => setSelectedGardenId(event.target.value)}
            >
              {farmScopedGardens.map((garden) => (
                <option key={garden.id} value={garden.id}>
                  {garden.name} - {garden.plantLabel}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={14} className="text-[#5C7A6A]" />
              {TIME_FILTERS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTimeFilter(item.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-[20px] text-[0.8125rem] font-medium border transition-colors",
                    timeFilter === item.key
                      ? "bg-[#1B4332] text-white border-[#1B4332]"
                      : "bg-white text-[#5C7A6A] border-[#E2E8E4] hover:border-[#1B4332] hover:text-[#1B4332]",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={dateRange.start}
                onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))}
                className="rounded-[8px] border border-[#E2E8E4] bg-white px-3 py-2 text-[0.8125rem] text-[#1A2E1F]"
              />
              <span className="text-[0.8125rem] text-[#5C7A6A]">đến</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))}
                className="rounded-[8px] border border-[#E2E8E4] bg-white px-3 py-2 text-[0.8125rem] text-[#1A2E1F]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {KIND_FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => setKindFilter(item.key)}
                className={cn(
                  "px-3 py-1.5 rounded-[20px] text-[0.8125rem] font-medium border transition-colors",
                  kindFilter === item.key
                    ? "bg-[#1B4332] text-white border-[#1B4332]"
                    : "bg-white text-[#5C7A6A] border-[#E2E8E4] hover:border-[#1B4332] hover:text-[#1B4332]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {METRIC_FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => setMetricFilter(item.key)}
                className={cn(
                  "px-3 py-1.5 rounded-[20px] text-[0.8125rem] font-medium border transition-colors",
                  metricFilter === item.key
                    ? "bg-[#1B4332] text-white border-[#1B4332]"
                    : "bg-white text-[#5C7A6A] border-[#E2E8E4] hover:border-[#1B4332] hover:text-[#1B4332]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {viewMode === "dashboard" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A]">Biểu đồ lịch sử cảm biến</p>
                  <p className="text-[0.875rem] text-[#1A2E1F]">
                    {selectedGarden ? `${selectedGarden.name} • ${METRIC_FILTERS.find((item) => item.key === chartMetric)?.label}` : "Chưa chọn khu vườn"}
                  </p>
                </div>
                <div className="rounded-[999px] border border-[#E2E8E4] px-3 py-1 text-[0.75rem] text-[#5C7A6A]">
                  Đơn vị: {metricUnit}
                </div>
              </div>

              <div className="h-[260px]">
                {chartSeries.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[#D7E2DB] bg-[#F7F8F6] px-6 text-center text-[0.875rem] text-[#5C7A6A]">
                    Không có dữ liệu cảm biến theo bộ lọc hiện tại.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartSeries}>
                      <CartesianGrid stroke="#E2E8E4" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: "#5C7A6A", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#5C7A6A", fontSize: 11 }} />
                      <Tooltip formatter={(value) => [value, metricUnit]} />
                      <Line type={timeFilter === "1h" ? "stepAfter" : "monotone"} dataKey="value" stroke="#1B4332" strokeWidth={2} dot={timeFilter === "1h" ? { r: 2 } : false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Settings2 size={16} className="text-[#5C7A6A]" />
                <h3 className="text-[0.9375rem] font-semibold text-[#1A2E1F]">Phạm vi nhật ký hiện tại</h3>
              </div>
              <div className="space-y-3 text-[0.875rem] text-[#5C7A6A]">
                <div>
                  <span className="font-medium text-[#1A2E1F]">Nông trại:</span> {visibleFarms.find((farm) => farm.id === currentFarmId)?.name ?? "Tất cả trong phạm vi"}
                </div>
                <div>
                  <span className="font-medium text-[#1A2E1F]">Khu vườn:</span> {selectedGarden?.name ?? "Chưa chọn"}
                </div>
                <div>
                  <span className="font-medium text-[#1A2E1F]">Từ ngày:</span> {dateRange.start}
                </div>
                <div>
                  <span className="font-medium text-[#1A2E1F]">Đến ngày:</span> {dateRange.end}
                </div>
                <div>
                  <span className="font-medium text-[#1A2E1F]">Loại bản ghi:</span> {KIND_FILTERS.find((item) => item.key === kindFilter)?.label}
                </div>
                <div>
                  <span className="font-medium text-[#1A2E1F]">Chỉ số:</span> {METRIC_FILTERS.find((item) => item.key === metricFilter)?.label}
                </div>
                <div className="rounded-[10px] bg-[#F7F8F6] p-3 text-[0.8125rem]">
                  Tab dashboard tập trung vào xu hướng dữ liệu và phạm vi đang theo dõi. Tab danh sách tập trung vào tra cứu từng bản ghi chi tiết.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={cn("card overflow-hidden", viewMode === "list" ? "min-h-[520px]" : "")}>
          {loading ? (
            <div className="p-6 text-[0.875rem] text-[#5C7A6A]">Đang tải nhật ký tổng thể...</div>
          ) : error ? (
            <div className="p-6">
              <ErrorState title="Không thể tải nhật ký" description={error} />
            </div>
          ) : journal.entries.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Không có bản ghi phù hợp"
              description="Thử thay đổi khoảng thời gian, loại bản ghi hoặc từ khóa tìm kiếm."
            />
          ) : (
            <div className="divide-y divide-[#E2E8E4]">
              {journal.entries.map((entry) => {
                const config = ENTRY_STYLE[entry.kind];
                const Icon = config.icon;
                return (
                  <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[#F7F8F6] transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: config.bg }}>
                      <Icon size={14} style={{ color: config.color }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-[999px] px-2 py-0.5 text-[0.6875rem] font-semibold" style={{ color: config.color, backgroundColor: config.bg }}>
                          {config.label}
                        </span>
                        {entry.metricType && (
                          <span className="rounded-[999px] bg-[#F7F8F6] px-2 py-0.5 text-[0.6875rem] text-[#5C7A6A]">
                            {METRIC_FILTERS.find((item) => item.key === entry.metricType)?.label}
                          </span>
                        )}
                        {entry.status && (
                          <span className="rounded-[999px] bg-[#F7F8F6] px-2 py-0.5 text-[0.6875rem] text-[#5C7A6A]">
                            {entry.status}
                          </span>
                        )}
                      </div>

                      <p className="text-[0.875rem] font-medium text-[#1A2E1F]">{entry.title}</p>
                      <p className="mt-1 text-[0.8125rem] text-[#5C7A6A]">{entry.description}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.75rem] text-[#5C7A6A]">
                        {entry.farmName && <span>{entry.farmName}</span>}
                        {entry.gardenName && <span>• {entry.gardenName}</span>}
                        {entry.deviceName && <span>• {entry.deviceName}</span>}
                        {entry.actorName && <span>• {entry.actorName}</span>}
                        {typeof entry.value === "number" && <span>• {entry.value}{entry.unit ? ` ${entry.unit}` : ""}</span>}
                      </div>

                      {(entry.before || entry.after) && (
                        <div className="mt-2 grid gap-1 text-[0.75rem]">
                          {entry.before && <div className="rounded-[8px] bg-[#F7F8F6] px-2 py-1 text-[#5C7A6A]">Trước: {entry.before}</div>}
                          {entry.after && <div className="rounded-[8px] bg-[#F0FAF3] px-2 py-1 text-[#1B4332]">Sau: {entry.after}</div>}
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-[0.6875rem] text-[#5C7A6A]">{timeAgo(entry.timestamp)}</p>
                      <p className="text-[0.625rem] text-[#5C7A6A]/60 mt-0.5">{formatDateTime(entry.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
