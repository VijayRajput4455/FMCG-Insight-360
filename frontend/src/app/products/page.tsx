import ProductCatalogManager from "@/components/ProductCatalogManager";

export default function ProductsPage() {
  return (
    <div className="container">
      <header className="hero">
        <h1>Product SKU Catalog</h1>
        <p>Manage standard retail items, competing products, and mapping to neural identifiers.</p>
      </header>
      <ProductCatalogManager />
    </div>
  );
}
