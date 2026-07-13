"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { getAuditStatus, listAudits, type AuditLogItem } from "@/lib/api";
import { getHistory, type AuditHistoryItem, type HistoryStatus, updateHistoryStatus } from "@/lib/history";
import { SkeletonRows } from "@/components/Skeleton";

const STATUS_OPTIONS: Array<HistoryStatus | "all"> = ["all", "pending", "processing", "completed", "failed"];

export default function AuditHistoryTable() {
  // DB log state vs local storage state
  const [source, setSource] = useState<"db" | "local">("db");
  const [dbItems, setDbItems] = useState<AuditLogItem[]>([]);
  const [localItems, setLocalItems] = useState<AuditHistoryItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Filters
  const [filterCode, setFilterCode] = useState("");
  const [filterStatus, setFilterStatus] = useState<HistoryStatus | "all">("all");
  const [filterDate, setFilterDate] = useState("");

  const loadDbAudits = useCallback(async () => {
    setLoading(true);
    try {
      const logs = await listAudits(
        filterCode || undefined,
        filterStatus !== "all" ? filterStatus : undefined,
        0,
        100
      );
      setDbItems(logs);
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

  // Local storage filtering (done in-browser)
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
          // Refresh DB items list
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
    setFilterDate("");
    if (source === "db") {
      // triggers reload
    }
  }

  return (
    <section className="card full stack">
      <div className="row-between">
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>System Audit Logs</h2>
          <div className="segmented" style={{ margin: 0 }}>
            <button
              type="button"
              className={source === "db" ? "seg active" : "seg"}
              onClick={() => setSource("db")}
            >
              All Runs (DB)
            </button>
            <button
              type="button"
              className={source === "local" ? "seg active" : "seg"}
              onClick={() => setSource("local")}
            >
              My Submissions (Local)
            </button>
          </div>
        </div>
        <button type="button" className="small button-secondary" onClick={clearFilters}>Clear filters</button>
      </div>

      <div className="filter-row">
        <input
          placeholder="Filter by product code"
          value={filterCode}
          onChange={(e) => setFilterCode(e.target.value)}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as HistoryStatus | "all")}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
          ))}
        </select>
        {source === "local" && (
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        )}
        {source === "db" && (
          <button type="button" className="small" onClick={() => void loadDbAudits()}>Search</button>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Audit ID</th>
              <th>Product Code</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={5} />
            ) : source === "db" ? (
              dbItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    No system audits recorded in DB.
                  </td>
                </tr>
              ) : (
                dbItems.map((item) => (
                  <tr key={item.id}>
                    <td><strong>#{item.id}</strong></td>
                    <td><span className="chip processing">{item.product_code || "Unknown"}</span></td>
                    <td><span className={`chip ${item.status}`}>{item.status}</span></td>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
                    <td>
                      <span className="truncate" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {item.error_message || "No errors reported"}
                      </span>
                    </td>
                    <td className="action-cell">
                      <Link href={`/audit/${item.id}`} className="small-link" style={{color: 'var(--accent-secondary)'}}>Open Detail</Link>
                      <button
                        type="button"
                        className="small button-secondary"
                        onClick={() => void refreshStatus(item.id)}
                        disabled={busyId === item.id}
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
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    No locally submitted audits found.
                  </td>
                </tr>
              ) : (
                filteredLocalItems.map((item) => (
                  <tr key={item.auditId}>
                    <td><strong>#{item.auditId}</strong></td>
                    <td><span className="chip processing">{item.productCode}</span></td>
                    <td><span className={`chip ${item.status}`}>{item.status}</span></td>
                    <td>{new Date(item.createdAtIso).toLocaleString()}</td>
                    <td className="truncate" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {item.sourceLabel}
                    </td>
                    <td className="action-cell">
                      <Link href={`/audit/${item.auditId}`} className="small-link" style={{color: 'var(--accent-secondary)'}}>Open Detail</Link>
                      <button
                        type="button"
                        className="small button-secondary"
                        onClick={() => void refreshStatus(item.auditId)}
                        disabled={busyId === item.auditId}
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
      <p className="subtle">
        {source === "db" ? `${dbItems.length} records retrieved` : `${filteredLocalItems.length} of ${localItems.length} cached records`}
      </p>
    </section>
  );
}
