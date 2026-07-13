"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { 
  getAuditStatus, 
  resolveApiAssetUrl, 
  submitAuditByCode, 
  submitAuditByUpload, 
  listProductCodes,
  type AuditStatusResponse, 
  type ProductCode
} from "@/lib/api";
import { addHistoryItem, updateHistoryStatus } from "@/lib/history";
import { connectAuditSocket } from "@/lib/ws";

type UiState = "idle" | "submitting" | "queued" | "processing" | "completed" | "failed";
type InputMode = "url" | "upload";

export default function AuditConsole() {
  const [mode, setMode] = useState<InputMode>("url");
  const [productCode, setProductCode] = useState("");
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  const [auditId, setAuditId] = useState<number | null>(null);
  const [state, setState] = useState<UiState>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [result, setResult] = useState<AuditStatusResponse | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<number | null>(null);
  const finalStateRef = useRef<UiState>("idle");

  // Interactive bounding boxes hover
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [hoveredBoxId, setHoveredBoxId] = useState<number | null>(null);

  useEffect(() => {
    finalStateRef.current = state;
  }, [state]);

  // Load product codes for suggestions or mappings
  useEffect(() => {
    async function loadCodes() {
      try {
        const codes = await listProductCodes();
        setProductCodes(codes);
      } catch (err) {
        console.error("Failed to load product codes", err);
      }
    }
    void loadCodes();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  const canSubmit = useMemo(() => {
    const validSource = mode === "url" ? imageUrl.trim().length >= 10 : uploadFile !== null;
    return productCode.trim().length >= 2 && validSource && state !== "submitting";
  }, [mode, productCode, imageUrl, uploadFile, state]);

  function trackAudit(id: number, status: string, sourceLabel: string) {
    addHistoryItem({
      auditId: id,
      productCode: productCode.trim(),
      sourceLabel,
      status: status === "processing" || status === "completed" || status === "failed" ? status : "pending",
      createdAtIso: new Date().toISOString(),
    });
  }

  async function startHttpFallbackPolling(id: number) {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
    }

    pollRef.current = window.setInterval(async () => {
      try {
        const data = await getAuditStatus(id);
        setResult(data);
        const nextState = data.status === "completed" ? "completed" : data.status === "failed" ? "failed" : "processing";
        setState(nextState);
        if (data.status === "processing" || data.status === "completed" || data.status === "failed") {
          updateHistoryStatus(id, data.status);
        }
        setStatusMessage(`HTTP status: ${data.status}`);
        if (data.status === "completed" || data.status === "failed") {
          if (pollRef.current !== null) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        setStatusMessage("Polling server. Retrying...");
      }
    }, 3000);
  }

  function handleSocketMessage(payload: AuditStatusResponse | Record<string, unknown>) {
    const status = typeof payload.status === "string" ? payload.status : "processing";

    if (status === "completed" || status === "failed") {
      setResult(payload as AuditStatusResponse);
      setState(status);
      if (auditId !== null) {
        updateHistoryStatus(auditId, status);
      }
      setStatusMessage(`Audit completed with status: ${status}`);
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
      return;
    }

    setState(status === "pending" ? "queued" : "processing");
    if (auditId !== null && (status === "pending" || status === "processing")) {
      updateHistoryStatus(auditId, status === "pending" ? "pending" : "processing");
    }
    setStatusMessage(`Status updated: ${status}`);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setState("submitting");
    setResult(null);
    setAuditId(null);
    setImgSize({ width: 0, height: 0 });
    setStatusMessage("Connecting to API endpoint...");

    try {
      const data = mode === "url"
        ? await submitAuditByCode(productCode.trim(), imageUrl.trim())
        : await submitAuditByUpload(productCode.trim(), uploadFile as File);

      if (!data.audit_id) {
        setState("failed");
        setStatusMessage((data.detection_reason as string) || data.message || "Audit submission failed");
        return;
      }

      setAuditId(data.audit_id);
      trackAudit(data.audit_id, data.status, mode === "url" ? imageUrl.trim() : (uploadFile?.name || "upload"));
      setState(data.status === "pending" ? "queued" : "processing");
      setStatusMessage(`Job registered with ID #${data.audit_id}`);

      socketRef.current = connectAuditSocket(data.audit_id, {
        onMessage: handleSocketMessage,
        onError: () => {
          setStatusMessage("WebSocket connection lost. Reverting to HTTP...");
        },
        onClose: () => {
          if (finalStateRef.current !== "completed" && finalStateRef.current !== "failed") {
            void startHttpFallbackPolling(data.audit_id as number);
          }
        },
      });
    } catch (error) {
      setState("failed");
      setStatusMessage(error instanceof Error ? error.message : "Submission failed");
    }
  }

  const resultJson = result?.result_json;
  const productImageUrl = resultJson?.product_image_url ? resolveApiAssetUrl(String(resultJson.product_image_url)) : "";
  const total = Number(resultJson?.total ?? resultJson?.total_product_count ?? 0);
  const counts = resultJson?.counts || {};
  const brandCounts = resultJson?.brand_counts || [];
  
  // Safe coordinate parser
  const parsedCoords = useMemo(() => {
    const coords = resultJson?.detection_coordinates;
    if (!coords || !Array.isArray(coords)) return [];
    
    return coords.map((item: any, idx: number) => {
      if (!item) return null;
      const keys = Object.keys(item);
      if (keys.length === 0) return null;
      const label = keys[0];
      const bbox = item[label];
      if (Array.isArray(bbox) && bbox.length === 4) {
        return {
          id: idx,
          label,
          bbox: bbox as [number, number, number, number]
        };
      }
      return null;
    }).filter(Boolean) as Array<{ id: number; label: string; bbox: [number, number, number, number] }>;
  }, [resultJson]);

  const detectedProducts = resultJson?.detected_products || [];

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgSize({ width: naturalWidth, height: naturalHeight });
  };

  return (
    <div className="audit-shell">
      {/* Form Submitter card */}
      <section className="card">
        <h2>Submit New Audit</h2>
        
        <div className="segmented" role="tablist" aria-label="Input Mode">
          <button
            type="button"
            className={mode === "url" ? "seg active" : "seg"}
            onClick={() => setMode("url")}
          >
            URL / Local Path
          </button>
          <button
            type="button"
            className={mode === "upload" ? "seg active" : "seg"}
            onClick={() => setMode("upload")}
          >
            File Uploader
          </button>
        </div>

        <form onSubmit={handleSubmit} className="stack">
          <label>
            Select Product Code
            <select 
              value={productCode} 
              onChange={(e) => setProductCode(e.target.value)}
              required
            >
              <option value="">-- Choose Category Map --</option>
              {productCodes.map((code) => (
                <option key={code.id} value={code.product_code}>{code.product_code} ({code.description || "No description"})</option>
              ))}
            </select>
          </label>

          {mode === "url" ? (
            <label>
              Image URL or Local Filepath
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="e.g. file:///C:/Users/VIJAY/Desktop/pepsi.jpg"
                required
              />
            </label>
          ) : (
            <label>
              File Dropzone
              <div className="file-dropzone" onClick={() => document.getElementById("file-input")?.click()}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span>{uploadFile ? uploadFile.name : "Click to select image file"}</span>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                  required
                />
              </div>
            </label>
          )}

          <button type="submit" disabled={!canSubmit}>
            {state === "submitting" ? "Connecting Pipeline..." : "Initialize Run"}
          </button>
        </form>
      </section>

      {/* Real-time Status Card */}
      <section className="card">
        <h2>Broker Runtime Tracker</h2>
        <div className="metrics" style={{ marginTop: "1rem" }}>
          <div className="metric">
            <span>Job ID</span>
            <strong>{auditId ? `#${auditId}` : "-"}</strong>
          </div>
          <div className="metric">
            <span>Progress State</span>
            <span className={`chip ${state === "completed" ? "completed" : state === "failed" ? "failed" : state === "idle" ? "" : "processing"}`}>
              {state}
            </span>
          </div>
        </div>
        <p className="subtle" style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
          {statusMessage}
        </p>

        {state === "failed" && (
          <div className="error-box" style={{ marginTop: "1rem" }}>
            <span className="error-text">{statusMessage}</span>
            <button type="button" className="small button-secondary" onClick={() => setState("idle")}>
              Dismiss
            </button>
          </div>
        )}
      </section>

      {/* Visual Result Card */}
      <section className="card wide">
        <div className="row-between">
          <h2>Audit Output View</h2>
          {result?.audit_id && (
            <Link href={`/audit/${result.audit_id}`} className="small-link" style={{color: 'var(--accent-secondary)'}}>
              Open full analysis log &rarr;
            </Link>
          )}
        </div>

        {!resultJson ? (
          <div className="empty-state" style={{ marginTop: "1.5rem" }}>
            <strong>Ready to audit</strong>
            <p>Select a product code, upload an image, and click &quot;Initialize Run&quot;.</p>
          </div>
        ) : (
          <div className="result-grid" style={{ marginTop: "1.5rem" }}>
            <div className="metrics">
              <div className="metric"><span>Total Detections</span><strong>{total}</strong></div>
              {resultJson.total_self_count !== undefined && (
                <div className="metric"><span>Self (Own Brand)</span><strong>{resultJson.total_self_count}</strong></div>
              )}
              {resultJson.total_competition_count !== undefined && (
                <div className="metric"><span>Competition Brand</span><strong>{resultJson.total_competition_count}</strong></div>
              )}
              {Object.entries(counts).map(([key, value]) => (
                <div key={key} className="metric"><span>{key}</span><strong>{Number(value)}</strong></div>
              ))}
              {brandCounts.map((b, i) => (
                <div key={i} className="metric">
                  <span>{b.brand ?? b.name ?? `Brand ${i + 1}`}</span>
                  <strong>{b.count ?? "-"}</strong>
                </div>
              ))}
            </div>

            <div className="stack" style={{ gap: "1rem" }}>
              {productImageUrl ? (
                <div className="image-canvas-wrapper">
                  <Image
                    src={productImageUrl}
                    alt="Neural detections preview"
                    width={800}
                    height={600}
                    style={{ width: "100%", height: "auto" }}
                    onLoad={handleImageLoad}
                    unoptimized
                  />

                  {/* Render bounding box absolute overlays */}
                  {imgSize.width > 0 && parsedCoords.map((item) => {
                    const [x1, y1, x2, y2] = item.bbox;
                    const left = (x1 / imgSize.width) * 100;
                    const top = (y1 / imgSize.height) * 100;
                    const width = ((x2 - x1) / imgSize.width) * 100;
                    const height = ((y2 - y1) / imgSize.height) * 100;

                    const isHighlighted = hoveredBoxId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`bbox-overlay-box ${isHighlighted ? "highlighted" : ""}`}
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                        }}
                        onMouseEnter={() => setHoveredBoxId(item.id)}
                        onMouseLeave={() => setHoveredBoxId(null)}
                      >
                        {isHighlighted && (
                          <div className="bbox-tooltip">
                            {item.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>No annotated output available.</p>
              )}

              {detectedProducts.length > 0 && (
                <ul className="tag-list">
                  {detectedProducts.map((p, i) => <li key={i} className="tag">{p}</li>)}
                </ul>
              )}

              {parsedCoords.length > 0 && (
                <details>
                  <summary>{parsedCoords.length} objects localized</summary>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>SKU Identifier</th>
                          <th>Bounding Box</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedCoords.map((item, idx) => (
                          <tr 
                            key={item.id}
                            onMouseEnter={() => setHoveredBoxId(item.id)}
                            onMouseLeave={() => setHoveredBoxId(null)}
                            style={{
                              background: hoveredBoxId === item.id ? "rgba(99, 102, 241, 0.08)" : "",
                              cursor: "pointer"
                            }}
                          >
                            <td>{idx + 1}</td>
                            <td><strong>{item.label}</strong></td>
                            <td><code>[{item.bbox.join(", ")}]</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
