import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.teaType.count();
  if (existing > 0) { console.log("Already seeded, skipping."); return; }

  const [A, B, C, D] = await Promise.all([
    prisma.teaType.create({ data: { name: "Type A", description: "Bold malty Assam", aroma: "Strong", texture: "Bold", flavor: "Malty", costPerKg: 320, supplier: "Dibrugarh Estate" } }),
    prisma.teaType.create({ data: { name: "Type B", description: "Floral high-grown", aroma: "Floral", texture: "Light", flavor: "Brisk", costPerKg: 450, supplier: "Jorhat Gardens" } }),
    prisma.teaType.create({ data: { name: "Type C", description: "Everyday CTC", aroma: "Mild", texture: "Granular", flavor: "Earthy", costPerKg: 280, supplier: "Tinsukia Co-op" } }),
    prisma.teaType.create({ data: { name: "Type D", description: "Second flush tippy", aroma: "Sweet", texture: "Wiry", flavor: "Honey", costPerKg: 390, supplier: "Dibrugarh Estate" } }),
  ]);

  const abc = await prisma.customer.create({ data: { business: "ABC Tea House", contact: "Rohan Mehta", phone: "+91 98765 43210", email: "rohan@abctea.in", gst: "27ABCDE1234F1Z5", address: "Pune, MH", pref: "Strong morning" } });
  await prisma.customer.create({ data: { business: "Himalaya Cafe", contact: "Sara Iyer", phone: "+91 91234 56780", email: "sara@himcafe.in", gst: "29HIMAL5678G1Z2", address: "Bengaluru, KA", pref: "Floral, light" } });

  const breakfast = await prisma.blend.create({
    data: { name: "Premium Breakfast Blend", code: "STD-001", description: "Strong morning blend, bold finish", price: 498, type: "standard", notes: "Flagship",
      items: { create: [{ teaId: A.id, ratio: 40 }, { teaId: B.id, ratio: 35 }, { teaId: D.id, ratio: 25 }] } },
  });
  await prisma.blend.create({
    data: { name: "Garden Afternoon", code: "STD-002", description: "Light floral daytime cup", price: 430, type: "standard",
      items: { create: [{ teaId: B.id, ratio: 55 }, { teaId: C.id, ratio: 45 }] } },
  });
  await prisma.blend.create({
    data: { name: "ABC House Strong", description: "Customer wants stronger body", price: 520, type: "customer", customerId: abc.id, baseBlendId: breakfast.id,
      items: { create: [{ teaId: A.id, ratio: 50 }, { teaId: B.id, ratio: 20 }, { teaId: D.id, ratio: 30 }] } },
  });

  console.log("Seed complete.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
