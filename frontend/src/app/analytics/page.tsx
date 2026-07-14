"use client";

import { useMemo, useState } from "react";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("month");

  // Chart data calculation
  const chartData = useMemo(() => {
    // 6 data points for Audits Over Time
    const counts = [180, 240, 210, 320, 390, 480];
    const labels = ["May 1", "May 8", "May 15", "May 22", "May 29", "May 31"];
    const maxVal = Math.max(...counts, 500);

    const points = counts.map((count, idx) => {
      const x = 50 + idx * 75;
      const y = 140 - (count / maxVal) * 110;
      return { x, y, count };
    });

    const pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    const fillD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`
      : "";

    return { points, pathD, fillD, labels };
  }, []);

  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      <header className="hero row-between">
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Insights and performance metrics for automated shelf audits.</p>
        </div>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem" }}
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </header>

      {/* KPI Cards (Matches Screen 7) */}
      <section className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: "4px solid #10b981" }}>
          <span className="kpi-label">Total Audits</span>
          <strong className="kpi-value">1,248</strong>
          <span className="kpi-sub" style={{ color: "#10b981", fontWeight: 600 }}>↑ +12.4% vs last month</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #10b981" }}>
          <span className="kpi-label">Accuracy</span>
          <strong className="kpi-value">99.62%</strong>
          <span className="kpi-sub" style={{ color: "#10b981", fontWeight: 600 }}>↑ +0.5% vs yesterday</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #ef4444" }}>
          <span className="kpi-label">Avg Inference Time</span>
          <strong className="kpi-value">320ms</strong>
          <span className="kpi-sub" style={{ color: "#059669", fontWeight: 600 }}>↓ -12ms load speed</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #f59e0b" }}>
          <span className="kpi-label">Failed Audits</span>
          <strong className="kpi-value">12</strong>
          <span className="kpi-sub" style={{ color: "#dc2626", fontWeight: 600 }}>↓ -4.1% broker drops</span>
        </div>
      </section>

      {/* Analytics Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Audits Over Time Line Chart */}
        <section className="card">
          <h2>Audits Over Time</h2>
          <p className="subtle" style={{ marginBottom: "1rem" }}>Number of classification runs completed during this period.</p>
          <div style={{ position: "relative", width: "100%", height: "200px" }}>
            <svg viewBox="0 0 500 180" style={{ width: "100%", height: "100%" }}>
              {/* Reference Grid lines */}
              <line x1="40" y1="30" x2="450" y2="30" stroke="#f1f5f3" strokeWidth="1.5" />
              <line x1="40" y1="85" x2="450" y2="85" stroke="#f1f5f3" strokeWidth="1.5" />
              <line x1="40" y1="140" x2="450" y2="140" stroke="#e4e9e6" strokeWidth="1.5" />

              {/* Shaded Area */}
              {chartData.fillD && (
                <path d={chartData.fillD} fill="url(#analytics-grad)" opacity="0.12" />
              )}

              {/* Chart line path */}
              {chartData.pathD && (
                <path d={chartData.pathD} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Chart dots */}
              {chartData.points.map((pt, idx) => (
                <g key={idx}>
                  <circle cx={pt.x} cy={pt.y} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  <text x={pt.x} y={pt.y - 12} textAnchor="middle" fill="#1e293b" fontSize="10" fontWeight="700">
                    {pt.count}
                  </text>
                </g>
              ))}

              {/* X Axis labels */}
              {chartData.labels.map((lbl, idx) => (
                <text key={idx} x={50 + idx * 75} y="165" textAnchor="middle" fill="#8595a6" fontSize="10" fontWeight="600">
                  {lbl}
                </text>
              ))}

              {/* Gradient Def */}
              <defs>
                <linearGradient id="analytics-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </section>

        {/* Audits by Category Donut Chart */}
        <section className="card stack">
          <h2>Audits by Category</h2>
          <p className="subtle" style={{ marginBottom: "1rem" }}>Inference volume distributed by product categories.</p>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            {/* SVG Donut */}
            <svg width="140" height="140" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
              {/* Background circle */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f3" strokeWidth="4" />
              
              {/* Segments: Beverages (28%), Snacks (22%), Dairy (10%), Personal Care (10%), Others (30%) */}
              {/* Stroke-dasharray format: "percent gap" */}
              {/* Beverages (28) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="4.2" strokeDasharray="28 72" strokeDashoffset="0" />
              {/* Snacks (22) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="4.2" strokeDasharray="22 78" strokeDashoffset="-28" />
              {/* Dairy (10) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="4.2" strokeDasharray="10 90" strokeDashoffset="-50" />
              {/* Personal Care (10) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#06b6d4" strokeWidth="4.2" strokeDasharray="10 90" strokeDashoffset="-60" />
              {/* Others (30) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#a855f7" strokeWidth="4.2" strokeDasharray="30 70" strokeDashoffset="-70" />
            </svg>

            {/* Color Keys */}
            <div className="metrics" style={{ flexGrow: 1, gap: "0.4rem" }}>
              <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                  Beverages
                </span>
                <strong>28%</strong>
              </div>
              <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                  Snacks
                </span>
                <strong>22%</strong>
              </div>
              <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} />
                  Dairy
                </span>
                <strong>10%</strong>
              </div>
              <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#06b6d4" }} />
                  Personal Care
                </span>
                <strong>10%</strong>
              </div>
              <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#a855f7" }} />
                  Others
                </span>
                <strong>30%</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
