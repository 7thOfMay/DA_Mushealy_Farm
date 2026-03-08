"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useAppStore } from "@/lib/store";
import { currentUser as fallbackUser } from "@/lib/mockData";
import { Eye, EyeOff, CheckCircle2, ChevronDown } from "lucide-react";

function getInitialsColor(name: string) {
  const palette = ["#1B4332", "#2D6A4F", "#40916C", "#1565C0", "#6A1565", "#C0531B"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function getInitials(name: string) {
  return name.split(" ").slice(-2).map((n) => n[0]).join("").toUpperCase();
}

export default function ProfilePage() {
  const loggedInUser = useAppStore((s) => s.loggedInUser);
  const currentUser = loggedInUser ?? fallbackUser;
  const [phone, setPhone] = useState("0901 234 567");
  const [saved, setSaved] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  const avatarColor = getInitialsColor(currentUser.name);
  const initials = getInitials(currentUser.name);
  const roleLabelMap: Record<string, string> = { ADMIN: "Quản trị viên", TECHNICIAN: "Kỹ thuật viên", VIEWER: "Người xem", FARMER: "Nông dân" };
  const roleLabel = roleLabelMap[currentUser.role] ?? currentUser.role;

  function handleSaveInfo() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleChangePw() {
    if (newPw && newPw === confirmPw) {
      setPwSaved(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSaved(false), 2500);
    }
  }

  return (
    <div>
      <Topbar title="Hồ sơ cá nhân" subtitle="Thông tin tài khoản và bảo mật" />

      <div className="p-8 max-w-2xl">
        {/* Avatar card */}
        <div className="card p-6 flex items-center gap-5 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <div>
            <p className="text-[1.125rem] font-semibold text-[#1A2E1F]">{currentUser.name}</p>
            <p className="text-[0.875rem] text-[#5C7A6A]">{currentUser.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-[#F0FAF3] text-[#1B4332]">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Info form */}
        <div className="card p-6 mb-4">
          <h3 className="font-semibold text-[#1A2E1F] mb-4">Thông tin cá nhân</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[0.75rem] font-medium text-[#5C7A6A] uppercase tracking-wide">Họ và tên</label>
              <input className="input-field mt-1 w-full" defaultValue={currentUser.name} readOnly />
            </div>
            <div>
              <label className="text-[0.75rem] font-medium text-[#5C7A6A] uppercase tracking-wide">Email</label>
              <input className="input-field mt-1 w-full bg-[#F7F8F6]" value={currentUser.email} readOnly />
            </div>
            <div>
              <label className="text-[0.75rem] font-medium text-[#5C7A6A] uppercase tracking-wide">Số điện thoại</label>
              <input
                className="input-field mt-1 w-full"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[0.75rem] font-medium text-[#5C7A6A] uppercase tracking-wide">Vườn phụ trách</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {currentUser.assignedGardens?.map((g) => (
                  <span key={g} className="px-2.5 py-0.5 rounded-full bg-[#F0FAF3] text-[#1B4332] text-[0.75rem] font-medium">{g}</span>
                )) ?? <span className="text-[0.875rem] text-[#5C7A6A]">Tất cả vườn</span>}
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button className="btn-primary" onClick={handleSaveInfo}>Lưu thay đổi</button>
            {saved && (
              <span className="flex items-center gap-1.5 text-[0.8125rem] text-[#27AE60]">
                <CheckCircle2 size={14} /> Đã lưu
              </span>
            )}
          </div>
        </div>

        {/* Change password collapsible */}
        <div className="card overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F7F8F6] transition-colors"
            onClick={() => setPwOpen(!pwOpen)}
          >
            <span className="font-semibold text-[#1A2E1F]">Đổi mật khẩu</span>
            <ChevronDown size={16} className={`text-[#5C7A6A] transition-transform ${pwOpen ? "rotate-180" : ""}`} />
          </button>
          {pwOpen && (
            <div className="px-6 pb-6 space-y-4 border-t border-[#E2E8E4] pt-4">
              {[
                { label: "Mật khẩu hiện tại", val: currentPw, set: setCurrentPw, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                { label: "Mật khẩu mới", val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(!showNew) },
                { label: "Xác nhận mật khẩu mới", val: confirmPw, set: setConfirmPw, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
              ].map(({ label, val, set, show, toggle }) => (
                <div key={label}>
                  <label className="text-[0.75rem] font-medium text-[#5C7A6A] uppercase tracking-wide">{label}</label>
                  <div className="relative mt-1">
                    <input
                      type={show ? "text" : "password"}
                      className="input-field w-full pr-10"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C7A6A]"
                      onClick={toggle}
                    >
                      {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              ))}
              {confirmPw && newPw && confirmPw !== newPw && (
                <p className="text-[0.75rem] text-[#C0392B]">Mật khẩu xác nhận không khớp</p>
              )}
              <div className="flex items-center gap-3 pt-1">
                <button
                  className="btn-primary"
                  onClick={handleChangePw}
                  disabled={!currentPw || !newPw || newPw !== confirmPw}
                >
                  Cập nhật mật khẩu
                </button>
                {pwSaved && (
                  <span className="flex items-center gap-1.5 text-[0.8125rem] text-[#27AE60]">
                    <CheckCircle2 size={14} /> Đã cập nhật
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
