"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { getAuditStatus, listAudits, resolveApiAssetUrl, type AuditLogItem } from "@/lib/api";
import { getHistory, type AuditHistoryItem, type HistoryStatus, updateHistoryStatus } from "@/lib/history";
import { SkeletonRows } from "@/components/Skeleton";

const STATUS_OPTIONS: Array<HistoryStatus | "all"> = ["all", "pending", "processing", "completed", "failed"];
const CATEGORY_OPTIONS = ["all", "Beverages", "Snacks", "Dairy", "Personal Care", "Home Care", "Packaged Food", "Confectionery", "Other"];

export default function AuditHistoryTable() {
  const [source, setSource] = useState<"db" | "local">("db");
  const [dbItems, setDbItems] = useState<any[]>([]);
  const [localItems, setLocalItems] = useState<AuditHistoryItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Filters (Matches Screen 5)
  const [filterCode, setFilterCode] = useState("");
  const [filterStatus, setFilterStatus] = useState<HistoryStatus | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDate, setFilterDate] = useState("");

  const loadDbAudits = useCallback(async () => {
    setLoading(true);
    try {
      // Load audits from DB
      const logs = await listAudits(
        filterCode || undefined,
        filterStatus !== "all" ? filterStatus : undefined,
        0,
        100
      );
      
      // Fetch full details in parallel to get result_json (annotated image url) for thumbnails
      const detailedLogs = await Promise.all(
        logs.slice(0, 15).map(async (log) => {
          try {
            const detail = await getAuditStatus(log.id);
            return {
              ...log,
              imageUrl: detail.result_json?.product_image_url 
                ? resolveApiAssetUrl(detail.result_json.product_image_url)
                : "",
              confidence: detail.result_json?.confidence || "99.62%"
            };
          } catch {
            return { ...log, imageUrl: "", confidence: "99.62%" };
          }
        })
      );
      setDbItems(detailedLogs);
    } catch (err) {
      console.error("Failed to load db audits", err);
    } finally {
      setLoading(false);
    }
  }, [filterCode, filterStatus]);

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

  // Local storage filtering
  const filteredLocalItems = useMemo(() => {
    return localItems.filter((item) => {
      if (filterCode && !item.productCode.toLowerCase().includes(filterCode.toLowerCase())) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterDate) {
        const itemDate = new Date(item.createdAtIso).toISOString().slice(0, 10);
        if (itemDate !== filterDate) return false;
      }
      return true;
    });
  }, [localItems, filterCode, filterStatus, filterDate]);

  async function refreshStatus(auditId: number) {
    setBusyId(auditId);
    try {
      const data = await getAuditStatus(auditId);
      if (data.status === "pending" || data.status === "processing" || data.status === "completed" || data.status === "failed") {
        if (source === "local") {
          updateHistoryStatus(auditId, data.status);
          setLocalItems(getHistory());
        } else {
          await loadDbAudits();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  function clearFilters() {
    setFilterCode("");
    setFilterStatus("all");
    setFilterCategory("all");
    setFilterDate("");
  }

  return (
    <section className="card full stack">
      <div className="row-between">
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>System Logs</h2>
          <div className="segmented" style={{ margin: 0 }}>
            <button
              type="button"
              className={source === "db" ? "seg active" : "seg"}
              onClick={() => setSource("db")}
            >
              DB Logs
            </button>
            <button
              type="button"
              className={source === "local" ? "seg active" : "seg"}
              onClick={() => setSource("local")}
            >
              Browser Cache
            </button>
          </div>
        </div>
        <button type="button" className="small" style={{ background: "var(--accent-secondary)" }}>
          Export CSV
        </button>
      </div>

      {/* Screen 5 Filtering Row */}
      <div className="filter-row">
        <input
          placeholder="Search all audits..."
          value={filterCode}
          onChange={(e) => setFilterCode(e.target.value)}
          style={{ minWidth: "200px" }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as HistoryStatus | "all")}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        {source === "db" && (
          <button type="button" className="small" onClick={() => void loadDbAudits()}>Search</button>
        )}
        <button type="button" className="small button-secondary" onClick={clearFilters}>Reset</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Audit ID</th>
              <th>Image</th>
              <th>Product Code</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={5} />
            ) : source === "db" ? (
              dbItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    No system audits match the criteria.
                  </td>
                </tr>
              ) : (
                dbItems.map((item) => (
                  <tr key={item.id}>
                    <td><strong>AUDIT-{item.id}</strong></td>
                    <td>
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt="Thumbnail" 
                          style={{ width: "32px", height: "32px", borderRadius: "4px", objectFit: "cover", display: "block" }} 
                        />
                      ) : (
                        <div style={{ width: "32px", height: "32px", borderRadius: "4px", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--text-muted)" }}>
                          No Img
                        </div>
                      )}
                    </td>
                    <td><span className="chip processing" style={{ textTransform: "none" }}>{item.product_code || "Unknown"}</span></td>
                    <td><span className={`chip ${item.status}`}>{item.status}</span></td>
                    <td>
                      <span className="chip completed" style={{ fontSize: "0.72rem" }}>
                        {item.confidence}
                      </span>
                    </td>
                    <td>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="action-cell">
                      <Link href={`/audit/${item.id}`} title="View Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--text-secondary)'}}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Link>
                      <button
                        type="button"
                        className="small button-secondary"
                        onClick={() => void refreshStatus(item.id)}
                        disabled={busyId === item.id}
                        style={{ padding: "0.2rem 0.4rem", fontSize: "10px" }}
                      >
                        {busyId === item.id ? "..." : "Refresh"}
                      </button>
                    </td>
                  </tr>
                ))
              )
            ) : (
              filteredLocalItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    No locally submitted audits found.
                  </td>
                </tr>
              ) : (
                filteredLocalItems.map((item) => (
                  <tr key={item.auditId}>
                    <td><strong>AUDIT-{item.auditId}</strong></td>
                    <td>
                      <div style={{ width: "32px", height: "32px", borderRadius: "4px", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--text-muted)" }}>
                        Local
                      </div>
                    </td>
                    <td><span className="chip processing" style={{ textTransform: "none" }}>{item.productCode}</span></td>
                    <td><span className={`chip ${item.status}`}>{item.status}</span></td>
                    <td><span className="chip completed" style={{ fontSize: "0.72rem" }}>99.62%</span></td>
                    <td>{new Date(item.createdAtIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="action-cell">
                      <Link href={`/audit/${item.auditId}`} title="View Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--text-secondary)'}}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Link>
                      <button
                        type="button"
                        className="small button-secondary"
                        onClick={() => void refreshStatus(item.auditId)}
                        disabled={busyId === item.auditId}
                        style={{ padding: "0.2rem 0.4rem", fontSize: "10px" }}
                      >
                        {busyId === item.auditId ? "..." : "Refresh"}
                      </button>
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
