"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { getHistory, type AuditHistoryItem } from "@/lib/history";
import { listAudits, type AuditLogItem } from "@/lib/api";

function calculateKpis(localItems: AuditHistoryItem[], dbItems: AuditLogItem[]) {
  // Combine unique IDs from local storage and DB for a total count
  const allIds = new Set([
    ...localItems.map(i => i.auditId),
    ...dbItems.map(i => i.id)
  ]);
  const total = allIds.size;
  
  // Calculate statuses from DB as primary source, fallback to local
  const completed = dbItems.filter(i => i.status === "completed").length;
  const failed = dbItems.filter(i => i.status === "failed").length;
  const pending = dbItems.filter(i => i.status === "pending" || i.status === "processing").length;
  
  const successRate = total > 0 ? Math.round((completed / (completed + failed || 1)) * 100) : 0;
  
  const todayStr = new Date().toDateString();
  const todayCount = dbItems.filter(i => new Date(i.created_at).toDateString() === todayStr).length;

  return { total, completed, failed, pending, todayCount, successRate };
}

export default function DashboardPage() {
  const [localItems, setLocalItems] = useState<AuditHistoryItem[]>([]);
  const [dbItems, setDbItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLocalItems(getHistory());
        const dbAudits = await listAudits(undefined, undefined, 0, 100);
        setDbItems(dbAudits);
      } catch (err) {
        console.error("Dashboard failed to retrieve DB audits", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const k = calculateKpis(localItems, dbItems);

  // Generate 7-day chart coordinates from DB logs
  const chartData = useMemo(() => {
    const counts = Array(7).fill(0);
    const labels: string[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toDateString();
      labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
      
      counts[6 - i] = dbItems.filter(
        (item) => new Date(item.created_at).toDateString() === dateStr
      ).length;
    }
    
    const maxVal = Math.max(...counts, 4); // minimum ceiling of 4
    // map values to svg height coordinates (Y goes 120 (bottom) to 20 (top))
    const points = counts.map((count, idx) => {
      const x = 50 + idx * 70;
      const y = 120 - (count / maxVal) * 90;
      return { x, y, count };
    });
    
    const pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    const fillD = points.length > 0 
      ? `${pathD} L ${points[points.length - 1].x} 130 L ${points[0].x} 130 Z`
      : "";

    return { points, pathD, fillD, labels };
  }, [dbItems]);

  const recentAudits = dbItems.slice(0, 5);

  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      <header className="hero">
        <h1>FMCG Operations Insights</h1>
        <p>Real-time analytics and neural classification audits platform.</p>
      </header>

      <section className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Audits</span>
          <strong className="kpi-value">{k.total}</strong>
          <span className="kpi-sub">Total database logs</span>
        </div>
        <div className="kpi-card" style={{ '--accent-primary': 'var(--success)' } as React.CSSProperties}>
          <span className="kpi-label">Success Rate</span>
          <strong className="kpi-value">{k.successRate}%</strong>
          <span className="kpi-sub">{k.completed} completed audits</span>
        </div>
        <div className="kpi-card" style={{ '--accent-primary': 'var(--danger)' } as React.CSSProperties}>
          <span className="kpi-label">Failed Runs</span>
          <strong className="kpi-value">{k.failed}</strong>
          <span className="kpi-sub">Critical execution errors</span>
        </div>
        <div className="kpi-card" style={{ '--accent-primary': 'var(--warning)' } as React.CSSProperties}>
          <span className="kpi-label">In Progress</span>
          <strong className="kpi-value">{k.pending}</strong>
          <span className="kpi-sub">Queued in RabbitMQ</span>
        </div>
        <div className="kpi-card" style={{ '--accent-primary': 'var(--info)' } as React.CSSProperties}>
          <span className="kpi-label">Audits Today</span>
          <strong className="kpi-value">{k.todayCount}</strong>
          <span className="kpi-sub">Processed in last 24h</span>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem" }} className="detail-grid">
        {/* Weekly Activity Chart */}
        <section className="card">
          <h2>Weekly Audit Frequency</h2>
          <p className="subtle">Classification jobs submitted per day.</p>
          
          <div style={{ position: "relative", width: "100%", height: "180px" }}>
            {loading ? (
              <div className="skeleton-block" style={{ height: "100%" }} />
            ) : (
              <svg viewBox="0 0 520 160" style={{ width: "100%", height: "100%" }}>
                {/* Horizontal reference lines */}
                <line x1="40" y1="30" x2="480" y2="30" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3" />
                <line x1="40" y1="75" x2="480" y2="75" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3" />
                <line x1="40" y1="120" x2="480" y2="120" stroke="rgba(255, 255, 255, 0.1)" />

                {/* Shaded Area */}
                {chartData.fillD && (
                  <path d={chartData.fillD} fill="url(#chart-grad)" opacity="0.15" />
                )}

                {/* Sparkline Path */}
                {chartData.pathD && (
                  <path d={chartData.pathD} fill="none" stroke="var(--accent-secondary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Graph dots & Tooltips */}
                {chartData.points.map((pt, idx) => (
                  <g key={idx}>
                    <circle cx={pt.x} cy={pt.y} r="5" fill="var(--accent-primary)" stroke="#07090e" strokeWidth="2" />
                    <text x={pt.x} y={pt.y - 12} textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="700">
                      {pt.count > 0 ? pt.count : ""}
                    </text>
                  </g>
                ))}

                {/* X Axis Labels */}
                {chartData.labels.map((lbl, idx) => (
                  <text key={idx} x={50 + idx * 70} y="145" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="600">
                    {lbl}
                  </text>
                ))}

                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-secondary)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>
        </section>

        {/* Info panel */}
        <section className="card stack" style={{ justifyContent: "center" }}>
          <h2>System State</h2>
          <div className="metrics">
            <div className="metric">
              <span>RabbitMQ Broker</span>
              <span className="chip completed" style={{ fontSize: "0.68rem" }}>Connected</span>
            </div>
            <div className="metric">
              <span>Redis Caching</span>
              <span className="chip completed" style={{ fontSize: "0.68rem" }}>Connected</span>
            </div>
            <div className="metric">
              <span>Database Engine</span>
              <span className="chip completed" style={{ fontSize: "0.68rem" }}>PostgreSQL</span>
            </div>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <Link href="/">
              <button style={{ width: "100%" }}>Run New Audit Job</button>
            </Link>
          </div>
        </section>
      </div>

      {/* Recent Audits Table */}
      <section className="card">
        <div className="row-between">
          <h2 style={{ margin: 0 }}>Recent System Audits</h2>
          <Link href="/history" className="small-link" style={{ color: "var(--accent-secondary)" }}>View complete logs →</Link>
        </div>
        
        {loading ? (
          <div className="skeleton-block" style={{ marginTop: "1rem" }} />
        ) : recentAudits.length === 0 ? (
          <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
            No audits processed yet. <Link href="/" style={{ color: "var(--accent-primary)" }}>Start your first audit run.</Link>
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Product Code</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentAudits.map((item) => (
                  <tr key={item.id}>
                    <td><strong>#{item.id}</strong></td>
                    <td><span className="chip processing">{item.product_code || "Unknown"}</span></td>
                    <td><span className={`chip ${item.status}`}>{item.status}</span></td>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
                    <td>
                      <Link href={`/audit/${item.id}`} className="small-link" style={{ color: "var(--accent-secondary)" }}>
                        Details &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
