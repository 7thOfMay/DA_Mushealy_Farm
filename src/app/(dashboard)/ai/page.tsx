"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  BrainCircuit,
  ImagePlus,
  LayoutDashboard,
  MessageSquarePlus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { ErrorState, LoadingState } from "@/frontend/components/shared/ErrorStates";
import { useAppStore } from "@/frontend/context/store";
import {
  apiDeleteAIChatSession,
  apiGetAIChatState,
  apiSendAIChatMessage,
} from "@/frontend/services/client";
import { cn, timeAgo } from "@/frontend/utils/utils";
import type { AIDashboardContext, AIChatSessionDetail, AIChatSessionSummary } from "@/types";

export default function AIPage() {
  const currentFarmId = useAppStore((state) => state.currentFarmId);
  const gardens = useAppStore((state) => state.gardens);
  const loggedInUser = useAppStore((state) => state.loggedInUser);
  const addToast = useAppStore((state) => state.addToast);

  const farmGardens = useMemo(() => {
    if (!currentFarmId) return gardens;
    return gardens.filter((garden) => garden.farmId === currentFarmId);
  }, [gardens, currentFarmId]);

  const [selectedGardenId, setSelectedGardenId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AIChatSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<AIChatSessionDetail | null>(null);
  const [dashboard, setDashboard] = useState<AIDashboardContext | null>(null);
  const [composer, setComposer] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedGardenId) {
      setSessions([]);
      setActiveSession(null);
      setDashboard(null);
      setActiveSessionId(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      if (!loggedInUser) return;
      setIsLoading(true);
      setLoadError(null);

      const response = await apiGetAIChatState(loggedInUser.id, selectedGardenId, activeSessionId ?? undefined);
      if (cancelled) return;

      if (!response) {
        setLoadError("Không tải được dữ liệu AI chat.");
        setIsLoading(false);
        return;
      }

      setSessions(response.sessions);
      setDashboard(response.dashboard);
      setGeminiConfigured(response.geminiConfigured);

      const nextSessionResponse = !response.activeSession && !activeSessionId && response.sessions[0]
        ? await apiGetAIChatState(loggedInUser.id, selectedGardenId, response.sessions[0].id)
        : null;

      if (cancelled) return;

      if (response.activeSession) {
        setActiveSession(response.activeSession);
        setActiveSessionId(response.activeSession.id);
      } else if (!activeSessionId && nextSessionResponse?.activeSession) {
        setActiveSession(nextSessionResponse.activeSession);
        setActiveSessionId(nextSessionResponse.activeSession.id);
      } else if (!activeSessionId) {
        setActiveSession(null);
      }

      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeSessionId, loggedInUser, selectedGardenId]);

  useEffect(() => {
    if (!messagesViewportRef.current) return;
    messagesViewportRef.current.scrollTop = messagesViewportRef.current.scrollHeight;
  }, [activeSession?.messages, isSending]);

  const selectedGardenName = useMemo(
    () => farmGardens.find((garden) => garden.id === selectedGardenId)?.name ?? "",
    [farmGardens, selectedGardenId],
  );

  const handleChooseImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      addToast({ type: "warning", message: "Chỉ hỗ trợ gửi ảnh JPG, PNG hoặc WEBP." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: "warning", message: "Ảnh tối đa 5MB để gửi kèm cho AI." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : null;
      setImageDataUrl(value);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!loggedInUser) return;
    if (!selectedGardenId) {
      addToast({ type: "warning", message: "Phải chọn khu vườn trước khi tư vấn AI." });
      return;
    }

    const message = composer.trim();
    if (!message) {
      addToast({ type: "warning", message: "Nhập câu hỏi trước khi gửi." });
      return;
    }

    setIsSending(true);
    setLoadError(null);

    const response = await apiSendAIChatMessage({
      userId: loggedInUser.id,
      gardenId: selectedGardenId,
      sessionId: activeSessionId ?? undefined,
      message,
      imageDataUrl,
    });

    if (!response) {
      setIsSending(false);
      setLoadError("Không gửi được yêu cầu tới AI.");
      return;
    }

    setGeminiConfigured(response.geminiConfigured);
    setDashboard(response.dashboard);
    setActiveSession(response.session);
    setActiveSessionId(response.session?.id ?? null);
    if (response.session) {
      setSessions((current) => {
        const next = [response.session as AIChatSessionSummary, ...current.filter((item) => item.id !== response.session?.id)];
        return next.slice(0, 10);
      });
    }
    setComposer("");
    setImageDataUrl(null);
    setImageName(null);
    setIsSending(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!loggedInUser) return;

    const ok = await apiDeleteAIChatSession(loggedInUser.id, sessionId);
    if (!ok) {
      addToast({ type: "error", message: "Không xóa được lịch sử chat." });
      return;
    }

    const nextSessions = sessions.filter((session) => session.id !== sessionId);
    setSessions(nextSessions);

    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setActiveSession(null);
    }

    addToast({ type: "success", message: "Đã xóa lịch sử chat AI." });
  };

  const loadSession = async (sessionId: string) => {
    if (!loggedInUser || !selectedGardenId) return;
    setIsLoading(true);
    const response = await apiGetAIChatState(loggedInUser.id, selectedGardenId, sessionId);
    if (!response) {
      setIsLoading(false);
      setLoadError("Không mở được lịch sử chat.");
      return;
    }

    setSessions(response.sessions);
    setDashboard(response.dashboard);
    setActiveSession(response.activeSession);
    setActiveSessionId(response.activeSession?.id ?? null);
    setGeminiConfigured(response.geminiConfigured);
    setIsLoading(false);
  };

  if (farmGardens.length === 0) {
    return (
      <div>
        <Topbar title="AI Phân tích" subtitle="Tư vấn theo dữ liệu thật của từng khu vườn" />
        <div className="max-w-3xl p-8">
          <ErrorState
            title="Chưa có khu vườn để bật AI phân tích"
            description="Hãy tạo hoặc gán ít nhất một khu vườn trong nông trại hiện tại trước khi dùng AI chat."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="AI Phân tích" subtitle="Chat tư vấn theo dữ liệu thời gian thực của từng khu vườn" />

      <div className="grid min-h-[calc(100vh-104px)] grid-cols-1 gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-[#E2E8E4] bg-white xl:border-b-0 xl:border-r">
          <div className="space-y-4 p-5">
            <div className="space-y-2">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-[#5C7A6A]">
                Chọn khu vườn trước
              </p>
              <select
                className="input-field"
                value={selectedGardenId}
                onChange={(event) => {
                  setSelectedGardenId(event.target.value);
                  setActiveSessionId(null);
                  setActiveSession(null);
                  setComposer("");
                  setImageDataUrl(null);
                  setImageName(null);
                }}
              >
                <option value="">Chọn khu vườn để tư vấn</option>
                {farmGardens.map((garden) => (
                  <option key={garden.id} value={garden.id}>
                    {garden.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[16px] border border-[#E2E8E4] bg-[#F7F8F6] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">Lịch sử chat</p>
                  <p className="mt-1 text-[0.75rem] text-[#5C7A6A]">Giữ tối đa 10 cuộc hội thoại gần nhất cho mỗi khu vườn.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionId(null);
                    setActiveSession(null);
                    setComposer("");
                    setImageDataUrl(null);
                    setImageName(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D7E2DB] bg-white px-3 py-2 text-[0.75rem] font-semibold text-[#1B4332] transition-colors hover:border-[#1B4332]"
                >
                  <MessageSquarePlus size={14} />
                  Chat mới
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {selectedGardenId ? sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "rounded-[16px] border p-4 transition-colors",
                    activeSessionId === session.id
                      ? "border-[#1B4332] bg-[#F0FAF3]"
                      : "border-[#E2E8E4] bg-white hover:border-[#BFD1C4]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => void loadSession(session.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-[0.875rem] font-semibold text-[#1A2E1F]">{session.title}</p>
                      <p className="mt-1 line-clamp-2 text-[0.75rem] text-[#5C7A6A]">{session.preview}</p>
                      <p className="mt-2 text-[0.6875rem] text-[#7B8F83]">{timeAgo(session.updatedAt)}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSession(session.id)}
                      className="rounded-full p-1 text-[#7B8F83] transition-colors hover:bg-[#EAF2EC] hover:text-[#C0392B]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="rounded-[16px] border border-dashed border-[#D7E2DB] bg-white p-4 text-[0.8125rem] text-[#5C7A6A]">
                  Chọn khu vườn rồi hệ thống mới tải lịch sử chat tương ứng.
                </div>
              )}

              {selectedGardenId && sessions.length === 0 && !isLoading ? (
                <div className="rounded-[16px] border border-dashed border-[#D7E2DB] bg-white p-4 text-[0.8125rem] text-[#5C7A6A]">
                  Chưa có cuộc chat nào cho {selectedGardenName}.
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-[#F7F8F6]">
          <div className="border-b border-[#E2E8E4] bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-[#5C7A6A]">
                  Phòng tư vấn AI
                </p>
                <h2 className="mt-1 text-[1.125rem] font-semibold text-[#1A2E1F]">
                  {selectedGardenId ? `Đang tư vấn cho ${selectedGardenName}` : "Hãy chọn khu vườn để bắt đầu"}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDashboardOpen((current) => !current)}
                  disabled={!dashboard}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[0.75rem] font-semibold transition-colors",
                    dashboard
                      ? "border-[#D7E2DB] bg-white text-[#1B4332] hover:border-[#1B4332]"
                      : "cursor-not-allowed border-[#E2E8E4] bg-[#F2F4F2] text-[#9AA8A0]",
                  )}
                >
                  <LayoutDashboard size={14} />
                  Dashboard
                </button>

                {!geminiConfigured ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#F5D0CC] bg-[#FDF3F2] px-3 py-2 text-[0.75rem] font-semibold text-[#A04034]">
                    <AlertTriangle size={14} />
                    Thiếu `GEMINI_API_KEY`
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {isDashboardOpen && dashboard ? (
            <div className="border-b border-[#E2E8E4] bg-[#F0FAF3] px-6 py-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="rounded-[18px] border border-[#D7E2DB] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.75rem] uppercase tracking-[0.18em] text-[#5C7A6A]">Realtime dashboard</p>
                        <p className="mt-1 text-[1rem] font-semibold text-[#1A2E1F]">
                          {dashboard.gardenName} · {dashboard.plantLabel ?? "Chưa rõ cây trồng"}
                        </p>
                        <p className="mt-1 text-[0.75rem] text-[#5C7A6A]">
                          {dashboard.farmName ?? "Không rõ nông trại"} · {dashboard.areaM2 ? `${dashboard.areaM2} m²` : "Chưa có diện tích"}
                        </p>
                      </div>
                      <div className="rounded-full bg-[#EAF7EE] px-3 py-1 text-[0.75rem] font-semibold text-[#1B4332]">
                        {dashboard.status ?? "active"}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "Nhiệt độ", value: dashboard.latestSensors.temperature, threshold: dashboard.thresholds.temperature, unit: "°C" },
                      { label: "Độ ẩm KK", value: dashboard.latestSensors.humidityAir, threshold: dashboard.thresholds.humidityAir, unit: "%" },
                      { label: "Độ ẩm đất", value: dashboard.latestSensors.humiditySoil, threshold: dashboard.thresholds.humiditySoil, unit: "%" },
                      { label: "Ánh sáng", value: dashboard.latestSensors.light, threshold: dashboard.thresholds.light, unit: "lux" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[18px] border border-[#D7E2DB] bg-white p-4">
                        <p className="text-[0.75rem] uppercase tracking-[0.16em] text-[#5C7A6A]">{item.label}</p>
                        <p className="mt-2 text-[1.5rem] font-semibold text-[#1A2E1F]">
                          {item.value ?? "--"} <span className="text-[0.875rem] text-[#5C7A6A]">{item.unit}</span>
                        </p>
                        <p className="mt-2 text-[0.75rem] text-[#5C7A6A]">
                          Ngưỡng: {item.threshold ? `${item.threshold.min} - ${item.threshold.max} ${item.unit}` : "Chưa cấu hình"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[18px] border border-[#D7E2DB] bg-white p-4">
                    <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">Thiết bị & lịch tưới</p>
                    <div className="mt-3 space-y-3">
                      {dashboard.devices.slice(0, 4).map((device) => (
                        <div key={device.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-[#F7F8F6] px-3 py-2">
                          <div>
                            <p className="text-[0.8125rem] font-medium text-[#1A2E1F]">{device.name}</p>
                            <p className="text-[0.75rem] text-[#5C7A6A]">{device.type} · {device.status}</p>
                          </div>
                          <div className={cn(
                            "rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold",
                            device.isOn ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#EEF2F0] text-[#5C7A6A]",
                          )}>
                            {device.isOn ? "Đang bật" : "Đang tắt"}
                          </div>
                        </div>
                      ))}
                      {dashboard.schedules.slice(0, 3).map((schedule) => (
                        <div key={schedule.id} className="rounded-[12px] border border-[#E2E8E4] px-3 py-2">
                          <p className="text-[0.8125rem] font-medium text-[#1A2E1F]">{schedule.deviceName}</p>
                          <p className="mt-1 text-[0.75rem] text-[#5C7A6A]">
                            {schedule.startTime ?? "--:--"} · {schedule.repeat ?? "manual"} · {schedule.isActive ? "active" : "paused"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-[#D7E2DB] bg-white p-4">
                    <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">Cảnh báo & log gần đây</p>
                    <div className="mt-3 space-y-3">
                      {dashboard.alerts.length > 0 ? dashboard.alerts.slice(0, 3).map((alert) => (
                        <div key={alert.id} className="rounded-[12px] bg-[#FFF7ED] px-3 py-2">
                          <p className="text-[0.8125rem] font-medium text-[#9A3412]">{alert.message}</p>
                          <p className="mt-1 text-[0.6875rem] text-[#B45309]">{timeAgo(alert.detectedAt)} · {alert.status}</p>
                        </div>
                      )) : (
                        <div className="rounded-[12px] bg-[#F7F8F6] px-3 py-2 text-[0.75rem] text-[#5C7A6A]">
                          Hiện chưa có cảnh báo đang nổi bật.
                        </div>
                      )}

                      {dashboard.recentLogs.slice(0, 3).map((log) => (
                        <div key={log.id} className="rounded-[12px] border border-[#E2E8E4] px-3 py-2">
                          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[#7B8F83]">{log.title}</p>
                          <p className="mt-1 text-[0.8125rem] text-[#1A2E1F]">{log.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
            {loadError ? (
              <ErrorState title="AI chat đang gặp lỗi" description={loadError} className="mb-4" />
            ) : null}

            {!geminiConfigured ? (
              <ErrorState
                title="Production chưa có khóa Gemini"
                description="Thêm biến môi trường GEMINI_API_KEY trên Vercel thì AI mới trả lời được. Phần UI và lưu lịch sử chat đã sẵn sàng."
                className="mb-4"
              />
            ) : null}

            {!selectedGardenId ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="max-w-xl rounded-[24px] border border-dashed border-[#C8D6CD] bg-white px-8 py-10 text-center shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F0FAF3] text-[#1B4332]">
                    <BrainCircuit size={28} />
                  </div>
                  <h3 className="mt-4 text-[1.25rem] font-semibold text-[#1A2E1F]">Chọn khu vườn trước khi vào AI</h3>
                  <p className="mt-2 text-[0.9375rem] leading-7 text-[#5C7A6A]">
                    Sau khi chọn khu vườn, AI sẽ dùng dữ liệu realtime, cảnh báo, lịch tưới và log của đúng khu đó để phân tích.
                  </p>
                </div>
              </div>
            ) : isLoading ? (
              <LoadingState message="Đang tải lịch sử chat và dashboard của khu vườn..." />
            ) : (
              <>
                <div
                  ref={messagesViewportRef}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
                >
                  {activeSession?.messages.length ? activeSession.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[820px] rounded-[22px] px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]",
                          message.role === "user"
                            ? "bg-[#1B4332] text-white"
                            : "border border-[#E2E8E4] bg-white text-[#1A2E1F]",
                        )}
                      >
                        {message.imageUrl ? (
                          <Image
                            src={message.imageUrl}
                            alt="Ảnh gửi cho AI"
                            width={320}
                            height={224}
                            unoptimized
                            className="mb-3 max-h-56 w-auto rounded-[14px] object-cover"
                          />
                        ) : null}
                        <p className="whitespace-pre-wrap text-[0.9375rem] leading-7">{message.content}</p>
                        <p
                          className={cn(
                            "mt-2 text-[0.6875rem]",
                            message.role === "user" ? "text-white/70" : "text-[#7B8F83]",
                          )}
                        >
                          {timeAgo(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="max-w-2xl rounded-[24px] border border-[#E2E8E4] bg-white p-8 text-center">
                        <p className="text-[1rem] font-semibold text-[#1A2E1F]">Bắt đầu hỏi AI về {selectedGardenName}</p>
                        <p className="mt-2 text-[0.875rem] leading-7 text-[#5C7A6A]">
                          Bạn có thể hỏi về nguyên nhân cảnh báo, xu hướng cảm biến, lịch tưới phù hợp, hoặc gửi thêm ảnh lá/cây để AI kết hợp phân tích.
                        </p>
                      </div>
                    </div>
                  )}

                  {isSending ? (
                    <LoadingState message="AI đang đọc dashboard, lịch tưới và soạn câu trả lời..." />
                  ) : null}
                </div>

                <div className="mt-4 rounded-[24px] border border-[#D7E2DB] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                  {imageDataUrl ? (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-[16px] bg-[#F7F8F6] px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Image
                          src={imageDataUrl}
                          alt="Preview upload"
                          width={56}
                          height={56}
                          unoptimized
                          className="h-14 w-14 rounded-[12px] object-cover"
                        />
                        <div>
                          <p className="text-[0.8125rem] font-semibold text-[#1A2E1F]">{imageName ?? "Ảnh đính kèm"}</p>
                          <p className="text-[0.75rem] text-[#5C7A6A]">AI sẽ phân tích ảnh cùng dashboard của {selectedGardenName}.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setImageDataUrl(null);
                          setImageName(null);
                        }}
                        className="rounded-full p-1 text-[#5C7A6A] transition-colors hover:bg-[#E2E8E4]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 lg:flex-row">
                    <textarea
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                      rows={4}
                      placeholder={`Hỏi AI về ${selectedGardenName}: vì sao khu này đang cảnh báo, có nên tăng tưới, hay xu hướng cảm biến có gì bất thường?`}
                      className="min-h-[120px] flex-1 resize-none rounded-[18px] border border-[#D7E2DB] bg-[#FCFDFC] px-4 py-3 text-[0.9375rem] text-[#1A2E1F] outline-none transition-colors focus:border-[#1B4332]"
                    />

                    <div className="flex w-full flex-col gap-2 lg:w-[220px]">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) handleChooseImage(file);
                          event.currentTarget.value = "";
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-[#D7E2DB] bg-white px-4 py-3 text-[0.8125rem] font-semibold text-[#1B4332] transition-colors hover:border-[#1B4332]"
                      >
                        <ImagePlus size={16} />
                        Gửi ảnh
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={isSending || !composer.trim() || !selectedGardenId || !geminiConfigured}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-[0.875rem] font-semibold transition-colors",
                          isSending || !composer.trim() || !selectedGardenId || !geminiConfigured
                            ? "cursor-not-allowed bg-[#D7E2DB] text-[#6B7E72]"
                            : "bg-[#1B4332] text-white hover:bg-[#143524]",
                        )}
                      >
                        <Send size={16} />
                        Gửi phân tích
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsDashboardOpen((current) => !current)}
                        className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-[#D7E2DB] bg-[#F7F8F6] px-4 py-3 text-[0.8125rem] font-semibold text-[#5C7A6A] transition-colors hover:border-[#1B4332] hover:text-[#1B4332]"
                      >
                        <LayoutDashboard size={16} />
                        {isDashboardOpen ? "Ẩn dashboard" : "Xem dashboard"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
