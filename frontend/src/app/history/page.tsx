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
          <nav className="nav-row" style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/" className="button-primary" style={{ padding: "0.6rem 1.25rem", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 12px rgba(46, 125, 50, 0.25)" }}>
              ⚡ New Audit
            </Link>
            <Link href="/dashboard" className="button-secondary" style={{ padding: "0.6rem 1.25rem", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none" }}>
              📊 Dashboard
            </Link>
            <Link href="/products" className="button-secondary" style={{ padding: "0.6rem 1.25rem", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none" }}>
              📦 Product Catalog
            </Link>
            <Link href="/product-codes" className="button-secondary" style={{ padding: "0.6rem 1.25rem", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none" }}>
              🏷️ Product Codes
            </Link>
          </nav>
        </div>
      </section>
      <AuditHistoryTable />
    </main>
  );
}
