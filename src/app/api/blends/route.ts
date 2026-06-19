import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? undefined;
  const blends = await prisma.blend.findMany({
    where: { archived: false, ...(type ? { type } : {}) },
    include: { items: { include: { tea: true } }, customer: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(blends);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "Blend name required" }, { status: 400 });
  const items = (b.items ?? []).filter((i: any) => i.teaId);
  const blend = await prisma.blend.create({
    data: {
      name: b.name,
      code: b.code ?? null,
      description: b.description ?? null,
      notes: b.notes ?? null,
      price: Number(b.price) || 0,
      type: b.type ?? "standard",
      customerId: b.customerId || null,
      baseBlendId: b.baseBlendId || null,
      items: { create: items.map((i: any) => ({ teaId: i.teaId, ratio: Number(i.ratio) || 0 })) },
    },
    include: { items: { include: { tea: true } }, customer: true },
  });
  return NextResponse.json(blend, { status: 201 });
}
