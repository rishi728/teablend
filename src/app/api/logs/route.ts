import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const where = q
    ? {
        OR: [
          { customerName: { contains: q, mode: "insensitive" as const } },
          { lot: { contains: q, mode: "insensitive" as const } },
          { blendName: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const logs = await prisma.recipeLog.findMany({
    where,
    include: { items: true },
    orderBy: { productionDate: "desc" },
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.blendId) return NextResponse.json({ error: "Blend required" }, { status: 400 });

  const blend = await prisma.blend.findUnique({
    where: { id: b.blendId },
    include: { items: { include: { tea: true } }, customer: true },
  });
  if (!blend) return NextResponse.json({ error: "Blend not found" }, { status: 404 });

  // Auto lot number: LOT-YYYY-00001
  const year = new Date().getFullYear();
  const count = await prisma.recipeLog.count();
  const lot = b.lot?.trim() || `LOT-${year}-${String(count + 1).padStart(5, "0")}`;

  // Immutable snapshot of ratios + tea costs at production time
  const cost =
    Math.round(blend.items.reduce((s: number, i: any) => s + i.tea.costPerKg * (i.ratio / 100), 0) * 100) / 100;

  let customerName = "Walk-in / stock";
  let customerId: string | null = null;
  if (b.customerId && b.customerId !== "walk-in") {
    const c = await prisma.customer.findUnique({ where: { id: b.customerId } });
    if (c) { customerName = c.business; customerId = c.id; }
  }

  const log = await prisma.recipeLog.create({
    data: {
      lot,
      batch: b.batch ?? null,
      blendId: blend.id,
      blendName: blend.name,
      blendType: blend.type,
      customerId,
      customerName,
      quantity: Number(b.quantity) || 0,
      costSnapshot: cost,
      priceSnapshot: Number(b.price) || blend.price,
      notes: b.notes ?? null,
      items: {
        create: blend.items.map((i: any) => ({
          teaId: i.teaId,
          teaName: i.tea.name,
          ratio: i.ratio,
          teaCostSnapshot: i.tea.costPerKg,
        })),
      },
    },
    include: { items: true },
  });
  return NextResponse.json(log, { status: 201 });
}
