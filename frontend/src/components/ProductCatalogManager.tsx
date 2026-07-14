"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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

type ViewMode = "grid" | "list";

export default function ProductCatalogManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // View state (Matches Screen 6)
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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

  const handleSearch = async (targetCategory?: string) => {
    setLoading(true);
    const cat = targetCategory !== undefined ? targetCategory : filterCategory;
    try {
      const results = await searchProducts({
        product_code_id: filterCodeId || undefined,
        name: filterName || undefined,
        brand: filterBrand || undefined,
        category: cat || undefined,
        type: filterType || undefined,
        limit: 100
      });
      setProducts(results);
      setViewMode("list");
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
      setViewMode("list");
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
      setViewMode("list");
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

  // Mock categories list with visual metadata (Matches Screen 6)
  const categoryMetadata = useMemo(() => {
    const defaultCats = [
      { name: "Beverages", icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7V4H5v11a7 7 0 0 0 7 7z"/><path d="M19 8h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"/><line x1="5" y1="10" x2="19" y2="10"/></svg>
      )},
      { name: "Snacks", icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v20"/><path d="M18 2v20"/><path d="M6 12h12"/><path d="M6 7h12"/><path d="M6 17h12"/></svg>
      )},
      { name: "Daily", icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M3 12h18"/><circle cx="12" cy="12" r="4"/></svg>
      )},
      { name: "Personal Care", icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 10c0-5.523-4.477-10-10-10S0 4.477 0 10s4.477 10 10 10c0-1.5 1-2 2-3s1-2.5 1-3.5"/><path d="M12 7c2 0 3 1.5 3 3.5S14 14 12 14"/></svg>
      )},
      { name: "Home Care", icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      )},
      { name: "Packaged Food", icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
      )},
      { name: "Confectionery", icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 1 0 10 10H12V2z"/></svg>
      )},
      { name: "Other", icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>
      )}
    ];

    return defaultCats.map((cat) => {
      const matchCount = products.filter(
        (p) => (p.category || "").toLowerCase() === cat.name.toLowerCase()
      ).length;
      return {
        ...cat,
        count: matchCount
      };
    });
  }, [products]);

  const handleCategoryClick = (catName: string) => {
    setFilterCategory(catName);
    void handleSearch(catName);
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
        <div>
          <h2>Product SKU Catalog</h2>
          <p className="subtle">Manage standard retail items, competing products, and category filters.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {viewMode === "list" ? (
            <button type="button" className="button-secondary" onClick={() => setViewMode("grid")}>
              &larr; View Categories Grid
            </button>
          ) : (
            <button type="button" className="button-secondary" onClick={() => setViewMode("list")}>
              View All SKUs List
            </button>
          )}
          <button type="button" className="button-secondary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Close Form" : "Add SKU Product"}
          </button>
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
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">-- Select Category --</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Daily">Daily</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Home Care">Home Care</option>
                  <option value="Packaged Food">Packaged Food</option>
                  <option value="Confectionery">Confectionery</option>
                  <option value="Other">Other</option>
                </select>
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

      {/* Grid Mode vs List Mode View Rendering */}
      {viewMode === "grid" ? (
        <div className="stack" style={{ gap: "2rem" }}>
          {/* Categories Grid (Matches Screen 6) */}
          <section className="category-grid">
            {categoryMetadata.map((cat) => (
              <div 
                key={cat.name} 
                className="category-card"
                onClick={() => handleCategoryClick(cat.name)}
              >
                <div className="category-card-icon">
                  {cat.icon}
                </div>
                <div className="category-card-name">{cat.name}</div>
                <div className="category-card-count">{cat.count} Product(s)</div>
              </div>
            ))}
          </section>

          {/* Bulk Upload Form */}
          <section className="card">
            <h3>Bulk Operations</h3>
            <p className="subtle" style={{marginBottom: '1rem'}}>Download templates or upload a completed spreadsheet to bulk import SKU settings.</p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
              <a href="http://127.0.0.1:8000/api/v1/products/bulk/template?format=csv" download style={{ textDecoration: "none" }}>
                <button type="button" className="button-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.25rem'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Get CSV Template
                </button>
              </a>
              <form onSubmit={handleBulkUpload} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <input 
                  type="file" 
                  accept=".csv, .xlsx" 
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                <button type="submit" disabled={!uploadFile || uploading}>
                  {uploading ? "Uploading..." : "Upload Spreadsheet"}
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : (
        /* List Mode Table View (Matches Screen 6 Detail view) */
        <section className="card">
          <div className="row-between" style={{ marginBottom: "1rem" }}>
            <h3>SKU Inventory list</h3>
            <button type="button" className="small button-secondary" onClick={() => setViewMode("grid")}>
              Categories Grid view
            </button>
          </div>

          <div className="filter-row">
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
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Beverages">Beverages</option>
              <option value="Snacks">Snacks</option>
              <option value="Daily">Daily</option>
              <option value="Personal Care">Personal Care</option>
              <option value="Home Care">Home Care</option>
              <option value="Packaged Food">Packaged Food</option>
              <option value="Confectionery">Confectionery</option>
              <option value="Other">Other</option>
            </select>
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
              <option value="">All Map Codes</option>
              {productCodes.map((code) => (
                <option key={code.id} value={code.id}>{code.product_code}</option>
              ))}
            </select>
            <button type="button" className="small" onClick={() => void handleSearch()}>Search</button>
            <button type="button" className="small button-secondary" onClick={handleClearFilters}>Reset</button>
          </div>

          {loading ? (
            <div className="skeleton-block" style={{ marginTop: "1rem" }} />
          ) : products.length === 0 ? (
            <div className="empty-state">
              <strong>No products registered</strong>
              <p>Try changing your search parameters or check filters.</p>
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
                      <td>{p.category || "Other"}</td>
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
      )}
    </div>
  );
}
