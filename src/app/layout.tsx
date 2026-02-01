import type { Metadata } from "next";
import { Lato, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const lato = Lato({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Kitaab",
  description: "Privacy-first, local-first markdown editor with real-time writing analysis",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${lato.variable} ${ibmPlexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
