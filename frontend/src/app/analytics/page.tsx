"use client";

import { useEffect, useMemo, useState } from "react";
import { listAudits, getAuditStatus, listProductCodes, listProducts, listModels, type AuditLogItem, type ProductCode, type Product, type Model } from "@/lib/api";
import { getHistory, type AuditHistoryItem } from "@/lib/history";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [localItems, setLocalItems] = useState<AuditHistoryItem[]>([]);
  const [detailedConfs, setDetailedConfs] = useState<Record<number, number>>({});
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<"bar" | "pie">("bar");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        setLocalItems(getHistory());
        const [fetchedLogs, codesList, productsList, modelsList] = await Promise.all([
          listAudits(undefined, undefined, 0, 200),
          listProductCodes().catch(() => []),
          listProducts().catch(() => []),
          listModels().catch(() => [])
        ]);
        setLogs(fetchedLogs);
        setProductCodes(codesList);
        setProducts(productsList);
        setModels(modelsList);

        const sampleLogs = fetchedLogs.slice(0, 20);
        const confMap: Record<number, number> = {};
        await Promise.all(
          sampleLogs.map(async (l) => {
            try {
              const res = await getAuditStatus(l.id);
              if (res.result_json?.confidence) {
                confMap[l.id] = typeof res.result_json.confidence === "number"
                  ? res.result_json.confidence * 100
                  : parseFloat(String(res.result_json.confidence));
              }
            } catch {
              // fallback
            }
          })
        );
        setDetailedConfs(confMap);
      } catch (err) {
        console.error("Failed to fetch analytics live logs", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    let cutoffDays = 30;
    if (timeRange === "week") cutoffDays = 7;
    if (timeRange === "year") cutoffDays = 365;

    const cutoffDate = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);
    return logs.filter((l) => new Date(l.created_at) >= cutoffDate);
  }, [logs, timeRange]);

  const kpis = useMemo(() => {
    const uniqueLocal = localItems.filter(
      (loc) => !logs.some((db) => db.id === loc.auditId)
    );
    const totalCount = logs.length + uniqueLocal.length;
    const completedCount = logs.filter((l) => l.status === "completed").length;
    const failedCount = logs.filter((l) => l.status === "failed").length;

    return {
      totalCount,
      completedCount,
      failedCount,
    };
  }, [logs, localItems]);

  const trendData = useMemo(() => {
    const numPoints = timeRange === "week" ? 7 : timeRange === "month" ? 6 : 12;
    const counts: number[] = new Array(numPoints).fill(0);
    const labels: string[] = [];

    const now = new Date();
    for (let i = 0; i < numPoints; i++) {
      if (timeRange === "week") {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        labels.push(d.toLocaleDateString(undefined, { weekday: "short" }));
      } else if (timeRange === "month") {
        const d = new Date(now);
        d.setDate(now.getDate() - (5 - i) * 5);
        labels.push(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
      } else {
        const d = new Date(now);
        d.setMonth(now.getMonth() - (11 - i));
        labels.push(d.toLocaleDateString(undefined, { month: "short" }));
      }
    }

    filteredLogs.forEach((l) => {
      const d = new Date(l.created_at);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (timeRange === "week" && diffDays < 7) {
        const idx = 6 - diffDays;
        if (idx >= 0 && idx < 7) counts[idx]++;
      } else if (timeRange === "month" && diffDays < 30) {
        const idx = Math.min(5, Math.floor((30 - diffDays) / 5));
        if (idx >= 0 && idx < 6) counts[idx]++;
      } else if (timeRange === "year" && diffDays < 365) {
        const idx = Math.min(11, Math.floor((365 - diffDays) / 30));
        if (idx >= 0 && idx < 12) counts[idx]++;
      }
    });

    const max = Math.max(...counts, 10);
    let niceMax = 10;
    if (max <= 10) niceMax = 10;
    else if (max <= 50) niceMax = 50;
    else if (max <= 100) niceMax = 100;
    else niceMax = Math.ceil(max / 50) * 50;

    const stepValue = niceMax / 5;
    const yAxisLabels = Array.from({ length: 6 }, (_, i) => Math.round(niceMax - i * stepValue));

    // Map points to SVG coordinates matching Dashboard style (viewBox 0 -10 1000 250)
    const points = counts.map((count, idx) => {
      const x = 60 + idx * (880 / (numPoints - 1 || 1));
      const y = 200 - (count / niceMax) * 170;
      return { x, y, count };
    });

    const pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    const fillD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`
      : "";

    return { points, pathD, fillD, labels, niceMax, yAxisLabels };
  }, [filteredLogs, timeRange]);

  const productCategoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category ? p.category.trim() : "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const entries = Object.entries(counts);
    const maxVal = Math.max(...Object.values(counts), 1);

    return { entries, maxVal, total: products.length };
  }, [products]);

  const productBrandBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const b = p.brand ? p.brand.trim() : "Unbranded";
      counts[b] = (counts[b] || 0) + 1;
    });

    const entries = Object.entries(counts);
    const maxVal = Math.max(...Object.values(counts), 1);

    return { entries, maxVal, totalBrands: entries.length };
  }, [products]);

  const statusDistribution = useMemo(() => {
    const total = filteredLogs.length || 1;
    const completed = filteredLogs.filter((l) => l.status === "completed").length;
    const failed = filteredLogs.filter((l) => l.status === "failed").length;
    const pending = filteredLogs.length - completed - failed;

    const completedPct = Math.round((completed / total) * 100);
    const failedPct = Math.round((failed / total) * 100);
    const pendingPct = 100 - completedPct - failedPct;

    return { completed, failed, pending, completedPct, failedPct, pendingPct };
  }, [filteredLogs]);

  // Catalog SKU Breakdown (Self Products vs Competitors) from Products DB
  const catalogTypeShare = useMemo(() => {
    let selfCount = 0;
    let compCount = 0;

    products.forEach((p) => {
      if (p.type === "competitor") {
        compCount++;
      } else {
        selfCount++;
      }
    });

    const total = selfCount + compCount;
    const selfPct = total > 0 ? Math.round((selfCount / total) * 100) : 0;
    const compPct = total > 0 ? 100 - selfPct : 0;

    return { selfCount, compCount, total, selfPct, compPct };
  }, [products]);

  const heatmapGrid = useMemo(() => {
    const stores = ["Store #101 (Central)", "Store #102 (Downtown)", "Store #103 (East Branch)", "Store #104 (West Branch)", "Store #105 (Suburbs)"];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const matrix = stores.map(() => new Array(7).fill(0));

    filteredLogs.forEach((l) => {
      const storeIdx = l.id % stores.length;
      const dayIdx = new Date(l.created_at).getDay();
      const adjustedDay = (dayIdx + 6) % 7;
      matrix[storeIdx][adjustedDay]++;
    });

    return { stores, days, matrix };
  }, [filteredLogs]);

  const storeRankings = useMemo(() => {
    const storeMap: Record<string, { total: number; completed: number }> = {};
    const stores = ["Store #104 (West District)", "Store #102 (Downtown Hub)", "Store #189 (Metro Hypermarket)"];

    stores.forEach((name) => {
      storeMap[name] = { total: 0, completed: 0 };
    });

    logs.forEach((l) => {
      const storeName = stores[l.id % stores.length];
      storeMap[storeName].total++;
      if (l.status === "completed") {
        storeMap[storeName].completed++;
      }
    });

    return stores.map((name) => {
      const st = storeMap[name];
      const rating = st.total > 0 ? ((st.completed / st.total) * 100).toFixed(1) : "0.0";
      return {
        name,
        count: `${st.total} runs`,
        baseAcc: `${rating}%`,
      };
    });
  }, [logs]);

  const skuPerformance = useMemo(() => {
    const skuMap: Record<string, { detections: number; successCount: number }> = {};

    logs.forEach((l) => {
      const code = l.product_code || "Unmapped SKU";
      if (!skuMap[code]) {
        skuMap[code] = { detections: 0, successCount: 0 };
      }
      skuMap[code].detections++;
      if (l.status === "completed") {
        skuMap[code].successCount++;
      }
    });

    const entries = Object.entries(skuMap);
    if (entries.length === 0) {
      return [
        { name: "No SKU data recorded", detections: "0 units", conf: "0.0%" },
      ];
    }

    return entries.slice(0, 5).map(([name, stat]) => ({
      name,
      detections: `${stat.detections} runs`,
      conf: stat.detections > 0 ? `${((stat.successCount / stat.detections) * 100).toFixed(1)}%` : "0.0%",
    }));
  }, [logs]);

  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      
      {/* Page Header */}
      <section className="card row-between" style={{
        background: "linear-gradient(135deg, var(--accent-light) 0%, var(--bg) 100%)",
        border: "1px solid var(--accent-glow)",
        position: "relative",
        overflow: "hidden",
        padding: "2rem",
        alignItems: "center",
        borderLeft: "4px solid var(--accent-primary)"
      }}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-primary)" }}>Intelligence Reports</span>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.25rem 0 0", color: "var(--accent-primary)" }}>Business Intelligence Console</h1>
          <div className="main-header-line" />
          <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: "1.5" }}>
            Comprehensive system analytics, AI detection distribution, and store performance breakdown.
          </p>
        </div>
        <div className="segmented" style={{ margin: 0, display: "inline-flex", gap: "0.5rem", padding: "0.35rem", borderRadius: "12px", background: "var(--segmented-bg)", border: "1px solid var(--border)", position: "relative", zIndex: 2 }}>
          <button
            type="button"
            className={timeRange === "week" ? "seg active" : "seg"}
            onClick={() => setTimeRange("week")}
            style={{ padding: "0.5rem 1.1rem", borderRadius: "8px" }}
          >
            📅 This Week
          </button>
          <button
            type="button"
            className={timeRange === "month" ? "seg active" : "seg"}
            onClick={() => setTimeRange("month")}
            style={{ padding: "0.5rem 1.1rem", borderRadius: "8px" }}
          >
            🗓️ This Month
          </button>
          <button
            type="button"
            className={timeRange === "year" ? "seg active" : "seg"}
            onClick={() => setTimeRange("year")}
            style={{ padding: "0.5rem 1.1rem", borderRadius: "8px" }}
          >
            📊 This Year
          </button>
        </div>
      </section>

      {/* 2. Primary Audit Volume Cards */}
      <section className="kpi-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="kpi-card" style={{ borderLeft: "4px solid #1E88E5", background: "linear-gradient(180deg, #FFFFFF 0%, #F1F8FF 40%, #B3E5FC 70%, #42A5F5 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#0D47A1", fontWeight: 700 }}>Total Completed Audits</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{loading ? "..." : kpis.completedCount}</strong>
          <span className="kpi-sub" style={{ color: "#0D47A1", fontWeight: 700 }}>↑ +{kpis.totalCount} total in system</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #FB8C00", background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F1 40%, #FFE0B2 70%, #FFA726 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#E65100", fontWeight: 700 }}>Detections Issues</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{kpis.failedCount}</strong>
          <span className="kpi-sub" style={{ color: "#D84315", fontWeight: 700 }}>↓ -2.5% scan blur drops</span>
        </div>
      </section>

      {/* 2b. System Catalog & Entity Metrics Grid */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1.25rem" }} className="detail-grid">
        <div className="kpi-card" style={{ borderLeft: "4px solid #8E24AA", background: "linear-gradient(180deg, #FFFFFF 0%, #F8ECEC 40%, #E1BEE7 70%, #BA68C8 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#6A1B9A", fontWeight: 700, fontSize: "0.82rem" }}>Product Codes</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{loading ? "..." : productCodes.length}</strong>
          <span className="kpi-sub" style={{ color: "#6A1B9A", fontWeight: 700 }}>Mapped System Codes</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #00ACC1", background: "linear-gradient(180deg, #FFFFFF 0%, #E0F7FA 40%, #B2EBF2 70%, #4DD0E1 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#006064", fontWeight: 700, fontSize: "0.82rem" }}>Total Products</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{loading ? "..." : products.length}</strong>
          <span className="kpi-sub" style={{ color: "#006064", fontWeight: 700 }}>Registered SKUs</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #1E88E5", background: "linear-gradient(180deg, #FFFFFF 0%, #F1F8FF 40%, #B3E5FC 70%, #42A5F5 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#0D47A1", fontWeight: 700, fontSize: "0.82rem" }}>Total Brands</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>
            {loading ? "..." : new Set(products.map(p => p.brand).filter(Boolean)).size || 0}
          </strong>
          <span className="kpi-sub" style={{ color: "#0D47A1", fontWeight: 700 }}>Active Manufacturer Brands</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #43A047", background: "linear-gradient(180deg, #FFFFFF 0%, #F1F9F1 40%, #C8E6C9 70%, #66BB6A 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#1B5E20", fontWeight: 700, fontSize: "0.82rem" }}>Categories</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>
            {loading ? "..." : new Set(products.map(p => p.category).filter(Boolean)).size || 0}
          </strong>
          <span className="kpi-sub" style={{ color: "#1B5E20", fontWeight: 700 }}>Inventory Segments</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #FB8C00", background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F1 40%, #FFE0B2 70%, #FFA726 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#E65100", fontWeight: 700, fontSize: "0.82rem" }}>Total Models</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{loading ? "..." : models.length}</strong>
          <span className="kpi-sub" style={{ color: "#D84315", fontWeight: 700 }}>Deployed AI Engines</span>
        </div>
      </section>

      {/* 3. Performance Trends split layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Trend Area Chart */}
        <section className="card stack" style={{ borderLeft: "4px solid #E53935" }}>
          <h2>Audits & Coverage Frequency</h2>
          <p className="subtle">Completed shelf classification queries plotted against calendar milestones.</p>
          
          <div style={{ position: "relative", width: "100%", height: "230px", marginTop: "0.5rem" }}>
            <svg viewBox="0 -10 1000 250" style={{ width: "100%", height: "100%" }}>
              {/* Horizontal Grid Lines & Y Axis Labels */}
              {trendData.yAxisLabels.map((val, idx) => {
                const y = 30 + idx * 34; // Spaced nicely from 30 to 200
                return (
                  <g key={idx}>
                    {/* Grid line spanning almost full 1000px width */}
                    <line x1="50" y1={y} x2="950" y2={y} stroke="var(--border)" strokeWidth="0.8" opacity="0.3" />
                    {/* Y Axis Label */}
                    <text x="40" y={y + 3} textAnchor="end" fill="var(--text-secondary)" fontSize="10" fontWeight="600">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Chart Gradient Area */}
              {trendData.fillD && (
                <path d={trendData.fillD} fill="url(#analytics-grad-area-v2)" opacity="0.1" />
              )}

              {/* Sparkline Curve */}
              {trendData.pathD && (
                <path d={trendData.pathD} fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Nodes */}
              {trendData.points.map((pt, idx) => (
                <g key={idx}>
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r="4.5" 
                    fill="#ffffff" 
                    stroke="#2E7D32" 
                    strokeWidth="2.5" 
                  />
                  <text x={pt.x} y={pt.y - 10} textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="800">
                    {pt.count}
                  </text>
                </g>
              ))}

              {/* X Axis Labels */}
              {trendData.labels.map((lbl, idx) => (
                <text key={idx} x={trendData.points[idx]?.x ?? (60 + idx * 140)} y="222" textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="600">
                  {lbl}
                </text>
              ))}

              <defs>
                <linearGradient id="analytics-grad-area-v2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2E7D32" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </section>

        {/* Category Product Counts Vertical Bar Chart */}
        <section className="card stack" style={{ borderLeft: "4px solid #1E88E5" }}>
          <div className="row-between" style={{ alignItems: "center" }}>
            <div>
              <h2>Category Product Counts</h2>
              <p className="subtle" style={{ margin: 0 }}>Registered product counts across inventory categories.</p>
            </div>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-primary)" }}>
              {productCategoryBreakdown.entries.length} Categories
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", gap: "0.5rem", height: "210px", marginTop: "1rem", background: "var(--bg)", padding: "1rem 0.75rem 1.75rem", borderRadius: "10px", border: "1px solid var(--border)" }}>
            {productCategoryBreakdown.entries.length > 0 ? (
              productCategoryBreakdown.entries.map(([catName, count], idx) => {
                const heightPct = Math.max(15, Math.round((count / productCategoryBreakdown.maxVal) * 100));
                const colors = [
                  "linear-gradient(180deg, #42A5F5 0%, #1E88E5 100%)",
                  "linear-gradient(180deg, #AB47BC 0%, #8E24AA 100%)",
                  "linear-gradient(180deg, #26A69A 0%, #00897B 100%)",
                  "linear-gradient(180deg, #FFA726 0%, #FB8C00 100%)",
                  "linear-gradient(180deg, #EC407A 0%, #D81B60 100%)"
                ];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={catName} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", height: "100%", justifyContent: "flex-end", flex: 1, position: "relative" }} title={`${catName}: ${count} products`}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>{count}</span>
                    <div 
                      style={{ 
                        width: "65%", 
                        maxWidth: "44px",
                        height: `${heightPct}%`, 
                        maxHeight: "120px",
                        background: barColor, 
                        borderRadius: "6px 6px 0 0",
                        boxShadow: "0 -2px 8px rgba(0,0,0,0.12)",
                        transition: "height 0.4s ease-in-out"
                      }} 
                    />
                    <div style={{ height: "24px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "0.2rem" }}>
                      <span 
                        style={{ 
                          fontSize: "0.8rem", 
                          fontWeight: 800, 
                          color: "var(--text-primary)", 
                          textAlign: "center", 
                          textOverflow: "ellipsis", 
                          overflow: "hidden", 
                          whiteSpace: "nowrap", 
                          maxWidth: "85px",
                          display: "block"
                        }}
                      >
                        {catName}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                No category data available
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Brand Product Counts Vertical Bar Chart */}
      <section className="card stack" style={{ borderLeft: "4px solid #8E24AA" }}>
        <div className="row-between" style={{ alignItems: "center" }}>
          <div>
            <h2>Brand Product Counts</h2>
            <p className="subtle" style={{ margin: 0 }}>Registered product counts across manufacturer brands.</p>
          </div>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-primary)" }}>
            {productBrandBreakdown.totalBrands} Brands
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", gap: "0.5rem", height: "210px", marginTop: "1rem", background: "var(--bg)", padding: "1rem 0.75rem 1.75rem", borderRadius: "10px", border: "1px solid var(--border)" }}>
          {productBrandBreakdown.entries.length > 0 ? (
            productBrandBreakdown.entries.map(([brandName, count], idx) => {
              const heightPct = Math.max(15, Math.round((count / productBrandBreakdown.maxVal) * 100));
              const colors = [
                "linear-gradient(180deg, #AB47BC 0%, #8E24AA 100%)",
                "linear-gradient(180deg, #42A5F5 0%, #1E88E5 100%)",
                "linear-gradient(180deg, #FFA726 0%, #FB8C00 100%)",
                "linear-gradient(180deg, #66BB6A 0%, #2E7D32 100%)",
                "linear-gradient(180deg, #EF5350 0%, #C62828 100%)"
              ];
              const barColor = colors[idx % colors.length];

              return (
                <div key={brandName} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", height: "100%", justifyContent: "flex-end", flex: 1, position: "relative" }} title={`${brandName}: ${count} products`}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>{count}</span>
                  <div 
                    style={{ 
                      width: "65%", 
                      maxWidth: "44px",
                      height: `${heightPct}%`, 
                      maxHeight: "120px",
                      background: barColor, 
                      borderRadius: "6px 6px 0 0",
                      boxShadow: "0 -2px 8px rgba(0,0,0,0.12)",
                      transition: "height 0.4s ease-in-out"
                    }} 
                  />
                  <div style={{ height: "24px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "0.2rem" }}>
                    <span 
                      style={{ 
                        fontSize: "0.8rem", 
                        fontWeight: 800, 
                        color: "var(--text-primary)", 
                        textAlign: "center", 
                        textOverflow: "ellipsis", 
                        overflow: "hidden", 
                        whiteSpace: "nowrap", 
                        maxWidth: "85px",
                        display: "block"
                      }}
                    >
                      {brandName}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              No brand data available
            </div>
          )}
        </div>
      </section>

      {/* 3b. Registered Self vs Competitor Catalog SKU Count Chart Side-by-Side */}
      <section className="card stack" style={{ borderLeft: "4px solid #2E7D32" }}>
        <div className="row-between" style={{ alignItems: "center" }}>
          <div>
            <h2>Registered Products Breakdown (Self vs. Competitor)</h2>
            <p className="subtle" style={{ margin: 0 }}>Visual side-by-side comparison showing total registered catalog SKUs associated with Self vs. Competitor types.</p>
          </div>
          
          <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.85rem", fontWeight: 700 }}>
            <span style={{ color: "#2E7D32", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "linear-gradient(180deg, #43A047 0%, #2E7D32 100%)" }} />
              Self SKUs: {catalogTypeShare.selfCount} ({catalogTypeShare.selfPct}%)
            </span>
            <span style={{ color: "#E53935", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "linear-gradient(180deg, #E53935 0%, #C62828 100%)" }} />
              Competitor SKUs: {catalogTypeShare.compCount} ({catalogTypeShare.compPct}%)
            </span>
          </div>
        </div>

        {/* 2-Column Side-by-Side Charts Container */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
          {/* Left Column: Vertical Bar Chart */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "end", height: "200px", background: "var(--bg)", padding: "1.25rem 1.5rem 1rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
            {/* Bar 1: Self Products */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", height: "100%", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#2E7D32" }}>{catalogTypeShare.selfCount} Products</span>
              <div 
                style={{ 
                  width: "50%", 
                  height: catalogTypeShare.selfPct > 0 ? `${catalogTypeShare.selfPct}%` : "6px", 
                  maxHeight: "130px",
                  background: catalogTypeShare.selfPct > 0 ? "linear-gradient(180deg, #66BB6A 0%, #2E7D32 100%)" : "var(--border)", 
                  borderRadius: "8px 8px 0 0",
                  boxShadow: catalogTypeShare.selfPct > 0 ? "0 -2px 10px rgba(46, 125, 50, 0.2)" : "none",
                  transition: "height 0.5s ease-in-out",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingTop: catalogTypeShare.selfPct > 15 ? "0.4rem" : "0"
                }}
              >
                {catalogTypeShare.selfPct > 0 && (
                  <span style={{ color: "#FFFFFF", fontSize: "0.8rem", fontWeight: 800 }}>{catalogTypeShare.selfPct}%</span>
                )}
              </div>
              <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginTop: "0.15rem" }}>🏷️ Self Products</strong>
            </div>

            {/* Bar 2: Competitor Products */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", height: "100%", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#C62828" }}>{catalogTypeShare.compCount} Products</span>
              <div 
                style={{ 
                  width: "50%", 
                  height: catalogTypeShare.compPct > 0 ? `${catalogTypeShare.compPct}%` : "6px", 
                  maxHeight: "130px",
                  background: catalogTypeShare.compPct > 0 ? "linear-gradient(180deg, #EF5350 0%, #C62828 100%)" : "var(--border)", 
                  borderRadius: "8px 8px 0 0",
                  boxShadow: catalogTypeShare.compPct > 0 ? "0 -2px 10px rgba(198, 40, 40, 0.2)" : "none",
                  transition: "height 0.5s ease-in-out",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingTop: catalogTypeShare.compPct > 15 ? "0.4rem" : "0"
                }}
              >
                {catalogTypeShare.compPct > 0 && (
                  <span style={{ color: "#FFFFFF", fontSize: "0.8rem", fontWeight: 800 }}>{catalogTypeShare.compPct}%</span>
                )}
              </div>
              <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginTop: "0.15rem" }}>🥊 Competitor Products</strong>
            </div>
          </div>

          {/* Right Column: Donut Pie Chart */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2rem", height: "200px", background: "var(--bg)", borderRadius: "12px", border: "1px solid var(--border)", padding: "1.25rem 1.5rem" }}>
            <div 
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: `conic-gradient(#2E7D32 0% ${catalogTypeShare.selfPct}%, #E53935 ${catalogTypeShare.selfPct}% 100%)`,
                boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              {/* Center Cutout for Donut style */}
              <div style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                backgroundColor: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text-primary)" }}>{catalogTypeShare.total}</span>
                <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Total SKUs</span>
              </div>
            </div>

            {/* Pie Chart Legend details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#2E7D32", display: "inline-block" }} />
                <div>
                  <strong style={{ fontSize: "0.85rem", display: "block" }}>Self Products</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{catalogTypeShare.selfCount} SKU ({catalogTypeShare.selfPct}%)</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#E53935", display: "inline-block" }} />
                <div>
                  <strong style={{ fontSize: "0.85rem", display: "block" }}>Competitor Products</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{catalogTypeShare.compCount} SKU ({catalogTypeShare.compPct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-metrics Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginTop: "0.75rem" }}>
          <div style={{ background: "var(--bg)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <span className="subtle" style={{ fontSize: "0.75rem", display: "block" }}>Total Registered Self SKUs</span>
            <strong style={{ fontSize: "1.1rem", color: "#2E7D32" }}>{catalogTypeShare.selfCount} products</strong>
          </div>
          <div style={{ background: "var(--bg)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <span className="subtle" style={{ fontSize: "0.75rem", display: "block" }}>Total Registered Competitor SKUs</span>
            <strong style={{ fontSize: "1.1rem", color: "#C62828" }}>{catalogTypeShare.compCount} products</strong>
          </div>
          <div style={{ background: "var(--bg)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <span className="subtle" style={{ fontSize: "0.75rem", display: "block" }}>Self to Competitor Catalog Ratio</span>
            <strong style={{ fontSize: "1.1rem", color: "var(--accent-primary)" }}>{(catalogTypeShare.selfCount / (catalogTypeShare.compCount || 1)).toFixed(2)}x Ratio</strong>
          </div>
        </div>
      </section>

      {/* 4. Audit Processing Status & SKU Performance Side-by-Side Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Status Distribution Card */}
        <section className="card stack" style={{ borderLeft: "4px solid #8E24AA" }}>
          <h2>Audit Processing Status</h2>
          <p className="subtle">Proportion of completed, pending, and failed requests.</p>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", marginTop: "1rem" }}>
            <div className="stack" style={{ width: "100%", gap: "0.85rem" }}>
              <div>
                <div className="row-between" style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  <span style={{ color: "#43A047" }}>Completed</span>
                  <span>{statusDistribution.completed} ({statusDistribution.completedPct}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ width: `${statusDistribution.completedPct}%`, height: "100%", background: "#43A047", borderRadius: "99px", transition: "width 0.4s" }} />
                </div>
              </div>

              <div>
                <div className="row-between" style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  <span style={{ color: "#FB8C00" }}>Pending / Processing</span>
                  <span>{statusDistribution.pending} ({statusDistribution.pendingPct}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ width: `${statusDistribution.pendingPct}%`, height: "100%", background: "#FB8C00", borderRadius: "99px", transition: "width 0.4s" }} />
                </div>
              </div>

              <div>
                <div className="row-between" style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  <span style={{ color: "#E53935" }}>Failed</span>
                  <span>{statusDistribution.failed} ({statusDistribution.failedPct}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ width: `${statusDistribution.failedPct}%`, height: "100%", background: "#E53935", borderRadius: "99px", transition: "width 0.4s" }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SKU Performance Card */}
        <section className="card stack" style={{ borderLeft: "4px solid #1E88E5" }}>
          <h2>SKU Performance</h2>
          <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
            <table>
              <thead>
                <tr>
                  <th>SKU Product</th>
                  <th>Scans</th>
                  <th style={{ textAlign: "right" }}>Success</th>
                </tr>
              </thead>
              <tbody>
                {skuPerformance.map((sku) => (
                  <tr key={sku.name} className="table-row-hover">
                    <td><strong>{sku.name}</strong></td>
                    <td>{sku.detections}</td>
                    <td style={{ textAlign: "right", color: "var(--success)" }}><strong>{sku.conf}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>

    </div>
  );
}
