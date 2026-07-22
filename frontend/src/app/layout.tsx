import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "FMCG Insight Console",
  description: "Premium dashboard for automated product audits",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            try {
              const savedTheme = localStorage.getItem('theme') || 'light';
              document.documentElement.setAttribute('data-theme', savedTheme);
              
              const accent = localStorage.getItem('accent-theme') || 'green';
              const presets = {
                green: { primary: "#2E7D32", secondary: "#43A047", light: "#E8F5E9", glow: "rgba(46, 125, 50, 0.12)", shadow: "0 10px 30px rgba(46, 125, 50, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)", shadowSm: "0 4px 12px rgba(46, 125, 50, 0.02)" },
                red: { primary: "#C62828", secondary: "#D32F2F", light: "#FFEBEE", glow: "rgba(198, 40, 40, 0.12)", shadow: "0 10px 30px rgba(198, 40, 40, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)", shadowSm: "0 4px 12px rgba(198, 40, 40, 0.02)" },
                blue: { primary: "#1565C0", secondary: "#1976D2", light: "#E3F2FD", glow: "rgba(21, 101, 192, 0.12)", shadow: "0 10px 30px rgba(21, 101, 192, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)", shadowSm: "0 4px 12px rgba(21, 101, 192, 0.02)" },
                orange: { primary: "#E65100", secondary: "#F57C00", light: "#FFF3E0", glow: "rgba(230, 81, 0, 0.12)", shadow: "0 10px 30px rgba(230, 81, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)", shadowSm: "0 4px 12px rgba(230, 81, 0, 0.02)" }
              };
              const p = presets[accent] || presets.green;
              document.documentElement.style.setProperty("--accent-primary", p.primary);
              document.documentElement.style.setProperty("--accent-secondary", p.secondary);
              document.documentElement.style.setProperty("--accent-light", p.light);
              document.documentElement.style.setProperty("--accent-glow", p.glow);
              document.documentElement.style.setProperty("--shadow", p.shadow);
              document.documentElement.style.setProperty("--shadow-sm", p.shadowSm);
            } catch (e) {}
          })();
        `}} />
      </head>
      <body>
        <div className="layout-wrapper">
          <Sidebar />
          <div className="main-wrapper">
            <main className="main-content">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

