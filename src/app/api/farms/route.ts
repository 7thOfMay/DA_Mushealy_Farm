import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/backend/config/db";
import { fetchFarms, insertFarm, updateFarm, deleteFarm } from "@/backend/services/queries";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const farms = await fetchFarms();
    return NextResponse.json(farms);
  } catch (err) {
    console.error("[API GET /farms]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json() as { name?: string; location?: string; ownerUserId?: number };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Farm name is required" }, { status: 400 });
    }

    const farmId = await insertFarm(
      body.name.trim(),
      body.location?.trim() || null,
      body.ownerUserId ?? null,
    );

    return NextResponse.json({ ok: true, farmId: `f${farmId}` });
  } catch (err) {
    console.error("[API POST /farms]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json() as {
      farmId?: string; name?: string; location?: string; status?: string;
    };
    if (!body.farmId) {
      return NextResponse.json({ error: "farmId is required" }, { status: 400 });
    }
    const numId = parseInt(body.farmId.replace(/^f/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid farmId" }, { status: 400 });
    }
    await updateFarm(numId, {
      farm_name: body.name, location_desc: body.location, status: body.status,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API PUT /farms]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get("farmId");
    if (!farmId) {
      return NextResponse.json({ error: "farmId is required" }, { status: 400 });
    }
    const numId = parseInt(farmId.replace(/^f/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid farmId" }, { status: 400 });
    }
    await deleteFarm(numId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API DELETE /farms]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
