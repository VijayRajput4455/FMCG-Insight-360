"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { SkeletonBlock } from "@/components/Skeleton";
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

  // Form Editor State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [productCodeId, setProductCodeId] = useState<number | "">("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Beverages");
  const [aiCode, setAiCode] = useState("");
  const [type, setType] = useState("self");

  // Search & Filter state variables
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Bulk operation file states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [codesList, productsList] = await Promise.all([
        listProductCodes(),
        listProducts(0, 150)
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

  const getProductCodeName = useCallback((codeId: number) => {
    const matched = productCodes.find((x) => x.id === codeId);
    return matched ? matched.product_code : `ID: ${codeId}`;
  }, [productCodes]);

  // Get dynamic unique list of brands for filtering
  const uniqueBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    products.forEach(p => {
      if (p.brand) brandsSet.add(p.brand.trim());
    });
    return Array.from(brandsSet);
  }, [products]);

  // Client-Side Simulated stock levels and price mapping
  const items = useMemo(() => {
    return products.map(p => {
      // Deterministic prices and stock from product ID
      const price = ((p.id * 1.49) % 12 + 1.49).toFixed(2);
      const stock = (p.id * 13) % 180;
      let status: "in-stock" | "low-stock" | "out-of-stock" = "in-stock";
      if (stock === 0) status = "out-of-stock";
      else if (stock < 15) status = "low-stock";

      return {
        ...p,
        price: `$${price}`,
        stock,
        status,
        updatedAt: new Date(p.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      };
    });
  }, [products]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const codeName = getProductCodeName(item.product_code_id);
      const matchesQuery = 
        item.product_name.toLowerCase().includes(query.toLowerCase()) ||
        (item.brand || "").toLowerCase().includes(query.toLowerCase()) ||
        codeName.toLowerCase().includes(query.toLowerCase());

      const matchesCategory = filterCategory === "all" || item.category === filterCategory;
      const matchesBrand = filterBrand === "all" || item.brand === filterBrand;
      const matchesStatus = filterStatus === "all" || item.status === filterStatus;

      return matchesQuery && matchesCategory && matchesBrand && matchesStatus;
    });
  }, [items, query, filterCategory, filterBrand, filterStatus, getProductCodeName]);

  const resetForm = () => {
    setEditId(null);
    setProductName("");
    setProductCodeId("");
    setBrand("");
    setCategory("Beverages");
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
    setCategory(p.category || "Beverages");
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
      setSuccess(`Successfully imported ${response.created.length} products. Skipped: ${response.skipped.length}`);
      setUploadFile(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  };

  // CSV Exporter
  const handleExport = () => {
    if (products.length === 0) return;
    const headers = ["ID", "Product Name", "SKU Code ID", "SKU Code Map", "Brand", "Category", "AI Identifier", "Type", "Price", "Stock"];
    const rows = filteredItems.map(p => [
      p.id,
      p.product_name,
      p.product_code_id,
      getProductCodeName(p.product_code_id),
      p.brand || "",
      p.category || "",
      p.ai_code || "",
      p.type || "",
      p.price,
      p.stock
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fmcg_catalog_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      {/* 1. Header Toolbar */}
      <div className="row-between" style={{ alignItems: "center" }}>
        <div>
          <span className="kpi-label" style={{ color: "var(--accent-primary)" }}>FMCG Database</span>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0.25rem 0" }}>Product SKU Catalog</h2>
          <p className="subtle">Manage retail inventory, product pricing indexes, and AI model parameters.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="button-secondary" style={{ boxShadow: "var(--shadow-sm)" }} onClick={handleExport} disabled={filteredItems.length === 0}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "0.25rem" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button type="button" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel Adding" : "+ Add Catalog SKU"}
          </button>
        </div>
      </div>

      {/* 2. Inline Add / Edit Form Panel */}
      {showForm && (
        <section className="card stack" style={{
          background: "linear-gradient(135deg, #FAFCF8 0%, #FFFFFF 100%)",
          border: "1px solid rgba(46, 125, 50, 0.12)"
        }}>
          <h3>{editId ? "Update Product Record" : "Add SKU Product to Catalog"}</h3>
          <form onSubmit={handleSubmit} className="stack" style={{ marginTop: "1.25rem", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
              <label>
                <span>Product Name *</span>
                <input 
                  value={productName} 
                  onChange={(e) => setProductName(e.target.value)} 
                  placeholder="e.g. Pepsi 500ml Can"
                  required
                />
              </label>

              <label>
                <span>SKU Code Mapping *</span>
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
                <span>Brand</span>
                <input 
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)} 
                  placeholder="e.g. PepsiCo"
                />
              </label>

              <label>
                <span>Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Beverages">Beverages</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Home Care">Home Care</option>
                  <option value="Packaged Food">Packaged Food</option>
                  <option value="Confectionery">Confectionery</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                <span>AI Identifier (ai_code)</span>
                <input 
                  value={aiCode} 
                  onChange={(e) => setAiCode(e.target.value)} 
                  placeholder="e.g. pepsi_500can"
                />
              </label>

              <label>
                <span>Auditing SKU Type</span>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="self">Self (Own SKU)</option>
                  <option value="competitor">Competitor SKU</option>
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="submit">{editId ? "Save Changes" : "Create Product"}</button>
              <button type="button" className="button-secondary" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {/* 3. Catalog Filters and Table Wrapper */}
      <section className="card stack">
        {/* Modern Filter Toolbar */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
          gap: "0.75rem",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "1.25rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: "99px", padding: "0.45rem 0.85rem" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input 
              placeholder="Search by name, code..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", width: "100%", padding: 0 }}
            />
          </div>

          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ borderRadius: "99px", padding: "0.5rem 0.85rem" }}
          >
            <option value="all">All Categories</option>
            <option value="Beverages">Beverages</option>
            <option value="Snacks">Snacks</option>
            <option value="Dairy">Dairy</option>
            <option value="Personal Care">Personal Care</option>
            <option value="Home Care">Home Care</option>
            <option value="Packaged Food">Packaged Food</option>
            <option value="Confectionery">Confectionery</option>
            <option value="Other">Other</option>
          </select>

          <select 
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            style={{ borderRadius: "99px", padding: "0.5rem 0.85rem" }}
          >
            <option value="all">All Brands</option>
            {uniqueBrands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ borderRadius: "99px", padding: "0.5rem 0.85rem" }}
          >
            <option value="all">All Stock Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
        </div>

        {/* Data Table Rendering */}
        {loading ? (
          <SkeletonBlock height={300} />
        ) : filteredItems.length === 0 ? (
          /* Empty State Illustration */
          <div className="empty-state" style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <svg style={{ width: "80px", height: "80px", color: "var(--border-focus)", opacity: 0.2, margin: "0 auto 1.25rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <strong style={{ fontSize: "1.1rem" }}>Product Catalog Empty</strong>
            <p className="subtle" style={{ fontSize: "0.88rem", marginTop: "0.25rem" }}>
              No product items correspond to your current query parameters. Try widening filters or click add to define new records.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>SKU Map</th>
                  <th>Price</th>
                  <th>Stock Level</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((p) => {
                  const initials = p.product_name.substring(0, 2).toUpperCase();
                  return (
                    <tr key={p.id} className="table-row-hover">
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          {/* Circular Gradient Avatar */}
                          <div className="topnav-profile-avatar" style={{
                            width: "36px",
                            height: "36px",
                            fontSize: "0.8rem",
                            background: "linear-gradient(135deg, var(--accent-light) 0%, var(--accent-glow) 100%)",
                            border: "1px solid var(--border)",
                            color: "var(--accent-primary)"
                          }}>
                            {initials}
                          </div>
                          <div>
                            <strong>{p.product_name}</strong>
                            <div className="subtle" style={{ fontSize: "0.72rem" }}>
                              Brand: {p.brand || "Generic"} | ID: {p.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{p.category || "Other"}</td>
                      <td>
                        <span className="chip processing" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                          {getProductCodeName(p.product_code_id)}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--text-primary)" }}>{p.price}</strong>
                      </td>
                      <td>
                        <span 
                          className={`chip ${
                            p.status === "in-stock" ? "completed" :
                            p.status === "low-stock" ? "warning" : "failed"
                          }`}
                          style={{ fontSize: "0.7rem", fontWeight: 700 }}
                        >
                          {p.stock} units ({
                            p.status === "in-stock" ? "In Stock" :
                            p.status === "low-stock" ? "Low Stock" : "Out of Stock"
                          })
                        </span>
                      </td>
                      <td>{p.updatedAt}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem", justifyContent: "flex-end" }}>
                          <button type="button" className="small button-secondary" onClick={() => handleEdit(p)}>
                            Edit
                          </button>
                          <button type="button" className="small button-danger" onClick={() => void handleDelete(p.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. Bulk Spreadsheet Operations */}
      <section className="card stack" style={{ gap: "1rem" }}>
        <div className="panel-head">
          <h3>Spreadsheet Bulk Import</h3>
          <p className="subtle">Upload spreadsheets containing catalog listings or download audit layouts.</p>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
          <a href="http://127.0.0.1:8000/api/v1/products/bulk/template?format=csv" download style={{ textDecoration: "none" }}>
            <button type="button" className="button-secondary" style={{ boxShadow: "var(--shadow-sm)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "0.25rem" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download CSV Template
            </button>
          </a>

          <form onSubmit={handleBulkUpload} style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              style={{ fontSize: "0.82rem" }}
            />
            <button type="submit" disabled={!uploadFile || uploading}>
              {uploading ? "Importing Records..." : "Import CSV Catalog"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
