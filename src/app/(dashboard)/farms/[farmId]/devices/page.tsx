"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { ErrorState } from "@/components/shared/ErrorStates";
import { useAppStore } from "@/lib/store";
import { Badge, EmptyState, FormErrorBanner, InlineFieldError, StatusDot } from "@/components/shared/index";
import { ToggleSwitch } from "@/components/shared/ToggleSwitch";
import { RGBController } from "@/components/devices/RGBController";
import { cn, timeAgo } from "@/lib/utils";
import { apiCreateDevice, apiUpdateDevice, apiSendDeviceCommand } from "@/lib/api/client";
import { lockDeviceToggle } from "@/hooks/useApiHydration";
import type { DeviceType } from "@/types";
import {
  Activity,
  Cpu,
  Droplet,
  Droplets,
  Filter,
  LayoutGrid,
  Lightbulb,
  List,
  Plus,
  Search,
  Sun,
  Thermometer,
  X,
  Zap,
} from "lucide-react";

const deviceTypeLabel: Record<DeviceType, string> = {
  pump: "Máy bơm nước",
  led_rgb: "Đèn RGB cảnh báo",
  sensor_temp: "Cảm biến nhiệt độ",
  sensor_humidity_air: "Cảm biến độ ẩm không khí",
  sensor_humidity_soil: "Cảm biến độ ẩm đất",
  sensor_light: "Cảm biến ánh sáng",
};

const deviceTypeIcon: Record<DeviceType, typeof Cpu> = {
  pump: Droplets,
  led_rgb: Lightbulb,
  sensor_temp: Thermometer,
  sensor_humidity_air: Droplet,
  sensor_humidity_soil: Droplet,
  sensor_light: Sun,
};

type ModalCategory = "SENSOR" | "ACTUATOR" | null;

export default function FarmDevicesPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const farms = useAppStore((state) => state.farms);
  const gardens = useAppStore((state) => state.gardens);
  const farm = farms.find((item) => item.id === farmId);

  const storeDevices = useAppStore((state) => state.devices);
  const addDevice = useAppStore((state) => state.addDevice);
  const toggleDevice = useAppStore((state) => state.toggleDevice);
  const addToast = useAppStore((state) => state.addToast);
  const loggedInUser = useAppStore((state) => state.loggedInUser);

  const [view, setView] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sensor" | "actuator" | "online" | "error">("all");
  const [gardenFilter, setGardenFilter] = useState<string>("all");

  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<ModalCategory>(null);
  const [detailType, setDetailType] = useState<DeviceType | null>(null);
  const [form, setForm] = useState({
    name: "",
    hardwareId: "",
    gardenId: "",
    locationNote: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<"name" | "hardwareId" | "gardenId", string | null>>({
    name: null,
    hardwareId: null,
    gardenId: null,
  });

  const farmGardens = gardens.filter((garden) => garden.farmId === farmId);

  const farmDevices = useMemo(() => {
    const farmGardenIds = new Set(farmGardens.map((garden) => garden.id));
    return storeDevices.filter((device) => farmGardenIds.has(device.gardenId));
  }, [storeDevices, farmGardens]);

  const filteredDevices = farmDevices.filter((device) => {
    const hardwareToken = device.hardwareId ?? device.id.toUpperCase();
    const matchesSearch = !search || `${device.name} ${hardwareToken}`.toLowerCase().includes(search.toLowerCase());

    const isSensor = device.type.startsWith("sensor_");
    const matchesCategory =
      statusFilter === "all"
      || (statusFilter === "sensor" && isSensor)
      || (statusFilter === "actuator" && !isSensor)
      || (statusFilter === "online" && (device.status === "online" || device.status === "active"))
      || (statusFilter === "error" && device.status !== "online" && device.status !== "active");

    const matchesGarden = gardenFilter === "all" || device.gardenId === gardenFilter;
    return matchesSearch && matchesCategory && matchesGarden;
  });

  const resetModal = () => {
    setShowModal(false);
    setStep(1);
    setCategory(null);
    setDetailType(null);
    setForm({ name: "", hardwareId: "", gardenId: farmGardens[0]?.id ?? "", locationNote: "" });
    setFormError(null);
    setFieldErrors({ name: null, hardwareId: null, gardenId: null });
  };

  const handleCreateDevice = async () => {
    const nextErrors: Record<"name" | "hardwareId" | "gardenId", string | null> = {
      name: form.name.trim() ? null : "Tên hiển thị là bắt buộc.",
      hardwareId: form.hardwareId.trim() ? null : "Hardware ID là bắt buộc.",
      gardenId: form.gardenId ? null : "Bạn cần chọn khu vườn.",
    };
    setFieldErrors(nextErrors);
    if (!detailType || nextErrors.name || nextErrors.hardwareId || nextErrors.gardenId) {
      setFormError("Vui lòng điền đủ các trường bắt buộc trước khi lưu thiết bị.");
      return;
    }

    const targetGarden = farmGardens.find((garden) => garden.id === form.gardenId);
    if (!targetGarden) {
      setFormError("Khu vườn đã chọn không hợp lệ. Vui lòng chọn lại.");
      return;
    }

    const deviceTypeIdMap: Record<DeviceType, number> = {
      sensor_temp: 1, sensor_humidity_air: 2, sensor_humidity_soil: 3, sensor_light: 4,
      pump: 5, led_rgb: 7,
    };
    const isActuator = detailType === "pump" || detailType === "led_rgb";

    let serverId: string | undefined;
    try {
      const result = await apiCreateDevice(
        form.hardwareId.trim(), form.name.trim(),
        deviceTypeIdMap[detailType] ?? 1, targetGarden.id,
        form.locationNote.trim() || null, isActuator,
      );
      serverId = result?.deviceId;
    } catch { /* fallback to local */ }

    addDevice({
      id: serverId || `d${Date.now()}`,
      name: form.name.trim(),
      type: detailType,
      gardenId: targetGarden.id,
      gardenName: targetGarden.name,
      status: "online",
      isOn: detailType === "pump" || detailType === "led_rgb",
      lastUpdated: new Date().toISOString(),
      description: form.locationNote.trim() || undefined,
      hardwareId: form.hardwareId.trim(),
      locationNote: form.locationNote.trim() || undefined,
      lastSeenAt: new Date().toISOString(),
    });

    addToast({ type: "success", message: `Đã thêm ${form.name.trim()}` });
    resetModal();
  };

  if (!farm) {
    return (
      <div>
        <Topbar title="Thiết bị & Cảm biến" subtitle="Không tìm thấy nông trại" />
        <div className="p-8 max-w-3xl">
          <ErrorState title="Nông trại không tồn tại" description="Đường dẫn hiện tại không hợp lệ hoặc nông trại đã bị xóa." />
        </div>
      </div>
    );
  }

  if (farmGardens.length === 0) {
    return (
      <div>
        <Topbar title="Thiết bị & Cảm biến" subtitle={`${farm.name} / Quản lý thiết bị theo khu vườn`} />
        <div className="p-8 max-w-3xl">
          <ErrorState title="Chưa có khu vườn để gắn thiết bị" description="Hãy tạo ít nhất một khu vườn trong nông trại trước khi thêm sensor hoặc actuator." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Thiết bị & Cảm biến" subtitle={`${farm.name} / Quản lý thiết bị theo khu vườn`} />

      <div className="p-8 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C7A6A]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên hoặc hardware_id"
                className="input-field pl-9 min-w-[280px]"
              />
            </div>
            <select className="input-field" value={gardenFilter} onChange={(event) => setGardenFilter(event.target.value)}>
              <option value="all">Tất cả khu vườn</option>
              {farmGardens.map((garden) => (
                <option key={garden.id} value={garden.id}>{garden.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-[8px] border border-[#E2E8E4] overflow-hidden">
              <button onClick={() => setView("grid")} className={cn("p-2", view === "grid" ? "bg-[#1B4332] text-white" : "text-[#5C7A6A] bg-white")}> <LayoutGrid size={15} /></button>
              <button onClick={() => setView("table")} className={cn("p-2", view === "table" ? "bg-[#1B4332] text-white" : "text-[#5C7A6A] bg-white")}> <List size={15} /></button>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> Thêm thiết bị</button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-[#5C7A6A]" />
          {[
            { id: "all", label: "Tất cả" },
            { id: "sensor", label: "Cảm biến" },
            { id: "actuator", label: "Điều khiển" },
            { id: "online", label: "Đang hoạt động" },
            { id: "error", label: "Lỗi" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id as typeof statusFilter)}
              className={cn(
                "px-3 py-1.5 rounded-[20px] text-[0.8125rem] font-medium border transition-colors",
                statusFilter === item.id
                  ? "bg-[#1B4332] text-white border-[#1B4332]"
                  : "bg-white text-[#5C7A6A] border-[#E2E8E4] hover:border-[#1B4332] hover:text-[#1B4332]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filteredDevices.length === 0 && (
          <EmptyState icon={Cpu} title="Không có thiết bị phù hợp" description="Thử thay đổi bộ lọc hoặc thêm thiết bị mới." />
        )}

        {view === "grid" && filteredDevices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredDevices.map((device) => {
              const Icon = deviceTypeIcon[device.type] ?? Cpu;
              const hardwareId = device.hardwareId ?? device.id.toUpperCase();
              const isActuator = device.type === "pump" || device.type === "led_rgb";
              return (
                <div key={device.id} className="card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot status={device.status} />
                      <p className="text-[0.75rem] text-[#5C7A6A]">{timeAgo(device.lastUpdated)}</p>
                    </div>
                    <Badge variant={isActuator ? "warn" : "info"}>{isActuator ? "ACTUATOR" : "SENSOR"}</Badge>
                  </div>
                  <div className="w-12 h-12 rounded-[10px] bg-[#F0FAF3] flex items-center justify-center">
                    <Icon size={22} className="text-[#1B4332]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[0.9rem] text-[#1A2E1F] leading-tight">{device.name}</p>
                    <p className="text-[0.75rem] text-[#5C7A6A]">{device.gardenName}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    {isActuator ? (
                      <ToggleSwitch checked={device.isOn} onChange={async () => { const cmd = device.isOn ? 'turn_off' : 'turn_on'; try { await apiUpdateDevice(device.id, undefined, device.isOn ? 'online' : 'active'); await apiSendDeviceCommand(device.id, cmd, {}, loggedInUser?.id); } catch {} lockDeviceToggle(device.id); toggleDevice(device.id); }} disabled={device.status !== "online" && device.status !== "active"} size="sm" />
                    ) : (
                      <p className="text-[1.375rem] font-bold text-[#1A2E1F]" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {device.lastValue != null ? device.lastValue : "--"}
                        {device.lastValue != null && device.lastUnit && <span className="text-[0.75rem] text-[#5C7A6A] ml-1">{device.lastUnit}</span>}
                      </p>
                    )}
                    <Badge variant={device.status === "online" || device.status === "active" ? "ok" : device.status === "error" ? "danger" : "default"}>
                      {device.status}
                    </Badge>
                  </div>
                  {device.type === "led_rgb" && (
                    <RGBController
                      enabled={(device.status === "online" || device.status === "active") && !!device.isOn}
                      onApply={(payload) => {
                        addToast({
                          type: "info",
                          message: `Da cap nhat RGB ${device.name}: ${payload.color} / ${payload.intensity}%${payload.blink ? " / blink" : ""}`,
                        });
                      }}
                    />
                  )}
                  <p className="text-[0.6875rem] text-[#5C7A6A] font-mono bg-[#F4F6F4] rounded-[6px] px-2 py-1">{hardwareId}</p>
                </div>
              );
            })}
          </div>
        )}

        {view === "table" && filteredDevices.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F7F8F6] border-b border-[#E2E8E4]">
                <tr>
                  {["Thiết bị", "Khu vườn", "Hardware ID", "Trạng thái", "Giá trị/Toggle", "Cập nhật"].map((head) => (
                    <th key={head} className="text-left px-4 py-3 text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4]">
                {filteredDevices.map((device) => {
                  const Icon = deviceTypeIcon[device.type] ?? Cpu;
                  const hardwareId = device.hardwareId ?? device.id.toUpperCase();
                  const isActuator = device.type === "pump" || device.type === "led_rgb";
                  return (
                    <tr key={device.id} className="hover:bg-[#F7F8F6] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className="text-[#1B4332]" />
                          <div>
                            <p className="text-[0.875rem] font-medium text-[#1A2E1F]">{device.name}</p>
                            <Badge variant={isActuator ? "warn" : "info"}>{isActuator ? "ACTUATOR" : "SENSOR"}</Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[0.8125rem] text-[#5C7A6A]">{device.gardenName}</td>
                      <td className="px-4 py-3 text-[0.75rem] font-mono text-[#5C7A6A]">{hardwareId}</td>
                      <td className="px-4 py-3"><StatusDot status={device.status} /></td>
                      <td className="px-4 py-3">
                        {isActuator ? (
                          <ToggleSwitch checked={device.isOn} onChange={async () => { const cmd = device.isOn ? 'turn_off' : 'turn_on'; try { await apiUpdateDevice(device.id, undefined, device.isOn ? 'online' : 'active'); await apiSendDeviceCommand(device.id, cmd, {}, loggedInUser?.id); } catch {} lockDeviceToggle(device.id); toggleDevice(device.id); }} disabled={device.status !== "online" && device.status !== "active"} size="sm" />
                        ) : (
                          <span className="text-[0.8125rem] text-[#5C7A6A]">Giá trị mới nhất</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[0.8125rem] text-[#5C7A6A]">{timeAgo(device.lastUpdated)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetModal} />
          <div className="relative w-full max-w-[720px] rounded-[16px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-[#E2E8E4] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[1.125rem] text-[#1A2E1F]">Thêm thiết bị mới</h2>
                <p className="text-[0.75rem] text-[#5C7A6A] mt-1">Step {step}/3</p>
              </div>
              <button onClick={resetModal} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F0F4F0]">
                <X size={16} className="text-[#5C7A6A]" />
              </button>
            </div>

            <div className="p-6">
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { id: "SENSOR", title: "Cảm biến", icon: Activity },
                    { id: "ACTUATOR", title: "Thiết bị điều khiển", icon: Zap },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCategory(item.id as ModalCategory)}
                        className={cn(
                          "p-5 rounded-[12px] border-2 text-left transition-colors",
                          category === item.id ? "border-[#1B4332] bg-[#F0FAF3]" : "border-[#E2E8E4]"
                        )}
                      >
                        <Icon size={22} className="text-[#1B4332] mb-3" />
                        <p className="font-semibold text-[#1A2E1F]">{item.title}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(category === "SENSOR"
                    ? (["sensor_temp", "sensor_humidity_air", "sensor_humidity_soil", "sensor_light"] as DeviceType[])
                    : (["pump", "led_rgb"] as DeviceType[])
                  ).map((type) => (
                    <button
                      key={type}
                      onClick={() => setDetailType(type)}
                      className={cn(
                        "p-4 rounded-[10px] border text-left transition-colors",
                        detailType === type ? "border-[#1B4332] bg-[#F0FAF3]" : "border-[#E2E8E4]"
                      )}
                    >
                      <p className="font-semibold text-[#1A2E1F]">{deviceTypeLabel[type]}</p>
                    </button>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4">
                  <div className="space-y-3">
                    <FormErrorBanner message={formError} />
                    <div>
                      <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Tên hiển thị*</label>
                      <input
                        className={cn("input-field", fieldErrors.name && "border-[#C0392B]")}
                        value={form.name}
                        onChange={(event) => {
                          setForm((prev) => ({ ...prev, name: event.target.value }));
                          setFieldErrors((prev) => ({ ...prev, name: null }));
                          setFormError(null);
                        }}
                      />
                      <InlineFieldError message={fieldErrors.name} />
                    </div>
                    <div>
                      <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Hardware ID*</label>
                      <input
                        className={cn("input-field", fieldErrors.hardwareId && "border-[#C0392B]")}
                        value={form.hardwareId}
                        onChange={(event) => {
                          setForm((prev) => ({ ...prev, hardwareId: event.target.value }));
                          setFieldErrors((prev) => ({ ...prev, hardwareId: null }));
                          setFormError(null);
                        }}
                      />
                      <InlineFieldError message={fieldErrors.hardwareId} />
                    </div>
                    <div>
                      <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Khu vườn*</label>
                      <select
                        className={cn("input-field", fieldErrors.gardenId && "border-[#C0392B]")}
                        value={form.gardenId}
                        onChange={(event) => {
                          setForm((prev) => ({ ...prev, gardenId: event.target.value }));
                          setFieldErrors((prev) => ({ ...prev, gardenId: null }));
                          setFormError(null);
                        }}
                      >
                        {farmGardens.map((garden) => <option key={garden.id} value={garden.id}>{garden.name}</option>)}
                      </select>
                      <InlineFieldError message={fieldErrors.gardenId} />
                    </div>
                    <div>
                      <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Ghi chú vị trí</label>
                      <textarea className="input-field min-h-[100px] resize-none" value={form.locationNote} onChange={(event) => setForm((prev) => ({ ...prev, locationNote: event.target.value }))} />
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-[#E2E8E4] p-4 bg-[#F7F8F6]">
                    <p className="text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold mb-3">Preview</p>
                    <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">{form.name || "Tên thiết bị"}</p>
                    <p className="text-[0.75rem] text-[#5C7A6A] mt-1">{detailType ? deviceTypeLabel[detailType] : "Chưa chọn loại"}</p>
                    <p className="text-[0.6875rem] text-[#5C7A6A] mt-3 font-mono bg-white rounded-[6px] px-2 py-1">{form.hardwareId || "HW-XXXX"}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pb-5 flex justify-between">
              <button
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                className="btn-secondary"
                disabled={step === 1}
              >
                Quay lại
              </button>
              {step < 3 ? (
                <button
                  onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                  className="btn-primary"
                  disabled={(step === 1 && !category) || (step === 2 && !detailType)}
                >
                  Tiếp theo
                </button>
              ) : (
                <button onClick={handleCreateDevice} className="btn-primary" disabled={!form.name.trim() || !form.hardwareId.trim() || !form.gardenId || !detailType}>
                  Lưu thiết bị
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
