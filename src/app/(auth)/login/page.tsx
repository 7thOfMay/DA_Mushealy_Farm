"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, X, ChevronRight } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { FormErrorBanner, InlineFieldError } from "@/components/shared";
import { ValidationFeedback } from "@/components/shared/ValidationFeedback";
import { isValidEmail } from "@/lib/validation";
import { getDashboardLandingPath } from "@/lib/localSettings";
import { apiLogin } from "@/lib/api/client";

// ── Login Modal ──────────────────────────────────────────────────────────────
function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const login  = useAppStore((s) => s.login);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const normalizedEmail = email.toLowerCase().trim();
    let hasError = false;

    if (!normalizedEmail) {
      setEmailError("Email là bắt buộc.");
      hasError = true;
    } else if (!isValidEmail(normalizedEmail)) {
      setEmailError("Email không đúng định dạng.");
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError("Mật khẩu là bắt buộc.");
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (hasError) {
      setError("Vui lòng kiểm tra lại các trường bắt buộc trước khi đăng nhập.");
      return;
    }

    setLoading(true);
    const authResult = await apiLogin(normalizedEmail, password);

    if (!authResult) {
      setError("Không thể kết nối máy chủ. Vui lòng kiểm tra cấu hình cơ sở dữ liệu.");
      setLoading(false);
      return;
    }

    if (authResult.ok && authResult.user) {
      login(authResult.user);
      router.push(getDashboardLandingPath());
      return;
    }

    if (authResult.reason === "inactive") {
      router.push(`/pending?email=${encodeURIComponent(normalizedEmail)}`);
      return;
    }

    setError("Email hoặc mật khẩu không đúng.");
    setLoading(false);
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,20,14,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-[20px] shadow-[0_24px_80px_rgba(0,0,0,0.22)] w-full max-w-[420px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Mushealy" width={36} height={36} className="rounded-[8px] object-contain"/>
            <div>
              <p className="text-[0.8125rem] font-bold text-[#1A2E1F]">Mushealy</p>
              <p className="text-[0.625rem] text-[#5C7A6A] uppercase tracking-wider">Smart Farm System</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5C7A6A] hover:bg-[#F0F4F0] transition-colors">
            <X size={16}/>
          </button>
        </div>

        <div className="px-6 pb-6">
          <h2 className="text-[1.375rem] font-bold text-[#1A2E1F] mb-0.5">Chào mừng trở lại</h2>
          <p className="text-[0.8125rem] text-[#5C7A6A] mb-5">Đăng nhập để quản lý nông trại của bạn</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Email</label>
              <input type="email" autoComplete="email" placeholder="an.nguyen@nongtech.vn"
                value={email} onChange={(e) => { setEmail(e.target.value); setError(""); setEmailError(null); }}
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-[10px] border text-[0.875rem] outline-none transition-all",
                  "bg-[#F7F9F7] border-[#D1E8DC] focus:border-[#1B4332] focus:bg-white focus:shadow-[0_0_0_3px_rgba(27,67,50,0.1)]",
                  (emailError || error) && "border-[#C0392B]"
                )}
              />
              <InlineFieldError message={emailError} />
            </div>
            <div>
              <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} autoComplete="current-password"
                  placeholder="••••••" value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); setPasswordError(null); }}
                  className={cn(
                    "w-full px-3.5 py-2.5 pr-10 rounded-[10px] border text-[0.875rem] outline-none transition-all",
                    "bg-[#F7F9F7] border-[#D1E8DC] focus:border-[#1B4332] focus:bg-white focus:shadow-[0_0_0_3px_rgba(27,67,50,0.1)]",
                    (passwordError || error) && "border-[#C0392B]"
                  )}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C7A6A] hover:text-[#1B4332]">
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              <InlineFieldError message={passwordError} />
            </div>
            <FormErrorBanner message={error} />
            <ValidationFeedback errors={[emailError ?? "", passwordError ?? ""].filter(Boolean)} />
            <button type="submit" disabled={loading}
              className={cn(
                "w-full py-3 rounded-[12px] font-bold text-[0.9375rem] transition-all flex items-center justify-center gap-2",
                "bg-[#1B4332] text-white hover:bg-[#2D6A4F] active:scale-[0.98]",
                loading && "opacity-70 cursor-not-allowed"
              )}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  Đang xác thực…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">Đăng nhập <ChevronRight size={16}/></span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Register Modal ───────────────────────────────────────────────────────────
function RegisterModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const addToast = useAppStore((state) => state.addToast);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"FARMER" | "ADMIN">("FARMER");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!fullName.trim()) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError("Email không đúng định dạng.");
      return;
    }

    addToast({
      type: "success",
      message: `Đã ghi nhận yêu cầu đăng ký cho ${fullName.trim()} (${role}). Quản trị viên sẽ liên hệ qua ${normalizedEmail}.`,
    });
    onClose();
  };

  return (
    <div ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,20,14,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-white rounded-[20px] shadow-[0_24px_80px_rgba(0,0,0,0.22)] w-full max-w-[430px] overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Mushealy" width={36} height={36} className="rounded-[8px] object-contain"/>
            <p className="text-[0.8125rem] font-bold text-[#1A2E1F]">Yêu cầu mở tài khoản</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5C7A6A] hover:bg-[#F0F4F0] transition-colors">
            <X size={16}/>
          </button>
        </div>
        <div className="px-6 pb-6 space-y-3">
          <p className="text-[0.8125rem] text-[#5C7A6A]">Điền thông tin để gửi yêu cầu tạo tài khoản cho quản trị viên.</p>
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Họ và tên</label>
            <input className="input-field" value={fullName} onChange={(e) => { setFullName(e.target.value); setError(null); }} />
          </div>
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Email liên hệ</label>
            <input className="input-field" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} />
          </div>
          <div>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5C7A6A] mb-1.5">Vai trò mong muốn</label>
            <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as "FARMER" | "ADMIN") }>
              <option value="FARMER">Farmer — Nông dân</option>
              <option value="ADMIN">Admin — Kỹ sư</option>
            </select>
          </div>
          <FormErrorBanner message={error} />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose} className="btn-secondary">Hủy</button>
            <button onClick={handleSubmit} className="btn-primary" disabled={!fullName.trim() || !email.trim()}>Gửi yêu cầu</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
const SLIDES = ["/poster.webp", "/poster1.jpg"];

const FEATURES = [
  { icon: "📡", label: "Giám sát realtime" },
  { icon: "⚡", label: "Điều khiển thông minh" },
  { icon: "📊", label: "Phân tích & Báo cáo" },
  { icon: "🤖", label: "AI chẩn đoán cây" },
  { icon: "📅", label: "Lịch chăm sóc tự động" },
];

export default function LoginPage() {
  const router = useRouter();
  const loggedInUser = useAppStore((state) => state.loggedInUser);
  const [activeSlide, setActiveSlide] = useState(0);
  const [modal, setModal]             = useState<"login" | "register" | null>(null);

  useEffect(() => {
    if (loggedInUser) {
      router.replace(getDashboardLandingPath());
    }
  }, [loggedInUser, router]);

  useEffect(() => {
    const id = setInterval(() => setActiveSlide((p) => (p + 1) % SLIDES.length), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-screen overflow-hidden bg-[#0A1A0F] select-none">

      {/* BACKGROUND SLIDESHOW */}
      {SLIDES.map((src, i) => (
        <div key={src} className="absolute inset-0 transition-opacity duration-[1600ms] ease-in-out"
          style={{ opacity: activeSlide === i ? 1 : 0, zIndex: 0 }}>
          <Image src={src} alt="" fill className="object-cover" priority={i === 0}/>
        </div>
      ))}
      <div className="absolute inset-0 z-[1]"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0.82) 100%)" }}/>

      {/* TOP NAVBAR */}
      <header className="absolute top-0 left-0 right-0 z-10"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Mushealy" width={36} height={36} className="rounded-[10px] object-contain"/>
            <div className="flex flex-col leading-none">
              <span className="text-[1.0625rem] font-bold text-[#1A2E1F] tracking-tight">Mushealy</span>
              <span className="text-[0.5625rem] uppercase tracking-widest text-[#5C7A6A] font-medium">Smart Farm System</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {["Tổng quan", "Tính năng", "Hỗ trợ"].map((item) => (
              <span key={item} className="text-[0.8125rem] font-medium text-[#3A5A4A] hover:text-[#1B4332] cursor-pointer transition-colors">{item}</span>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => setModal("login")}
              className="hidden sm:flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[#1B4332] px-4 py-1.5 rounded-[20px] border border-[#1B4332] hover:bg-[#1B4332] hover:text-white transition-all">
              Đăng nhập
            </button>
            <button onClick={() => setModal("register")}
              className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-white px-4 py-1.5 rounded-[20px] bg-[#1B4332] hover:bg-[#2D6A4F] transition-all">
              Đăng ký
            </button>
          </div>
        </div>
      </header>

      {/* CENTER HERO */}
      <main className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-10 px-4 pt-[60px] pb-[84px]">
        <div className="text-center">
          <h1 className="text-white font-bold tracking-tight mb-3 drop-shadow-lg"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic",
              fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.1 }}>
            Kiểm soát nông trại<br/>trong lòng bàn tay
          </h1>
          <p className="text-white/75 text-[0.9375rem] font-medium drop-shadow">
            Hệ thống IoT thông minh — giám sát, điều khiển &amp; phân tích 24/7
          </p>
        </div>

        {/* 2 Big CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-[560px]">
          <button onClick={() => setModal("login")}
            className="group flex-1 flex flex-col items-center justify-center gap-3 py-7 px-6 rounded-[20px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)",
              border: "2px solid rgba(255,255,255,0.5)", boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
            }}>
            <div className="w-14 h-14 rounded-[16px] bg-[#1B4332] flex items-center justify-center text-2xl shadow-lg group-hover:shadow-[0_8px_24px_rgba(27,67,50,0.4)] transition-shadow">
              🔑
            </div>
            <div className="text-center">
              <p className="text-[1.0625rem] font-bold text-[#1A2E1F] tracking-wide">ĐĂNG NHẬP</p>
              <p className="text-[0.75rem] text-[#5C7A6A] mt-0.5">Truy cập hệ thống</p>
            </div>
            <span className="text-[0.6875rem] text-white font-semibold px-3 py-1 rounded-full bg-[#1B4332]">
              Có tài khoản? Vào ngay →
            </span>
          </button>

          <button onClick={() => setModal("register")}
            className="group flex-1 flex flex-col items-center justify-center gap-3 py-7 px-6 rounded-[20px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: "rgba(27,67,50,0.82)", backdropFilter: "blur(10px)",
              border: "2px solid rgba(82,183,136,0.45)", boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
            }}>
            <div className="w-14 h-14 rounded-[16px] bg-white/15 flex items-center justify-center text-2xl shadow-lg group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-shadow">
              🌱
            </div>
            <div className="text-center">
              <p className="text-[1.0625rem] font-bold text-white tracking-wide">ĐĂNG KÝ</p>
              <p className="text-[0.75rem] text-white/65 mt-0.5">Tạo tài khoản mới</p>
            </div>
            <span className="text-[0.6875rem] text-[#1B4332] font-semibold px-3 py-1 rounded-full bg-white/90">
              Dùng thử miễn phí →
            </span>
          </button>
        </div>

        {/* Slide dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setActiveSlide(i)}>
              <span className={cn(
                "block rounded-full transition-all duration-300",
                activeSlide === i ? "w-7 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70"
              )}/>
            </button>
          ))}
        </div>
      </main>

      {/* BOTTOM INFO BAR */}
      <footer className="absolute bottom-0 left-0 right-0 z-10"
        style={{ background: "rgba(255,255,255,0.93)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-[64px] flex items-center justify-between gap-4 overflow-hidden">
          <div className="shrink-0 flex items-center gap-2">
            <Image src="/logo.png" alt="" width={22} height={22} className="rounded-[5px] object-contain opacity-80"/>
            <span className="text-[0.8125rem] font-bold text-[#1A2E1F]">Mushealy</span>
            <span className="text-[0.625rem] uppercase tracking-widest text-[#5C7A6A] hidden sm:inline">v1.0</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {FEATURES.map((f) => (
              <span key={f.label}
                className="shrink-0 flex items-center gap-1.5 text-[0.6875rem] font-medium text-[#3A5A4A] px-3 py-1 rounded-full"
                style={{ background: "#F0F8F4", border: "1px solid #D1E8DC" }}>
                <span className="text-[0.75rem]">{f.icon}</span>{f.label}
              </span>
            ))}
          </div>
          <p className="shrink-0 text-[0.625rem] text-[#5C7A6A] uppercase tracking-wider hidden lg:block">
            3 Vườn · 14 Thiết bị · 24/7
          </p>
        </div>
      </footer>

      {/* MODALS */}
      {modal === "login"    && <LoginModal    onClose={() => setModal(null)}/>}
      {modal === "register" && <RegisterModal onClose={() => setModal(null)}/>}
    </div>
  );
}
