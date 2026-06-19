"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { money } from "@/lib/costing";

type Customer = { id: string; business: string; contact?: string; phone?: string; email?: string; gst?: string; address?: string; pref?: string; orderCount: number; revenue: number };

export default function CustomersPage() {
  const toast = useToast();
  const [cs, setCs] = useState<Customer[]>([]);
  const [edit, setEdit] = useState<Customer | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => { setLoading(true); fetch("/api/customers").then((r) => r.json()).then((d) => { setCs(d); setLoading(false); }); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  if (loading) return <div className="spin">Loading…</div>;
  return (
    <>
      <div className="head"><div><h1>Customers</h1><p>Your CRM</p></div><button className="btn" onClick={() => setEdit("new")}>+ Add customer</button></div>
      <div className="grid cols-2">
        {cs.map((c) => (
          <div className="card" key={c.id}>
            <div className="flex between"><strong>{c.business}</strong><button className="btn sm ghost" onClick={() => setEdit(c)}>Edit</button></div>
            <p style={{ color: "var(--ink2)", fontSize: 13, margin: "4px 0" }}>{c.contact} · {c.phone}</p>
            <p style={{ color: "var(--ink2)", fontSize: 13 }}>{c.email}</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>GST: <span className="mono">{c.gst || "—"}</span></p>
            <p style={{ fontSize: 13, color: "var(--ink2)" }}>📍 {c.address || "—"}</p>
            <div className="flex between" style={{ borderTop: "1px solid var(--line)", marginTop: 10, paddingTop: 10, fontSize: 14 }}>
              <span>{c.orderCount} orders</span><span>Revenue <strong>{money(c.revenue)}</strong></span></div>
          </div>
        ))}
      </div>
      {edit && <CustEditor cust={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); toast("Customer saved"); refresh(); }} />}
    </>
  );
}

function CustEditor({ cust, onClose, onSaved }: any) {
  const [f, setF] = useState<any>(cust ?? { business: "", contact: "", phone: "", email: "", gst: "", address: "", pref: "" });
  const up = (k: string, v: any) => setF({ ...f, [k]: v });
  const save = async () => {
    if (!f.business) return alert("Business name required");
    const res = await fetch(cust ? `/api/customers/${cust.id}` : "/api/customers", { method: cust ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (res.ok) onSaved(); else alert("Save failed");
  };
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="modal">
      <button className="x" onClick={onClose}>×</button><h2>{cust ? "Edit" : "Add"} customer</h2><p className="sub">CRM record</p>
      <div className="grid cols-2"><div><label>Business name</label><input value={f.business} onChange={(e) => up("business", e.target.value)} /></div>
        <div><label>Contact name</label><input value={f.contact} onChange={(e) => up("contact", e.target.value)} /></div></div>
      <div className="grid cols-2" style={{ marginTop: 14 }}><div><label>Phone</label><input value={f.phone} onChange={(e) => up("phone", e.target.value)} /></div>
        <div><label>Email</label><input value={f.email} onChange={(e) => up("email", e.target.value)} /></div></div>
      <div className="grid cols-2" style={{ marginTop: 14 }}><div><label>GST number</label><input value={f.gst} onChange={(e) => up("gst", e.target.value)} /></div>
        <div><label>Preference</label><input value={f.pref} onChange={(e) => up("pref", e.target.value)} /></div></div>
      <div style={{ marginTop: 14 }}><label>Address</label><input value={f.address} onChange={(e) => up("address", e.target.value)} /></div>
      <div className="flex" style={{ marginTop: 22, justifyContent: "flex-end" }}><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" onClick={save}>Save</button></div>
    </div></div>
  );
}
