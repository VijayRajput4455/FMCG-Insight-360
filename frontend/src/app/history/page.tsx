import Link from "next/link";

import AuditHistoryTable from "@/components/AuditHistoryTable";

export default function HistoryPage() {
  return (
    <main className="container stack" style={{ gap: "2rem" }}>
      {/* Large Hero Header Card */}
      <section className="card" style={{
        background: "linear-gradient(135deg, var(--accent-light) 0%, var(--bg) 100%)",
        border: "1px solid var(--accent-glow)",
        position: "relative",
        overflow: "hidden",
        padding: "2rem",
        borderLeft: "4px solid var(--accent-primary)"
      }}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-primary)" }}>Logs Database</span>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.25rem 0 0", color: "var(--accent-primary)" }}>Audit History</h1>
          <div className="main-header-line" />
          <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: "1.5" }}>
            Track recent requests and refresh their latest backend status.
          </p>
          <nav className="nav-row" style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
            <Link href="/" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-primary)", textDecoration: "none" }}>New Audit</Link>
            <Link href="/dashboard" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-primary)", textDecoration: "none" }}>Dashboard</Link>
            <Link href="/product-codes" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-primary)", textDecoration: "none" }}>Product Codes</Link>
          </nav>
        </div>
      </section>
      <AuditHistoryTable />
    </main>
  );
}
