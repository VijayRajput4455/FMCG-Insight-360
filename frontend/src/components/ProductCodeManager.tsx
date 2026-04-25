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

const EMPTY_FORM = {
  product_code: "",
  description: "",
};

export default function ProductCodeManager() {
  const [items, setItems] = useState<ProductCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadProductCodes() {
    setLoading(true);

    try {
      const data = await listProductCodes();
      setItems(data);
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

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      return item.product_code.toLowerCase().includes(normalizedQuery)
        || (item.description || "").toLowerCase().includes(normalizedQuery);
    });
  }, [items, query]);

  const documentedCount = useMemo(() => {
    return items.filter((item) => Boolean(item.description && item.description.trim())).length;
  }, [items]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingCode(null);
    setSuccessMessage(null);
  }

  function startEdit(item: ProductCode) {
    setEditingCode(item.product_code);
    setForm({
      product_code: item.product_code,
      description: item.description || "",
    });
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (editingCode) {
        await updateProductCodeByName(editingCode, form);
        setSuccessMessage(`Updated ${form.product_code} successfully.`);
      } else {
        await createProductCode(form);
        setSuccessMessage(`Created ${form.product_code} successfully.`);
      }

      resetForm();
      setSuccessMessage(editingCode ? `Updated ${form.product_code} successfully.` : `Created ${form.product_code} successfully.`);
      await loadProductCodes();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save product code");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(productCode: string) {
    if (!window.confirm(`Delete product code ${productCode}?`)) {
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
      setSuccessMessage(`Deleted ${productCode} successfully.`);
      await loadProductCodes();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete product code");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="product-admin">
      <div className="product-admin-header card">
        <div>
          <p className="eyebrow">Product Catalog</p>
          <h2 className="product-admin-title">Product Code Management</h2>
          <p className="product-admin-copy">Create and maintain the product codes used by the audit workflow.</p>
        </div>
        <button type="button" className="small button-secondary" onClick={() => void loadProductCodes()} disabled={loading || saving}>
          Refresh Data
        </button>
      </div>

      <div className="product-admin-stats dashboard-cards">
        <div className="dashboard-stat-card">
          <span>Total Codes</span>
          <strong>{items.length}</strong>
          <small>All available product codes</small>
        </div>
        <div className="dashboard-stat-card">
          <span>Documented</span>
          <strong>{documentedCount}</strong>
          <small>Codes with descriptions</small>
        </div>
        <div className="dashboard-stat-card">
          <span>Visible</span>
          <strong>{filteredItems.length}</strong>
          <small>Matching the current filter</small>
        </div>
      </div>

      <div className="product-admin-stack">
        <section className="product-panel card">
          <div className="panel-head row-between">
            <div>
              <p className="panel-label">Editor</p>
              <h3>{editingCode ? `Edit ${editingCode}` : "Add Product Code"}</h3>
            </div>
            <span className={`mode-pill ${editingCode ? "active" : "idle"}`}>{editingCode ? "Editing" : "New Entry"}</span>
          </div>

          <p className="panel-copy">Use a stable code format like `SKU_1001`. Descriptions are optional but useful for operators.</p>

          {error && <ErrorBox message={error} onRetry={() => void loadProductCodes()} />}
          {successMessage && <div className="success-box">{successMessage}</div>}

          <form className="admin-form product-form product-form-split" onSubmit={handleSubmit}>
            <label>
              <span>Product Code</span>
              <input
                value={form.product_code}
                onChange={(event) => setForm((current) => ({ ...current, product_code: event.target.value }))}
                placeholder="SKU_1001"
                required
                maxLength={50}
              />
              <small className="field-help">Required. Letters, numbers, `_` and `-` only.</small>
            </label>

            <label>
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short internal note for operators"
                maxLength={500}
              />
              <small className="field-help">Optional context to help operators pick the right code.</small>
            </label>

            <div className="admin-actions full">
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingCode ? "Save Changes" : "Add Product Code"}
              </button>
              <button type="button" className="button-secondary" onClick={resetForm} disabled={saving}>
                {editingCode ? "Cancel Edit" : "Clear Form"}
              </button>
            </div>
          </form>
        </section>

        <section className="product-panel card">
          <div className="panel-head row-between">
            <div>
              <p className="panel-label">Registry</p>
              <h3>Existing Product Codes</h3>
            </div>
            <span className="toolbar-count">{filteredItems.length} shown</span>
          </div>

          <div className="admin-toolbar product-toolbar">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by code or description"
            />
          </div>

          {loading ? (
            <SkeletonBlock height={280} />
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <strong>No product codes match this view.</strong>
              <p>{items.length === 0 ? "Add your first product code using the form above." : "Try changing the search text to see more results."}</p>
            </div>
          ) : (
            <div className="table-wrap product-table-wrap">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className={editingCode === item.product_code ? "is-selected" : undefined}>
                      <td>
                        <div className="code-cell">
                          <strong>{item.product_code}</strong>
                          <span>ID {item.id}</span>
                        </div>
                      </td>
                      <td className="description-cell">{item.description || "No description added yet."}</td>
                      <td>{new Date(item.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="small button-secondary" onClick={() => startEdit(item)} disabled={saving}>
                            Edit
                          </button>
                          <button type="button" className="small button-danger" onClick={() => void handleDelete(item.product_code)} disabled={saving}>
                            Delete
                          </button>
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
    </section>
  );
}