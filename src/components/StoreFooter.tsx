import Link from 'next/link';

export default function StoreFooter() {
  return (
    <footer
      className="mt-16 py-12 px-6 border-t"
      style={{ borderColor: 'rgba(232, 116, 138, 0.14)', background: '#1a0f24' }}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top 3-Column Trust & Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {/* Column 1: Workshop Story & Origin */}
          <div className="space-y-2.5">
            <p className="text-sm font-serif font-bold text-[#f5efe6]">
              Bonnie&apos;s Boutique <span className="text-[#e8748a]">(B&amp;T Trinkets)</span>
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.65)' }}>
              Handcrafted one by one by mother-daughter duo Bonnie &amp; Tammy in our home studio in{' '}
              <strong className="text-[#f5efe6]/90">Clearbrook, Virginia (22624)</strong>.
            </p>
            <p className="text-xs" style={{ color: 'rgba(245, 239, 230, 0.6)' }}>
              Questions or custom gift requests?{' '}
              <a
                href="mailto:bonnielong106@yahoo.com"
                className="text-[#e8748a] hover:underline font-medium"
              >
                bonnielong106@yahoo.com
              </a>
            </p>
          </div>

          {/* Column 2: Shop & Customer Care Policies */}
          <div className="space-y-2.5">
            <p className="text-xs uppercase tracking-widest font-semibold text-[#e8748a]">
              Customer Care &amp; Policies
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-2 text-xs" style={{ color: 'rgba(245, 239, 230, 0.72)' }}>
              <Link href="/shipping" className="hover:text-[#e8748a] transition-colors">
                Shipping Policy
              </Link>
              <Link href="/returns" className="hover:text-[#e8748a] transition-colors">
                14-Day Returns
              </Link>
              <Link href="/contact" className="hover:text-[#e8748a] transition-colors">
                Contact Us
              </Link>
              <Link href="/links" className="hover:text-[#e8748a] transition-colors">
                Featured Links
              </Link>
              <Link href="/terms" className="hover:text-[#e8748a] transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-[#e8748a] transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Column 3: Payment & Fulfillment Guarantees */}
          <div className="space-y-2.5">
            <p className="text-xs uppercase tracking-widest font-semibold text-[#e8748a]">
              Shop With Confidence
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 text-[11px]">
              {[
                '🔒 256-Bit SSL',
                '💳 Stripe Verified',
                ' Apple Pay',
                'G Pay',
                'Visa · MC · Amex',
                '📦 USPS Tracked',
              ].map((badge) => (
                <span
                  key={badge}
                  className="px-2.5 py-1 rounded-md font-medium"
                  style={{
                    background: 'rgba(61, 37, 82, 0.55)',
                    color: 'rgba(245, 239, 230, 0.8)',
                    border: '1px solid rgba(232, 116, 138, 0.18)',
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: 'rgba(245, 239, 230, 0.5)' }}>
              Ships in 1–2 business days from Clearbrook, VA · Free US shipping over $25
            </p>
          </div>
        </div>

        {/* Social Links Bar */}
        <div
          className="pt-6 border-t flex flex-wrap items-center justify-center gap-5 text-xs"
          style={{ borderColor: 'rgba(232, 116, 138, 0.1)', color: 'rgba(245, 239, 230, 0.68)' }}
        >
          <a
            href="https://www.youtube.com/@btboutiqe"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#e8748a] transition-colors"
          >
            ▶️ YouTube Shorts (@btboutiqe)
          </a>
          <a
            href="https://www.instagram.com/btboutiqevids/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#e8748a] transition-colors"
          >
            📸 Instagram Reels
          </a>
          <a
            href="https://www.tiktok.com/@bt.boutiqe"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#e8748a] transition-colors"
          >
            🎵 TikTok (@bt.boutiqe)
          </a>
          <a
            href="https://www.facebook.com/share/1CdJpCaKxC/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#e8748a] transition-colors"
          >
            👥 Facebook (Bonnie Boutiqe)
          </a>
        </div>

        <p className="text-center text-xs" style={{ color: 'rgba(245, 239, 230, 0.35)' }}>
          &copy; {new Date().getFullYear()} Bonnie&apos;s Boutique (B&amp;T Trinkets) · Handcrafted with generational love in Clearbrook, Virginia
        </p>
      </div>
    </footer>
  );
}
