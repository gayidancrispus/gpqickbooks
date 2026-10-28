import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "fumadocs-ui/style.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://goodisonparkproperties.com";

export const metadata: Metadata = {
  title: {
    default: "Goodison Park Properties · Accounting, ERP & Business Management",
    template: "%s · Goodison Park Properties",
  },
  description:
    "Modern property management and double-entry accounting with invoicing, bills, payroll, inventory, projects, and CRM. API-first, MCP-ready.",
  metadataBase: new URL(APP_URL),
  keywords: [
    "property management",
    "double-entry bookkeeping",
    "invoicing software",
    "accounts payable",
    "accounts receivable",
    "general ledger",
    "ERP",
    "payroll software",
    "inventory management",
    "project management",
    "CRM",
    "API-first accounting",
    "business management",
  ],
  authors: [{ name: "Goodison Park Properties", url: APP_URL }],
  creator: "Goodison Park Properties",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "Goodison Park Properties",
    title: "Goodison Park Properties · Accounting & Business Management",
    description:
      "Modern property management and double-entry accounting with invoicing, bills, payroll, inventory, projects, and CRM.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Goodison Park Properties - Business Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Goodison Park Properties · Accounting & Business Management",
    description:
      "Modern property management and double-entry accounting with invoicing, bills, payroll, inventory, projects, and CRM.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Goodison Park Properties - Business Management Platform",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.svg",
    apple: "/web-app-manifest-192x192.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Goodison Park Properties" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <RootProvider>
            <SessionProvider>{children}</SessionProvider>
          </RootProvider>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
