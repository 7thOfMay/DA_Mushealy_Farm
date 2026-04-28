"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { useAppStore } from "@/frontend/context/store";
import { Badge, EmptyState, FormErrorBanner, InlineFieldError } from "@/frontend/components/shared/index";
import { cn } from "@/frontend/utils/utils";
import { apiCreateSchedule, apiDeleteSchedule, apiUpdateSchedule } from "@/frontend/services/client";
import type { RepeatType, Schedule, ScheduleAction, ScheduleType, SensorType } from "@/types";
import { CalendarClock, Clock3, Gauge, Hand, Plus, Power, Repeat, Trash2, X } from "lucide-react";

const repeatLabel: Record<RepeatType, string> = { once: "Một lần", daily: "Hàng ngày", weekly: "Hàng tuần" };
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
  MANUAL: Hand,
};

type ListTab = "all" | "time" | "threshold";

interface ConditionForm {
  sensorType: SensorType;
  operator: "<" | ">" | "<=" | ">=" | "==";
  value: number;
  unit: string;
}

export default function FarmSchedulesPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const farms = useAppStore((state) => state.farms);
  const gardens = useAppStore((state) => state.gardens);
  const farm = farms.find((item) => item.id === farmId);
  const addToast = useAppStore((state) => state.addToast);
  const devices = useAppStore((state) => state.devices);
  const schedules = useAppStore((state) => state.schedules);
  const addSchedule = useAppStore((state) => state.addSchedule);
  const deleteSchedule = useAppStore((state) => state.deleteSchedule);
  const toggleSchedule = useAppStore((state) => state.toggleSchedule);
  const addLog = useAppStore((state) => state.addLog);
  const loggedInUser = useAppStore((state) => state.loggedInUser);

  const farmGardenIds = useMemo(() => new Set(gardens.filter((garden) => garden.farmId === farmId).map((garden) => garden.id)), [gardens, farmId]);

  const scheduleItems = useMemo(
    () => schedules.filter((schedule) => farmGardenIds.has(schedule.gardenId)),
    [schedules, farmGardenIds]
  );
  const [activeTab, setActiveTab] = useState<ListTab>("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showCreator, setShowCreator] = useState(false);
  const [step, setStep] = useState(1);
  const [scheduleType, setScheduleType] = useState<ScheduleType | null>(null);

  const [name, setName] = useState("");
  const [gardenId, setGardenId] = useState(gardens.find((garden) => garden.farmId === farmId)?.id ?? "");
  const [deviceId, setDeviceId] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("06:00");
  const [duration, setDuration] = useState(30);
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

  const farmGardens = gardens.filter((garden) => garden.farmId === farmId);
  const selectedGarden = farmGardens.find((garden) => garden.id === gardenId);
  const actuatorDevices = devices.filter(
    (device) => device.gardenId === gardenId && (device.type === "pump" || device.type === "led_rgb")
  );

  const visibleSchedules = scheduleItems.filter((item) => {
    if (activeTab === "time") return item.scheduleType === "TIME_BASED";
    if (activeTab === "threshold") return item.scheduleType === "THRESHOLD_BASED";
    return true;
  });
  const selectedSchedule = visibleSchedules.find((item) => item.id === selectedId) ?? visibleSchedules[0] ?? null;
  const daySchedules = visibleSchedules.filter((item) => item.date === selectedDate);

  const toggleActive = async (id: string) => {
    const target = scheduleItems.find((item) => item.id === id);
    try { await apiUpdateSchedule(id, undefined, undefined, undefined, undefined, undefined, !target?.isActive); } catch {}
    toggleSchedule(id);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const target = scheduleItems.find((item) => item.id === scheduleId);
    if (!target) return;

    try { await apiDeleteSchedule(scheduleId); } catch {}
    deleteSchedule(scheduleId);
    if (selectedId === scheduleId) {
      setSelectedId(null);
    }
    addLog({
      id: `log_${Date.now()}`,
      actionType: "CONFIG_CHANGE",
      description: `Xoa lich trinh ${target.name ?? target.deviceName}`,
      userId: loggedInUser?.id ?? "u1",
      userName: loggedInUser?.name ?? "System Admin",
      timestamp: new Date().toISOString(),
    });
    addToast({ type: "success", message: `Da xoa lich trinh ${target.name ?? target.deviceName}` });
  };

  const resetModal = () => {
    setShowCreator(false);
    setStep(1);
    setScheduleType(null);
    setName("");
    setGardenId(farmGardens[0]?.id ?? "");
    setDeviceId("");
    setDays([1, 2, 3, 4, 5]);
    setStartTime("06:00");
    setDuration(30);
    setRepeat("daily");
    setAction("ON");
    setLogic("AND");
    setCooldownMin(60);
    setConditions([{ sensorType: "humidity_soil", operator: "<", value: 40, unit: "%" }]);
    setCreatorError(null);
    setCreatorFieldErrors({ name: null, gardenId: null, deviceId: null, duration: null });
  };

  const submitSchedule = async () => {
    const nextErrors: Record<"name" | "gardenId" | "deviceId" | "duration", string | null> = {
      name: name.trim() ? null : "Tên lịch trình là bắt buộc.",
      gardenId: gardenId ? null : "Bạn cần chọn khu vườn.",
      deviceId: deviceId ? null : "Bạn cần chọn thiết bị điều khiển.",
      duration: duration > 0 ? null : "Thời lượng phải lớn hơn 0 phút.",
    };
    setCreatorFieldErrors(nextErrors);

    if (!scheduleType || nextErrors.name || nextErrors.gardenId || nextErrors.deviceId || nextErrors.duration) {
      setCreatorError("Vui lòng hoàn thiện các trường bắt buộc trước khi lưu lịch trình.");
      return;
    }

    if (scheduleType === "TIME_BASED" && days.length === 0) {
      setCreatorError("Lịch theo giờ cần chọn ít nhất một ngày lặp lại.");
      return;
    }

    if (scheduleType === "THRESHOLD_BASED" && conditions.length === 0) {
      setCreatorError("Lịch theo ngưỡng cần tối thiểu một điều kiện.");
      return;
    }

    if (scheduleType === "THRESHOLD_BASED" && conditions.some((condition) => !Number.isFinite(condition.value))) {
      setCreatorError("Có điều kiện ngưỡng chưa hợp lệ. Vui lòng kiểm tra lại giá trị.");
      return;
    }

    const garden = farmGardens.find((g) => g.id === gardenId);
    const device = actuatorDevices.find((d) => d.id === deviceId) ?? devices.find((d) => d.id === deviceId);
    if (!garden || !device) {
      setCreatorError("Khu vườn hoặc thiết bị không hợp lệ. Vui lòng chọn lại.");
      return;
    }

    const endHour = Math.floor(duration / 60);
    const endMinute = duration % 60;
    const [h, m] = startTime.split(":").map(Number);
    const end = new Date();
    end.setHours(h + endHour, m + endMinute, 0, 0);
    const endTime = `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;

    let serverId: string | undefined;
    try {
      const result = await apiCreateSchedule(
        garden.id, device.id, scheduleType,
        startTime, endTime, days[0] ?? null, duration * 60, null,
      );
      serverId = result?.scheduleId;
    } catch { /* fallback to local */ }

    const next: Schedule = {
      id: serverId || `s${Date.now()}`,
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
      timeConfig: scheduleType === "TIME_BASED" ? { days, startTime, durationMin: duration, action } : undefined,
      thresholdConfig: scheduleType === "THRESHOLD_BASED"
        ? { logic, conditions, action, durationMin: duration, cooldownMin }
        : undefined,
    };

    addSchedule(next);
    setSelectedId(next.id);
    addToast({ type: "success", message: `Đã tạo lịch trình ${next.name}` });
    resetModal();
  };

  if (!farm) {
    return <div><Topbar title="Lịch trình" subtitle="Không tìm thấy nông trại" /></div>;
  }

  return (
    <div>
      <Topbar title="Lịch trình" subtitle={`${farm.name} · Quản lý lịch theo giờ, ngưỡng và thủ công`} />

      <div className="p-8 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
          <div className="card p-4">
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
                    activeTab === tab.id ? "bg-[#1B4332] text-white" : "text-[#5C7A6A] hover:bg-[#F0F4F0]"
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
                      selectedId === item.id ? "border-[#1B4332] bg-[#F0FAF3]" : "border-[#E2E8E4] hover:border-[#1B4332]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon size={14} className="text-[#1B4332]" />
                        <p className="text-[0.8125rem] font-semibold text-[#1A2E1F] truncate">{item.name ?? item.deviceName}</p>
                      </div>
                      <div className={cn("w-2 h-2 rounded-full", item.isActive ? "bg-[#27AE60]" : "bg-[#CBD5E1]")} />
                    </div>
                    <p className="text-[0.75rem] text-[#5C7A6A] mt-1">{item.deviceName}</p>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <Badge variant={typeBadge[item.scheduleType ?? "TIME_BASED"]}>{typeLabel[item.scheduleType ?? "TIME_BASED"]}</Badge>
                      <TogglePill active={item.isActive} onClick={() => toggleActive(item.id)} />
                    </div>
                  </button>
                );
              })}

              {visibleSchedules.length === 0 && (
                <EmptyState icon={CalendarClock} title="Chưa có lịch" description="Tạo lịch trình để bắt đầu tự động hóa." />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h3 className="font-semibold text-[1rem] text-[#1A2E1F]">Lịch theo ngày</h3>
                  <p className="text-[0.8125rem] text-[#5C7A6A]">Chọn ngày để xem các lịch kích hoạt.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" className="input-field" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                  <button onClick={() => setShowCreator(true)} className="btn-primary">
                    <Plus size={15} />
                    Thêm lịch trình
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {daySchedules.map((item) => (
                  <div key={item.id} className="border border-[#E2E8E4] rounded-[10px] px-3 py-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">{item.startTime} - {item.endTime ?? item.startTime}</p>
                      <p className="text-[0.75rem] text-[#5C7A6A]">{item.deviceName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.action === "ON" ? "ok" : "danger"}>{item.action}</Badge>
                      <Badge variant={typeBadge[item.scheduleType ?? "TIME_BASED"]}>{typeLabel[item.scheduleType ?? "TIME_BASED"]}</Badge>
                      <button
                        onClick={() => handleDeleteSchedule(item.id)}
                        className="px-2.5 py-2 rounded-[8px] border border-[#E2E8E4] text-[#C0392B] hover:bg-[#FDF0EE] transition-colors"
                        title="Xoa lich trinh"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {daySchedules.length === 0 && (
                  <p className="text-[0.8125rem] text-[#5C7A6A]">Không có lịch trình trong ngày đã chọn.</p>
                )}
              </div>
            </div>

            {selectedSchedule && (
              <div className="card p-4">
                <h3 className="font-semibold text-[1rem] text-[#1A2E1F] mb-2">Chi tiết lịch đã chọn</h3>
                <p className="text-[0.875rem] text-[#1A2E1F] font-medium">{selectedSchedule.name ?? selectedSchedule.deviceName}</p>
                <p className="text-[0.8125rem] text-[#5C7A6A] mt-1">{selectedSchedule.gardenName} · {selectedSchedule.deviceName}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={typeBadge[selectedSchedule.scheduleType ?? "TIME_BASED"]}>{typeLabel[selectedSchedule.scheduleType ?? "TIME_BASED"]}</Badge>
                  <Badge variant={selectedSchedule.action === "ON" ? "ok" : "danger"}>{selectedSchedule.action}</Badge>
                  <Badge variant="default"><Repeat size={10} className="mr-1" />{repeatLabel[selectedSchedule.repeat]}</Badge>
                </div>

                {selectedSchedule.scheduleType === "THRESHOLD_BASED" && selectedSchedule.thresholdConfig && (
                  <div className="mt-3 p-3 rounded-[10px] bg-[#F7F8F6] border border-[#E2E8E4]">
                    <p className="text-[0.75rem] uppercase tracking-wide text-[#5C7A6A] font-semibold mb-1">Rule Preview</p>
                    <p className="text-[0.8125rem] text-[#1A2E1F]">
                      Khi {selectedSchedule.thresholdConfig.conditions.map((condition) => `${sensorLabel(condition.sensorType)} ${condition.operator} ${condition.value}${condition.unit}`).join(` ${selectedSchedule.thresholdConfig.logic} `)}
                    </p>
                    <p className="text-[0.8125rem] text-[#5C7A6A] mt-1">
                      -&gt; {selectedSchedule.thresholdConfig.action === "ON" ? "Bật" : "Tắt"} thiết bị {selectedSchedule.thresholdConfig.durationMin} phút, cooldown {selectedSchedule.thresholdConfig.cooldownMin} phút.
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-[#E2E8E4] flex justify-end">
                  <button
                    onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                    className="btn-secondary text-[#C0392B] border-[#EBC0BA] hover:bg-[#FDF0EE]"
                  >
                    <Trash2 size={14} />
                    Xoa lich trinh
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetModal} />
          <div className="relative bg-white rounded-[16px] shadow-[0_24px_80px_rgba(0,0,0,0.22)] w-full max-w-[840px] overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-[#E2E8E4] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[1.125rem] text-[#1A2E1F]">Schedule Creator</h2>
                <p className="text-[0.75rem] text-[#5C7A6A] mt-1">Step {step}/2</p>
              </div>
              <button onClick={resetModal} className="w-8 h-8 rounded-full hover:bg-[#F0F4F0] flex items-center justify-center">
                <X size={16} className="text-[#5C7A6A]" />
              </button>
            </div>

            <div className="p-6">
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {([
                    { type: "TIME_BASED", title: "THEO GIỜ", desc: "Tự động bật/tắt theo giờ cố định", icon: Clock3 },
                    { type: "THRESHOLD_BASED", title: "THEO NGƯỠNG", desc: "Kích hoạt khi cảm biến đạt ngưỡng", icon: Gauge },
                    { type: "MANUAL", title: "THỦ CÔNG", desc: "Chỉ bật/tắt khi thao tác tay", icon: Hand },
                  ] as const).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        onClick={() => setScheduleType(item.type)}
                        className={cn(
                          "text-left border-2 rounded-[12px] p-4 transition-colors",
                          scheduleType === item.type ? "border-[#1B4332] bg-[#F0FAF3]" : "border-[#E2E8E4]"
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
                        <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Tên lịch trình*</label>
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
                      <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Thiết bị điều khiển*</label>
                      <select
                        className={cn("input-field", creatorFieldErrors.deviceId && "border-[#C0392B]")}
                        value={deviceId}
                        onChange={(event) => {
                          setDeviceId(event.target.value);
                          setCreatorFieldErrors((prev) => ({ ...prev, deviceId: null }));
                          setCreatorError(null);
                        }}
                      >
                        <option value="">-- Chọn thiết bị --</option>
                        {actuatorDevices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
                      </select>
                      <InlineFieldError message={creatorFieldErrors.deviceId} />
                    </div>

                    {scheduleType === "TIME_BASED" && (
                      <>
                        <div>
                          <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Ngày lặp lại</label>
                          <div className="flex gap-1 flex-wrap">
                            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                              <button
                                key={day}
                                onClick={() => setDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])}
                                className={cn(
                                  "px-3 py-1.5 rounded-[18px] text-[0.75rem] font-semibold border",
                                  days.includes(day) ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-[#5C7A6A] border-[#E2E8E4]"
                                )}
                              >
                                {weekdayShort(day)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                          <div>
                            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Repeat</label>
                            <select className="input-field" value={repeat} onChange={(event) => setRepeat(event.target.value as RepeatType)}>
                              <option value="once">Một lần</option>
                              <option value="daily">Hàng ngày</option>
                              <option value="weekly">Hàng tuần</option>
                            </select>
                          </div>
                        </div>
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

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setConditions((prev) => prev.length >= 4 ? prev : [...prev, { sensorType: "temperature", operator: ">", value: 30, unit: "°C" }])}
                            className="btn-secondary"
                          >
                            + Thêm điều kiện
                          </button>
                          <input type="number" className="input-field w-[130px]" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
                          <InlineFieldError message={creatorFieldErrors.duration} className="mt-0" />
                          <span className="text-[0.75rem] text-[#5C7A6A]">phút chạy</span>
                          <input type="number" className="input-field w-[130px]" value={cooldownMin} onChange={(event) => setCooldownMin(Number(event.target.value))} />
                          <span className="text-[0.75rem] text-[#5C7A6A]">phút cooldown</span>
                        </div>
                      </>
                    )}

                    {scheduleType === "MANUAL" && (
                      <p className="text-[0.8125rem] text-[#5C7A6A] bg-[#F7F8F6] border border-[#E2E8E4] rounded-[10px] p-3">
                        MANUAL schedule chỉ dùng để ghi log thao tác tay, không có cấu hình trigger tự động.
                      </p>
                    )}

                    <div>
                      <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Action</label>
                      <div className="flex gap-2">
                        {(["ON", "OFF"] as const).map((act) => (
                          <button key={act} onClick={() => setAction(act)} className={cn("flex-1 py-2 rounded-[8px] border-2 text-[0.8125rem] font-bold", action === act ? (act === "ON" ? "bg-[#27AE60] text-white border-[#27AE60]" : "bg-[#C0392B] text-white border-[#C0392B]") : "border-[#E2E8E4] text-[#5C7A6A]") }>
                            <Power size={13} className="inline mr-1" />{act}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[12px] border border-[#E2E8E4] p-4 bg-[#F7F8F6]">
                    <p className="text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold mb-3">Preview Rule</p>
                    <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">{name || "Tên lịch trình"}</p>
                    <p className="text-[0.75rem] text-[#5C7A6A] mt-1">{selectedGarden?.name ?? "Chưa chọn khu"}</p>
                    {scheduleType === "THRESHOLD_BASED" && (
                      <p className="text-[0.75rem] text-[#1A2E1F] mt-3 leading-relaxed">
                        Khi {conditions.map((condition) => `${sensorLabel(condition.sensorType)} ${condition.operator} ${condition.value}${condition.unit}`).join(` ${logic} `)}
                        <br />
                        -&gt; {action === "ON" ? "Bật" : "Tắt"} thiết bị trong {duration} phút
                        <br />
                        -&gt; Không kích hoạt lại trong {cooldownMin} phút
                      </p>
                    )}
                    {scheduleType === "TIME_BASED" && (
                      <p className="text-[0.75rem] text-[#1A2E1F] mt-3 leading-relaxed">
                        {weekdayText(days)} lúc {startTime}
                        <br />
                        -&gt; {action === "ON" ? "Bật" : "Tắt"} trong {duration} phút
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
                  disabled={!scheduleType || !name.trim() || !deviceId || !gardenId || (scheduleType === "THRESHOLD_BASED" && conditions.length === 0)}
                >
                  Lưu lịch trình
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
        active ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-[#5C7A6A] border-[#E2E8E4]"
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
  if (!days.length) return "Không chọn ngày";
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
  setter: React.Dispatch<React.SetStateAction<ConditionForm[]>>,
  index: number,
  patch: Partial<ConditionForm>
) {
  setter((prev) => prev.map((item, idx) => idx === index ? { ...item, ...patch } : item));
}
