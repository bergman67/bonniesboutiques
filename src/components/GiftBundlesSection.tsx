'use client';

import { useCart } from '@/context/CartContext';
import { CART_IMPULSE_ADDONS } from '@/lib/coupons';
import { useState } from 'react';

export interface BundleProductCandidate {
  id: string;
  title: string;
  price: number;
  imageUrl: string | null;
}

interface GiftBundlesSectionProps {
  pens: BundleProductCandidate[];
  keychains: BundleProductCandidate[];
}

export default function GiftBundlesSection({ pens, keychains }: GiftBundlesSectionProps) {
  const { addItem } = useCart();
  const [addedBundleId, setAddedBundleId] = useState<string | null>(null);

  if (pens.length < 3) return null;

  const refillAddon = CART_IMPULSE_ADDONS[0]; // $3.00 3-Pack 1.0mm Refills
  const pouchAddon = CART_IMPULSE_ADDONS[1]; // $2.00 Velvet Gift Pouch

  const starterPens = pens.slice(0, 3);
  const starterTotal =
    starterPens.reduce((sum, p) => sum + p.price, 0) + refillAddon.price;

  const teacherPens = pens.slice(3, 7).length === 4 ? pens.slice(3, 7) : pens.slice(0, 4);
  const teacherTotal =
    teacherPens.reduce((sum, p) => sum + p.price, 0) + pouchAddon.price;

  const duoPen = pens[0];
  const duoKeychain = keychains[0] || pens[1];
  const duoTotal = duoPen.price + duoKeychain.price + pouchAddon.price;

  const bundles = [
    {
      id: 'bundle-3pen-freeship',
      badge: '🔥 Most Popular · Unlocks FREE Shipping',
      title: '3-Pen Collector Set + Bonus 3pk Ink Refills',
      subtitle:
        'Three one-of-a-kind handcrafted beaded pens paired with our 3-pack smooth black 1.0mm refills — crosses the $25 Free US Shipping threshold automatically!',
      items: [
        ...starterPens.map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          imageUrl: p.imageUrl,
        })),
        {
          id: refillAddon.id,
          title: refillAddon.title,
          price: refillAddon.price,
          imageUrl: refillAddon.imageUrl,
        },
      ],
      total: starterTotal,
      shippingTag: 'FREE US Shipping Included',
      featured: true,
    },
    {
      id: 'bundle-4pen-teacher',
      badge: '🍎 Gift-Giver Favorite · FREE Shipping',
      title: 'Teacher & Nurse 4-Pen Appreciation Pack + Velvet Pouch',
      subtitle:
        'Four wipe-clean silicone & artisan focal beaded pens plus a Rose Gold Velvet Gift Pouch — ready to hand out at school, clinic, or the office.',
      items: [
        ...teacherPens.map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          imageUrl: p.imageUrl,
        })),
        {
          id: pouchAddon.id,
          title: pouchAddon.title,
          price: pouchAddon.price,
          imageUrl: pouchAddon.imageUrl,
        },
      ],
      total: teacherTotal,
      shippingTag: 'FREE US Shipping Included',
      featured: false,
    },
    {
      id: 'bundle-keepsake-duo',
      badge: '💝 Ready-to-Gift Duo · $3.99 Shipping',
      title: 'Signature Pen + Keychain + Velvet Pouch Set',
      subtitle:
        'One smooth-writing handcrafted beaded pen, one matching artisan keychain charm, and a Rose Gold Velvet Gift Pouch — unlocks subsidized $3.99 shipping!',
      items: [
        {
          id: duoPen.id,
          title: duoPen.title,
          price: duoPen.price,
          imageUrl: duoPen.imageUrl,
        },
        {
          id: duoKeychain.id,
          title: duoKeychain.title,
          price: duoKeychain.price,
          imageUrl: duoKeychain.imageUrl,
        },
        {
          id: pouchAddon.id,
          title: pouchAddon.title,
          price: pouchAddon.price,
          imageUrl: pouchAddon.imageUrl,
        },
      ],
      total: duoTotal,
      shippingTag: 'Unlocks $3.99 Subsidized Shipping',
      featured: false,
    },
  ];

  const handleAddBundle = (
    bundleId: string,
    bundleItems: Array<{ id: string; title: string; price: number; imageUrl: string | null }>
  ) => {
    for (const it of bundleItems) {
      addItem(it);
    }
    setAddedBundleId(bundleId);
    setTimeout(() => setAddedBundleId(null), 2000);
  };

  return (
    <section
      id="bundles"
      aria-labelledby="bundles-heading"
      className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-4"
    >
      <div className="text-center mb-8">
        <p className="text-xs tracking-[0.3em] uppercase mb-2 text-amber-300 font-semibold">
          ✦ Curated Keepsake Sets · Extra Value ✦
        </p>
        <h2
          id="bundles-heading"
          className="text-2xl sm:text-3xl font-serif text-[#f5efe6]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          1-Click Gift &amp; Free-Shipping Bundles
        </h2>
        <p className="text-xs sm:text-sm mt-2 max-w-2xl mx-auto" style={{ color: 'rgba(245, 239, 230, 0.68)' }}>
          Skip single-item shipping fees — grab a curated pen &amp; gift bundle and stack code{' '}
          <strong className="text-amber-300">BONNIE10</strong> at checkout for an extra 10% off!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {bundles.map((bundle) => {
          const isAdded = addedBundleId === bundle.id;
          const afterBonnie10 = (bundle.total * 0.9).toFixed(2);
          return (
            <div
              key={bundle.id}
              className="rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4 transition-all hover:translate-y-[-2px]"
              style={
                bundle.featured
                  ? {
                      background: 'linear-gradient(150deg, rgba(61, 37, 82, 0.8), rgba(26, 15, 36, 0.95))',
                      border: '1px solid rgba(249, 199, 79, 0.45)',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
                    }
                  : {
                      background: 'rgba(61, 37, 82, 0.42)',
                      border: '1px solid rgba(232, 116, 138, 0.22)',
                    }
              }
            >
              <div className="space-y-3">
                <span
                  className="inline-block text-[11px] font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: bundle.featured ? 'rgba(249, 199, 79, 0.16)' : 'rgba(232, 116, 138, 0.15)',
                    color: bundle.featured ? '#fde68a' : '#e8748a',
                    border: `1px solid ${
                      bundle.featured ? 'rgba(249, 199, 79, 0.35)' : 'rgba(232, 116, 138, 0.3)'
                    }`,
                  }}
                >
                  {bundle.badge}
                </span>

                <h3
                  className="text-lg font-serif font-bold text-[#f5efe6]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {bundle.title}
                </h3>

                <p className="text-xs leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.72)' }}>
                  {bundle.subtitle}
                </p>

                {/* Preview Thumbnails */}
                <div className="flex items-center gap-2 pt-1">
                  {bundle.items.slice(0, 4).map((it, idx) => (
                    <div
                      key={`${bundle.id}_${it.id}_${idx}`}
                      className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center p-1"
                      style={{
                        background: '#2d1b3d',
                        border: '1px solid rgba(232, 116, 138, 0.2)',
                      }}
                      title={it.title}
                    >
                      {it.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.imageUrl}
                          alt={it.title}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-lg">🎁</span>
                      )}
                    </div>
                  ))}
                  <span className="text-[11px] font-medium pl-1" style={{ color: 'rgba(245, 239, 230, 0.6)' }}>
                    {bundle.items.length} items
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t space-y-3" style={{ borderColor: 'rgba(232, 116, 138, 0.14)' }}>
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-2xl font-bold text-[#e8748a]">
                      ${bundle.total.toFixed(2)}
                    </span>
                    <span className="text-xs ml-2 text-amber-300 font-medium">
                      (${afterBonnie10} w/ BONNIE10)
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    {bundle.shippingTag}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddBundle(bundle.id, bundle.items)}
                  className="w-full py-3 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all active:scale-95 cursor-pointer"
                  style={
                    isAdded
                      ? {
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                        }
                      : {
                          background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                          color: 'white',
                          boxShadow: '0 4px 16px rgba(232, 116, 138, 0.3)',
                        }
                  }
                >
                  {isAdded ? '✓ Bundle Added to Cart!' : `Add ${bundle.items.length}-Piece Bundle to Cart →`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
