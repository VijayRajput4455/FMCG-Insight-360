"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

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

const applyAccent = (accent: "green" | "red" | "blue" | "orange") => {
  const p = presets[accent] || presets.green;
  document.documentElement.style.setProperty("--accent-primary", p.primary);
  document.documentElement.style.setProperty("--accent-secondary", p.secondary);
  document.documentElement.style.setProperty("--accent-light", p.light);
  document.documentElement.style.setProperty("--accent-glow", p.glow);
  document.documentElement.style.setProperty("--shadow", p.shadow);
  document.documentElement.style.setProperty("--shadow-sm", p.shadowSm);
};

export default function TopNav() {
  const pathname = usePathname();
  const [activeAccent, setActiveAccent] = useState<"green" | "red" | "blue" | "orange">("green");

  useEffect(() => {
    const syncAccent = () => {
      const savedAccent = localStorage.getItem("accent-theme") as any;
      if (savedAccent && ["green", "red", "blue", "orange"].includes(savedAccent)) {
        setActiveAccent(savedAccent);
        applyAccent(savedAccent);
      }
    };
    syncAccent();
    window.addEventListener("accentthemechange", syncAccent);
    return () => {
      window.removeEventListener("accentthemechange", syncAccent);
    };
  }, []);

  // Dynamic Breadcrumbs
  const getBreadcrumbs = () => {
    if (pathname === "/") return ["Console", "New Audit"];
    const segments = pathname.split("/").filter(Boolean);
    return [
      "Console",
      ...segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace("-", " "))
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="topnav">
      {/* Left: Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ 
              fontWeight: idx === breadcrumbs.length - 1 ? 600 : 500,
              color: idx === breadcrumbs.length - 1 ? "var(--accent-primary)" : "var(--text-secondary)"
            }}>
              {crumb}
            </span>
            {idx < breadcrumbs.length - 1 && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>&gt;</span>
            )}
          </span>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="topnav-actions">
        {/* Command Search */}
        <div className="topnav-search-container">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input 
            type="text" 
            className="topnav-search-input" 
            placeholder="Search anything..." 
          />
          <kbd style={{
            fontSize: "0.68rem",
            color: "var(--text-secondary)",
            background: "rgba(0,0,0,0.03)",
            border: "1px solid var(--border)",
            padding: "0.15rem 0.35rem",
            borderRadius: "6px",
            fontWeight: 700,
            fontFamily: "var(--font-sans)",
            opacity: 0.8,
            cursor: "default",
            userSelect: "none"
          }}>⌘ K</kbd>
        </div>

        {/* Notifications */}
        <button type="button" className="topnav-btn" aria-label="Notifications">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span className="topnav-badge">5</span>
        </button>

        {/* Profile */}
        <div className="topnav-profile" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div className="topnav-profile-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80" 
              alt="Profile Avatar" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          </div>
          <div className="topnav-profile-info">
            <span className="topnav-profile-name">Admin User</span>
            <span className="topnav-profile-role">Administrator</span>
          </div>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="var(--text-secondary)" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ marginLeft: "0.15rem", opacity: 0.7 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </header>
  );
}
