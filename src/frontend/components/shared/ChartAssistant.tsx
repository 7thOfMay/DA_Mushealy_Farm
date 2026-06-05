"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, BrainCircuit, Square, Volume2, X } from "lucide-react";
import { cn } from "@/frontend/utils/utils";

type ChartAssistantProps = {
  chartTitle: string;
  theoryText: string;
  analysisText: string;
};

export function ChartAssistant({ chartTitle, theoryText, analysisText }: ChartAssistantProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"theory" | "analysis">("analysis");
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const displayedText = useMemo(
    () => (mode === "theory" ? theoryText : analysisText),
    [mode, theoryText, analysisText],
  );

  const stopSpeaking = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
  };

  const speakAnalysis = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(analysisText);
    utterance.lang = "vi-VN";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => () => stopSpeaking(), []);

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={`Trợ lý biểu đồ ${chartTitle}`}
        title="Nhấn để xem gợi ý phân tích"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#D7E2DB] bg-white shadow-sm transition hover:border-[#1B4332] hover:bg-[#F0FAF3]"
      >
        <Image
          src="/mushealy-logo.png"
          alt="Mushealy assistant"
          width={28}
          height={28}
          className="transition group-hover:scale-105"
        />
      </button>

      {!open ? (
        <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-max rounded-[10px] bg-[#1A2E1F] px-3 py-1.5 text-[0.75rem] text-white opacity-0 shadow-lg transition group-hover:opacity-100">
          Bạn muốn tôi hỗ trợ gì với biểu đồ này?
        </div>
      ) : (
        <div className="absolute right-0 top-full z-30 mt-2 w-[320px] rounded-[16px] border border-[#E2E8E4] bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.18)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">Trợ lý biểu đồ</p>
              <p className="text-[0.75rem] text-[#5C7A6A]">{chartTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setOpen(false);
              }}
              className="rounded-full p-1 text-[#5C7A6A] hover:bg-[#F7F8F6] hover:text-[#1A2E1F]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("theory")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                mode === "theory"
                  ? "border-[#1B4332] bg-[#1B4332] text-white"
                  : "border-[#E2E8E4] bg-white text-[#5C7A6A] hover:border-[#1B4332] hover:text-[#1B4332]",
              )}
            >
              <BookOpenText size={14} />
              Đọc info lý thuyết
            </button>

            <button
              type="button"
              onClick={() => setMode("analysis")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                mode === "analysis"
                  ? "border-[#1B4332] bg-[#1B4332] text-white"
                  : "border-[#E2E8E4] bg-white text-[#5C7A6A] hover:border-[#1B4332] hover:text-[#1B4332]",
              )}
            >
              <BrainCircuit size={14} />
              Xem phân tích
            </button>
          </div>

          <div className="rounded-[12px] bg-[#F7F8F6] p-3 text-[0.8125rem] leading-6 text-[#334155]">
            {displayedText}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-[0.6875rem] text-[#5C7A6A]">
              {speechSupported ? "Có thể đọc giọng nói tiếng Việt." : "Trình duyệt này không hỗ trợ voice."}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={speakAnalysis}
                disabled={!speechSupported}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[0.75rem] font-medium transition-colors",
                  speechSupported
                    ? "border-[#E2E8E4] bg-white text-[#1A2E1F] hover:border-[#1B4332] hover:text-[#1B4332]"
                    : "cursor-not-allowed border-[#E2E8E4] bg-[#F7F8F6] text-[#9AA8A0]",
                )}
              >
                <Volume2 size={14} />
                Nghe voice phân tích
              </button>

              <button
                type="button"
                onClick={stopSpeaking}
                disabled={!speaking}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[0.75rem] font-medium transition-colors",
                  speaking
                    ? "border-[#C0392B] bg-white text-[#C0392B] hover:bg-[#FEE2E2]"
                    : "cursor-not-allowed border-[#E2E8E4] bg-[#F7F8F6] text-[#9AA8A0]",
                )}
              >
                <Square size={12} fill="currentColor" />
                Dừng đọc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
