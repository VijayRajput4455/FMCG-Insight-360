"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, useMemo } from "react";
import { getAuditStatus, resolveApiAssetUrl, type AuditStatusResponse } from "@/lib/api";

export default function AuditDetailPage() {
  const params = useParams();
  const auditId = Number(params.id);

  const [data, setData] = useState<AuditStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Responsive image dimensions for bounding box overlays
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [hoveredBoxId, setHoveredBoxId] = useState<number | null>(null);

  const load = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    try {
      const result = await getAuditStatus(auditId);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auditId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rj = data?.result_json;
  const imageUrl = rj?.product_image_url ? resolveApiAssetUrl(String(rj.product_image_url)) : "";
  const total = Number(rj?.total ?? rj?.total_product_count ?? 0);
  const brandCounts = rj?.brand_counts || [];
  
  // Safe coordinate parser
  const parsedCoords = useMemo(() => {
    const coords = rj?.detection_coordinates;
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
  }, [rj]);

  const detectedProducts = rj?.detected_products || [];

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgSize({ width: naturalWidth, height: naturalHeight });
  };

  const stepsCompleted = useMemo(() => {
    if (data?.status === "completed") return 5;
    if (data?.status === "failed") return 3; // failed on worker processing
    if (data?.status === "processing") return 3;
    if (data?.status === "pending") return 2;
    return 0;
  }, [data]);

  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      {/* Large Hero Header Card */}
      <section className="card row-between" style={{
        background: "linear-gradient(135deg, var(--accent-light) 0%, var(--bg) 100%)",
        border: "1px solid var(--accent-glow)",
        position: "relative",
        overflow: "hidden",
        padding: "2rem",
        alignItems: "center"
      }}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-primary)" }}>Audit Detail</span>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.25rem 0 0", color: "var(--accent-primary)" }}>Audit Timeline</h1>
          <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: "1.5" }}>
            <Link href="/history" style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: "none" }}>&larr; Back to Logs</Link>
          </p>
        </div>
        <button
          type="button"
          className="button-secondary small"
          style={{ position: "relative", zIndex: 2, borderRadius: "8px", padding: "0.5rem 1rem" }}
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      {loading ? (
        <div className="skeleton-block" style={{ height: "300px" }} />
      ) : error ? (
        <div className="error-box">
          <strong>Error:</strong> {error}
          <button type="button" className="small" onClick={() => void load()}>Retry</button>
        </div>
      ) : data ? (
        <div className="stack" style={{ gap: "1.75rem" }}>
          
          {/* Top Section: Stepper and details (Matches Screen 4 Layout) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }} className="detail-grid">
            
            {/* Stepper Timeline card */}
            <section className="card stack">
              <h2>Audit Timeline</h2>
              <p className="subtle">Classification execution tracking.</p>
              
              <div className="stepper-container" style={{ marginTop: "1rem" }}>
                <div className={`step-item ${stepsCompleted >= 1 ? "completed" : ""}`}>
                  <div className="step-icon">✓</div>
                  <div className="step-content">
                    <span className="step-title">Image Uploaded</span>
                    <span className="step-desc">10:24:00 AM • Source loaded</span>
                  </div>
                </div>

                <div className={`step-item ${stepsCompleted >= 2 ? "completed" : ""}`}>
                  <div className="step-icon">✓</div>
                  <div className="step-content">
                    <span className="step-title">Message Queued</span>
                    <span className="step-desc">10:24:02 AM • Sent to RabbitMQ</span>
                  </div>
                </div>

                <div className={`step-item ${stepsCompleted >= 3 ? "completed" : ""} ${data.status === "processing" ? "active" : ""}`}>
                  <div className="step-icon">✓</div>
                  <div className="step-content">
                    <span className="step-title">YOLO Processing</span>
                    <span className="step-desc">10:24:04 AM • AI Pipeline triggered</span>
                  </div>
                </div>

                <div className={`step-item ${stepsCompleted >= 4 ? "completed" : ""}`}>
                  <div className="step-icon">✓</div>
                  <div className="step-content">
                    <span className="step-title">Classification</span>
                    <span className="step-desc">10:24:05 AM • Localizing items</span>
                  </div>
                </div>

                <div className={`step-item ${stepsCompleted >= 5 ? "completed" : ""} ${data.status === "failed" ? "failed" : ""}`}>
                  <div className="step-icon">{data.status === "failed" ? "✗" : "✓"}</div>
                  <div className="step-content">
                    <span className="step-title">{data.status === "failed" ? "Pipeline Failed" : "Audit Completed"}</span>
                    <span className="step-desc">{data.status === "failed" ? data.error_message : "10:24:07 AM • DB sync finished"}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Col 2: Info Cards (Matches Screen 4 Right) */}
            <div className="stack" style={{ gap: "1.25rem" }}>
              <section className="card stack">
                <h2>Audit Info</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "0.5rem", fontSize: "0.88rem" }}>
                  <span className="subtle">Audit ID</span>
                  <strong>AUDIT-{data.audit_id}</strong>

                  <span className="subtle">Status</span>
                  <span className={`chip ${data.status}`} style={{ justifySelf: "start" }}>{data.status}</span>

                  <span className="subtle">Category Map</span>
                  <strong>Beverages</strong>

                  <span className="subtle">Model</span>
                  <strong>YOLOv8m</strong>

                  <span className="subtle">Worker</span>
                  <strong>worker-1</strong>

                  <span className="subtle">Created At</span>
                  <strong>10:24 AM</strong>
                </div>
              </section>

              <section className="card stack">
                <h2>System Info</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "0.5rem", fontSize: "0.88rem" }}>
                  <span className="subtle">Queue Size</span>
                  <strong>14 jobs</strong>

                  <span className="subtle">GPU Usage</span>
                  <strong>62% load</strong>

                  <span className="subtle">Avg Inference Time</span>
                  <strong>320ms</strong>
                </div>
              </section>
            </div>

          </div>

          {/* Bounding Box Highlights Image Viewer */}
          <section className="card wide">
            <h2>Neural Classification Highlights</h2>
            <p className="subtle" style={{ marginBottom: "1rem" }}>
              Hover over bounding box labels or table rows to focus detections.
            </p>
            {imageUrl ? (
              <div className="image-canvas-wrapper">
                <Image
                  src={imageUrl}
                  alt="Annotated detection output"
                  width={1200}
                  height={900}
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
          </section>

          {/* Brand details */}
          {brandCounts.length > 0 && (
            <section className="card">
              <h2>Brand Breakup</h2>
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
            </section>
          )}

          {/* Detected product names */}
          {detectedProducts.length > 0 && (
            <section className="card">
              <h2>Identified Products</h2>
              <ul className="tag-list">
                {detectedProducts.map((p, i) => (
                  <li key={i} className="tag">{p}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Coordinates table */}
          {parsedCoords.length > 0 && (
            <section className="card wide">
              <h2>Bounding Box Coordinates ({parsedCoords.length})</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Class Identifier</th>
                      <th>Bounding Box Coordinates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedCoords.map((item, idx) => (
                      <tr 
                        key={item.id}
                        onMouseEnter={() => setHoveredBoxId(item.id)}
                        onMouseLeave={() => setHoveredBoxId(null)}
                        style={{
                          background: hoveredBoxId === item.id ? "var(--surface-hover)" : "",
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
            </section>
          )}

          {/* Debug JSON details */}
          <section className="card wide">
            <details>
              <summary>Raw JSON Data</summary>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </details>
          </section>

        </div>
      ) : null}
    </div>
  );
}
