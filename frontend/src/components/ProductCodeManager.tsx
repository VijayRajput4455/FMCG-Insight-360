"use client";

import { useEffect, useMemo, useState } from "react";
import ErrorBox from "@/components/ErrorBox";
import { SkeletonBlock } from "@/components/Skeleton";
import {
  createProductCode,
  deleteProductCodeByName,
  listProductCodes,
  updateProductCodeByName,
  type ProductCode,
} from "@/lib/api";

type ParsedProductCode = {
  id: number;
  product_code: string;
  descriptionText: string;
  category: string;
  brand: string;
  status: "active" | "inactive";
  created_at: string;
};

const EMPTY_FORM = {
  product_code: "",
  descriptionText: "",
  category: "Beverages",
  brand: "",
  status: "active" as "active" | "inactive",
};

export default function ProductCodeManager() {
  const [rawItems, setRawItems] = useState<ProductCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Editor states
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadProductCodes() {
    setLoading(true);
    try {
      const data = await listProductCodes();
      setRawItems(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load product codes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProductCodes();
  }, []);

  // Parse raw descriptions (JSON check)
  const items: ParsedProductCode[] = useMemo(() => {
    return rawItems.map((item) => {
      let descriptionText = "";
      let category = "Beverages";
      let brand = "Standard";
      let status: "active" | "inactive" = "active";

      try {
        if (item.description && (item.description.startsWith("{") || item.description.startsWith("["))) {
          const parsed = JSON.parse(item.description);
          descriptionText = parsed.note || "";
          category = parsed.category || "Beverages";
          brand = parsed.brand || "Standard";
          status = parsed.status === "inactive" ? "inactive" : "active";
        } else {
          descriptionText = item.description || "";
        }
      } catch {
        descriptionText = item.description || "";
      }

      return {
        id: item.id,
        product_code: item.product_code,
        descriptionText,
        category,
        brand,
        status,
        created_at: item.created_at,
      };
    });
  }, [rawItems]);

  // Filters processing
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.product_code.toLowerCase().includes(query.toLowerCase()) ||
        item.descriptionText.toLowerCase().includes(query.toLowerCase()) ||
        item.brand.toLowerCase().includes(query.toLowerCase());

      const matchesCategory = filterCategory === "all" || item.category === filterCategory;
      const matchesStatus = filterStatus === "all" || item.status === filterStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, query, filterCategory, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const documented = items.filter((i) => i.descriptionText.trim().length > 0).length;
    const visible = filteredItems.length;
    const matching = items.filter((i) => i.category === "Beverages").length; // Beverages counts

    return { total, documented, visible, matching };
  }, [items, filteredItems]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, filterCategory, filterStatus]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingCode(null);
    setSuccessMessage(null);
  }

  function startEdit(item: ParsedProductCode) {
    setEditingCode(item.product_code);
    setForm({
      product_code: item.product_code,
      descriptionText: item.descriptionText,
      category: item.category,
      brand: item.brand,
      status: item.status,
    });
    setError(null);
    setSuccessMessage(null);
  }

  function startDuplicate(item: ParsedProductCode) {
    setEditingCode(null);
    setForm({
      product_code: `${item.product_code}_COPY`,
      descriptionText: item.descriptionText,
      category: item.category,
      brand: item.brand,
      status: item.status,
    });
    setError(null);
    setSuccessMessage(`Duplicated parameters of ${item.product_code}. Ready for save.`);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Serialize details inside description field
    const serializedDescription = JSON.stringify({
      note: form.descriptionText,
      category: form.category,
      brand: form.brand,
      status: form.status,
    });

    try {
      if (editingCode) {
        await updateProductCodeByName(editingCode, {
          product_code: form.product_code.trim(),
          description: serializedDescription,
        });
        setSuccessMessage(`Updated SKU "${form.product_code}" successfully.`);
      } else {
        await createProductCode({
          product_code: form.product_code.trim(),
          description: serializedDescription,
        });
        setSuccessMessage(`Registered SKU "${form.product_code}" successfully.`);
      }
      resetForm();
      await loadProductCodes();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save SKU code");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(productCode: string) {
    if (!window.confirm(`Are you sure you want to delete SKU code "${productCode}"?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteProductCodeByName(productCode);
      if (editingCode === productCode) {
        resetForm();
      }
      setSuccessMessage(`Deleted SKU "${productCode}" successfully.`);
      await loadProductCodes();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete SKU code");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack" style={{ gap: "2rem" }}>
      {/* 1. Large Hero Header Card */}
      <section className="card row-between" style={{
        background: "linear-gradient(135deg, #E8F5E9 0%, #FAFCF8 100%)",
        border: "1px solid rgba(46, 125, 50, 0.12)",
        position: "relative",
        overflow: "hidden",
        padding: "2rem"
      }}>
        <div style={{ position: "relative", zIndex: 2, maxWidth: "60%" }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-primary)" }}>FMCG Inventory Mapping</span>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.25rem 0", color: "#1B1B1B" }}>Product Code Administration</h2>
          <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: "1.5" }}>
            Configure and maintain standard SKU category codes that operators map during neural shelf scans and operations audits.
          </p>
        </div>

        {/* Tag Illustration inside Hero */}
        <div className="hero-illustration" style={{ display: "flex", gap: "0.5rem", alignItems: "center", zIndex: 2 }}>
          <div style={{ padding: "0.5rem 1rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "99px", fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: "0.35rem", boxShadow: "var(--shadow-sm)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>SKU Tag</span>
          </div>
          <div style={{ padding: "0.5rem 1rem", background: "#E8F5E9", border: "1px solid rgba(46,125,50,0.15)", borderRadius: "99px", fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: "0.35rem", boxShadow: "var(--shadow-sm)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            <span>Audits Map</span>
          </div>
          <button 
            type="button" 
            className="button-secondary small" 
            style={{ borderRadius: "99px", padding: "0.5rem 1rem" }}
            onClick={() => void loadProductCodes()} 
            disabled={loading || saving}
          >
            Refresh
          </button>
        </div>
      </section>

      {/* 2. Four Statistics Cards */}
      <section className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: "4px solid var(--danger)" }}>
          <span className="kpi-label">Total Product Codes</span>
          <strong className="kpi-value">{stats.total}</strong>
          <span className="kpi-sub">Total database SKU mappings</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid var(--info)" }}>
          <span className="kpi-label">Documented Codes</span>
          <strong className="kpi-value">{stats.documented}</strong>
          <span className="kpi-sub">SKUs with description metadata</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <span className="kpi-label">Visible Codes</span>
          <strong className="kpi-value">{stats.visible}</strong>
          <span className="kpi-sub">Matching search query filters</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid var(--warning)" }}>
          <span className="kpi-label">Beverage Mappings</span>
          <strong className="kpi-value">{stats.matching}</strong>
          <span className="kpi-sub">Assigned to beverages category</span>
        </div>
      </section>

      {/* 3. Main Split Grid */}
      <div className="detail-grid">
        {/* Left Column: Form Editor */}
        <section className="card stack" style={{ alignSelf: "start" }}>
          <div className="panel-head row-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
            <div>
              <span className="kpi-label" style={{ color: "var(--accent-primary)" }}>Form Configuration</span>
              <h3 style={{ margin: "0.25rem 0 0" }}>{editingCode ? `Edit ${editingCode}` : "Create Product Code"}</h3>
            </div>
            <span className={`chip ${editingCode ? "processing" : "completed"}`} style={{ fontSize: "0.7rem", fontWeight: 700 }}>
              {editingCode ? "Editing" : "New SKU"}
            </span>
          </div>

          {error && <ErrorBox message={error} onRetry={() => void loadProductCodes()} />}
          {successMessage && <div className="success-box">{successMessage}</div>}

          <form className="stack" style={{ gap: "1.25rem", marginTop: "1rem" }} onSubmit={handleSubmit}>
            <label>
              <span>SKU / Product Code *</span>
              <input
                value={form.product_code}
                onChange={(e) => setForm((c) => ({ ...c, product_code: e.target.value }))}
                placeholder="e.g. SKU_COCACOLA_500"
                required
                maxLength={50}
              />
              <small className="subtle" style={{ fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                Required. Capital letters, numbers, `_` and `-` only.
              </small>
            </label>

            <label>
              <span>Category *</span>
              <select
                value={form.category}
                onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
                required
              >
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

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem" }}>
              <label>
                <span>Brand</span>
                <input
                  value={form.brand}
                  onChange={(e) => setForm((c) => ({ ...c, brand: e.target.value }))}
                  placeholder="e.g. Coca-Cola Co."
                />
              </label>

              <label>
                <span>Status *</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as any }))}
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <label>
              <span>Description</span>
              <textarea
                value={form.descriptionText}
                onChange={(e) => setForm((c) => ({ ...c, descriptionText: e.target.value }))}
                placeholder="Write internal notes to describe this product SKU"
                maxLength={500}
                style={{ minHeight: "100px" }}
              />
            </label>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="submit" disabled={saving} style={{ flexGrow: 1 }}>
                {saving ? "Saving..." : editingCode ? "Save Changes" : "Save Code"}
              </button>
              <button type="button" className="button-secondary" onClick={resetForm} disabled={saving}>
                Reset
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Code Registry */}
        <section className="card stack">
          <div className="panel-head row-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
            <div>
              <span className="kpi-label" style={{ color: "var(--info)" }}>Database</span>
              <h3 style={{ margin: "0.25rem 0 0" }}>Existing Product Codes</h3>
            </div>
            <span className="chip processing" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
              {filteredItems.length} Mapped
            </span>
          </div>

          {/* Search and Filters */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "0.5rem", marginTop: "1rem" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code, brand..."
              style={{ padding: "0.45rem 0.75rem", fontSize: "0.82rem" }}
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: "0.45rem 0.75rem", fontSize: "0.82rem" }}
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "0.45rem 0.75rem", fontSize: "0.82rem" }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {loading ? (
            <SkeletonBlock height={320} />
          ) : filteredItems.length === 0 ? (
            /* Empty State Illustration */
            <div className="empty-state" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
              <svg style={{ width: "80px", height: "80px", color: "var(--border-focus)", opacity: 0.25, margin: "0 auto 1rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.3c0 .66.273 1.29.757 1.743L14.33 21.8c.814.814 2.13.814 2.944 0l4.72-4.72a2.08 2.08 0 0 0 0-2.944L11.31 3.757A2.247 2.247 0 0 0 9.568 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h.008v.008H6V7.5Z" />
              </svg>
              <strong>No product codes match your query.</strong>
              <p className="subtle" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                Add your first code using the config editor or relax filter parameters.
              </p>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SKU Code</th>
                      <th>Category / Brand</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => (
                      <tr 
                        key={item.id} 
                        style={{ 
                          background: editingCode === item.product_code ? "var(--accent-light)" : "",
                          cursor: "pointer",
                          transition: "var(--transition)"
                        }}
                      >
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                            <strong>{item.product_code}</strong>
                            <span className="subtle" style={{ fontSize: "0.72rem" }}>
                              {item.descriptionText || "No notes registered."}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                            <span>{item.category}</span>
                            <span className="subtle" style={{ fontSize: "0.72rem" }}>{item.brand}</span>
                          </div>
                        </td>
                        <td>
                          <span 
                            className={`chip ${item.status === "active" ? "completed" : "failed"}`}
                            style={{ fontSize: "0.7rem", fontWeight: 700 }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.25rem", justifyContent: "flex-end" }}>
                            <button 
                              type="button" 
                              className="small button-secondary" 
                              onClick={() => startEdit(item)} 
                              title="Edit SKU"
                            >
                              Edit
                            </button>
                            <button 
                              type="button" 
                              className="small button-secondary" 
                              onClick={() => startDuplicate(item)}
                              title="Duplicate SKU Settings"
                            >
                              Dup
                            </button>
                            <button 
                              type="button" 
                              className="small button-danger" 
                              onClick={() => void handleDelete(item.product_code)}
                              title="Delete SKU"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="row-between" style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "auto" }}>
                  <span className="subtle" style={{ fontSize: "0.8rem" }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button
                      type="button"
                      className="small button-secondary"
                      onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      &larr; Prev
                    </button>
                    <button
                      type="button"
                      className="small button-secondary"
                      onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}