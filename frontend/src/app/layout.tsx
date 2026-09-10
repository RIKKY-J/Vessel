import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vessel - Cloud IDE",
  description: "Spin up isolated Kubernetes development sandboxes with real-time Monaco editor, bash terminal, and live preview.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#092328] text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
