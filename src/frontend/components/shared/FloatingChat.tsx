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
    text: "Xin chào! Tôi là trợ lý AI NôngTech. Tôi có thể hỗ trợ chẩn đoán cây trồng, phân tích dữ liệu cảm biến và đề xuất hành động phù hợp.",
    time: "08:00",
  },
];

const TECH_INIT: ChatMessage[] = [
  {
    id: "t0",
    from: "bot",
    text: "Xin chào! Tôi là kỹ thuật viên Minh Cường. Bạn đang gặp vấn đề gì với thiết bị hoặc khu vườn?",
    time: "08:00",
  },
];

const AI_REPLIES = [
  "Nhiệt độ hiện tại đang cao hơn ngưỡng tối ưu. Bạn nên kiểm tra tưới và thông gió cho khu vườn này.",
  "Độ ẩm đất đang trong ngưỡng tốt. Hiện tại chưa cần tưới thêm.",
  "Ánh sáng hôm nay thấp hơn bình thường. Bạn có thể cân nhắc bật đèn bổ sung.",
  "Tôi phát hiện nguy cơ thiếu nước tăng lên. Nên theo dõi lịch tưới ở khung giờ tiếp theo.",
];

const TECH_REPLIES = [
  "Tôi đã ghi nhận. Tôi sẽ kiểm tra lại trạng thái thiết bị cho bạn.",
  "Bạn thử mô tả rõ hơn lỗi hiện tại để tôi khoanh vùng nhanh hơn.",
  "Nếu là lỗi cảm biến hoặc bơm, tôi có thể hướng dẫn từng bước kiểm tra.",
  "Tôi đã nhận thông tin. Có thể cần kiểm tra lại kết nối hoặc nguồn cấp thiết bị.",
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

    await new Promise((resolve) => setTimeout(resolve, 900));

    const reply = replies[replyIndexRef.current % replies.length];
    replyIndexRef.current += 1;

    setTyping(false);
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-bot`, from: "bot", text: reply, time: now() },
    ]);
  };

  const accentColor = isAI ? "#1B4332" : "#2980B9";
  const accentLight = isAI ? "#F0FAF3" : "#EBF5FB";
  const title = isAI ? "Trợ lý AI NôngTech" : "Chat kỹ thuật viên";
  const subtitle = isAI ? "Sẵn sàng hỗ trợ" : "Đang trực tuyến";
  const BotIcon = isAI ? Bot : Wrench;

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center gap-3 rounded-t-[16px] px-4 py-3"
        style={{ backgroundColor: accentColor }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
          <BotIcon size={18} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.875rem] font-semibold leading-none text-white">{title}</p>
          <p className="mt-0.5 text-[0.6875rem] text-white/75">{subtitle}</p>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white">
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
                className="mb-0.5 flex h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: accentLight }}
              >
                <BotIcon size={12} style={{ color: accentColor }} />
              </div>
            )}
            {message.from === "user" && (
              <div className="mb-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#E2E8E4]">
                <User size={12} className="text-[#5C7A6A]" />
              </div>
            )}

            <div
              className={cn(
                "max-w-[75%] rounded-[12px] px-3 py-2 text-[0.8125rem] leading-[1.5]",
                message.from === "user"
                  ? "rounded-br-[4px] text-white"
                  : "rounded-bl-[4px] border border-[#E2E8E4] bg-white text-[#1A2E1F]",
              )}
              style={message.from === "user" ? { backgroundColor: accentColor } : undefined}
            >
              {message.text}
              <p
                className={cn(
                  "mt-1 text-[0.625rem]",
                  message.from === "user" ? "text-right text-white/55" : "text-[#5C7A6A]",
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
              className="flex h-6 w-6 items-center justify-center rounded-full"
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
          placeholder={isAI ? "Nhập câu hỏi..." : "Mô tả vấn đề..."}
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
    <>
      <div
        className="pointer-events-none fixed z-[9999]"
        style={{ right: 16, bottom: 16 }}
      >
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          {openPanel && (
            <div
              className="mb-1 flex h-[480px] w-[min(340px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[16px] border border-[#E2E8E4] shadow-[0_10px_36px_rgba(0,0,0,0.2)]"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <ChatPanel type={openPanel} farmContext={farmContext} onClose={() => setOpenPanel(null)} />
            </div>
          )}

          <button
            onClick={() => toggle("tech")}
            title="Chat với kỹ thuật viên"
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform duration-200 hover:scale-105",
              openPanel === "tech" ? "ring-2 ring-[#2980B9] ring-offset-2" : "",
            )}
            style={{ backgroundColor: "#2980B9" }}
          >
            <MessageCircle size={18} className="text-white" />
            <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-[#27AE60]" />
          </button>

          <button
            onClick={() => toggle("ai")}
            title="Trợ lý AI"
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform duration-200 hover:scale-105",
              openPanel === "ai" ? "ring-2 ring-[#1B4332] ring-offset-2" : "",
            )}
            style={{ backgroundColor: "#1B4332" }}
          >
            <BrainCircuit size={18} className="text-white" />
            <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-[#52B788]" />
          </button>
        </div>
      </div>
    </>
  );
}
