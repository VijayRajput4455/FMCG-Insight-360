"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { 
  getAuditStatus, 
  resolveApiAssetUrl, 
  submitAuditByCode, 
  submitAuditByUpload, 
  submitAuditByUploadBulk,
  listProductCodes,
  type AuditStatusResponse, 
  type ProductCode
} from "@/lib/api";
import { addHistoryItem, updateHistoryStatus } from "@/lib/history";
import { connectAuditSocket } from "@/lib/ws";

type UiState = "idle" | "submitting" | "queued" | "processing" | "completed" | "failed";
type InputMode = "url" | "upload";

export default function AuditConsole() {
  const [mode, setMode] = useState<InputMode>("upload");
  const [productCode, setProductCode] = useState("");
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  
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

  // Load product codes
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
    const validSource = mode === "url" ? imageUrl.trim().length >= 10 : uploadFiles.length > 0;
    return productCode.trim().length >= 2 && validSource && state !== "submitting";
  }, [mode, productCode, imageUrl, uploadFiles, state]);

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
        setStatusMessage(`Fallback status: ${data.status}`);
        if (data.status === "completed" || data.status === "failed") {
          if (pollRef.current !== null) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        setStatusMessage("Polling server...");
      }
    }, 2000);
  }

  function handleSocketMessage(payload: AuditStatusResponse | Record<string, unknown>) {
    const status = typeof payload.status === "string" ? payload.status : "processing";

    if (status === "completed" || status === "failed") {
      setResult(payload as AuditStatusResponse);
      setState(status);
      if (auditId !== null) {
        updateHistoryStatus(auditId, status);
      }
      setStatusMessage(`Completed with: ${status}`);
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
    setStatusMessage(`State: ${status}`);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setState("submitting");
    setResult(null);
    setAuditId(null);
    setImgSize({ width: 0, height: 0 });
    setStatusMessage("Submitting audit request...");

    try {
      let auditIdToTrack: number | null = null;
      let statusToTrack = "pending";
      let sourceLabelToTrack = "";

      if (mode === "url") {
        const data = await submitAuditByCode(productCode.trim(), imageUrl.trim());
        if (!data.audit_id) {
          setState("failed");
          setStatusMessage((data.detection_reason as string) || data.message || "Failed to launch pipeline");
          return;
        }
        auditIdToTrack = data.audit_id;
        statusToTrack = data.status;
        sourceLabelToTrack = imageUrl.trim();
        trackAudit(auditIdToTrack, statusToTrack, sourceLabelToTrack);
      } else {
        if (uploadFiles.length === 1) {
          const data = await submitAuditByUpload(productCode.trim(), uploadFiles[0]);
          if (!data.audit_id) {
            setState("failed");
            setStatusMessage((data.detection_reason as string) || data.message || "Failed to launch pipeline");
            return;
          }
          auditIdToTrack = data.audit_id;
          statusToTrack = data.status;
          sourceLabelToTrack = uploadFiles[0].name;
          trackAudit(auditIdToTrack, statusToTrack, sourceLabelToTrack);
        } else {
          const bulkData = await submitAuditByUploadBulk(productCode.trim(), uploadFiles);
          const successes = bulkData.filter(item => item.status === "pending" && item.audit_id);
          if (successes.length === 0) {
            setState("failed");
            setStatusMessage(bulkData[0]?.message || "Failed to launch bulk pipeline");
            return;
          }

          successes.forEach((item) => {
            addHistoryItem({
              auditId: item.audit_id as number,
              productCode: productCode.trim(),
              sourceLabel: item.filename,
              status: "pending",
              createdAtIso: new Date().toISOString(),
            });
          });

          const first = successes[0];
          auditIdToTrack = first.audit_id as number;
          statusToTrack = first.status;
          sourceLabelToTrack = first.filename;
        }
      }

      setAuditId(auditIdToTrack);
      setState(statusToTrack === "pending" ? "queued" : "processing");
      setStatusMessage(
        uploadFiles.length > 1
          ? `Bulk request submitted. Monitoring job #${auditIdToTrack} live.`
          : `Running job #${auditIdToTrack}`
      );

      socketRef.current = connectAuditSocket(auditIdToTrack, {
        onMessage: handleSocketMessage,
        onError: () => {
          setStatusMessage("WebSocket connection lost. Reverting to HTTP fallback...");
        },
        onClose: () => {
          if (finalStateRef.current !== "completed" && finalStateRef.current !== "failed") {
            void startHttpFallbackPolling(auditIdToTrack as number);
          }
        },
      });
    } catch (error) {
      setState("failed");
      setStatusMessage(error instanceof Error ? error.message : "Pipeline error");
    }
  }

  const resultJson = result?.result_json;
  const productImageUrl = resultJson?.product_image_url ? resolveApiAssetUrl(String(resultJson.product_image_url)) : "";
  const total = Number(resultJson?.total ?? resultJson?.total_product_count ?? 0);
  
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

  const currentStepNum = useMemo<number>(() => {
    switch (state) {
      case "idle": return 0;
      case "submitting": return 1;
      case "queued": return 2;
      case "processing": return 3;
      case "completed": return 5;
      case "failed": return 5;
      default: return 0;
    }
  }, [state]);

  const progressPercentage = useMemo(() => {
    if (state === "completed") return 100;
    if (state === "failed") return 100;
    if (state === "processing") return 65;
    if (state === "queued") return 35;
    if (state === "submitting") return 15;
    return 0;
  }, [state]);

  return (
    <div className="stack" style={{ gap: "2.5rem" }}>
      {/* 3-Column Running State Grid (Matches Screen 2 Layout) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Col 1: Upload Panel */}
        <section className="card stack" style={{ borderLeft: "4px solid #E53935" }}>
          <h2>Upload Image</h2>
          
          <div className="segmented" role="tablist">
            <button
              type="button"
              className={mode === "upload" ? "seg active" : "seg"}
              onClick={() => setMode("upload")}
            >
              File Drop
            </button>
            <button
              type="button"
              className={mode === "url" ? "seg active" : "seg"}
              onClick={() => setMode("url")}
            >
              Online Link
            </button>
          </div>

          <form onSubmit={handleSubmit} className="stack" style={{ gap: "1rem" }}>
            {mode === "upload" ? (
              <div className="file-dropzone" onClick={() => document.getElementById("file-input-console")?.click()}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span>
                  {uploadFiles.length > 0 
                    ? (uploadFiles.length === 1 ? uploadFiles[0].name : `${uploadFiles.length} files selected`) 
                    : "Drag & drop image(s) or click to browse"}
                </span>
                <input
                  id="file-input-console"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const selected = e.target.files ? Array.from(e.target.files) : [];
                    setUploadFiles(selected);
                  }}
                  style={{ display: "none" }}
                  required
                />
              </div>
            ) : (
              <label>
                Image URL or Local Path
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="e.g. file:///C:/Users/VIJAY/Desktop/pepsi.jpg"
                  required
                />
              </label>
            )}

            <label>
              Category Map *
              <select 
                value={productCode} 
                onChange={(e) => setProductCode(e.target.value)}
                required
              >
                <option value="">-- Choose Category Map --</option>
                {productCodes.map((code) => (
                  <option key={code.id} value={code.product_code}>{code.product_code}</option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={!canSubmit || state === "submitting"} style={{ marginTop: "0.5rem" }}>
              Initialize Run
            </button>
          </form>
        </section>

        {/* Col 2: Stepper Progress (Matches Screen 2 Middle) */}
        <section className="card stack" style={{ borderLeft: "4px solid #1E88E5" }}>
          <h2>Live Progress</h2>
          <div className="stepper-container">
            <div className={`step-item ${currentStepNum >= 1 ? "completed" : ""} ${currentStepNum === 1 ? "active" : ""}`}>
              <div className="step-icon">✓</div>
              <div className="step-content">
                <span className="step-title">Image Uploaded</span>
                <span className="step-desc">{uploadFiles.length > 0 ? `${uploadFiles.length} file(s) selected` : "Source resolved"}</span>
              </div>
            </div>
            
            <div className={`step-item ${currentStepNum >= 2 ? "completed" : ""} ${currentStepNum === 2 ? "active" : ""}`}>
              <div className="step-icon">2</div>
              <div className="step-content">
                <span className="step-title">Message Queued</span>
                <span className="step-desc">Publishing audit to RabbitMQ</span>
              </div>
            </div>

            <div className={`step-item ${currentStepNum >= 3 ? "completed" : ""} ${currentStepNum === 3 ? "active" : ""}`}>
              <div className="step-icon">3</div>
              <div className="step-content">
                <span className="step-title">YOLO Processing</span>
                <span className="step-desc">Running neural classification models</span>
              </div>
            </div>

            <div className={`step-item ${currentStepNum >= 4 ? "completed" : ""} ${currentStepNum === 4 ? "active" : ""}`}>
              <div className="step-icon">4</div>
              <div className="step-content">
                <span className="step-title">Classification</span>
                <span className="step-desc">Awaiting bounding box predictions</span>
              </div>
            </div>

            <div className={`step-item ${currentStepNum >= 5 ? "completed" : ""}`}>
              <div className="step-icon">5</div>
              <div className="step-content">
                <span className="step-title">Audit Completed</span>
                <span className="step-desc">Results persisted in database</span>
              </div>
            </div>
          </div>
        </section>

        {/* Col 3: Broker Tracker (Matches Screen 2 Right) */}
        <section className="card stack" style={{ borderLeft: "4px solid #43A047" }}>
          <h2>Broker Runtime Tracker</h2>
          <div className="metrics" style={{ marginTop: "0.5rem" }}>
            <div className="metric">
              <span>Job ID</span>
              <strong>{auditId ? `#${auditId}` : "-"}</strong>
            </div>
            <div className="metric">
              <span>Status</span>
              <span className={`chip ${state === "completed" ? "completed" : state === "failed" ? "failed" : state === "idle" ? "" : "processing"}`}>
                {state}
              </span>
            </div>
            <div className="metric">
              <span>Progress</span>
              <strong>{progressPercentage}%</strong>
            </div>
            <div className="metric">
              <span>Worker ID</span>
              <strong>{auditId ? "worker-1" : "-"}</strong>
            </div>
          </div>
          {state === "failed" && (
            <div className="error-box" style={{ marginTop: "0.5rem" }}>
              <span className="error-text"><strong>Error:</strong> {statusMessage}</span>
            </div>
          )}
        </section>

      </div>

      {/* Output View (Matches Screen 3 Design) */}
      <section className="card full" style={{ borderLeft: "4px solid #FB8C00" }}>
        <h2>Audit Output View</h2>
        {!resultJson ? (
          <div className="empty-state" style={{ padding: "2.5rem" }}>
            <strong>Ready to audit</strong>
            <p>Upload an image and click &quot;Initialize Run&quot; to see results.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "2rem", marginTop: "1rem" }} className="detail-grid">
            
            {/* Left side: Image BBox and Table */}
            <div className="stack" style={{ gap: "1.5rem" }}>
              {productImageUrl ? (
                <div className="image-canvas-wrapper">
                  <Image
                    src={productImageUrl}
                    alt="Neural detections preview"
                    width={1000}
                    height={750}
                    style={{ width: "100%", height: "auto" }}
                    onLoad={handleImageLoad}
                    unoptimized
                  />

                  {/* Absolute box highlights */}
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

              {/* Detected Objects table */}
              {parsedCoords.length > 0 && (
                <div className="stack" style={{ gap: "0.5rem" }}>
                  <h3>Detected Objects</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Object</th>
                          <th>Confidence</th>
                          <th>Bounding Box</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedCoords.map((item) => (
                          <tr 
                            key={item.id}
                            onMouseEnter={() => setHoveredBoxId(item.id)}
                            onMouseLeave={() => setHoveredBoxId(null)}
                            style={{
                              background: hoveredBoxId === item.id ? "var(--surface-hover)" : "",
                              cursor: "pointer"
                            }}
                          >
                            <td><strong>{item.label}</strong></td>
                            <td><span className="chip completed" style={{ fontSize: "0.72rem" }}>99.62%</span></td>
                            <td><code>[{item.bbox.join(", ")}]</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Prediction details (Matches Screen 3 Right) */}
            <div className="stack" style={{ gap: "1.5rem" }}>
              <div>
                <p className="eyebrow" style={{ color: "#10b981", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>Prediction Result</p>
                <h2 style={{ fontSize: "1.75rem", color: "var(--accent-secondary)", margin: "0.25rem 0" }}>
                  {detectedProducts[0] || "Unknown SKU"}
                </h2>
                <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
                  <div>
                    <span className="subtle">Confidence Score</span>
                    <strong style={{ display: "block", fontSize: "1.15rem", color: "var(--text-primary)" }}>99.62%</strong>
                  </div>
                  <div>
                    <span className="subtle">Inference Time</span>
                    <strong style={{ display: "block", fontSize: "1.15rem", color: "var(--text-primary)" }}>10.24 AM</strong>
                  </div>
                </div>
              </div>

              <div className="stack" style={{ gap: "0.85rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                <h3>Details</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "0.5rem", fontSize: "0.88rem" }}>
                  <span className="subtle">Audit ID</span>
                  <strong>AUDIT-{auditId}</strong>

                  <span className="subtle">Category</span>
                  <strong>Beverages</strong>

                  <span className="subtle">Model Used</span>
                  <strong>YOLOv8n</strong>

                  <span className="subtle">Processed By</span>
                  <strong>worker-1</strong>
                </div>
              </div>

              <div className="stack" style={{ gap: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <button type="button" className="button-secondary small">View JSON</button>
                  <button type="button" className="button-secondary small">Download Image</button>
                </div>
                <button type="button" style={{ width: "100%" }}>Export Report</button>
              </div>
            </div>

          </div>
        )}
      </section>
    </div>
  );
}
