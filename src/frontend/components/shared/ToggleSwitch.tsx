"use client";

import { cn } from "@/frontend/utils/utils";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function ToggleSwitch({ checked, onChange, disabled, size = "md" }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1B4332]/30",
        size === "md" ? "w-11 h-6" : "w-8 h-4.5",
        checked ? "bg-[#1B4332]" : "bg-[#CBD5E1]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out",
          size === "md" ? "w-5 h-5 m-0.5" : "w-3.5 h-3.5 m-0.5",
          checked
            ? size === "md" ? "translate-x-5" : "translate-x-3.5"
            : "translate-x-0"
        )}
      />
    </button>
  );
}
