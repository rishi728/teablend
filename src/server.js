import express from "express";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";
import path from "path";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "..", "public")));

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: e.message });
});

// ---------- health ----------
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ---------- TEA TYPES ----------
app.get("/api/teas", wrap(async (req, res) => {
  res.json(await prisma.teaType.findMany({ orderBy: { name: "asc" } }));
}));
app.post("/api/teas", wrap(async (req, res) => {
  res.json(await prisma.teaType.create({ data: clean(req.body, ["name","desc","aroma","texture","flavor","cost","supplier","status"]) }));
}));
app.put("/api/teas/:id", wrap(async (req, res) => {
  res.json(await prisma.teaType.update({ where: { id: req.params.id }, data: clean(req.body, ["name","desc","aroma","texture","flavor","cost","supplier","status"]) }));
}));
app.delete("/api/teas/:id", wrap(async (req, res) => {
  await prisma.teaType.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ---------- CUSTOMERS ----------
app.get("/api/customers", wrap(async (req, res) => {
  const customers = await prisma.customer.findMany({ orderBy: { business: "asc" } });
  const logs = await prisma.recipeLog.findMany();
  const enriched = customers.map((c) => {
    const cl = logs.filter((l) => l.customerName === c.business);
    return { ...c, orderCount: cl.length, revenue: cl.reduce((s, l) => s + l.qty * l.price, 0) };
  });
  res.json(enriched);
}));
app.post("/api/customers", wrap(async (req, res) => {
  res.json(await prisma.customer.create({ data: clean(req.body, ["business","contact","phone","email","gst","address","pref"]) }));
}));
app.put("/api/customers/:id", wrap(async (req, res) => {
  res.json(await prisma.customer.update({ where: { id: req.params.id }, data: clean(req.body, ["business","contact","phone","email","gst","address","pref"]) }));
}));
app.delete("/api/customers/:id", wrap(async (req, res) => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ---------- BLENDS (standard + customer) ----------
app.get("/api/blends", wrap(async (req, res) => {
  const where = req.query.type ? { type: req.query.type } : {};
  const blends = await prisma.blend.findMany({
    where, orderBy: { createdAt: "desc" },
    include: { items: { include: { tea: true } }, customer: true },
  });
  res.json(blends.map(withCost));
}));
app.get("/api/blends/:id", wrap(async (req, res) => {
  const b = await prisma.blend.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { tea: true } }, customer: true },
  });
  res.json(b ? withCost(b) : null);
}));
app.post("/api/blends", wrap(async (req, res) => {
  const { items = [], ...rest } = req.body;
  validateRatios(items);
  const b = await prisma.blend.create({
    data: {
      ...clean(rest, ["type","name","code","desc","price","notes","customerId","baseId"]),
      items: { create: items.map((i) => ({ teaId: i.teaId, ratio: Number(i.ratio) })) },
    },
    include: { items: { include: { tea: true } }, customer: true },
  });
  res.json(withCost(b));
}));
app.put("/api/blends/:id", wrap(async (req, res) => {
  const { items = [], ...rest } = req.body;
  validateRatios(items);
  await prisma.blendItem.deleteMany({ where: { blendId: req.params.id } });
  const b = await prisma.blend.update({
    where: { id: req.params.id },
    data: {
      ...clean(rest, ["type","name","code","desc","price","notes","customerId","baseId"]),
      items: { create: items.map((i) => ({ teaId: i.teaId, ratio: Number(i.ratio) })) },
    },
    include: { items: { include: { tea: true } }, customer: true },
  });
  res.json(withCost(b));
}));
app.delete("/api/blends/:id", wrap(async (req, res) => {
  await prisma.blend.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ---------- RECIPE LOGS ----------
app.get("/api/logs", wrap(async (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  let logs = await prisma.recipeLog.findMany({
    orderBy: { createdAt: "desc" }, include: { items: true },
  });
  if (q) logs = logs.filter((l) =>
    l.customerName.toLowerCase().includes(q) ||
    l.lot.toLowerCase().includes(q) ||
    l.blendName.toLowerCase().includes(q));
  res.json(logs);
}));
app.post("/api/logs", wrap(async (req, res) => {
  // snapshot the blend at production time — immutable
  const blend = await prisma.blend.findUnique({
    where: { id: req.body.blendId },
    include: { items: { include: { tea: true } }, customer: true },
  });
  if (!blend) return res.status(400).json({ error: "Blend not found" });

  const cost = blend.items.reduce((s, i) => s + i.tea.cost * (i.ratio / 100), 0);
  let customerName = "Walk-in / stock", customerId = null;
  if (req.body.customerId && req.body.customerId !== "walk-in") {
    const c = await prisma.customer.findUnique({ where: { id: req.body.customerId } });
    if (c) { customerName = c.business; customerId = c.id; }
  }
  const lot = req.body.lot || `LOT-${new Date().getFullYear()}-${String((await prisma.recipeLog.count()) + 1).padStart(5, "0")}`;

  const log = await prisma.recipeLog.create({
    data: {
      lot, blendId: blend.id, blendName: blend.name, blendType: blend.type,
      customerId, customerName,
      qty: Number(req.body.qty) || 0, price: Number(req.body.price) || 0,
      cost: Math.round(cost * 100) / 100, notes: req.body.notes || "",
      items: { create: blend.items.map((i) => ({ teaId: i.teaId, teaName: i.tea.name, ratio: i.ratio, teaCost: i.tea.cost })) },
    },
    include: { items: true },
  });
  res.json(log);
}));
app.delete("/api/logs/:id", wrap(async (req, res) => {
  await prisma.recipeLog.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ---------- DASHBOARD ----------
app.get("/api/stats", wrap(async (req, res) => {
  const [teas, std, cust, customers, logs] = await Promise.all([
    prisma.teaType.count({ where: { status: "active" } }),
    prisma.blend.count({ where: { type: "standard" } }),
    prisma.blend.count({ where: { type: "customer" } }),
    prisma.customer.count(),
    prisma.recipeLog.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const vol = logs.reduce((s, l) => s + l.qty, 0);
  const rev = logs.reduce((s, l) => s + l.qty * l.price, 0);
  const counts = {};
  logs.forEach((l) => { counts[l.blendName] = (counts[l.blendName] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  res.json({ teas, std, cust, customers, vol, rev, topBlend: top ? top[0] : "—", recent: logs.slice(0, 5) });
}));

// ---------- helpers ----------
function clean(body, allowed) {
  const out = {};
  for (const k of allowed) if (body[k] !== undefined) out[k] = k === "cost" || k === "price" ? Number(body[k]) || 0 : body[k];
  return out;
}
function withCost(b) {
  const cost = b.items.reduce((s, i) => s + (i.tea ? i.tea.cost * (i.ratio / 100) : 0), 0);
  return { ...b, cost: Math.round(cost * 100) / 100 };
}
function validateRatios(items) {
  if (!items.length) throw new Error("At least one tea type required");
  const total = items.reduce((s, i) => s + Number(i.ratio), 0);
  if (Math.abs(total - 100) > 0.01) throw new Error(`Ratios must total 100% (got ${total}%)`);
}

// SPA fallback
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "index.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Tea ERP running on :${PORT}`));
