import AuditConsole from "@/components/AuditConsole";

export default function NewAuditPage() {
  return (
    <div className="container stack" style={{ gap: "2rem" }}>
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
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-primary)" }}>Inventory Scan</span>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.25rem 0 0", color: "var(--accent-primary)" }}>FMCG Classification Audit</h1>
          <div className="main-header-line" />
          <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: "1.5" }}>
            Submit an audit image (via local file upload or online URL) and track real-time YOLO classification progress.
          </p>
        </div>
      </section>
      <AuditConsole />
    </div>
  );
}
