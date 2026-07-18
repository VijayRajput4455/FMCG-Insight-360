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
        item.descriptionText.toLowerCase().includes(query.toLowerCase());

      const matchesStatus = filterStatus === "all" || item.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [items, query, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const documented = items.filter((i) => i.descriptionText.trim().length > 0).length;
    const visible = filteredItems.length;
    const active = items.filter((i) => i.status === "active").length;

    return { total, documented, visible, active };
  }, [items, filteredItems]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, filterStatus]);

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
      status: item.status,
    });
    setError(null);
    setSuccessMessage(null);
  }

  async function handleToggleStatus(item: ParsedProductCode) {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    const nextStatus = item.status === "active" ? "inactive" : "active";
    const serializedDescription = JSON.stringify({
      note: item.descriptionText,
      category: item.category,
      brand: item.brand,
      status: nextStatus,
    });
    try {
      await updateProductCodeByName(item.product_code, {
        product_code: item.product_code,
        description: serializedDescription,
      });
      setSuccessMessage(`SKU "${item.product_code}" ${nextStatus === "active" ? "activated" : "deactivated"} successfully.`);
      await loadProductCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to toggle status");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Serialize details inside description field
    const serializedDescription = JSON.stringify({
      note: form.descriptionText,
      category: "Other",
      brand: "Standard",
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
      {/* Large Hero Header Card (no buttons) */}
      <section className="card" style={{
        background: "linear-gradient(135deg, var(--accent-light) 0%, var(--bg) 100%)",
        border: "1px solid var(--accent-glow)",
        position: "relative",
        overflow: "hidden",
        padding: "2rem",
        borderLeft: "4px solid var(--accent-primary)"
      }}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-primary)" }}>FMCG Inventory Mapping</span>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.25rem 0", color: "var(--accent-primary)" }}>Product Code Administration</h2>
          <div className="main-header-line" />
          <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: "1.5" }}>
            Configure and maintain standard SKU category codes that operators map during neural shelf scans and operations audits.
          </p>
        </div>
      </section>

      {/* 1. Statistics Cards */}
      <section className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: "4px solid #E53935", background: "linear-gradient(180deg, #FFFFFF 0%, #FFF3F3 40%, #FFCDD2 70%, #EF5350 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#C62828", fontWeight: 700 }}>Total Product Codes</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{stats.total}</strong>
          <span className="kpi-sub" style={{ color: "#B71C1C", fontWeight: 500 }}>Total database SKU mappings</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #1E88E5", background: "linear-gradient(180deg, #FFFFFF 0%, #F1F8FF 40%, #B3E5FC 70%, #42A5F5 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#0D47A1", fontWeight: 700 }}>Documented Codes</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{stats.documented}</strong>
          <span className="kpi-sub" style={{ color: "#0D47A1", fontWeight: 500 }}>SKUs with description metadata</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #43A047", background: "linear-gradient(180deg, #FFFFFF 0%, #F1F9F1 40%, #C8E6C9 70%, #66BB6A 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#1B5E20", fontWeight: 700 }}>Visible Codes</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{stats.visible}</strong>
          <span className="kpi-sub" style={{ color: "#1B5E20", fontWeight: 500 }}>Matching search query filters</span>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #FB8C00", background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F1 40%, #FFE0B2 70%, #FFA726 100%)", boxShadow: "var(--shadow-sm)" }}>
          <span className="kpi-label" style={{ color: "#E65100", fontWeight: 700 }}>Active Codes</span>
          <strong className="kpi-value" style={{ color: "#1B1B1B" }}>{stats.active}</strong>
          <span className="kpi-sub" style={{ color: "#D84315", fontWeight: 500 }}>Currently active SKU definitions</span>
        </div>
      </section>

      {/* 2. Main Split Grid */}
      <div className="detail-grid">
        {/* Left Column: Form Editor */}
        <section className="card stack" style={{ alignSelf: "start", borderLeft: "4px solid #E53935" }}>
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
        <section className="card stack" style={{ borderLeft: "4px solid #1E88E5" }}>
          <div className="panel-head row-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
            <div>
              <span className="kpi-label" style={{ color: "var(--info)" }}>Database</span>
              <h3 style={{ margin: "0.25rem 0 0" }}>Existing Product Codes</h3>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button 
                type="button" 
                className="button-secondary small" 
                style={{ borderRadius: "8px", padding: "0.35rem 0.75rem" }}
                onClick={() => void loadProductCodes()} 
                disabled={loading || saving}
              >
                Refresh
              </button>
              <span className="chip processing" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                {filteredItems.length} Mapped
              </span>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.5rem", marginTop: "1rem" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code..."
              style={{ padding: "0.45rem 0.75rem", fontSize: "0.82rem" }}
            />
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
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(item)}
                            title={item.status === "active" ? "Click to deactivate" : "Click to activate"}
                            style={{
                              display: "flex", alignItems: "center", gap: "0.4rem",
                              padding: "0.25rem 0.65rem", borderRadius: "99px", border: "none",
                              cursor: "pointer", fontSize: "0.7rem", fontWeight: 700,
                              background: item.status === "active" ? "#e6f9f0" : "#fdecea",
                              color: item.status === "active" ? "#15803d" : "#b91c1c",
                              transition: "all 0.2s"
                            }}
                          >
                            <span style={{
                              width: "6px", height: "6px", borderRadius: "50%",
                              background: item.status === "active" ? "#15803d" : "#b91c1c",
                              display: "inline-block"
                            }} />
                            {item.status === "active" ? "Active" : "Inactive"}
                          </button>
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