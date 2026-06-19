import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.teaType.count();
  if (count > 0) {
    console.log("Seed skipped — data already present.");
    return;
  }

  const teas = await prisma.$transaction([
    prisma.teaType.create({ data: { name: "Type A", desc: "Bold malty Assam", aroma: "Strong", texture: "Bold", flavor: "Malty", cost: 320, supplier: "Dibrugarh Estate" } }),
    prisma.teaType.create({ data: { name: "Type B", desc: "Floral high-grown", aroma: "Floral", texture: "Light", flavor: "Brisk", cost: 450, supplier: "Jorhat Gardens" } }),
    prisma.teaType.create({ data: { name: "Type C", desc: "Everyday CTC", aroma: "Mild", texture: "Granular", flavor: "Earthy", cost: 280, supplier: "Tinsukia Co-op" } }),
    prisma.teaType.create({ data: { name: "Type D", desc: "Second flush tippy", aroma: "Sweet", texture: "Wiry", flavor: "Honey", cost: 390, supplier: "Dibrugarh Estate" } }),
  ]);
  const [A, B, C, D] = teas;

  const customers = await prisma.$transaction([
    prisma.customer.create({ data: { business: "ABC Tea House", contact: "Rohan Mehta", phone: "+91 98765 43210", email: "rohan@abctea.in", gst: "27ABCDE1234F1Z5", address: "Pune, MH", pref: "Strong morning" } }),
    prisma.customer.create({ data: { business: "Himalaya Cafe", contact: "Sara Iyer", phone: "+91 91234 56780", email: "sara@himcafe.in", gst: "29HIMAL5678G1Z2", address: "Bengaluru, KA", pref: "Floral, light" } }),
  ]);
  const [abc] = customers;

  const breakfast = await prisma.blend.create({
    data: {
      type: "standard", name: "Premium Breakfast Blend", code: "STD-001",
      desc: "Strong morning blend, bold finish", price: 498, notes: "Flagship",
      items: { create: [{ teaId: A.id, ratio: 40 }, { teaId: B.id, ratio: 35 }, { teaId: D.id, ratio: 25 }] },
    },
  });

  await prisma.blend.create({
    data: {
      type: "standard", name: "Garden Afternoon", code: "STD-002",
      desc: "Light floral daytime cup", price: 430,
      items: { create: [{ teaId: B.id, ratio: 55 }, { teaId: C.id, ratio: 45 }] },
    },
  });

  await prisma.blend.create({
    data: {
      type: "customer", name: "ABC House Strong", price: 520,
      notes: "Customer wants stronger body", customerId: abc.id, baseId: breakfast.id,
      items: { create: [{ teaId: A.id, ratio: 50 }, { teaId: B.id, ratio: 20 }, { teaId: D.id, ratio: 30 }] },
    },
  });

  console.log("Seed complete.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
