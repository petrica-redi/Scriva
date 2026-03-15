import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Scriva",
    template: "%s — Scriva",
  },
  description: "Clinical AI for European Healthcare — real-time transcription, diagnostic guidance, and intelligent documentation",
  metadataBase: new URL("https://scriva.doctor"),
  openGraph: {
    title: "Scriva — Clinical AI for European Healthcare",
    description: "Real-time transcription, diagnostic guidance, and intelligent documentation for clinicians",
    siteName: "Scriva",
    locale: "en_EU",
    type: "website",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
  themeColor: "#0d1b2a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Scriva",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans bg-medical-bg text-medical-text antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
