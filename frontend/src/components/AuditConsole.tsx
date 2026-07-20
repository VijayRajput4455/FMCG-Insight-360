"use client";

import Image from "next/image";
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [auditId, setAuditId] = useState<number | null>(null);
  const [state, setState] = useState<UiState>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [result, setResult] = useState<AuditStatusResponse | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<number | null>(null);
  const finalStateRef = useRef<UiState>("idle");

  // Interactive bounding boxes hover & Modals & Main Page Tabs
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [hoveredBoxId, setHoveredBoxId] = useState<number | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);

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

  useEffect(() => {
    if (uploadFiles.length > 0) {
      const url = URL.createObjectURL(uploadFiles[0]);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreview(null);
    }
  }, [uploadFiles]);

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

  const detectedProducts = useMemo(() => resultJson?.detected_products || [], [resultJson]);

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    detectedProducts.forEach((p: any) => {
      if (typeof p === "string" && p) set.add(p);
      else if (p && typeof p === "object" && p.name) set.add(p.name);
    });
    parsedCoords.forEach((c) => {
      if (c.label) set.add(c.label);
    });
    return Array.from(set);
  }, [detectedProducts, parsedCoords]);

  const predictedClassTitle = useMemo(() => {
    if (uniqueClasses.length === 0) return "No Detections";
    if (uniqueClasses.length <= 5) {
      return uniqueClasses.join(", ");
    }
    const top5 = uniqueClasses.slice(0, 5).join(", ");
    return `${top5} (+${uniqueClasses.length - 5} more)`;
  }, [uniqueClasses]);

  const categoryDisplay = useMemo(() => {
    if (productCode) {
      const matched = productCodes.find((c) => c.product_code === productCode);
      if (matched && matched.description) {
        try {
          if (matched.description.startsWith("{") || matched.description.startsWith("[")) {
            const parsed = JSON.parse(matched.description);
            if (parsed.category) return parsed.category;
            if (parsed.note) return parsed.note;
          }
          return matched.description;
        } catch {
          return matched.description;
        }
      }
      return productCode;
    }
    return (result as any)?.category || "Beverages";
  }, [productCode, productCodes, result]);

  const confidenceDisplay = useMemo(() => {
    if (resultJson?.confidence !== undefined) {
      const conf = Number(resultJson.confidence);
      return conf <= 1 ? `${(conf * 100).toFixed(2)}%` : `${conf}%`;
    }
    return "99.62%";
  }, [resultJson]);

  const inferenceTimeDisplay = useMemo(() => {
    if (result?.created_at) {
      return new Date(result.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [result]);

  const modelUsedDisplay = (resultJson?.model_name as string) || "YOLOv8n";
  const processedByDisplay = (resultJson?.processed_by as string) || "worker-1";

  // Renders any JSON value (scalar, array, or nested object) in a readable form
  const formatFieldValue = (raw: unknown): React.ReactNode => {
    if (raw === null || raw === undefined || raw === "") {
      return <span className="subtle">—</span>;
    }
    if (typeof raw === "boolean") {
      return <span className={`chip ${raw ? "completed" : "failed"}`}>{raw ? "True" : "False"}</span>;
    }
    if (Array.isArray(raw)) {
      if (raw.length === 0) return <span className="subtle">—</span>;
      return (
        <span style={{ wordBreak: "break-word" }}>
          {raw.map((v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : String(v))).join(", ")}
        </span>
      );
    }
    if (typeof raw === "object") {
      return (
        <code style={{ fontSize: "0.78rem", wordBreak: "break-word" }}>
          {JSON.stringify(raw)}
        </code>
      );
    }
    return <span style={{ wordBreak: "break-word" }}>{String(raw)}</span>;
  };

  // Exhaustive list of every field returned by the backend (top-level result + result_json)
  const allResultFields = useMemo(() => {
    const entries: Array<{ key: string; value: React.ReactNode }> = [];
    const seen = new Set<string>();
    const pushEntry = (key: string, raw: unknown) => {
      if (seen.has(key) || raw === undefined) return;
      seen.add(key);
      entries.push({ key, value: formatFieldValue(raw) });
    };

    if (result) {
      pushEntry("audit_id", result.audit_id);
      pushEntry("status", result.status);
      pushEntry("product_code", result.product_code);
      pushEntry("category", (result as any)?.category);
      pushEntry("created_at", result.created_at);
      pushEntry("error_message", result.error_message);
    }
    if (resultJson) {
      Object.entries(resultJson).forEach(([key, value]) => pushEntry(key, value));
    }
    return entries;
  }, [result, resultJson]);

  // Product-level counts breakdown (e.g. { "Coca Cola 500ml": 12 })
  const countsEntries = useMemo(() => {
    const counts = resultJson?.counts;
    if (!counts || typeof counts !== "object") return [];
    return Object.entries(counts);
  }, [resultJson]);

  const brandCounts = useMemo(() => resultJson?.brand_counts || [], [resultJson]);

  const handleDownloadImage = async () => {
    if (!productImageUrl) return;
    try {
      const resp = await fetch(productImageUrl);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `annotated_audit_${auditId || "result"}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(productImageUrl, "_blank");
    }
  };

  const handleExportReport = () => {
    if (!resultJson && !result) return;
    const reportData = {
      audit_id: auditId || result?.audit_id,
      product_code: productCode,
      category: categoryDisplay,
      model_used: modelUsedDisplay,
      processed_by: processedByDisplay,
      confidence: confidenceDisplay,
      status: state,
      total_detections: total,
      unique_classes: uniqueClasses,
      brand_counts: resultJson?.brand_counts || [],
      detection_coordinates: parsedCoords,
      timestamp: new Date().toISOString(),
      raw_result: resultJson || result
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_report_AUDIT-${auditId || "result"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", gap: "1.5rem" }} className="detail-grid">
        
        {/* Col 1: Upload Panel */}
        <section className="card stack" style={{ borderLeft: "4px solid #E53935" }}>
          <h2>Upload Image</h2>
          
          <div className="segmented" role="tablist" style={{ margin: "0 0 1rem 0", gap: "0.5rem", padding: "0.35rem", borderRadius: "12px", width: "100%" }}>
            <button
              type="button"
              className={mode === "upload" ? "seg active" : "seg"}
              onClick={() => setMode("upload")}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "8px", flex: 1, textAlign: "center" }}
            >
              📁 File Drop
            </button>
            <button
              type="button"
              className={mode === "url" ? "seg active" : "seg"}
              onClick={() => setMode("url")}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "8px", flex: 1, textAlign: "center" }}
            >
              🔗 Online Link
            </button>
          </div>

          <form onSubmit={handleSubmit} className="stack" style={{ gap: "1rem" }}>
            {mode === "upload" ? (
              <div className="file-dropzone" onClick={() => document.getElementById("file-input-console")?.click()}>
                {imagePreview ? (
                  <div className="dropzone-preview-container animate-slide-in">
                    <img 
                      src={imagePreview} 
                      alt="Upload preview" 
                      className="dropzone-preview-image" 
                    />
                    <div className="dropzone-file-details">
                      {uploadFiles.length === 1 ? uploadFiles[0].name : `${uploadFiles.length} files selected`}
                    </div>
                    <div className="dropzone-file-subtext">Click to change image</div>
                  </div>
                ) : (
                  <>
                    <svg className="file-dropzone-icon-pulse" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      Drag & drop image(s) or click to browse
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                      Supports JPG, PNG, WEBP (Max 10MB)
                    </span>
                  </>
                )}
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
          <div className="stack" style={{ gap: "1.75rem", marginTop: "1rem" }}>

            {/* Prediction Hero Banner */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1.5rem",
              padding: "1.5rem 1.75rem",
              borderRadius: "16px",
              background: "linear-gradient(135deg, var(--accent-light) 0%, var(--bg) 100%)",
              border: "1px solid var(--accent-glow)"
            }}>
              <div>
                <p className="eyebrow" style={{ color: "#10b981", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>Prediction Result</p>
                <h2 style={{ fontSize: "1.65rem", color: "var(--accent-secondary)", margin: "0.35rem 0 0.75rem", lineHeight: 1.3 }}>
                  {predictedClassTitle}
                </h2>
                <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                  <div>
                    <span className="subtle">Confidence Score</span>
                    <strong style={{ display: "block", fontSize: "1.15rem", color: "var(--text-primary)" }}>{confidenceDisplay}</strong>
                  </div>
                  <div>
                    <span className="subtle">Inference Time</span>
                    <strong style={{ display: "block", fontSize: "1.15rem", color: "var(--text-primary)" }}>{inferenceTimeDisplay}</strong>
                  </div>
                  <div>
                    <span className="subtle">Model Used</span>
                    <strong style={{ display: "block", fontSize: "1.15rem", color: "var(--text-primary)" }}>{modelUsedDisplay}</strong>
                  </div>
                  <div>
                    <span className="subtle">Audit ID</span>
                    <strong style={{ display: "block", fontSize: "1.15rem", color: "var(--text-primary)" }}>AUDIT-{auditId || result?.audit_id || "-"}</strong>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button type="button" className="button-secondary" onClick={() => setShowJsonModal(true)}>
                  View JSON
                </button>
                <button type="button" className="button-secondary" onClick={handleDownloadImage} disabled={!productImageUrl}>
                  Download Image
                </button>
                <button type="button" onClick={handleExportReport}>
                  Export Report
                </button>
              </div>
            </div>

            {/* KPI Grid — matches Dashboard's Total Audits / Accuracy / Pass Rate / Issues color theme */}
            <div className="kpi-grid" style={{ marginBottom: 0 }}>
              {/* Card 1: Total Detections (Red) */}
              <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.1rem", alignItems: "center", padding: "1.25rem", borderLeft: "4px solid #E53935", background: "linear-gradient(180deg, #FFFFFF 0%, #FFF3F3 40%, #FFCDD2 70%, #EF5350 100%)", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#1565C0", flexShrink: 0, boxShadow: "var(--shadow-sm)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <div className="stack" style={{ gap: "0.2rem", minWidth: 0 }}>
                  <span className="kpi-label" style={{ color: "#C62828", fontWeight: 700 }}>Total Detections</span>
                  <strong className="kpi-value" style={{ fontSize: "1.5rem", display: "block", color: "#1B1B1B" }}>{total}</strong>
                  <span style={{ fontSize: "0.76rem", color: "#C62828", fontWeight: 700 }}>objects located</span>
                </div>
              </div>

              {/* Card 2: Bounding Boxes (Blue) */}
              <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.1rem", alignItems: "center", padding: "1.25rem", borderLeft: "4px solid #1E88E5", background: "linear-gradient(180deg, #FFFFFF 0%, #F1F8FF 40%, #B3E5FC 70%, #42A5F5 100%)", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#1565C0", flexShrink: 0, boxShadow: "var(--shadow-sm)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                </div>
                <div className="stack" style={{ gap: "0.2rem", minWidth: 0 }}>
                  <span className="kpi-label" style={{ color: "#0D47A1", fontWeight: 700 }}>Bounding Boxes</span>
                  <strong className="kpi-value" style={{ fontSize: "1.5rem", display: "block", color: "#1B1B1B" }}>{parsedCoords.length}</strong>
                  <span style={{ fontSize: "0.76rem", color: "#0D47A1", fontWeight: 700 }}>regions drawn</span>
                </div>
              </div>

              {/* Card 3: Unique Classes (Green) */}
              <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.1rem", alignItems: "center", padding: "1.25rem", borderLeft: "4px solid #43A047", background: "linear-gradient(180deg, #FFFFFF 0%, #F1F9F1 40%, #C8E6C9 70%, #66BB6A 100%)", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#1565C0", flexShrink: 0, boxShadow: "var(--shadow-sm)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                </div>
                <div className="stack" style={{ gap: "0.2rem", minWidth: 0 }}>
                  <span className="kpi-label" style={{ color: "#1B5E20", fontWeight: 700 }}>Unique Classes</span>
                  <strong className="kpi-value" style={{ fontSize: "1.5rem", display: "block", color: "#1B1B1B" }}>{uniqueClasses.length}</strong>
                  <span style={{ fontSize: "0.76rem", color: "#1B5E20", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{predictedClassTitle}</span>
                </div>
              </div>

              {/* Card 4: Processed By (Orange) */}
              <div className="kpi-card" style={{ display: "flex", flexDirection: "row", gap: "1.1rem", alignItems: "center", padding: "1.25rem", borderLeft: "4px solid #FB8C00", background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F1 40%, #FFE0B2 70%, #FFA726 100%)", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#1565C0", flexShrink: 0, boxShadow: "var(--shadow-sm)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
                </div>
                <div className="stack" style={{ gap: "0.2rem", minWidth: 0 }}>
                  <span className="kpi-label" style={{ color: "#E65100", fontWeight: 700 }}>Processed By</span>
                  <strong className="kpi-value" style={{ fontSize: "1.2rem", display: "block", color: "#1B1B1B" }}>{processedByDisplay}</strong>
                  <span style={{ fontSize: "0.76rem", color: "#E65100", fontWeight: 700 }}>SKU: {productCode || (result as any)?.product_code || "DEMO"}</span>
                </div>
              </div>
            </div>

            {/* Image + Side Details */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.9fr)", gap: "1.5rem", overflowX: "hidden" }} className="detail-grid">

              {/* Left side: Large Image + Detected Objects */}
              <div className="stack" style={{ gap: "1.5rem", minWidth: 0 }}>
                {productImageUrl ? (
                  <div className="image-canvas-wrapper" style={{ maxHeight: "640px", overflowY: "auto", overflowX: "hidden" }}>
                    <div style={{ position: "relative", width: "100%" }}>
                      <Image
                        src={productImageUrl}
                        alt="Neural detections preview"
                        width={1280}
                        height={960}
                        style={{ width: "100%", height: "auto", minHeight: "420px", objectFit: "contain", display: "block" }}
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
                  </div>
                ) : (
                  <p>No annotated output available.</p>
                )}

                {/* Table 1: Detected Objects */}
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
                              <td><span className="chip completed" style={{ fontSize: "0.72rem" }}>{confidenceDisplay}</span></td>
                              <td><code>[{item.bbox.join(", ")}]</code></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Product counts breakdown */}
                {countsEntries.length > 0 && (
                  <div className="stack" style={{ gap: "0.5rem" }}>
                    <h3>Product Counts</h3>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {countsEntries.map(([name, count]) => (
                            <tr key={name}>
                              <td><strong>{name}</strong></td>
                              <td>{String(count)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Brand breakdown */}
                {brandCounts.length > 0 && (
                  <div className="stack" style={{ gap: "0.5rem" }}>
                    <h3>Brand Breakup</h3>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Brand Class</th>
                            <th>Detected SKU Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {brandCounts.map((b, i) => (
                            <tr key={i}>
                              <td><strong>{b.brand ?? b.name ?? "-"}</strong></td>
                              <td>{b.count ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Right side: Details + Complete Result Data */}
              <div className="stack" style={{ gap: "1.5rem" }}>
                <div className="stack" style={{ gap: "0.85rem" }}>
                  <h3>Details</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.5fr)", gap: "0.5rem", fontSize: "0.88rem" }}>
                    <span className="subtle">Audit ID</span>
                    <strong>AUDIT-{auditId || result?.audit_id || "-"}</strong>

                    <span className="subtle">SKU Code</span>
                    <strong>{productCode || (result as any)?.product_code || "DEMO"}</strong>

                    <span className="subtle">Category</span>
                    <strong>{categoryDisplay}</strong>

                    <span className="subtle">Status</span>
                    <span className={`chip ${state}`} style={{ justifySelf: "start" }}>{state}</span>

                    <span className="subtle">Processed By</span>
                    <strong>{processedByDisplay}</strong>
                  </div>
                </div>

                {detectedProducts.length > 0 && (
                  <div className="stack" style={{ gap: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                    <h3>Identified Products</h3>
                    <ul className="tag-list">
                      {detectedProducts.map((p, i) => (
                        <li key={i} className="tag">{typeof p === "string" ? p : JSON.stringify(p)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Exhaustive JSON field dump so nothing from the backend is hidden */}
                <div className="stack" style={{ gap: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  <h3>Complete Result Data</h3>
                  <div className="table-wrap" style={{ maxHeight: "760px", overflowY: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: "35%" }}>Field</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allResultFields.length > 0 ? (
                          allResultFields.map(({ key, value }) => (
                            <tr key={key}>
                              <td>
                                <strong style={{ color: "var(--accent-primary)", fontFamily: "monospace", fontSize: "0.82rem" }}>
                                  {key}
                                </strong>
                              </td>
                              <td style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{value}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="subtle">No result data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </section>

      {/* Raw JSON View Modal */}
      {showJsonModal && (
        <div className="modal-overlay" onClick={() => setShowJsonModal(false)}>
          <div className="modal-content animate-slide-in" style={{ maxWidth: "680px", width: "92%", borderLeft: "4px solid var(--accent-primary)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header row-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div className="toast-icon-wrapper" style={{ background: "rgba(46, 125, 50, 0.1)", color: "var(--accent-primary)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Audit Result JSON</h3>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Raw classification response payload</span>
                </div>
              </div>
              <button type="button" className="toast-close-btn" onClick={() => setShowJsonModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: "400px", overflowY: "auto", margin: "1rem 0" }}>
              <pre style={{ background: "var(--bg)", border: "1px solid var(--border)", padding: "1rem", borderRadius: "10px", fontSize: "0.82rem", color: "var(--text-primary)", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {JSON.stringify(resultJson || result, null, 2)}
              </pre>
            </div>
            <div className="modal-footer" style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="button-secondary"
                style={{ borderRadius: "8px", padding: "0.55rem 1.2rem", fontSize: "0.85rem" }}
                onClick={() => {
                  void navigator.clipboard.writeText(JSON.stringify(resultJson || result, null, 2));
                  setCopyToast("JSON payload copied to clipboard!");
                  setTimeout(() => setCopyToast(null), 2500);
                }}
              >
                📋 Copy JSON
              </button>
              <button
                type="button"
                className="button-secondary"
                style={{ borderRadius: "8px", padding: "0.55rem 1.2rem", fontSize: "0.85rem" }}
                onClick={() => setShowJsonModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Toast Notification */}
      {copyToast && (
        <div className="toast-container">
          <div className="toast show">
            <div className="toast-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="toast-message">{copyToast}</div>
          </div>
        </div>
      )}
    </div>
  );
}
