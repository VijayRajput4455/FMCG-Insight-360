"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getAuditStatus } from "@/lib/api";
import { getHistory, type AuditHistoryItem, type HistoryStatus, updateHistoryStatus } from "@/lib/history";
import { SkeletonRows } from "@/components/Skeleton";

const STATUS_OPTIONS: Array<HistoryStatus | "all"> = ["all", "pending", "processing", "completed", "failed"];

export default function AuditHistoryTable() {
  const [items, setItems] = useState<AuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [filterCode, setFilterCode] = useState("");
  const [filterStatus, setFilterStatus] = useState<HistoryStatus | "all">("all");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    setItems(getHistory());
    setLoading(false);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterCode && !item.productCode.toLowerCase().includes(filterCode.toLowerCase())) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterDate) {
        const itemDate = new Date(item.createdAtIso).toISOString().slice(0, 10);
        if (itemDate !== filterDate) return false;
      }
      return true;
    });
  }, [items, filterCode, filterStatus, filterDate]);

  async function refreshStatus(auditId: number) {
    setBusyId(auditId);
    try {
      const data = await getAuditStatus(auditId);
      if (data.status === "pending" || data.status === "processing" || data.status === "completed" || data.status === "failed") {
        updateHistoryStatus(auditId, data.status);
        setItems(getHistory());
      }
    } finally {
      setBusyId(null);
    }
  }

  function clearFilters() {
    setFilterCode("");
    setFilterStatus("all");
    setFilterDate("");
  }

  return (
    <section className="card full">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Recent Audits</h2>
        <button type="button" className="small" onClick={clearFilters}>Clear filters</button>
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
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Audit ID</th>
              <th>Product</th>
              <th>Source</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={5} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)" }}>
                  No audits match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.auditId}>
                  <td>{item.auditId}</td>
                  <td>{item.productCode}</td>
                  <td className="truncate">{item.sourceLabel}</td>
                  <td><span className={`chip ${item.status}`}>{item.status}</span></td>
                  <td>{new Date(item.createdAtIso).toLocaleString()}</td>
                  <td className="action-cell">
                    <Link href={`/audit/${item.auditId}`} className="small-link">Detail</Link>
                    <button
                      type="button"
                      className="small"
                      onClick={() => void refreshStatus(item.auditId)}
                      disabled={busyId === item.auditId}
                    >
                      {busyId === item.auditId ? "..." : "Refresh"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="subtle">{filtered.length} of {items.length} audit(s)</p>
    </section>
  );
}
