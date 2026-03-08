"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { ToastContainer } from "@/components/shared/ToastContainer";
import { FloatingChat } from "@/components/shared/FloatingChat";
import { useAppStore } from "@/lib/store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const loggedInUser = useAppStore((s) => s.loggedInUser);
  const isFarmer = loggedInUser?.role === "FARMER";

  return (
    <div className="flex h-screen bg-[#F7F8F6] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-64">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
      <ToastContainer />
      {isFarmer && <FloatingChat />}
    </div>
  );
}
