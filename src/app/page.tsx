"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/costing";

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch("/api/dashboard").then((r) => r.json()).then(setD); }, []);
  if (!d) return <div className="spin">Loading…</div>;
  return (
    <>
      <div className="head"><div><h1>Dashboard</h1><p>Overview of your blending operation</p></div></div>
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <Metric lbl="Customers" val={d.customers} />
        <Metric lbl="Tea types" val={d.teas} />
        <Metric lbl="Standard blends" val={d.standard} />
        <Metric lbl="Customer blends" val={d.customer} />
      </div>
      <div className="grid cols-3" style={{ marginBottom: 24 }}>
        <Metric lbl="Production volume" val={<>{d.volume}<small> kg</small></>} />
        <Metric lbl="Revenue logged" val={money(d.revenue)} />
        <Metric lbl="Most produced" val={<span style={{ fontSize: 18 }}>{d.topBlend}</span>} />
      </div>
      <div className="card">
        <div className="flex between" style={{ marginBottom: 12 }}>
          <strong>Recent recipe logs</strong>
          <Link href="/logs" className="btn sm ghost">View all</Link>
        </div>
        {d.recent.length ? (
          <table>
            <thead><tr><th>Lot</th><th>Blend</th><th>Customer</th><th>Qty</th><th>Date</th></tr></thead>
            <tbody>
              {d.recent.map((l: any) => (
                <tr key={l.id}>
                  <td className="mono">{l.lot}</td><td>{l.blendName}</td><td>{l.customerName}</td>
                  <td>{l.quantity} kg</td><td>{new Date(l.productionDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty">No production logged yet.</div>}
      </div>
    </>
  );
}

function Metric({ lbl, val }: { lbl: string; val: React.ReactNode }) {
  return <div className="metric"><div className="lbl">{lbl}</div><div className="val">{val}</div></div>;
}
