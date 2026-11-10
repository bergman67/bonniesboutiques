import nextDynamic from 'next/dynamic';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import StoreFooter from '@/components/StoreFooter';
import ProductCatalog from '@/components/ProductCatalog';
import GiftBundlesSection from '@/components/GiftBundlesSection';
import { getProductCategory, stripCategoryTag } from '@/lib/categories';

const ScrollytellingExperience = nextDynamic(
  () => import('@/components/scrollytelling/ScrollytellingExperience'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0f24]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-cream-100/60 tracking-widest uppercase">
            Loading Boutique Experience...
          </p>
        </div>
      </div>
    ),
  }
);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  let products: Awaited<ReturnType<typeof prisma.product.findMany>> = [];
  try {
    products = await prisma.product.findMany({
      where: { isDraft: false },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Failed to load products for homepage:', error);
  }

  // Resilient fallback to productAssetManifest if database returns 0 products
  if (products.length === 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const manifest = require('@/lib/scrollytelling/productAssetManifest.json');
      if (manifest?.products?.length) {
        products = manifest.products.map((p: {
          id: string;
          title: string;
          price?: number | null;
          transparentLocalUrl?: string;
          transparentCloudUrl?: string;
          transparentUrl?: string;
          originalUrl?: string;
          description?: string | null;
        }) => ({
          id: p.id,
          title: p.title,
          price: p.price ?? 8.0,
          imageUrl: p.transparentLocalUrl || p.transparentCloudUrl || p.transparentUrl || p.originalUrl || null,
          description: p.description || null,
          isDraft: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      }
    } catch {
      // fallback safe
    }
  }

  products = products.map((p) => ({
    ...p,
    imageUrl:
      p.imageUrl &&
      p.imageUrl.includes('/transparent/') &&
      !p.imageUrl.includes('?')
        ? `${p.imageUrl}?v=5`
        : p.imageUrl,
  }));

  const scrollyProducts = products.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price ?? 8.0,
    imageUrl: p.imageUrl,
    description: p.description,
  }));

  const bundlePens = products
    .filter((p) => getProductCategory(p.title, p.description) === 'Beaded Pens')
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price ?? 8.0,
      imageUrl: p.imageUrl,
    }));

  const bundleKeychains = products
    .filter((p) => getProductCategory(p.title, p.description) === 'Keychains')
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price ?? 8.0,
      imageUrl: p.imageUrl,
    }));

  const faqItems = [
    {
      question: "What handmade items does Bonnie's Boutique (B&T Trinkets) create?",
      answer:
        "Bonnie's Boutique (B&T Trinkets) creates one-of-a-kind handcrafted beaded pens, custom beaded keychains and bag charms, metal bookmark charms, framed diamond art portraits, and stretch beaded bracelets and wristlets.",
    },
    {
      question: 'Are all products at btboutiqe.com 100% handmade?',
      answer:
        'Yes! Every piece is lovingly designed and assembled by hand by mother-daughter duo Bonnie and Tammy in Clearbrook, Virginia. Because each piece is crafted one by one, every item is a unique keepsake.',
    },
    {
      question: 'How much does shipping cost and how quickly do orders ship?',
      answer:
        'Orders ship quickly from Virginia via USPS Ground Advantage with full tracking, and orders over $25 qualify for free shipping across the United States.',
    },
    {
      question: 'Do your beaded pens, keychains, and framed diamond art make good gifts?',
      answer:
        'Absolutely! Our handcrafted beaded pens, initial monogram bag charms, bookmark charms, and framed diamond art paintings are carefully packaged and ready for gifting to teachers, readers, coworkers, and loved ones.',
    },
  ];

  const currentYear = new Date().getFullYear();
  const priceValidUntil = `${currentYear + 1}-12-31`;

  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'OnlineStore',
        '@id': 'https://btboutiqe.com/#store',
        name: "Bonnie's Boutique (B&T Trinkets)",
        alternateName: ['B&T Trinkets', 'Bonnie Boutiqe', 'btboutiqe.com'],
        url: 'https://btboutiqe.com',
        logo: 'https://btboutiqe.com/bt_logo.jpg',
        image: 'https://btboutiqe.com/bt_logo.jpg',
        description:
          'Family-run handcrafted boutique by mother Bonnie and daughter Tammy offering 140+ one-of-a-kind beaded pens, keychains, bag charms, bookmarks, framed diamond art, and beaded bracelets.',
        priceRange: '$2 - $25',
        currenciesAccepted: 'USD',
        paymentAccepted: 'Credit Card, Apple Pay, Google Pay, Stripe',
        founder: [
          { '@type': 'Person', name: 'Bonnie' },
          { '@type': 'Person', name: 'Tammy' },
        ],
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Clearbrook',
          addressRegion: 'VA',
          postalCode: '22624',
          addressCountry: 'US',
        },
        sameAs: [
          'https://www.youtube.com/@btboutiqe',
          'https://www.instagram.com/btboutiqevids/',
          'https://www.tiktok.com/@bt.boutiqe',
          'https://www.facebook.com/share/1CdJpCaKxC/?mibextid=wwXIfr',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://btboutiqe.com/#website',
        url: 'https://btboutiqe.com',
        name: "Bonnie's Boutique (B&T Trinkets)",
        publisher: { '@id': 'https://btboutiqe.com/#store' },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://btboutiqe.com/?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'ItemList',
        '@id': 'https://btboutiqe.com/#catalog',
        name: "Bonnie's Boutique Handcrafted Collection",
        numberOfItems: products.length,
        itemListElement: products.slice(0, 24).map((p, idx) => {
          const cat = getProductCategory(p.title, p.description);
          return {
            '@type': 'ListItem',
            position: idx + 1,
            item: {
              '@type': 'Product',
              '@id': `https://btboutiqe.com/products/${p.id}#product`,
              url: `https://btboutiqe.com/products/${p.id}`,
              name: p.title,
              category: cat,
              sku: p.id,
              image: p.imageUrl ? [p.imageUrl] : ['https://btboutiqe.com/bt_logo.jpg'],
              description:
                stripCategoryTag(p.description) ||
                `Handcrafted ${p.title} (${cat}) by Bonnie & Tammy at Bonnie's Boutique.`,
              brand: {
                '@type': 'Brand',
                name: "Bonnie's Boutique (B&T Trinkets)",
              },
              offers: {
                '@type': 'Offer',
                '@id': `https://btboutiqe.com/products/${p.id}#offer`,
                url: `https://btboutiqe.com/products/${p.id}`,
                priceCurrency: 'USD',
                price: (p.price ?? 8.0).toFixed(2),
                priceValidUntil,
                availability: 'https://schema.org/InStock',
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
          };
        }),
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://btboutiqe.com/#faq-schema',
        mainEntity: faqItems.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen" style={{ background: '#2d1b3d' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <Header />

      {/* SSR Semantic H1 for Search Crawlers while Scrollytelling Canvas Hydrates */}
      <h1 className="sr-only">
        Bonnie&apos;s Boutique (B&amp;T Trinkets) — Handcrafted Beaded Pens, Keychains, Charms, Bookmarks, Framed Diamond Art &amp; Accessories
      </h1>

      {/* ── 3D SCROLLYTELLING JOURNEY ──────────────── */}
      <ScrollytellingExperience products={scrollyProducts} />

      <div className="section-divider mx-6 md:mx-24" />

      {/* ── TRUST BAR (4 BADGES) ─────────────────────────────── */}
      <div className="py-6 sm:py-8 px-6" style={{ background: 'rgba(26, 15, 36, 0.4)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
          {[
            { icon: '🎨', label: 'Handcrafted in Virginia', sub: 'Made with love by Bonnie & Tammy' },
            { icon: '💝', label: '1-of-1 Unique Keepsakes', sub: 'No two are ever exactly alike' },
            { icon: '📦', label: 'Free US Shipping Over $25', sub: '$3.99 subsidized rate on $15+ carts' },
            { icon: '🔒', label: 'Secure 256-Bit SSL Checkout', sub: 'Stripe, Apple Pay & Google Pay' },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-1.5 p-2">
              <span className="text-2xl sm:text-3xl">{item.icon}</span>
              <span className="font-semibold text-xs sm:text-sm" style={{ color: '#e8748a' }}>{item.label}</span>
              <span className="text-[11px] sm:text-xs" style={{ color: 'rgba(245, 239, 230, 0.55)' }}>{item.sub}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider mx-6 md:mx-24" />

      {/* ── CURATED 1-CLICK GIFT & FREE-SHIPPING BUNDLES ─────── */}
      <GiftBundlesSection pens={bundlePens} keychains={bundleKeychains} />

      {/* ── PRODUCT GRID / CATALOG ───────────────────────────── */}
      <section id="collections" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <ProductCatalog products={products} />
      </section>

      <div className="section-divider mx-6 md:mx-24" />

      {/* ── CUSTOMER PRAISE / REVIEWS SHOWCASE ─────────────────── */}
      <section
        id="reviews"
        aria-labelledby="reviews-heading"
        className="py-14 sm:py-18 px-6"
        style={{ background: 'rgba(26, 15, 36, 0.35)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-xs tracking-[0.3em] uppercase mb-3 text-amber-300 font-semibold">
              ✦ Cherished Keepsakes · 5-Star Praise ✦
            </p>
            <h2
              id="reviews-heading"
              className="text-2xl sm:text-3xl font-serif"
              style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}
            >
              Loved by Gift-Givers &amp; Trinket Collectors
            </h2>
            <p className="text-xs sm:text-sm mt-2 max-w-xl mx-auto" style={{ color: 'rgba(245, 239, 230, 0.65)' }}>
              Real praise from customers who gifted or collected Bonnie &amp; Tammy&apos;s handcrafted creations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                stars: 5,
                title: 'Perfect Teacher Appreciation Gifts!',
                quote:
                  'I ordered three beaded pens for my kids\' teachers and they were an instant hit! The weight in hand feels so solid, and the bead combinations are breathtaking. Each teacher felt so special knowing their pen was 1-of-1 handmade.',
                author: 'Sarah M.',
                location: 'Richmond, VA',
                verified: 'Verified Buyer',
                itemPurchased: 'Floral Sparkle Beaded Pen Set',
              },
              {
                stars: 5,
                title: 'Cutest Stocking Stuffer Keepsake',
                quote:
                  'The sea turtle bookmark charm is even more enchanting in person. The packaging was darling and it arrived in just 3 days! My daughter loves reading and this bookmark made her smile every single day.',
                author: 'Brenda K.',
                location: 'Columbus, OH',
                verified: 'Verified Buyer',
                itemPurchased: 'Ocean Breeze Turtle Bookmark',
              },
              {
                stars: 5,
                title: 'True Generational Craftsmanship',
                quote:
                  'You can genuinely feel the generational love Bonnie and Tammy pour into their craft. High quality hardware, vibrant beads, and the free shipping over $25 made stocking up on birthday gifts effortless!',
                author: 'Michelle T.',
                location: 'Charlotte, NC',
                verified: 'Verified Buyer',
                itemPurchased: 'Paw Print & Butterfly Keychains',
              },
            ].map((review, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all hover:translate-y-[-2px]"
                style={{
                  background: 'rgba(61, 37, 82, 0.45)',
                  border: '1px solid rgba(232, 116, 138, 0.22)',
                  boxShadow: '0 8px 24px -6px rgba(0,0,0,0.3)',
                }}
              >
                <div>
                  {/* Star Rating */}
                  <div className="flex items-center gap-1 mb-3 text-amber-300">
                    {[...Array(review.stars)].map((_, idx) => (
                      <span key={idx} className="text-base">★</span>
                    ))}
                    <span className="ml-2 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      ✓ {review.verified}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold mb-2 text-[#f5efe6]">
                    &ldquo;{review.title}&rdquo;
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed italic text-cream-100/80 mb-4">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-4 border-t border-rose-400/15 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-[#f5efe6]">{review.author}</p>
                    <p className="text-[11px] text-cream-100/50">{review.location}</p>
                  </div>
                  <span className="text-[10px] text-[#e8748a] bg-rose-950/30 border border-rose-500/20 px-2 py-1 rounded-md">
                    {review.itemPurchased}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────────── */}
      <div className="section-divider mx-6 md:mx-24" />
      <section id="about" className="py-16 sm:py-20 px-6 text-center" style={{ background: 'rgba(26, 15, 36, 0.5)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#e8748a' }}>✦ Generational Crafting ✦</p>
          <h3 className="text-2xl sm:text-3xl font-serif mb-6"
            style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>
            Made by Bonnie & Tammy, <span className="italic" style={{ color: '#e8748a' }}>with generational heart</span>
          </h3>
          <p className="text-sm sm:text-base leading-relaxed mb-4" style={{ color: 'rgba(245, 239, 230, 0.75)' }}>
            Every keychain and trinket in our collection is born from the shared love of generational crafting between mother Bonnie and daughter Tammy. Together, we blend timeless handmade warmth with whimsical wonder, lovingly designing and assembling each keepsake one by one.
          </p>
          <p className="text-sm sm:text-base leading-relaxed mb-8" style={{ color: 'rgba(245, 239, 230, 0.65)' }}>
            Step inside our enchanted storefront brought to life through a rich variety of animations — from waving Bonnie &amp; Tammy greeting you at the counter to flickering lanterns and floating relics celebrating every handcrafted creation.
          </p>

          {/* ── SOCIAL CHANNELS BAR ────────────────────────────── */}
          <div className="pt-6 border-t border-rose-400/15">
            <p className="text-xs tracking-[0.25em] uppercase mb-5" style={{ color: '#e8748a' }}>
              ✦ Watch Bonnie &amp; Tammy&apos;s Daily Trinket Tales ✦
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
              {/* YouTube Official Brand Logo + Pill */}
              <a
                href="https://www.youtube.com/@btboutiqe"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                style={{
                  background: 'rgba(26, 15, 36, 0.85)',
                  border: '1px solid rgba(255, 0, 51, 0.45)',
                  color: '#f5efe6',
                }}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#FF0033' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </span>
                <span>YouTube (@btboutiqe)</span>
              </a>

              {/* Instagram Official Gradient Brand Logo + Pill */}
              <a
                href="https://www.instagram.com/btboutiqevids/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                style={{
                  background: 'rgba(26, 15, 36, 0.85)',
                  border: '1px solid rgba(225, 48, 108, 0.5)',
                  color: '#f5efe6',
                }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </span>
                <span>Instagram (@btboutiqevids)</span>
              </a>

              {/* TikTok Official Dual-Tone Neon Brand Logo + Pill */}
              <a
                href="https://www.tiktok.com/@bt.boutiqe?_r=1&_t=ZT-9At4jcQOT0v"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                style={{
                  background: 'rgba(26, 15, 36, 0.85)',
                  border: '1px solid rgba(37, 244, 238, 0.45)',
                  color: '#f5efe6',
                }}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#000000', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"
                      fill="#25F4EE"
                      transform="translate(-0.7, -0.5)"
                    />
                    <path
                      d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"
                      fill="#FE2C55"
                      transform="translate(0.7, 0.5)"
                    />
                    <path
                      d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"
                      fill="#FFFFFF"
                    />
                  </svg>
                </span>
                <span>TikTok (@bt.boutiqe)</span>
              </a>

              {/* Facebook Official Brand Logo + Pill */}
              <a
                href="https://www.facebook.com/share/1CdJpCaKxC/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                style={{
                  background: 'rgba(26, 15, 36, 0.85)',
                  border: '1px solid rgba(24, 119, 242, 0.5)',
                  color: '#f5efe6',
                }}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#1877F2' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </span>
                <span>Facebook (Bonnie Boutiqe)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEO FAQ & CATEGORY HIGHLIGHTS ────────────────────── */}
      <div className="section-divider mx-6 md:mx-24" />
      <section
        id="faq"
        aria-labelledby="faq-heading"
        className="py-14 sm:py-16 px-6"
        style={{ background: 'rgba(26, 15, 36, 0.35)' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: '#e8748a' }}>
              ✦ Boutique Guide &amp; FAQ ✦
            </p>
            <h2
              id="faq-heading"
              className="text-2xl sm:text-3xl font-serif"
              style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}
            >
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="rounded-2xl p-5 sm:p-6"
                style={{
                  background: 'rgba(61, 37, 82, 0.45)',
                  border: '1px solid rgba(232, 116, 138, 0.2)',
                }}
              >
                <h3
                  className="text-sm sm:text-base font-bold mb-2"
                  style={{ color: '#f5efe6' }}
                >
                  {item.question}
                </h3>
                <p
                  className="text-xs sm:text-sm leading-relaxed"
                  style={{ color: 'rgba(245, 239, 230, 0.72)' }}
                >
                  {item.answer}
                </p>
              </div>
            ))}
          </div>

          {/* Direct Crawlable Category Links */}
          <nav
            aria-label="Shop by Category"
            className="mt-10 pt-6 border-t flex flex-wrap items-center justify-center gap-3 text-xs"
            style={{ borderColor: 'rgba(232, 116, 138, 0.15)' }}
          >
            <span style={{ color: 'rgba(245, 239, 230, 0.5)' }}>Explore Categories:</span>
            {[
              'Beaded Pens',
              'Keychains',
              'Charms & Bookmarks',
              'Diamond Art',
              'Accessories',
            ].map((cat) => (
              <a
                key={cat}
                href={`/?category=${encodeURIComponent(cat)}#collections`}
                className="px-3 py-1.5 rounded-full transition-colors hover:text-white"
                style={{
                  background: 'rgba(61, 37, 82, 0.5)',
                  color: '#e8748a',
                  border: '1px solid rgba(232, 116, 138, 0.22)',
                }}
              >
                {cat}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <StoreFooter />
    </div>
  );
}
