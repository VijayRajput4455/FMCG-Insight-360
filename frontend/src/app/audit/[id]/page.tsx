"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { getAuditStatus, resolveApiAssetUrl, type AuditStatusResponse } from "@/lib/api";

export default function AuditDetailPage() {
  const params = useParams();
  const auditId = Number(params.id);

  const [data, setData] = useState<AuditStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    try {
      const result = await getAuditStatus(auditId);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit");
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
  const coordinates = rj?.detection_coordinates || [];
  const detectedProducts = rj?.detected_products || [];

  return (
    <main className="container">
      <header className="hero">
        <div className="row-between">
          <div>
            <h1>Audit #{auditId}</h1>
            <p><Link href="/history">← Back to History</Link></p>
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
        <div className="skeleton-block" />
      ) : error ? (
        <div className="error-box">
          <strong>Error:</strong> {error}
          <button type="button" className="small" onClick={() => void load()}>Retry</button>
        </div>
      ) : data ? (
        <div className="detail-grid">

          {/* Status card */}
          <section className="card">
            <h2>Status</h2>
            <span className={`chip ${data.status}`}>{data.status}</span>
            {data.error_message && (
              <p className="error-text">{data.error_message}</p>
            )}
          </section>

          {/* Count metrics */}
          <section className="card">
            <h2>Counts</h2>
            <div className="metrics">
              <div className="metric"><span>Total</span><strong>{total}</strong></div>
              {rj?.total_self_count !== undefined && (
                <div className="metric"><span>Self</span><strong>{rj.total_self_count}</strong></div>
              )}
              {rj?.total_competition_count !== undefined && (
                <div className="metric"><span>Competition</span><strong>{rj.total_competition_count}</strong></div>
              )}
              {rj?.counts && Object.entries(rj.counts).map(([k, v]) => (
                <div key={k} className="metric"><span>{k}</span><strong>{v}</strong></div>
              ))}
            </div>
          </section>

          {/* Brand counts */}
          {brandCounts.length > 0 && (
            <section className="card">
              <h2>Brand Counts</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Brand</th><th>Count</th></tr>
                  </thead>
                  <tbody>
                    {brandCounts.map((b, i) => (
                      <tr key={i}>
                        <td>{b.brand ?? b.name ?? "-"}</td>
                        <td>{b.count ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Detected products */}
          {detectedProducts.length > 0 && (
            <section className="card">
              <h2>Detected Products</h2>
              <ul className="tag-list">
                {detectedProducts.map((p, i) => (
                  <li key={i} className="tag">{p}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Annotated image */}
          <section className="card wide">
            <h2>Annotated Image</h2>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt="Annotated detection output"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", borderRadius: 10 }}
                unoptimized
              />
            ) : (
              <p>No annotated image available.</p>
            )}
          </section>

          {/* Detection coordinates */}
          {coordinates.length > 0 && (
            <section className="card wide">
              <h2>Detection Coordinates ({coordinates.length})</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Label</th><th>Confidence</th><th>BBox</th></tr>
                  </thead>
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
            </section>
          )}

          {/* Raw JSON */}
          <section className="card wide">
            <details>
              <summary>Raw JSON</summary>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </details>
          </section>

        </div>
      ) : null}
    </main>
  );
}
