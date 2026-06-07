"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { HelpCircle, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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

type BubbleLayout = {
  bubbleTop: number;
  bubbleLeft: number;
  bubbleWidth: number;
  botTop: number;
  botLeft: number;
  tailTop: number;
  tailLeft: number;
};

const STORAGE_PREFIX = "mushealy-product-tour";
const VIEWPORT_MARGIN = 16;
const BUBBLE_WIDTH = 340;
const BOT_SIZE = 64;

const TOUR_CONFIGS: TourConfig[] = [
  {
    key: "farm-dashboard",
    title: "Dashboard Nong Trai",
    description: "Huong dan nhanh cac phan quan trong cua dashboard theo nong trai.",
    match: (pathname) => /^\/farms\/[^/]+$/.test(pathname),
    steps: [
      {
        selector: '[data-tour="farm-summary"]',
        title: "Tong quan nhanh",
        body: "Khoi nay cho ban so khu vuon, so thiet bi online, canh bao chua xu ly va uptime de nhin toan canh farm ngay khi mo vao.",
      },
      {
        selector: '[data-tour="farm-gardens"]',
        title: "Danh sach khu vuon",
        body: "Moi the khu vuon la mot diem vao chinh de xem du lieu cam bien, thiet bi, lich tuoi va nhat ky rieng cho khu do.",
      },
      {
        selector: '[data-tour="farm-shortcuts"]',
        title: "Loi tat tac vu",
        body: "Tu day ban chuyen nhanh sang thiet bi, lich trinh va canh bao ma khong can quay lai sidebar.",
      },
    ],
  },
  {
    key: "reports",
    title: "Phan Tich Dashboard",
    description: "Huong dan bo loc, tro thu bieu do va cac khoi phan tich da hoan thien.",
    match: (pathname) => pathname === "/reports",
    steps: [
      {
        selector: '[data-tour="reports-filters"]',
        title: "Bo loc dashboard",
        body: "Chon nong trai, khu vuon va khoang thoi gian o day. Toan bo bieu do va phan tich phia duoi se doi theo bo loc nay.",
      },
      {
        selector: '[data-tour="reports-assistant"]',
        title: "Tro thu phan tich bieu do",
        body: "Cac nut tro thu mo phan giai thich ly thuyet va phan tich du lieu hien tai cua bieu do tuong ung.",
      },
      {
        selector: '[data-tour="reports-main-chart"]',
        title: "Bieu do xu huong chinh",
        body: "Day la bieu do theo doi xu huong cac chi so moi truong theo thoi gian cho khu vuon dang chon.",
      },
      {
        selector: '[data-tour="reports-distribution"]',
        title: "Phan loai theo nguong",
        body: "Khoi nay chia du lieu thanh thap, hop ly, cao dua tren threshold that cua khu vuon de giai thich tinh trang moi truong.",
      },
      {
        selector: '[data-tour="reports-correlation"]',
        title: "Tuong quan chi so",
        body: "Dung de xem cac cap chi so co bien dong cung nhau hay khong, vi du nhiet do voi am dat hoac anh sang.",
      },
    ],
  },
  {
    key: "schedules",
    title: "Lich Tuoi Theo Khu Vuon",
    description: "Huong dan flow chon khu vuon truoc roi moi thao tac lich tuoi.",
    match: (pathname) => /^\/farms\/[^/]+\/schedules$/.test(pathname),
    steps: [
      {
        selector: '[data-tour="schedule-garden-picker"]',
        title: "Chon khu vuon truoc",
        body: "Moi khu vuon co lich tuoi rieng. Ban chon khu o day truoc, sau do danh sach lich, chi tiet va canh bao se bam theo khu do.",
      },
      {
        selector: '[data-tour="schedule-list"]',
        title: "Danh sach lich cua khu",
        body: "Cot trai la toan bo lich tuoi cua khu vuon dang chon. Ban co the bat tat nhanh tung lich ngay tai day.",
      },
      {
        selector: '[data-tour="schedule-calendar"]',
        title: "Lich chay theo ngay",
        body: "Khoi nay cho biet trong ngay dang chon co lich nao se chay. Day la noi phu hop de kiem tra logic lich hang ngay hoac hang tuan.",
      },
      {
        selector: '[data-tour="schedule-detail"]',
        title: "Chi tiet lich tuoi",
        body: "Khi bam vao mot lich, phan nay hien thi cau hinh day du nhu thoi gian, kieu lich va rule neu la lich theo nguong.",
      },
      {
        selector: '[data-tour="schedule-create"]',
        title: "Tao lich moi",
        body: "Nut nay mo flow tao lich tuoi. Với lich theo gio, neu toi gio ma bom khong chay thi he thong se tu sinh canh bao va ghi nhat ky cho dung khu vuon do.",
      },
    ],
  },
  {
    key: "logs",
    title: "Nhat Ky Va Tra Cuu",
    description: "Huong dan phan dashboard nhat ky va danh sach ban ghi.",
    match: (pathname) => pathname === "/logs" || /^\/farms\/[^/]+\/logs$/.test(pathname),
    steps: [
      {
        selector: '[data-tour="logs-view-mode"]',
        title: "Hai che do xem",
        body: "Ban co the chuyen giua dashboard nhat ky de xem xu huong tong quan va danh sach ban ghi de tra cuu chi tiet tung su kien.",
      },
      {
        selector: '[data-tour="logs-summary"]',
        title: "Tom tat so luong ban ghi",
        body: "Cac the nay chia nhanh so ban ghi theo nhom cam bien, canh bao, lenh thiet bi va nhat ky he thong.",
      },
      {
        selector: '[data-tour="logs-filters"]',
        title: "Bo loc nhat ky",
        body: "Tai day ban loc theo khu vuon, khoang thoi gian, loai ban ghi, chi so va tu khoa de tim lai su kien mong muon.",
      },
      {
        selector: '[data-tour="logs-chart"]',
        title: "Bieu do du lieu lich su",
        body: "Khoi nay cho xem dien bien du lieu cam bien theo bo loc hien tai, phu hop de giai thich boi canh truoc va sau cac su kien.",
      },
      {
        selector: '[data-tour="logs-list"]',
        title: "Danh sach ban ghi chi tiet",
        body: "Day la noi hien thi toan bo log da loc, gom mo ta, khu vuon, thiet bi, nguoi thao tac va payload truoc-sau neu co.",
      },
    ],
  },
];

function getActiveConfig(pathname: string) {
  return TOUR_CONFIGS.find((config) => config.match(pathname)) ?? null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computeBubbleLayout(rect: DOMRect | null) {
  if (!rect || typeof window === "undefined") return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const preferRight = rect.right + BUBBLE_WIDTH + BOT_SIZE + 48 < viewportWidth - VIEWPORT_MARGIN;
  const preferBelow = rect.bottom + 220 < viewportHeight - VIEWPORT_MARGIN;

  const bubbleLeft = preferRight
    ? clamp(rect.right + 28, VIEWPORT_MARGIN, viewportWidth - BUBBLE_WIDTH - VIEWPORT_MARGIN)
    : clamp(rect.left - BUBBLE_WIDTH - 28, VIEWPORT_MARGIN, viewportWidth - BUBBLE_WIDTH - VIEWPORT_MARGIN);

  const bubbleTopBase = preferBelow ? rect.bottom + 18 : rect.top - 190;
  const bubbleTop = clamp(bubbleTopBase, VIEWPORT_MARGIN, viewportHeight - 220);

  const botLeft = preferRight
    ? clamp(bubbleLeft - BOT_SIZE + 12, VIEWPORT_MARGIN, viewportWidth - BOT_SIZE - VIEWPORT_MARGIN)
    : clamp(bubbleLeft + BUBBLE_WIDTH - 24, VIEWPORT_MARGIN, viewportWidth - BOT_SIZE - VIEWPORT_MARGIN);

  const botTop = clamp(bubbleTop + 110, VIEWPORT_MARGIN, viewportHeight - BOT_SIZE - VIEWPORT_MARGIN);

  const tailLeft = preferRight ? 22 : BUBBLE_WIDTH - 34;
  const tailTop = preferBelow ? -8 : 100;

  return {
    bubbleTop,
    bubbleLeft,
    bubbleWidth: BUBBLE_WIDTH,
    botTop,
    botLeft,
    tailTop,
    tailLeft,
  } satisfies BubbleLayout;
}

export function ProductTour() {
  const pathname = usePathname();
  const config = useMemo(() => getActiveConfig(pathname), [pathname]);
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const activeSteps = config?.steps ?? [];
  const activeStep = activeSteps[stepIndex] ?? null;
  const bubbleLayout = useMemo(() => computeBubbleLayout(rect), [rect]);

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
    setTimeout(() => {
      const bounds = element.getBoundingClientRect();
      setRect(bounds);
    }, 180);
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
    const timer = window.setTimeout(refreshRect, 80);
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
        Huong dan trang nay
      </button>

      {isOpen && activeStep && (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-[rgba(7,12,19,0.72)]" onClick={() => closeTour(true)} />

          {rect && (
            <div
              className="pointer-events-none absolute rounded-[22px] border border-[rgba(214,255,226,0.9)] bg-transparent shadow-[0_0_0_9999px_rgba(7,12,19,0.64),0_0_32px_rgba(151,255,187,0.22)] transition-all duration-300"
              style={{
                top: Math.max(rect.top - 10, 8),
                left: Math.max(rect.left - 10, 8),
                width: rect.width + 20,
                height: rect.height + 20,
              }}
            />
          )}

          {bubbleLayout && (
            <>
              <div
                className="absolute z-[82] rounded-[26px] border border-[rgba(214,255,226,0.2)] bg-[rgba(17,28,22,0.92)] px-5 py-4 text-white shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-md transition-all duration-300"
                style={{
                  top: bubbleLayout.bubbleTop,
                  left: bubbleLayout.bubbleLeft,
                  width: bubbleLayout.bubbleWidth,
                }}
              >
                <div
                  className="absolute h-4 w-4 rotate-45 border-l border-t border-[rgba(214,255,226,0.2)] bg-[rgba(17,28,22,0.92)]"
                  style={{
                    top: bubbleLayout.tailTop,
                    left: bubbleLayout.tailLeft,
                  }}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#B8D8C0]">
                      {config.title}
                    </p>
                    <h3 className="mt-1 text-[1rem] font-semibold text-white">
                      {activeStep.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => closeTour(true)}
                    className="rounded-full p-1 text-[#B8D8C0] transition-colors hover:bg-white/10"
                  >
                    <X size={15} />
                  </button>
                </div>

                <p className="mt-3 text-[0.875rem] leading-6 text-[#ECF7EF]">
                  {activeStep.body}
                </p>

                <div className="mt-3 text-[0.75rem] text-[#B8D8C0]">
                  {config.description}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-[0.75rem] font-medium text-[#B8D8C0]">
                    Buoc {stepIndex + 1}/{activeSteps.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prevStep}
                      disabled={stepIndex === 0}
                      className="rounded-full border border-white/14 px-3 py-1.5 text-[0.75rem] font-medium text-[#D4E8D9] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Lui
                    </button>
                    <button
                      onClick={nextStep}
                      className="rounded-full bg-[#D4F7DC] px-4 py-1.5 text-[0.75rem] font-semibold text-[#14301B] transition-transform hover:scale-[1.02]"
                    >
                      {stepIndex === activeSteps.length - 1 ? "Xong" : "Tiep"}
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="absolute z-[83] flex flex-col items-center gap-2 transition-all duration-300"
                style={{
                  top: bubbleLayout.botTop,
                  left: bubbleLayout.botLeft,
                }}
              >
                <div className="rounded-full bg-[rgba(17,28,22,0.86)] p-2 shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[#CFE8D5]/45 bg-[#F3FFF6]">
                    <Image
                      src="/mushealy-logo.png"
                      alt="Mushealy guide"
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                </div>
                <span className="rounded-full bg-[rgba(17,28,22,0.78)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[#EAF6EE]">
                  Mushealy guide
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
