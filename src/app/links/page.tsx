import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import StoreFooter from '@/components/StoreFooter';
import AddToCartButton from '@/components/AddToCartButton';
import ClaimPromoButton from '@/components/ClaimPromoButton';
import { getProductCategory } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Featured Links & Video Showcase Picks | Bonnie's Boutique",
  description:
    "Quick-shop Bonnie & Tammy's handcrafted beaded pens, teacher & nurse gifts, 3-pen free shipping bundles, and claim 10% off with code BONNIE10.",
  alternates: {
    canonical: 'https://btboutiqe.com/links',
  },
};

export default async function LinksHubPage() {
  let products: Awaited<ReturnType<typeof prisma.product.findMany>> = [];
  try {
    products = await prisma.product.findMany({
      where: { isDraft: false },
      orderBy: { createdAt: 'desc' },
      take: 48,
    });
  } catch {
    // Fallback below
  }

  if (products.length === 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const manifest = require('@/lib/scrollytelling/productAssetManifest.json');
      products = (manifest?.products || []).slice(0, 24).map(
        (m: {
          id: string;
          title: string;
          price?: number;
          transparentCloudUrl?: string;
          transparentLocalUrl?: string;
          originalUrl?: string;
          description?: string;
        }) => ({
          id: m.id,
          title: m.title,
          price: m.price ?? 8.0,
          imageUrl: m.transparentCloudUrl || m.transparentLocalUrl || m.originalUrl || null,
          description: m.description || null,
          isDraft: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
    } catch {
      // Safe fallback
    }
  }

  const beadedPens = products.filter(
    (p) => getProductCategory(p.title, p.description) === 'Beaded Pens'
  );
  const otherTrinkets = products.filter(
    (p) => getProductCategory(p.title, p.description) !== 'Beaded Pens'
  );
  const quickPicks = [...beadedPens.slice(0, 4), ...otherTrinkets.slice(0, 2)].slice(0, 6);

  const hubLinks = [
    {
      href: '/?category=Beaded%20Pens#collections',
      emoji: '🖊️',
      title: "Shop Today's Featured Beaded Pens ($8)",
      subtitle: 'Refillable 1.0mm smooth black ink · 40+ handmade styles',
      highlight: true,
    },
    {
      href: '/#bundles',
      emoji: '🎁',
      title: 'Build a 3-Pen Free Shipping Bundle',
      subtitle: '3 Handmade Pens + 3pk Ink Refills = Instant FREE US Shipping!',
      highlight: false,
    },
    {
      href: '/?category=Beaded%20Pens&q=pen#collections',
      emoji: '🍎',
      title: 'Teacher & Nurse Appreciation Pens',
      subtitle: 'Wipe-clean silicone & focal beads loved on busy desks',
      highlight: false,
    },
    {
      href: '/?category=Keychains#collections',
      emoji: '🔑',
      title: 'Handmade Keychains, Wristlets & Bookmarks',
      subtitle: 'One-of-a-kind keepsakes starting at $8',
      highlight: false,
    },
    {
      href: '/#collections',
      emoji: '💝',
      title: 'Browse All 140+ Handcrafted Keepsakes',
      subtitle: 'Made one by one by Bonnie & Tammy in Clearbrook, VA',
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#2d1b3d', color: '#f5efe6' }}>
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Profile Card */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-1.5 rounded-2xl border" style={{ borderColor: 'rgba(232, 116, 138, 0.35)', background: 'rgba(26, 15, 36, 0.7)' }}>
            <Image
              src="/bt_logo_sm.webp"
              alt="Bonnie's Boutique (B&T Trinkets)"
              width={72}
              height={72}
              unoptimized
              className="rounded-xl object-contain"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300 font-semibold">
              ✦ Seen on Trinket Tales ✦
            </p>
            <h1
              className="text-2xl sm:text-3xl font-serif mt-1"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Bonnie&apos;s Boutique <span className="text-[#e8748a]">(B&amp;T Trinkets)</span>
            </h1>
            <p className="text-xs sm:text-sm mt-1.5 max-w-md mx-auto" style={{ color: 'rgba(245, 239, 230, 0.72)' }}>
              Mother-daughter makers Bonnie &amp; Tammy · Handcrafted in Clearbrook, VA · Ships in 1–2 business days · Free US shipping $25+
            </p>
          </div>
        </div>

        {/* 1-Tap Promo Activator */}
        <ClaimPromoButton code="BONNIE10" />

        {/* 5 High-Intent Link Buttons */}
        <div className="space-y-3">
          {hubLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-center gap-3.5 p-4 rounded-2xl transition-all hover:translate-y-[-2px]"
              style={
                item.highlight
                  ? {
                      background: 'linear-gradient(135deg, rgba(232, 116, 138, 0.26), rgba(61, 37, 82, 0.85))',
                      border: '1px solid rgba(232, 116, 138, 0.5)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    }
                  : {
                      background: 'rgba(26, 15, 36, 0.72)',
                      border: '1px solid rgba(232, 116, 138, 0.2)',
                    }
              }
            >
              <span className="text-2xl flex-shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#f5efe6]">{item.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(245, 239, 230, 0.62)' }}>
                  {item.subtitle}
                </p>
              </div>
              <span className="text-[#e8748a] font-bold text-sm">→</span>
            </Link>
          ))}
        </div>

        {/* Instant 2-Tap Quick-Shop Grid */}
        {quickPicks.length > 0 && (
          <section className="pt-4 space-y-4">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-[#e8748a] font-semibold">
                ✦ Instant Quick-Shop ✦
              </p>
              <h2
                className="text-xl font-serif mt-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Add Straight to Your Bag
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {quickPicks.map((p) => {
                const price = p.price ?? 8.0;
                const imgSrc =
                  p.imageUrl && p.imageUrl.includes('/transparent/') && !p.imageUrl.includes('?')
                    ? `${p.imageUrl}?v=5`
                    : p.imageUrl;
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl p-3 flex flex-col justify-between gap-2.5"
                    style={{
                      background: 'rgba(26, 15, 36, 0.75)',
                      border: '1px solid rgba(232, 116, 138, 0.2)',
                    }}
                  >
                    <Link href={`/products/${p.id}`} className="block space-y-2">
                      <div
                        className="aspect-square rounded-xl overflow-hidden flex items-center justify-center p-2"
                        style={{ background: '#2d1b3d' }}
                      >
                        {imgSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgSrc}
                            alt={p.title}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-3xl">🖊️</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium line-clamp-2 text-[#f5efe6]">{p.title}</p>
                        <p className="text-sm font-bold text-[#e8748a] mt-0.5">${price.toFixed(2)}</p>
                      </div>
                    </Link>
                    <AddToCartButton
                      product={{
                        id: p.id,
                        title: p.title,
                        imageUrl: imgSrc,
                        price,
                      }}
                      compact
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Buyer Assurance Strip */}
        <div
          className="rounded-2xl p-4 text-center space-y-1.5 text-xs"
          style={{
            background: 'rgba(61, 37, 82, 0.35)',
            border: '1px solid rgba(232, 116, 138, 0.16)',
          }}
        >
          <p className="font-semibold text-[#f5efe6]">
            🔒 Apple Pay · Google Pay · Stripe Verified · 14-Day Returns
          </p>
          <p style={{ color: 'rgba(245, 239, 230, 0.6)' }}>
            100% free replacement if damaged in transit ·{' '}
            <Link href="/shipping" className="text-[#e8748a] underline">
              Shipping Policy
            </Link>{' '}
            ·{' '}
            <Link href="/returns" className="text-[#e8748a] underline">
              Returns
            </Link>
          </p>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
