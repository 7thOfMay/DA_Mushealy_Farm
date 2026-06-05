"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, BrainCircuit, MessageCircle, Send, User, Wrench, X } from "lucide-react";
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

const AI_INIT: ChatMessage[] = [
  {
    id: "a0",
    from: "bot",
    text: "Xin chào! Tôi là trợ lý AI NôngTech. Tôi có thể giúp bạn chẩn đoán bệnh cây, phân tích dữ liệu cảm biến hoặc đưa ra lịch chăm sóc tối ưu.",
    time: "08:00",
  },
];

const TECH_INIT: ChatMessage[] = [
  {
    id: "t0",
    from: "bot",
    text: "Xin chào! Tôi là kỹ thuật viên Minh Cường. Tôi trực từ 7:00-17:00. Bạn đang gặp vấn đề gì với vườn?",
    time: "08:00",
  },
];

const AI_REPLIES = [
  "Dựa trên dữ liệu cảm biến, nhiệt độ vườn Cà Chua đang **32.1°C** - cao hơn ngưỡng tối ưu. Bạn có muốn tôi điều chỉnh lịch tưới không?",
  "Tôi nhận thấy độ ẩm đất ở vườn Cải Xanh đang ở mức 67% - trong ngưỡng tốt. Không cần tưới thêm trong 4 giờ tới.",
  "Theo lịch sử 24h, ánh sáng hôm nay thấp hơn trung bình 18%. Nếu mưa kéo dài, bạn nên bật đèn bổ sung.",
  "Tôi đã phân tích: xác suất thiếu nước trên vườn Cà Chua là 78%. Khuyến nghị tưới thêm 15 phút vào 14:00 hôm nay.",
];

const TECH_REPLIES = [
  "Tôi hiểu rồi, để tôi kiểm tra lại hệ thống bơm cho bạn. Thường mất khoảng 5-10 phút.",
  "Cảm ơn bạn đã báo. Tôi sẽ gửi lệnh reset thiết bị từ xa ngay bây giờ.",
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
    setMessages((current) => [...current, userMsg]);
    setTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800));

    const reply = replies[replyIndexRef.current % replies.length];
    replyIndexRef.current += 1;

    setTyping(false);
    setMessages((current) => [
      ...current,
      { id: (Date.now() + 1).toString(), from: "bot", text: reply, time: now() },
    ]);
  };

  const accentColor = isAI ? "#1B4332" : "#2980B9";
  const accentLight = isAI ? "#F0FAF3" : "#EBF5FB";
  const title = isAI ? "Trợ lý AI NôngTech" : "Chat kỹ thuật viên";
  const subtitle = isAI ? "Luôn sẵn sàng 24/7" : "Trực tuyến · Minh Cường";
  const BotIcon = isAI ? Bot : Wrench;

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex flex-shrink-0 items-center gap-3 rounded-t-[16px] px-4 py-3"
        style={{ backgroundColor: accentColor }}
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
          <BotIcon size={18} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.875rem] font-semibold leading-none text-white">{title}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#52B788]" />
            <p className="text-[0.6875rem] text-white/70">{subtitle}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/60 transition-colors hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="border-b border-[#E2E8E4] bg-white px-4 py-2">
        <p className="text-[0.6875rem] text-[#5C7A6A]">
          Bối cảnh: <span className="font-semibold text-[#1A2E1F]">{farmContext}</span>
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#F7F8F6] px-4 py-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex items-end gap-2", message.from === "user" ? "flex-row-reverse" : "flex-row")}
          >
            {message.from === "bot" && (
              <div
                className="mb-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: accentLight }}
              >
                <BotIcon size={12} style={{ color: accentColor }} />
              </div>
            )}
            {message.from === "user" && (
              <div className="mb-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#E2E8E4]">
                <User size={12} className="text-[#5C7A6A]" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] rounded-[12px] px-3 py-2 text-[0.8125rem] leading-[1.5]",
                message.from === "user"
                  ? "rounded-br-[4px] text-white"
                  : "rounded-bl-[4px] border border-[#E2E8E4] text-[#1A2E1F]",
              )}
              style={message.from === "user" ? { backgroundColor: accentColor } : { backgroundColor: "white" }}
            >
              {message.text.split("**").map((part, index) =>
                index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
              )}
              <p
                className={cn(
                  "mt-1 text-[0.625rem]",
                  message.from === "user" ? "text-right text-white/50" : "text-[#5C7A6A]",
                )}
              >
                {message.time}
              </p>
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex items-end gap-2">
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: accentLight }}
            >
              <BotIcon size={12} style={{ color: accentColor }} />
            </div>
            <div className="rounded-[12px] rounded-bl-[4px] border border-[#E2E8E4] bg-white px-4 py-2.5">
              <div className="flex h-4 items-center gap-1">
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5C7A6A]"
                    style={{ animationDelay: `${index * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 rounded-b-[16px] border-t border-[#E2E8E4] bg-white px-3 py-3">
        <input
          className="flex-1 rounded-[10px] border border-[#E2E8E4] bg-[#F7F8F6] px-3 py-2 text-[0.8125rem] outline-none transition-colors placeholder:text-[#5C7A6A]/50 focus:border-[#1B4332]"
          placeholder={isAI ? "Hỏi về cây trồng, cảm biến..." : "Mô tả vấn đề bạn gặp..."}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors disabled:opacity-40"
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

  const toggle = (type: ChatType) => setOpenPanel((current) => (current === type ? null : type));

  return (
    <div className="fixed bottom-2 right-2 z-50 flex flex-col items-end gap-2 sm:bottom-3 sm:right-3">
      {openPanel && (
        <div
          className="flex h-[480px] w-[min(340px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[16px] border border-[#E2E8E4] shadow-[0_8px_40px_rgba(0,0,0,0.18)] animate-in fade-in slide-in-from-bottom-4 duration-200"
          style={{ background: "white" }}
        >
          <ChatPanel type={openPanel} farmContext={farmContext} onClose={() => setOpenPanel(null)} />
        </div>
      )}

      <div className="flex flex-col items-end gap-2">
        {!openPanel && (
          <p className="hidden rounded-full border border-[#E2E8E4] bg-white/90 px-2.5 py-1 text-[0.6875rem] text-[#5C7A6A] shadow-sm backdrop-blur-sm sm:block">
            Hỗ trợ
          </p>
        )}

        <div className="group relative">
          <button
            onClick={() => toggle("tech")}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105",
              openPanel === "tech" ? "scale-110 ring-2 ring-[#2980B9] ring-offset-2" : "",
            )}
            style={{ backgroundColor: openPanel === "tech" ? "#1A6FA8" : "#2980B9" }}
            title="Chat với kỹ thuật viên"
          >
            <MessageCircle size={18} className="text-white" />
          </button>
          <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-[#27AE60]" />
          <div className="pointer-events-none absolute bottom-14 right-0 whitespace-nowrap rounded-[6px] bg-[#1A2E1F] px-2.5 py-1.5 text-[0.6875rem] text-white opacity-0 transition-opacity group-hover:opacity-100">
            Chat kỹ thuật viên
            <div className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 bg-[#1A2E1F]" />
          </div>
        </div>

        <div className="group relative">
          <button
            onClick={() => toggle("ai")}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105",
              openPanel === "ai" ? "scale-110 ring-2 ring-[#1B4332] ring-offset-2" : "",
            )}
            style={{ backgroundColor: openPanel === "ai" ? "#163829" : "#1B4332" }}
            title="Trợ lý AI"
          >
            <BrainCircuit size={18} className="text-white" />
          </button>
          <span className="absolute right-0 top-0 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-[#52B788]" />
          <div className="pointer-events-none absolute bottom-14 right-0 whitespace-nowrap rounded-[6px] bg-[#1A2E1F] px-2.5 py-1.5 text-[0.6875rem] text-white opacity-0 transition-opacity group-hover:opacity-100">
            Trợ lý AI NôngTech
            <div className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 bg-[#1A2E1F]" />
          </div>
        </div>
      </div>
    </div>
  );
}
