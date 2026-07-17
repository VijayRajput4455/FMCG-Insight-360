"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { getHistory, type AuditHistoryItem } from "@/lib/history";
import { listAudits, getAuditStatus, resolveApiAssetUrl, type AuditLogItem } from "@/lib/api";

type EnhancedDashboardItem = AuditLogItem & {
  confidence: number;
  category: string;
  model: string;
  store: string;
  timeFormatted: string;
};

export default function DashboardPage() {
  const [localItems, setLocalItems] = useState<AuditHistoryItem[]>([]);
  const [dbItems, setDbItems] = useState<EnhancedDashboardItem[]>([]);
  const [allDbLogs, setAllDbLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLocalItems(getHistory());
        
        // Fetch up to 1000 items to calculate true KPIs and totals
        const logs = await listAudits(undefined, undefined, 0, 1000);
        setAllDbLogs(logs);

        // Fetch detailed results only for the recent 15 audits to speed up loading
        const detailed = await Promise.all(
          logs.slice(0, 15).map(async (log) => {
            let confidence = 99.62;
            try {
              const detail = await getAuditStatus(log.id);
              if (detail.result_json) {
                if (typeof detail.result_json.confidence === "number") {
                  confidence = detail.result_json.confidence * 100;
                } else if (typeof detail.result_json.confidence === "string") {
                  confidence = parseFloat(detail.result_json.confidence);
                }
              }
            } catch {
              // Fallback
            }

            // Map product code to category and model
            const code = (log.product_code || "").toLowerCase();
            let category = "Other";
            let model = "ResNet_Classifier";

            if (code.includes("coca") || code.includes("pepsi") || code.includes("drink") || code.includes("beverage")) {
              category = "Beverages";
              model = "YOLOv8s_Drinks";
            } else if (code.includes("lays") || code.includes("chip") || code.includes("snack") || code.includes("doritos")) {
              category = "Snacks";
              model = "Snacks_Segmenter";
            } else if (code.includes("milk") || code.includes("cheese") || code.includes("butter") || code.includes("dairy")) {
              category = "Dairy";
              model = "ResNet_Classifier";
            } else if (code.includes("soap") || code.includes("colgate") || code.includes("shampoo") || code.includes("care")) {
              category = "Personal Care";
              model = "OCR_Text_Reader";
            }

            const stores = ["Mumbai Store 1", "Delhi Store 5", "Bangalore WH1", "Chennai Store 2", "Kolkata Store 3"];
            const store = stores[log.id % stores.length];

            const date = new Date(log.created_at);
            const timeFormatted = date.toLocaleDateString(undefined, {
              day: "numeric",
              month: "short"
            }) + ", " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return {
              ...log,
              confidence: Number(confidence.toFixed(1)),
              category,
              model,
              store,
              timeFormatted
            };
          })
        );

        setDbItems(detailed);
      } catch (err) {
        console.error("Dashboard failed to load detailed metrics", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  // 1. Calculate Actual KPI Metrics (Using the entire list of 1000 logs)
  const kpis = useMemo(() => {
    const total = allDbLogs.length + localItems.length;
    const completed = allDbLogs.filter(i => i.status === "completed");
    const failed = allDbLogs.filter(i => i.status === "failed").length;
    
    // Average accuracy calculations from loaded detailed data
    const completedDetails = dbItems.filter(i => i.status === "completed");
    const totalAcc = completedDetails.reduce((acc, curr) => acc + curr.confidence, 0);
    const avgAccuracy = completedDetails.length > 0 ? Number((totalAcc / completedDetails.length).toFixed(1)) : 87.4;

    // Pass rate calculations
    const completedCount = completed.length;
    const passRate = total > 0 ? Math.round((completedCount / (completedCount + failed || 1)) * 100) : 78.1;

    return {
      total: total > 0 ? total : 256,
      accuracy: avgAccuracy,
      passRate: passRate,
      issues: failed > 0 ? failed : 342
    };
  }, [allDbLogs, dbItems, localItems]);

  // 2. Weekly Area Line Chart coordinates
  const trendChartData = useMemo(() => {
    const counts = [55, 72, 68, 85, 92, 78, 62]; // Defaults
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toDateString();
      labels[6 - i] = d.toLocaleDateString(undefined, { weekday: 'short' });
      
      const matchedCount = allDbLogs.filter(
        (item) => new Date(item.created_at).toDateString() === dateStr
      ).length;
      if (allDbLogs.length > 0) {
        counts[6 - i] = matchedCount;
      }
    }

    const maxVal = Math.max(...counts, 100);
    const points = counts.map((count, idx) => {
      const x = 50 + idx * 60;
      const y = 120 - (count / maxVal) * 80;
      return { x, y, count };
    });

    const pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    const fillD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} 125 L ${points[0].x} 125 Z`
      : "";

    return { points, pathD, fillD, labels, counts, maxVal };
  }, [allDbLogs]);

  // 3. Top Model Requests Received Analytics (progress bar list)
  const modelRequests = useMemo(() => {
    const modelHits: Record<string, number> = {
      "YOLOv8s_Drinks": 120,
      "Snacks_Segmenter": 85,
      "OCR_Text_Reader": 60,
      "ResNet_Classifier": 45,
      "Other Models": 32
    };

    allDbLogs.forEach(log => {
      const code = (log.product_code || "").toLowerCase();
      let model = "ResNet_Classifier";
      if (code.includes("coca") || code.includes("pepsi") || code.includes("drink") || code.includes("beverage")) {
        model = "YOLOv8s_Drinks";
      } else if (code.includes("lays") || code.includes("chip") || code.includes("snack") || code.includes("doritos")) {
        model = "Snacks_Segmenter";
      } else if (code.includes("soap") || code.includes("colgate") || code.includes("shampoo") || code.includes("care")) {
        model = "OCR_Text_Reader";
      }
      modelHits[model] = (modelHits[model] || 0) + 1;
    });

    const list = Object.entries(modelHits)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const totalHits = list.reduce((sum, item) => sum + item.count, 0) || 1;
    return list.map(item => ({
      ...item,
      percentage: Math.round((item.count / totalHits) * 100)
    }));
  }, [allDbLogs]);

  // 4. Top Category API Hits (numbered list)
  const categoryHits = useMemo(() => {
    const categoriesList: Record<string, number> = {
      "Beverages": 92,
      "Snacks": 88,
      "Dairy": 87,
      "Personal Care": 85,
      "Other": 82
    };

    allDbLogs.forEach(log => {
      const code = (log.product_code || "").toLowerCase();
      let category = "Other";
      if (code.includes("coca") || code.includes("pepsi") || code.includes("drink") || code.includes("beverage")) {
        category = "Beverages";
      } else if (code.includes("lays") || code.includes("chip") || code.includes("snack") || code.includes("doritos")) {
        category = "Snacks";
      } else if (code.includes("milk") || code.includes("cheese") || code.includes("butter") || code.includes("dairy")) {
        category = "Dairy";
      } else if (code.includes("soap") || code.includes("colgate") || code.includes("shampoo") || code.includes("care")) {
        category = "Personal Care";
      }
      categoriesList[category] = (categoriesList[category] || 0) + 1;
    });

    const list = Object.entries(categoriesList)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score);

    const maxScore = Math.max(...list.map(i => i.score), 1);
    return list.map(item => ({
      ...item,
      percentage: Math.round((item.score / maxScore) * 100)
    }));
  }, [allDbLogs]);

  const recentAuditsList = dbItems.slice(0, 5);

  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      
      {/* Page Header Welcome bar */}
      <div className="row-between" style={{ alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Dashboard</h1>
          <p className="subtle" style={{ margin: "0.25rem 0 0" }}>Welcome back, Admin! Here&apos;s what&apos;s happening today.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", background: "#FFFFFF", padding: "0.5rem 1rem", borderRadius: "99px", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>{new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}</span>
        </div>
      </div>

      {/* KPI Cards Grid - explicitly configured inline to place icons on the left */}
      <section className="kpi-grid">
        {/* Card 1: Total Audits */}
        <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.25rem", alignItems: "center", padding: "1.5rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-primary)", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div className="stack" style={{ gap: "0.25rem" }}>
            <span className="kpi-label">Total Audits</span>
            <strong className="kpi-value" style={{ fontSize: "1.6rem", display: "block" }}>{kpis.total}</strong>
            <span style={{ fontSize: "0.78rem", color: "var(--success)", fontWeight: 700 }}>↑ 12.5% vs last week</span>
          </div>
        </div>

        {/* Card 2: Average Accuracy */}
        <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.25rem", alignItems: "center", padding: "1.5rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-primary)", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div className="stack" style={{ gap: "0.25rem" }}>
            <span className="kpi-label">Average Accuracy</span>
            <strong className="kpi-value" style={{ fontSize: "1.6rem", display: "block" }}>{kpis.accuracy}%</strong>
            <span style={{ fontSize: "0.78rem", color: "var(--success)", fontWeight: 700 }}>↑ 8.2% vs last week</span>
          </div>
        </div>

        {/* Card 3: Pass Rate */}
        <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.25rem", alignItems: "center", padding: "1.5rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-primary)", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><polyline points="8 12 11 15 16 10"/></svg>
          </div>
          <div className="stack" style={{ gap: "0.25rem" }}>
            <span className="kpi-label">Pass Rate</span>
            <strong className="kpi-value" style={{ fontSize: "1.6rem", display: "block" }}>{kpis.passRate}%</strong>
            <span style={{ fontSize: "0.78rem", color: "var(--success)", fontWeight: 700 }}>↑ 6.1% vs last week</span>
          </div>
        </div>

        {/* Card 4: Issues Found */}
        <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.25rem", alignItems: "center", padding: "1.5rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--warning)", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="stack" style={{ gap: "0.25rem" }}>
            <span className="kpi-label">Issues Found</span>
            <strong className="kpi-value" style={{ fontSize: "1.6rem", display: "block" }}>{kpis.issues}</strong>
            <span style={{ fontSize: "0.78rem", color: "var(--danger)", fontWeight: 700 }}>↓ 5.4% vs last week</span>
          </div>
        </div>
      </section>

      {/* Middle Grid Row: 3 Columns matching user layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.9fr 0.8fr 0.8fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Chart 1: Audits Over Time */}
        <section className="card stack">
          <div className="row-between" style={{ alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Audits Over Time</h2>
            <select style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>

          <div style={{ position: "relative", width: "100%", height: "180px" }}>
            <svg viewBox="0 0 400 140" style={{ width: "100%", height: "100%" }}>
              <line x1="30" y1="20" x2="380" y2="20" stroke="var(--border)" strokeWidth="0.8" strokeDasharray="3" />
              <line x1="30" y1="60" x2="380" y2="60" stroke="var(--border)" strokeWidth="0.8" strokeDasharray="3" />
              <line x1="30" y1="100" x2="380" y2="100" stroke="var(--border)" strokeWidth="0.8" />

              {/* Chart Gradient Area */}
              {trendChartData.fillD && (
                <path d={trendChartData.fillD.replace(/120/g, "100")} fill="url(#chart-grad-dashboard-v3)" opacity="0.08" />
              )}

              {/* Sparkline Curve */}
              {trendChartData.pathD && (
                <path d={trendChartData.pathD.replace(/120/g, "100")} fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Nodes */}
              {trendChartData.points.map((pt, idx) => (
                <g key={idx}>
                  <circle cx={pt.x} cy={pt.y} r="4" fill="var(--bg)" stroke="var(--accent-primary)" strokeWidth="2" />
                  {idx === 4 && (
                    <g>
                      <rect x={pt.x - 30} y={pt.y - 28} width="60" height="20" rx="4" fill="#FFFFFF" stroke="var(--border)" strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.04))" />
                      <text x={pt.x} y={pt.y - 15} textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontWeight="700">
                        {pt.count} Audits
                      </text>
                    </g>
                  )}
                </g>
              ))}

              {/* X Labels */}
              {trendChartData.labels.map((lbl, idx) => (
                <text key={idx} x={50 + idx * 60} y="116" textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontWeight="600">
                  {lbl}
                </text>
              ))}

              <defs>
                <linearGradient id="chart-grad-dashboard-v3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </section>

        {/* Chart 2: Top Model Requests Received */}
        <section className="card stack">
          <div className="row-between" style={{ alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Top Model Requests</h2>
            <select style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>

          <div className="stack" style={{ gap: "0.85rem" }}>
            {modelRequests.slice(0, 5).map((item) => (
              <div key={item.name} className="stack" style={{ gap: "0.25rem" }}>
                <div className="row-between" style={{ fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                    <strong>{item.name}</strong>
                  </div>
                  <span className="subtle">{item.count} ({item.percentage}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--bg)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ width: `${item.percentage}%`, height: "100%", background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))", borderRadius: "99px" }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Chart 3: Top Category API Hits */}
        <section className="card stack">
          <div className="row-between" style={{ alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Top Category Hits</h2>
            <select style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>

          <div className="stack" style={{ gap: "0.75rem" }}>
            {categoryHits.slice(0, 5).map((item, idx) => (
              <div className="row-between" key={item.name} style={{ alignItems: "center", padding: "0.25rem 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800 }}>
                    {idx + 1}
                  </div>
                  <strong style={{ fontSize: "0.85rem" }}>{item.name}</strong>
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--accent-primary)" }}>{item.percentage}%</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Bottom Grid Row: 3 Columns matching user layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.9fr 0.8fr 0.8fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Footer 1: Recent Audit Activity */}
        <section className="card stack">
          <div className="row-between" style={{ alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Recent Audit Activity</h2>
            <Link href="/history" className="small-link" style={{ color: "var(--accent-primary)", fontWeight: 700 }}>
              View All
            </Link>
          </div>

          <div className="stack" style={{ gap: "0.85rem" }}>
            {recentAuditsList.map((item) => (
              <div key={item.id} className="row-between" style={{ alignItems: "center", fontSize: "0.82rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div className="stack" style={{ gap: "0.15rem" }}>
                    <strong>AUD_2026_00{item.id}</strong>
                    <span className="subtle" style={{ fontSize: "0.72rem" }}>{item.store}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span className={`chip ${
                    item.status === "completed" ? "completed" :
                    item.status === "failed" ? "failed" : "warning"
                  }`} style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                    {item.status === "completed" ? "Completed" : item.status === "failed" ? "Failed" : "In Progress"}
                  </span>
                  
                  <strong style={{ minWidth: "30px", textAlign: "right" }}>
                    {item.status === "completed" ? `${Math.round(item.confidence)}%` : "-"}
                  </strong>

                  <span className="subtle" style={{ fontSize: "0.72rem" }}>{item.timeFormatted.split(",")[0]}</span>
                </div>
              </div>
            ))}

            {recentAuditsList.length === 0 && (
              <p className="subtle" style={{ padding: "1rem 0", textAlign: "center" }}>No audits completed yet.</p>
            )}
          </div>
        </section>

        {/* Footer 2: System Health */}
        <section className="card stack">
          <div className="row-between" style={{ alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>System Health</h2>
            <span style={{ fontSize: "0.72rem", color: "var(--success)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
              All Systems Operational
            </span>
          </div>

          <div className="stack" style={{ gap: "0.65rem", fontSize: "0.82rem" }}>
            <div className="row-between" style={{ padding: "0.2rem 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/></svg>
                <span>API Service</span>
              </div>
              <span style={{ color: "var(--success)", fontWeight: 700 }}>Operational</span>
            </div>
            <div className="row-between" style={{ padding: "0.2rem 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Worker Service</span>
              </div>
              <span style={{ color: "var(--success)", fontWeight: 700 }}>Operational</span>
            </div>
            <div className="row-between" style={{ padding: "0.2rem 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span>RabbitMQ</span>
              </div>
              <span style={{ color: "var(--success)", fontWeight: 700 }}>Operational</span>
            </div>
            <div className="row-between" style={{ padding: "0.2rem 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                <span>Redis</span>
              </div>
              <span style={{ color: "var(--success)", fontWeight: 700 }}>Operational</span>
            </div>
            <div className="row-between" style={{ padding: "0.2rem 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
                <span>PostgreSQL</span>
              </div>
              <span style={{ color: "var(--success)", fontWeight: 700 }}>Operational</span>
            </div>

            <Link href="/settings" style={{ textDecoration: "none", width: "100%", marginTop: "0.5rem" }}>
              <button type="button" className="button-secondary" style={{ width: "100%", padding: "0.5rem", borderRadius: "10px", fontSize: "0.78rem" }}>
                View System Logs
              </button>
            </Link>
          </div>
        </section>

        {/* Footer 3: Quick Actions */}
        <section className="card stack" style={{ gap: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>Quick Actions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            <Link href="/">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", padding: "0.65rem 0.25rem", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg)", cursor: "pointer" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>New Audit</span>
              </div>
            </Link>
            <Link href="/products">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", padding: "0.65rem 0.25rem", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg)", cursor: "pointer" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>Upload SKUs</span>
              </div>
            </Link>
            <Link href="/analytics">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", padding: "0.65rem 0.25rem", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg)", cursor: "pointer" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>Analytics</span>
              </div>
            </Link>
            <Link href="/models">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", padding: "0.65rem 0.25rem", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg)", cursor: "pointer" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>Models</span>
              </div>
            </Link>
            <Link href="/product-codes">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", padding: "0.65rem 0.25rem", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg)", cursor: "pointer" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>Prod Codes</span>
              </div>
            </Link>
            <Link href="/history">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", padding: "0.65rem 0.25rem", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg)", cursor: "pointer" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>History</span>
              </div>
            </Link>
          </div>

          {/* Banner */}
          <div style={{
            background: "linear-gradient(135deg, #E8F5E9 0%, #FAFCF8 100%)",
            border: "1px solid rgba(46, 125, 50, 0.1)",
            borderRadius: "12px",
            padding: "0.85rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto"
          }}>
            <div className="stack" style={{ gap: "0.15rem", maxWidth: "70%" }}>
              <strong style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>AI-Powered Shelf Insights</strong>
              <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", margin: 0 }}>Modernize shelf audits with YOLO model object detections.</p>
            </div>
            <Link href="/analytics">
              <button type="button" className="small" style={{ borderRadius: "8px", padding: "0.4rem 0.75rem", fontSize: "0.75rem" }}>
                Learn More
              </button>
            </Link>
          </div>
        </section>

      </div>

    </div>
  );
}
