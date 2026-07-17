import ProductCodeManager from "@/components/ProductCodeManager";

export default function ProductCodesPage() {
  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      <header className="hero">
        <h1>Product Codes</h1>
        <p>Manage the codes that operators use when submitting audits.</p>
      </header>
      <ProductCodeManager />
    </div>
  );
}