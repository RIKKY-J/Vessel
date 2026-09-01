import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloud REPL - In-browser IDE",
  description: "Next-gen cloud-based interactive code execution environment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d1117] text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
