export interface CropKnowledge {
  id: "crop_ca_chua" | "crop_cai_xanh" | "crop_nha_dam";
  name: string;
  biology: string;
  growth: string;
  environment: Array<{ label: string; details: string[] }>;
  warningThresholds: string[];
  criticalThresholds: string[];
}

export const cropKnowledgeCatalog: CropKnowledge[] = [
  {
    id: "crop_ca_chua",
    name: "Cà chua",
    biology: "Cà chua sợ rét và sợ nóng, cần ánh sáng cao và độ ẩm đất ổn định. Cây nhạy cảm ở giai đoạn ra hoa, đậu trái.",
    growth: "Cho trái sau 50-90 ngày tùy giống. Trái đạt chuẩn khi căng mọng, màu đẹp.",
    environment: [
      {
        label: "Ánh sáng",
        details: [
          "Cần 6-8 giờ sáng mỗi ngày.",
          "Thiếu sáng làm cây cao gầy, hoa ít, quả nhỏ, phẩm chất kém.",
        ],
      },
      {
        label: "Nhiệt độ",
        details: [
          "Tốt nhất: 22-26°C.",
          "Trên 30°C giảm đồng hóa.",
          "Dưới 15°C ngừng ra hoa.",
          "Dưới 10°C hoặc trên 35°C ngừng sinh trưởng.",
        ],
      },
      {
        label: "Độ ẩm đất",
        details: [
          "Ươm cây con: 60-70%.",
          "Giai đoạn ra quả: 85-95%.",
          "Cần tưới đều để tránh nứt quả do thiếu/thừa nước luân phiên.",
        ],
      },
      {
        label: "Độ pH đất",
        details: ["6.0-6.5."],
      },
    ],
    warningThresholds: [
      "Nhiệt độ không khí < 20°C hoặc > 30°C.",
      "Độ ẩm đất < 60% hoặc > 90%.",
      "Thời gian chiếu sáng < 5 giờ/ngày.",
    ],
    criticalThresholds: [
      "Nhiệt độ không khí < 15°C: ngừng ra hoa.",
      "Nhiệt độ không khí < 10°C hoặc > 35°C: ngừng sinh trưởng hoàn toàn.",
      "Độ ẩm đất < 50%: thiếu nước nghiêm trọng.",
      "Độ ẩm đất > 95%: nguy cơ nấm bệnh, thối rễ.",
      "Độ pH < 5.5 hoặc > 7.0: giảm hấp thu dinh dưỡng.",
    ],
  },
  {
    id: "crop_cai_xanh",
    name: "Cải xanh",
    biology: "Cải xanh ưa khí hậu mát, sinh trưởng nhanh, rễ nông và nhạy cảm với thiếu/dư nước. Nhiệt độ cao dễ trổ hoa sớm.",
    growth: "Thu hoạch sau 35-40 ngày. Lá tốt: tươi, xanh đậm, ít sâu bệnh.",
    environment: [
      {
        label: "Ánh sáng",
        details: [
          "Cần 4-6 giờ sáng/ngày.",
          "Thiếu sáng làm lá nhỏ, mỏng, màu nhạt.",
        ],
      },
      {
        label: "Nhiệt độ",
        details: [
          "Tốt nhất: 15-18°C.",
          "Trên 27°C dễ trổ hoa sớm.",
          "Dưới 5°C cây ngừng sinh trưởng.",
        ],
      },
      {
        label: "Đất trồng và độ ẩm",
        details: [
          "Ưa đất tơi xốp, nhiều mùn, thoát nước tốt.",
          "Độ ẩm đất phù hợp: 50-70%.",
          "Nên tưới 2 lần/ngày.",
        ],
      },
      {
        label: "Độ pH",
        details: ["5.5-6.5."],
      },
    ],
    warningThresholds: [
      "Nhiệt độ không khí > 18°C: nguy cơ sinh trưởng kém.",
      "Ánh sáng < 4 giờ/ngày hoặc > 6 giờ/ngày.",
      "Độ pH < 5.5 hoặc > 6.5.",
    ],
    criticalThresholds: [
      "Nhiệt độ > 27°C: nguy cơ trổ hoa sớm.",
      "Nhiệt độ < 5°C: ngừng sinh trưởng.",
      "Độ ẩm đất < 50%: thiếu nước (nên kích hoạt tưới tự động).",
      "Độ ẩm đất > 70%: nguy cơ thối rễ.",
    ],
  },
  {
    id: "crop_nha_dam",
    name: "Nha đam",
    biology: "Nha đam là cây mọng nước, chịu hạn tốt nhưng rất nhạy cảm với dư nước kéo dài vì dễ thối rễ.",
    growth: "Chu kỳ thu hoạch 2-3 năm. Cây khỏe có lá dày, mọng nước, không đốm đen.",
    environment: [
      {
        label: "Ánh sáng",
        details: [
          "Ưa ánh sáng nhẹ, tránh nắng gắt trực tiếp.",
          "Mỗi ngày khoảng 6-8 giờ chiếu sáng.",
        ],
      },
      {
        label: "Nhiệt độ",
        details: [
          "Lý tưởng: 20-25°C.",
          "Trên 30°C dễ héo.",
        ],
      },
      {
        label: "Độ ẩm đất",
        details: [
          "Đất tơi xốp, thoát nước tốt (ưu tiên đất pha cát).",
          "Độ ẩm lý tưởng: 40-50%.",
          "Không để úng nước.",
          "Trung bình 3-5 ngày tưới 1 lần.",
        ],
      },
      {
        label: "Độ pH",
        details: ["6.0-7.0 (hơi chua đến trung tính)."],
      },
    ],
    warningThresholds: [
      "Nhiệt độ < 20°C hoặc > 25°C.",
      "Ánh sáng thấp kéo dài.",
      "Độ pH < 6.0 hoặc > 7.0.",
    ],
    criticalThresholds: [
      "Nhiệt độ > 30°C: nguy cơ héo.",
      "Nhiệt độ < 5°C: nguy cơ chết cây.",
      "Độ ẩm đất > 60%: nguy cơ thối rễ nghiêm trọng.",
      "Độ ẩm đất < 30% kéo dài: mất nước nặng.",
    ],
  },
];
