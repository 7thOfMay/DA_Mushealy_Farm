import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isDbConfigured } from "@/lib/db";
import { fetchGardens, fetchGardensByFarmId, insertGarden, updateGarden, deleteGarden } from "@/lib/api/queries";

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get("farmId");

  if (farmId) {
    const numId = parseInt(farmId.replace(/^f/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid farmId" }, { status: 400 });
    }
    const gardens = await fetchGardensByFarmId(numId);
    return NextResponse.json(gardens);
  }

  const gardens = await fetchGardens();
  return NextResponse.json(gardens);
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json() as {
      farmId?: string; name?: string; plantTypeId?: number | null;
      area?: number | null; location?: string | null;
    };
    if (!body.farmId || !body.name?.trim()) {
      return NextResponse.json({ error: "farmId and name are required" }, { status: 400 });
    }
    const numFarmId = parseInt(body.farmId.replace(/^f/, ""), 10);
    if (isNaN(numFarmId)) {
      return NextResponse.json({ error: "Invalid farmId" }, { status: 400 });
    }
    const gardenId = await insertGarden(
      numFarmId, body.name.trim(),
      body.plantTypeId ?? null, body.area ?? null, body.location ?? null,
    );
    return NextResponse.json({ ok: true, gardenId: `g${gardenId}` });
  } catch (err) {
    console.error("[API POST /gardens]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json() as {
      gardenId?: string; name?: string; plantTypeId?: number | null;
      area?: number | null; location?: string | null; status?: string;
    };
    if (!body.gardenId) {
      return NextResponse.json({ error: "gardenId is required" }, { status: 400 });
    }
    const numId = parseInt(body.gardenId.replace(/^g/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid gardenId" }, { status: 400 });
    }
    await updateGarden(numId, {
      zone_name: body.name, plant_type_id: body.plantTypeId,
      area_m2: body.area, location_desc: body.location, status: body.status,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API PUT /gardens]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const gardenId = searchParams.get("gardenId");
    if (!gardenId) {
      return NextResponse.json({ error: "gardenId is required" }, { status: 400 });
    }
    const numId = parseInt(gardenId.replace(/^g/, ""), 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid gardenId" }, { status: 400 });
    }
    await deleteGarden(numId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API DELETE /gardens]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
