import AuditConsole from "@/components/AuditConsole";

export default function HomePage() {
  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      <header className="hero">
        <h1>FMCG Classification Audit</h1>
        <p>Submit an audit image (via local file upload or online URL) and track real-time YOLO classification progress.</p>
      </header>
      <AuditConsole />
    </div>
  );
}
