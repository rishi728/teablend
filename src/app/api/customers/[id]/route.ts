import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const c = await prisma.customer.update({
    where: { id },
    data: {
      business: b.business, contact: b.contact ?? null, phone: b.phone ?? null,
      email: b.email ?? null, gst: b.gst ?? null, address: b.address ?? null, pref: b.pref ?? null,
    },
  });
  return NextResponse.json(c);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.customer.update({ where: { id }, data: { archived: true } });
  return NextResponse.json({ ok: true });
}
