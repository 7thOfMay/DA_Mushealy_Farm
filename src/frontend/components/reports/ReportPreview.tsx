import { Eye, Info } from "lucide-react";

interface ReportPreviewProps {
  farmName: string;
  dateRangeLabel: string;
  gardens: number;
  alerts: number;
  generatedBy: string;
}

export function ReportPreview({ farmName, dateRangeLabel, gardens, alerts, generatedBy }: ReportPreviewProps) {
  return (
    <div className="rounded-[12px] border border-[#E2E8E4] bg-[#F7F8F6] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Eye size={14} className="text-[#1B4332]" />
        <p className="text-[0.75rem] uppercase tracking-wide font-semibold text-[#1B4332]">Preview xuất báo cáo</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[0.8125rem]">
        <p className="text-[#5C7A6A]">Nông trại</p>
        <p className="text-[#1A2E1F] font-medium text-right">{farmName}</p>
        <p className="text-[#5C7A6A]">Khoảng thời gian</p>
        <p className="text-[#1A2E1F] font-medium text-right">{dateRangeLabel}</p>
        <p className="text-[#5C7A6A]">Số khu vườn</p>
        <p className="text-[#1A2E1F] font-medium text-right">{gardens}</p>
        <p className="text-[#5C7A6A]">Cảnh báo</p>
        <p className="text-[#1A2E1F] font-medium text-right">{alerts}</p>
      </div>
      <div className="mt-3 flex items-start gap-2 text-[0.75rem] text-[#5C7A6A]">
        <Info size={12} className="mt-0.5" />
        <p>Tạo bởi {generatedBy}. File xuất sẽ dùng dữ liệu hiện tại của dashboard.</p>
      </div>
    </div>
  );
}
