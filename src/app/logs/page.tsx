"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { margin, money } from "@/lib/costing";

type Log = { id: string; lot: string; blendName: string; blendType: string; customerName: string; quantity: number; priceSnapshot: number; costSnapshot: number; notes?: string; productionDate: string; items: { teaName: string; ratio: number }[] };

export default function LogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<Log[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback((query = "") => {
    setLoading(true);
    fetch("/api/logs?q=" + encodeURIComponent(query)).then((r) => r.json()).then((d) => { setLogs(d); setLoading(false); });
  }, []);
  useEffect(() => { const t = setTimeout(() => refresh(q), 250); return () => clearTimeout(t); }, [q, refresh]);

  const del = async (id: string) => { if (!confirm("Delete this log?")) return; await fetch(`/api/logs/${id}`, { method: "DELETE" }); toast("Deleted"); refresh(q); };

  return (
    <>
      <div className="head"><div><h1>Recipe logs</h1><p>Immutable production history — search by customer, lot, or blend</p></div></div>
      <input placeholder="🔍 Search customer, lot number, or blend…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 16 }} />
      {loading ? <div className="spin">Loading…</div> : logs.length === 0 ? (
        <div className="card empty"><h3>No recipe logs</h3><p>Produce a blend from the Standard or Customer blends tab.</p></div>
      ) : logs.map((l) => {
        const ratios = l.items.map((r) => r.teaName.replace("Type ", "T-") + " " + r.ratio + "%").join(" · ");
        return (
          <div className="card" key={l.id} style={{ marginBottom: 12 }}>
            <div className="flex between">
              <div><strong>{l.blendName}</strong> <span className={"pill " + (l.blendType === "customer" ? "amber" : "green")}>{l.blendType}</span></div>
              <span className="pill gray mono">{l.lot}</span>
            </div>
            <p style={{ color: "var(--ink2)", fontSize: 13, margin: "6px 0" }}>👤 {l.customerName} · {l.quantity} kg · {new Date(l.productionDate).toLocaleString()}</p>
            <p className="mono" style={{ margin: "6px 0" }}>{ratios}</p>
            <div className="flex between" style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 8, fontSize: 14 }}>
              <span>Cost <strong>{money(l.costSnapshot)}</strong>/kg {l.priceSnapshot > 0 && <>· Price <strong>{money(l.priceSnapshot)}</strong> · {margin(l.costSnapshot, l.priceSnapshot)}%</>}</span>
              <button className="btn sm danger" onClick={() => del(l.id)}>Delete</button>
            </div>
            {l.notes && <p style={{ fontSize: 13, color: "var(--ink2)", fontStyle: "italic", marginTop: 8 }}>📝 {l.notes}</p>}
          </div>
        );
      })}
    </>
  );
}
