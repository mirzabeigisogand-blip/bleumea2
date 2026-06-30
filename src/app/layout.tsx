import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const SITE_URL = "https://preview.space-z.ai";
const SITE_NAME = "بلومیا — کتابخانهٔ شعر و ترانه";
const SITE_DESCRIPTION =
  "کتابخانهٔ هوشمند شعر و ترانه‌های جهانی با ترجمهٔ شعری فارسی. اشعار رومی، فروست، هوگو، ریلکه، پوشکین، باشو، لی‌بای، فروغ فرخزاد و ده‌ها شاعر دیگر — همگی با ترجمهٔ فارسی.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: "%s | بلومیا",
  },
  description: SITE_DESCRIPTION,
  applicationName: "بلومیا",
  keywords: [
    "شعر فارسی",
    "ترانه",
    "ترجمه شعر",
    "کتابخانه شعر",
    "اشعار جهانی",
    "رومی",
    "فروست",
    "هوگو",
    "فروغ فرخزاد",
    "پوشکین",
    "هایکو",
    "شعر عاشقانه",
    "ترجمه فارسی",
    "poetry",
    "persian poetry",
    "poetry translation",
  ],
  authors: [{ name: "بلومیا" }],
  creator: "بلومیا",
  publisher: "بلومیا",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "بلومیا — کتابخانهٔ شعر و ترانه",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  category: "literature",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#064e3b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* JSON-LD structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "بلومیا",
              alternateName: "BLEUMEA",
              description: SITE_DESCRIPTION,
              url: SITE_URL,
              inLanguage: "fa-IR",
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${vazirmatn.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-vazirmatn), sans-serif" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
