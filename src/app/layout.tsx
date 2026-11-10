import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";
import AnalyticsPixels from "@/components/AnalyticsPixels";
import WelcomeOfferWidget from "@/components/WelcomeOfferWidget";

export const metadata: Metadata = {
  metadataBase: new URL('https://btboutiqe.com'),
  title: {
    default: "Bonnie's Boutique | Handmade Beaded Pens, Keychains & Gifts",
    template: "%s | Bonnie's Boutique (B&T Trinkets)",
  },
  description:
    "Shop 140+ one-of-a-kind handmade beaded pens, keychains, bag charms, bookmarks, framed diamond art, and beaded bracelets crafted with generational love by Bonnie & Tammy.",
  keywords: [
    "Bonnie's Boutique",
    "B&T Trinkets",
    "btboutiqe",
    "handmade beaded pens",
    "custom beaded keychains",
    "beaded bag charms",
    "handmade bookmark charms",
    "framed diamond art",
    "diamond art paintings",
    "beaded bracelets",
    "silicone bead wristlets",
    "handcrafted gifts under $10",
    "teacher appreciation gifts",
    "nurse beaded pens",
    "unique stocking stuffers",
    "personalized gift ideas",
    "artisan beaded jewelry",
    "Bonnie and Tammy boutique",
  ],
  authors: [{ name: "Bonnie & Tammy — B&T Trinkets", url: "https://btboutiqe.com" }],
  creator: "Bonnie & Tammy (B&T Trinkets)",
  publisher: "Bonnie's Boutique",
  category: "shopping",
  alternates: {
    canonical: "https://btboutiqe.com",
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
    icon: [
      { url: "/favicon.ico" },
      { url: "/bt_logo.jpg", type: "image/jpeg" },
    ],
    apple: [{ url: "/bt_logo.jpg", type: "image/jpeg" }],
  },
  openGraph: {
    title: "Bonnie's Boutique | Handmade Beaded Pens, Keychains & Gifts",
    description:
      "Step inside Bonnie & Tammy's enchanted storefront and explore 140+ one-of-a-kind handmade beaded pens, keychains, bookmarks, framed diamond art, and bracelets. Free US shipping over $25!",
    url: "https://btboutiqe.com",
    siteName: "Bonnie's Boutique (B&T Trinkets)",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: 'https://btboutiqe.com/opengraph-image.jpg',
        width: 1200,
        height: 630,
        alt: "Bonnie's Boutique Handmade Keepsakes",
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bonnie's Boutique | Handmade Beaded Pens, Keychains & Gifts",
    description:
      "Explore 140+ unique handmade beaded pens, keychains, bag charms, framed diamond art, and bracelets crafted with love by Bonnie & Tammy. Free US shipping over $25!",
    site: "@btboutiqe",
    creator: "@btboutiqe",
    images: ["https://btboutiqe.com/opengraph-image.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2d1b3d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap"
        />
      </head>
      <body className="antialiased">
        <CartProvider>
          <AnalyticsPixels />
          <CartDrawer />
          {children}
          <WelcomeOfferWidget />
        </CartProvider>
      </body>
    </html>
  );
}
