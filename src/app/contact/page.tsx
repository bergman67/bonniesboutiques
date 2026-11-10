import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import StoreFooter from '@/components/StoreFooter';
import ContactFormClient from '@/components/ContactFormClient';

export const metadata: Metadata = {
  title: 'Contact Bonnie & Tammy | Custom Teacher, Nurse & Event Gifts',
  description:
    "Get in touch with mother-daughter makers Bonnie & Tammy in Clearbrook, Virginia (22624). Order questions, custom teacher & nurse beaded pen sets, and local Frederick County pickup.",
  alternates: {
    canonical: 'https://btboutiqe.com/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#2d1b3d', color: '#f5efe6' }}>
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest mb-8 transition-colors hover:text-[#e8748a]"
          style={{ color: 'rgba(245, 239, 230, 0.6)' }}
        >
          ← Back to Boutique
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Studio Info Column */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#e8748a] mb-2">
                ✦ Family Workshop ✦
              </p>
              <h1
                className="text-3xl font-serif mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Say Hello to Bonnie &amp; Tammy
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.72)' }}>
                Real humans, zero bots! Every email goes straight to mother-daughter duo Bonnie &amp; Tammy at our crafting table in Northern Virginia.
              </p>
            </div>

            <div
              className="rounded-2xl p-5 space-y-3 text-xs sm:text-sm"
              style={{
                background: 'rgba(26, 15, 36, 0.65)',
                border: '1px solid rgba(232, 116, 138, 0.18)',
              }}
            >
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#e8748a] font-semibold">
                  ✉️ Direct Email
                </p>
                <a
                  href="mailto:bonnielong106@yahoo.com"
                  className="text-[#f5efe6] hover:text-[#e8748a] underline font-medium"
                >
                  bonnielong106@yahoo.com
                </a>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#e8748a] font-semibold">
                  📍 Home Studio Origin
                </p>
                <p style={{ color: 'rgba(245, 239, 230, 0.8)' }}>
                  Clearbrook, Virginia 22624 (Frederick County / Winchester area)
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#e8748a] font-semibold">
                  ⏱️ Typical Reply Time
                </p>
                <p style={{ color: 'rgba(245, 239, 230, 0.8)' }}>
                  Within 24 hours, Monday – Saturday
                </p>
              </div>
            </div>

            <div
              className="rounded-2xl p-5 space-y-2 text-xs"
              style={{
                background: 'rgba(61, 37, 82, 0.35)',
                border: '1px solid rgba(249, 199, 79, 0.25)',
              }}
            >
              <p className="font-semibold text-amber-300">
                🍎 Custom Group &amp; Event Gift Packs
              </p>
              <p className="leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.72)' }}>
                Planning Teacher Appreciation Week, Nurses Week, bridal shower favors, or church group gifts? Let us know how many pens or keychains you need and we&apos;ll put together a custom color-coordinated bundle!
              </p>
            </div>
          </div>

          {/* Interactive Contact Form Column */}
          <div className="lg:col-span-3">
            <ContactFormClient />
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
