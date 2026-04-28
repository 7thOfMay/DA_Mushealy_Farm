"use client";

import { useState, useRef, useEffect } from "react";
import { BrainCircuit, MessageCircle, X, Send, Wrench, Bot, User } from "lucide-react";
import { cn } from "@/frontend/utils/utils";
import { useAppStore } from "@/frontend/context/store";

interface ChatMessage {
  id: string;
  from: "user" | "bot";
  text: string;
  time: string;
}

const now = () =>
  new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

// ── Mock AI initial messages ──────────────────────────────────────────────────
const AI_INIT: ChatMessage[] = [
  {
    id: "a0",
    from: "bot",
    text: "Xin chào! Tôi là trợ lý AI NôngTech 🌿 Tôi có thể giúp bạn chẩn đoán bệnh cây, phân tích dữ liệu cảm biến hoặc đưa ra lịch chăm sóc tối ưu.",
    time: "08:00",
  },
];

// ── Mock Technician initial messages ─────────────────────────────────────────
const TECH_INIT: ChatMessage[] = [
  {
    id: "t0",
    from: "bot",
    text: "Xin chào! Tôi là kỹ thuật viên Minh Cường 👨‍🔧 Tôi trực từ 7:00–17:00. Bạn đang gặp vấn đề gì với vườn?",
    time: "08:00",
  },
];

// ── Quick AI auto-replies ─────────────────────────────────────────────────────
const AI_REPLIES = [
  "Dựa trên dữ liệu cảm biến, nhiệt độ vườn Cà Chua đang **32.1°C** — cao hơn ngưỡng tối ưu. Bạn có muốn tôi điều chỉnh lịch tưới không?",
  "Tôi nhận thấy độ ẩm đất ở vườn Cải Xanh đang ở mức 67% — trong ngưỡng tốt. Không cần tưới thêm trong 4 giờ tới.",
  "Theo lịch sử 24h, ánh sáng hôm nay thấp hơn trung bình 18%. Nếu mưa kéo dài, bạn nên bật đèn bổ sung.",
  "Tôi đã phân tích: xác suất thiếu nước trên vườn Cà Chua là 78%. Khuyến nghị tưới thêm 15 phút vào 14:00 hôm nay.",
];

// ── Quick Technician auto-replies ─────────────────────────────────────────────
const TECH_REPLIES = [
  "Tôi hiểu rồi, để tôi kiểm tra lại hệ thống bơm cho bạn. Thường mất khoảng 5–10 phút.",
  "Cảm ơn bạn đã báo! Tôi sẽ gửi lệnh reset thiết bị từ xa ngay bây giờ.",
  "Bạn có thể chụp ảnh lá cây gửi lên AI Module để tôi xem thêm không?",
  "Vấn đề này có thể do cảm biến lỗi. Tôi sẽ đăng ký thay thế trong buổi bảo trì thứ 6 tuần này.",
];

type ChatType = "ai" | "tech";

interface PanelProps {
  type: ChatType;
  farmContext: string;
  onClose: () => void;
}

function ChatPanel({ type, farmContext, onClose }: PanelProps) {
  const isAI = type === "ai";
  const storageKey = isAI ? "nongtech-chat-history-ai" : "nongtech-chat-history-tech";

  const getInitialMessages = () => {
    if (typeof window === "undefined") return isAI ? AI_INIT : TECH_INIT;
    const cached = window.localStorage.getItem(storageKey);
    if (!cached) return isAI ? AI_INIT : TECH_INIT;
    try {
      const parsed = JSON.parse(cached) as ChatMessage[];
      return parsed.length ? parsed : isAI ? AI_INIT : TECH_INIT;
    } catch {
      return isAI ? AI_INIT : TECH_INIT;
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const replies = isAI ? AI_REPLIES : TECH_REPLIES;
  const replyIndexRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)));
  }, [messages, storageKey]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      from: "user",
      text,
      time: now(),
    };
    setMessages((m) => [...m, userMsg]);
    setTyping(true);

    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const reply = replies[replyIndexRef.current % replies.length];
    replyIndexRef.current++;

    setTyping(false);
    setMessages((m) => [
      ...m,
      { id: (Date.now() + 1).toString(), from: "bot", text: reply, time: now() },
    ]);
  };

  const accentColor = isAI ? "#1B4332" : "#2980B9";
  const accentLight = isAI ? "#F0FAF3" : "#EBF5FB";
  const title = isAI ? "Trợ lý AI NôngTech" : "Chat kỹ thuật viên";
  const subtitle = isAI ? "Luôn sẵn sàng 24/7" : "Trực tuyến · Minh Cường";
  const BotIcon = isAI ? Bot : Wrench;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-t-[16px] flex-shrink-0"
        style={{ backgroundColor: accentColor }}
      >
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <BotIcon size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[0.875rem] leading-none">{title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#52B788] animate-pulse" />
            <p className="text-white/70 text-[0.6875rem]">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      <div className="px-4 py-2 border-b border-[#E2E8E4] bg-white">
        <p className="text-[0.6875rem] text-[#5C7A6A]">
          Bối cảnh: <span className="font-semibold text-[#1A2E1F]">{farmContext}</span>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F7F8F6]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-2 items-end", msg.from === "user" ? "flex-row-reverse" : "flex-row")}
          >
            {msg.from === "bot" && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
                style={{ backgroundColor: accentLight }}
              >
                <BotIcon size={12} style={{ color: accentColor }} />
              </div>
            )}
            {msg.from === "user" && (
              <div className="w-6 h-6 rounded-full bg-[#E2E8E4] flex items-center justify-center flex-shrink-0 mb-0.5">
                <User size={12} className="text-[#5C7A6A]" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] px-3 py-2 rounded-[12px] text-[0.8125rem] leading-[1.5]",
                msg.from === "user"
                  ? "text-white rounded-br-[4px]"
                  : "text-[#1A2E1F] rounded-bl-[4px] border border-[#E2E8E4]"
              )}
              style={
                msg.from === "user"
                  ? { backgroundColor: accentColor }
                  : { backgroundColor: "white" }
              }
            >
              {msg.text.split("**").map((part, i) =>
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
              <p
                className={cn(
                  "text-[0.625rem] mt-1",
                  msg.from === "user" ? "text-white/50 text-right" : "text-[#5C7A6A]"
                )}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex gap-2 items-end">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: accentLight }}
            >
              <BotIcon size={12} style={{ color: accentColor }} />
            </div>
            <div className="bg-white border border-[#E2E8E4] px-4 py-2.5 rounded-[12px] rounded-bl-[4px]">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#5C7A6A] animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 bg-white border-t border-[#E2E8E4] rounded-b-[16px] flex gap-2">
        <input
          className="flex-1 text-[0.8125rem] bg-[#F7F8F6] border border-[#E2E8E4] rounded-[10px] px-3 py-2 outline-none focus:border-[#1B4332] transition-colors placeholder:text-[#5C7A6A]/50"
          placeholder={isAI ? "Hỏi về cây trồng, cảm biến..." : "Mô tả vấn đề bạn gặp..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors disabled:opacity-40"
          style={{ backgroundColor: accentColor }}
        >
          <Send size={15} className="text-white" />
        </button>
      </div>
    </div>
  );
}

export function FloatingChat() {
  const [openPanel, setOpenPanel] = useState<ChatType | null>(null);
  const farms = useAppStore((state) => state.farms);
  const currentFarmId = useAppStore((state) => state.currentFarmId);
  const activeFarm = farms.find((farm) => farm.id === currentFarmId);
  const farmContext = activeFarm ? `${activeFarm.name} (${activeFarm.location})` : "Toàn hệ thống";

  const toggle = (type: ChatType) =>
    setOpenPanel((prev) => (prev === type ? null : type));

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {openPanel && (
        <div
          className="w-[340px] h-[480px] rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden border border-[#E2E8E4] animate-in fade-in slide-in-from-bottom-4 duration-200"
          style={{ background: "white" }}
        >
          <ChatPanel type={openPanel} farmContext={farmContext} onClose={() => setOpenPanel(null)} />
        </div>
      )}

      {/* Buttons row */}
      <div className="flex items-center gap-3">
        {/* Label */}
        {!openPanel && (
          <p className="text-[0.6875rem] text-[#5C7A6A] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full border border-[#E2E8E4] shadow-sm hidden sm:block">
            Hỗ trợ
          </p>
        )}

        {/* Technician button */}
        <div className="relative group">
          <button
            onClick={() => toggle("tech")}
            className={cn(
              "w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110",
              openPanel === "tech"
                ? "scale-110 ring-2 ring-offset-2 ring-[#2980B9]"
                : ""
            )}
            style={{ backgroundColor: openPanel === "tech" ? "#1a6fa8" : "#2980B9" }}
            title="Chat với kỹ thuật viên"
          >
            <MessageCircle size={22} className="text-white" />
          </button>
          {/* Online dot */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-[#27AE60] rounded-full border-2 border-white" />
          {/* Tooltip */}
          <div className="absolute bottom-14 right-0 bg-[#1A2E1F] text-white text-[0.6875rem] px-2.5 py-1.5 rounded-[6px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Chat kỹ thuật viên
            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-[#1A2E1F] rotate-45" />
          </div>
        </div>

        {/* AI button */}
        <div className="relative group">
          <button
            onClick={() => toggle("ai")}
            className={cn(
              "w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110",
              openPanel === "ai"
                ? "scale-110 ring-2 ring-offset-2 ring-[#1B4332]"
                : ""
            )}
            style={{ backgroundColor: openPanel === "ai" ? "#163829" : "#1B4332" }}
            title="Trợ lý AI"
          >
            <BrainCircuit size={22} className="text-white" />
          </button>
          {/* Pulse dot */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-[#52B788] rounded-full border-2 border-white animate-pulse" />
          {/* Tooltip */}
          <div className="absolute bottom-14 right-0 bg-[#1A2E1F] text-white text-[0.6875rem] px-2.5 py-1.5 rounded-[6px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Trợ lý AI NôngTech
            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-[#1A2E1F] rotate-45" />
          </div>
        </div>
      </div>
    </div>
  );
}
