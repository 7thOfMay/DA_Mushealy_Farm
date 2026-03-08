"use client";

import { useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { users } from "@/lib/mockData";
import { Badge, StatusDot } from "@/components/shared/index";

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(-2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Generate color from name
  const hue = name.charCodeAt(0) * 17 % 360;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[0.6875rem] font-bold flex-shrink-0"
      style={{ backgroundColor: `hsl(${hue}, 45%, 35%)` }}
    >
      {initials}
    </div>
  );
}

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <Topbar title="Tài khoản" subtitle={`${users.length} người dùng trong hệ thống`} />

      <div className="p-8">
        <div className="flex justify-end mb-5">
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} />
            Thêm người dùng
          </button>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F7F8F6] border-b border-[#E2E8E4]">
              <tr>
                {["Người dùng", "Email", "Vai trò", "Khu vực", "Trạng thái", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[#F7F8F6] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} />
                      <div>
                        <p className="font-medium text-[0.875rem] text-[#1A2E1F]">{user.name}</p>
                        <p className="text-[0.75rem] text-[#5C7A6A]">{user.phone ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[0.875rem] text-[#5C7A6A]">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === "ADMIN" ? "admin" : "farmer"}>{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[0.875rem] text-[#5C7A6A]">
                    {user.assignedGardens.length} vườn
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={user.status === "active" ? "online" : "offline"} />
                      <span className="text-[0.8125rem] text-[#5C7A6A]">
                        {user.status === "active" ? "Hoạt động" : "Vô hiệu hóa"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 rounded-[6px] hover:bg-[#E2E8E4] transition-colors text-[#5C7A6A]">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[
            { label: "Tổng người dùng", value: users.length.toString() },
            { label: "Admin", value: users.filter((u) => u.role === "ADMIN").length.toString() },
            { label: "Farmer", value: users.filter((u) => u.role === "FARMER").length.toString() },
            { label: "Đang hoạt động", value: users.filter((u) => u.status === "active").length.toString() },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-[1.5rem] font-bold text-[#1A2E1F]" style={{ fontFamily: "'DM Mono', monospace" }}>{s.value}</p>
              <p className="text-[0.75rem] uppercase tracking-wide text-[#5C7A6A] font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-[12px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-6 w-full max-w-[480px]">
            <h2 className="font-bold text-[1.125rem] text-[#1A2E1F] mb-4">Thêm người dùng mới</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Họ và tên</label>
                <input type="text" className="input-field" placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Email</label>
                <input type="email" className="input-field" placeholder="email@nongtech.vn" />
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Vai trò</label>
                <select className="input-field">
                  <option value="FARMER">Farmer — Nông dân</option>
                  <option value="ADMIN">Admin — Kỹ sư</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Hủy</button>
              <button onClick={() => setShowModal(false)} className="btn-primary">Tạo tài khoản</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
