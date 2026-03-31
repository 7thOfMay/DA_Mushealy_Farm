import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/lib/db";
import { fetchAlertRules, insertAlertRule, updateAlertRule, deleteAlertRule } from "@/lib/api/queries";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const rules = await fetchAlertRules();
    return NextResponse.json(rules);
  } catch (err) {
    console.error("[API GET /alert-rules]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json() as {
      name?: string; gardenId?: string | null; severity?: string;
      messageTemplate?: string; createdBy?: number | null;
      conditions?: Array<{ metricType: string; operator: string; value1: number; value2?: number | null }>;
    };
    if (!body.name?.trim() || !body.severity) {
      return NextResponse.json({ error: "name and severity are required" }, { status: 400 });
    }
    let numZoneId: number | null = null;
    if (body.gardenId) {
      numZoneId = parseInt(body.gardenId.replace(/^g/, ""), 10);
      if (isNaN(numZoneId)) {
        return NextResponse.json({ error: "Invalid gardenId" }, { status: 400 });
      }
    }
    const ruleId = await insertAlertRule(
      body.name.trim(), numZoneId, body.severity,
      body.messageTemplate || "", body.createdBy ?? null, body.conditions || [],
    );
    return NextResponse.json({ ok: true, ruleId: `ar${ruleId}` });
  } catch (err) {
    console.error("[API POST /alert-rules]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json() as {
      ruleId?: string; name?: string; severity?: string;
      messageTemplate?: string; isActive?: boolean;
    };
    if (!body.ruleId) {
      return NextResponse.json({ error: "ruleId is required" }, { status: 400 });
    }
    const numId = parseInt(body.ruleId.replace(/^ar/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid ruleId" }, { status: 400 });
    }
    await updateAlertRule(numId, {
      rule_name: body.name, severity: body.severity,
      message_template: body.messageTemplate, is_active: body.isActive,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API PUT /alert-rules]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");
    if (!ruleId) {
      return NextResponse.json({ error: "ruleId is required" }, { status: 400 });
    }
    const numId = parseInt(ruleId.replace(/^ar/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid ruleId" }, { status: 400 });
    }
    await deleteAlertRule(numId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API DELETE /alert-rules]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
