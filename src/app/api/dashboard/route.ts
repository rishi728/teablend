import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [customers, teas, standard, customer, logs] = await Promise.all([
    prisma.customer.count({ where: { archived: false } }),
    prisma.teaType.count({ where: { archived: false, status: "active" } }),
    prisma.blend.count({ where: { archived: false, type: "standard" } }),
    prisma.blend.count({ where: { archived: false, type: "customer" } }),
    prisma.recipeLog.findMany({ orderBy: { productionDate: "desc" } }),
  ]);
  const volume = logs.reduce((s: number, l: any) => s + l.quantity, 0);
  const revenue = Math.round(logs.reduce((s: number, l: any) => s + l.quantity * l.priceSnapshot, 0) * 100) / 100;
  const counts: Record<string, number> = {};
  logs.forEach((l: any) => (counts[l.blendName] = (counts[l.blendName] || 0) + 1));
  const topBlend = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  return NextResponse.json({
    customers, teas, standard, customer, volume, revenue, topBlend,
    recent: logs.slice(0, 5),
  });
}
