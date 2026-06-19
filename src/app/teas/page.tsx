"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { money } from "@/lib/costing";

type Tea = { id: string; name: string; description?: string; aroma?: string; texture?: string; flavor?: string; costPerKg: number; supplier?: string; status: string };

export default function TeasPage() {
  const toast = useToast();
  const [teas, setTeas] = useState<Tea[]>([]);
  const [edit, setEdit] = useState<Tea | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => { setLoading(true); fetch("/api/teas").then((r) => r.json()).then((d) => { setTeas(d); setLoading(false); }); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  if (loading) return <div className="spin">Loading…</div>;
  return (
    <>
      <div className="head"><div><h1>Tea types</h1><p>Raw materials sourced from Assam</p></div>
        <button className="btn" onClick={() => setEdit("new")}>+ Add tea type</button></div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Profile</th><th>Supplier</th><th>Cost/kg</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {teas.map((t) => (
              <tr key={t.id}>
                <td><strong>{t.name}</strong><br /><span style={{ color: "var(--ink2)", fontSize: 13 }}>{t.description}</span></td>
                <td style={{ fontSize: 13, color: "var(--ink2)" }}>{[t.aroma, t.texture, t.flavor].filter(Boolean).join(" · ")}</td>
                <td>{t.supplier || "—"}</td><td className="mono">{money(t.costPerKg)}</td>
                <td><span className={"pill " + (t.status === "active" ? "green" : "gray")}>{t.status}</span></td>
                <td><button className="btn sm ghost" onClick={() => setEdit(t)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <TeaEditor tea={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); toast("Tea type saved"); refresh(); }} />}
    </>
  );
}

function TeaEditor({ tea, onClose, onSaved }: any) {
  const [f, setF] = useState<any>(tea ?? { name: "", description: "", aroma: "", texture: "", flavor: "", costPerKg: "", supplier: "", status: "active" });
  const up = (k: string, v: any) => setF({ ...f, [k]: v });
  const save = async () => {
    if (!f.name) return alert("Name required");
    const res = await fetch(tea ? `/api/teas/${tea.id}` : "/api/teas", { method: tea ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (res.ok) onSaved(); else alert("Save failed");
  };
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="modal">
      <button className="x" onClick={onClose}>×</button><h2>{tea ? "Edit" : "Add"} tea type</h2><p className="sub">Material used in blends</p>
      <div className="grid cols-2"><div><label>Name</label><input value={f.name} onChange={(e) => up("name", e.target.value)} /></div>
        <div><label>Cost per kg (₹)</label><input type="number" value={f.costPerKg} onChange={(e) => up("costPerKg", e.target.value)} /></div></div>
      <div style={{ marginTop: 14 }}><label>Description</label><input value={f.description} onChange={(e) => up("description", e.target.value)} /></div>
      <div className="grid cols-3" style={{ marginTop: 14 }}>
        <div><label>Aroma</label><input value={f.aroma} onChange={(e) => up("aroma", e.target.value)} /></div>
        <div><label>Texture</label><input value={f.texture} onChange={(e) => up("texture", e.target.value)} /></div>
        <div><label>Flavor</label><input value={f.flavor} onChange={(e) => up("flavor", e.target.value)} /></div></div>
      <div className="grid cols-2" style={{ marginTop: 14 }}>
        <div><label>Supplier</label><input value={f.supplier} onChange={(e) => up("supplier", e.target.value)} /></div>
        <div><label>Status</label><select value={f.status} onChange={(e) => up("status", e.target.value)}><option value="active">active</option><option value="inactive">inactive</option></select></div></div>
      <div className="flex" style={{ marginTop: 22, justifyContent: "flex-end" }}><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" onClick={save}>Save</button></div>
    </div></div>
  );
}
