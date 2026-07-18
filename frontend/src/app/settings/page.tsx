"use client";

import { useState, useEffect } from "react";

type SettingsTab = "general" | "branding" | "users" | "roles" | "notifications" | "ai" | "system";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  
  // Toggles
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [saveFrames, setSaveFrames] = useState(true);

  // Form inputs
  const [systemName, setSystemName] = useState("FMCG Insight 360");
  const [companyName, setCompanyName] = useState("FMCG Global Ltd");
  const [timezone, setTimezone] = useState("UTC+5:30");
  const [language, setLanguage] = useState("en");
  const [themeColor, setThemeColor] = useState("#2E7D32");
  
  // AI thresholds
  const [confThreshold, setConfThreshold] = useState(0.25);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [imageSize, setImageSize] = useState("640");
  const [minPassRate, setMinPassRate] = useState(95);

  // System Queue
  const [rabbitmqHost, setRabbitmqHost] = useState("127.0.0.1");
  const [rabbitmqPort, setRabbitmqPort] = useState("5672");
  const [redisHost, setRedisHost] = useState("127.0.0.1");
  const [redisPort, setRedisPort] = useState("6379");
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [activeAccent, setActiveAccent] = useState<"green" | "red" | "blue" | "orange">("green");

  useEffect(() => {
    const syncChecked = () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      setDarkMode(isDark);
    };
    syncChecked();
    window.addEventListener("themechange", syncChecked);
    
    const syncAccent = () => {
      const savedAccent = localStorage.getItem("accent-theme") as any;
      if (savedAccent && ["green", "red", "blue", "orange"].includes(savedAccent)) {
        setActiveAccent(savedAccent);
      }
    };
    syncAccent();
    window.addEventListener("accentthemechange", syncAccent);

    return () => {
      window.removeEventListener("themechange", syncChecked);
      window.removeEventListener("accentthemechange", syncAccent);
    };
  }, []);

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
        shadowSm: "0 4px 12px rgba(46, 125, 50, 0.02)"
      },
      red: {
        primary: "#C62828",
        secondary: "#D32F2F",
        light: "#FFEBEE",
        glow: "rgba(198, 40, 40, 0.12)",
        shadow: "0 10px 30px rgba(198, 40, 40, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)",
        shadowSm: "0 4px 12px rgba(198, 40, 40, 0.02)"
      },
      blue: {
        primary: "#1565C0",
        secondary: "#1976D2",
        light: "#E3F2FD",
        glow: "rgba(21, 101, 192, 0.12)",
        shadow: "0 10px 30px rgba(21, 101, 192, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)",
        shadowSm: "0 4px 12px rgba(21, 101, 192, 0.02)"
      },
      orange: {
        primary: "#E65100",
        secondary: "#F57C00",
        light: "#FFF3E0",
        glow: "rgba(230, 81, 0, 0.12)",
        shadow: "0 10px 30px rgba(230, 81, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)",
        shadowSm: "0 4px 12px rgba(230, 81, 0, 0.02)"
      }
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 800);
  };

  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      {/* Large Hero Header Card */}
      <section className="card" style={{
        background: "linear-gradient(135deg, var(--accent-light) 0%, var(--bg) 100%)",
        border: "1px solid var(--accent-glow)",
        position: "relative",
        overflow: "hidden",
        padding: "2rem",
        borderLeft: "4px solid var(--accent-primary)"
      }}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-primary)" }}>Administration</span>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.25rem 0 0", color: "var(--accent-primary)" }}>Control Console Settings</h1>
          <div className="main-header-line" />
          <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: "1.5" }}>
            Modify system operational values, design parameters, and model thresholds.
          </p>
        </div>
      </section>

      {/* Modern Tabs Row */}
      <div className="settings-tabs" style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
        {([
          { key: "general", label: "General" },
          { key: "branding", label: "Branding" },
          { key: "users", label: "Users" },
          { key: "roles", label: "Roles" },
          { key: "notifications", label: "Notifications" },
          { key: "ai", label: "AI & Audit Rules" },
          { key: "system", label: "Infrastructure" }
        ] as { key: SettingsTab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`settings-tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "99px",
              background: activeTab === tab.key ? "var(--accent-light)" : "transparent",
              color: activeTab === tab.key ? "var(--accent-primary)" : "var(--text-secondary)",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              transition: "var(--transition)"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {saved && (
        <div className="success-box">
          Settings updated and saved successfully!
        </div>
      )}

      {/* Main Configurations Form */}
      <form onSubmit={handleSave}>
        
        {/* TAB 1: General Settings */}
        {activeTab === "general" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "2rem" }} className="detail-grid">
            {/* Left Card: Input form */}
            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #E53935" }}>
              <h2>General Setup</h2>
              <label>
                <span>Console Application Name</span>
                <input value={systemName} onChange={(e) => setSystemName(e.target.value)} required />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label>
                  <span>System Language</span>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                </label>
                <label>
                  <span>Time Zone</span>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="UTC">UTC (GMT)</option>
                    <option value="UTC+5:30">UTC+5:30 (IST)</option>
                    <option value="UTC-5:00">UTC-5:00 (EST)</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Right Card: Theme variables */}
            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #1E88E5" }}>
              <h2>Appearance Theme</h2>
              <p className="subtle">Toggle visual parameters to switch themes dynamically.</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1.25rem" }}>
                <span>Dark Color Theme</span>
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDarkMode(checked);
                    const nextTheme = checked ? "dark" : "light";
                    document.documentElement.setAttribute("data-theme", nextTheme);
                    localStorage.setItem("theme", nextTheme);
                    window.dispatchEvent(new Event("themechange"));
                  }}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
              </div>

              {/* Accent Color theme toggles */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>Accent Color Shading</span>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleAccentChange("green")}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.45rem 0.95rem", borderRadius: "99px",
                      border: activeAccent === "green" ? "2px solid #2E7D32" : "1px solid var(--border)",
                      background: activeAccent === "green" ? "#E8F5E9" : "var(--surface)",
                      color: "#2E7D32", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                      transition: "all 0.25s"
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2E7D32" }} />
                    Green
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccentChange("red")}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.45rem 0.95rem", borderRadius: "99px",
                      border: activeAccent === "red" ? "2px solid #C62828" : "1px solid var(--border)",
                      background: activeAccent === "red" ? "#FFEBEE" : "var(--surface)",
                      color: "#C62828", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                      transition: "all 0.25s"
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#C62828" }} />
                    Red
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccentChange("blue")}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.45rem 0.95rem", borderRadius: "99px",
                      border: activeAccent === "blue" ? "2px solid #1565C0" : "1px solid var(--border)",
                      background: activeAccent === "blue" ? "#E3F2FD" : "var(--surface)",
                      color: "#1565C0", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                      transition: "all 0.25s"
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#1565C0" }} />
                    Blue
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccentChange("orange")}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.45rem 0.95rem", borderRadius: "99px",
                      border: activeAccent === "orange" ? "2px solid #E65100" : "1px solid var(--border)",
                      background: activeAccent === "orange" ? "#FFF3E0" : "var(--surface)",
                      color: "#E65100", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                      transition: "all 0.25s"
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#E65100" }} />
                    Orange
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Branding Settings */}
        {activeTab === "branding" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }} className="detail-grid">
            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #E53935" }}>
              <h2>Console Identity</h2>
              <label>
                <span>Company Organization Name</span>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </label>

              <label>
                <span>Company Brand Color</span>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} style={{ padding: 0, width: "40px", height: "40px", border: "none", cursor: "pointer" }} />
                  <input type="text" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} />
                </div>
              </label>
            </div>

            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #1E88E5" }}>
              <h2>Company Logo Uploader</h2>
              <p className="subtle">Drop organization logo file (.PNG or .SVG format).</p>
              <div style={{ border: "2px dashed var(--border)", borderRadius: "12px", padding: "2rem", textAlign: "center", cursor: "pointer", background: "var(--bg)" }}>
                <svg style={{ width: "36px", height: "36px", color: "var(--border-focus)", opacity: 0.5, margin: "0 auto 0.5rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-primary)" }}>Upload Company Logo</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Users */}
        {activeTab === "users" && (
          <div className="card stack" style={{ gap: "1.5rem", borderLeft: "4px solid #43A047" }}>
            <div className="row-between" style={{ alignItems: "center" }}>
              <div>
                <h2>Active Operator Directory</h2>
                <p className="subtle">Manage console access and invite operational agents.</p>
              </div>
              <button type="button" className="small">+ Invite Operator</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Operator Name</th>
                    <th>Role Assigned</th>
                    <th>Current Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Admin Console</strong></td>
                    <td>Super Admin</td>
                    <td><span className="chip completed" style={{ fontSize: "0.7rem", fontWeight: 700 }}>Active</span></td>
                    <td style={{ textAlign: "right" }}><button type="button" className="small button-secondary" disabled>Suspend</button></td>
                  </tr>
                  <tr>
                    <td><strong>Operator-A</strong></td>
                    <td>Field Agent</td>
                    <td><span className="chip completed" style={{ fontSize: "0.7rem", fontWeight: 700 }}>Active</span></td>
                    <td style={{ textAlign: "right" }}><button type="button" className="small button-danger">Suspend</button></td>
                  </tr>
                  <tr>
                    <td><strong>Operator-B</strong></td>
                    <td>Senior Inspector</td>
                    <td><span className="chip failed" style={{ fontSize: "0.7rem", fontWeight: 700 }}>Suspended</span></td>
                    <td style={{ textAlign: "right" }}><button type="button" className="small button-secondary">Activate</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Roles */}
        {activeTab === "roles" && (
          <div className="card stack" style={{ gap: "1.5rem", borderLeft: "4px solid #FB8C00" }}>
            <h2>System Access Roles</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>System Role</th>
                    <th>Permissions Scope</th>
                    <th>User Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Super Admin</strong></td>
                    <td>Full access: database CRUD, model registry, broker config rules, system logs deletes.</td>
                    <td>1 User</td>
                  </tr>
                  <tr>
                    <td><strong>Senior Inspector</strong></td>
                    <td>Moderate access: catalog updates, audit runs, history reviews. Can configure neural thresholds.</td>
                    <td>2 Users</td>
                  </tr>
                  <tr>
                    <td><strong>Field Agent</strong></td>
                    <td>Limited access: execute scans and view audit details. Cannot update models or SKU codes.</td>
                    <td>4 Users</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: Notifications */}
        {activeTab === "notifications" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "2rem" }} className="detail-grid">
            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #E53935" }}>
              <h2>Alert Triggers</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>Email Alerts Reports</strong>
                    <span className="subtle" style={{ display: "block", fontSize: "0.75rem" }}>Weekly automated operational metrics report.</span>
                  </div>
                  <input type="checkbox" checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} style={{ width: "16px", height: "16px" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>SMS Critical Warnings</strong>
                    <span className="subtle" style={{ display: "block", fontSize: "0.75rem" }}>Direct notification on Celery worker broker dropouts.</span>
                  </div>
                  <input type="checkbox" checked={smsNotif} onChange={(e) => setSmsNotif(e.target.checked)} style={{ width: "16px", height: "16px" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>Sound Alert Indicators</strong>
                    <span className="subtle" style={{ display: "block", fontSize: "0.75rem" }}>Bleep warnings in console on YOLO coordinate fails.</span>
                  </div>
                  <input type="checkbox" checked={soundAlerts} onChange={(e) => setSoundAlerts(e.target.checked)} style={{ width: "16px", height: "16px" }} />
                </div>
              </div>
            </div>
            <div className="card stack" style={{ gap: "1rem", borderLeft: "4px solid #1E88E5" }}>
              <h2>Log Telemetry Toggles</h2>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>Auto Refresh Dashboard</strong>
                  <span className="subtle" style={{ display: "block", fontSize: "0.75rem" }}>Update charts queries every 10 seconds.</span>
                </div>
                <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} style={{ width: "16px", height: "16px" }} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AI & Audit Rules */}
        {activeTab === "ai" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "2rem" }} className="detail-grid">
            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #43A047" }}>
              <h2>Hyperparameter Defaults</h2>
              <label>
                <span>Default Image Scan Resolution</span>
                <select value={imageSize} onChange={(e) => setImageSize(e.target.value)}>
                  <option value="320">320 px (Fast inference)</option>
                  <option value="640">640 px (Recommended standard)</option>
                  <option value="1280">1280 px (High contrast precision)</option>
                </select>
              </label>

              <label>
                <span>Default Confidence Threshold (conf_thresh): {confThreshold}</span>
                <input type="range" min="0.05" max="0.95" step="0.05" value={confThreshold} onChange={(e) => setConfThreshold(Number(e.target.value))} style={{ width: "100%" }} />
              </label>

              <label>
                <span>Default IoU NMS Threshold (iou_thresh): {iouThreshold}</span>
                <input type="range" min="0.05" max="0.95" step="0.05" value={iouThreshold} onChange={(e) => setIouThreshold(Number(e.target.value))} style={{ width: "100%" }} />
              </label>
            </div>

            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #FB8C00" }}>
              <h2>Audit Quality Thresholds</h2>
              <label>
                <span>Minimum Compliance Pass Rate ({minPassRate}%)</span>
                <input type="range" min="80" max="100" step="1" value={minPassRate} onChange={(e) => setMinPassRate(Number(e.target.value))} style={{ width: "100%" }} />
              </label>
              <label>
                <span>Automated Scan Retries</span>
                <select>
                  <option value="1">1 Auto-retry on failures</option>
                  <option value="3">3 Auto-retries (Recommended)</option>
                  <option value="5">5 Auto-retries</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {/* TAB 7: System Infrastructure */}
        {activeTab === "system" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "2rem" }} className="detail-grid">
            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #E53935" }}>
              <h2>Infrastructure Workers</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem" }}>
                <label>
                  <span>RabbitMQ Broker IP</span>
                  <input value={rabbitmqHost} onChange={(e) => setRabbitmqHost(e.target.value)} />
                </label>
                <label>
                  <span>Broker Port</span>
                  <input value={rabbitmqPort} onChange={(e) => setRabbitmqPort(e.target.value)} />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem" }}>
                <label>
                  <span>Redis Caching IP</span>
                  <input value={redisHost} onChange={(e) => setRedisHost(e.target.value)} />
                </label>
                <label>
                  <span>Redis Port</span>
                  <input value={redisPort} onChange={(e) => setRedisPort(e.target.value)} />
                </label>
              </div>
            </div>

            <div className="card stack" style={{ gap: "1.25rem", borderLeft: "4px solid #1E88E5" }}>
              <h2>Scan File Archiving</h2>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>Save Bounding Frame Images</strong>
                  <span className="subtle" style={{ display: "block", fontSize: "0.72rem" }}>Save raw scans annotated by YOLO model.</span>
                </div>
                <input type="checkbox" checked={saveFrames} onChange={(e) => setSaveFrames(e.target.checked)} style={{ width: "16px", height: "16px" }} />
              </div>

              <label>
                <span>Automated Log Purging</span>
                <select>
                  <option value="30">After 30 days</option>
                  <option value="90">After 90 days</option>
                  <option value="365">After 1 year</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {/* Save button panel */}
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
          <button type="submit" disabled={saving}>
            {saving ? "Updating console parameters..." : "Save Configuration Parameters"}
          </button>
        </div>

      </form>
    </div>
  );
}
