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
      // Coordinates are structured as { "Label": [x1, y1, x2, y2] }
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

  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      <header className="hero">
        <div className="row-between">
          <div>
            <h1>Audit Log #{auditId}</h1>
            <p><Link href="/history" style={{color: 'var(--accent-secondary)'}}>&larr; Back to System Logs</Link></p>
          </div>
          <button
            type="button"
            className="small"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="skeleton-block" style={{ height: "300px" }} />
      ) : error ? (
        <div className="error-box">
          <strong>Error:</strong> {error}
          <button type="button" className="small" onClick={() => void load()}>Retry</button>
        </div>
      ) : data ? (
        <div className="detail-grid">
          
          {/* Status & Summary */}
          <section className="card stack">
            <h2>Audit Process Details</h2>
            <div className="metrics">
              <div className="metric">
                <span>Current Status</span>
                <span className={`chip ${data.status}`}>{data.status}</span>
              </div>
              {data.error_message && (
                <div className="error-box" style={{ marginTop: "0.5rem" }}>
                  <span className="error-text">{data.error_message}</span>
                </div>
              )}
            </div>
          </section>

          {/* Core metrics */}
          <section className="card stack">
            <h2>Detections Summary</h2>
            <div className="metrics">
              <div className="metric">
                <span>Total Items Found</span>
                <strong>{total}</strong>
              </div>
              {rj?.total_self_count !== undefined && (
                <div className="metric">
                  <span>Self (Own Brand)</span>
                  <strong>{rj.total_self_count}</strong>
                </div>
              )}
              {rj?.total_competition_count !== undefined && (
                <div className="metric">
                  <span>Competition Brand</span>
                  <strong>{rj.total_competition_count}</strong>
                </div>
              )}
              {rj?.counts && Object.entries(rj.counts).map(([k, v]) => (
                <div key={k} className="metric">
                  <span>{k}</span>
                  <strong>{Number(v)}</strong>
                </div>
              ))}
            </div>
          </section>

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
