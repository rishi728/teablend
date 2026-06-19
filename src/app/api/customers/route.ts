import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const customers = await prisma.customer.findMany({
    where: { archived: false },
    include: { recipeLogs: { select: { quantity: true, priceSnapshot: true } } },
    orderBy: { createdAt: "asc" },
  });
  const withStats = customers.map((c: any) => ({
    ...c,
    orderCount: c.recipeLogs.length,
    revenue: Math.round(c.recipeLogs.reduce((s: number, l: any) => s + l.quantity * l.priceSnapshot, 0) * 100) / 100,
  }));
  return NextResponse.json(withStats);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.business) return NextResponse.json({ error: "Business name required" }, { status: 400 });
  const c = await prisma.customer.create({
    data: {
      business: b.business, contact: b.contact ?? null, phone: b.phone ?? null,
      email: b.email ?? null, gst: b.gst ?? null, address: b.address ?? null, pref: b.pref ?? null,
    },
  });
  return NextResponse.json(c, { status: 201 });
}
