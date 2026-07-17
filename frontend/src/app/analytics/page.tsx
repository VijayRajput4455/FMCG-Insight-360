"use client";

import { useMemo, useState } from "react";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("month");

  // Trend Chart data points
  const trendData = useMemo(() => {
    const counts = [180, 240, 210, 320, 390, 480];
    const labels = ["May 1", "May 8", "May 15", "May 22", "May 29", "May 31"];
    const maxVal = 500;

    const points = counts.map((count, idx) => {
      const x = 50 + idx * 75;
      const y = 140 - (count / maxVal) * 100;
      return { x, y, count };
    });

    const pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    const fillD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`
      : "";

    return { points, pathD, fillD, labels };
  }, []);

  // Heatmap grids mockup (5 stores x 7 days)
  const heatmapGrid = useMemo(() => {
    const stores = ["Store #101", "Store #102", "Store #103", "Store #104", "Store #105"];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    // Matrix of values (0 to 10 audits)
    const matrix = [
      [9, 4, 8, 3, 7, 1, 5],
      [2, 8, 5, 9, 2, 6, 8],
      [7, 3, 9, 4, 8, 2, 7],
      [4, 9, 2, 8, 5, 9, 3],
      [8, 5, 7, 3, 9, 1, 9]
    ];

    return { stores, days, matrix };
  }, []);

  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      
      {/* 1. Page Header */}
      <header className="hero row-between" style={{ alignItems: "center" }}>
        <div>
          <span className="kpi-label" style={{ color: "var(--accent-primary)" }}>Intelligence Reports</span>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.25rem 0 0" }}>Business Intelligence Console</h1>
          <p className="subtle">Analyze retail revenue indicators, scanning volumes, and model compliance charts.</p>
        </div>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", borderRadius: "99px", boxShadow: "var(--shadow-sm)" }}
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </header>

      {/* 2. Four KPI Cards */}
      <section className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: "4px solid var(--danger)" }}>
          <span className="kpi-label">Audited Revenue Save</span>
          <strong className="kpi-value">$24,820</strong>
          <span className="kpi-sub" style={{ color: "var(--success)", fontWeight: 700 }}>↑ +14.2% cost protection</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid var(--info)" }}>
          <span className="kpi-label">Total Completed Audits</span>
          <strong className="kpi-value">1,248</strong>
          <span className="kpi-sub" style={{ color: "var(--accent-primary)", fontWeight: 700 }}>↑ +180 runs this week</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <span className="kpi-label">AI Accuracy Score</span>
          <strong className="kpi-value">99.62%</strong>
          <span className="kpi-sub" style={{ color: "var(--success)", fontWeight: 700 }}>↑ +0.3% YOLO model update</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid var(--warning)" }}>
          <span className="kpi-label">Detections Issues</span>
          <strong className="kpi-value">14</strong>
          <span className="kpi-sub" style={{ color: "var(--danger)", fontWeight: 700 }}>↓ -2.5% scan blur drops</span>
        </div>
      </section>

      {/* 3. Performance Trends split layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Trend Area Chart */}
        <section className="card stack">
          <h2>Audits & Coverage Frequency</h2>
          <p className="subtle">Completed shelf classification queries plotted against calendar milestones.</p>
          
          <div style={{ position: "relative", width: "100%", height: "220px", marginTop: "1rem" }}>
            <svg viewBox="0 0 500 160" style={{ width: "100%", height: "100%" }}>
              <line x1="40" y1="20" x2="460" y2="20" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" opacity="0.3" />
              <line x1="40" y1="80" x2="460" y2="80" stroke="var(--border)" strokeWidth="1" strokeDasharray="3" opacity="0.3" />
              <line x1="40" y1="140" x2="460" y2="140" stroke="var(--border)" strokeWidth="1" />

              {/* Shaded Area */}
              {trendData.fillD && (
                <path d={trendData.fillD} fill="url(#analytics-grad-area)" opacity="0.12" />
              )}

              {/* Plot Line */}
              {trendData.pathD && (
                <path d={trendData.pathD} fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Coordinates dots */}
              {trendData.points.map((pt, idx) => (
                <g key={idx}>
                  <circle cx={pt.x} cy={pt.y} r="5" fill="var(--bg)" stroke="var(--accent-primary)" strokeWidth="2.5" />
                  <text x={pt.x} y={pt.y - 12} textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="700">
                    {pt.count}
                  </text>
                </g>
              ))}

              {/* X labels */}
              {trendData.labels.map((lbl, idx) => (
                <text key={idx} x={50 + idx * 75} y="154" textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontWeight="600">
                  {lbl}
                </text>
              ))}

              <defs>
                <linearGradient id="analytics-grad-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </section>

        {/* Categories allocation Pie Chart */}
        <section className="card stack">
          <h2>Top Categories Share</h2>
          <p className="subtle">Audit loads divided across major inventory segments.</p>
          
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px", marginTop: "1rem", position: "relative" }}>
            <svg viewBox="0 0 160 160" style={{ width: "160px", height: "160px" }}>
              {/* Beverages - 45% (dasharray ~ 198) */}
              <circle cx="80" cy="80" r="60" fill="transparent" stroke="var(--accent-primary)" strokeWidth="20" strokeDasharray="170 377" strokeDashoffset="0" />
              {/* Snacks - 35% */}
              <circle cx="80" cy="80" r="60" fill="transparent" stroke="var(--accent-secondary)" strokeWidth="20" strokeDasharray="132 377" strokeDashoffset="-170" />
              {/* Dairy - 12% */}
              <circle cx="80" cy="80" r="60" fill="transparent" stroke="var(--info)" strokeWidth="20" strokeDasharray="45 377" strokeDashoffset="-302" />
              {/* Others - 8% */}
              <circle cx="80" cy="80" r="60" fill="transparent" stroke="var(--border)" strokeWidth="20" strokeDasharray="30 377" strokeDashoffset="-347" />
            </svg>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <span className="subtle" style={{ fontSize: "0.68rem" }}>DOMINANT</span>
              <strong style={{ display: "block", fontSize: "0.85rem" }}>Beverages</strong>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", marginTop: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-primary)" }} />
              <span>Beverages (45%)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-secondary)" }} />
              <span>Snacks (35%)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--info)" }} />
              <span>Dairy (12%)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--border)" }} />
              <span>Other (8%)</span>
            </div>
          </div>
        </section>

      </div>

      {/* 4. Heatmap Coverage & Leaderboards */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Heat Map grid */}
        <section className="card stack">
          <h2>Store Coverage Density Map</h2>
          <p className="subtle">Weekly audit frequency distributions tracked across retail branches.</p>
          
          <div className="table-wrap" style={{ marginTop: "1rem" }}>
            <table style={{ borderCollapse: "separate", borderSpacing: "4px" }}>
              <thead>
                <tr>
                  <th style={{ background: "transparent" }}>Store Name</th>
                  {heatmapGrid.days.map(d => (
                    <th key={d} style={{ background: "transparent", textAlign: "center", width: "40px" }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapGrid.stores.map((storeName, storeIdx) => (
                  <tr key={storeName}>
                    <td><strong>{storeName}</strong></td>
                    {heatmapGrid.matrix[storeIdx].map((qty, dayIdx) => {
                      // Color shade mapping
                      const opacity = qty === 0 ? 0.03 : 0.1 + (qty / 10) * 0.9;
                      return (
                        <td 
                          key={dayIdx} 
                          style={{
                            background: `rgba(46, 125, 50, ${opacity})`,
                            color: qty > 5 ? "#FFFFFF" : "var(--text-primary)",
                            textAlign: "center",
                            borderRadius: "6px",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            padding: "0.5rem 0",
                            transition: "transform 0.15s"
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                          title={`${qty} scans completed`}
                        >
                          {qty}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Errors & Alerts */}
        <section className="card stack" style={{ gap: "1rem" }}>
          <h2>Top Detection Flag Warnings</h2>
          <p className="subtle">Common bounding box error flags mapped by AI engines.</p>
          
          <div className="stack" style={{ gap: "0.75rem", fontSize: "0.85rem" }}>
            <div className="row-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.45rem" }}>
              <span>Label Obstructed (Covered)</span>
              <strong style={{ color: "var(--danger)" }}>42 cases (28.4%)</strong>
            </div>
            <div className="row-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.45rem" }}>
              <span>Low Contrast (Poor Lighting)</span>
              <strong style={{ color: "var(--warning)" }}>26 cases (17.5%)</strong>
            </div>
            <div className="row-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.45rem" }}>
              <span>Scanning Shake (Blurry image)</span>
              <strong style={{ color: "var(--info)" }}>15 cases (10.1%)</strong>
            </div>
            <div className="row-between">
              <span>Bad Shelf Angle (Skewed view)</span>
              <strong style={{ color: "var(--text-secondary)" }}>8 cases (5.4%)</strong>
            </div>
          </div>
        </section>

      </div>

      {/* 5. Bottom Leaderboards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Compliance Rankings */}
        <section className="card stack">
          <h2>Store Compliance Rankings</h2>
          <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Store Branch</th>
                  <th>Audits</th>
                  <th style={{ textAlign: "right" }}>Compliance Rating</th>
                </tr>
              </thead>
              <tbody>
                <tr className="table-row-hover">
                  <td><strong>Store #104 (West District)</strong></td>
                  <td>148 runs</td>
                  <td style={{ textAlign: "right", color: "var(--success)" }}><strong>99.82%</strong></td>
                </tr>
                <tr className="table-row-hover">
                  <td><strong>Store #102 (Downtown Hub)</strong></td>
                  <td>120 runs</td>
                  <td style={{ textAlign: "right", color: "var(--success)" }}><strong>99.15%</strong></td>
                </tr>
                <tr className="table-row-hover">
                  <td><strong>Store #189 (Metro Hypermarket)</strong></td>
                  <td>92 runs</td>
                  <td style={{ textAlign: "right", color: "var(--warning)" }}><strong>96.40%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Product classification metrics */}
        <section className="card stack">
          <h2>Product Classification Performance</h2>
          <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
            <table>
              <thead>
                <tr>
                  <th>SKU Product</th>
                  <th>Detections</th>
                  <th style={{ textAlign: "right" }}>AI Confidence</th>
                </tr>
              </thead>
              <tbody>
                <tr className="table-row-hover">
                  <td><strong>Coca Cola 500ml Bottle</strong></td>
                  <td>420 units</td>
                  <td style={{ textAlign: "right", color: "var(--success)" }}><strong>99.78%</strong></td>
                </tr>
                <tr className="table-row-hover">
                  <td><strong>Pepsi Can 330ml</strong></td>
                  <td>364 units</td>
                  <td style={{ textAlign: "right", color: "var(--success)" }}><strong>99.45%</strong></td>
                </tr>
                <tr className="table-row-hover">
                  <td><strong>Lays Classic Small</strong></td>
                  <td>280 units</td>
                  <td style={{ textAlign: "right", color: "var(--warning)" }}><strong>97.10%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </div>

    </div>
  );
}
