"use client";

import { useMemo, useState } from "react";
import { Lightbulb, Palette, Zap } from "lucide-react";
import { cn } from "@/frontend/utils/utils";

interface RGBControllerProps {
  enabled: boolean;
  onApply?: (payload: { color: string; intensity: number; blink: boolean }) => void;
}

const presets = ["#22C55E", "#3B82F6", "#F59E0B", "#EF4444", "#A855F7", "#FFFFFF"];

export function RGBController({ enabled, onApply }: RGBControllerProps) {
  const [color, setColor] = useState("#22C55E");
  const [intensity, setIntensity] = useState(80);
  const [blink, setBlink] = useState(false);

  const previewStyle = useMemo(
    () => ({
      backgroundColor: color,
      opacity: Math.max(0.15, intensity / 100),
      boxShadow: `0 0 ${Math.max(10, intensity / 2)}px ${color}`,
    }),
    [color, intensity]
  );

  return (
    <div className="rounded-[10px] border border-[#E2E8E4] p-3 bg-[#F7F8F6] space-y-3">
      <div className="flex items-center gap-2">
        <Palette size={14} className="text-[#5C7A6A]" />
        <p className="text-[0.75rem] font-semibold text-[#1A2E1F]">Điều khiển RGB</p>
      </div>

      <div className={cn("h-10 rounded-[8px] transition-all", blink && "animate-pulse")} style={previewStyle} />

      <div className="grid grid-cols-6 gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setColor(preset)}
            className={cn("h-6 rounded-[6px] border", color === preset ? "border-[#1B4332]" : "border-transparent")}
            style={{ backgroundColor: preset }}
            disabled={!enabled}
          />
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between text-[0.6875rem] text-[#5C7A6A] mb-1">
          <span>Cường độ</span>
          <span>{intensity}%</span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          value={intensity}
          onChange={(event) => setIntensity(Number(event.target.value))}
          className="w-full accent-[#1B4332]"
          disabled={!enabled}
        />
      </div>

      <label className="flex items-center gap-2 text-[0.75rem] text-[#5C7A6A]">
        <input
          type="checkbox"
          checked={blink}
          onChange={(event) => setBlink(event.target.checked)}
          disabled={!enabled}
        />
        Nhấp nháy cảnh báo
      </label>

      <button
        type="button"
        onClick={() => onApply?.({ color, intensity, blink })}
        disabled={!enabled}
        className="btn-secondary w-full justify-center text-[0.75rem] disabled:opacity-60"
      >
        <Lightbulb size={14} />
        Áp dụng cấu hình
        <Zap size={13} className="text-[#E67E22]" />
      </button>
    </div>
  );
}
