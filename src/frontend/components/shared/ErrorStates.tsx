import type { LucideIcon } from "lucide-react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/frontend/utils/utils";

interface ErrorStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export function ErrorState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = AlertTriangle,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("rounded-[12px] border border-[#F5D0CC] bg-[#FDF3F2] p-5", className)}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-[8px] bg-[#C0392B]/10 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-[#C0392B]" />
        </div>
        <div className="min-w-0">
          <p className="text-[0.875rem] font-semibold text-[#7B241C]">{title}</p>
          {description && <p className="text-[0.8125rem] text-[#A04034] mt-1">{description}</p>}
          {actionLabel && onAction && (
            <button onClick={onAction} className="btn-secondary mt-3 text-[0.75rem]">
              <RefreshCw size={13} />
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Đang tải dữ liệu..." }: LoadingStateProps) {
  return (
    <div className="rounded-[12px] border border-[#E2E8E4] bg-white p-5 flex items-center gap-3">
      <span className="w-4 h-4 border-2 border-[#1B4332]/20 border-t-[#1B4332] rounded-full animate-spin" />
      <p className="text-[0.8125rem] text-[#5C7A6A]">{message}</p>
    </div>
  );
}
