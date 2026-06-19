import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const tea = await prisma.teaType.update({
    where: { id },
    data: {
      name: b.name,
      description: b.description ?? null,
      aroma: b.aroma ?? null,
      texture: b.texture ?? null,
      flavor: b.flavor ?? null,
      costPerKg: Number(b.costPerKg) || 0,
      supplier: b.supplier ?? null,
      status: b.status ?? "active",
    },
  });
  return NextResponse.json(tea);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.teaType.update({ where: { id }, data: { archived: true } });
  return NextResponse.json({ ok: true });
}
