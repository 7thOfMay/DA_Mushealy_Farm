"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Upload, BrainCircuit, CheckCircle, Leaf, Droplets, Bug, Microscope } from "lucide-react";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { ErrorState, LoadingState } from "@/frontend/components/shared/ErrorStates";
import { useAppStore } from "@/frontend/context/store";
import { cn, timeAgo } from "@/frontend/utils/utils";

type SubTab = "detection" | "classification";

export default function AIPage() {
  const currentFarmId = useAppStore((state) => state.currentFarmId);
  const gardens = useAppStore((state) => state.gardens);
  const aiAnalyses = useAppStore((state) => state.aiAnalyses);
  const addAiAnalysis = useAppStore((state) => state.addAiAnalysis);
  const addLog = useAppStore((state) => state.addLog);
  const addToast = useAppStore((state) => state.addToast);
  const loggedInUser = useAppStore((state) => state.loggedInUser);

  const [subTab, setSubTab] = useState<SubTab>("detection");
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedGardenId, setSelectedGardenId] = useState<string>("all");
  const [result, setResult] = useState<null | { label: string; confidence: number; recommendation: string }>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const farmGardens = useMemo(() => {
    if (!currentFarmId) return gardens;
    return gardens.filter((garden) => garden.farmId === currentFarmId);
  }, [gardens, currentFarmId]);

  const visibleAnalyses = useMemo(() => {
    const allowedGardenIds = new Set(farmGardens.map((garden) => garden.id));
    const base = aiAnalyses.filter((analysis) => allowedGardenIds.has(analysis.gardenId));
    if (selectedGardenId === "all") return base;
    return base.filter((analysis) => analysis.gardenId === selectedGardenId);
  }, [aiAnalyses, farmGardens, selectedGardenId]);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const handleAnalyze = async () => {
    const targetGarden = selectedGardenId === "all" ? farmGardens[0] : farmGardens.find((garden) => garden.id === selectedGardenId);
    if (!targetGarden) {
      addToast({ type: "warning", message: "Vui lòng chọn khu vườn để lưu kết quả AI" });
      return;
    }

    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1500));

    const generated = subTab === "classification"
      ? {
          label: "Phân loại đạt mức thu hoạch",
          confidence: 88.4,
          recommendation: "Ưu tiên thu hoạch lứa 1 trong 24 giờ tới, giữ tưới nhẹ.",
        }
      : {
          label: "Cây phát triển bình thường",
          confidence: 91.5,
          recommendation: "Không cần can thiệp. Tiếp tục chế độ chăm sóc hiện tại.",
        };

    const nextAnalysis = {
      id: `ai_${Date.now()}`,
      imageUrl: previewUrl ?? "",
      gardenId: targetGarden.id,
      gardenName: targetGarden.name,
      result: generated.label,
      confidence: generated.confidence,
      recommendation: generated.recommendation,
      timestamp: new Date().toISOString(),
    };

    addAiAnalysis(nextAnalysis);
    addLog({
      id: `log_${Date.now()}`,
      actionType: "CONFIG_CHANGE",
      description: `AI phan tich anh tai ${targetGarden.name}`,
      userId: loggedInUser?.id ?? "u1",
      userName: loggedInUser?.name ?? "System Admin",
      gardenId: targetGarden.id,
      gardenName: targetGarden.name,
      timestamp: new Date().toISOString(),
    });
    addToast({ type: "success", message: `Đã lưu kết quả AI cho ${targetGarden.name}` });
    setResult(generated);
    setAnalyzing(false);
  };

  const getConfidenceColor = (c: number) => (c >= 80 ? "#27AE60" : c >= 60 ? "#E67E22" : "#C0392B");

  if (farmGardens.length === 0) {
    return (
      <div>
        <Topbar title="AI Module" subtitle="Phân tích hình ảnh cây trồng bằng trí tuệ nhân tạo" />
        <div className="p-8 max-w-3xl">
          <ErrorState
            title="Chưa có khu vườn để phân tích AI"
            description="Hãy tạo khu vườn trong nông trại hiện tại trước khi tải ảnh phân tích."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="AI Module" subtitle="Phân tích hình ảnh cây trồng bằng trí tuệ nhân tạo" />

      <div className="p-8 space-y-6">
        {/* Sub tabs */}
        <div className="flex gap-1 border-b border-[#E2E8E4]">
          {[
            { id: "detection" as SubTab, label: "Phát hiện bất thường" },
            { id: "classification" as SubTab, label: "Phân loại thu hoạch" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-[0.875rem] font-medium border-b-2 transition-colors -mb-px",
                subTab === tab.id ? "border-[#1B4332] text-[#1B4332]" : "border-transparent text-[#5C7A6A] hover:text-[#1A2E1F]"
              )}
            >
              <BrainCircuit size={15} strokeWidth={1.5} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload zone */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[1rem] text-[#1A2E1F]">Tải ảnh lên để phân tích</h3>

            <div>
              <label className="block text-[0.6875rem] uppercase tracking-wide text-[#5C7A6A] font-semibold mb-1.5">Khu vườn áp dụng</label>
              <select
                className="input-field"
                value={selectedGardenId}
                onChange={(event) => setSelectedGardenId(event.target.value)}
              >
                <option value="all">Chọn tự động theo farm</option>
                {farmGardens.map((garden) => (
                  <option key={garden.id} value={garden.id}>{garden.name}</option>
                ))}
              </select>
            </div>

            <div
              className={cn(
                "border-2 border-dashed rounded-[12px] p-8 text-center cursor-pointer transition-all",
                dragOver ? "border-[#1B4332] bg-[#F0FAF3]" : "border-[#E2E8E4] hover:border-[#40916C] hover:bg-[#F7F8F6]"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {previewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <Image src={previewUrl} alt="Preview" width={160} height={160} className="w-40 h-40 object-cover rounded-[8px] shadow-sm" />
                  <p className="text-[0.875rem] text-[#5C7A6A]">Click để thay ảnh khác</p>
                </div>
              ) : (
                <>
                  <Upload size={40} strokeWidth={1} className="mx-auto text-[#1B4332]/40 mb-3" />
                  <p className="text-[0.9375rem] font-medium text-[#1A2E1F] mb-1">Kéo thả ảnh vào đây</p>
                  <p className="text-[0.8125rem] text-[#5C7A6A]">hoặc click để chọn file · JPG, PNG, WEBP</p>
                </>
              )}
            </div>

            {previewUrl && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full btn-primary justify-center py-3 text-[1rem] disabled:opacity-60"
              >
                {analyzing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <BrainCircuit size={18} />
                    Phân tích ảnh
                  </>
                )}
              </button>
            )}

            {/* Result card */}
            {analyzing && <LoadingState message="Mô hình AI đang xử lý ảnh và tổng hợp khuyến nghị..." />}
            {result && !analyzing && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={18} className="text-[#27AE60]" />
                  <h4 className="font-semibold text-[1rem] text-[#1A2E1F]">Kết quả phân tích</h4>
                </div>

                {/* Confidence */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[0.75rem] uppercase tracking-wide text-[#5C7A6A] font-semibold">Độ tin cậy</span>
                    <span
                      className="text-[1.75rem] font-bold"
                      style={{ fontFamily: "'DM Mono', monospace", color: getConfidenceColor(result.confidence) }}
                    >
                      {result.confidence}%
                    </span>
                  </div>
                  <div className="h-2 bg-[#E2E8E4] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${result.confidence}%`, backgroundColor: getConfidenceColor(result.confidence) }}
                    />
                  </div>
                </div>

                <p className="font-semibold text-[1rem] text-[#1A2E1F] mb-2">{result.label}</p>
                <div className="bg-[#F7F8F6] rounded-[8px] p-3">
                  <p className="text-[0.8125rem] text-[#5C7A6A]">
                    <span className="font-semibold text-[#1A2E1F]">Khuyến nghị:</span> {result.recommendation}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* History */}
          <div>
            <h3 className="font-semibold text-[1rem] text-[#1A2E1F] mb-4">Lịch sử phân tích</h3>
            <div className="space-y-3">
              {visibleAnalyses.map((a) => {
                const isHealthy = a.result.toLowerCase().includes("bình thường");
                const isWater = a.result.toLowerCase().includes("nước") || a.result.toLowerCase().includes("tưới");
                const isPest = a.result.toLowerCase().includes("sâu") || a.result.toLowerCase().includes("bệnh");
                const IconEl = isHealthy ? Leaf : isWater ? Droplets : isPest ? Bug : Microscope;
                const iconColor = isHealthy ? "#27AE60" : isWater ? "#2980B9" : "#E67E22";
                const iconBg = isHealthy ? "#DCFCE7" : isWater ? "#EBF5FB" : "#FEF3C7";
                return (
                <div key={a.id} className="card p-4 flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-[8px] flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: iconBg }}
                  >
                    <IconEl size={24} style={{ color: iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[0.875rem] text-[#1A2E1F]">{a.result}</p>
                    <p className="text-[0.75rem] text-[#5C7A6A] mt-0.5">{a.gardenName}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-16 bg-[#E2E8E4] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${a.confidence}%`, backgroundColor: getConfidenceColor(a.confidence) }}
                          />
                        </div>
                        <span className="text-[0.6875rem] font-bold" style={{ fontFamily: "'DM Mono', monospace", color: getConfidenceColor(a.confidence) }}>
                          {a.confidence}%
                        </span>
                      </div>
                      <span className="text-[0.6875rem] text-[#5C7A6A]">{timeAgo(a.timestamp)}</span>
                    </div>
                  </div>
                </div>
                );
              })}
              {visibleAnalyses.length === 0 && (
                <div className="card p-4">
                  <p className="text-[0.8125rem] text-[#5C7A6A]">Chưa có lịch sử AI cho phạm vi nông trại hiện tại.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
