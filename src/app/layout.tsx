import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";

export const metadata: Metadata = {
  metadataBase: new URL('https://btboutiqe.com'),
  title: "B&T Trinkets | Handcrafted Keychains & Trinkets",
  description: "Discover unique, handmade keychains and trinkets crafted with love by Bonnie & Tammy. Each piece is one-of-a-kind, perfect for gifts or treating yourself.",
  openGraph: {
    title: "B&T Trinkets | Bonnie & Tammy's Handcrafted Boutique",
    description: "Step inside our enchanted storefront and explore unique, one-of-a-kind handmade keychains and trinkets crafted with generational heart.",
    url: "https://btboutiqe.com",
    siteName: "B&T Trinkets",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "B&T Trinkets | Bonnie & Tammy's Handcrafted Boutique",
    description: "Step inside our enchanted storefront and explore unique, one-of-a-kind handmade keychains and trinkets.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
      </head>
      <body className="antialiased">
        <CartProvider>
          <CartDrawer />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
