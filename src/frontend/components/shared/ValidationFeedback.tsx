import { AlertCircle } from "lucide-react";
import { cn } from "@/frontend/utils/utils";

interface ValidationFeedbackProps {
  errors?: string[];
  className?: string;
}

export function ValidationFeedback({ errors = [], className }: ValidationFeedbackProps) {
  const visibleErrors = errors.filter(Boolean);
  if (visibleErrors.length === 0) return null;

  return (
    <div className={cn("rounded-[10px] border border-[#F5D0CC] bg-[#FEF2F2] p-3", className)}>
      <div className="flex items-start gap-2">
        <AlertCircle size={14} className="text-[#C0392B] mt-0.5" />
        <div className="space-y-1">
          {visibleErrors.map((error) => (
            <p key={error} className="text-[0.75rem] text-[#9B1C1C]">
              {error}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ValidationHintProps {
  message?: string | null;
  className?: string;
}

export function ValidationHint({ message, className }: ValidationHintProps) {
  if (!message) return null;
  return <p className={cn("text-[0.75rem] text-[#C0392B] mt-1", className)}>{message}</p>;
}
