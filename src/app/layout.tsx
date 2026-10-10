import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Chatbot from "@/components/ui/Chatbot";

// Self-hosted variable fonts (no third-party font requests). next/font preloads them and
// generates a size-adjusted fallback so the swap does not shift the layout.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
const grotesk = localFont({
  src: "./fonts/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-grotesk",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MS Dashboard by iSN | Data dashboards for Mystery Shopping companies",
  description:
    "One simple dashboard to organize, analyze, and report your MS project data. Built by iSN. Built for Mystery Shopping.",
  applicationName: "MS Dashboard",
  authors: [{ name: "iSN" }],
  openGraph: {
    title: "MS Dashboard by iSN",
    description: "Turn Your MS Data Into Clear Insights.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6efe6",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="min-h-screen font-sans text-text antialiased">
        <noscript>
          <style>{`.rw{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
