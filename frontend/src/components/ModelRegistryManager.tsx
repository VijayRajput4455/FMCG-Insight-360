"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listModels,
  createModel,
  updateModel,
  deleteModel,
  listProductCodes,
  type Model,
  type ProductCode,
  type ModelPayload
} from "@/lib/api";

export default function ModelRegistryManager() {
  const [models, setModels] = useState<Model[]>([]);
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelPath, setModelPath] = useState("");
  const [productCodeId, setProductCodeId] = useState<number | "">("");
  const [imageSize, setImageSize] = useState<number>(1280);
  const [confThreshold, setConfThreshold] = useState<number>(0.25);
  const [iouThreshold, setIouThreshold] = useState<number>(0.45);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [codesList, modelsList] = await Promise.all([
        listProductCodes(),
        listModels()
      ]);
      setProductCodes(codesList);
      setModels(modelsList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load model registry data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditId(null);
    setModelName("");
    setModelPath("");
    setProductCodeId("");
    setImageSize(1280);
    setConfThreshold(0.25);
    setIouThreshold(0.45);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName || !modelPath || !productCodeId) {
      setError("Model Name, Weights Path, and Product Code mapping are required.");
      return;
    }

    const payload: ModelPayload = {
      model_name: modelName,
      model_path: modelPath,
      product_code_id: Number(productCodeId),
      image_size: Number(imageSize),
      conf_threshold: Number(confThreshold),
      iou_threshold: Number(iouThreshold),
    };

    try {
      if (editId) {
        await updateModel(editId, payload);
        setSuccess("Model parameters updated successfully!");
      } else {
        await createModel(payload);
        setSuccess("Model registered successfully!");
      }
      resetForm();
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save model configuration");
    }
  };

  const handleEdit = (m: Model) => {
    setEditId(m.id);
    setModelName(m.model_name);
    setModelPath(m.model_path);
    setProductCodeId(m.product_code_id);
    setImageSize(m.image_size ?? 1280);
    setConfThreshold(m.conf_threshold ?? 0.25);
    setIouThreshold(m.iou_threshold ?? 0.45);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this model configuration?")) return;
    try {
      await deleteModel(id);
      setSuccess("Model configurations deleted successfully!");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete model");
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
        <h2>Active Models Registry ({models.length})</h2>
        <button type="button" className="button-secondary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close Form" : "Register Inference Model"}
        </button>
      </div>

      {showForm && (
        <section className="card">
          <h3>{editId ? "Configure Inference Weights" : "Register Neural Weights Mapping"}</h3>
          <form onSubmit={handleSubmit} className="stack" style={{ marginTop: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <label>
                Model Identifier *
                <input
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. YOLOv8_Retail_Custom"
                  required
                />
              </label>

              <label>
                Local Weights Path (.pt / .onnx) *
                <input
                  value={modelPath}
                  onChange={(e) => setModelPath(e.target.value)}
                  placeholder="e.g. ml_models/weights/pepsi_yolo.pt"
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
                Model Image Rescale Size
                <input
                  type="number"
                  value={imageSize}
                  onChange={(e) => setImageSize(Number(e.target.value))}
                  placeholder="e.g. 1280"
                />
              </label>

              <label>
                Inference Confidence Threshold
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(Number(e.target.value))}
                  placeholder="e.g. 0.25"
                />
              </label>

              <label>
                IOU NMS Overlap Threshold
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={iouThreshold}
                  onChange={(e) => setIouThreshold(Number(e.target.value))}
                  placeholder="e.g. 0.45"
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="submit">{editId ? "Update Model" : "Save Model"}</button>
              <button type="button" className="button-secondary" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        {loading ? (
          <div className="skeleton-block" />
        ) : models.length === 0 ? (
          <div className="empty-state">
            <strong>No neural inference models registered</strong>
            <p>Click &apos;Register Inference Model&apos; above to map neural weights to category audits.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Model Identifier</th>
                  <th>Weights Local Path</th>
                  <th>Map Code</th>
                  <th>Rescale Size</th>
                  <th>Confidence Threshold</th>
                  <th>NMS IOU Overlap</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.model_name}</strong></td>
                    <td><code>{m.model_path}</code></td>
                    <td><span className="chip processing">{getProductCodeName(m.product_code_id)}</span></td>
                    <td>{m.image_size || 1280} px</td>
                    <td>{m.conf_threshold !== undefined ? m.conf_threshold.toFixed(2) : "0.25"}</td>
                    <td>{m.iou_threshold !== undefined ? m.iou_threshold.toFixed(2) : "0.45"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="button" className="small button-secondary" onClick={() => handleEdit(m)}>Edit</button>
                        <button type="button" className="small button-danger" onClick={() => void handleDelete(m.id)}>Delete</button>
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
