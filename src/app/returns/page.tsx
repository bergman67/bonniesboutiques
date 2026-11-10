import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import StoreFooter from '@/components/StoreFooter';

export const metadata: Metadata = {
  title: '14-Day Returns & Damage Protection Guarantee',
  description:
    "Shop Bonnie's Boutique with complete confidence: 14-day hassle-free returns and our 100% free replacement guarantee if any handcrafted item arrives damaged in transit.",
  alternates: {
    canonical: 'https://btboutiqe.com/returns',
  },
};

export default function ReturnsPolicyPage() {
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
          14-Day Returns &amp; Buyer Guarantee
        </h1>
        <p className="text-xs mb-8" style={{ color: 'rgba(245, 239, 230, 0.55)' }}>
          Personal small-business care from Bonnie &amp; Tammy in Clearbrook, Virginia
        </p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.85)' }}>
          <section
            className="rounded-2xl p-6 space-y-2"
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.32)',
            }}
          >
            <h2 className="text-lg font-semibold text-emerald-300">
              💚 100% Free Transit-Damage Replacement Guarantee
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: 'rgba(245, 239, 230, 0.85)' }}>
              Every piece leaves our Virginia table carefully inspected and cushioned. In the rare event USPS rough-handles your parcel and a bead, clasp, or pen arrives damaged or defective,{' '}
              <strong>you never pay return shipping</strong> — simply email a quick photo within 7 days of delivery to{' '}
              <a href="mailto:bonnielong106@yahoo.com" className="text-emerald-300 underline font-medium">
                bonnielong106@yahoo.com
              </a>{' '}
              and Bonnie &amp; Tammy will ship a free replacement keepsake or issue a 100% full refund right away.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#e8748a]">
              1. 14-Day Hassle-Free Return Window
            </h2>
            <p>
              Changed your mind or picked a different gift? We gladly accept returns within{' '}
              <strong>14 calendar days</strong> of your confirmed USPS delivery date. Returned items must be unused and in their original handcrafted condition.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#e8748a]">
              2. How to Start a Return in 3 Easy Steps
            </h2>
            <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm" style={{ color: 'rgba(245, 239, 230, 0.8)' }}>
              <li>
                Send a quick note via our{' '}
                <Link href="/contact" className="text-[#e8748a] underline">
                  Contact Page
                </Link>{' '}
                or email{' '}
                <a href="mailto:bonnielong106@yahoo.com" className="text-[#e8748a] underline">
                  bonnielong106@yahoo.com
                </a>{' '}
                with your name and order email.
              </li>
              <li>
                We&apos;ll reply within 24 hours with our Clearbrook, VA return mailing address and simple packing instructions. (For non-defective buyer&apos;s-remorse returns, return postage is the customer&apos;s responsibility.)
              </li>
              <li>
                Once your return arrives back at our workshop, we process a <strong>full refund</strong> to your original Stripe card, Apple Pay, or Google Pay method within 2 business days.
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#e8748a]">
              3. Custom &amp; Personalized Orders
            </h2>
            <p>
              Custom name-beaded or made-to-order event sets crafted specifically to your custom color/lettering request are final sale unless damaged in transit, in which case we repair or replace them at zero cost to you.
            </p>
          </section>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
