"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { useAppStore } from "@/frontend/context/store";
import { Badge, EmptyState, FormErrorBanner, InlineFieldError } from "@/frontend/components/shared";
import { cn } from "@/frontend/utils/utils";
import { apiCreateSchedule, apiDeleteSchedule, apiUpdateSchedule } from "@/frontend/services/client";
import type { RepeatType, Schedule, ScheduleAction, ScheduleType, SensorType, SystemLog } from "@/types";
import { CalendarClock, Clock3, Droplets, Gauge, Plus, Power, Repeat, Trash2, X } from "lucide-react";

const repeatLabel: Record<RepeatType, string> = {
  once: "Một lần",
  daily: "Hàng ngày",
  weekly: "Hàng tuần",
};

const typeLabel: Record<ScheduleType, string> = {
  TIME_BASED: "Theo giờ",
  THRESHOLD_BASED: "Theo ngưỡng",
  MANUAL: "Thủ công",
};

const typeBadge: Record<ScheduleType, "ok" | "warn" | "default"> = {
  TIME_BASED: "ok",
  THRESHOLD_BASED: "warn",
  MANUAL: "default",
};

const typeIcon: Record<ScheduleType, typeof Clock3> = {
  TIME_BASED: Clock3,
  THRESHOLD_BASED: Gauge,
  MANUAL: Clock3,
};

type ListTab = "all" | "time" | "threshold";

interface ConditionForm {
  sensorType: SensorType;
  operator: "<" | ">" | "<=" | ">=" | "==";
  value: number;
  unit: string;
}

function doesScheduleRunOnDate(schedule: Schedule, selectedDate: string) {
  const selectedDay = new Date(`${selectedDate}T00:00:00`).getDay();

  if (schedule.scheduleType === "TIME_BASED" && schedule.timeConfig?.days?.length) {
    return schedule.timeConfig.days.includes(selectedDay);
  }

  if (schedule.repeat === "daily") return true;
  if (schedule.repeat === "weekly") return schedule.timeConfig?.days?.includes(selectedDay) ?? false;
  return schedule.date === selectedDate;
}

function buildScheduleLog(schedule: Schedule, description: string, userId: string, userName: string): SystemLog {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actionType: "SCHEDULE_CREATE",
    description,
    userId,
    userName,
    gardenId: schedule.gardenId,
    gardenName: schedule.gardenName,
    deviceId: schedule.deviceId,
    timestamp: new Date().toISOString(),
  };
}

export default function FarmSchedulesPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const searchParams = useSearchParams();

  const farms = useAppStore((state) => state.farms);
  const gardens = useAppStore((state) => state.gardens);
  const devices = useAppStore((state) => state.devices);
  const alerts = useAppStore((state) => state.alerts);
  const schedules = useAppStore((state) => state.schedules);
  const loggedInUser = useAppStore((state) => state.loggedInUser);
  const setCurrentFarmId = useAppStore((state) => state.setCurrentFarmId);
  const addSchedule = useAppStore((state) => state.addSchedule);
  const removeSchedule = useAppStore((state) => state.deleteSchedule);
  const toggleSchedule = useAppStore((state) => state.toggleSchedule);
  const addLog = useAppStore((state) => state.addLog);
  const addToast = useAppStore((state) => state.addToast);

  const farm = farms.find((item) => item.id === farmId);
  const farmGardens = useMemo(() => gardens.filter((garden) => garden.farmId === farmId), [gardens, farmId]);

  const requestedGardenId = searchParams.get("gardenId");
  const [selectedGardenId, setSelectedGardenId] = useState(requestedGardenId ?? farmGardens[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<ListTab>("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showCreator, setShowCreator] = useState(false);
  const [step, setStep] = useState(1);
  const [scheduleType, setScheduleType] = useState<ScheduleType | null>(null);

  const [name, setName] = useState("");
  const [gardenId, setGardenId] = useState(selectedGardenId);
  const [deviceId, setDeviceId] = useState("");
  const [days, setDays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState("08:00");
  const [duration, setDuration] = useState(15);
  const [repeat, setRepeat] = useState<RepeatType>("daily");
  const [action, setAction] = useState<ScheduleAction>("ON");
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [cooldownMin, setCooldownMin] = useState(60);
  const [conditions, setConditions] = useState<ConditionForm[]>([
    { sensorType: "humidity_soil", operator: "<", value: 40, unit: "%" },
  ]);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [creatorFieldErrors, setCreatorFieldErrors] = useState<Record<"name" | "gardenId" | "deviceId" | "duration", string | null>>({
    name: null,
    gardenId: null,
    deviceId: null,
    duration: null,
  });

  useEffect(() => {
    if (farmId) setCurrentFarmId(farmId);
  }, [farmId, setCurrentFarmId]);

  useEffect(() => {
    if (!farmGardens.length) return;
    const nextGardenId = requestedGardenId && farmGardens.some((garden) => garden.id === requestedGardenId)
      ? requestedGardenId
      : selectedGardenId && farmGardens.some((garden) => garden.id === selectedGardenId)
        ? selectedGardenId
        : farmGardens[0].id;
    setSelectedGardenId(nextGardenId);
  }, [farmGardens, requestedGardenId, selectedGardenId]);

  useEffect(() => {
    setGardenId(selectedGardenId);
  }, [selectedGardenId]);

  useEffect(() => {
    if (!selectedGardenId || searchParams.get("create") !== "1") return;
    setShowCreator(true);
    setStep(1);
  }, [searchParams, selectedGardenId]);

  const selectedGarden = farmGardens.find((garden) => garden.id === selectedGardenId) ?? null;
  const irrigationDevices = devices.filter((device) => device.gardenId === gardenId && device.type === "pump");

  const gardenSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.gardenId === selectedGardenId),
    [schedules, selectedGardenId],
  );

  const visibleSchedules = useMemo(() => {
    return gardenSchedules.filter((item) => {
      if (activeTab === "time") return item.scheduleType === "TIME_BASED";
      if (activeTab === "threshold") return item.scheduleType === "THRESHOLD_BASED";
      return true;
    });
  }, [activeTab, gardenSchedules]);

  const selectedSchedule = visibleSchedules.find((item) => item.id === selectedId) ?? visibleSchedules[0] ?? null;
  const daySchedules = visibleSchedules.filter((item) => doesScheduleRunOnDate(item, selectedDate));
  const alertsByGarden = useMemo(() => {
    const map = new Map<string, number>();
    for (const alert of alerts) {
      if (alert.status === "RESOLVED") continue;
      map.set(alert.gardenId, (map.get(alert.gardenId) ?? 0) + 1);
    }
    return map;
  }, [alerts]);

  const resetModal = () => {
    setShowCreator(false);
    setStep(1);
    setScheduleType(null);
    setName("");
    setGardenId(selectedGardenId);
    setDeviceId("");
    setDays([1]);
    setStartTime("08:00");
    setDuration(15);
    setRepeat("daily");
    setAction("ON");
    setLogic("AND");
    setCooldownMin(60);
    setConditions([{ sensorType: "humidity_soil", operator: "<", value: 40, unit: "%" }]);
    setCreatorError(null);
    setCreatorFieldErrors({ name: null, gardenId: null, deviceId: null, duration: null });
  };

  const toggleActive = async (schedule: Schedule) => {
    try {
      await apiUpdateSchedule(schedule.id, undefined, undefined, undefined, undefined, undefined, !schedule.isActive);
    } catch {}

    toggleSchedule(schedule.id);
    addLog(
      buildScheduleLog(
        schedule,
        `${schedule.isActive ? "Tạm dừng" : "Kích hoạt"} lịch tưới ${schedule.name ?? schedule.deviceName}`,
        loggedInUser?.id ?? "u1",
        loggedInUser?.name ?? "Hệ thống",
      ),
    );
  };

  const handleDeleteSchedule = async (schedule: Schedule) => {
    try {
      await apiDeleteSchedule(schedule.id);
    } catch {}

    removeSchedule(schedule.id);
    if (selectedId === schedule.id) {
      setSelectedId(null);
    }
    addLog(
      buildScheduleLog(
        schedule,
        `Xóa lịch tưới ${schedule.name ?? schedule.deviceName}`,
        loggedInUser?.id ?? "u1",
        loggedInUser?.name ?? "Hệ thống",
      ),
    );
    addToast({ type: "success", message: `Đã xóa lịch tưới của ${schedule.gardenName}` });
  };

  const submitSchedule = async () => {
    const nextErrors: Record<"name" | "gardenId" | "deviceId" | "duration", string | null> = {
      name: name.trim() ? null : "Tên lịch tưới là bắt buộc.",
      gardenId: gardenId ? null : "Bạn cần chọn khu vườn.",
      deviceId: deviceId ? null : "Bạn cần chọn máy bơm tưới.",
      duration: duration > 0 ? null : "Thời lượng phải lớn hơn 0 phút.",
    };
    setCreatorFieldErrors(nextErrors);

    if (!scheduleType || nextErrors.name || nextErrors.gardenId || nextErrors.deviceId || nextErrors.duration) {
      setCreatorError("Vui lòng hoàn thiện các trường bắt buộc trước khi lưu lịch tưới.");
      return;
    }

    if (scheduleType === "TIME_BASED" && repeat === "weekly" && days.length !== 1) {
      setCreatorError("Lịch tưới hàng tuần chỉ hỗ trợ một ngày cho mỗi lịch. Hãy chọn đúng 1 ngày.");
      return;
    }

    if (scheduleType === "THRESHOLD_BASED" && conditions.length === 0) {
      setCreatorError("Lịch theo ngưỡng cần tối thiểu một điều kiện.");
      return;
    }

    const garden = farmGardens.find((item) => item.id === gardenId);
    const device = irrigationDevices.find((item) => item.id === deviceId);
    if (!garden || !device) {
      setCreatorError("Khu vườn hoặc máy bơm không hợp lệ. Vui lòng chọn lại.");
      return;
    }

    const [hour, minute] = startTime.split(":").map(Number);
    const end = new Date();
    end.setHours(hour, minute + duration, 0, 0);
    const endTime = `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;

    let serverId: string | undefined;
    try {
      const result = await apiCreateSchedule(
        garden.id,
        device.id,
        scheduleType === "TIME_BASED" ? (repeat === "weekly" ? "weekly" : "daily") : null,
        startTime,
        endTime,
        scheduleType === "TIME_BASED" && repeat === "weekly" ? days[0] ?? null : null,
        duration * 60,
        null,
      );
      serverId = result?.scheduleId;
    } catch {}

    const next: Schedule = {
      id: serverId ?? `s${Date.now()}`,
      name: name.trim(),
      scheduleType,
      deviceId: device.id,
      deviceName: device.name,
      gardenId: garden.id,
      gardenName: garden.name,
      action,
      startTime,
      endTime,
      date: selectedDate,
      repeat,
      isActive: true,
      timeConfig: scheduleType === "TIME_BASED"
        ? {
            days: repeat === "weekly" ? days : [0, 1, 2, 3, 4, 5, 6],
            startTime,
            durationMin: duration,
            action,
          }
        : undefined,
      thresholdConfig: scheduleType === "THRESHOLD_BASED"
        ? { logic, conditions, action, durationMin: duration, cooldownMin }
        : undefined,
    };

    addSchedule(next);
    addLog(
      buildScheduleLog(
        next,
        `Tạo lịch tưới ${next.name ?? next.deviceName} cho ${next.gardenName}`,
        loggedInUser?.id ?? "u1",
        loggedInUser?.name ?? "Hệ thống",
      ),
    );
    setSelectedId(next.id);
    addToast({ type: "success", message: `Đã tạo lịch tưới cho ${next.gardenName}` });
    resetModal();
  };

  if (!farm) {
    return <div><Topbar title="Lịch trình" subtitle="Không tìm thấy nông trại" /></div>;
  }

  return (
    <div>
      <Topbar title="Lịch trình tưới" subtitle={`${farm.name} · Chọn khu vườn để cấu hình lịch riêng và theo dõi cảnh báo`} />

      <div className="p-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3" data-tour="schedule-garden-picker">
          {farmGardens.map((garden) => {
            const gardenScheduleCount = schedules.filter((schedule) => schedule.gardenId === garden.id).length;
            const isActiveGarden = garden.id === selectedGardenId;

            return (
              <button
                key={garden.id}
                onClick={() => {
                  setSelectedGardenId(garden.id);
                  setSelectedId(null);
                }}
                className={cn(
                  "card p-4 text-left border transition-colors",
                  isActiveGarden ? "border-[#1B4332] bg-[#F0FAF3]" : "border-[#E2E8E4] hover:border-[#1B4332]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.75rem] uppercase tracking-wide text-[#5C7A6A]">Khu vườn</p>
                    <h3 className="text-[1rem] font-semibold text-[#1A2E1F] mt-1">{garden.name}</h3>
                    <p className="text-[0.75rem] text-[#5C7A6A] mt-1">{garden.plantLabel}</p>
                  </div>
                  <Droplets size={18} className="text-[#1B4332]" />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 text-[0.75rem] text-[#5C7A6A]">
                  <span>{gardenScheduleCount} lịch tưới</span>
                  <Badge variant={(alertsByGarden.get(garden.id) ?? 0) > 0 ? "danger" : "default"}>
                    {(alertsByGarden.get(garden.id) ?? 0) > 0 ? `${alertsByGarden.get(garden.id)} cảnh báo` : "Xem chi tiết"}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>

        {!selectedGarden ? (
          <EmptyState icon={CalendarClock} title="Chưa có khu vườn" description="Tạo khu vườn trước để cấu hình lịch tưới riêng." />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
            <div className="card p-4" data-tour="schedule-list">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <p className="text-[0.75rem] uppercase tracking-wide text-[#5C7A6A]">Đang chọn</p>
                  <h3 className="font-semibold text-[#1A2E1F]">{selectedGarden.name}</h3>
                </div>
                <Link href={`/farms/${farm.id}/gardens/${selectedGarden.id}`} className="btn-secondary">
                  Chi tiết khu
                </Link>
              </div>

              <div className="flex gap-1 mb-4 border-b border-[#E2E8E4] pb-3">
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "time", label: "Theo giờ" },
                  { id: "threshold", label: "Theo ngưỡng" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ListTab)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-[8px] text-[0.75rem] font-semibold transition-colors",
                      activeTab === tab.id ? "bg-[#1B4332] text-white" : "text-[#5C7A6A] hover:bg-[#F0F4F0]",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {visibleSchedules.map((item) => {
                  const Icon = typeIcon[item.scheduleType ?? "TIME_BASED"];
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "w-full text-left border rounded-[10px] p-3 transition-colors",
                        selectedId === item.id ? "border-[#1B4332] bg-[#F0FAF3]" : "border-[#E2E8E4] hover:border-[#1B4332]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon size={14} className="text-[#1B4332]" />
                          <p className="text-[0.8125rem] font-semibold text-[#1A2E1F] truncate">{item.name ?? item.deviceName}</p>
                        </div>
                        <div className={cn("w-2 h-2 rounded-full", item.isActive ? "bg-[#27AE60]" : "bg-[#CBD5E1]")} />
                      </div>
                      <p className="text-[0.75rem] text-[#5C7A6A] mt-1">{item.startTime} · {item.deviceName}</p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <Badge variant={typeBadge[item.scheduleType ?? "TIME_BASED"]}>{typeLabel[item.scheduleType ?? "TIME_BASED"]}</Badge>
                        <TogglePill active={item.isActive} onClick={() => toggleActive(item)} />
                      </div>
                    </button>
                  );
                })}

                {visibleSchedules.length === 0 && (
                  <EmptyState icon={CalendarClock} title="Chưa có lịch cho khu này" description="Chọn khu vườn rồi tạo lịch tưới riêng cho khu đó." />
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="card p-4" data-tour="schedule-calendar">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <h3 className="font-semibold text-[1rem] text-[#1A2E1F]">Lịch tưới của {selectedGarden.name}</h3>
                    <p className="text-[0.8125rem] text-[#5C7A6A]">Mỗi khu vườn có lịch riêng, cảnh báo riêng và log riêng.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="date" className="input-field" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                    <button
                      onClick={() => {
                        setGardenId(selectedGarden.id);
                        setShowCreator(true);
                      }}
                      className="btn-primary"
                      data-tour="schedule-create"
                    >
                      <Plus size={15} />
                      Thêm lịch tưới
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {daySchedules.map((item) => (
                    <div key={item.id} className="border border-[#E2E8E4] rounded-[10px] px-3 py-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">{item.startTime} - {item.endTime ?? item.startTime}</p>
                        <p className="text-[0.75rem] text-[#5C7A6A]">{item.deviceName} · {repeatLabel[item.repeat]}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.action === "ON" ? "ok" : "danger"}>{item.action}</Badge>
                        <Badge variant={typeBadge[item.scheduleType ?? "TIME_BASED"]}>{typeLabel[item.scheduleType ?? "TIME_BASED"]}</Badge>
                        <button
                          onClick={() => handleDeleteSchedule(item)}
                          className="px-2.5 py-2 rounded-[8px] border border-[#E2E8E4] text-[#C0392B] hover:bg-[#FDF0EE] transition-colors"
                          title="Xóa lịch tưới"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>z
                    </div>
                  ))}
                  {daySchedules.length === 0 && (
                    <p className="text-[0.8125rem] text-[#5C7A6A]">Không có lịch tưới nào chạy trong ngày đã chọn.</p>
                  )}
                </div>
              </div>

              {selectedSchedule && (
                <div className="card p-4" data-tour="schedule-detail">
                  <h3 className="font-semibold text-[1rem] text-[#1A2E1F] mb-2">Chi tiết lịch đã chọn</h3>
                  <p className="text-[0.875rem] text-[#1A2E1F] font-medium">{selectedSchedule.name ?? selectedSchedule.deviceName}</p>
                  <p className="text-[0.8125rem] text-[#5C7A6A] mt-1">{selectedSchedule.gardenName} · {selectedSchedule.deviceName}</p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant={typeBadge[selectedSchedule.scheduleType ?? "TIME_BASED"]}>{typeLabel[selectedSchedule.scheduleType ?? "TIME_BASED"]}</Badge>
                    <Badge variant={selectedSchedule.action === "ON" ? "ok" : "danger"}>{selectedSchedule.action}</Badge>
                    <Badge variant="default"><Repeat size={10} className="mr-1" />{repeatLabel[selectedSchedule.repeat]}</Badge>
                  </div>

                  {selectedSchedule.scheduleType === "TIME_BASED" && selectedSchedule.timeConfig && (
                    <div className="mt-3 p-3 rounded-[10px] bg-[#F7F8F6] border border-[#E2E8E4]">
                      <p className="text-[0.75rem] uppercase tracking-wide text-[#5C7A6A] font-semibold mb-1">Lịch chạy</p>
                      <p className="text-[0.8125rem] text-[#1A2E1F]">
                        {selectedSchedule.repeat === "weekly"
                          ? `${weekdayText(selectedSchedule.timeConfig.days)} lúc ${selectedSchedule.startTime}`
                          : `Mỗi ngày lúc ${selectedSchedule.startTime}`}
                      </p>
                      <p className="text-[0.8125rem] text-[#5C7A6A] mt-1">
                        Hệ thống sẽ {selectedSchedule.action === "ON" ? "bật" : "tắt"} bơm trong {selectedSchedule.timeConfig.durationMin} phút.
                      </p>
                    </div>
                  )}

                  {selectedSchedule.scheduleType === "THRESHOLD_BASED" && selectedSchedule.thresholdConfig && (
                    <div className="mt-3 p-3 rounded-[10px] bg-[#F7F8F6] border border-[#E2E8E4]">
                      <p className="text-[0.75rem] uppercase tracking-wide text-[#5C7A6A] font-semibold mb-1">Rule Preview</p>
                      <p className="text-[0.8125rem] text-[#1A2E1F]">
                        Khi {selectedSchedule.thresholdConfig.conditions.map((condition) => `${sensorLabel(condition.sensorType)} ${condition.operator} ${condition.value}${condition.unit}`).join(` ${selectedSchedule.thresholdConfig.logic} `)}
                      </p>
                      <p className="text-[0.8125rem] text-[#5C7A6A] mt-1">
                        Hệ thống sẽ {selectedSchedule.thresholdConfig.action === "ON" ? "bật" : "tắt"} bơm {selectedSchedule.thresholdConfig.durationMin} phút.
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-[#E2E8E4] flex justify-end">
                    <button
                      onClick={() => handleDeleteSchedule(selectedSchedule)}
                      className="btn-secondary text-[#C0392B] border-[#EBC0BA] hover:bg-[#FDF0EE]"
                    >
                      <Trash2 size={10} />
                      Xóa lịch tưới
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetModal} />
          <div className="relative bg-white rounded-[16px] shadow-[0_24px_80px_rgba(0,0,0,0.22)] w-full max-w-[840px] overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-[#E2E8E4] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[1.125rem] text-[#1A2E1F]">Thiết lập lịch tưới</h2>
                <p className="text-[0.75rem] text-[#5C7A6A] mt-1">Khu vườn: {selectedGarden?.name ?? "Chưa chọn"}</p>
              </div>
              <button onClick={resetModal} className="w-8 h-8 rounded-full hover:bg-[#F0F4F0] flex items-center justify-center">
                <X size={16} className="text-[#5C7A6A]" />
              </button>
            </div>

            <div className="p-6">
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {([
                    { type: "TIME_BASED", title: "Theo giờ", desc: "Tưới tự động đúng thời điểm cố định cho khu vườn này.", icon: Clock3 },
                    { type: "THRESHOLD_BASED", title: "Theo ngưỡng", desc: "Tưới khi độ ẩm đất xuống thấp hơn ngưỡng đặt ra.", icon: Gauge },
                  ] as const).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        onClick={() => setScheduleType(item.type)}
                        className={cn(
                          "text-left border-2 rounded-[12px] p-4 transition-colors",
                          scheduleType === item.type ? "border-[#1B4332] bg-[#F0FAF3]" : "border-[#E2E8E4]",
                        )}
                      >
                        <Icon size={20} className="text-[#1B4332] mb-2" />
                        <p className="font-semibold text-[#1A2E1F] text-[0.875rem]">{item.title}</p>
                        <p className="text-[0.75rem] text-[#5C7A6A] mt-1">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
                  <div className="space-y-4">
                    <FormErrorBanner message={creatorError} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Tên lịch*</label>
                        <input
                          className={cn("input-field", creatorFieldErrors.name && "border-[#C0392B]")}
                          value={name}
                          onChange={(event) => {
                            setName(event.target.value);
                            setCreatorFieldErrors((prev) => ({ ...prev, name: null }));
                            setCreatorError(null);
                          }}
                        />
                        <InlineFieldError message={creatorFieldErrors.name} />
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Khu vườn*</label>
                        <select
                          className={cn("input-field", creatorFieldErrors.gardenId && "border-[#C0392B]")}
                          value={gardenId}
                          onChange={(event) => {
                            setGardenId(event.target.value);
                            setDeviceId("");
                            setCreatorFieldErrors((prev) => ({ ...prev, gardenId: null, deviceId: null }));
                            setCreatorError(null);
                          }}
                        >
                          {farmGardens.map((garden) => <option key={garden.id} value={garden.id}>{garden.name}</option>)}
                        </select>
                        <InlineFieldError message={creatorFieldErrors.gardenId} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Máy bơm tưới*</label>
                      <select
                        className={cn("input-field", creatorFieldErrors.deviceId && "border-[#C0392B]")}
                        value={deviceId}
                        onChange={(event) => {
                          setDeviceId(event.target.value);
                          setCreatorFieldErrors((prev) => ({ ...prev, deviceId: null }));
                          setCreatorError(null);
                        }}
                      >
                        <option value="">-- Chọn máy bơm --</option>
                        {irrigationDevices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
                      </select>
                      <InlineFieldError message={creatorFieldErrors.deviceId} />
                    </div>

                    {scheduleType === "TIME_BASED" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Lặp lại</label>
                            <select className="input-field" value={repeat} onChange={(event) => setRepeat(event.target.value as RepeatType)}>
                              <option value="daily">Hàng ngày</option>
                              <option value="weekly">Hàng tuần</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Giờ bắt đầu*</label>
                            <input type="time" className="input-field" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Thời lượng (phút)</label>
                            <input
                              type="number"
                              className={cn("input-field", creatorFieldErrors.duration && "border-[#C0392B]")}
                              value={duration}
                              onChange={(event) => {
                                setDuration(Number(event.target.value));
                                setCreatorFieldErrors((prev) => ({ ...prev, duration: null }));
                                setCreatorError(null);
                              }}
                            />
                            <InlineFieldError message={creatorFieldErrors.duration} />
                          </div>
                        </div>

                        {repeat === "weekly" && (
                          <div>
                            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Ngày trong tuần</label>
                            <div className="flex gap-1 flex-wrap">
                              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                                <button
                                  key={day}
                                  onClick={() => setDays([day])}
                                  className={cn(
                                    "px-3 py-1.5 rounded-[18px] text-[0.75rem] font-semibold border",
                                    days.includes(day) ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-[#5C7A6A] border-[#E2E8E4]",
                                  )}
                                >
                                  {weekdayShort(day)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {scheduleType === "THRESHOLD_BASED" && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-[0.75rem] font-semibold text-[#5C7A6A]">Logic:</span>
                          <button onClick={() => setLogic("AND")} className={cn("px-2.5 py-1 rounded-[8px] text-[0.75rem] font-semibold border", logic === "AND" ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-[#E2E8E4] text-[#5C7A6A]")}>AND</button>
                          <button onClick={() => setLogic("OR")} className={cn("px-2.5 py-1 rounded-[8px] text-[0.75rem] font-semibold border", logic === "OR" ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-[#E2E8E4] text-[#5C7A6A]")}>OR</button>
                        </div>

                        <div className="space-y-2">
                          {conditions.map((condition, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_90px_110px_70px_auto] gap-2 items-center">
                              <select className="input-field" value={condition.sensorType} onChange={(event) => updateCondition(setConditions, index, { sensorType: event.target.value as SensorType })}>
                                <option value="temperature">Nhiệt độ</option>
                                <option value="humidity_air">Độ ẩm không khí</option>
                                <option value="humidity_soil">Độ ẩm đất</option>
                                <option value="light">Ánh sáng</option>
                              </select>
                              <select className="input-field" value={condition.operator} onChange={(event) => updateCondition(setConditions, index, { operator: event.target.value as ConditionForm["operator"] })}>
                                <option value="<">&lt;</option>
                                <option value=">">&gt;</option>
                                <option value="<=">&lt;=</option>
                                <option value=">=">&gt;=</option>
                                <option value="==">=</option>
                              </select>
                              <input type="number" className="input-field" value={condition.value} onChange={(event) => updateCondition(setConditions, index, { value: Number(event.target.value) })} />
                              <input className="input-field" value={condition.unit} onChange={(event) => updateCondition(setConditions, index, { unit: event.target.value })} />
                              <button
                                onClick={() => setConditions((prev) => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index))}
                                className="px-2 py-2 rounded-[8px] border border-[#E2E8E4] text-[#C0392B]"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setConditions((prev) => prev.length >= 4 ? prev : [...prev, { sensorType: "temperature", operator: ">", value: 30, unit: "°C" }])}
                            className="btn-secondary"
                          >
                            + Thêm điều kiện
                          </button>
                          <input type="number" className="input-field w-[130px]" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
                          <span className="text-[0.75rem] text-[#5C7A6A]">phút chạy</span>
                          <input type="number" className="input-field w-[130px]" value={cooldownMin} onChange={(event) => setCooldownMin(Number(event.target.value))} />
                          <span className="text-[0.75rem] text-[#5C7A6A]">phút cooldown</span>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Hành động</label>
                      <div className="flex gap-2">
                        {(["ON", "OFF"] as const).map((act) => (
                          <button key={act} onClick={() => setAction(act)} className={cn("flex-1 py-2 rounded-[8px] border-2 text-[0.8125rem] font-bold", action === act ? (act === "ON" ? "bg-[#27AE60] text-white border-[#27AE60]" : "bg-[#C0392B] text-white border-[#C0392B]") : "border-[#E2E8E4] text-[#5C7A6A]")}>
                            <Power size={13} className="inline mr-1" />{act}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[12px] border border-[#E2E8E4] p-4 bg-[#F7F8F6]">
                    <p className="text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold mb-3">Preview</p>
                    <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">{name || "Tên lịch tưới"}</p>
                    <p className="text-[0.75rem] text-[#5C7A6A] mt-1">{farmGardens.find((garden) => garden.id === gardenId)?.name ?? "Chưa chọn khu"}</p>

                    {scheduleType === "THRESHOLD_BASED" && (
                      <p className="text-[0.75rem] text-[#1A2E1F] mt-3 leading-relaxed">
                        Khi {conditions.map((condition) => `${sensorLabel(condition.sensorType)} ${condition.operator} ${condition.value}${condition.unit}`).join(` ${logic} `)}
                        <br />
                        Hệ thống sẽ {action === "ON" ? "bật" : "tắt"} bơm trong {duration} phút
                        <br />
                        Không kích hoạt lại trong {cooldownMin} phút
                      </p>
                    )}

                    {scheduleType === "TIME_BASED" && (
                      <p className="text-[0.75rem] text-[#1A2E1F] mt-3 leading-relaxed">
                        {repeat === "weekly" ? `${weekdayText(days)} lúc ${startTime}` : `Mỗi ngày lúc ${startTime}`}
                        <br />
                        Hệ thống sẽ {action === "ON" ? "bật" : "tắt"} bơm trong {duration} phút
                        <br />
                        Nếu quá giờ mà bơm không chạy, hệ thống sẽ sinh cảnh báo và ghi vào nhật ký khu vườn.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pb-5 flex justify-between">
              <button onClick={() => setStep((prev) => Math.max(1, prev - 1))} className="btn-secondary" disabled={step === 1}>Quay lại</button>
              {step < 2 ? (
                <button onClick={() => setStep(2)} className="btn-primary" disabled={!scheduleType}>Tiếp theo</button>
              ) : (
                <button
                  onClick={submitSchedule}
                  className="btn-primary"
                  disabled={!scheduleType || !name.trim() || !deviceId || !gardenId}
                >
                  Lưu lịch tưới
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TogglePill({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "px-2.5 py-1 rounded-[20px] text-[0.6875rem] font-semibold border",
        active ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-[#5C7A6A] border-[#E2E8E4]",
      )}
    >
      {active ? "ON" : "OFF"}
    </button>
  );
}

function weekdayShort(day: number) {
  const map: Record<number, string> = { 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7", 0: "CN" };
  return map[day];
}

function weekdayText(days: number[]) {
  if (!days.length) return "Chưa chọn ngày";
  return days.map(weekdayShort).join(", ");
}

function sensorLabel(type: SensorType) {
  const map: Record<SensorType, string> = {
    temperature: "Nhiệt độ",
    humidity_air: "Độ ẩm không khí",
    humidity_soil: "Độ ẩm đất",
    light: "Ánh sáng",
  };
  return map[type];
}

function updateCondition(
  setter: Dispatch<SetStateAction<ConditionForm[]>>,
  index: number,
  patch: Partial<ConditionForm>,
) {
  setter((prev) => prev.map((item, idx) => idx === index ? { ...item, ...patch } : item));
}
