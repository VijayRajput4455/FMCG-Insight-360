"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { deleteAudit, getAuditStatus, listAudits, resolveApiAssetUrl, type AuditLogItem } from "@/lib/api";
import { getHistory, type AuditHistoryItem, type HistoryStatus, updateHistoryStatus } from "@/lib/history";
import { SkeletonRows } from "@/components/Skeleton";
import AuditReportExportModal from "@/components/AuditReportExportModal";

type EnhancedAuditItem = {
  id: number;
  product_code: string;
  status: string;
  created_at: string;
  imageUrl: string;
  confidence: string;
  operator: string;
  store: string;
  resultsSummary: string;
  counts: Record<string, number>;
};

export default function AuditHistoryTable() {
  const [source, setSource] = useState<"db" | "local">("db");
  const [dbItems, setDbItems] = useState<EnhancedAuditItem[]>([]);
  const [localItems, setLocalItems] = useState<AuditHistoryItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Error, Success and Delete Modal states
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // View state
  const [viewMode, setViewMode] = useState<"table" | "card" | "timeline">("table");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOperator, setFilterOperator] = useState("all");
  const [filterStore, setFilterStore] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  // Drawer / Selection state
  const [selectedAudit, setSelectedAudit] = useState<EnhancedAuditItem | null>(null);

  const loadDbAudits = useCallback(async () => {
    setLoading(true);
    try {
      const logs = await listAudits(undefined, undefined, 0, 100);
      
      const detailedLogs = await Promise.all(
        logs.map(async (log) => {
          // Operators list mock
          const operators = ["Super Admin", "Operator-A", "Operator-B", "Inspector-X"];
          const operator = operators[log.id % operators.length];

          // Store list mock
          const stores = ["Store #102 (Downtown)", "Store #104 (West)", "Store #189 (Metro)"];
          const store = stores[log.id % stores.length];

          let imageUrl = "";
          let confidence = "99.62%";
          let counts: Record<string, number> = { "Coca Cola 500ml": 12, "Lays Chips": 4 };
          let resultsSummary = "Coca Cola 500ml x12, Lays Chips x4";

          try {
            const detail = await getAuditStatus(log.id);
            if (detail.result_json) {
              if (detail.result_json.product_image_url) {
                imageUrl = resolveApiAssetUrl(detail.result_json.product_image_url);
              }
              if (detail.result_json.confidence) {
                confidence = typeof detail.result_json.confidence === "number"
                  ? `${(detail.result_json.confidence * 100).toFixed(1)}%`
                  : String(detail.result_json.confidence);
              }
              if (detail.result_json.counts) {
                counts = detail.result_json.counts as Record<string, number>;
                resultsSummary = Object.entries(counts)
                  .map(([name, count]) => `${name} x${count}`)
                  .join(", ") || "No tags identified";
              }
            }
          } catch {
            // Fallback mocks
          }

          return {
            id: log.id,
            product_code: log.product_code || "SKU-MAP",
            status: log.status,
            created_at: log.created_at,
            imageUrl,
            confidence,
            operator,
            store,
            resultsSummary,
            counts
          };
        })
      );
      setDbItems(detailedLogs);
    } catch (err) {
      console.error("Failed to load db audits", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLocalAudits = useCallback(() => {
    setLoading(true);
    setLocalItems(getHistory());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (source === "db") {
      void loadDbAudits();
    } else {
      loadLocalAudits();
    }
  }, [source, loadDbAudits, loadLocalAudits]);

  // Combine and process items
  const items: EnhancedAuditItem[] = useMemo(() => {
    if (source === "db") return dbItems;
    
    return localItems.map(item => ({
      id: item.auditId,
      product_code: item.productCode,
      status: item.status,
      created_at: item.createdAtIso,
      imageUrl: "",
      confidence: "99.62%",
      operator: "Super Admin",
      store: "Store #102 (Local Cache)",
      resultsSummary: "Mock classification result details",
      counts: { "Mock Product": 1 }
    }));
  }, [source, dbItems, localItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        String(item.id).includes(searchQuery) ||
        item.product_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.resultsSummary.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesOperator = filterOperator === "all" || item.operator === filterOperator;
      const matchesStore = filterStore === "all" || item.store.includes(filterStore);
      const matchesStatus = filterStatus === "all" || item.status === filterStatus;
      const matchesDate = !filterDate || new Date(item.created_at).toISOString().slice(0, 10) === filterDate;

      return matchesSearch && matchesOperator && matchesStore && matchesStatus && matchesDate;
    });
  }, [items, searchQuery, filterOperator, filterStore, filterStatus, filterDate]);

  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;
    const headers = ["Audit ID", "Mapped Code", "Status", "Confidence", "Detections", "Timestamp"];
    const rows = filteredItems.map(item => [
      item.id,
      item.product_code,
      item.status,
      item.confidence,
      item.resultsSummary,
      item.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fmcg_audit_history_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadImage = async (item: EnhancedAuditItem) => {
    if (!item.imageUrl) return;
    try {
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `audit_scan_${item.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback direct link
      window.open(item.imageUrl, "_blank");
    }
  };

  const handleExportDetectionCSV = (item: EnhancedAuditItem) => {
    const headers = ["Audit ID", "Mapped Code", "Product Class", "Detected Count", "Confidence Score", "Timestamp"];
    const entries = Object.entries(item.counts);
    const rows = entries.length > 0
      ? entries.map(([name, qty]) => [item.id, item.product_code, name, qty, item.confidence, item.created_at])
      : [[item.id, item.product_code, "N/A", 0, item.confidence, item.created_at]];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_${item.id}_detection_details.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeDelete = async (auditId: number) => {
    try {
      await deleteAudit(auditId);
      setSuccess(`Audit #${auditId} deleted successfully!`);
      if (selectedAudit?.id === auditId) {
        setSelectedAudit(null);
      }
      if (source === "db") {
        await loadDbAudits();
      } else {
        loadLocalAudits();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete audit");
    }
  };

  return (
    <section className="card full stack" style={{ position: "relative", borderLeft: "4px solid #E53935" }}>
      {deleteId !== null && (
        <div className="modal-overlay">
          <div className="modal-content error-modal animate-slide-in">
            <div className="modal-header">
              <div className="error-icon-wrapper" style={{ background: "rgba(229, 57, 53, 0.1)", color: "#E53935" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete Audit record #{deleteId}?</p>
            </div>
            <div className="modal-footer" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" className="button-secondary" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button type="button" className="button-danger" style={{ background: "#ef4444", color: "#ffffff" }} onClick={async () => {
                const idToDelete = deleteId;
                setDeleteId(null);
                await executeDelete(idToDelete);
              }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="modal-overlay">
          <div className="modal-content error-modal animate-slide-in">
            <div className="modal-header">
              <div className="error-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3>Action Failed</h3>
            </div>
            <div className="modal-body">
              <p>{error}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="button-danger" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="toast-container">
          <div className="toast show">
            <div className="toast-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="toast-message">{success}</div>
            <button type="button" className="toast-close-btn" onClick={() => setSuccess(null)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}
      {/* Page Header */}
      <div className="row-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1rem", alignItems: "center" }}>
        <div>
          <span className="kpi-label" style={{ color: "var(--accent-primary)" }}>Records</span>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0.25rem 0 0" }}>System Audit History</h2>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {/* Card / Table Toggle */}
          <div className="segmented" style={{ margin: 0, display: "inline-flex", gap: "0.5rem", padding: "0.35rem", borderRadius: "12px", background: "var(--segmented-bg)", border: "1px solid var(--border)" }}>
            <button type="button" className={`seg ${viewMode === "table" ? "active" : ""}`} onClick={() => setViewMode("table")} style={{ padding: "0.5rem 1.25rem", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              📊 Table
            </button>
            <button type="button" className={`seg ${viewMode === "card" ? "active" : ""}`} onClick={() => setViewMode("card")} style={{ padding: "0.5rem 1.25rem", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              🎴 Grid
            </button>
            <button type="button" className={`seg ${viewMode === "timeline" ? "active" : ""}`} onClick={() => setViewMode("timeline")} style={{ padding: "0.5rem 1.25rem", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              🕒 Timeline
            </button>
          </div>
          <button
            type="button"
            className="button-primary"
            onClick={() => setIsExportModalOpen(true)}
            style={{
              padding: "0.55rem 1.15rem",
              borderRadius: "10px",
              fontSize: "0.85rem",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 4px 14px rgba(46, 125, 50, 0.25)",
            }}
          >
            📥 Export Audit Reports
          </button>
        </div>
      </div>

      {/* Screen 5 Filtering row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr", gap: "0.75rem", margin: "1.25rem 0" }} className="detail-grid">
        <input
          placeholder="Search ID, tag name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select value={filterOperator} onChange={(e) => setFilterOperator(e.target.value)}>
          <option value="all">All Operators</option>
          <option value="Super Admin">Super Admin</option>
          <option value="Operator-A">Operator-A</option>
          <option value="Operator-B">Operator-B</option>
          <option value="Inspector-X">Inspector-X</option>
        </select>
        <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
          <option value="all">All Stores</option>
          <option value="Store #102">Store #102</option>
          <option value="Store #104">Store #104</option>
          <option value="Store #189">Store #189</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      {/* Main View Mode Selector */}
      {loading ? (
        <div style={{ padding: "2rem 0" }}><SkeletonRows rows={6} /></div>
      ) : filteredItems.length === 0 ? (
        <div style={{ padding: "4rem 2rem", textAlign: "center" }} className="empty-state">
          <p className="subtle">No audit reports match your filter criteria.</p>
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Image</th>
                <th>Result Summary</th>
                <th>Score</th>
                <th>Timestamp</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="table-row-hover" onClick={() => setSelectedAudit(item)} style={{ cursor: "pointer" }}>
                  <td><strong>#{item.id}</strong></td>
                  <td>
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt="Audited" 
                        style={{ width: "32px", height: "32px", borderRadius: "8px", objectFit: "cover", display: "block", border: "1px solid var(--border)" }} 
                      />
                    ) : (
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "var(--text-secondary)" }}>
                        No Image
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.85rem", maxWidth: "250px", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {item.resultsSummary}
                    </span>
                  </td>
                  <td>
                    <span className="chip completed" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                      {item.confidence}
                    </span>
                  </td>
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="small button-secondary" onClick={() => setSelectedAudit(item)}>Details</button>
                      <button type="button" className="small button-danger" style={{ background: "#ef4444", color: "#ffffff", padding: "0.25rem 0.65rem", fontSize: "0.75rem", borderRadius: "6px" }} onClick={() => setDeleteId(item.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : viewMode === "card" ? (
        /* Card View */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          {filteredItems.map(item => (
            <div key={item.id} className="card stack" style={{ gap: "1rem", cursor: "pointer" }} onClick={() => setSelectedAudit(item)}>
              <div className="row-between" style={{ alignItems: "center" }}>
                <strong>Audit #{item.id}</strong>
                <span className={`chip ${item.status === 'completed' ? 'completed' : 'failed'}`} style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                  {item.status}
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="Thumbnail" style={{ width: "60px", height: "60px", borderRadius: "12px", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "60px", height: "60px", borderRadius: "12px", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>No Img</div>
                )}
                <div className="stack" style={{ gap: "0.15rem" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>{item.store}</span>
                  <span className="subtle" style={{ fontSize: "0.72rem" }}>Operator: {item.operator}</span>
                </div>
              </div>
              <p className="subtle" style={{ fontSize: "0.82rem", margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {item.resultsSummary}
              </p>
              <div className="row-between" style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", fontSize: "0.75rem" }}>
                <span>Confidence: <strong>{item.confidence}</strong></span>
                <span className="subtle">{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Timeline View */
        <div className="stepper-container" style={{ gap: "1.25rem" }}>
          {filteredItems.map((item, idx) => (
            <div className="step-item" key={item.id} onClick={() => setSelectedAudit(item)} style={{ cursor: "pointer" }}>
              <div className={`step-icon ${item.status === 'completed' ? 'completed' : 'active'}`}>
                {idx + 1}
              </div>
              <div className="step-content">
                <strong className="step-title">Audit #{item.id} Completed by {item.operator}</strong>
                <span className="step-desc" style={{ fontSize: "0.82rem", marginTop: "0.15rem" }}>
                  Store location: {item.store} | Prediction Match: {item.resultsSummary} (Score: {item.confidence})
                </span>
                <small className="subtle" style={{ fontSize: "0.72rem" }}>{new Date(item.created_at).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Slide-out Drawer */}
      {selectedAudit && (
        <div style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "440px",
          height: "100vh",
          maxHeight: "100vh",
          backgroundColor: "#FFFFFF",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.15)",
          zIndex: 99,
          padding: "1.25rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          borderLeft: "1px solid var(--border)",
          overflowY: "auto",
          transition: "var(--transition)"
        }}>
          {/* Header */}
          <div className="row-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem", alignItems: "center" }}>
            <div>
              <span className="kpi-label" style={{ color: "var(--accent-primary)", fontSize: "0.72rem" }}>Scan Details</span>
              <h3 style={{ margin: "0.15rem 0 0", fontSize: "1.2rem" }}>Audit Run #{selectedAudit.id}</h3>
            </div>
            <button 
              type="button" 
              className="small button-secondary"
              onClick={() => setSelectedAudit(null)}
              style={{ padding: "0.35rem 0.75rem", borderRadius: "99px", fontSize: "0.78rem" }}
            >
              Close
            </button>
          </div>

          {/* Metadata Grid (Operator & Store removed) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.85rem", background: "var(--bg)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <div>
              <span className="subtle" style={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}>CLASSIFICATION SKU</span>
              <strong style={{ fontSize: "0.95rem" }}>{selectedAudit.product_code}</strong>
            </div>
            <div>
              <span className="subtle" style={{ display: "block", fontSize: "0.7rem", fontWeight: 700 }}>ACCURACY SCORE</span>
              <strong style={{ color: "var(--success)", fontSize: "0.95rem" }}>{selectedAudit.confidence}</strong>
            </div>
          </div>

          {/* Image Preview Container */}
          <div className="stack" style={{ gap: "0.35rem" }}>
            <span className="subtle" style={{ fontSize: "0.72rem", fontWeight: 700 }}>ANNOTATED SCAN IMAGE</span>
            <div style={{ position: "relative", width: "100%", height: "140px", borderRadius: "10px", overflow: "hidden", background: "var(--bg)", border: "1px solid var(--border)" }}>
              {selectedAudit.imageUrl ? (
                <img src={selectedAudit.imageUrl} alt="Scan annotated" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  No annotated shelf scan image saved.
                </div>
              )}
            </div>
          </div>

          {/* Bounding box predictions details */}
          <div className="stack" style={{ gap: "0.35rem", flexGrow: 1 }}>
            <span className="subtle" style={{ fontSize: "0.72rem", fontWeight: 700 }}>PREDICTION BREAKDOWN</span>
            <div className="table-wrap" style={{ maxHeight: "140px" }}>
              <table>
                <thead>
                  <tr>
                    <th>Product Class</th>
                    <th style={{ textAlign: "right" }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedAudit.counts).map(([name, qty]) => (
                    <tr key={name}>
                      <td><strong>{name}</strong></td>
                      <td style={{ textAlign: "right" }}>{qty} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Updated Action Buttons */}
          <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "auto" }}>
            <button 
              type="button" 
              style={{ flexGrow: 1, padding: "0.45rem 0.75rem", fontSize: "0.8rem" }} 
              onClick={() => handleDownloadImage(selectedAudit)}
              disabled={!selectedAudit.imageUrl}
            >
              📷 Download Image
            </button>
            <button 
              type="button" 
              className="button-secondary" 
              style={{ padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
              onClick={() => handleExportDetectionCSV(selectedAudit)}
            >
              📊 Export CSV
            </button>
            <button 
              type="button" 
              className="button-danger" 
              style={{ background: "#ef4444", color: "#ffffff", padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
              onClick={() => setDeleteId(selectedAudit.id)}
            >
              Delete Audit
            </button>
          </div>
        </div>
      )}

      {/* Audit Report Export & Download Modal */}
      <AuditReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        initialProductCode={searchQuery}
        initialStatus={filterStatus}
      />
    </section>
  );
}

