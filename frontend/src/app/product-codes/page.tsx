import Link from "next/link";

import ProductCodeManager from "@/components/ProductCodeManager";

export default function ProductCodesPage() {
  return (
    <main className="container">
      <header className="hero">
        <h1>Product Codes</h1>
        <p>Manage the codes that operators use when submitting audits.</p>
        <nav className="nav-row">
          <Link href="/">New Audit</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/history">History</Link>
        </nav>
      </header>
      <ProductCodeManager />
    </main>
  );
}