"use client";

import { useEffect, useState } from "react";
import {
  getAuditExportCsvUrl,
  getAuditExportJsonUrl,
  type AuditReportFilter,
} from "@/lib/api";

type AuditReportExportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialProductCode?: string;
  initialStatus?: string;
};

export default function AuditReportExportModal({
  isOpen,
  onClose,
  initialProductCode = "",
  initialStatus = "all",
}: AuditReportExportModalProps) {
  const [datePreset, setDatePreset] = useState<"all" | "today" | "week" | "month" | "custom">("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [productCode, setProductCode] = useState(initialProductCode);

  useEffect(() => {
    setProductCode(initialProductCode);
    setStatus(initialStatus);
  }, [initialProductCode, initialStatus]);

  if (!isOpen) return null;

  // Build active filter object
  const getComputedFilters = (): AuditReportFilter => {
    let sDate = startDate;
    let eDate = endDate;

    const now = new Date();
    if (datePreset === "today") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      sDate = todayStart.toISOString();
      eDate = now.toISOString();
    } else if (datePreset === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      sDate = weekAgo.toISOString();
      eDate = now.toISOString();
    } else if (datePreset === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      sDate = monthAgo.toISOString();
      eDate = now.toISOString();
    } else if (datePreset === "all") {
      sDate = "";
      eDate = "";
    }

    return {
      product_code: productCode.trim() || undefined,
      status: status !== "all" ? status : undefined,
      start_date: sDate || undefined,
      end_date: eDate || undefined,
    };
  };

  const currentFilters = getComputedFilters();
  const csvUrl = getAuditExportCsvUrl(currentFilters);
  const jsonUrl = getAuditExportJsonUrl(currentFilters);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          borderRadius: "16px",
          border: "1px solid var(--accent-glow)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
          background: "var(--bg)",
        }}
      >
        {/* Modal Header */}
        <div
          className="row-between"
          style={{
            padding: "1.25rem 1.75rem",
            background: "linear-gradient(135deg, var(--accent-light) 0%, var(--bg) 100%)",
            borderBottom: "1px solid var(--border)",
            alignItems: "center",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-primary)" }}>
              Audit Report Download Center
            </span>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0.2rem 0 0", color: "var(--accent-primary)" }}>
              Export Audit Reports
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: "0 0.5rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Filter Configuration Panel */}
            <div
              style={{
                background: "var(--segmented-bg)",
                padding: "1.25rem",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                1. Filter Audit Records (Supports Thousands of Scans)
              </h3>

              {/* Date Range Selector */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>
                  Time Period Filter:
                </label>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {(["all", "today", "week", "month", "custom"] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDatePreset(preset)}
                      style={{
                        padding: "0.45rem 0.9rem",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                        background: datePreset === preset ? "var(--accent-primary)" : "var(--bg)",
                        color: datePreset === preset ? "#FFFFFF" : "var(--text-primary)",
                      }}
                    >
                      {preset === "all"
                        ? "🌐 All Time"
                        : preset === "today"
                        ? "📅 Today"
                        : preset === "week"
                        ? "🗓️ Last 7 Days"
                        : preset === "month"
                        ? "📊 Last 30 Days"
                        : "📆 Custom Range"}
                    </button>
                  ))}
                </div>

                {datePreset === "custom" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.85rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                        Start Date:
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                        End Date:
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status & SKU Filters Side-by-Side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                <div>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                    Status Filter:
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    <option value="all">All Statuses (Completed, Failed, Pending)</option>
                    <option value="completed">🟢 Completed Only</option>
                    <option value="failed">🔴 Failed Only</option>
                    <option value="pending">🟠 Pending Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                    Product Code / SKU Filter:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PEPSI, AMUL, SKU-101"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Download Action Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                2. Select Report Format to Download
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                {/* Option 1: CSV Download */}
                <a
                  href={csvUrl}
                  download
                  className="button-primary"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1.35rem 1rem",
                    borderRadius: "12px",
                    textDecoration: "none",
                    gap: "0.4rem",
                    boxShadow: "0 4px 15px rgba(46, 125, 50, 0.25)",
                    background: "linear-gradient(180deg, #43A047 0%, #2E7D32 100%)",
                  }}
                >
                  <span style={{ fontSize: "1.6rem" }}>📊</span>
                  <strong style={{ fontSize: "1rem", color: "#FFFFFF" }}>Download CSV Report</strong>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.88)", textAlign: "center" }}>
                    Includes Raw & Detected Image URLs for Excel
                  </span>
                </a>

                {/* Option 2: JSON Download */}
                <a
                  href={jsonUrl}
                  download
                  className="button-secondary"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1.35rem 1rem",
                    borderRadius: "12px",
                    textDecoration: "none",
                    gap: "0.4rem",
                    border: "1.5px solid var(--accent-primary)",
                  }}
                >
                  <span style={{ fontSize: "1.6rem" }}>📄</span>
                  <strong style={{ fontSize: "1rem", color: "var(--accent-primary)" }}>Download JSON Data</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center" }}>
                    Raw structured dump with bounding coordinates
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
