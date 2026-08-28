import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "4G 吃到飽 — SERP Entity Dashboard",
  description: "Clustered SERP entity analysis for 4G 吃到飽, backed by Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
