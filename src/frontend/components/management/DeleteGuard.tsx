"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteGuardProps {
  title: string;
  description: string;
  confirmToken?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function DeleteGuard({
  title,
  description,
  confirmToken = "DELETE",
  confirmLabel = "Xóa",
  onConfirm,
}: DeleteGuardProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  return (
    <>
      <button className="btn-danger" onClick={() => setOpen(true)}>
        <Trash2 size={14} />
        {confirmLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-[460px] rounded-[12px] bg-white p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} className="text-[#C0392B]" />
              </div>
              <div>
                <p className="text-[0.9375rem] font-semibold text-[#1A2E1F]">{title}</p>
                <p className="text-[0.8125rem] text-[#5C7A6A] mt-1">{description}</p>
              </div>
            </div>
            <div>
              <p className="text-[0.75rem] text-[#5C7A6A] mb-1.5">
                Nhập <span className="font-mono font-semibold text-[#1A2E1F]">{confirmToken}</span> để xác nhận.
              </p>
              <input className="input-field" value={text} onChange={(event) => setText(event.target.value)} />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setOpen(false)}>Hủy</button>
              <button
                className="btn-danger"
                disabled={text !== confirmToken}
                onClick={() => {
                  onConfirm();
                  setText("");
                  setOpen(false);
                }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
