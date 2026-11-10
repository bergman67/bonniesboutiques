import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import StoreFooter from '@/components/StoreFooter';

export const metadata: Metadata = {
  title: 'Shipping Policy & Delivery Times',
  description:
    "Fast 1–2 business day dispatch from Bonnie & Tammy's Clearbrook, Virginia studio via tracked USPS Ground Advantage. Free US shipping over $25 and subsidized $3.99 shipping on $15+ orders.",
  alternates: {
    canonical: 'https://btboutiqe.com/shipping',
  },
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#2d1b3d', color: '#f5efe6' }}>
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest mb-8 transition-colors hover:text-[#e8748a]"
          style={{ color: 'rgba(245, 239, 230, 0.6)' }}
        >
          ← Back to Boutique
        </Link>

        <h1
          className="text-3xl sm:text-4xl font-serif mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Shipping Policy &amp; Delivery Guide
        </h1>
        <p className="text-xs mb-8" style={{ color: 'rgba(245, 239, 230, 0.55)' }}>
          Hand-packed &amp; shipped from Clearbrook, Virginia (ZIP 22624) · Tracked USPS Ground Advantage
        </p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.85)' }}>
          {/* Transparent Shipping Rate Table */}
          <section
            className="rounded-2xl p-6 space-y-4"
            style={{
              background: 'rgba(61, 37, 82, 0.45)',
              border: '1px solid rgba(232, 116, 138, 0.22)',
            }}
          >
            <h2 className="text-lg font-semibold text-[#e8748a]">
              Simple, Fair US Shipping Rates
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: 'rgba(245, 239, 230, 0.75)' }}>
              Every package ships with full USPS tracking in a cushioned bubble mailer so your handcrafted beads, clasps, and pen tips arrive spotless:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                }}
              >
                <p className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
                  Orders $25.00+
                </p>
                <p className="text-2xl font-bold text-emerald-400 my-1">FREE</p>
                <p className="text-[11px]" style={{ color: 'rgba(245, 239, 230, 0.7)' }}>
                  Evaluated before promo discounts — using BONNIE10 never revokes free shipping!
                </p>
              </div>
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: 'rgba(249, 199, 79, 0.1)',
                  border: '1px solid rgba(249, 199, 79, 0.3)',
                }}
              >
                <p className="text-xs uppercase tracking-wider text-amber-300 font-semibold">
                  Orders $15.00 – $24.99
                </p>
                <p className="text-2xl font-bold text-amber-200 my-1">$3.99</p>
                <p className="text-[11px]" style={{ color: 'rgba(245, 239, 230, 0.7)' }}>
                  Subsidized flat rate — we cover part of the postage for 2-item carts!
                </p>
              </div>
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: 'rgba(26, 15, 36, 0.65)',
                  border: '1px solid rgba(232, 116, 138, 0.2)',
                }}
              >
                <p className="text-xs uppercase tracking-wider text-[#e8748a] font-semibold">
                  Orders $10.00 – $14.99
                </p>
                <p className="text-2xl font-bold text-[#f5efe6] my-1">$4.99</p>
                <p className="text-[11px]" style={{ color: 'rgba(245, 239, 230, 0.7)' }}>
                  Standard USPS Ground Advantage tracked flat rate ($10.00 small-batch minimum).
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#e8748a]">
              1. Processing &amp; Dispatch Time (1–2 Business Days)
            </h2>
            <p>
              Because every beaded pen, keychain, bookmark charm, and wristlet at Bonnie&apos;s Boutique is already handcrafted and photographed individually by Bonnie and Tammy in our{' '}
              <strong>Clearbrook, Virginia (22624)</strong> home studio, in-stock orders are carefully wrapped and handed to USPS within <strong>1 to 2 business days</strong> (Monday–Saturday, excluding federal holidays).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#e8748a]">
              2. Estimated Delivery Window (2–5 Business Days)
            </h2>
            <p>
              All domestic parcels ship via <strong>USPS Ground Advantage</strong> with door-to-door tracking and $100 carrier insurance included. Typical transit times from Northern Virginia are:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm" style={{ color: 'rgba(245, 239, 230, 0.78)' }}>
              <li><strong>East Coast &amp; Mid-Atlantic (VA, MD, PA, NC, NY, FL, OH):</strong> 2–3 business days</li>
              <li><strong>Midwest &amp; South (TX, IL, TN, GA, MI):</strong> 3–4 business days</li>
              <li><strong>West Coast (CA, WA, AZ, CO, OR):</strong> 4–5 business days</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#e8748a]">
              3. Protective Gift-Ready Packaging
            </h2>
            <p>
              Each keepsake is inspected by hand, tucked neatly to protect silicone &amp; focal beadwork, clasp rings, and 1.0mm smooth-ink pen tips, and sealed inside a padded mailer. Ordering a gift for a teacher, nurse, or loved one? Add a{' '}
              <strong>$2 Rose Gold Velvet Gift Pouch</strong> right in your cart drawer!
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#e8748a]">
              4. Tracking &amp; Transit Protection
            </h2>
            <p>
              As soon as Bonnie prints your shipping label, your USPS tracking link is sent to the email entered at checkout. If a parcel ever arrives damaged in transit, you are covered by our{' '}
              <Link href="/returns" className="text-[#e8748a] underline">
                100% Free Transit-Damage Replacement Guarantee
              </Link>
              . Questions? Reach us anytime at{' '}
              <a href="mailto:bonnielong106@yahoo.com" className="text-[#e8748a] underline">
                bonnielong106@yahoo.com
              </a>{' '}
              or via our{' '}
              <Link href="/contact" className="text-[#e8748a] underline">
                Contact Page
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
