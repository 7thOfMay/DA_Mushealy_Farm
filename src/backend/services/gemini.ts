import type { AIChatMessage, AIDashboardContext } from "@/types";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type GeminiCandidate = {
  finishReason?: string;
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
    "Tra loi bang tieng Viet, tu nhien, gon, ro, uu tien hanh dong cu the.",
    "Du lieu cua khu vuon hien tai la nen tang chinh de phan tich.",
    "Duoc phep dung kien thuc pho quat ve cham soc cay trong, tuoi tieu, anh sang, nhiet do, do am va benh ly thuc vat de giai thich va dua ra khuyen nghi.",
    "Phai ket hop ca hai nguon: du lieu thuc te cua khu vuon va kien thuc chuyen mon pho quat cua model.",
    "Neu mot nhan dinh duoc suy ra tu kien thuc pho quat hon la du lieu truc tiep, phai noi ro do la suy luan hay khuyen nghi, khong duoc trinh bay nhu su that da xac nhan.",
    "Neu du lieu chua du de ket luan chac chan, phai noi ro dieu do va de xuat can kiem tra gi tiep.",
    "Khong duoc gia vo co du lieu ma context khong cung cap, nhung duoc phep dua ra gia thuyet hop ly dua tren kien thuc nong nghiep chung.",
    "Khong dung markdown heading, dau *** , ###, --- hoac dinh dang qua giong bai viet. Tra loi nhu mot tro ly tu van thuc te.",
    "Neu co hinh anh gui kem, ket hop ca hinh anh va dashboard context de nhan xet.",
  ].join("\n");
}

function buildContextText(context: AIDashboardContext) {
  return JSON.stringify(context, null, 2);
}

function buildConversation(messages: AIChatMessage[]) {
  return messages.map<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }>((message) => ({
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

function normalizeAssistantText(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shouldContinueText(text: string, finishReason?: string) {
  if (!text.trim()) return false;

  if (finishReason && finishReason !== "STOP") {
    return true;
  }

  return !/[.!?…:"')\]»”]$/.test(text.trim());
}

async function requestGemini(params: {
  apiKey: string;
  history: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }>;
  userParts: Array<Record<string, unknown>>;
  maxOutputTokens?: number;
}) {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(params.apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: buildSystemInstruction() }],
      },
      contents: [
        ...params.history,
        {
          role: "user",
          parts: params.userParts,
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: params.maxOutputTokens ?? 1800,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  return (await response.json()) as GeminiResponse;
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

  const history = buildConversation(params.history);
  const json = await requestGemini({
    apiKey,
    history,
    userParts,
  });
  let text = extractText(json);
  const finishReason = json.candidates?.[0]?.finishReason;

  if (!text) {
    if (json.promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked the response: ${json.promptFeedback.blockReason}`);
    }
    throw new Error("Gemini returned an empty response");
  }

  if (shouldContinueText(text, finishReason)) {
    const continuation = await requestGemini({
      apiKey,
      history: [
        ...history,
        {
          role: "user",
          parts: userParts,
        },
        {
          role: "model",
          parts: [{ text }],
        },
      ],
      userParts: [
        {
          text: "Doan tren dang bi dung giua chung. Hay viet tiep phan con lai ngay sau do, khong lap lai tu dau, khong them tieu de.",
        },
      ],
      maxOutputTokens: 900,
    });

    const continuationText = extractText(continuation);
    if (continuationText) {
      text = `${text.trimEnd()} ${continuationText.trimStart()}`;
    }
  }

  return normalizeAssistantText(text);
}
