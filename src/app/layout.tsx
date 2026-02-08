import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";

const inter = Inter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Google Fonts URL for all editor font families
const EDITOR_FONTS_URL =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Space+Mono:wght@400;700",
    "family=Inconsolata:wght@400;700",
    "family=Roboto+Mono:wght@400;700",
    "family=IBM+Plex+Mono:wght@400;500;700",
    "family=Inter:wght@400;600;700",
    "family=Roboto:wght@400;700",
    "family=Fira+Sans:wght@400;600;700",
    "family=Lato:wght@400;700",
    "family=Karla:wght@400;700",
    "family=Libre+Baskerville:wght@400;700",
    "family=Manrope:wght@400;600;700",
    "family=Merriweather:wght@400;700",
    "family=Neuton:wght@400;700",
    "family=Cardo:wght@400;700",
  ].join("&") +
  "&display=swap";

export const metadata: Metadata = {
  title: "Kitaab",
  description: "Privacy-first, local-first markdown editor with real-time writing analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={EDITOR_FONTS_URL} rel="stylesheet" />
        {/* Cloudflare Web Analytics */}
        <Script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "50e0b52f5a474c81863041630e53e753"}'
        />
      </head>
      <body
        className={`${inter.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
