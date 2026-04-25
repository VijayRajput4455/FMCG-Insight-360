"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getHistory, type AuditHistoryItem } from "@/lib/history";

function kpis(items: AuditHistoryItem[]) {
  const total = items.length;
  const completed = items.filter((i) => i.status === "completed").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const pending = items.filter((i) => i.status === "pending" || i.status === "processing").length;

  const uniqueCodes = new Set(items.map((i) => i.productCode)).size;

  const today = new Date().toDateString();
  const todayCount = items.filter((i) => new Date(i.createdAtIso).toDateString() === today).length;

  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, failed, pending, uniqueCodes, todayCount, successRate };
}

type KpiCardProps = {
  label: string;
  value: number | string;
  sub?: string;
};

function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

export default function DashboardPage() {
  const [items, setItems] = useState<AuditHistoryItem[]>([]);

  useEffect(() => {
    setItems(getHistory());
  }, []);

  const k = kpis(items);

  const recentFive = items.slice(0, 5);

  return (
    <main className="container">
      <header className="hero">
        <h1>Dashboard</h1>
        <p>Overview of audit activity tracked in this browser.</p>
        <nav className="nav-row">
          <Link href="/">New Audit</Link>
          <Link href="/history">Full History</Link>
          <Link href="/product-codes">Product Codes</Link>
        </nav>
      </header>

      <section className="kpi-grid">
        <KpiCard label="Total Audits" value={k.total} />
        <KpiCard label="Completed" value={k.completed} sub={`${k.successRate}% success`} />
        <KpiCard label="Failed" value={k.failed} />
        <KpiCard label="In Progress" value={k.pending} />
        <KpiCard label="Product Codes" value={k.uniqueCodes} sub="unique" />
        <KpiCard label="Today" value={k.todayCount} sub="audits today" />
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <div className="row-between">
          <h2 style={{ margin: 0 }}>Recent Audits</h2>
          <Link href="/history" className="small-link">View all →</Link>
        </div>
        {recentFive.length === 0 ? (
          <p>No audits yet. <Link href="/">Start your first audit.</Link></p>
        ) : (
          <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
            <table>
              <thead>
                <tr><th>ID</th><th>Product</th><th>Status</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {recentFive.map((item) => (
                  <tr key={item.auditId}>
                    <td>{item.auditId}</td>
                    <td>{item.productCode}</td>
                    <td><span className={`chip ${item.status}`}>{item.status}</span></td>
                    <td>{new Date(item.createdAtIso).toLocaleString()}</td>
                    <td><Link href={`/audit/${item.auditId}`} className="small-link">Detail →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
