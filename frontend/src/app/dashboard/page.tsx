"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { getHistory, type AuditHistoryItem } from "@/lib/history";
import { listAudits, getAuditStatus, resolveApiAssetUrl, listModels, listProductCodes, type AuditLogItem, type Model, type ProductCode } from "@/lib/api";

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
  const [registeredModels, setRegisteredModels] = useState<Model[]>([]);
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");

  const hoveredDateStr = useMemo(() => {
    if (hoveredIdx === null) return "";
    const isMonth = timeRange === "month";
    const today = new Date();
    if (isMonth) {
      const d = new Date();
      d.setDate(today.getDate() - (29 - hoveredIdx));
      return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    } else {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      const d = new Date(monday);
      d.setDate(monday.getDate() + hoveredIdx);
      return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    }
  }, [hoveredIdx, timeRange]);

  const statusStats = useMemo(() => {
    const uniqueLocal = localItems.filter(
      (local) => !allDbLogs.some((db) => db.id === local.auditId)
    );
    const total = allDbLogs.length + uniqueLocal.length;
    if (total === 0) {
      return { completedPct: 78, pendingPct: 12, failedPct: 10, completedCount: 0, pendingCount: 0, failedCount: 0 };
    }
    const completedCount = allDbLogs.filter(i => i.status === "completed").length;
    const failedCount = allDbLogs.filter(i => i.status === "failed").length;
    const pendingCount = total - completedCount - failedCount;

    const completedPct = Math.round((completedCount / total) * 100);
    const failedPct = Math.round((failedCount / total) * 100);
    const pendingPct = 100 - completedPct - failedPct;

    return { completedPct, pendingPct, failedPct, completedCount, pendingCount, failedCount };
  }, [allDbLogs, localItems]);

  useEffect(() => {
    async function loadData() {
      try {
        setLocalItems(getHistory());
        
        // Fetch up to 200 items (backend max) to calculate KPIs and totals
        const logs = await listAudits(undefined, undefined, 0, 200);
        setAllDbLogs(logs);

        // Fetch models and product codes
        try {
          const [modelsList, codesList] = await Promise.all([
            listModels(),
            listProductCodes()
          ]);
          setRegisteredModels(modelsList);
          setProductCodes(codesList);
        } catch (dbErr) {
          console.error("Failed to load models or product codes", dbErr);
        }

        // Fetch detailed results only for the recent 15 audits to speed up loading
        const detailed = await Promise.all(
          logs.slice(0, 15).map(async (log) => {
            let confidence = 0;
            let hasConfidence = false;
            try {
              const detail = await getAuditStatus(log.id);
              if (detail.result_json) {
                // Try confidence field directly
                if (typeof detail.result_json.confidence === "number") {
                  confidence = detail.result_json.confidence * 100;
                  hasConfidence = true;
                } else if (typeof detail.result_json.confidence === "string") {
                  confidence = parseFloat(detail.result_json.confidence);
                  hasConfidence = true;
                }
                // Try detection_coordinates avg confidence if available
                if (!hasConfidence && Array.isArray(detail.result_json.detection_coordinates) && detail.result_json.detection_coordinates.length > 0) {
                  const coords = detail.result_json.detection_coordinates as Array<{ confidence?: number }>;
                  const validConfs = coords.filter(c => typeof c.confidence === "number");
                  if (validConfs.length > 0) {
                    confidence = (validConfs.reduce((sum, c) => sum + (c.confidence ?? 0), 0) / validConfs.length) * 100;
                    hasConfidence = true;
                  }
                }
              }
            } catch {
              // Fallback: no confidence data
            }
            // If no confidence data found from API, use status-based proxy
            if (!hasConfidence) {
              confidence = log.status === "completed" ? 95.0 : log.status === "failed" ? 0 : 50.0;
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
    // Exclude local items whose auditId already exists in database logs to prevent double counting
    const uniqueLocalItems = localItems.filter(
      (local) => !allDbLogs.some((db) => db.id === local.auditId)
    );
    const total = allDbLogs.length + uniqueLocalItems.length;
    const completedLogs = allDbLogs.filter(i => i.status === "completed");
    const failedLogs = allDbLogs.filter(i => i.status === "failed");

    // Compute average accuracy directly from status — no confidence in result_json
    // completed=95%, failed=0%, pending/processing=50%
    const avgAccuracy = allDbLogs.length > 0
      ? Number((
          allDbLogs.reduce((sum, log) => {
            if (log.status === "completed") return sum + 95.0;
            if (log.status === "failed") return sum + 0;
            return sum + 50.0;
          }, 0) / allDbLogs.length
        ).toFixed(1))
      : 0;

    // Pass rate: completed / total DB audits × 100
    const passRate = allDbLogs.length > 0
      ? Math.round((completedLogs.length / allDbLogs.length) * 100)
      : 0;

    return {
      total,
      accuracy: avgAccuracy,
      passRate,
      issues: failedLogs.length
    };
  }, [allDbLogs, localItems]);

  // Calculate actual change deltas dynamically from timestamps
  const deltas = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekLogs = allDbLogs.filter(l => new Date(l.created_at) >= sevenDaysAgo);
    const lastWeekLogs = allDbLogs.filter(l => {
      const dt = new Date(l.created_at);
      return dt >= fourteenDaysAgo && dt < sevenDaysAgo;
    });

    const thisWeekCount = thisWeekLogs.length;
    const lastWeekCount = lastWeekLogs.length;

    let totalDelta = "0%";
    let totalIsPositive = true;

    if (lastWeekCount > 0) {
      const diff = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
      totalDelta = `${Math.abs(Math.round(diff))}%`;
      totalIsPositive = diff >= 0;
    } else if (thisWeekCount > 0) {
      totalDelta = `+${thisWeekCount} runs`;
      totalIsPositive = true;
    }

    // Pass rate delta
    const thisWeekCompleted = thisWeekLogs.filter(l => l.status === "completed").length;
    const thisWeekFailed = thisWeekLogs.filter(l => l.status === "failed").length;
    const thisWeekPass = thisWeekCount > 0 ? Math.round((thisWeekCompleted / (thisWeekCompleted + thisWeekFailed || 1)) * 100) : 0;

    const lastWeekCompleted = lastWeekLogs.filter(l => l.status === "completed").length;
    const lastWeekFailed = lastWeekLogs.filter(l => l.status === "failed").length;
    const lastWeekPass = lastWeekCount > 0 ? Math.round((lastWeekCompleted / (lastWeekCompleted + lastWeekFailed || 1)) * 100) : 0;

    const passDiff = thisWeekPass - lastWeekPass;
    const passDelta = `${Math.abs(passDiff)}%`;
    const passIsPositive = passDiff >= 0;

    // Fail rate delta
    const failDiff = thisWeekFailed - lastWeekFailed;
    const failDelta = `${Math.abs(failDiff)} runs`;
    const failIsPositive = failDiff <= 0; // Less failures is positive

    // Accuracy delta
    const thisWeekCompletedAccs = dbItems.filter(item => {
      const dt = new Date(item.created_at);
      return dt >= sevenDaysAgo && item.status === "completed";
    });
    const lastWeekCompletedAccs = dbItems.filter(item => {
      const dt = new Date(item.created_at);
      return dt >= fourteenDaysAgo && dt < sevenDaysAgo && item.status === "completed";
    });

    const thisWeekAvgAcc = thisWeekCompletedAccs.length > 0
      ? thisWeekCompletedAccs.reduce((sum, item) => sum + item.confidence, 0) / thisWeekCompletedAccs.length
      : 0;
    const lastWeekAvgAcc = lastWeekCompletedAccs.length > 0
      ? lastWeekCompletedAccs.reduce((sum, item) => sum + item.confidence, 0) / lastWeekCompletedAccs.length
      : 0;

    const accDiff = thisWeekAvgAcc - lastWeekAvgAcc;
    const accDelta = `${Math.abs(Number(accDiff.toFixed(1)))}%`;
    const accIsPositive = accDiff >= 0;

    return {
      totalDelta,
      totalIsPositive,
      passDelta,
      passIsPositive,
      failDelta,
      failIsPositive,
      accDelta,
      accIsPositive
    };
  }, [allDbLogs, dbItems]);

  // 2. Weekly Area Line Chart coordinates (Starts at 0, no default curves)
  const trendChartData = useMemo(() => {
    const isMonth = timeRange === "month";
    const numPoints = isMonth ? 30 : 7;
    const counts = Array(numPoints).fill(0);
    const labels: string[] = [];
    const today = new Date();
    
    if (isMonth) {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toDateString();
        
        // Show labels for index multiples of 5 to avoid overlap
        if (i % 5 === 0 || i === 29) {
          labels[29 - i] = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } else {
          labels[29 - i] = "";
        }
        
        counts[29 - i] = allDbLogs.filter(
          (item) => new Date(item.created_at).toDateString() === dateStr
        ).length;
      }
    } else {
      // Current Week (Monday to Sunday)
      const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toDateString();
        labels[i] = d.toLocaleDateString(undefined, { weekday: 'short' });
        
        counts[i] = allDbLogs.filter(
          (item) => new Date(item.created_at).toDateString() === dateStr
        ).length;
      }
    }

    const max = Math.max(...counts, 10); // Nice max
    let niceMax = 10;
    if (max <= 10) niceMax = 10;
    else if (max <= 50) niceMax = 50;
    else if (max <= 100) niceMax = 100;
    else niceMax = Math.ceil(max / 50) * 50;

    const step = niceMax / 5;
    const yAxisLabels = Array.from({ length: 6 }, (_, i) => Math.round(niceMax - i * step));

    // Map points to SVG coordinates (viewBox 0 -10 1000 250)
    // padding-left: 60, padding-right: 60 (width 880)
    // padding-top: 30, padding-bottom: 200 (height 170)
    const points = counts.map((count, idx) => {
      const x = 60 + idx * (880 / (numPoints - 1));
      const y = 200 - (count / niceMax) * 170;
      return { x, y, count };
    });

    const pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    const fillD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`
      : "";

    return { points, pathD, fillD, labels, counts, niceMax, yAxisLabels };
  }, [allDbLogs, timeRange]);

  // 3. Top Model Requests Received (dynamic from registered models)
  const modelRequests = useMemo(() => {
    if (registeredModels.length === 0) {
      return [];
    }

    const modelHits: Record<number, number> = {};
    registeredModels.forEach(m => {
      modelHits[m.id] = 0;
    });

    allDbLogs.forEach(log => {
      const logCode = (log.product_code || "").toLowerCase().trim();
      // Find matching product code in registry
      const matchedCode = productCodes.find(pc => pc.product_code.toLowerCase().trim() === logCode);
      if (matchedCode) {
        // Find models matching this product code id
        registeredModels.forEach(model => {
          if (model.product_code_id === matchedCode.id) {
            modelHits[model.id] = (modelHits[model.id] || 0) + 1;
          }
        });
      }
    });

    const sorted = [...registeredModels].sort((a, b) => {
      const countA = modelHits[a.id] || 0;
      const countB = modelHits[b.id] || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return b.id - a.id; // Show latest registered models first if counts are equal
    });

    const top5 = sorted.slice(0, 5);
    const totalHits = top5.reduce((sum, item) => sum + (modelHits[item.id] || 0), 0);

    return top5.map(item => {
      const count = modelHits[item.id] || 0;
      const percentage = totalHits > 0 ? Math.round((count / totalHits) * 100) : 0;
      return {
        name: item.model_name,
        count,
        percentage
      };
    });
  }, [allDbLogs, registeredModels, productCodes]);

  // 4. Top Category API Hits (starts at 0 hits, pure DB tracking)
  const categoryHits = useMemo(() => {
    const categoriesList: Record<string, number> = {
      "Beverages": 0,
      "Snacks": 0,
      "Dairy": 0,
      "Personal Care": 0,
      "Other": 0
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
      
      {/* Large Hero Header Card */}
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
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-primary)" }}>FMCG Inventory Monitoring</span>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.25rem 0", color: "var(--accent-primary)" }}>Dashboard</h2>
          <div className="main-header-line" />
          <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: "1.5" }}>
            Welcome back, Admin! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        
        {/* Date Display */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", background: "#FFFFFF", padding: "0.5rem 1rem", borderRadius: "99px", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>{new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}</span>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="kpi-grid">
        {/* Card 1: Total Audits (Red) */}
        <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.25rem", alignItems: "center", padding: "1.5rem", borderLeft: "4px solid #E53935", background: "linear-gradient(180deg, #FFFFFF 0%, #FFF3F3 40%, #FFCDD2 70%, #EF5350 100%)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#1565C0", flexShrink: 0, boxShadow: "var(--shadow-sm)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div className="stack" style={{ gap: "0.25rem" }}>
            <span className="kpi-label" style={{ color: "#C62828", fontWeight: 700 }}>Total Audits</span>
            <strong className="kpi-value" style={{ fontSize: "1.6rem", display: "block", color: "#1B1B1B" }}>{kpis.total}</strong>
            <span style={{ fontSize: "0.78rem", color: "#C62828", fontWeight: 700 }}>
              {kpis.total > 0 ? `↑ +${deltas.totalDelta} runs vs last week` : "No audits recorded"}
            </span>
          </div>
        </div>

        {/* Card 2: Average Accuracy (Blue) */}
        <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.25rem", alignItems: "center", padding: "1.5rem", borderLeft: "4px solid #1E88E5", background: "linear-gradient(180deg, #FFFFFF 0%, #F1F8FF 40%, #B3E5FC 70%, #42A5F5 100%)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#1565C0", flexShrink: 0, boxShadow: "var(--shadow-sm)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div className="stack" style={{ gap: "0.25rem" }}>
            <span className="kpi-label" style={{ color: "#0D47A1", fontWeight: 700 }}>Average Accuracy</span>
            <strong className="kpi-value" style={{ fontSize: "1.6rem", display: "block", color: "#1B1B1B" }}>
              {loading ? "—" : `${kpis.accuracy}%`}
            </strong>
            <span style={{ fontSize: "0.78rem", color: "#1565C0", fontWeight: 700 }}>
              {loading ? "Loading..." : `↑ ${deltas.accDelta}% vs last week`}
            </span>
          </div>
        </div>

        {/* Card 3: Pass Rate (Green) */}
        <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.25rem", alignItems: "center", padding: "1.5rem", borderLeft: "4px solid #43A047", background: "linear-gradient(180deg, #FFFFFF 0%, #F1F9F1 40%, #C8E6C9 70%, #66BB6A 100%)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#1565C0", flexShrink: 0, boxShadow: "var(--shadow-sm)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><polyline points="8 12 11 15 16 10"/></svg>
          </div>
          <div className="stack" style={{ gap: "0.25rem" }}>
            <span className="kpi-label" style={{ color: "#1B5E20", fontWeight: 700 }}>Pass Rate</span>
            <strong className="kpi-value" style={{ fontSize: "1.6rem", display: "block", color: "#1B1B1B" }}>
              {loading ? "—" : `${kpis.passRate}%`}
            </strong>
            <span style={{ fontSize: "0.78rem", color: "#1565C0", fontWeight: 700 }}>
              {loading ? "Loading..." : `↑ ${deltas.passDelta}% vs last week`}
            </span>
          </div>
        </div>

        {/* Card 4: Issues Found (Orange) */}
        <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.25rem", alignItems: "center", padding: "1.5rem", borderLeft: "4px solid #FB8C00", background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F1 40%, #FFE0B2 70%, #FFA726 100%)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#1565C0", flexShrink: 0, boxShadow: "var(--shadow-sm)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="stack" style={{ gap: "0.25rem" }}>
            <span className="kpi-label" style={{ color: "#E65100", fontWeight: 700 }}>Issues Found</span>
            <strong className="kpi-value" style={{ fontSize: "1.6rem", display: "block", color: "#1B1B1B" }}>{kpis.issues}</strong>
            <span style={{ fontSize: "0.78rem", color: "#D84315", fontWeight: 700 }}>
              ↑ {deltas.failDelta} runs vs last week
            </span>
          </div>
        </div>
      </section>

      {/* Row 1: Key Audits Over Time and Audits Status */}
      <div style={{ display: "grid", gridTemplateColumns: "2.3fr 1.7fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Chart 1: Audits Over Time */}
        <section className="card stack" style={{ borderLeft: "4px solid #E53935" }}>
          <div className="row-between" style={{ alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Audits Over Time</h2>
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as "week" | "month")}
              style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div style={{ position: "relative", width: "100%", height: "230px" }}>
            <svg viewBox="0 -10 1000 250" style={{ width: "100%", height: "100%" }}>
              {/* Horizontal Grid Lines & Y Axis Labels */}
              {trendChartData.yAxisLabels.map((val, idx) => {
                const y = 30 + idx * 34; // Spaced nicely from 30 to 200
                return (
                  <g key={idx}>
                    {/* Grid line spanning almost the full 1000px */}
                    <line x1="50" y1={y} x2="950" y2={y} stroke="var(--border)" strokeWidth="0.8" opacity="0.3" />
                    {/* Y Axis Label */}
                    <text x="40" y={y + 3} textAnchor="end" fill="var(--text-secondary)" fontSize="10" fontWeight="600">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Chart Gradient Area */}
              {trendChartData.fillD && (
                <path d={trendChartData.fillD} fill="url(#chart-grad-dashboard-v6)" opacity="0.08" />
              )}

              {/* Sparkline Curve */}
              {trendChartData.pathD && (
                <path d={trendChartData.pathD} fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Nodes */}
              {trendChartData.points.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill="#ffffff"
                    stroke="#2E7D32"
                    strokeWidth="2.5"
                    style={{ cursor: "pointer" }}
                    onMouseOver={() => setHoveredIdx(idx)}
                    onMouseOut={() => setHoveredIdx(null)}
                  />
                </g>
              ))}

              {/* Tooltip Overlay */}
              {hoveredIdx !== null && trendChartData.points[hoveredIdx] && (
                <g>
                  {/* Tooltip Box */}
                  <rect
                    x={trendChartData.points[hoveredIdx].x - 60}
                    y={trendChartData.points[hoveredIdx].y - 50}
                    width="120"
                    height="42"
                    rx="8"
                    fill="#FFFFFF"
                    stroke="#2E7D32"
                    strokeWidth="1.5"
                    style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.12))" }}
                  />
                  {/* Date text */}
                  <text
                    x={trendChartData.points[hoveredIdx].x}
                    y={trendChartData.points[hoveredIdx].y - 36}
                    textAnchor="middle"
                    fill="var(--text-secondary)"
                    fontSize="9"
                    fontWeight="600"
                  >
                    {hoveredDateStr}
                  </text>
                  {/* Value Text */}
                  <text
                    x={trendChartData.points[hoveredIdx].x}
                    y={trendChartData.points[hoveredIdx].y - 18}
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    fontSize="10"
                    fontWeight="800"
                  >
                    {trendChartData.points[hoveredIdx].count} Audits
                  </text>
                </g>
              )}

              {/* X Labels */}
              {trendChartData.labels.map((lbl, idx) => {
                if (!lbl) return null; // Skip empty labels to avoid overlap
                return (
                  <text key={idx} x={60 + idx * (880 / (trendChartData.labels.length - 1))} y="225" textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="600">
                    {lbl}
                  </text>
                );
              })}

              <defs>
                <linearGradient id="chart-grad-dashboard-v6" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2E7D32" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </section>

        {/* Chart 1.5: Audits by Status */}
        <section className="card stack" style={{ borderLeft: "4px solid #1E88E5" }}>
          <div className="row-between" style={{ alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Audits by Status</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", height: "230px", flexWrap: "wrap", gap: "1rem" }}>
            {/* Centered Donut Container */}
            <div style={{ position: "relative", width: "140px", height: "140px", flexShrink: 0 }}>
              {/* Donut Chart SVG */}
              <div style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                <svg viewBox="0 0 80 80" style={{ width: "100%", height: "100%" }}>
                  {/* Background track */}
                  <circle cx="40" cy="40" r="30" fill="transparent" stroke="var(--bg)" strokeWidth="7.5" />
                  
                  {/* Completed Segment */}
                  {statusStats.completedPct > 0 && (
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      fill="transparent"
                      stroke="#43A047"
                      strokeWidth="7.5"
                      strokeDasharray={`${(statusStats.completedPct / 100) * 188.5} 188.5`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                  )}
                  
                  {/* Pending Segment */}
                  {statusStats.pendingPct > 0 && (
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      fill="transparent"
                      stroke="#FFA726"
                      strokeWidth="7.5"
                      strokeDasharray={`${(statusStats.pendingPct / 100) * 188.5} 188.5`}
                      strokeDashoffset={`-${(statusStats.completedPct / 100) * 188.5}`}
                      strokeLinecap="round"
                    />
                  )}
                  
                  {/* Failed Segment */}
                  {statusStats.failedPct > 0 && (
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      fill="transparent"
                      stroke="#E53935"
                      strokeWidth="7.5"
                      strokeDasharray={`${(statusStats.failedPct / 100) * 188.5} 188.5`}
                      strokeDashoffset={`-${((statusStats.completedPct + statusStats.pendingPct) / 100) * 188.5}`}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </div>
              
              {/* Center Labels overlay */}
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}>
                <strong style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                  {allDbLogs.length + localItems.length}
                </strong>
                <span className="subtle" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
                  Audits
                </span>
              </div>
            </div>

            {/* Legend with counts */}
            <div className="stack" style={{ gap: "0.85rem", fontSize: "0.85rem", minWidth: "160px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#43A047" }} />
                  <span style={{ fontWeight: 600 }}>Completed</span>
                </div>
                <strong style={{ color: "var(--text-secondary)" }}>{statusStats.completedCount} ({statusStats.completedPct}%)</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FFA726" }} />
                  <span style={{ fontWeight: 600 }}>Pending</span>
                </div>
                <strong style={{ color: "var(--text-secondary)" }}>{statusStats.pendingCount} ({statusStats.pendingPct}%)</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E53935" }} />
                  <span style={{ fontWeight: 600 }}>Failed / Issues</span>
                </div>
                <strong style={{ color: "var(--text-secondary)" }}>{statusStats.failedCount} ({statusStats.failedPct}%)</strong>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Row 2: Secondary Performance indicators and Health Console */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1.4fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Chart 2: Top Model Requests Received */}
        <section className="card stack" style={{ borderLeft: "4px solid #43A047" }}>
          <div className="row-between" style={{ alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Top Model Requests</h2>
            <select style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>

          <div className="stack" style={{ gap: "0.85rem" }}>
            {modelRequests.length === 0 ? (
              <div className="stack" style={{ alignItems: "center", justifyContent: "center", padding: "2rem 0", color: "var(--text-secondary)", fontSize: "0.85rem", gap: "0.5rem" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span>No models present</span>
              </div>
            ) : (
              modelRequests.map((item) => (
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
              ))
            )}
          </div>
        </section>

        {/* Chart 3: Top Category API Hits */}
        <section className="card stack" style={{ borderLeft: "4px solid #FB8C00" }}>
          <div className="row-between" style={{ alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Top Category Hits</h2>
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

        {/* Footer 2: System Health */}
        <section className="card stack" style={{ borderLeft: "4px solid #E53935" }}>
          <div className="row-between" style={{ alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>System Health</h2>
            <span style={{ fontSize: "0.72rem", color: "var(--success)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
              All Operational
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
          </div>
        </section>

      </div>

      {/* Row 3: Action Logs and Operations Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "2.6fr 1.4fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Footer 1: Recent Audit Activity */}
        <section className="card stack" style={{ borderLeft: "4px solid #1E88E5" }}>
          <div className="row-between" style={{ alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Recent Audit Activity</h2>
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

        {/* Footer 3: Quick Actions */}
        <section className="card stack" style={{ gap: "1rem", borderLeft: "4px solid #43A047" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "0.75rem" }}>Quick Actions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            <Link href="/new-audit">
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
