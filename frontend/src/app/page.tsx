import Link from "next/link";

import AuditConsole from "@/components/AuditConsole";

export default function HomePage() {
  return (
    <main className="container">
      <header className="hero">
        <h1>FMCG Insight 360</h1>
        <p>Submit an audit and watch live status updates from WebSocket with HTTP fallback.</p>
        <nav className="nav-row">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/history">History</Link>
          <Link href="/product-codes">Product Codes</Link>
        </nav>
      </header>
      <AuditConsole />
    </main>
  );
}
