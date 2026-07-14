"use client";

import { useState } from "react";

type SettingsTab = "general" | "system" | "notifications" | "users" | "integrations";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  
  // Toggles
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);

  // Form inputs
  const [systemName, setSystemName] = useState("FMCG Insight 360");
  const [timezone, setTimezone] = useState("UTC+5:30");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [itemsPerPage, setItemsPerPage] = useState("10");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      <header className="hero">
        <h1>Settings</h1>
        <p>Configure system parameters and user preferences.</p>
      </header>

      {/* Tabs */}
      <div className="settings-tabs">
        {(["general", "system", "notifications", "users", "integrations"] as SettingsTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`settings-tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {saved && (
        <div className="success-box">
          Settings saved successfully!
        </div>
      )}

      {activeTab === "general" ? (
        <form onSubmit={handleSave} className="card stack" style={{ gap: "1.5rem" }}>
          <h2>General Configurations</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "2.5rem" }} className="detail-grid">
            
            {/* System Form */}
            <div className="stack" style={{ gap: "1.25rem" }}>
              <h3>System Settings</h3>
              
              <label>
                System Name
                <input 
                  value={systemName} 
                  onChange={(e) => setSystemName(e.target.value)} 
                  required 
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label>
                  Time Zone
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="UTC">UTC (GMT)</option>
                    <option value="UTC+5:30">UTC+5:30 (IST)</option>
                    <option value="UTC-5:00">UTC-5:00 (EST)</option>
                    <option value="UTC+1:00">UTC+1:00 (CET)</option>
                  </select>
                </label>

                <label>
                  Date Format
                  <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </label>
              </div>

              <label>
                Logs Per Page
                <select value={itemsPerPage} onChange={(e) => setItemsPerPage(e.target.value)}>
                  <option value="10">10 items</option>
                  <option value="25">25 items</option>
                  <option value="50">50 items</option>
                  <option value="100">100 items</option>
                </select>
              </label>
            </div>

            {/* Toggles list (Matches Screen 9) */}
            <div className="stack" style={{ gap: "1rem" }}>
              <h3>Preferences</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Auto Refresh Logs</span>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Email Notifications</span>
                  <input
                    type="checkbox"
                    checked={emailNotif}
                    onChange={(e) => setEmailNotif(e.target.checked)}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Dark Mode</span>
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Sound Alerts</span>
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                </div>
              </div>
            </div>

          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem", display: "flex", gap: "0.5rem" }}>
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      ) : (
        <div className="card">
          <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Configurations</h2>
          <p className="subtle" style={{ marginTop: "1rem" }}>This settings pane is ready for system integrations or user parameters mapping.</p>
        </div>
      )}
    </div>
  );
}
