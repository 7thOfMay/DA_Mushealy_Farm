import type { AIChatMessage, AIDashboardContext } from "@/types";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: {
    blockReason?: string;
  };
};

function buildSystemInstruction() {
  return [
    "Ban la tro ly AI cua he thong Mushealy Farm.",
    "Nhiem vu: tu van cho tung khu vuon dua tren du lieu dashboard, lich tuoi, canh bao va log thuc te duoc cung cap.",
    "Tra loi bang tieng Viet, gon, ro, uu tien hanh dong cu the.",
    "Neu du lieu chua du de ket luan, phai noi ro dieu do va de xuat can kiem tra gi tiep.",
    "Khong duoc gia vo da doc du lieu ngoai context da cung cap.",
    "Neu co hinh anh gui kem, ket hop ca hinh anh va dashboard context de nhan xet.",
  ].join("\n");
}

function buildContextText(context: AIDashboardContext) {
  return JSON.stringify(context, null, 2);
}

function buildConversation(messages: AIChatMessage[]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

function extractMimeType(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function extractText(response: GeminiResponse) {
  return response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
}

export function isGeminiConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

export async function generateGardenAdvice(params: {
  context: AIDashboardContext;
  history: AIChatMessage[];
  message: string;
  imageDataUrl?: string | null;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const userParts: Array<Record<string, unknown>> = [
    {
      text: [
        `Khu vuon dang tu van: ${params.context.gardenName}.`,
        "Dashboard context JSON:",
        buildContextText(params.context),
        "",
        "Cau hoi hien tai cua nguoi dung:",
        params.message,
      ].join("\n"),
    },
  ];

  if (params.imageDataUrl) {
    const file = extractMimeType(params.imageDataUrl);
    if (file) {
      userParts.push({
        inline_data: {
          mime_type: file.mimeType,
          data: file.data,
        },
      });
    }
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: buildSystemInstruction() }],
      },
      contents: [
        ...buildConversation(params.history),
        {
          role: "user",
          parts: userParts,
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 1200,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const json = (await response.json()) as GeminiResponse;
  const text = extractText(json);

  if (!text) {
    if (json.promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked the response: ${json.promptFeedback.blockReason}`);
    }
    throw new Error("Gemini returned an empty response");
  }

  return text;
}
