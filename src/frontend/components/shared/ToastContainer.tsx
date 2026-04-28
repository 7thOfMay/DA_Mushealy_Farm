"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/frontend/utils/utils";
import { useAppStore } from "@/frontend/context/store";

const typeConfig = {
  success: {
    icon: CheckCircle,
    bg: "bg-white border-l-4 border-l-[#27AE60]",
    iconColor: "text-[#27AE60]",
  },
  error: {
    icon: XCircle,
    bg: "bg-white border-l-4 border-l-[#C0392B]",
    iconColor: "text-[#C0392B]",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-white border-l-4 border-l-[#E67E22]",
    iconColor: "text-[#E67E22]",
  },
  info: {
    icon: Info,
    bg: "bg-white border-l-4 border-l-[#2980B9]",
    iconColor: "text-[#2980B9]",
  },
};

function ToastItem({ toast }: { toast: { id: string; type: "success" | "error" | "warning" | "info"; message: string } }) {
  const dismissToast = useAppStore((s) => s.dismissToast);
  const config = typeConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, dismissToast]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] px-4 py-3 min-w-[300px] max-w-[380px] animate-slide-in-right",
        config.bg
      )}
    >
      <Icon size={18} className={cn("mt-0.5 flex-shrink-0", config.iconColor)} />
      <p className="text-[0.875rem] text-[#1A2E1F] flex-1 leading-5">{toast.message}</p>
      <button
        onClick={() => dismissToast(toast.id)}
        className="flex-shrink-0 text-[#5C7A6A] hover:text-[#1A2E1F] transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
