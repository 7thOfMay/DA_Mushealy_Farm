"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { Badge, EmptyState } from "@/frontend/components/shared/index";
import { useAppStore } from "@/frontend/context/store";
import { cropKnowledgeCatalog } from "@/frontend/utils/cropKnowledge";
import { cn } from "@/frontend/utils/utils";
import { apiCreateAlertRule, apiUpdateAlertRule, apiDeleteAlertRule } from "@/frontend/services/client";
import type { AlertRule, SensorType } from "@/types";
import { CircleAlert, Pencil, Plus, ShieldAlert, SlidersHorizontal, Trash2, X } from "lucide-react";

const severityTheme: Record<AlertRule["severity"], { badge: "danger" | "warn" | "info"; color: string }> = {
  CRITICAL: { badge: "danger", color: "#C0392B" },
  WARNING: { badge: "warn", color: "#E67E22" },
  INFO: { badge: "info", color: "#2980B9" },
};

type Condition = {
  sensorType: SensorType;
  operator: "<" | ">" | "<=" | ">=" | "==";
  value: number;
  unit: string;
};

export default function AlertRulesPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const farms = useAppStore((state) => state.farms);
  const cropTypes = useAppStore((state) => state.cropTypes);
  const gardens = useAppStore((state) => state.gardens);
  const devices = useAppStore((state) => state.devices);
  const rules = useAppStore((state) => state.alertRules);
  const addAlertRule = useAppStore((state) => state.addAlertRule);
  const updateAlertRule = useAppStore((state) => state.updateAlertRule);
  const deleteAlertRule = useAppStore((state) => state.deleteAlertRule);
  const toggleAlertRule = useAppStore((state) => state.toggleAlertRule);
  const farm = farms.find((item) => item.id === farmId);
  const addToast = useAppStore((state) => state.addToast);
  const [showModal, setShowModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [tab, setTab] = useState<"byGarden" | "byCrop">("byGarden");
  const [knowledgeCropId, setKnowledgeCropId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cropTypeId, setCropTypeId] = useState(cropTypes[0]?.id ?? "");
  const [severity, setSeverity] = useState<AlertRule["severity"]>("WARNING");
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [conditions, setConditions] = useState<Condition[]>([
    { sensorType: "temperature", operator: ">", value: 35, unit: "°C" },
  ]);
  const [enableAutoAction, setEnableAutoAction] = useState(false);
  const [actionDeviceId, setActionDeviceId] = useState("");
  const [actionType, setActionType] = useState<"ON" | "OFF">("ON");
  const [durationMin, setDurationMin] = useState(15);

  const farmGardenIds = new Set(gardens.filter((garden) => garden.farmId === farmId).map((garden) => garden.id));
  const actuatorDevices = devices.filter((device) => farmGardenIds.has(device.gardenId) && (device.type === "pump" || device.type === "led_rgb"));
  const farmRules = useMemo(() => rules.filter((rule) => rule.farmId === farmId), [rules, farmId]);

  const groupedByTab = useMemo(() => ({
    byGarden: farmRules.filter((rule) => Boolean(rule.gardenId)),
    byCrop: farmRules.filter((rule) => !rule.gardenId),
  }), [farmRules]);

  const resetForm = () => {
    setEditingRuleId(null);
    setName("");
    setCropTypeId(cropTypes[0]?.id ?? "");
    setSeverity("WARNING");
    setLogic("AND");
    setConditions([{ sensorType: "temperature", operator: ">", value: 35, unit: "°C" }]);
    setEnableAutoAction(false);
    setActionDeviceId("");
    setActionType("ON");
    setDurationMin(15);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (rule: AlertRule) => {
    setEditingRuleId(rule.id);
    setName(rule.name);
    setCropTypeId(rule.cropTypeId);
    setSeverity(rule.severity);
    setLogic(rule.logic);
    setConditions(rule.conditions);
    setEnableAutoAction(Boolean(rule.autoAction));
    setActionDeviceId(rule.autoAction?.deviceId ?? "");
    setActionType(rule.autoAction?.action ?? "ON");
    setDurationMin(rule.autoAction?.durationMin ?? 15);
    setShowModal(true);
  };

  const saveRule = async () => {
    if (!name.trim() || !conditions.length) return;

    if (editingRuleId) {
      try { await apiUpdateAlertRule(editingRuleId, name.trim(), severity); } catch {}
      updateAlertRule(editingRuleId, {
        cropTypeId,
        name: name.trim(),
        severity,
        logic,
        conditions,
        autoAction: enableAutoAction && actionDeviceId ? { deviceId: actionDeviceId, action: actionType, durationMin } : undefined,
      });
      setShowModal(false);
      resetForm();
      addToast({ type: "success", message: "Đã cập nhật alert rule" });
      return;
    }

    let serverId: string | undefined;
    try {
      const apiConditions = conditions.map((c) => ({ metricType: c.sensorType, operator: c.operator, value1: c.value }));
      const result = await apiCreateAlertRule(name.trim(), severity, undefined, undefined, null, apiConditions);
      serverId = result?.ruleId;
    } catch {}

    const next: AlertRule = {
      id: serverId || `ar${Date.now()}`,
      farmId,
      cropTypeId,
      name: name.trim(),
      severity,
      logic,
      conditions,
      autoAction: enableAutoAction && actionDeviceId ? { deviceId: actionDeviceId, action: actionType, durationMin } : undefined,
      isActive: true,
      createdBy: "u1",
      createdAt: new Date().toISOString(),
    };

    addAlertRule(next);
    setShowModal(false);
    resetForm();
    addToast({ type: "success", message: "Đã tạo quy tắc cảnh báo mới" });
  };

  if (!farm) {
    return <div><Topbar title="Quy tắc Cảnh báo" subtitle="Không tìm thấy nông trại" /></div>;
  }

  const activeKnowledge = cropKnowledgeCatalog.find((crop) => crop.id === knowledgeCropId) ?? null;

  return (
    <div>
      <Topbar title="Quy tắc Cảnh báo" subtitle={`${farm.name} · Rule per crop và per garden`} />
      <div className="p-8 space-y-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CircleAlert size={16} className="text-[#1B4332]" />
            <h3 className="font-semibold text-[0.95rem] text-[#1A2E1F]">Kiến thức thiết lập cảnh báo theo cây trồng</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {cropKnowledgeCatalog.map((crop) => (
              <div key={crop.id} className="rounded-[12px] border border-[#E2E8E4] p-3 bg-[#F7F8F6]">
                <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">{crop.name}</p>
                <p className="text-[0.75rem] text-[#5C7A6A] mt-1 line-clamp-2">{crop.biology}</p>
                <button
                  className="btn-secondary mt-3 text-[0.75rem]"
                  onClick={() => setKnowledgeCropId(crop.id)}
                >
                  Xem đặc tính và ngưỡng
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 border-b border-[#E2E8E4]">
            {[{ id: "byGarden", label: "Theo khu vườn" }, { id: "byCrop", label: "Theo loại cây" }].map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as "byGarden" | "byCrop")}
                className={cn(
                  "px-4 py-2.5 text-[0.875rem] font-medium border-b-2 transition-colors -mb-px",
                  tab === item.id ? "border-[#1B4332] text-[#1B4332]" : "border-transparent text-[#5C7A6A]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Tạo quy tắc mới</button>
        </div>

        {groupedByTab[tab].length === 0 && (
          <EmptyState icon={ShieldAlert} title="Chưa có alert rule" description="Tạo quy tắc để hệ thống phát hiện bất thường đa cảm biến." />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {groupedByTab[tab].map((rule) => {
            const crop = cropTypes.find((item) => item.id === rule.cropTypeId);
            const level = severityTheme[rule.severity];
            return (
              <div key={rule.id} className="card p-4 border-l-4" style={{ borderLeftColor: level.color }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[0.95rem] text-[#1A2E1F]">{rule.name}</h3>
                    <p className="text-[0.75rem] text-[#5C7A6A] mt-0.5">{crop?.name ?? "Không rõ loại cây"}</p>
                  </div>
                  <Badge variant={level.badge}>{rule.severity}</Badge>
                </div>

                <p className="text-[0.8125rem] text-[#1A2E1F] mt-3">
                  {rule.conditions.map((condition) => `${labelSensor(condition.sensorType)} ${condition.operator} ${condition.value}${condition.unit}`).join(` ${rule.logic} `)}
                </p>
                <p className="text-[0.75rem] text-[#5C7A6A] mt-1">
                  {rule.autoAction ? `Tự động: ${rule.autoAction.action === "ON" ? "Bật" : "Tắt"} thiết bị ${rule.autoAction.durationMin} phút` : "Không có hành động tự động"}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try { await apiUpdateAlertRule(rule.id, undefined, undefined, undefined, !rule.isActive); } catch {}
                        toggleAlertRule(rule.id);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-[20px] text-[0.6875rem] font-semibold border",
                        rule.isActive ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-[#5C7A6A] border-[#E2E8E4]"
                      )}
                    >
                      {rule.isActive ? "Đang bật" : "Đang tắt"}
                    </button>
                    <button
                      onClick={() => openEdit(rule)}
                      className="p-2 rounded-[8px] border border-[#E2E8E4] text-[#1B4332]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        try { await apiDeleteAlertRule(rule.id); } catch {}
                        deleteAlertRule(rule.id);
                        addToast({ type: "warning", message: "Đã xóa alert rule" });
                      }}
                      className="p-2 rounded-[8px] border border-[#E2E8E4] text-[#C0392B]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-[16px] shadow-[0_24px_80px_rgba(0,0,0,0.22)] w-full max-w-[860px] overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-[#E2E8E4] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[1.125rem] text-[#1A2E1F]">Tạo/Sửa Alert Rule</h2>
                <p className="text-[0.75rem] text-[#5C7A6A] mt-1">Multi-sensor rule builder theo crop type</p>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="w-8 h-8 rounded-full hover:bg-[#F0F4F0] flex items-center justify-center">
                <SlidersHorizontal size={16} className="text-[#5C7A6A]" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Tên quy tắc*</label>
                  <input className="input-field" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Loại cây áp dụng</label>
                  <select className="input-field" value={cropTypeId} onChange={(event) => setCropTypeId(event.target.value)}>
                    {cropTypes.map((crop) => <option key={crop.id} value={crop.id}>{crop.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Mức độ</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["INFO", "WARNING", "CRITICAL"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setSeverity(level)}
                      className={cn(
                        "py-2 rounded-[10px] border text-[0.8125rem] font-semibold",
                        severity === level ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-[#5C7A6A] border-[#E2E8E4]"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[0.75rem] font-semibold text-[#5C7A6A]">Logic</span>
                  <button onClick={() => setLogic("AND")} className={cn("px-2 py-1 rounded-[8px] border text-[0.75rem]", logic === "AND" ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-[#E2E8E4] text-[#5C7A6A]")}>AND</button>
                  <button onClick={() => setLogic("OR")} className={cn("px-2 py-1 rounded-[8px] border text-[0.75rem]", logic === "OR" ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-[#E2E8E4] text-[#5C7A6A]")}>OR</button>
                </div>
                <div className="space-y-2">
                  {conditions.map((condition, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_90px_100px_70px_auto] gap-2 items-center">
                      <select className="input-field" value={condition.sensorType} onChange={(event) => setConditions((prev) => prev.map((item, idx) => idx === index ? { ...item, sensorType: event.target.value as SensorType } : item))}>
                        <option value="temperature">Nhiệt độ</option>
                        <option value="humidity_air">Độ ẩm không khí</option>
                        <option value="humidity_soil">Độ ẩm đất</option>
                        <option value="light">Ánh sáng</option>
                      </select>
                      <select className="input-field" value={condition.operator} onChange={(event) => setConditions((prev) => prev.map((item, idx) => idx === index ? { ...item, operator: event.target.value as Condition["operator"] } : item))}>
                        <option value="<">&lt;</option>
                        <option value=">">&gt;</option>
                        <option value="<=">&lt;=</option>
                        <option value=">=">&gt;=</option>
                        <option value="==">=</option>
                      </select>
                      <input type="number" className="input-field" value={condition.value} onChange={(event) => setConditions((prev) => prev.map((item, idx) => idx === index ? { ...item, value: Number(event.target.value) } : item))} />
                      <input className="input-field" value={condition.unit} onChange={(event) => setConditions((prev) => prev.map((item, idx) => idx === index ? { ...item, unit: event.target.value } : item))} />
                      <button className="p-2 border border-[#E2E8E4] rounded-[8px] text-[#C0392B]" onClick={() => setConditions((prev) => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index))}><X size={14} /></button>
                    </div>
                  ))}
                </div>
                <button className="btn-secondary mt-2" onClick={() => setConditions((prev) => prev.length >= 4 ? prev : [...prev, { sensorType: "temperature", operator: ">", value: 30, unit: "°C" }])}>+ Thêm điều kiện</button>
              </div>

              <div className="rounded-[12px] border border-[#E2E8E4] p-3">
                <label className="flex items-center gap-2 text-[0.8125rem] text-[#1A2E1F] font-medium">
                  <input type="checkbox" checked={enableAutoAction} onChange={(event) => setEnableAutoAction(event.target.checked)} />
                  Tự động thực hiện hành động khi cảnh báo xảy ra
                </label>
                {enableAutoAction && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select className="input-field" value={actionDeviceId} onChange={(event) => setActionDeviceId(event.target.value)}>
                      <option value="">Chọn thiết bị</option>
                      {actuatorDevices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
                    </select>
                    <select className="input-field" value={actionType} onChange={(event) => setActionType(event.target.value as "ON" | "OFF")}>
                      <option value="ON">Bật</option>
                      <option value="OFF">Tắt</option>
                    </select>
                    <input type="number" className="input-field" value={durationMin} onChange={(event) => setDurationMin(Number(event.target.value))} />
                  </div>
                )}
              </div>

              <div className="bg-[#F0FAF3] border border-[#D1E8DC] rounded-[10px] p-3">
                <p className="text-[0.75rem] text-[#1A2E1F]">
                  Cảnh báo khi {conditions.map((condition) => `${labelSensor(condition.sensorType)} ${condition.operator} ${condition.value}${condition.unit}`).join(` ${logic} `)}
                </p>
                {enableAutoAction && actionDeviceId && (
                  <p className="text-[0.75rem] text-[#1A2E1F] mt-1">
                    Tự động {actionType === "ON" ? "bật" : "tắt"} thiết bị trong {durationMin} phút
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Hủy</button>
              <button onClick={saveRule} className="btn-primary" disabled={!name.trim() || conditions.length === 0}>{editingRuleId ? "Lưu thay đổi" : "Lưu quy tắc"}</button>
            </div>
          </div>
        </div>
      )}

      {activeKnowledge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setKnowledgeCropId(null)} />
          <div className="relative bg-white rounded-[16px] shadow-[0_24px_80px_rgba(0,0,0,0.22)] w-full max-w-[920px] max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#E2E8E4] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[1.125rem] text-[#1A2E1F]">{activeKnowledge.name}</h2>
                <p className="text-[0.75rem] text-[#5C7A6A] mt-0.5">Đặc tính sinh học và ngưỡng cảnh báo khuyến nghị</p>
              </div>
              <button onClick={() => setKnowledgeCropId(null)} className="w-8 h-8 rounded-full hover:bg-[#F0F4F0] flex items-center justify-center">
                <X size={16} className="text-[#5C7A6A]" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <section>
                <h3 className="text-[0.8125rem] font-semibold uppercase tracking-wide text-[#1B4332] mb-2">Đặc tính sinh học</h3>
                <p className="text-[0.875rem] text-[#1A2E1F]">{activeKnowledge.biology}</p>
              </section>

              <section>
                <h3 className="text-[0.8125rem] font-semibold uppercase tracking-wide text-[#1B4332] mb-2">Đặc tính môi trường</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeKnowledge.environment.map((env) => (
                    <div key={env.label} className="rounded-[12px] border border-[#E2E8E4] p-3">
                      <p className="font-semibold text-[0.875rem] text-[#1A2E1F] mb-1.5">{env.label}</p>
                      <ul className="space-y-1">
                        {env.details.map((detail) => (
                          <li key={detail} className="text-[0.8125rem] text-[#5C7A6A]">- {detail}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-[12px] border border-[#F4CACA] bg-[#FEF6F6] p-3">
                  <p className="font-semibold text-[0.8125rem] uppercase tracking-wide text-[#C0392B] mb-2">Ngưỡng cảnh báo (Warning)</p>
                  <ul className="space-y-1">
                    {activeKnowledge.warningThresholds.map((item) => (
                      <li key={item} className="text-[0.8125rem] text-[#7A2A23]">- {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[12px] border border-[#E8B4B4] bg-[#FEECEC] p-3">
                  <p className="font-semibold text-[0.8125rem] uppercase tracking-wide text-[#8E2A22] mb-2">Ngưỡng nghiêm trọng (Critical)</p>
                  <ul className="space-y-1">
                    {activeKnowledge.criticalThresholds.map((item) => (
                      <li key={item} className="text-[0.8125rem] text-[#6E201B]">- {item}</li>
                    ))}
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-[0.8125rem] font-semibold uppercase tracking-wide text-[#1B4332] mb-2">Sinh trưởng và phát triển</h3>
                <p className="text-[0.875rem] text-[#1A2E1F]">{activeKnowledge.growth}</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function labelSensor(sensor: SensorType) {
  const map: Record<SensorType, string> = {
    temperature: "Nhiệt độ",
    humidity_air: "Độ ẩm không khí",
    humidity_soil: "Độ ẩm đất",
    light: "Ánh sáng",
  };
  return map[sensor];
}