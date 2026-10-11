"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listAudits,
  getAuditStatus,
  listProductCodes,
  listProducts,
  listModels,
  updateProduct,
  updateProductCodeByName,
  toggleModelActive,
  type AuditLogItem,
  type ProductCode,
  type Product,
  type Model,
} from "@/lib/api";
import { getHistory, type AuditHistoryItem } from "@/lib/history";
import AuditReportExportModal from "@/components/AuditReportExportModal";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [activeTab, setActiveTab] = useState<"products" | "codes" | "models">("products");

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [localItems, setLocalItems] = useState<AuditHistoryItem[]>([]);
  const [detailedConfs, setDetailedConfs] = useState<Record<number, number>>({});
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  const [togglingId, setTogglingId] = useState<string | number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const refreshData = async () => {
    try {
      const [codesList, productsList, modelsList] = await Promise.all([
        listProductCodes().catch(() => []),
        listProducts().catch(() => []),
        listModels().catch(() => []),
      ]);
      setProductCodes(codesList);
      setProducts(productsList);
      setModels(modelsList);
    } catch (err) {
      console.error("Failed to refresh catalog metrics", err);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        setLocalItems(getHistory());
        const [fetchedLogs, codesList, productsList, modelsList] = await Promise.all([
          listAudits(undefined, undefined, 0, 200),
          listProductCodes().catch(() => []),
          listProducts().catch(() => []),
          listModels().catch(() => []),
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
                confMap[l.id] =
                  typeof res.result_json.confidence === "number"
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

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Active / Inactive status metrics calculation
  const entityMetrics = useMemo(() => {
    const activeCodesCount = productCodes.filter(
      (c) => (c.status || "active").toLowerCase() === "active"
    ).length;
    const inactiveCodesCount = productCodes.length - activeCodesCount;
    const codeActivePct =
      productCodes.length > 0 ? Math.round((activeCodesCount / productCodes.length) * 100) : 0;

    const activeProductsCount = products.filter(
      (p) => (p.status || "active").toLowerCase() === "active"
    ).length;
    const inactiveProductsCount = products.length - activeProductsCount;
    const productActivePct =
      products.length > 0 ? Math.round((activeProductsCount / products.length) * 100) : 0;

    const activeModelsCount = models.filter((m) => m.is_active).length;
    const inactiveModelsCount = models.length - activeModelsCount;
    const modelActivePct =
      models.length > 0 ? Math.round((activeModelsCount / models.length) * 100) : 0;

    const totalAssets = productCodes.length + products.length + models.length;
    const totalActiveAssets = activeCodesCount + activeProductsCount + activeModelsCount;
    const overallActivePct =
      totalAssets > 0 ? Math.round((totalActiveAssets / totalAssets) * 100) : 0;

    return {
      codes: { total: productCodes.length, active: activeCodesCount, inactive: inactiveCodesCount, pct: codeActivePct },
      products: { total: products.length, active: activeProductsCount, inactive: inactiveProductsCount, pct: productActivePct },
      models: { total: models.length, active: activeModelsCount, inactive: inactiveModelsCount, pct: modelActivePct },
      overall: { total: totalAssets, active: totalActiveAssets, inactive: totalAssets - totalActiveAssets, pct: overallActivePct },
    };
  }, [productCodes, products, models]);

  // Status Filtered Entity Sets
  const filteredProducts = useMemo(() => {
    if (statusFilter === "active") return products.filter((p) => (p.status || "active").toLowerCase() === "active");
    if (statusFilter === "inactive") return products.filter((p) => (p.status || "active").toLowerCase() === "inactive");
    return products;
  }, [products, statusFilter]);

  const filteredProductCodes = useMemo(() => {
    if (statusFilter === "active") return productCodes.filter((c) => (c.status || "active").toLowerCase() === "active");
    if (statusFilter === "inactive") return productCodes.filter((c) => (c.status || "active").toLowerCase() === "inactive");
    return productCodes;
  }, [productCodes, statusFilter]);

  const filteredModels = useMemo(() => {
    if (statusFilter === "active") return models.filter((m) => m.is_active);
    if (statusFilter === "inactive") return models.filter((m) => !m.is_active);
    return models;
  }, [models, statusFilter]);

  // Action handlers for toggling active/inactive status
  const handleToggleProductStatus = async (prod: Product) => {
    const isCurrentlyActive = (prod.status || "active").toLowerCase() === "active";
    const targetStatus = isCurrentlyActive ? "inactive" : "active";
    setTogglingId(`prod-${prod.id}`);
    try {
      await updateProduct(prod.id, {
        product_code_id: prod.product_code_id,
        product_name: prod.product_name,
        brand: prod.brand || undefined,
        category: prod.category || undefined,
        ai_code: prod.ai_code || undefined,
        type: prod.type || undefined,
        status: targetStatus,
      });
      setToast({
        message: `Product "${prod.product_name}" status updated to ${targetStatus.toUpperCase()}`,
        type: "success",
      });
      await refreshData();
    } catch (err) {
      setToast({ message: `Failed to update product status: ${String(err)}`, type: "error" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleCodeStatus = async (code: ProductCode) => {
    const isCurrentlyActive = (code.status || "active").toLowerCase() === "active";
    const targetStatus = isCurrentlyActive ? "inactive" : "active";
    setTogglingId(`code-${code.id}`);
    try {
      await updateProductCodeByName(code.product_code, {
        product_code: code.product_code,
        description: code.description || undefined,
        status: targetStatus,
      });
      setToast({
        message: `Product Code "${code.product_code}" status updated to ${targetStatus.toUpperCase()} (cascaded to mapped products & models)`,
        type: "success",
      });
      await refreshData();
    } catch (err) {
      setToast({ message: `Failed to update product code status: ${String(err)}`, type: "error" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleModelStatus = async (mod: Model) => {
    setTogglingId(`mod-${mod.id}`);
    try {
      await toggleModelActive(mod.id);
      const targetState = mod.is_active ? "INACTIVE" : "ACTIVE";
      setToast({ message: `Model "${mod.model_name}" status set to ${targetState}`, type: "success" });
      await refreshData();
    } catch (err) {
      setToast({ message: `Failed to toggle model active status: ${String(err)}`, type: "error" });
    } finally {
      setTogglingId(null);
    }
  };

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
    filteredProducts.forEach((p) => {
      const cat = p.category ? p.category.trim() : "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const entries = Object.entries(counts);
    const maxVal = Math.max(...Object.values(counts), 1);

    return { entries, maxVal, total: filteredProducts.length };
  }, [filteredProducts]);

  const productBrandBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredProducts.forEach((p) => {
      const b = p.brand ? p.brand.trim() : "Unbranded";
      counts[b] = (counts[b] || 0) + 1;
    });

    const entries = Object.entries(counts);
    const maxVal = Math.max(...Object.values(counts), 1);

    return { entries, maxVal, totalBrands: entries.length };
  }, [filteredProducts]);

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

  const catalogTypeShare = useMemo(() => {
    let selfCount = 0;
    let compCount = 0;

    filteredProducts.forEach((p) => {
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
  }, [filteredProducts]);

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
      {/* Notification Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "1.5rem",
            right: "1.5rem",
            zIndex: 9999,
            background: toast.type === "success" ? "#1B5E20" : "#C62828",
            color: "#FFFFFF",
            padding: "0.85rem 1.4rem",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontSize: "0.9rem",
            fontWeight: 700,
            animation: "fadeIn 0.3s ease-in-out",
          }}
        >
          <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <section
        className="card row-between"
        style={{
          background: "linear-gradient(135deg, var(--accent-light) 0%, var(--bg) 100%)",
          border: "1px solid var(--accent-glow)",
          position: "relative",
          overflow: "hidden",
          padding: "2rem",
          alignItems: "center",
          borderLeft: "4px solid var(--accent-primary)",
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>
          <span
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "var(--accent-primary)",
            }}
          >
            Intelligence Reports
          </span>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.25rem 0 0", color: "var(--accent-primary)" }}>
            Business Intelligence Console
          </h1>
          <div className="main-header-line" />
          <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: "1.5" }}>
            Comprehensive system analytics, operational health, active/inactive catalog distribution, and AI model performance.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="button-primary"
            style={{
              padding: "0.7rem 1.4rem",
              borderRadius: "12px",
              fontSize: "0.9rem",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 6px 18px rgba(46, 125, 50, 0.28)",
            }}
          >
            📥 Export Audit Reports
          </button>
        </div>
      </section>

      {/* 2. Organized Control & Filter Toolbar Card */}
      <section
        className="card"
        style={{
          padding: "1rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          borderRadius: "14px",
          border: "1px solid var(--border)",
          borderLeft: "4px solid var(--accent-primary)",
        }}
      >

        {/* Left Filter: Catalog Entity Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            Catalog Filter:
          </span>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.3rem",
              borderRadius: "10px",
              background: "var(--segmented-bg)",
              border: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "7px",
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: statusFilter === "all" ? "var(--accent-primary)" : "transparent",
                color: statusFilter === "all" ? "#FFFFFF" : "var(--text-secondary)",
              }}
            >
              🌐 All Entities
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "7px",
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: statusFilter === "active" ? "#2E7D32" : "transparent",
                color: statusFilter === "active" ? "#FFFFFF" : "var(--text-secondary)",
              }}
            >
              🟢 Active Only
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "7px",
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: statusFilter === "inactive" ? "#C62828" : "transparent",
                color: statusFilter === "inactive" ? "#FFFFFF" : "var(--text-secondary)",
              }}
            >
              🔴 Inactive Only
            </button>
          </div>
        </div>

        {/* Right Filter: Time Horizon Window */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            Time Window:
          </span>
          <div
            className="segmented"
            style={{
              margin: 0,
              display: "inline-flex",
              gap: "0.3rem",
              padding: "0.3rem",
              borderRadius: "10px",
              background: "var(--segmented-bg)",
              border: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              className={timeRange === "week" ? "seg active" : "seg"}
              onClick={() => setTimeRange("week")}
              style={{ padding: "0.45rem 1rem", borderRadius: "7px", fontSize: "0.8rem", fontWeight: 700 }}
            >
              📅 This Week
            </button>
            <button
              type="button"
              className={timeRange === "month" ? "seg active" : "seg"}
              onClick={() => setTimeRange("month")}
              style={{ padding: "0.45rem 1rem", borderRadius: "7px", fontSize: "0.8rem", fontWeight: 700 }}
            >
              🗓️ This Month
            </button>
            <button
              type="button"
              className={timeRange === "year" ? "seg active" : "seg"}
              onClick={() => setTimeRange("year")}
              style={{ padding: "0.45rem 1rem", borderRadius: "7px", fontSize: "0.8rem", fontWeight: 700 }}
            >
              📊 This Year
            </button>
          </div>
        </div>
      </section>


      {/* 2. Primary Audit Volume Cards */}
      <section className="kpi-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div
          className="kpi-card"
          style={{
            borderLeft: "4px solid #1E88E5",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F1F8FF 40%, #B3E5FC 70%, #42A5F5 100%)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="kpi-label" style={{ color: "#0D47A1", fontWeight: 700 }}>
            Total Completed Audits
          </span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>
            {loading ? "..." : kpis.completedCount}
          </strong>
          <span className="kpi-sub" style={{ color: "#0D47A1", fontWeight: 700 }}>
            ↑ +{kpis.totalCount} total in system
          </span>
        </div>
        <div
          className="kpi-card"
          style={{
            borderLeft: "4px solid #FB8C00",
            background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F1 40%, #FFE0B2 70%, #FFA726 100%)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="kpi-label" style={{ color: "#E65100", fontWeight: 700 }}>
            Detection Issues
          </span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>
            {kpis.failedCount}
          </strong>
          <span className="kpi-sub" style={{ color: "#D84315", fontWeight: 700 }}>
            ↓ -2.5% scan blur drops
          </span>
        </div>
      </section>

      {/* 3. System Catalog Active vs Inactive Metrics Grid */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1.25rem" }} className="detail-grid">
        {/* Product Codes Card */}
        <div
          className="kpi-card"
          style={{
            borderLeft: "4px solid #8E24AA",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F8ECEC 40%, #E1BEE7 70%, #BA68C8 100%)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="kpi-label" style={{ color: "#6A1B9A", fontWeight: 700, fontSize: "0.82rem" }}>
            Product Codes
          </span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>
            {loading ? "..." : entityMetrics.codes.total}
          </strong>
          <span className="kpi-sub" style={{ color: "#6A1B9A", fontWeight: 700, fontSize: "0.75rem" }}>
            🟢 {entityMetrics.codes.active} Active · 🔴 {entityMetrics.codes.inactive} Inactive ({entityMetrics.codes.pct}%)
          </span>
        </div>

        {/* Total Products Card */}
        <div
          className="kpi-card"
          style={{
            borderLeft: "4px solid #00ACC1",
            background: "linear-gradient(180deg, #FFFFFF 0%, #E0F7FA 40%, #B2EBF2 70%, #4DD0E1 100%)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="kpi-label" style={{ color: "#006064", fontWeight: 700, fontSize: "0.82rem" }}>
            Total Products
          </span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>
            {loading ? "..." : entityMetrics.products.total}
          </strong>
          <span className="kpi-sub" style={{ color: "#006064", fontWeight: 700, fontSize: "0.75rem" }}>
            🟢 {entityMetrics.products.active} Active · 🔴 {entityMetrics.products.inactive} Inactive ({entityMetrics.products.pct}%)
          </span>
        </div>

        {/* Total AI Models Card */}
        <div
          className="kpi-card"
          style={{
            borderLeft: "4px solid #FB8C00",
            background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F1 40%, #FFE0B2 70%, #FFA726 100%)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="kpi-label" style={{ color: "#E65100", fontWeight: 700, fontSize: "0.82rem" }}>
            AI Models
          </span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>
            {loading ? "..." : entityMetrics.models.total}
          </strong>
          <span className="kpi-sub" style={{ color: "#D84315", fontWeight: 700, fontSize: "0.75rem" }}>
            🟢 {entityMetrics.models.active} Active · 🔴 {entityMetrics.models.inactive} Inactive ({entityMetrics.models.pct}%)
          </span>
        </div>

        {/* Operational Readiness Rate Card */}
        <div
          className="kpi-card"
          style={{
            borderLeft: "4px solid #2E7D32",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F1F9F1 40%, #C8E6C9 70%, #66BB6A 100%)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="kpi-label" style={{ color: "#1B5E20", fontWeight: 700, fontSize: "0.82rem" }}>
            Active Operational Rate
          </span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>
            {loading ? "..." : `${entityMetrics.overall.pct}%`}
          </strong>
          <span className="kpi-sub" style={{ color: "#1B5E20", fontWeight: 700, fontSize: "0.75rem" }}>
            {entityMetrics.overall.active} of {entityMetrics.overall.total} Assets Active
          </span>
        </div>

        {/* Total Brands & Categories Card */}
        <div
          className="kpi-card"
          style={{
            borderLeft: "4px solid #1E88E5",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F1F8FF 40%, #B3E5FC 70%, #42A5F5 100%)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="kpi-label" style={{ color: "#0D47A1", fontWeight: 700, fontSize: "0.82rem" }}>
            Brands & Categories
          </span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>
            {loading
              ? "..."
              : `${new Set(filteredProducts.map((p) => p.brand).filter(Boolean)).size} / ${
                  new Set(filteredProducts.map((p) => p.category).filter(Boolean)).size
                }`}
          </strong>
          <span className="kpi-sub" style={{ color: "#0D47A1", fontWeight: 700, fontSize: "0.75rem" }}>
            Active Retail Brands & Segments
          </span>
        </div>
      </section>

      {/* 4. Active vs Inactive Operational Health Section */}
      <section className="card stack" style={{ borderLeft: "4px solid #2E7D32" }}>
        <div className="row-between" style={{ alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>
              System Operational Health & Activation Breakdown
            </h2>
            <p className="subtle" style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
              Active vs. Inactive asset distribution across product catalog codes, product SKUs, and neural models.
            </p>
          </div>
          <div
            style={{
              padding: "0.4rem 0.85rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 800,
              background:
                entityMetrics.overall.pct >= 80
                  ? "rgba(46, 125, 50, 0.1)"
                  : entityMetrics.overall.pct >= 50
                  ? "rgba(251, 140, 0, 0.1)"
                  : "rgba(198, 40, 40, 0.1)",
              color:
                entityMetrics.overall.pct >= 80
                  ? "#2E7D32"
                  : entityMetrics.overall.pct >= 50
                  ? "#E65100"
                  : "#C62828",
              border: `1px solid ${
                entityMetrics.overall.pct >= 80
                  ? "#A5D6A7"
                  : entityMetrics.overall.pct >= 50
                  ? "#FFE0B2"
                  : "#EF9A9A"
              }`,
            }}
          >
            System Status: {entityMetrics.overall.pct >= 80 ? "HEALTHY & OPTIMAL" : entityMetrics.overall.pct >= 50 ? "MODERATE CAPACITY" : "ATTENTION NEEDED"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
          {/* Product Codes Activation Progress */}
          <div
            style={{
              background: "var(--bg)",
              padding: "1.25rem",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div className="row-between" style={{ fontSize: "0.88rem", fontWeight: 700 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                🔢 Product Codes
              </span>
              <span style={{ color: "#2E7D32" }}>{entityMetrics.codes.pct}% Active</span>
            </div>
            <div style={{ width: "100%", height: "10px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${entityMetrics.codes.pct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #66BB6A 0%, #2E7D32 100%)",
                  borderRadius: "99px",
                  transition: "width 0.5s ease-in-out",
                }}
              />
            </div>
            <div className="row-between" style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              <span style={{ color: "#2E7D32" }}>🟢 {entityMetrics.codes.active} Active</span>
              <span style={{ color: "#C62828" }}>🔴 {entityMetrics.codes.inactive} Inactive</span>
            </div>
          </div>

          {/* Products SKU Activation Progress */}
          <div
            style={{
              background: "var(--bg)",
              padding: "1.25rem",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div className="row-between" style={{ fontSize: "0.88rem", fontWeight: 700 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                🏷️ Product SKUs
              </span>
              <span style={{ color: "#00897B" }}>{entityMetrics.products.pct}% Active</span>
            </div>
            <div style={{ width: "100%", height: "10px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${entityMetrics.products.pct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #26A69A 0%, #00897B 100%)",
                  borderRadius: "99px",
                  transition: "width 0.5s ease-in-out",
                }}
              />
            </div>
            <div className="row-between" style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              <span style={{ color: "#00897B" }}>🟢 {entityMetrics.products.active} Active</span>
              <span style={{ color: "#C62828" }}>🔴 {entityMetrics.products.inactive} Inactive</span>
            </div>
          </div>

          {/* AI Models Activation Progress */}
          <div
            style={{
              background: "var(--bg)",
              padding: "1.25rem",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div className="row-between" style={{ fontSize: "0.88rem", fontWeight: 700 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                🤖 AI Models
              </span>
              <span style={{ color: "#FB8C00" }}>{entityMetrics.models.pct}% Active</span>
            </div>
            <div style={{ width: "100%", height: "10px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${entityMetrics.models.pct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #FFA726 0%, #FB8C00 100%)",
                  borderRadius: "99px",
                  transition: "width 0.5s ease-in-out",
                }}
              />
            </div>
            <div className="row-between" style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              <span style={{ color: "#E65100" }}>🟢 {entityMetrics.models.active} Active</span>
              <span style={{ color: "#C62828" }}>🔴 {entityMetrics.models.inactive} Inactive</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Performance Trends split layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "1.5rem" }} className="detail-grid">
        {/* Trend Area Chart */}
        <section className="card stack" style={{ borderLeft: "4px solid #E53935" }}>
          <h2>Audits & Coverage Frequency</h2>
          <p className="subtle">Completed shelf classification queries plotted against calendar milestones.</p>

          <div style={{ position: "relative", width: "100%", height: "230px", marginTop: "0.5rem" }}>
            <svg viewBox="0 -10 1000 250" style={{ width: "100%", height: "100%" }}>
              {trendData.yAxisLabels.map((val, idx) => {
                const y = 30 + idx * 34;
                return (
                  <g key={idx}>
                    <line x1="50" y1={y} x2="950" y2={y} stroke="var(--border)" strokeWidth="0.8" opacity="0.3" />
                    <text x="40" y={y + 3} textAnchor="end" fill="var(--text-secondary)" fontSize="10" fontWeight="600">
                      {val}
                    </text>
                  </g>
                );
              })}

              {trendData.fillD && <path d={trendData.fillD} fill="url(#analytics-grad-area-v2)" opacity="0.1" />}

              {trendData.pathD && (
                <path d={trendData.pathD} fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {trendData.points.map((pt, idx) => (
                <g key={idx}>
                  <circle cx={pt.x} cy={pt.y} r="4.5" fill="#ffffff" stroke="#2E7D32" strokeWidth="2.5" />
                  <text x={pt.x} y={pt.y - 10} textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="800">
                    {pt.count}
                  </text>
                </g>
              ))}

              {trendData.labels.map((lbl, idx) => (
                <text
                  key={idx}
                  x={trendData.points[idx]?.x ?? 60 + idx * 140}
                  y="222"
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  fontSize="10"
                  fontWeight="600"
                >
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

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              gap: "0.5rem",
              height: "210px",
              marginTop: "1rem",
              background: "var(--bg)",
              padding: "1rem 0.75rem 1.75rem",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}
          >
            {productCategoryBreakdown.entries.length > 0 ? (
              productCategoryBreakdown.entries.map(([catName, count], idx) => {
                const heightPct = Math.max(15, Math.round((count / productCategoryBreakdown.maxVal) * 100));
                const colors = [
                  "linear-gradient(180deg, #42A5F5 0%, #1E88E5 100%)",
                  "linear-gradient(180deg, #AB47BC 0%, #8E24AA 100%)",
                  "linear-gradient(180deg, #26A69A 0%, #00897B 100%)",
                  "linear-gradient(180deg, #FFA726 0%, #FB8C00 100%)",
                  "linear-gradient(180deg, #EC407A 0%, #D81B60 100%)",
                ];
                const barColor = colors[idx % colors.length];

                return (
                  <div
                    key={catName}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.35rem",
                      height: "100%",
                      justifyContent: "flex-end",
                      flex: 1,
                      position: "relative",
                    }}
                    title={`${catName}: ${count} products`}
                  >
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
                        transition: "height 0.4s ease-in-out",
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
                          display: "block",
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

      {/* 6. Brand Product Counts Vertical Bar Chart & Self vs Competitor Breakdown */}
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

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-around",
            gap: "0.5rem",
            height: "210px",
            marginTop: "1rem",
            background: "var(--bg)",
            padding: "1rem 0.75rem 1.75rem",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          {productBrandBreakdown.entries.length > 0 ? (
            productBrandBreakdown.entries.map(([brandName, count], idx) => {
              const heightPct = Math.max(15, Math.round((count / productBrandBreakdown.maxVal) * 100));
              const colors = [
                "linear-gradient(180deg, #AB47BC 0%, #8E24AA 100%)",
                "linear-gradient(180deg, #42A5F5 0%, #1E88E5 100%)",
                "linear-gradient(180deg, #FFA726 0%, #FB8C00 100%)",
                "linear-gradient(180deg, #66BB6A 0%, #2E7D32 100%)",
                "linear-gradient(180deg, #EF5350 0%, #C62828 100%)",
              ];
              const barColor = colors[idx % colors.length];

              return (
                <div
                  key={brandName}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.35rem",
                    height: "100%",
                    justifyContent: "flex-end",
                    flex: 1,
                    position: "relative",
                  }}
                  title={`${brandName}: ${count} products`}
                >
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
                      transition: "height 0.4s ease-in-out",
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
                        display: "block",
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

      {/* 7. Registered Self vs Competitor Catalog SKU Count Chart Side-by-Side */}
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "end", height: "200px", background: "var(--bg)", padding: "1.25rem 1.5rem 1rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
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
                  paddingTop: catalogTypeShare.selfPct > 15 ? "0.4rem" : "0",
                }}
              >
                {catalogTypeShare.selfPct > 0 && (
                  <span style={{ color: "#FFFFFF", fontSize: "0.8rem", fontWeight: 800 }}>{catalogTypeShare.selfPct}%</span>
                )}
              </div>
              <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginTop: "0.15rem" }}>🏷️ Self Products</strong>
            </div>

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
                  paddingTop: catalogTypeShare.compPct > 15 ? "0.4rem" : "0",
                }}
              >
                {catalogTypeShare.compPct > 0 && (
                  <span style={{ color: "#FFFFFF", fontSize: "0.8rem", fontWeight: 800 }}>{catalogTypeShare.compPct}%</span>
                )}
              </div>
              <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginTop: "0.15rem" }}>🥊 Competitor Products</strong>
            </div>
          </div>

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
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  backgroundColor: "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text-primary)" }}>{catalogTypeShare.total}</span>
                <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Total SKUs</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#2E7D32", display: "inline-block" }} />
                <div>
                  <strong style={{ fontSize: "0.85rem", display: "block" }}>Self Products</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {catalogTypeShare.selfCount} SKU ({catalogTypeShare.selfPct}%)
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#E53935", display: "inline-block" }} />
                <div>
                  <strong style={{ fontSize: "0.85rem", display: "block" }}>Competitor Products</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {catalogTypeShare.compCount} SKU ({catalogTypeShare.compPct}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Interactive Active/Inactive Catalog & Model Status Console */}
      <section className="card stack" style={{ borderLeft: "4px solid #1E88E5", padding: "1.75rem" }}>
        <div className="row-between" style={{ alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>
              Interactive Catalog & Model Activation Console
            </h2>
            <p className="subtle" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
              Inspect live status and perform direct Active / Inactive status toggles across Products, Product Codes, and AI Models.
            </p>
          </div>

          {/* Console Tab Buttons */}
          <div style={{ display: "flex", gap: "0.4rem", background: "var(--bg)", padding: "0.3rem", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: activeTab === "products" ? "var(--accent-primary)" : "transparent",
                color: activeTab === "products" ? "#FFFFFF" : "var(--text-secondary)",
              }}
            >
              🏷️ Products ({filteredProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("codes")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: activeTab === "codes" ? "var(--accent-primary)" : "transparent",
                color: activeTab === "codes" ? "#FFFFFF" : "var(--text-secondary)",
              }}
            >
              🔢 Product Codes ({filteredProductCodes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("models")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: activeTab === "models" ? "var(--accent-primary)" : "transparent",
                color: activeTab === "models" ? "#FFFFFF" : "var(--text-secondary)",
              }}
            >
              🤖 AI Models ({filteredModels.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Products Table */}
        {activeTab === "products" && (
          <div className="table-wrap" style={{ marginTop: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Product SKU Name</th>
                  <th>Code ID</th>
                  <th>Brand / Category</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Activation Control</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const isActive = (p.status || "active").toLowerCase() === "active";
                    const isUpdating = togglingId === `prod-${p.id}`;
                    return (
                      <tr key={p.id} className="table-row-hover">
                        <td>
                          <strong>{p.product_name}</strong>
                          {p.ai_code && (
                            <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                              AI: {p.ai_code}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                            ID #{p.product_code_id}
                          </span>
                        </td>
                        <td>
                          {p.brand || "—"} / <span style={{ color: "var(--text-secondary)" }}>{p.category || "General"}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: "0.2rem 0.6rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              background: p.type === "competitor" ? "rgba(229, 57, 53, 0.1)" : "rgba(46, 125, 50, 0.1)",
                              color: p.type === "competitor" ? "#C62828" : "#2E7D32",
                            }}
                          >
                            {p.type === "competitor" ? "Competitor" : "Self"}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              padding: "0.25rem 0.65rem",
                              borderRadius: "99px",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              background: isActive ? "rgba(46, 125, 50, 0.12)" : "rgba(189, 189, 189, 0.2)",
                              color: isActive ? "#2E7D32" : "#616161",
                              border: `1px solid ${isActive ? "#A5D6A7" : "#E0E0E0"}`,
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                background: isActive ? "#2E7D32" : "#757575",
                              }}
                            />
                            {isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleProductStatus(p)}
                            style={{
                              padding: "0.35rem 0.85rem",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              border: `1px solid ${isActive ? "#EF9A9A" : "#A5D6A7"}`,
                              background: isActive ? "rgba(239, 83, 80, 0.1)" : "rgba(76, 175, 80, 0.1)",
                              color: isActive ? "#C62828" : "#2E7D32",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            {isUpdating ? "Updating..." : isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2rem" }}>
                      No product SKUs match the current status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Product Codes Table */}
        {activeTab === "codes" && (
          <div className="table-wrap" style={{ marginTop: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Product Code</th>
                  <th>Description</th>
                  <th>Created Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Activation Control</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductCodes.length > 0 ? (
                  filteredProductCodes.map((code) => {
                    const isActive = (code.status || "active").toLowerCase() === "active";
                    const isUpdating = togglingId === `code-${code.id}`;
                    return (
                      <tr key={code.id} className="table-row-hover">
                        <td>
                          <strong style={{ fontSize: "0.95rem", color: "var(--accent-primary)" }}>{code.product_code}</strong>
                        </td>
                        <td>{code.description || "No description specified"}</td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {code.created_at ? new Date(code.created_at).toLocaleDateString() : "N/A"}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              padding: "0.25rem 0.65rem",
                              borderRadius: "99px",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              background: isActive ? "rgba(46, 125, 50, 0.12)" : "rgba(189, 189, 189, 0.2)",
                              color: isActive ? "#2E7D32" : "#616161",
                              border: `1px solid ${isActive ? "#A5D6A7" : "#E0E0E0"}`,
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                background: isActive ? "#2E7D32" : "#757575",
                              }}
                            />
                            {isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleCodeStatus(code)}
                            title="Toggling product code status will automatically update all mapped products and models."
                            style={{
                              padding: "0.35rem 0.85rem",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              border: `1px solid ${isActive ? "#EF9A9A" : "#A5D6A7"}`,
                              background: isActive ? "rgba(239, 83, 80, 0.1)" : "rgba(76, 175, 80, 0.1)",
                              color: isActive ? "#C62828" : "#2E7D32",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            {isUpdating ? "Updating..." : isActive ? "Deactivate Code" : "Activate Code"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2rem" }}>
                      No product codes match the current status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: AI Models Table */}
        {activeTab === "models" && (
          <div className="table-wrap" style={{ marginTop: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Model Identifier</th>
                  <th>Target Product Code ID</th>
                  <th>Inference Parameters</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Activation Control</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.length > 0 ? (
                  filteredModels.map((m) => {
                    const isActive = m.is_active;
                    const isUpdating = togglingId === `mod-${m.id}`;
                    return (
                      <tr key={m.id} className="table-row-hover">
                        <td>
                          <strong>{m.model_name}</strong>
                          <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                            Path: {m.model_path}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                            Code #{m.product_code_id}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8rem" }}>
                          Size: {m.image_size || 1280}px · Conf: {m.conf_threshold ?? 0.25} · IoU: {m.iou_threshold ?? 0.45}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              padding: "0.25rem 0.65rem",
                              borderRadius: "99px",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              background: isActive ? "rgba(46, 125, 50, 0.12)" : "rgba(189, 189, 189, 0.2)",
                              color: isActive ? "#2E7D32" : "#616161",
                              border: `1px solid ${isActive ? "#A5D6A7" : "#E0E0E0"}`,
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                background: isActive ? "#2E7D32" : "#757575",
                              }}
                            />
                            {isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleModelStatus(m)}
                            style={{
                              padding: "0.35rem 0.85rem",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              border: `1px solid ${isActive ? "#EF9A9A" : "#A5D6A7"}`,
                              background: isActive ? "rgba(239, 83, 80, 0.1)" : "rgba(76, 175, 80, 0.1)",
                              color: isActive ? "#C62828" : "#2E7D32",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            {isUpdating ? "Updating..." : isActive ? "Deactivate Model" : "Activate Model"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2rem" }}>
                      No AI models match the current status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 9. Audit Processing Status & SKU Performance Side-by-Side Row */}
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
                  <span>
                    {statusDistribution.completed} ({statusDistribution.completedPct}%)
                  </span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${statusDistribution.completedPct}%`,
                      height: "100%",
                      background: "#43A047",
                      borderRadius: "99px",
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="row-between" style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  <span style={{ color: "#FB8C00" }}>Pending / Processing</span>
                  <span>
                    {statusDistribution.pending} ({statusDistribution.pendingPct}%)
                  </span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${statusDistribution.pendingPct}%`,
                      height: "100%",
                      background: "#FB8C00",
                      borderRadius: "99px",
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="row-between" style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  <span style={{ color: "#E53935" }}>Failed</span>
                  <span>
                    {statusDistribution.failed} ({statusDistribution.failedPct}%)
                  </span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${statusDistribution.failedPct}%`,
                      height: "100%",
                      background: "#E53935",
                      borderRadius: "99px",
                      transition: "width 0.4s",
                    }}
                  />
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
                    <td>
                      <strong>{sku.name}</strong>
                    </td>
                    <td>{sku.detections}</td>
                    <td style={{ textAlign: "right", color: "var(--success)" }}>
                      <strong>{sku.conf}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Audit Report Export & Download Modal */}
      <AuditReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        initialStatus={statusFilter}
      />
    </div>
  );
}
