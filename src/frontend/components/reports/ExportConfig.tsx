"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";

export type ExportFormat = "pdf" | "excel";

interface ExportConfigProps {
  disabled?: boolean;
  onExport: (format: ExportFormat, includeCharts: boolean, includeRaw: boolean) => void;
}

export function ExportConfig({ disabled, onExport }: ExportConfigProps) {
  return (
    <div className="rounded-[12px] border border-[#E2E8E4] p-4 bg-white space-y-3">
      <p className="text-[0.75rem] uppercase tracking-wide text-[#5C7A6A] font-semibold">Xuất báo cáo</p>

      <div className="flex items-center gap-4 text-[0.8125rem] text-[#5C7A6A]">
        <label className="inline-flex items-center gap-2">
          <input id="includeCharts" type="checkbox" defaultChecked />
          Kèm biểu đồ
        </label>
        <label className="inline-flex items-center gap-2">
          <input id="includeRaw" type="checkbox" />
          Kèm dữ liệu thô
        </label>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          className="btn-secondary text-[0.8125rem]"
          disabled={disabled}
          onClick={() => {
            const includeCharts = (document.getElementById("includeCharts") as HTMLInputElement | null)?.checked ?? true;
            const includeRaw = (document.getElementById("includeRaw") as HTMLInputElement | null)?.checked ?? false;
            onExport("excel", includeCharts, includeRaw);
          }}
        >
          <FileSpreadsheet size={14} />
          Excel
        </button>
        <button
          type="button"
          className="btn-primary text-[0.8125rem]"
          disabled={disabled}
          onClick={() => {
            const includeCharts = (document.getElementById("includeCharts") as HTMLInputElement | null)?.checked ?? true;
            const includeRaw = (document.getElementById("includeRaw") as HTMLInputElement | null)?.checked ?? false;
            onExport("pdf", includeCharts, includeRaw);
          }}
        >
          <FileText size={14} />
          PDF
          <Download size={14} />
        </button>
      </div>
    </div>
  );
}
