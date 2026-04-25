import Link from "next/link";

import AuditHistoryTable from "@/components/AuditHistoryTable";

export default function HistoryPage() {
  return (
    <main className="container">
      <header className="hero">
        <h1>Audit History</h1>
        <p>Track recent requests and refresh their latest backend status.</p>
        <nav className="nav-row">
          <Link href="/">New Audit</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/product-codes">Product Codes</Link>
        </nav>
      </header>
      <AuditHistoryTable />
    </main>
  );
}
