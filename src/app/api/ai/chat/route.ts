import { NextResponse } from "next/server";
import { isDbConfigured } from "@/backend/config/db";
import {
  buildSessionTitle,
  createAiChatSession,
  deleteAiChatSession,
  fetchAiChatSessionDetail,
  fetchAiChatSessions,
  fetchGardenDashboardContext,
  insertAiChatMessage,
  renameAiChatSession,
} from "@/backend/services/aiChat";
import { generateGardenAdvice, isGeminiConfigured } from "@/backend/services/gemini";
import { insertSystemLog } from "@/backend/services/queries";

export const dynamic = "force-dynamic";

type ChatPostBody = {
  userId?: string;
  gardenId?: string;
  sessionId?: string;
  message?: string;
  imageDataUrl?: string | null;
};

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const gardenId = searchParams.get("gardenId");
    const sessionId = searchParams.get("sessionId");

    if (!userId || !gardenId) {
      return NextResponse.json({ error: "userId and gardenId are required" }, { status: 400 });
    }

    const [sessions, dashboard, activeSession] = await Promise.all([
      fetchAiChatSessions(userId, gardenId),
      fetchGardenDashboardContext(gardenId),
      sessionId ? fetchAiChatSessionDetail(sessionId, userId) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      sessions,
      dashboard,
      activeSession,
      geminiConfigured: isGeminiConfigured(),
    });
  } catch (error) {
    console.error("[API GET /ai/chat]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as ChatPostBody;
    if (!body.userId || !body.gardenId || !body.message?.trim()) {
      return NextResponse.json({ error: "userId, gardenId and message are required" }, { status: 400 });
    }

    const dashboard = await fetchGardenDashboardContext(body.gardenId);
    if (!dashboard) {
      return NextResponse.json({ error: "Garden context not found" }, { status: 404 });
    }

    let sessionId = body.sessionId;
    if (!sessionId) {
      sessionId = await createAiChatSession(body.userId, body.gardenId, buildSessionTitle(body.message));
    }

    const existing = await fetchAiChatSessionDetail(sessionId, body.userId);
    if (!existing) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    if (existing.messageCount === 0) {
      await renameAiChatSession(sessionId, buildSessionTitle(body.message));
    }

    const userMessage = await insertAiChatMessage(sessionId, "user", body.message.trim(), body.imageDataUrl ?? null);

    const assistantText = await generateGardenAdvice({
      context: dashboard,
      history: existing.messages,
      message: body.message.trim(),
      imageDataUrl: body.imageDataUrl ?? null,
    });

    const assistantMessage = await insertAiChatMessage(sessionId, "assistant", assistantText);
    const nextSession = await fetchAiChatSessionDetail(sessionId, body.userId);

    await insertSystemLog(
      null,
      "system_event",
      "ai_chat_sessions",
      null,
      `AI chat tu van cho ${dashboard.gardenName}`,
      null,
      {
        gardenId: body.gardenId,
        sessionId,
        prompt: body.message.trim(),
      },
    );

    return NextResponse.json({
      session: nextSession,
      dashboard,
      userMessage,
      assistantMessage,
      geminiConfigured: true,
    });
  } catch (error) {
    console.error("[API POST /ai/chat]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");

    if (!userId || !sessionId) {
      return NextResponse.json({ error: "userId and sessionId are required" }, { status: 400 });
    }

    await deleteAiChatSession(sessionId, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API DELETE /ai/chat]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
