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
  const [category, setCategory] = useState("");
  const [aiCode, setAiCode] = useState("");
  const [type, setType] = useState("self");
  const [status, setStatus] = useState("active");

  // Search & Filter state variables
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterSku, setFilterSku] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

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

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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

  const uniqueCategories = useMemo(() => {
    const catsSet = new Set<string>();
    products.forEach(p => {
      if (p.category) catsSet.add(p.category.trim());
    });
    return Array.from(catsSet);
  }, [products]);

  const uniqueCategoriesCount = useMemo(() => {
    return uniqueCategories.length;
  }, [uniqueCategories]);

  const uniqueSkuCodes = useMemo(() => {
    const skuIdsSet = new Set<number>();
    products.forEach(p => {
      skuIdsSet.add(p.product_code_id);
    });
    return Array.from(skuIdsSet).map(id => {
      return {
        id,
        codeName: getProductCodeName(id)
      };
    }).sort((a, b) => a.codeName.localeCompare(b.codeName));
  }, [products, getProductCodeName]);

  const aiCodeCount = useMemo(() => {
    return products.filter(p => p.ai_code && p.ai_code.trim() !== "").length;
  }, [products]);

  const selfProductCount = useMemo(() => {
    return products.filter(p => p.type !== "competitor").length;
  }, [products]);

  const competitorProductCount = useMemo(() => {
    return products.filter(p => p.type === "competitor").length;
  }, [products]);

  // Process products for UI
  const items = useMemo(() => {
    return products.map(p => {
      return {
        ...p,
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
        (item.category || "").toLowerCase().includes(query.toLowerCase()) ||
        (item.ai_code || "").toLowerCase().includes(query.toLowerCase()) ||
        codeName.toLowerCase().includes(query.toLowerCase());

      const matchesCategory = filterCategory === "all" || item.category === filterCategory;
      const matchesBrand = filterBrand === "all" || item.brand === filterBrand;
      const matchesSku = filterSku === "all" || String(item.product_code_id) === filterSku;
      const matchesType = filterType === "all" || (filterType === "self" ? item.type !== "competitor" : item.type === "competitor");

      return matchesQuery && matchesCategory && matchesBrand && matchesSku && matchesType;
    });
  }, [items, query, filterCategory, filterBrand, filterSku, filterType, getProductCodeName]);

  const resetForm = () => {
    setEditId(null);
    setProductName("");
    setProductCodeId("");
    setBrand("");
    setCategory("");
    setAiCode("");
    setType("self");
    setStatus("active");
    setFilterSku("all");
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
      status: status,
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
    setStatus(p.status || "active");
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const executeDelete = async (id: number) => {
    try {
      await deleteProduct(id);
      setSuccess("Product deleted successfully!");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  const handleToggleStatus = async (p: Product) => {
    const nextStatus = p.status === "active" ? "inactive" : "active";
    try {
      await updateProduct(p.id, {
        product_name: p.product_name,
        product_code_id: p.product_code_id,
        brand: p.brand || undefined,
        category: p.category || undefined,
        ai_code: p.ai_code || undefined,
        type: p.type || undefined,
        status: nextStatus,
      });
      setSuccess(`Product "${p.product_name}" status updated to ${nextStatus}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle product status");
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
    const headers = ["ID", "Product Name", "SKU Code ID", "SKU Code Map", "Brand", "Category", "AI Identifier", "Type", "Status", "Last Updated"];
    const rows = filteredItems.map(p => [
      p.id,
      p.product_name,
      p.product_code_id,
      getProductCodeName(p.product_code_id),
      p.brand || "",
      p.category || "",
      p.ai_code || "",
      p.type || "",
      p.status || "active",
      p.updatedAt
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
      {deleteId !== null && (
        <div className="modal-overlay">
          <div className="modal-content error-modal animate-slide-in">
            <div className="modal-header">
              <div className="error-icon-wrapper" style={{ background: "rgba(229, 57, 53, 0.1)", color: "#E53935" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this product?</p>
            </div>
            <div className="modal-footer" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" className="button-secondary" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button type="button" className="button-danger" style={{ background: "#ef4444", color: "#ffffff" }} onClick={async () => {
                const idToDelete = deleteId;
                setDeleteId(null);
                await executeDelete(idToDelete);
              }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="modal-overlay">
          <div className="modal-content error-modal animate-slide-in">
            <div className="modal-header">
              <div className="error-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3>Action Failed</h3>
            </div>
            <div className="modal-body">
              <p>{error}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="button-danger" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="toast-container">
          <div className="toast show">
            <div className="toast-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="toast-message">{success}</div>
            <button type="button" className="toast-close-btn" onClick={() => setSuccess(null)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* 1. Four KPI Statistics Cards */}
      <section className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: "4px solid #E53935", background: "linear-gradient(180deg, #FFFFFF 0%, #FFF3F3 40%, #FFCDD2 70%, #EF5350 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#C62828", fontWeight: 700 }}>Total Products</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{products.length}</strong>
          <span className="kpi-sub" style={{ color: "#B71C1C", fontWeight: 700 }}>🏷️ {selfProductCount} Self | 🥊 {competitorProductCount} Competitors</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #1E88E5", background: "linear-gradient(180deg, #FFFFFF 0%, #F1F8FF 40%, #B3E5FC 70%, #42A5F5 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#0D47A1", fontWeight: 700 }}>Total Brands</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{uniqueBrands.length}</strong>
          <span className="kpi-sub" style={{ color: "#0D47A1", fontWeight: 500 }}>Unique manufactured labels</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #43A047", background: "linear-gradient(180deg, #FFFFFF 0%, #F1F9F1 40%, #C8E6C9 70%, #66BB6A 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#1B5E20", fontWeight: 700 }}>Categories</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{uniqueCategoriesCount}</strong>
          <span className="kpi-sub" style={{ color: "#1B5E20", fontWeight: 500 }}>Distinct department divisions</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #FB8C00", background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F1 40%, #FFE0B2 70%, #FFA726 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#E65100", fontWeight: 700 }}>AI Code Count</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{aiCodeCount}</strong>
          <span className="kpi-sub" style={{ color: "#D84315", fontWeight: 500 }}>Neural identifier classifications</span>
        </div>
      </section>

      {/* 2. Cohesive Filters & Actions Toolbar Card */}
      <section className="card stack" style={{ padding: "1.25rem", boxShadow: "var(--shadow-sm)", borderLeft: "4px solid #43A047" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          {/* Filters Group */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: "99px", padding: "0.45rem 0.85rem", width: "220px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input 
                placeholder="Search catalog SKU..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", width: "100%", padding: 0 }}
              />
            </div>

            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ borderRadius: "99px", padding: "0.5rem 0.85rem", fontSize: "0.82rem", border: "1px solid var(--border)" }}
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select 
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              style={{ borderRadius: "99px", padding: "0.5rem 0.85rem", fontSize: "0.82rem", border: "1px solid var(--border)" }}
            >
              <option value="all">All Brands</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select 
              value={filterSku}
              onChange={(e) => setFilterSku(e.target.value)}
              style={{ borderRadius: "99px", padding: "0.5rem 0.85rem", fontSize: "0.82rem", border: "1px solid var(--border)" }}
            >
              <option value="all">All SKU Codes</option>
              {uniqueSkuCodes.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.codeName}</option>
              ))}
            </select>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ borderRadius: "99px", padding: "0.5rem 0.85rem", fontSize: "0.82rem", border: "1px solid var(--border)" }}
            >
              <option value="all">All Product Types</option>
              <option value="self">Self (Own Product)</option>
              <option value="competitor">Competitor Product</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button type="button" className="button-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", borderRadius: "99px", boxShadow: "var(--shadow-sm)" }} onClick={handleExport} disabled={filteredItems.length === 0}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "0.25rem" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
            <button type="button" style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", borderRadius: "99px" }} onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel SKU Form" : "+ Add Catalog SKU"}
            </button>
          </div>
        </div>
      </section>

      {/* 3. Inline Add / Edit Form Panel */}
      {showForm && (
        <section className="card stack" style={{
          background: "linear-gradient(135deg, #FAFCF8 0%, #FFFFFF 100%)",
          border: "1px solid rgba(46, 125, 50, 0.12)",
          padding: "1.75rem",
          boxShadow: "var(--shadow-sm)",
          borderLeft: "4px solid #1E88E5"
        }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{editId ? "Update Product Record" : "Add SKU Product to Catalog"}</h3>
          <form onSubmit={handleSubmit} className="stack" style={{ marginTop: "1.25rem", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
              <label className="stack" style={{ gap: "0.35rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Product Name *</span>
                <input 
                  value={productName} 
                  onChange={(e) => setProductName(e.target.value)} 
                  placeholder="e.g. Pepsi 500ml Can"
                  required
                />
              </label>

              <label className="stack" style={{ gap: "0.35rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>SKU Code Mapping *</span>
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

              <label className="stack" style={{ gap: "0.35rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Brand</span>
                <input 
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)} 
                  placeholder="e.g. PepsiCo"
                />
              </label>

              <label className="stack" style={{ gap: "0.35rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Category</span>
                <input 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  placeholder="e.g. Beverages"
                />
              </label>

              <label className="stack" style={{ gap: "0.35rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>AI Identifier (ai_code)</span>
                <input 
                  value={aiCode} 
                  onChange={(e) => setAiCode(e.target.value)} 
                  placeholder="e.g. pepsi_500can"
                />
              </label>

              <label className="stack" style={{ gap: "0.35rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Auditing SKU Type</span>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="self">Self (Own SKU)</option>
                  <option value="competitor">Competitor SKU</option>
                </select>
              </label>

              <label className="stack" style={{ gap: "0.35rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Status *</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} required>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="submit" style={{ borderRadius: "8px", padding: "0.5rem 1.25rem" }}>{editId ? "Save Changes" : "Create Product"}</button>
              <button type="button" className="button-secondary" style={{ borderRadius: "8px", padding: "0.5rem 1.25rem" }} onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {/* 4. Catalog Table Card */}
      <section className="card stack" style={{ padding: 0, overflow: "hidden", boxShadow: "var(--shadow-sm)", borderLeft: "4px solid #FB8C00" }}>
        {loading ? (
          <div style={{ padding: "2rem" }}>
            <SkeletonBlock height={300} />
          </div>
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
            <table style={{ margin: 0, border: "none" }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: "1.5rem" }}>Product Name</th>
                  <th>Ownership Type</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>AI Code</th>
                  <th>SKU Map</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: "right", paddingRight: "1.5rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((p) => {
                  const initials = p.product_name.substring(0, 2).toUpperCase();
                  const isCompetitor = p.type === "competitor";
                  return (
                    <tr key={p.id} className="table-row-hover">
                      <td style={{ paddingLeft: "1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          {/* Circular Gradient Avatar */}
                          <div className="topnav-profile-avatar" style={{
                            width: "36px",
                            height: "36px",
                            fontSize: "0.8rem",
                            background: isCompetitor 
                              ? "linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)" 
                              : "linear-gradient(135deg, var(--accent-light) 0%, var(--accent-glow) 100%)",
                            border: "1px solid var(--border)",
                            color: isCompetitor ? "#C62828" : "var(--accent-primary)"
                          }}>
                            {initials}
                          </div>
                          <div>
                            <strong>{p.product_name}</strong>
                            <div className="subtle" style={{ fontSize: "0.72rem" }}>
                              ID: {p.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.25rem 0.65rem",
                          borderRadius: "99px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          background: isCompetitor ? "#FFF3F3" : "#E8F5E9",
                          color: isCompetitor ? "#C62828" : "#2E7D32",
                          border: `1px solid ${isCompetitor ? "#FFCDD2" : "#A5D6A7"}`
                        }}>
                          <span>{isCompetitor ? "🥊 Competitor" : "🏷️ Self Product"}</span>
                        </span>
                      </td>
                      <td>{p.brand || "-"}</td>
                      <td>{p.category || "-"}</td>
                      <td>
                        {p.ai_code ? (
                          <code style={{ background: "var(--surface)", padding: "0.2rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem" }}>
                            {p.ai_code}
                          </code>
                        ) : (
                          <span className="subtle">-</span>
                        )}
                      </td>
                      <td>
                        <span className="chip processing" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                          {getProductCodeName(p.product_code_id)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(p)}
                          title={p.status === "active" ? "Click to deactivate" : "Click to activate"}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.4rem",
                            padding: "0.25rem 0.65rem", borderRadius: "99px", border: "none",
                            cursor: "pointer", fontSize: "0.7rem", fontWeight: 700,
                            background: p.status === "active" ? "#e6f9f0" : "#fdecea",
                            color: p.status === "active" ? "#15803d" : "#b91c1c",
                            transition: "all 0.2s"
                          }}
                        >
                          <span style={{
                            width: "6px", height: "6px", borderRadius: "50%",
                            background: p.status === "active" ? "#15803d" : "#b91c1c",
                            display: "inline-block"
                          }} />
                          {p.status === "active" ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td>{p.updatedAt}</td>
                      <td style={{ paddingRight: "1.5rem" }}>
                        <div style={{ display: "flex", gap: "0.25rem", justifyContent: "flex-end" }}>
                          <button type="button" className="small button-secondary" style={{ borderRadius: "6px" }} onClick={() => handleEdit(p)}>
                            Edit
                          </button>
                          <button type="button" className="small button-danger" style={{ borderRadius: "6px" }} onClick={() => void handleDelete(p.id)}>
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

      {/* 5. Spreadsheet Bulk Operations dropzone style */}
      <section className="card stack" style={{
        gap: "1.25rem",
        border: "2px dashed rgba(46, 125, 50, 0.25)",
        backgroundColor: "rgba(46, 125, 50, 0.015)",
        borderRadius: "16px",
        padding: "2rem",
        alignItems: "center",
        textAlign: "center",
        boxShadow: "none"
      }}>
        <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-primary)", marginBottom: "0.25rem" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>
        </div>
        <div className="panel-head" style={{ marginBottom: "0.5rem" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>Spreadsheet Bulk Import</h3>
          <p className="subtle" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Upload spreadsheets containing catalog listings or download the template layout.</p>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <a href="http://127.0.0.1:8000/api/v1/products/bulk/template?format=csv" download style={{ textDecoration: "none" }}>
            <button type="button" className="button-secondary" style={{ boxShadow: "var(--shadow-sm)", padding: "0.5rem 1rem", fontSize: "0.82rem", borderRadius: "99px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "0.25rem" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download CSV Template
            </button>
          </a>

          <span className="subtle" style={{ fontSize: "0.8rem", padding: "0 0.25rem" }}>or</span>

          <form onSubmit={handleBulkUpload} style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              style={{ fontSize: "0.82rem", cursor: "pointer" }}
            />
            <button type="submit" style={{ padding: "0.5rem 1rem", fontSize: "0.82rem", borderRadius: "99px" }} disabled={!uploadFile || uploading}>
              {uploading ? "Importing Records..." : "Import CSV Catalog"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
