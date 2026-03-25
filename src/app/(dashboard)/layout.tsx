"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastContainer } from "@/components/shared/ToastContainer";
import { FloatingChat } from "@/components/shared/FloatingChat";
import { useAuth } from "@/hooks/useAuth";
import { useApiHydration } from "@/hooks/useApiHydration";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { user: loggedInUser } = useAuth();
  const hydrationStatus = useApiHydration();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loggedInUser) {
      router.replace("/login");
    }
  }, [mounted, loggedInUser, router]);

  if (!mounted || !loggedInUser) {
    return null;
  }

  if (hydrationStatus === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F8F6]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#1B4332]/20 border-t-[#1B4332] rounded-full animate-spin" />
          <p className="text-[0.875rem] text-[#5C7A6A]">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (hydrationStatus === "error") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F8F6]">
        <div className="max-w-md text-center space-y-3">
          <p className="text-[1.25rem] font-bold text-[#C0392B]">Không thể kết nối cơ sở dữ liệu</p>
          <p className="text-[0.875rem] text-[#5C7A6A]">
            Hệ thống yêu cầu kết nối MySQL. Vui lòng kiểm tra cấu hình DB_HOST, DB_USER, DB_PASSWORD, DB_NAME trong file .env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F7F8F6] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-64">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
      <ToastContainer />
      {loggedInUser && <FloatingChat />}
    </div>
  );
}
