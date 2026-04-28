"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, RotateCcw, UserRoundCog } from "lucide-react";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { ErrorState } from "@/frontend/components/shared/ErrorStates";
import { useAppStore } from "@/frontend/context/store";
import { Badge, EmptyState, FormErrorBanner, InlineFieldError, StatusDot } from "@/frontend/components/shared/index";
import type { UserRole } from "@/types";
import { isValidEmail, isValidPhone } from "@/frontend/utils/validation";
import { apiCreateUser, apiUpdateUser } from "@/frontend/services/client";

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(-2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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
  const users = useAppStore((state) => state.users);
  const farms = useAppStore((state) => state.farms);
  const gardens = useAppStore((state) => state.gardens);
  const addUser = useAppStore((state) => state.addUser);
  const updateUser = useAppStore((state) => state.updateUser);
  const toggleUserStatus = useAppStore((state) => state.toggleUserStatus);
  const resetUserPassword = useAppStore((state) => state.resetUserPassword);
  const addToast = useAppStore((state) => state.addToast);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<"name" | "email" | "phone", string | null>>({
    name: null,
    email: null,
    phone: null,
  });
  const [editFieldErrors, setEditFieldErrors] = useState<Record<"name" | "phone", string | null>>({
    name: null,
    phone: null,
  });

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "FARMER" as UserRole,
    phone: "",
  });

  const editingUser = users.find((user) => user.id === editingUserId) ?? null;
  const [editForm, setEditForm] = useState({
    name: "",
    role: "FARMER" as UserRole,
    phone: "",
    status: "active" as "active" | "inactive",
    assignedFarmIds: [] as string[],
    assignedGardens: [] as string[],
  });

  const farmScopedGardens = useMemo(
    () => gardens.filter((garden) => editForm.assignedFarmIds.length === 0 || editForm.assignedFarmIds.includes(garden.farmId ?? "")),
    [gardens, editForm.assignedFarmIds]
  );

  const updateCreateForm = <K extends keyof typeof createForm>(key: K, value: (typeof createForm)[K]) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditForm = <K extends keyof typeof editForm>(key: K, value: (typeof editForm)[K]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateUser = async () => {
    const normalizedEmail = createForm.email.trim().toLowerCase();
    const nextErrors: Record<"name" | "email" | "phone", string | null> = {
      name: createForm.name.trim() ? null : "Họ và tên là bắt buộc.",
      email: !normalizedEmail ? "Email là bắt buộc." : (!isValidEmail(normalizedEmail) ? "Email không đúng định dạng." : null),
      phone: isValidPhone(createForm.phone) ? null : "Số điện thoại không hợp lệ.",
    };
    setCreateFieldErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.phone) {
      setCreateError("Vui lòng kiểm tra lại thông tin người dùng trước khi tạo tài khoản.");
      return;
    }

    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      setCreateError("Email đã tồn tại trong hệ thống.");
      setCreateFieldErrors((prev) => ({ ...prev, email: "Email đã tồn tại." }));
      return;
    }

    const roleMap: Record<string, number> = { ADMIN: 1, FARMER: 2, USER: 3 };
    let serverId: string | undefined;
    try {
      const result = await apiCreateUser(
        createForm.name.trim(), normalizedEmail, "123456",
        createForm.name.trim(), createForm.phone.trim() || null, roleMap[createForm.role] ?? 3,
      );
      serverId = result?.userId;
    } catch {}

    addUser({
      id: serverId || `u${Date.now()}`,
      name: createForm.name.trim(),
      email: normalizedEmail,
      role: createForm.role,
      phone: createForm.phone.trim() || undefined,
      assignedGardens: [],
      assignedFarmIds: [],
      status: "active",
      createdAt: new Date().toISOString(),
    });
    addToast({ type: "success", message: `Đã tạo tài khoản ${createForm.name.trim()} (mật khẩu mặc định: 123456)` });
    setCreateForm({ name: "", email: "", role: "FARMER", phone: "" });
    setCreateFieldErrors({ name: null, email: null, phone: null });
    setCreateError(null);
    setShowCreateModal(false);
  };

  const openEditModal = (userId: string) => {
    const user = users.find((item) => item.id === userId);
    if (!user) return;
    setEditingUserId(userId);
    setEditForm({
      name: user.name,
      role: user.role,
      phone: user.phone ?? "",
      status: user.status,
      assignedFarmIds: user.assignedFarmIds ?? [],
      assignedGardens: user.assignedGardens ?? [],
    });
    setEditError(null);
    setEditFieldErrors({ name: null, phone: null });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    const nextErrors: Record<"name" | "phone", string | null> = {
      name: editForm.name.trim() ? null : "Họ và tên là bắt buộc.",
      phone: isValidPhone(editForm.phone) ? null : "Số điện thoại không hợp lệ.",
    };
    setEditFieldErrors(nextErrors);
    if (nextErrors.name || nextErrors.phone) {
      setEditError("Vui lòng kiểm tra lại thông tin trước khi lưu thay đổi.");
      return;
    }

    const roleMap: Record<string, number> = { ADMIN: 1, FARMER: 2, USER: 3 };
    try {
      await apiUpdateUser(
        editingUser.id, editForm.name.trim() || editingUser.name,
        editForm.phone.trim() || null, roleMap[editForm.role], editForm.status === "active",
      );
    } catch {}

    updateUser(editingUser.id, {
      name: editForm.name.trim() || editingUser.name,
      role: editForm.role,
      phone: editForm.phone.trim() || undefined,
      status: editForm.status,
      assignedFarmIds: editForm.assignedFarmIds,
      assignedGardens: editForm.assignedGardens,
    });
    addToast({ type: "success", message: `Đã cập nhật tài khoản ${editForm.name.trim() || editingUser.name}` });
    setEditFieldErrors({ name: null, phone: null });
    setEditError(null);
    setEditingUserId(null);
  };

  const toggleFarmAssigned = (farmId: string) => {
    setEditForm((prev) => ({
      ...prev,
      assignedFarmIds: prev.assignedFarmIds.includes(farmId)
        ? prev.assignedFarmIds.filter((id) => id !== farmId)
        : [...prev.assignedFarmIds, farmId],
      assignedGardens: prev.assignedGardens.filter((gardenId) => {
        const garden = gardens.find((item) => item.id === gardenId);
        if (!garden?.farmId) return false;
        return garden.farmId !== farmId || !prev.assignedFarmIds.includes(farmId);
      }),
    }));
  };

  const toggleGardenAssigned = (gardenId: string) => {
    setEditForm((prev) => ({
      ...prev,
      assignedGardens: prev.assignedGardens.includes(gardenId)
        ? prev.assignedGardens.filter((id) => id !== gardenId)
        : [...prev.assignedGardens, gardenId],
    }));
  };

  if (farms.length === 0) {
    return (
      <div>
        <Topbar title="Tài khoản" subtitle="Không thể gán quyền khi chưa có nông trại" />
        <div className="p-8 max-w-3xl">
          <ErrorState title="Chưa có nông trại trong hệ thống" description="Hãy tạo nông trại trước khi cấu hình quyền truy cập cho tài khoản." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Tài khoản" subtitle={`${users.length} người dùng trong hệ thống`} />

      <div className="p-8">
        <div className="flex justify-end mb-5">
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={16} />
            Thêm người dùng
          </button>
        </div>

        <div className="card overflow-hidden">
          {users.length === 0 ? (
            <EmptyState title="Chưa có người dùng" description="Bắt đầu bằng cách tạo tài khoản quản trị hoặc farmer đầu tiên." icon={UserRoundCog} />
          ) : (
            <table className="w-full">
              <thead className="bg-[#F7F8F6] border-b border-[#E2E8E4]">
                <tr>
                  {["Người dùng", "Email", "Vai trò", "Khu vực", "Trạng thái", "Thao tác"].map((h) => (
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
                      {user.assignedGardens.length} vườn · {user.assignedFarmIds?.length ?? 0} farm
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={user.status === "active" ? "online" : "offline"} />
                        <span className="text-[0.8125rem] text-[#5C7A6A]">{user.status === "active" ? "Hoạt động" : "Vô hiệu hóa"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => openEditModal(user.id)} className="px-2 py-1 text-[0.6875rem] rounded-[6px] border border-[#E2E8E4] text-[#1A2E1F] hover:border-[#1B4332] inline-flex items-center gap-1">
                          <Pencil size={12} />
                          Sửa
                        </button>
                        <button
                          onClick={async () => {
                            try { await apiUpdateUser(user.id, undefined, undefined, undefined, user.status !== "active"); } catch {}
                            toggleUserStatus(user.id);
                            addToast({ type: "info", message: `${user.status === "active" ? "Đã khóa" : "Đã mở"} tài khoản ${user.name}` });
                          }}
                          className="px-2 py-1 text-[0.6875rem] rounded-[6px] border border-[#E2E8E4] text-[#1A2E1F] hover:border-[#1B4332] inline-flex items-center gap-1"
                        >
                          <UserRoundCog size={12} />
                          {user.status === "active" ? "Khóa" : "Mở"}
                        </button>
                        <button
                          onClick={() => {
                            resetUserPassword(user.id);
                            addToast({ type: "warning", message: `Đã reset mật khẩu ${user.name} về 123456` });
                          }}
                          className="px-2 py-1 text-[0.6875rem] rounded-[6px] border border-[#E2E8E4] text-[#1A2E1F] hover:border-[#1B4332] inline-flex items-center gap-1"
                        >
                          <RotateCcw size={12} />
                          Reset PW
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-[12px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-6 w-full max-w-[480px]">
            <h2 className="font-bold text-[1.125rem] text-[#1A2E1F] mb-4">Thêm người dùng mới</h2>
            <div className="space-y-4">
              <FormErrorBanner message={createError} />
              <div>
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  className={`input-field ${createFieldErrors.name ? "border-[#C0392B]" : ""}`}
                  placeholder="Nguyễn Văn A"
                  value={createForm.name}
                  onChange={(event) => {
                    updateCreateForm("name", event.target.value);
                    setCreateFieldErrors((prev) => ({ ...prev, name: null }));
                    setCreateError(null);
                  }}
                />
                <InlineFieldError message={createFieldErrors.name} />
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Email</label>
                <input
                  type="email"
                  className={`input-field ${createFieldErrors.email ? "border-[#C0392B]" : ""}`}
                  placeholder="email@nongtech.vn"
                  value={createForm.email}
                  onChange={(event) => {
                    updateCreateForm("email", event.target.value);
                    setCreateFieldErrors((prev) => ({ ...prev, email: null }));
                    setCreateError(null);
                  }}
                />
                <InlineFieldError message={createFieldErrors.email} />
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Số điện thoại</label>
                <input
                  type="text"
                  className={`input-field ${createFieldErrors.phone ? "border-[#C0392B]" : ""}`}
                  placeholder="0901 234 567"
                  value={createForm.phone}
                  onChange={(event) => {
                    updateCreateForm("phone", event.target.value);
                    setCreateFieldErrors((prev) => ({ ...prev, phone: null }));
                    setCreateError(null);
                  }}
                />
                <InlineFieldError message={createFieldErrors.phone} />
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Vai trò</label>
                <select className="input-field" value={createForm.role} onChange={(event) => updateCreateForm("role", event.target.value as UserRole)}>
                  <option value="FARMER">Farmer — Nông dân</option>
                  <option value="ADMIN">Admin — Kỹ sư</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Hủy</button>
              <button onClick={handleCreateUser} className="btn-primary" disabled={!createForm.name.trim() || !createForm.email.trim()}>Tạo tài khoản</button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingUserId(null)} />
          <div className="relative bg-white rounded-[12px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-6 w-full max-w-[760px] max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-[1.125rem] text-[#1A2E1F] mb-4">Sửa người dùng: {editingUser.name}</h2>
            <FormErrorBanner message={editError} className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Họ và tên</label>
                <input
                  className={`input-field ${editFieldErrors.name ? "border-[#C0392B]" : ""}`}
                  value={editForm.name}
                  onChange={(event) => {
                    updateEditForm("name", event.target.value);
                    setEditFieldErrors((prev) => ({ ...prev, name: null }));
                    setEditError(null);
                  }}
                />
                <InlineFieldError message={editFieldErrors.name} />
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Email</label>
                <input className="input-field bg-[#F7F8F6]" value={editingUser.email} readOnly />
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Vai trò</label>
                <select className="input-field" value={editForm.role} onChange={(event) => updateEditForm("role", event.target.value as UserRole)}>
                  <option value="FARMER">Farmer — Nông dân</option>
                  <option value="ADMIN">Admin — Kỹ sư</option>
                </select>
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Trạng thái</label>
                <select className="input-field" value={editForm.status} onChange={(event) => updateEditForm("status", event.target.value as "active" | "inactive") }>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Vô hiệu hóa</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Số điện thoại</label>
                <input
                  className={`input-field ${editFieldErrors.phone ? "border-[#C0392B]" : ""}`}
                  value={editForm.phone}
                  onChange={(event) => {
                    updateEditForm("phone", event.target.value);
                    setEditFieldErrors((prev) => ({ ...prev, phone: null }));
                    setEditError(null);
                  }}
                />
                <InlineFieldError message={editFieldErrors.phone} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-[10px] border border-[#E2E8E4] p-4">
                <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-2">Nông trại phụ trách</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {farms.map((farm) => (
                    <label key={farm.id} className="flex items-center gap-2 text-[0.875rem] text-[#1A2E1F]">
                      <input type="checkbox" checked={editForm.assignedFarmIds.includes(farm.id)} onChange={() => toggleFarmAssigned(farm.id)} />
                      {farm.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-[10px] border border-[#E2E8E4] p-4">
                <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-2">Khu vườn phụ trách</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {farmScopedGardens.map((garden) => (
                    <label key={garden.id} className="flex items-center gap-2 text-[0.875rem] text-[#1A2E1F]">
                      <input type="checkbox" checked={editForm.assignedGardens.includes(garden.id)} onChange={() => toggleGardenAssigned(garden.id)} />
                      {garden.name}
                    </label>
                  ))}
                  {farmScopedGardens.length === 0 && <p className="text-[0.8125rem] text-[#5C7A6A]">Chọn farm trước để gán garden.</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditingUserId(null)} className="btn-secondary">Hủy</button>
              <button onClick={handleSaveUser} className="btn-primary" disabled={!editForm.name.trim()}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
