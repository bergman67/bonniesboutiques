import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import StoreFooter from '@/components/StoreFooter';
import ProductCard from '@/components/ProductCard';
import AddToCartButton from '@/components/AddToCartButton';
import Link from 'next/link';
import { getProductCategory, stripCategoryTag } from '@/lib/categories';

export const revalidate = 0;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

function findManifestProduct(id: string): Awaited<ReturnType<typeof prisma.product.findUnique>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest = require('@/lib/scrollytelling/productAssetManifest.json');
    const m = manifest?.products?.find((p: { id: string }) => p.id === id);
    if (m) {
      return {
        id: m.id,
        title: m.title,
        price: m.price ?? 8.0,
        imageUrl: m.transparentCloudUrl || m.transparentLocalUrl || m.originalUrl || null,
        description: m.description || null,
        isDraft: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  } catch {
    // fallback safe
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    let product: Awaited<ReturnType<typeof prisma.product.findUnique>> = null;
    let foundDraftInDb = false;
    try {
      product = await prisma.product.findUnique({ where: { id: params.id } });
      if (product?.isDraft) {
        foundDraftInDb = true;
      }
    } catch {
      // fallback to manifest below
    }

    if (!product && !foundDraftInDb) {
      product = findManifestProduct(params.id);
    }

    if (!product || product.isDraft) {
      return {
        title: "Product Not Found",
        robots: { index: false, follow: false },
      };
    }

    const category = getProductCategory(product.title, product.description);
    const cleanDesc =
      stripCategoryTag(product.description) ||
      `Handcrafted ${product.title} (${category}) made with love by Bonnie & Tammy at Bonnie's Boutique (B&T Trinkets). One-of-a-kind artisan keepsake.`;
    const priceStr = `$${(product.price ?? 8).toFixed(2)}`;
    const seoDescription = `${cleanDesc} — ${priceStr} at Bonnie's Boutique.`;
    const productUrl = `https://btboutiqe.com/products/${product.id}`;

    return {
      title: `${product.title} (${category})`,
      description: seoDescription.slice(0, 160),
      keywords: [
        product.title,
        category,
        "Bonnie's Boutique",
        'B&T Trinkets',
        'handmade gift',
        'handcrafted trinket',
      ],
      alternates: {
        canonical: productUrl,
      },
      openGraph: {
        title: `${product.title} · ${priceStr} | Bonnie's Boutique`,
        description: cleanDesc,
        url: productUrl,
        siteName: "Bonnie's Boutique (B&T Trinkets)",
        type: 'website',
        images: product.imageUrl
          ? [
              {
                url: product.imageUrl,
                width: 1024,
                height: 1024,
                alt: `${product.title} — Handcrafted ${category} by Bonnie's Boutique`,
              },
            ]
          : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.title} · ${priceStr} | Bonnie's Boutique`,
        description: cleanDesc,
        images: product.imageUrl ? [product.imageUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "Handcrafted Trinket | Bonnie's Boutique",
    };
  }
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  let product: Awaited<ReturnType<typeof prisma.product.findUnique>> = null;
  let dbQueryFailed = false;
  try {
    product = await prisma.product.findUnique({ where: { id: params.id } });
  } catch (error) {
    dbQueryFailed = true;
    console.error('Failed to load product:', error);
  }

  if (product?.isDraft) {
    notFound();
  }

  let isSoldOutArchive = false;
  if (!product) {
    product = findManifestProduct(params.id);
    if (product && !dbQueryFailed) {
      // Removed from active DB inventory by Admin -> render 1-of-1 Sold-Out Showcase (zero 404 bounce, zero accidental purchase)
      isSoldOutArchive = true;
    }
  }

  if (!product || product.isDraft) notFound();

  const category = getProductCategory(product.title, product.description);
  const cleanDescription =
    stripCategoryTag(product.description) ||
    'A unique, handcrafted trinket made with love by Bonnie & Tammy in Clearbrook, Virginia. Each piece is one-of-a-kind — no two are exactly alike. Perfect for accessorizing your keys, bag, desk, or home, or as a thoughtful gift.';
  const price = product.price ?? 8;
  const productUrl = `https://btboutiqe.com/products/${product.id}`;

  let related: Awaited<ReturnType<typeof prisma.product.findMany>> = [];
  try {
    const candidates = await prisma.product.findMany({
      where: { isDraft: false, id: { not: product.id } },
      take: 24,
      orderBy: { createdAt: 'desc' },
    });
    related = candidates
      .sort((a, b) => {
        const aSame = getProductCategory(a.title, a.description) === category ? 0 : 1;
        const bSame = getProductCategory(b.title, b.description) === category ? 0 : 1;
        return aSame - bSame;
      })
      .slice(0, 4);
  } catch (error) {
    console.error('Failed to load related products:', error);
  }

  if (related.length === 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const manifest = require('@/lib/scrollytelling/productAssetManifest.json');
      const fallbackPool = (manifest?.products || [])
        .filter((p: { id: string }) => p.id !== product.id)
        .sort((a: { title: string; description?: string }, b: { title: string; description?: string }) => {
          const aSame = getProductCategory(a.title, a.description || '') === category ? 0 : 1;
          const bSame = getProductCategory(b.title, b.description || '') === category ? 0 : 1;
          return aSame - bSame;
        })
        .slice(0, 4);
      related = fallbackPool.map(
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
      // safe fallback
    }
  }

  const currentYear = new Date().getFullYear();
  const priceValidUntil = `${currentYear + 1}-12-31`;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': `${productUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: "Bonnie's Boutique Shop",
            item: 'https://btboutiqe.com',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: category,
            item: `https://btboutiqe.com/?category=${encodeURIComponent(category)}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: product.title,
            item: productUrl,
          },
        ],
      },
      {
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        name: product.title,
        description: cleanDescription,
        image: product.imageUrl ? [product.imageUrl] : ['https://btboutiqe.com/bt_logo.jpg'],
        sku: product.id,
        category,
        brand: {
          '@type': 'Brand',
          name: "Bonnie's Boutique (B&T Trinkets)",
        },
        offers: {
          '@type': 'Offer',
          '@id': `${productUrl}#offer`,
          url: productUrl,
          priceCurrency: 'USD',
          price: price.toFixed(2),
          priceValidUntil,
          availability: isSoldOutArchive
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            '@id': 'https://btboutiqe.com/#store',
            name: "Bonnie's Boutique (B&T Trinkets)",
            url: 'https://btboutiqe.com',
          },
          shippingDetails: [
            {
              '@type': 'OfferShippingDetails',
              '@id': 'https://btboutiqe.com/#usps-ground-shipping',
              shippingRate: {
                '@type': 'MonetaryAmount',
                value: '4.99',
                currency: 'USD',
              },
              shippingDestination: {
                '@type': 'DefinedRegion',
                addressCountry: 'US',
              },
              deliveryTime: {
                '@type': 'ShippingDeliveryTime',
                handlingTime: {
                  '@type': 'QuantitativeValue',
                  minValue: 1,
                  maxValue: 2,
                  unitCode: 'DAY',
                },
                transitTime: {
                  '@type': 'QuantitativeValue',
                  minValue: 2,
                  maxValue: 5,
                  unitCode: 'DAY',
                },
              },
            },
          ],
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            '@id': 'https://btboutiqe.com/#merchant-return-policy',
            applicableCountry: 'US',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 14,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
            refundType: 'https://schema.org/FullRefund',
          },
        },
      },
    ],
  };

  return (
    <div className="min-h-screen" style={{ background: '#2d1b3d' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <Header />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <nav aria-label="Breadcrumb" className="text-xs flex items-center gap-2" style={{ color: 'rgba(245,239,230,0.4)' }}>
          <Link href="/" className="hover:text-[#e8748a] transition-colors">Shop</Link>
          <span>›</span>
          <Link
            href={`/?category=${encodeURIComponent(category)}`}
            className="hover:text-[#e8748a] transition-colors"
          >
            {category}
          </Link>
          <span>›</span>
          <span className="truncate max-w-[200px]" style={{ color: 'rgba(245,239,230,0.7)' }}>{product.title}</span>
        </nav>
      </div>

      {/* Product Detail */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">

          {/* Image */}
          <div className="sticky top-24">
            <div
              className="aspect-square rounded-2xl overflow-hidden relative flex items-center justify-center"
              style={{
                border: '1px solid rgba(232,116,138,0.3)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    product.imageUrl.includes('/transparent/') && !product.imageUrl.includes('?')
                      ? `${product.imageUrl}?v=5`
                      : product.imageUrl
                  }
                  alt={`${product.title} — Handcrafted ${category} by Bonnie's Boutique`}
                  className="w-full h-full object-contain p-3 sm:p-4"
                  style={{ filter: 'drop-shadow(0 16px 40px rgba(0,0,0,0.35))' }}
                />
              ) : (
                <div className="text-8xl">🔑</div>
              )}
              {/* Spotlight */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1/3 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at bottom center, rgba(196,139,122,0.15) 0%, transparent 70%)' }} />
            </div>

            {/* Share / Back */}
            <div className="flex gap-3 mt-4">
              <Link href="/" className="flex-1 text-center py-2.5 rounded-xl text-sm transition-all"
                style={{ background: 'rgba(61,37,82,0.5)', color: 'rgba(245,239,230,0.6)', border: '1px solid rgba(232,116,138,0.1)' }}>
                ← Back to Shop
              </Link>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full w-fit"
                style={{ background: 'rgba(232,116,138,0.12)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.25)' }}>
                ✦ {category}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full w-fit"
                style={{ background: 'rgba(61,37,82,0.5)', color: 'rgba(245,239,230,0.75)', border: '1px solid rgba(232,116,138,0.18)' }}>
                Handcrafted Original
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif leading-tight mb-3"
                style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>
                {product.title}
              </h1>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-bold" style={{ color: '#e8748a' }}>
                  ${price.toFixed(2)}
                </span>
                <span className="text-sm" style={{ color: 'rgba(245,239,230,0.6)' }}>
                  · Free US shipping $25+ · $3.99 shipping on $15+
                </span>
              </div>
              <p className="text-xs mt-2 font-medium" style={{ color: '#f9c74f' }}>
                🎁 Use code <strong>BONNIE10</strong> at checkout for 10% off your order!
              </p>
            </div>

            {/* Description */}
            <div className="py-5 border-y" style={{ borderColor: 'rgba(232,116,138,0.1)' }}>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(245,239,230,0.75)' }}>
                {cleanDescription}
              </p>
            </div>

            {/* Category-Specific Features & Craft Specifications */}
            <div className="space-y-2.5">
              {(category === 'Beaded Pens'
                ? [
                    {
                      icon: '🖊️',
                      text: 'Refillable 1.0mm smooth black ink — twist-off tip accepts standard pen refills',
                    },
                    {
                      icon: '🧼',
                      text: 'Wipe-clean silicone & artisan focal beads — ideal for teachers, nurses & busy desks',
                    },
                    {
                      icon: '💝',
                      text: 'Handcrafted one by one by Bonnie & Tammy in Clearbrook, Virginia',
                    },
                    {
                      icon: '📦',
                      text: 'Ships in 1–2 business days via tracked USPS Ground Advantage (2–5 day delivery)',
                    },
                  ]
                : [
                    {
                      icon: '🔑',
                      text: 'Durable clasp & split-ring hardware built for daily keys, lanyards & totes',
                    },
                    {
                      icon: '🧼',
                      text: 'Wipe-clean silicone & artisan focal beads that keep their vibrant color',
                    },
                    {
                      icon: '💝',
                      text: 'Handcrafted one by one by Bonnie & Tammy in Clearbrook, Virginia',
                    },
                    {
                      icon: '📦',
                      text: 'Ships in 1–2 business days via tracked USPS Ground Advantage (2–5 day delivery)',
                    },
                  ]
              ).map((f) => (
                <div key={f.text} className="flex items-start gap-3">
                  <span className="text-lg leading-snug">{f.icon}</span>
                  <span className="text-sm leading-snug" style={{ color: 'rgba(245,239,230,0.72)' }}>
                    {f.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Add to Cart or 1-of-1 Adopted Archive Notice */}
            {isSoldOutArchive ? (
              <div
                className="rounded-2xl p-5 space-y-3 text-center"
                style={{
                  background: 'rgba(249, 199, 79, 0.1)',
                  border: '1px solid rgba(249, 199, 79, 0.35)',
                }}
              >
                <p className="text-sm font-semibold text-amber-200">
                  ✨ This One-of-a-Kind Keepsake Has Found Its Home!
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.75)' }}>
                  Because Bonnie &amp; Tammy handcraft every piece individually, this exact creation has been adopted. Browse available handcrafted {category.toLowerCase()} ready to ship today:
                </p>
                <Link
                  href={`/?category=${encodeURIComponent(category)}#collections`}
                  className="inline-block w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                    color: 'white',
                  }}
                >
                  Shop Available {category} →
                </Link>
              </div>
            ) : (
              <AddToCartButton
                product={{ id: product.id, title: product.title, imageUrl: product.imageUrl, price }}
                trackViewContent
              />
            )}

            {/* Trust Badges & Buyer Guarantees */}
            <div
              className="rounded-xl p-3.5 space-y-2.5"
              style={{
                background: 'rgba(61, 37, 82, 0.35)',
                border: '1px solid rgba(232, 116, 138, 0.16)',
              }}
            >
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
                {[
                  '🔒 256-Bit SSL',
                  '💳 Stripe Checkout',
                  ' Apple Pay',
                  'G Pay',
                  '↩️ 14-Day Easy Returns',
                ].map((badge) => (
                  <span
                    key={badge}
                    className="px-2 py-1 rounded-md font-medium"
                    style={{
                      background: 'rgba(26, 15, 36, 0.65)',
                      color: 'rgba(245, 239, 230, 0.8)',
                      border: '1px solid rgba(232, 116, 138, 0.15)',
                    }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-center" style={{ color: 'rgba(245, 239, 230, 0.5)' }}>
                100% free replacement if damaged in transit ·{' '}
                <Link href="/shipping" className="text-[#e8748a] hover:underline">
                  Shipping Info
                </Link>{' '}
                ·{' '}
                <Link href="/returns" className="text-[#e8748a] hover:underline">
                  Return Policy
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-20 sm:mt-28">
            <div className="section-divider mb-12" />
            <div className="text-center mb-10">
              <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: '#e8748a' }}>✦ You Might Also Love ✦</p>
              <h2 className="text-2xl font-serif" style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>More Handcrafted Trinkets</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map(p => (
                <ProductCard key={p.id} product={{ id: p.id, title: p.title, imageUrl: p.imageUrl, price: p.price ?? 8, description: p.description }} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sticky Add to Cart Bar */}
      {!isSoldOutArchive && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 border-t flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md"
          style={{
            background: 'rgba(26, 15, 36, 0.95)',
            borderColor: 'rgba(232, 116, 138, 0.25)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-semibold truncate text-[#f5efe6]">{product.title}</p>
            <p className="text-xs font-bold text-[#e8748a]">${price.toFixed(2)}</p>
          </div>
          <div className="w-44 flex-shrink-0">
            <AddToCartButton
              product={{ id: product.id, title: product.title, imageUrl: product.imageUrl, price }}
              compact
            />
          </div>
        </div>
      )}

      <div className="pb-20 md:pb-0">
        <StoreFooter />
      </div>
    </div>
  );
}
