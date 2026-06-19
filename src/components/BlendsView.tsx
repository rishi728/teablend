"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { blendCost, blendTotal, margin, money } from "@/lib/costing";

type Tea = { id: string; name: string; costPerKg: number; aroma?: string; flavor?: string; status: string };
type Item = { teaId: string; ratio: number | string };
type Blend = {
  id: string; name: string; code?: string; description?: string; notes?: string; price: number;
  type: string; customerId?: string; baseBlendId?: string;
  items: { teaId: string; ratio: number; tea: Tea }[]; customer?: { business: string } | null;
};
type Customer = { id: string; business: string };

export default function BlendsView({ type }: { type: "standard" | "customer" }) {
  const toast = useToast();
  const [blends, setBlends] = useState<Blend[]>([]);
  const [teas, setTeas] = useState<Tea[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [standards, setStandards] = useState<Blend[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Blend | "new" | null>(null);
  const [worker, setWorker] = useState<Blend | null>(null);
  const [producing, setProducing] = useState<Blend | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [b, t, c, s] = await Promise.all([
      fetch(`/api/blends?type=${type}`).then((r) => r.json()),
      fetch("/api/teas").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      type === "customer" ? fetch("/api/blends?type=standard").then((r) => r.json()) : Promise.resolve([]),
    ]);
    setBlends(b); setTeas(t); setCustomers(c); setStandards(s); setLoading(false);
  }, [type]);
  useEffect(() => { refresh(); }, [refresh]);

  const del = async (id: string) => {
    if (!confirm("Delete this blend?")) return;
    await fetch(`/api/blends/${id}`, { method: "DELETE" });
    toast("Deleted"); refresh();
  };

  if (loading) return <div className="spin">Loading…</div>;

  const title = type === "standard" ? "Standard blends" : "Customer blends";
  const sub = type === "standard"
    ? "House recipes — workers reference these to produce"
    : "Customised recipes linked to a specific customer";

  return (
    <>
      <div className="head">
        <div><h1>{title}</h1><p>{sub}</p></div>
        <button className="btn" onClick={() => setEditor("new")}>+ New {type} blend</button>
      </div>
      {blends.length === 0 ? (
        <div className="card empty"><h3>No blends yet</h3><p>Create your first recipe.</p></div>
      ) : (
        <div className="grid cols-2">
          {blends.map((b) => {
            const cost = blendCost(b.items.map((i) => ({ ratio: i.ratio, costPerKg: i.tea.costPerKg })));
            const ratios = b.items.map((i) => i.tea.name.replace("Type ", "T-") + " " + i.ratio + "%").join(" · ");
            return (
              <div className="card" key={b.id}>
                <div className="flex between">
                  <strong>{b.name}</strong>
                  {b.code && <span className="pill gray mono">{b.code}</span>}
                </div>
                {b.customer && <p style={{ color: "var(--ink2)", fontSize: 13, marginTop: 2 }}>👤 {b.customer.business}</p>}
                <p style={{ color: "var(--ink2)", fontSize: 13, margin: "6px 0" }}>{b.description}</p>
                <p className="mono" style={{ margin: "8px 0" }}>{ratios}</p>
                <div className="flex between" style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 8, fontSize: 14 }}>
                  <span>Cost <strong>{money(cost)}</strong>/kg</span>
                  {b.price > 0 && <span>Price <strong>{money(b.price)}</strong> · {margin(cost, b.price)}%</span>}
                </div>
                <div className="flex" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
                  <button className="btn sm" onClick={() => setProducing(b)}>▶ Produce</button>
                  <button className="btn sm ghost" onClick={() => setEditor(b)}>Edit</button>
                  <button className="btn sm ghost" onClick={() => setWorker(b)}>👷 Worker view</button>
                  <button className="btn sm danger" style={{ marginLeft: "auto" }} onClick={() => del(b.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editor && (
        <BlendEditor
          type={type} blend={editor === "new" ? null : editor} teas={teas}
          customers={customers} standards={standards}
          onClose={() => setEditor(null)}
          onSaved={() => { setEditor(null); toast("Blend saved"); refresh(); }}
        />
      )}
      {worker && <WorkerView blend={worker} onClose={() => setWorker(null)} onProduce={() => { setProducing(worker); setWorker(null); }} />}
      {producing && (
        <ProduceModal
          blend={producing} customers={customers}
          onClose={() => setProducing(null)}
          onSaved={(lot: string) => { setProducing(null); toast("Recipe log saved: " + lot); }}
        />
      )}
    </>
  );
}

function BlendEditor({ type, blend, teas, customers, standards, onClose, onSaved }: any) {
  const active = teas.filter((t: Tea) => t.status === "active");
  const [name, setName] = useState(blend?.name ?? "");
  const [code, setCode] = useState(blend?.code ?? "");
  const [desc, setDesc] = useState(blend?.description ?? "");
  const [notes, setNotes] = useState(blend?.notes ?? "");
  const [price, setPrice] = useState(blend?.price ?? "");
  const [customerId, setCustomerId] = useState(blend?.customerId ?? customers[0]?.id ?? "");
  const [baseBlendId, setBaseBlendId] = useState(blend?.baseBlendId ?? "");
  const [items, setItems] = useState<Item[]>(
    blend?.items?.map((i: any) => ({ teaId: i.teaId, ratio: i.ratio })) ?? [{ teaId: "", ratio: "" }]
  );

  const costItems = items.filter((i) => i.teaId).map((i) => ({
    ratio: Number(i.ratio) || 0,
    costPerKg: active.find((t: Tea) => t.id === i.teaId)?.costPerKg ?? 0,
  }));
  const total = blendTotal(items.map((i) => ({ ratio: Number(i.ratio) || 0 })));
  const cost = blendCost(costItems);
  const ok = items.length > 0 && items.every((i) => i.teaId) && Math.abs(total - 100) < 0.01;

  const save = async () => {
    if (!name) return alert("Blend name required");
    if (!ok) return alert("Ratios must total 100% with a tea on each row");
    const body: any = { name, code, description: desc, notes, price: Number(price) || 0, type,
      items: items.filter((i) => i.teaId).map((i) => ({ teaId: i.teaId, ratio: Number(i.ratio) || 0 })) };
    if (type === "customer") { body.customerId = customerId; body.baseBlendId = baseBlendId || null; }
    const res = await fetch(blend ? `/api/blends/${blend.id}` : "/api/blends", {
      method: blend ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) onSaved(); else alert("Save failed");
  };

  return (
    <Overlay onClose={onClose}>
      <button className="x" onClick={onClose}>×</button>
      <h2>{blend ? "Edit" : "New"} {type} blend</h2>
      <p className="sub">{type === "standard" ? "House recipe available to all workers" : "Customised recipe linked to a customer"}</p>
      {type === "customer" && (
        <div className="grid cols-2">
          <div><label>Customer</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.business}</option>)}
            </select></div>
          <div><label>Based on (optional)</label>
            <select value={baseBlendId} onChange={(e) => setBaseBlendId(e.target.value)}>
              <option value="">— none —</option>
              {standards.map((s: Blend) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
        </div>
      )}
      <div className="grid cols-2" style={{ marginTop: 14 }}>
        <div><label>Blend name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label>Code</label><input value={code} onChange={(e) => setCode(e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 14 }}><label>Description</label><input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
      <div className="section-t">Recipe ratios</div>
      {items.map((it, ix) => (
        <div className="ratio-row" key={ix}>
          <select value={it.teaId} onChange={(e) => setItems(items.map((x, i) => i === ix ? { ...x, teaId: e.target.value } : x))}>
            <option value="">Select tea type</option>
            {active.map((t: Tea) => <option key={t.id} value={t.id}>{t.name} — {money(t.costPerKg)}/kg</option>)}
          </select>
          <input type="number" min="0" step="0.1" placeholder="%" value={it.ratio}
            onChange={(e) => setItems(items.map((x, i) => i === ix ? { ...x, ratio: e.target.value } : x))} />
          <button className="btn sm danger" onClick={() => setItems(items.filter((_, i) => i !== ix))}>×</button>
        </div>
      ))}
      <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => setItems([...items, { teaId: "", ratio: "" }])}>+ Add tea type</button>
      <div style={{ marginTop: 14 }}>
        <div className="bar"><i className={total > 100 ? "over" : ""} style={{ width: Math.min(total, 100) + "%" }} /></div>
        <div className="flex between" style={{ fontSize: 14 }}>
          <span>Total: <strong style={{ color: ok ? "var(--green)" : "var(--danger)" }}>{total}%</strong> {ok ? "✓ valid" : `(${Math.round((100 - total) * 100) / 100}% left)`}</span>
          <span>Blend cost: <strong>{money(cost)}</strong>/kg{Number(price) > 0 && ` · margin ${margin(cost, Number(price))}%`}</span>
        </div>
      </div>
      <div className="grid cols-2" style={{ marginTop: 14 }}>
        <div><label>Selling price (₹/kg)</label><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        <div><label>Notes</label><input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
      <div className="flex" style={{ marginTop: 22, justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={save}>Save blend</button>
      </div>
    </Overlay>
  );
}

function WorkerView({ blend, onClose, onProduce }: any) {
  const [qty, setQty] = useState(100);
  const cost = blendCost(blend.items.map((i: any) => ({ ratio: i.ratio, costPerKg: i.tea.costPerKg })));
  return (
    <Overlay onClose={onClose}>
      <button className="x" onClick={onClose}>×</button>
      <h2>👷 Worker production card</h2>
      <p className="sub">{blend.name}{blend.code && " · " + blend.code}</p>
      <div className="prod-card" style={{ marginBottom: 16 }}>
        <strong>How to make this blend</strong>
        <p style={{ fontSize: 14, marginTop: 6 }}>Mix the tea types below in the exact percentages shown.</p>
      </div>
      <table>
        <thead><tr><th>Tea type</th><th>Ratio</th><th>Cost/kg</th><th>Contribution</th></tr></thead>
        <tbody>
          {blend.items.map((i: any) => (
            <tr key={i.teaId}>
              <td><strong>{i.tea.name}</strong><br /><span style={{ fontSize: 12, color: "var(--ink2)" }}>{i.tea.aroma} · {i.tea.flavor}</span></td>
              <td className="mono">{i.ratio}%</td><td className="mono">{money(i.tea.costPerKg)}</td>
              <td className="mono">{money(i.tea.costPerKg * i.ratio / 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex between" style={{ marginTop: 16, paddingTop: 12, borderTop: "2px solid var(--line)" }}>
        <strong>Blend cost</strong><strong className="mono">{money(cost)}/kg</strong>
      </div>
      <div style={{ marginTop: 12 }}><label>Scale to batch size (kg)</label>
        <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} /></div>
      <div className="prod-card" style={{ marginTop: 12 }}>
        <strong>Weigh out for {qty} kg:</strong>
        <table style={{ marginTop: 6 }}>
          <tbody>
            {blend.items.map((i: any) => (
              <tr key={i.teaId}><td>{i.tea.name}</td>
                <td className="mono" style={{ textAlign: "right" }}><strong>{Math.round(qty * i.ratio / 100 * 100) / 100} kg</strong></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex" style={{ marginTop: 20, justifyContent: "flex-end", gap: 8 }}>
        <button className="btn ghost" onClick={() => window.print()}>🖨 Print</button>
        <button className="btn" onClick={onProduce}>▶ Log production</button>
      </div>
    </Overlay>
  );
}

function ProduceModal({ blend, customers, onClose, onSaved }: any) {
  const [customerId, setCustomerId] = useState(blend.customerId ?? "walk-in");
  const [qty, setQty] = useState(250);
  const [price, setPrice] = useState(blend.price || "");
  const [notes, setNotes] = useState("");
  const save = async () => {
    const res = await fetch("/api/logs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blendId: blend.id, customerId, quantity: qty, price: Number(price) || 0, notes }),
    });
    if (res.ok) { const l = await res.json(); onSaved(l.lot); } else alert("Save failed");
  };
  return (
    <Overlay onClose={onClose}>
      <button className="x" onClick={onClose}>×</button>
      <h2>Log production run</h2>
      <p className="sub">Creates an immutable recipe snapshot — costs &amp; ratios frozen at production time</p>
      <div className="grid cols-2">
        <div><label>Customer</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="walk-in">Walk-in / stock</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.business}</option>)}
          </select></div>
        <div><label>Quantity (kg)</label><input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} /></div>
      </div>
      <div className="section-t">Material breakdown</div>
      <table>
        <thead><tr><th>Tea type</th><th>Ratio</th><th>Required</th></tr></thead>
        <tbody>
          {blend.items.map((i: any) => (
            <tr key={i.teaId}><td>{i.tea.name}</td><td className="mono">{i.ratio}%</td>
              <td className="mono"><strong>{Math.round(qty * i.ratio / 100 * 100) / 100} kg</strong></td></tr>
          ))}
        </tbody>
      </table>
      <div className="grid cols-2" style={{ marginTop: 14 }}>
        <div><label>Selling price (₹/kg)</label><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        <div><label>Notes</label><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. stronger aroma" /></div>
      </div>
      <div className="flex" style={{ marginTop: 22, justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={save}>Save recipe log</button>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="modal">{children}</div></div>;
}
