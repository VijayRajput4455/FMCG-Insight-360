"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  listProducts, 
  searchProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  bulkUploadProducts,
  listProductCodes,
  type Product,
  type ProductCode,
  type ProductPayload
} from "@/lib/api";

export default function ProductCatalogManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [productCodeId, setProductCodeId] = useState<number | "">("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [aiCode, setAiCode] = useState("");
  const [type, setType] = useState("self");

  // Filter states
  const [filterName, setFilterName] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCodeId, setFilterCodeId] = useState<number | "">("");

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [codesList, productsList] = await Promise.all([
        listProductCodes(),
        listProducts(0, 100)
      ]);
      setProductCodes(codesList);
      setProducts(productsList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const results = await searchProducts({
        product_code_id: filterCodeId || undefined,
        name: filterName || undefined,
        brand: filterBrand || undefined,
        category: filterCategory || undefined,
        type: filterType || undefined,
        limit: 100
      });
      setProducts(results);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = async () => {
    setFilterName("");
    setFilterBrand("");
    setFilterCategory("");
    setFilterType("");
    setFilterCodeId("");
    setLoading(true);
    try {
      const productsList = await listProducts(0, 100);
      setProducts(productsList);
    } catch (err) {
      setError("Failed to reset products");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setProductName("");
    setProductCodeId("");
    setBrand("");
    setCategory("");
    setAiCode("");
    setType("self");
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productCodeId) {
      setError("Product Name and Product Code mapping are required.");
      return;
    }

    const payload: ProductPayload = {
      product_name: productName,
      product_code_id: Number(productCodeId),
      brand: brand || undefined,
      category: category || undefined,
      ai_code: aiCode || undefined,
      type: type || undefined,
    };

    try {
      if (editId) {
        await updateProduct(editId, payload);
        setSuccess("Product updated successfully!");
      } else {
        await createProduct(payload);
        setSuccess("Product created successfully!");
      }
      resetForm();
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    }
  };

  const handleEdit = (p: Product) => {
    setEditId(p.id);
    setProductName(p.product_name);
    setProductCodeId(p.product_code_id);
    setBrand(p.brand || "");
    setCategory(p.category || "");
    setAiCode(p.ai_code || "");
    setType(p.type || "self");
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id);
      setSuccess("Product deleted successfully!");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    try {
      const response = await bulkUploadProducts(uploadFile);
      setSuccess(`Successfully created ${response.created.length} products. Skipped: ${response.skipped.length}`);
      setUploadFile(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getProductCodeName = (codeId: number) => {
    const matched = productCodes.find((x) => x.id === codeId);
    return matched ? matched.product_code : `ID: ${codeId}`;
  };

  return (
    <div className="stack" style={{ gap: "2rem" }}>
      {error && (
        <div className="error-box">
          <span className="error-text"><strong>Error:</strong> {error}</span>
          <button type="button" className="small button-secondary" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {success && (
        <div className="success-box">
          {success}
        </div>
      )}

      <div className="row-between">
        <h2>SKU Inventory ({products.length})</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="button-secondary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Close Form" : "Add SKU Product"}
          </button>
          <a href="http://127.0.0.1:8000/api/v1/products/bulk/template?format=csv" download style={{ textDecoration: "none" }}>
            <button type="button" className="button-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.25rem'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Get CSV Template
            </button>
          </a>
        </div>
      </div>

      {showForm && (
        <section className="card">
          <h3>{editId ? "Edit SKU Product" : "Register New Product"}</h3>
          <form onSubmit={handleSubmit} className="stack" style={{ marginTop: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <label>
                Product Name *
                <input 
                  value={productName} 
                  onChange={(e) => setProductName(e.target.value)} 
                  placeholder="e.g. Pepsi 500ml Can"
                  required
                />
              </label>

              <label>
                Product Code Mapping *
                <select 
                  value={productCodeId} 
                  onChange={(e) => setProductCodeId(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                >
                  <option value="">-- Select Map Code --</option>
                  {productCodes.map((code) => (
                    <option key={code.id} value={code.id}>{code.product_code}</option>
                  ))}
                </select>
              </label>

              <label>
                Brand
                <input 
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)} 
                  placeholder="e.g. PepsiCo"
                />
              </label>

              <label>
                Category
                <input 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  placeholder="e.g. Beverages"
                />
              </label>

              <label>
                AI Model ID (ai_code)
                <input 
                  value={aiCode} 
                  onChange={(e) => setAiCode(e.target.value)} 
                  placeholder="e.g. pepsi_500can"
                />
              </label>

              <label>
                Auditing SKU Type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="self">Self (Own SKU)</option>
                  <option value="competitor">Competitor SKU</option>
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="submit">{editId ? "Update Product" : "Save Product"}</button>
              <button type="button" className="button-secondary" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {/* Bulk Upload Form */}
      <section className="card">
        <h3>Bulk Uploader</h3>
        <p className="subtle" style={{marginBottom: '1rem'}}>Upload a completed CSV/Excel sheet containing product specifications.</p>
        <form onSubmit={handleBulkUpload} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
          <input 
            type="file" 
            accept=".csv, .xlsx" 
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
          />
          <button type="submit" disabled={!uploadFile || uploading}>
            {uploading ? "Uploading..." : "Upload Spreadsheet"}
          </button>
        </form>
      </section>

      {/* Searching / Filtering Grid */}
      <section className="card">
        <h3>Search & Filters</h3>
        <div className="filter-row" style={{ marginTop: "1rem" }}>
          <input 
            placeholder="Name search" 
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
          <input 
            placeholder="Brand search" 
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
          />
          <input 
            placeholder="Category search" 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="self">Self (Own)</option>
            <option value="competitor">Competitor</option>
          </select>
          <select 
            value={filterCodeId}
            onChange={(e) => setFilterCodeId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">All Product Codes</option>
            {productCodes.map((code) => (
              <option key={code.id} value={code.id}>{code.product_code}</option>
            ))}
          </select>
          <button type="button" className="small" onClick={handleSearch}>Filter</button>
          <button type="button" className="small button-secondary" onClick={handleClearFilters}>Reset</button>
        </div>

        {loading ? (
          <div className="skeleton-block" style={{ marginTop: "1rem" }} />
        ) : products.length === 0 ? (
          <div className="empty-state" style={{ marginTop: "1.5rem" }}>
            <strong>No products registered</strong>
            <p>Adjust your search filters or click &apos;Add SKU Product&apos; to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU Name</th>
                  <th>Product Code Map</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>AI Identifier</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.product_name}</strong></td>
                    <td><span className="chip processing">{getProductCodeName(p.product_code_id)}</span></td>
                    <td>{p.brand || "-"}</td>
                    <td>{p.category || "-"}</td>
                    <td><code>{p.ai_code || "-"}</code></td>
                    <td>
                      <span className={`chip ${p.type === "self" || p.type === "own" ? "completed" : "failed"}`}>
                        {p.type === "self" || p.type === "own" ? "Self" : "Competitor"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="button" className="small button-secondary" onClick={() => handleEdit(p)}>Edit</button>
                        <button type="button" className="small button-danger" onClick={() => void handleDelete(p.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
