"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, X } from "lucide-react";

type TourStep = {
  selector: string;
  title: string;
  body: string;
};

type TourConfig = {
  key: string;
  title: string;
  description: string;
  match: (pathname: string) => boolean;
  steps: TourStep[];
};

const STORAGE_PREFIX = "mushealy-product-tour";

const TOUR_CONFIGS: TourConfig[] = [
  {
    key: "farm-dashboard",
    title: "Dashboard Nông Trại",
    description: "Hướng dẫn nhanh các phần quan trọng của dashboard theo nông trại.",
    match: (pathname) => /^\/farms\/[^/]+$/.test(pathname),
    steps: [
      {
        selector: '[data-tour="farm-summary"]',
        title: "Tổng quan nhanh",
        body: "Khối này cho bạn số khu vườn, số thiết bị online, cảnh báo chưa xử lý và uptime để nhìn toàn cảnh farm ngay khi mở vào.",
      },
      {
        selector: '[data-tour="farm-gardens"]',
        title: "Danh sách khu vườn",
        body: "Mỗi thẻ khu vườn là một điểm vào chính để xem dữ liệu cảm biến, thiết bị, lịch tưới và nhật ký riêng cho khu đó.",
      },
      {
        selector: '[data-tour="farm-shortcuts"]',
        title: "Lối tắt tác vụ",
        body: "Từ đây bạn chuyển nhanh sang thiết bị, lịch trình và cảnh báo mà không cần quay lại sidebar.",
      },
    ],
  },
  {
    key: "reports",
    title: "Phân Tích Dashboard",
    description: "Hướng dẫn bộ lọc, trợ thủ biểu đồ và các khối phân tích đã hoàn thiện.",
    match: (pathname) => pathname === "/reports",
    steps: [
      {
        selector: '[data-tour="reports-filters"]',
        title: "Bộ lọc dashboard",
        body: "Chọn nông trại, khu vườn và khoảng thời gian ở đây. Toàn bộ biểu đồ và phân tích phía dưới sẽ đổi theo bộ lọc này.",
      },
      {
        selector: '[data-tour="reports-assistant"]',
        title: "Trợ thủ phân tích biểu đồ",
        body: "Các nút trợ thủ mở phần giải thích lý thuyết và phân tích dữ liệu hiện tại của biểu đồ tương ứng. Đây là phần demo hướng dẫn dữ liệu khá quan trọng.",
      },
      {
        selector: '[data-tour="reports-main-chart"]',
        title: "Biểu đồ xu hướng chính",
        body: "Đây là biểu đồ theo dõi xu hướng nhiệt độ hoặc các chỉ số môi trường theo thời gian cho khu vườn đang chọn.",
      },
      {
        selector: '[data-tour="reports-distribution"]',
        title: "Phân loại theo ngưỡng",
        body: "Khối này chia dữ liệu thành thấp, hợp lý, cao dựa trên threshold thật của khu vườn, giúp diễn giải tình trạng môi trường rõ hơn.",
      },
      {
        selector: '[data-tour="reports-correlation"]',
        title: "Tương quan chỉ số",
        body: "Dùng để xem các cặp chỉ số có biến động cùng nhau hay không, ví dụ nhiệt độ với ẩm đất hoặc ánh sáng.",
      },
    ],
  },
  {
    key: "schedules",
    title: "Lịch Tưới Theo Khu Vườn",
    description: "Hướng dẫn flow chọn khu vườn trước rồi mới thao tác lịch tưới.",
    match: (pathname) => /^\/farms\/[^/]+\/schedules$/.test(pathname),
    steps: [
      {
        selector: '[data-tour="schedule-garden-picker"]',
        title: "Chọn khu vườn trước",
        body: "Mỗi khu vườn có lịch tưới riêng. Bạn chọn khu ở đây trước, sau đó toàn bộ danh sách lịch, chi tiết và cảnh báo sẽ bám theo khu đó.",
      },
      {
        selector: '[data-tour="schedule-list"]',
        title: "Danh sách lịch của khu",
        body: "Cột trái là toàn bộ lịch tưới của khu vườn đang chọn. Bạn có thể bật tắt nhanh từng lịch ngay tại đây.",
      },
      {
        selector: '[data-tour="schedule-calendar"]',
        title: "Lịch chạy theo ngày",
        body: "Khối này cho biết trong ngày đang chọn có lịch nào sẽ chạy. Đây là nơi phù hợp để kiểm tra logic lịch hằng ngày hoặc hằng tuần.",
      },
      {
        selector: '[data-tour="schedule-detail"]',
        title: "Chi tiết lịch tưới",
        body: "Khi bấm vào một lịch, phần này hiển thị cấu hình đầy đủ như thời gian, kiểu lịch và rule nếu là lịch theo ngưỡng.",
      },
      {
        selector: '[data-tour="schedule-create"]',
        title: "Tạo lịch mới",
        body: "Nút này mở flow tạo lịch tưới. Với lịch theo giờ, nếu tới giờ mà bơm không chạy thì hệ thống sẽ tự sinh cảnh báo và ghi nhật ký cho đúng khu vườn đó.",
      },
    ],
  },
  {
    key: "logs",
    title: "Nhật Ký Và Tra Cứu",
    description: "Hướng dẫn phần dashboard nhật ký và danh sách bản ghi.",
    match: (pathname) => pathname === "/logs" || /^\/farms\/[^/]+\/logs$/.test(pathname),
    steps: [
      {
        selector: '[data-tour="logs-view-mode"]',
        title: "Hai chế độ xem",
        body: "Bạn có thể chuyển giữa dashboard nhật ký để xem xu hướng tổng quan và danh sách bản ghi để tra cứu chi tiết từng sự kiện.",
      },
      {
        selector: '[data-tour="logs-summary"]',
        title: "Tóm tắt số lượng bản ghi",
        body: "Các thẻ này chia nhanh số bản ghi theo nhóm cảm biến, cảnh báo, lệnh thiết bị và nhật ký hệ thống.",
      },
      {
        selector: '[data-tour="logs-filters"]',
        title: "Bộ lọc nhật ký",
        body: "Tại đây bạn lọc theo khu vườn, khoảng thời gian, loại bản ghi, chỉ số và từ khóa để tìm lại sự kiện mong muốn.",
      },
      {
        selector: '[data-tour="logs-chart"]',
        title: "Biểu đồ dữ liệu lịch sử",
        body: "Khối này cho xem diễn biến dữ liệu cảm biến theo bộ lọc hiện tại, phù hợp để giải thích bối cảnh trước và sau các sự kiện.",
      },
      {
        selector: '[data-tour="logs-list"]',
        title: "Danh sách bản ghi chi tiết",
        body: "Đây là nơi hiển thị toàn bộ log đã lọc, gồm mô tả, khu vườn, thiết bị, người thao tác và payload trước-sau nếu có.",
      },
    ],
  },
];

function getActiveConfig(pathname: string) {
  return TOUR_CONFIGS.find((config) => config.match(pathname)) ?? null;
}

export function ProductTour() {
  const pathname = usePathname();
  const config = useMemo(() => getActiveConfig(pathname), [pathname]);
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const activeSteps = config?.steps ?? [];
  const activeStep = activeSteps[stepIndex] ?? null;

  const refreshRect = useCallback(() => {
    if (!activeStep) {
      setRect(null);
      return;
    }

    const element = document.querySelector(activeStep.selector);
    if (!element) {
      setRect(null);
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    const bounds = element.getBoundingClientRect();
    setRect(bounds);
  }, [activeStep]);

  const closeTour = useCallback((markSeen: boolean) => {
    if (markSeen && config) {
      window.localStorage.setItem(`${STORAGE_PREFIX}:${config.key}`, "seen");
    }
    setIsOpen(false);
    setStepIndex(0);
    setRect(null);
  }, [config]);

  const nextStep = useCallback(() => {
    if (!config) return;
    if (stepIndex >= activeSteps.length - 1) {
      closeTour(true);
      return;
    }
    setStepIndex((prev) => prev + 1);
  }, [activeSteps.length, closeTour, config, stepIndex]);

  const prevStep = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    if (!config) {
      setIsOpen(false);
      setStepIndex(0);
      setRect(null);
      return;
    }

    const key = `${STORAGE_PREFIX}:${config.key}`;
    const hasSeen = typeof window !== "undefined" && window.localStorage.getItem(key) === "seen";
    if (!hasSeen) {
      const timer = window.setTimeout(() => {
        setIsOpen(true);
        setStepIndex(0);
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [config]);

  useEffect(() => {
    const handleOpen = () => {
      if (!config) return;
      setIsOpen(true);
      setStepIndex(0);
    };

    window.addEventListener("product-tour:start", handleOpen);
    return () => window.removeEventListener("product-tour:start", handleOpen);
  }, [config]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(refreshRect, 120);
    window.addEventListener("resize", refreshRect);
    window.addEventListener("scroll", refreshRect, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", refreshRect);
      window.removeEventListener("scroll", refreshRect, true);
    };
  }, [isOpen, refreshRect, stepIndex]);

  if (!config) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setStepIndex(0);
        }}
        className="fixed bottom-5 left-5 z-[70] hidden items-center gap-2 rounded-full border border-[#D7E2DB] bg-white/95 px-4 py-2 text-[0.8125rem] font-semibold text-[#1A2E1F] shadow-[0_10px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:flex"
      >
        <HelpCircle size={15} className="text-[#1B4332]" />
        Hướng dẫn trang này
      </button>

      {isOpen && activeStep && (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-[rgba(15,23,42,0.55)]" onClick={() => closeTour(true)} />

          {rect && (
            <div
              className="pointer-events-none absolute rounded-[18px] border-2 border-[#CFE8D5] shadow-[0_0_0_9999px_rgba(15,23,42,0.25)] transition-all duration-300"
              style={{
                top: Math.max(rect.top - 10, 8),
                left: Math.max(rect.left - 10, 8),
                width: rect.width + 20,
                height: rect.height + 20,
              }}
            />
          )}

          <div className="absolute bottom-5 right-5 w-[min(420px,calc(100vw-24px))] rounded-[20px] border border-[#D7E2DB] bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[#5C7A6A]">{config.title}</p>
                <h3 className="mt-1 text-[1.05rem] font-semibold text-[#1A2E1F]">{activeStep.title}</h3>
              </div>
              <button onClick={() => closeTour(true)} className="rounded-full p-1.5 text-[#5C7A6A] transition-colors hover:bg-[#F0F4F0]">
                <X size={16} />
              </button>
            </div>

            <p className="text-[0.875rem] leading-6 text-[#445A4D]">{activeStep.body}</p>

            <div className="mt-4 rounded-[12px] bg-[#F7F8F6] px-3 py-2 text-[0.75rem] text-[#5C7A6A]">
              {config.description}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="text-[0.75rem] text-[#5C7A6A]">
                Bước {stepIndex + 1}/{activeSteps.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevStep}
                  disabled={stepIndex === 0}
                  className="rounded-[10px] border border-[#E2E8E4] px-3 py-2 text-[0.8125rem] font-medium text-[#5C7A6A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Quay lại
                </button>
                <button
                  onClick={nextStep}
                  className="rounded-[10px] bg-[#1B4332] px-4 py-2 text-[0.8125rem] font-semibold text-white"
                >
                  {stepIndex === activeSteps.length - 1 ? "Hoàn tất" : "Tiếp theo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
