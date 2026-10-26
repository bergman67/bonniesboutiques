import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "Terms of Service | Bonnie's Boutique (B&T Trinkets)",
  description: "Official Terms of Service for Bonnie's Boutique (btboutiqe.com) and Trinket Tales Studio.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#1a0f24] text-[#f5efe6] py-16 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-[#e8748a] hover:underline">
          &larr; Back to Bonnie&apos;s Boutique
        </Link>
        <h1 className="text-3xl font-serif text-[#f5efe6]">Terms of Service</h1>
        <p className="text-xs text-[#f5efe6]/60">Last Updated: October 2026</p>

        <section className="space-y-3 text-sm leading-relaxed text-[#f5efe6]/80">
          <h2 className="text-lg font-semibold text-[#e8748a]">1. Overview</h2>
          <p>
            Welcome to Bonnie&apos;s Boutique (&ldquo;B&amp;T Trinkets&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), accessible at{' '}
            <a href="https://btboutiqe.com" className="underline text-[#e8748a]">https://btboutiqe.com</a>. By accessing our storefront or using our internal Trinket Tales Studio social publishing tools, you agree to be bound by these Terms of Service.
          </p>

          <h2 className="text-lg font-semibold text-[#e8748a]">2. Handcrafted Products &amp; Orders</h2>
          <p>
            Every beaded pen, keychain, bookmark, and charm is handcrafted by Bonnie and Tammy. Slight variations in bead placement and color are part of the one-of-a-kind nature of handmade goods. All prices are listed in USD, and orders are shipped promptly via USPS with tracking.
          </p>

          <h2 className="text-lg font-semibold text-[#e8748a]">3. Trinket Tales Studio &amp; Social Media Integration</h2>
          <p>
            Our website includes an animation and content studio (&ldquo;Trinket Tales Studio&rdquo;) that integrates with official third-party APIs (including YouTube Data API Services, Meta Graph API, and TikTok Login Kit / Content Posting API) to allow authorized boutique administrators to authenticate their accounts and publish original short-form animated episodes to our official social channels. Users retain full ownership of their content and may revoke platform authorization at any time.
          </p>

          <h2 className="text-lg font-semibold text-[#e8748a]">4. Contact Information</h2>
          <p>
            For any questions regarding these Terms of Service or your order, please contact us through{' '}
            <a href="https://btboutiqe.com" className="underline text-[#e8748a]">https://btboutiqe.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
