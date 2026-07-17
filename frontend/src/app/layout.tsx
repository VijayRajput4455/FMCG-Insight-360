import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
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
              const savedTheme = localStorage.getItem('theme') || 'dark';
              document.documentElement.setAttribute('data-theme', savedTheme);
            } catch (e) {}
          })();
        `}} />
      </head>
      <body>
        <div className="layout-wrapper">
          <Sidebar />
          <div className="main-wrapper">
            <TopNav />
            <main className="main-content">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
