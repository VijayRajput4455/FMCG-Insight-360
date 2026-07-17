"use client";

import { usePathname } from "next/navigation";

export default function TopNav() {
  const pathname = usePathname();

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
              color: idx === breadcrumbs.length - 1 ? "var(--text-primary)" : "var(--text-secondary)"
            }}>
              {crumb}
            </span>
            {idx < breadcrumbs.length - 1 && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>&gt;</span>
            )}
          </span>
        ))}
      </div>

      {/* Right: Search, Notifications, Profile */}
      <div className="topnav-actions">
        {/* Command Search */}
        <div className="topnav-search-container">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input 
            type="text" 
            className="topnav-search-input" 
            placeholder="Search dashboard or records..." 
          />
        </div>

        {/* Notifications */}
        <button type="button" className="topnav-btn" aria-label="Notifications">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span className="topnav-badge" />
        </button>

        {/* Profile */}
        <div className="topnav-profile">
          <div className="topnav-profile-avatar">A</div>
          <div className="topnav-profile-info">
            <span className="topnav-profile-name">Admin Console</span>
            <span className="topnav-profile-role">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
