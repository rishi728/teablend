import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const teas = await prisma.teaType.findMany({
    where: { archived: false },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(teas);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const tea = await prisma.teaType.create({
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
  return NextResponse.json(tea, { status: 201 });
}
