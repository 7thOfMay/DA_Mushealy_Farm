import { cn } from "@/frontend/utils/utils";
import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";

// ========================
// Status Dot
// ========================
interface StatusDotProps {
  status: "online" | "offline" | "error" | "active";
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full flex-shrink-0",
        (status === "online" || status === "active") && "bg-[#27AE60] animate-pulse-dot",
        status === "offline" && "bg-[#CBD5E1]",
        status === "error" && "bg-[#C0392B] animate-pulse-dot",
        className
      )}
    />
  );
}

// ========================
// Badge component
// ========================
interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "admin" | "farmer" | "ok" | "warn" | "danger" | "info" | "default";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "badge",
        variant === "primary" && "bg-[#1B4332] text-white",
        variant === "admin" && "bg-[#1B4332] text-white",
        variant === "farmer" && "bg-[#E2E8E4] text-[#1A2E1F]",
        variant === "ok" && "bg-[#27AE60]/10 text-[#1B7A3F]",
        variant === "warn" && "bg-[#E67E22]/10 text-[#B85C00]",
        variant === "danger" && "bg-[#C0392B]/10 text-[#9B1C1C]",
        variant === "info" && "bg-[#2980B9]/10 text-[#1B5F8A]",
        variant === "default" && "bg-[#F0F4F1] text-[#5C7A6A]",
        className
      )}
    >
      {children}
    </span>
  );
}

// ========================
// Empty State
// ========================
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <Icon size={64} strokeWidth={1} className="text-[#5C7A6A]/30 mb-4" />
      <p className="text-[1rem] font-semibold text-[#1A2E1F] mb-1">{title}</p>
      {description && (
        <p className="text-[0.8125rem] text-[#5C7A6A] max-w-xs">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-5">
          {action.label}
        </button>
      )}
    </div>
  );
}

// ========================
// Confirm Dialog
// ========================
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ isOpen, title, description, confirmLabel = "Xác nhận", onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-[12px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-6 w-full max-w-[400px]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
            <span className="text-[#C0392B] text-lg">!</span>
          </div>
          <div>
            <h3 className="font-semibold text-[#1A2E1F] text-[1rem]">{title}</h3>
            <p className="text-[0.8125rem] text-[#5C7A6A] mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">Hủy</button>
          <button onClick={onConfirm} className="btn-danger">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

interface InlineFieldErrorProps {
  message?: string | null;
  className?: string;
}

export function InlineFieldError({ message, className }: InlineFieldErrorProps) {
  if (!message) return null;
  return (
    <p className={cn("text-[0.75rem] text-[#C0392B] mt-1", className)}>
      {message}
    </p>
  );
}

interface FormErrorBannerProps {
  message?: string | null;
  className?: string;
}

export function FormErrorBanner({ message, className }: FormErrorBannerProps) {
  if (!message) return null;
  return (
    <div className={cn("flex items-start gap-2 p-3 rounded-[8px] bg-[#FEE2E2] text-[#C0392B]", className)}>
      <AlertCircle size={14} className="mt-0.5" />
      <p className="text-[0.75rem] font-medium leading-relaxed">{message}</p>
    </div>
  );
}
