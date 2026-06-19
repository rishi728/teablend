import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const blend = await prisma.blend.findUnique({
    where: { id },
    include: { items: { include: { tea: true } }, customer: true },
  });
  return NextResponse.json(blend);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const items = (b.items ?? []).filter((i: any) => i.teaId);
  // replace items atomically
  await prisma.blendItem.deleteMany({ where: { blendId: id } });
  const blend = await prisma.blend.update({
    where: { id },
    data: {
      name: b.name,
      code: b.code ?? null,
      description: b.description ?? null,
      notes: b.notes ?? null,
      price: Number(b.price) || 0,
      customerId: b.customerId || null,
      baseBlendId: b.baseBlendId || null,
      items: { create: items.map((i: any) => ({ teaId: i.teaId, ratio: Number(i.ratio) || 0 })) },
    },
    include: { items: { include: { tea: true } }, customer: true },
  });
  return NextResponse.json(blend);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.blend.update({ where: { id }, data: { archived: true } });
  return NextResponse.json({ ok: true });
}
