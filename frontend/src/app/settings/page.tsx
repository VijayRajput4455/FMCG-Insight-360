"use client";

import { useState, useEffect } from "react";
import { getApiBaseUrl, listAudits, listModels, listProductCodes } from "@/lib/api";
import { getHistory, clearHistory } from "@/lib/history";

type SettingsTab = "general" | "ai" | "export" | "system" | "appearance";

const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange && onChange(!checked)}
    style={{
      position: "relative",
      display: "inline-flex",
      height: "26px",
      width: "48px",
      flexShrink: 0,
      cursor: disabled ? "not-allowed" : "pointer",
      borderRadius: "99px",
      border: "2px solid transparent",
      transition: "background-color 0.25s ease-in-out",
      background: checked ? "var(--accent-primary)" : "var(--border)",
      opacity: disabled ? 0.6 : 1,
      padding: 0,
      boxShadow: checked ? "0 2px 8px var(--accent-glow)" : "none",
    }}
  >
    <span
      style={{
        pointerEvents: "none",
        display: "inline-block",
        height: "22px",
        width: "22px",
        borderRadius: "50%",
        background: "#FFFFFF",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        transition: "transform 0.25s ease-in-out",
        transform: checked ? "translateX(22px)" : "translateX(0px)",
      }}
    />
  </button>
);

export default function SettingsPage() {

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // General Settings State
  const [systemName, setSystemName] = useState("FMCG Insight 360");
  const [companyName, setCompanyName] = useState("Global Retail Corp");
  const [timezone, setTimezone] = useState("UTC+5:30");
  const [language, setLanguage] = useState("en");

  // AI & Multi-Model Inference Defaults
  const [confThreshold, setConfThreshold] = useState<number>(0.25);
  const [iouThreshold, setIouThreshold] = useState<number>(0.40);
  const [defaultImgSize, setDefaultImgSize] = useState<string>("1280");
  const [enableMultiModelNms, setEnableMultiModelNms] = useState<boolean>(true);
  const [maxLocalHistory, setMaxLocalHistory] = useState<number>(100);

  // Export & Archiving Preferences
  const [defaultExportFormat, setDefaultExportFormat] = useState<"csv" | "json">("csv");
  const [csvDelimiter, setCsvDelimiter] = useState<string>(",");
  const [includeImageUrls, setIncludeImageUrls] = useState<boolean>(true);

  // Infrastructure & Diagnostics
  const [apiBaseUrl, setApiBaseUrl] = useState<string>("");
  const [healthStatus, setHealthStatus] = useState<"checking" | "online" | "offline">("checking");
  const [healthMessage, setHealthMessage] = useState<string>("");
  const [stats, setStats] = useState<{ totalAudits: number; activeModels: number; totalProductCodes: number; localHistoryCount: number }>({
    totalAudits: 0,
    activeModels: 0,
    totalProductCodes: 0,
    localHistoryCount: 0,
  });

  // Appearance & Theme
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeAccent, setActiveAccent] = useState<"green" | "red" | "blue" | "orange">("green");

  // UI Feedback States
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    setApiBaseUrl(getApiBaseUrl());

    // Load AI thresholds
    const savedConf = localStorage.getItem("fmcg_conf_threshold");
    if (savedConf) setConfThreshold(parseFloat(savedConf));

    const savedIou = localStorage.getItem("fmcg_iou_threshold");
    if (savedIou) setIouThreshold(parseFloat(savedIou));

    const savedSize = localStorage.getItem("fmcg_default_img_size");
    if (savedSize) setDefaultImgSize(savedSize);

    const savedNms = localStorage.getItem("fmcg_multi_model_nms");
    if (savedNms !== null) setEnableMultiModelNms(savedNms === "true");

    const savedExportFormat = localStorage.getItem("fmcg_export_format");
    if (savedExportFormat === "csv" || savedExportFormat === "json") setDefaultExportFormat(savedExportFormat);

    const savedSystemName = localStorage.getItem("fmcg_system_name");
    if (savedSystemName) setSystemName(savedSystemName);

    const savedCompanyName = localStorage.getItem("fmcg_company_name");
    if (savedCompanyName) setCompanyName(savedCompanyName);

    // Theme setup
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    setDarkMode(isDark);

    const savedAccent = localStorage.getItem("accent-theme") as "green" | "red" | "blue" | "orange" | null;
    if (savedAccent && ["green", "red", "blue", "orange"].includes(savedAccent)) {
      setActiveAccent(savedAccent);
    }

    // Run Health Check & Fetch System Metrics
    void runHealthCheck();
    void fetchSystemStats();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const runHealthCheck = async () => {
    setHealthStatus("checking");
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/docs`, { method: "HEAD" });
      if (res.ok || res.status === 200 || res.status === 404) {
        setHealthStatus("online");
        setHealthMessage(`Connected to backend API at ${baseUrl}`);
      } else {
        setHealthStatus("offline");
        setHealthMessage(`API responded with status code ${res.status}`);
      }
    } catch {
      setHealthStatus("offline");
      setHealthMessage(`Unable to connect to backend at ${getApiBaseUrl()}`);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const [audits, models, codes] = await Promise.all([
        listAudits(undefined, undefined, 0, 100).catch(() => []),
        listModels().catch(() => []),
        listProductCodes().catch(() => []),
      ]);


      const localItems = getHistory();
      setStats({
        totalAudits: Array.isArray(audits) ? audits.length : 0,
        activeModels: Array.isArray(models) ? models.length : 0,
        totalProductCodes: Array.isArray(codes) ? codes.length : 0,
        localHistoryCount: localItems.length,
      });
    } catch {
      // Fallback
    }
  };

  const handleAccentChange = (color: "green" | "red" | "blue" | "orange") => {
    setActiveAccent(color);
    localStorage.setItem("accent-theme", color);

    const presets = {
      green: {
        primary: "#2E7D32",
        secondary: "#43A047",
        light: "#E8F5E9",
        glow: "rgba(46, 125, 50, 0.12)",
        shadow: "0 10px 30px rgba(46, 125, 50, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)",
        shadowSm: "0 4px 12px rgba(46, 125, 50, 0.02)",
      },
      red: {
        primary: "#C62828",
        secondary: "#D32F2F",
        light: "#FFEBEE",
        glow: "rgba(198, 40, 40, 0.12)",
        shadow: "0 10px 30px rgba(198, 40, 40, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)",
        shadowSm: "0 4px 12px rgba(198, 40, 40, 0.02)",
      },
      blue: {
        primary: "#1565C0",
        secondary: "#1976D2",
        light: "#E3F2FD",
        glow: "rgba(21, 101, 192, 0.12)",
        shadow: "0 10px 30px rgba(21, 101, 192, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)",
        shadowSm: "0 4px 12px rgba(21, 101, 192, 0.02)",
      },
      orange: {
        primary: "#E65100",
        secondary: "#F57C00",
        light: "#FFF3E0",
        glow: "rgba(230, 81, 0, 0.12)",
        shadow: "0 10px 30px rgba(230, 81, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)",
        shadowSm: "0 4px 12px rgba(230, 81, 0, 0.02)",
      },
    };

    const p = presets[color] || presets.green;
    document.documentElement.style.setProperty("--accent-primary", p.primary);
    document.documentElement.style.setProperty("--accent-secondary", p.secondary);
    document.documentElement.style.setProperty("--accent-light", p.light);
    document.documentElement.style.setProperty("--accent-glow", p.glow);
    document.documentElement.style.setProperty("--shadow", p.shadow);
    document.documentElement.style.setProperty("--shadow-sm", p.shadowSm);

    window.dispatchEvent(new Event("accentthemechange"));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Save settings to LocalStorage
      localStorage.setItem("fmcg_conf_threshold", confThreshold.toString());
      localStorage.setItem("fmcg_iou_threshold", iouThreshold.toString());
      localStorage.setItem("fmcg_default_img_size", defaultImgSize);
      localStorage.setItem("fmcg_multi_model_nms", enableMultiModelNms ? "true" : "false");
      localStorage.setItem("fmcg_export_format", defaultExportFormat);
      localStorage.setItem("fmcg_system_name", systemName);
      localStorage.setItem("fmcg_company_name", companyName);

      showToast("System settings saved and applied successfully!", "success");
    } catch {
      showToast("Failed to save settings to browser storage.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleClearLocalCache = () => {
    if (confirm("Are you sure you want to clear locally cached audit scans?")) {
      clearHistory();
      void fetchSystemStats();
      showToast("Local history cache cleared successfully!", "success");
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all settings to system factory defaults?")) {
      setConfThreshold(0.25);
      setIouThreshold(0.40);
      setDefaultImgSize("1280");
      setEnableMultiModelNms(true);
      setDefaultExportFormat("csv");
      setCsvDelimiter(",");
      setIncludeImageUrls(true);
      setSystemName("FMCG Insight 360");
      setCompanyName("Global Retail Corp");
      handleAccentChange("green");

      localStorage.removeItem("fmcg_conf_threshold");
      localStorage.removeItem("fmcg_iou_threshold");
      localStorage.removeItem("fmcg_default_img_size");

      showToast("Settings reset to factory defaults.", "success");
    }
  };

  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "1.5rem",
            right: "1.5rem",
            zIndex: 99999,
            background: toast.type === "success" ? "#1B5E20" : "#C62828",
            color: "#FFFFFF",
            padding: "0.85rem 1.4rem",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontSize: "0.9rem",
            fontWeight: 700,
          }}
        >
          <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <section
        className="card"
        style={{
          background: "linear-gradient(135deg, var(--accent-light) 0%, var(--bg) 100%)",
          border: "1px solid var(--accent-glow)",
          position: "relative",
          overflow: "hidden",
          padding: "2rem",
          borderLeft: "4px solid var(--accent-primary)",
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-primary)" }}>
            System Administration
          </span>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.25rem 0 0", color: "var(--accent-primary)" }}>
            Control Console Settings
          </h1>
          <div className="main-header-line" />
          <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: "1.5" }}>
            Configure AI multi-model thresholds, infrastructure connectivity, report export defaults, and system appearance.
          </p>
        </div>
      </section>

      {/* System Status Summary Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
        }}
        className="detail-grid"
      >
        {/* Card 1: API Connection */}

        <div
          className="kpi-card"
          style={{
            padding: "1.25rem 1.5rem",
            background: healthStatus === "online" 
              ? "linear-gradient(180deg, #FFFFFF 0%, #F1F9F1 30%, #C8E6C9 65%, #66BB6A 100%)" 
              : "linear-gradient(180deg, #FFFFFF 0%, #FFF3F3 30%, #FFCDD2 65%, #EF5350 100%)",
            borderLeft: `4px solid ${healthStatus === "online" ? "#43A047" : "#E53935"}`,
            borderRadius: "12px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="kpi-label" style={{ fontSize: "0.75rem", fontWeight: 800, color: healthStatus === "online" ? "#1B5E20" : "#C62828", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            API Connection
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: healthStatus === "online" ? "#2E7D32" : healthStatus === "checking" ? "#F57C00" : "#C62828",
                boxShadow: healthStatus === "online" ? "0 0 10px rgba(46, 125, 50, 0.6)" : "none",
              }}
            />
            <strong style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1B1B1B" }}>
              {healthStatus === "online" ? "Online" : healthStatus === "checking" ? "Checking..." : "Offline"}
            </strong>
          </div>
          <span style={{ fontSize: "0.78rem", color: healthStatus === "online" ? "#1B5E20" : "#C62828", fontWeight: 700, marginTop: "0.2rem", display: "block" }}>
            Backend API endpoint health
          </span>
        </div>

        {/* Card 2: Active AI Models (Blue) */}
        <div
          className="kpi-card"
          style={{
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F1F8FF 30%, #B3E5FC 65%, #42A5F5 100%)",
            borderLeft: "4px solid #1E88E5",
            borderRadius: "12px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="kpi-label" style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0D47A1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Active AI Models
          </span>
          <strong style={{ display: "block", fontSize: "1.3rem", fontWeight: 800, marginTop: "0.4rem", color: "#1B1B1B" }}>
            {stats.activeModels} Loaded
          </strong>
          <span style={{ fontSize: "0.78rem", color: "#0D47A1", fontWeight: 700, marginTop: "0.2rem", display: "block" }}>
            Neural model instances active
          </span>
        </div>

        {/* Card 3: Product Codes (Green) */}
        <div
          className="kpi-card"
          style={{
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F1F9F1 30%, #C8E6C9 65%, #66BB6A 100%)",
            borderLeft: "4px solid #43A047",
            borderRadius: "12px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="kpi-label" style={{ fontSize: "0.75rem", fontWeight: 800, color: "#1B5E20", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Product Codes
          </span>
          <strong style={{ display: "block", fontSize: "1.3rem", fontWeight: 800, marginTop: "0.4rem", color: "#1B1B1B" }}>
            {stats.totalProductCodes} Catalog SKUs
          </strong>
          <span style={{ fontSize: "0.78rem", color: "#1B5E20", fontWeight: 700, marginTop: "0.2rem", display: "block" }}>
            Total database SKU mappings
          </span>
        </div>

        {/* Card 4: Local History Cache (Orange) */}
        <div
          className="kpi-card"
          style={{
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F1 30%, #FFE0B2 65%, #FFA726 100%)",
            borderLeft: "4px solid #FB8C00",
            borderRadius: "12px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="kpi-label" style={{ fontSize: "0.75rem", fontWeight: 800, color: "#E65100", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Local History Cache
          </span>
          <strong style={{ display: "block", fontSize: "1.3rem", fontWeight: 800, marginTop: "0.4rem", color: "#1B1B1B" }}>
            {stats.localHistoryCount} Scans
          </strong>
          <span style={{ fontSize: "0.78rem", color: "#E65100", fontWeight: 700, marginTop: "0.2rem", display: "block" }}>
            Locally stored audit runs
          </span>
        </div>
      </div>


      {/* Navigation Tabs */}


      <div className="settings-tabs" style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
        {[
          { key: "general", label: "⚙️ General", desc: "Console details" },
          { key: "ai", label: "🧠 AI & Multi-Model Rules", desc: "NMS & Thresholds" },
          { key: "export", label: "📊 Export & Reports", desc: "Format defaults" },
          { key: "appearance", label: "🎨 Appearance & Theme", desc: "Colors & Dark mode" },
          { key: "system", label: "⚡ System & Diagnostics", desc: "API & Storage" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`settings-tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key as SettingsTab)}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "10px",
              background: activeTab === tab.key ? "var(--accent-light)" : "transparent",
              color: activeTab === tab.key ? "var(--accent-primary)" : "var(--text-secondary)",
              fontWeight: 800,
              fontSize: "0.85rem",
              border: activeTab === tab.key ? "1px solid var(--accent-primary)" : "1px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings}>
        {/* TAB 1: General Settings */}
        {activeTab === "general" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.75rem" }} className="detail-grid">
            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid var(--accent-primary)" }}>
              <h2>General System Identity</h2>
              <label>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Console Application Name:
                </span>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}
                  required
                />
              </label>

              <label>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Organization / Company Name:
                </span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}
                  required
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Language:</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                </label>

                <label>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>Time Zone:</span>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}
                  >
                    <option value="UTC">UTC (GMT)</option>
                    <option value="UTC+5:30">UTC+5:30 (IST)</option>
                    <option value="UTC-5:00">UTC-5:00 (EST)</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #1565C0" }}>
              <h2>Console Information</h2>
              <p className="subtle" style={{ fontSize: "0.85rem" }}>
                FMCG Insight 360 platform deployment parameters.
              </p>

              <div className="stack" style={{ gap: "0.75rem", fontSize: "0.85rem" }}>
                <div className="row-between">
                  <span className="subtle">Core Engine:</span>
                  <strong>FastAPI + PyTorch / YOLOv8</strong>
                </div>
                <div className="row-between">
                  <span className="subtle">Message Broker:</span>
                  <strong>RabbitMQ Async Worker</strong>
                </div>
                <div className="row-between">
                  <span className="subtle">Database Layer:</span>
                  <strong>PostgreSQL / SQLAlchemy</strong>
                </div>
                <div className="row-between">
                  <span className="subtle">Object Storage:</span>
                  <strong>MinIO S3 Compatible</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI & Multi-Model Rules */}
        {activeTab === "ai" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.75rem" }} className="detail-grid">
            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #2E7D32" }}>
              <h2>AI Neural Inference & NMS Thresholds</h2>

              <label>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Confidence Threshold (conf_thresh): <strong>{(confThreshold * 100).toFixed(0)}% ({confThreshold})</strong>
                </span>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent-primary)" }}
                />
                <span className="subtle" style={{ fontSize: "0.75rem", display: "block", marginTop: "0.2rem" }}>
                  Minimum model confidence required to accept a bounding box detection.
                </span>
              </label>

              <label>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Cross-Model IoU NMS Threshold (iou_thresh): <strong>{(iouThreshold * 100).toFixed(0)}% ({iouThreshold})</strong>
                </span>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={iouThreshold}
                  onChange={(e) => setIouThreshold(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent-primary)" }}
                />
                <span className="subtle" style={{ fontSize: "0.75rem", display: "block", marginTop: "0.2rem" }}>
                  Deduplicates overlapping bounding boxes from multiple models for the same product class.
                </span>
              </label>

              <label>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Default Inference Resolution:
                </span>
                <select
                  value={defaultImgSize}
                  onChange={(e) => setDefaultImgSize(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}
                >
                  <option value="640">640 px (Standard Speed)</option>
                  <option value="1280">1280 px (High Precision - Recommended)</option>
                  <option value="1920">1920 px (Ultra High Res)</option>
                </select>
              </label>
            </div>

            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #E65100" }}>
              <h2>Multi-Model Pipeline Settings</h2>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
                <div>
                  <strong style={{ fontSize: "0.9rem", display: "block" }}>Cross-Model Box Merging</strong>
                  <span className="subtle" style={{ fontSize: "0.75rem" }}>
                    Sequentially merge predictions when multiple models map to 1 Product Code.
                  </span>
                </div>
                <ToggleSwitch
                  checked={enableMultiModelNms}
                  onChange={(val) => setEnableMultiModelNms(val)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: "0.9rem", display: "block" }}>Single Output Canvas</strong>
                  <span className="subtle" style={{ fontSize: "0.75rem" }}>
                    Render all model predictions onto 1 unified image.
                  </span>
                </div>
                <ToggleSwitch checked={true} disabled={true} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Export & Reports */}
        {activeTab === "export" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.75rem" }} className="detail-grid">
            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #2E7D32" }}>
              <h2>Report Export Defaults</h2>

              <label>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Default Audit Download Format:
                </span>
                <select
                  value={defaultExportFormat}
                  onChange={(e) => setDefaultExportFormat(e.target.value as "csv" | "json")}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}
                >
                  <option value="csv">📊 CSV Spreadsheet (.csv)</option>
                  <option value="json">📄 JSON Data Dump (.json)</option>
                </select>
              </label>

              <label>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  CSV Delimiter Character:
                </span>
                <select
                  value={csvDelimiter}
                  onChange={(e) => setCsvDelimiter(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}
                >
                  <option value=",">Comma ( , ) - Standard Excel</option>
                  <option value=";">Semicolon ( ; ) - European Regional</option>
                  <option value="\t">Tab ( \t ) - TSV Format</option>
                </select>
              </label>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem" }}>
                <div>
                  <strong style={{ fontSize: "0.9rem", display: "block" }}>Include Image URLs in Export</strong>
                  <span className="subtle" style={{ fontSize: "0.75rem" }}>
                    Embed Raw & Detected image URLs in generated CSV/JSON reports.
                  </span>
                </div>
                <ToggleSwitch
                  checked={includeImageUrls}
                  onChange={(val) => setIncludeImageUrls(val)}
                />
              </div>
            </div>

            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #1565C0" }}>
              <h2>Local Storage Limits</h2>

              <label>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Max Local History Items ({maxLocalHistory} items):
                </span>
                <input
                  type="range"
                  min="25"
                  max="500"
                  step="25"
                  value={maxLocalHistory}
                  onChange={(e) => setMaxLocalHistory(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent-primary)" }}
                />
              </label>

              <button
                type="button"
                className="button-danger"
                style={{ background: "#EF5350", color: "#FFFFFF", padding: "0.65rem 1rem", borderRadius: "8px", fontWeight: 700 }}
                onClick={handleClearLocalCache}
              >
                🗑️ Clear Local History Cache
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: Appearance & Custom Theme */}
        {activeTab === "appearance" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.75rem" }} className="detail-grid">
            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #1565C0" }}>
              <h2>Theme & Color Customization</h2>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1.25rem" }}>
                <div>
                  <strong style={{ fontSize: "0.95rem", display: "block" }}>Dark Mode Theme</strong>
                  <span className="subtle" style={{ fontSize: "0.78rem" }}>Toggle dark background palette for console UI.</span>
                </div>
                <ToggleSwitch
                  checked={darkMode}
                  onChange={(val) => {
                    setDarkMode(val);
                    const nextTheme = val ? "dark" : "light";
                    document.documentElement.setAttribute("data-theme", nextTheme);
                    localStorage.setItem("theme", nextTheme);
                    window.dispatchEvent(new Event("themechange"));
                  }}
                />
              </div>


              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>Accent Palette Preset</span>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  {(["green", "red", "blue", "orange"] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleAccentChange(color)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.55rem 1.1rem",
                        borderRadius: "99px",
                        border: activeAccent === color ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
                        background: activeAccent === color ? "var(--accent-light)" : "var(--bg)",
                        color: "var(--text-primary)",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: color === "green" ? "#2E7D32" : color === "red" ? "#C62828" : color === "blue" ? "#1565C0" : "#E65100",
                        }}
                      />
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card stack" style={{ gap: "1rem", borderLeft: "4px solid #2E7D32" }}>
              <h2>Live Theme Preview</h2>
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "12px",
                  background: "var(--accent-light)",
                  border: "1px solid var(--accent-glow)",
                }}
              >
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--accent-primary)" }}>Preview Badge</span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0.2rem 0", color: "var(--accent-primary)" }}>
                  {systemName}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
                  Active Accent: <strong style={{ textTransform: "capitalize" }}>{activeAccent}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: System & Infrastructure */}
        {activeTab === "system" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.75rem" }} className="detail-grid">
            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #7B1FA2" }}>
              <h2>Backend API Configuration & Diagnostics</h2>

              <label>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Backend API Base URL:
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    style={{ flex: 1, padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}
                  />
                  <button type="button" className="button-secondary" onClick={runHealthCheck} style={{ padding: "0.6rem 1rem" }}>
                    🔄 Test Ping
                  </button>
                </div>
              </label>

              <div
                style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  background: healthStatus === "online" ? "#E8F5E9" : healthStatus === "checking" ? "#FFF3E0" : "#FFEBEE",
                  border: `1px solid ${healthStatus === "online" ? "#A5D6A7" : healthStatus === "checking" ? "#FFE0B2" : "#EF9A9A"}`,
                  fontSize: "0.85rem",
                  color: healthStatus === "online" ? "#1B5E20" : healthStatus === "checking" ? "#E65100" : "#C62828",
                  fontWeight: 700,
                }}
              >
                {healthMessage}
              </div>
            </div>

            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #C62828" }}>
              <h2>System Maintenance Tools</h2>

              <button
                type="button"
                className="button-secondary"
                style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "8px", fontWeight: 700 }}
                onClick={handleResetDefaults}
              >
                🔄 Reset to Factory Defaults
              </button>
            </div>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="button-secondary"
            onClick={handleResetDefaults}
            style={{ padding: "0.65rem 1.25rem", borderRadius: "10px", fontWeight: 700 }}
          >
            Reset Defaults
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={saving}
            style={{
              padding: "0.65rem 1.5rem",
              borderRadius: "10px",
              fontWeight: 800,
              boxShadow: "0 4px 14px rgba(46, 125, 50, 0.25)",
            }}
          >
            {saving ? "Saving Changes..." : "💾 Save Settings Parameters"}
          </button>
        </div>
      </form>
    </div>
  );
}
