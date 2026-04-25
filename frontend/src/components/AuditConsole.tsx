"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { getAuditStatus, resolveApiAssetUrl, submitAuditByCode, submitAuditByUpload, type AuditStatusResponse, type BrandCount, type DetectionCoordinate } from "@/lib/api";
import { addHistoryItem, updateHistoryStatus } from "@/lib/history";
import { connectAuditSocket } from "@/lib/ws";

type UiState = "idle" | "submitting" | "queued" | "processing" | "completed" | "failed";
type InputMode = "url" | "upload";

export default function AuditConsole() {
  const [mode, setMode] = useState<InputMode>("url");
  const [productCode, setProductCode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [auditId, setAuditId] = useState<number | null>(null);
  const [state, setState] = useState<UiState>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [result, setResult] = useState<AuditStatusResponse | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<number | null>(null);
  const finalStateRef = useRef<UiState>("idle");

  useEffect(() => {
    finalStateRef.current = state;
  }, [state]);

  useEffect(() => {
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
        setState(data.status === "completed" ? "completed" : data.status === "failed" ? "failed" : "processing");
        if (data.status === "processing" || data.status === "completed" || data.status === "failed") {
          updateHistoryStatus(id, data.status);
        }
        setStatusMessage(`HTTP fallback status: ${data.status}`);
        if (data.status === "completed" || data.status === "failed") {
          if (pollRef.current !== null) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        setStatusMessage("Fallback polling failed. Retrying...");
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
      setStatusMessage(`Audit ${status}`);
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
    setStatusMessage(`Live status: ${status}`);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!canSubmit) return;

    setState("submitting");
    setResult(null);
    setAuditId(null);
    setStatusMessage("Submitting audit request...");

    try {
      const data = mode === "url"
        ? await submitAuditByCode(productCode.trim(), imageUrl.trim())
        : await submitAuditByUpload(productCode.trim(), uploadFile as File);

      if (!data.audit_id) {
        setState("failed");
        setStatusMessage((data.detection_reason as string) || data.message || "Submission failed");
        return;
      }

      setAuditId(data.audit_id);
        trackAudit(data.audit_id, data.status, mode === "url" ? imageUrl.trim() : (uploadFile?.name || "upload"));
      setState(data.status === "pending" ? "queued" : "processing");
      setStatusMessage(`Audit queued with id ${data.audit_id}`);

      socketRef.current = connectAuditSocket(data.audit_id, {
        onMessage: handleSocketMessage,
        onError: () => {
          setStatusMessage("WebSocket error. Switching to HTTP fallback...");
        },
        onClose: () => {
          if (finalStateRef.current !== "completed" && finalStateRef.current !== "failed") {
            void startHttpFallbackPolling(data.audit_id as number);
          }
        },
      });
    } catch (error) {
      setState("failed");
      setStatusMessage(error instanceof Error ? error.message : "Unknown error");
    }
  }

  const resultJson = result?.result_json;
  const productImageUrl = resultJson?.product_image_url ? resolveApiAssetUrl(String(resultJson.product_image_url)) : "";
  const total = Number(resultJson?.total ?? resultJson?.total_product_count ?? 0);
  const counts = resultJson?.counts || {};
  const brandCounts = resultJson?.brand_counts || [];
  const coordinates = resultJson?.detection_coordinates || [];
  const detectedProducts = resultJson?.detected_products || [];

  return (
    <div className="audit-shell">
      <section className="card full">
        <h2>New Audit</h2>
        <p className="subtle">Need previous runs? <Link href="/history">Open history</Link></p>

        <div className="segmented" role="tablist" aria-label="Input Mode">
          <button
            type="button"
            className={mode === "url" ? "seg active" : "seg"}
            onClick={() => setMode("url")}
          >
            URL / Path
          </button>
          <button
            type="button"
            className={mode === "upload" ? "seg active" : "seg"}
            onClick={() => setMode("upload")}
          >
            Upload File
          </button>
        </div>

        <form onSubmit={handleSubmit} className="stack">
          <label>
            Product Code
            <input
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="AMUL"
              required
            />
          </label>

          {mode === "url" ? (
            <label>
              Image URL or absolute file path
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="/home/vijay/Desktop/Projects/FMCG-Insight-360/dog.jpg"
                required
              />
            </label>
          ) : (
            <label>
              Upload image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                required
              />
            </label>
          )}

          <button type="submit" disabled={!canSubmit}>
            {state === "submitting" ? "Submitting..." : "Start Audit"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Live Status</h2>
        <p><strong>State:</strong> <span className={`chip ${state === "completed" ? "completed" : state === "failed" ? "failed" : state === "idle" ? "" : "processing"}`}>{state}</span></p>
        <p><strong>Audit ID:</strong> {auditId ?? "-"}</p>
        <p className="subtle">{statusMessage}</p>
        {state === "failed" && (
          <div className="error-box" style={{ marginTop: "0.5rem" }}>
            {statusMessage}
            <button type="button" className="small" onClick={() => setState("idle")}>
              Dismiss
            </button>
          </div>
        )}
      </section>

      <section className="card wide">
        <h2>Result</h2>
        {!resultJson ? (
          <p className="subtle">No result yet. Submit an audit to see detection output.</p>
        ) : (
          <div className="result-grid">
            <div className="metrics">
              <div className="metric"><span>Total</span><strong>{total}</strong></div>
              {resultJson.total_self_count !== undefined && (
                <div className="metric"><span>Self</span><strong>{resultJson.total_self_count}</strong></div>
              )}
              {resultJson.total_competition_count !== undefined && (
                <div className="metric"><span>Competition</span><strong>{resultJson.total_competition_count}</strong></div>
              )}
              {Object.entries(counts).map(([key, value]) => (
                <div key={key} className="metric"><span>{key}</span><strong>{value}</strong></div>
              ))}
              {brandCounts.map((b, i) => (
                <div key={i} className="metric">
                  <span>{b.brand ?? b.name ?? `Brand ${i + 1}`}</span>
                  <strong>{b.count ?? "-"}</strong>
                </div>
              ))}
            </div>
            <div>
              {productImageUrl ? (
                <Image
                  src={productImageUrl}
                  alt="Annotated output"
                  className="preview"
                  width={800}
                  height={600}
                  style={{ width: "100%", height: "auto" }}
                  unoptimized
                />
              ) : (
                <p>No annotated image available.</p>
              )}
              {detectedProducts.length > 0 && (
                <ul className="tag-list">
                  {detectedProducts.map((p, i) => <li key={i} className="tag">{p}</li>)}
                </ul>
              )}
              {coordinates.length > 0 && (
                <details style={{ marginTop: "0.5rem" }}>
                  <summary>{coordinates.length} detection coordinate(s)</summary>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>#</th><th>Label</th><th>Confidence</th><th>BBox</th></tr></thead>
                      <tbody>
                        {coordinates.map((c, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{c.label ?? "-"}</td>
                            <td>{c.confidence !== undefined ? `${(Number(c.confidence) * 100).toFixed(1)}%` : "-"}</td>
                            <td>{c.bbox ? `[${c.bbox.join(", ")}]` : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
              <details style={{ marginTop: "0.5rem" }}>
                <summary>Raw JSON</summary>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </details>
              {result?.audit_id && (
                <p style={{ marginTop: "0.5rem" }}>
                  <Link href={`/audit/${result.audit_id}`} className="small-link">Open full detail page →</Link>
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
