import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "Privacy Policy | Bonnie's Boutique (B&T Trinkets)",
  description: "Official Privacy Policy for Bonnie's Boutique (btboutiqe.com) and Trinket Tales Studio.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#1a0f24] text-[#f5efe6] py-16 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-[#e8748a] hover:underline">
          &larr; Back to Bonnie&apos;s Boutique
        </Link>
        <h1 className="text-3xl font-serif text-[#f5efe6]">Privacy Policy</h1>
        <p className="text-xs text-[#f5efe6]/60">Last Updated: October 2026</p>

        <section className="space-y-3 text-sm leading-relaxed text-[#f5efe6]/80">
          <h2 className="text-lg font-semibold text-[#e8748a]">1. Information We Collect</h2>
          <p>
            Bonnie&apos;s Boutique (&ldquo;B&amp;T Trinkets&rdquo;, <a href="https://btboutiqe.com" className="underline text-[#e8748a]">https://btboutiqe.com</a>) collects only the information necessary to fulfill customer craft orders (such as shipping name, delivery address, and payment details processed securely via Stripe) and to operate our authorized social media publishing studio.
          </p>

          <h2 className="text-lg font-semibold text-[#e8748a]">2. Third-Party Social Platform Data (TikTok, Instagram, YouTube)</h2>
          <p>
            When an authorized user connects a social media account via TikTok Login Kit (`user.info.basic`), TikTok Content Posting API (`video.upload`, `video.publish`), Meta Graph API, or Google/YouTube OAuth2:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>We access basic profile identifiers (`user.info.basic`) solely to verify the connected account.</li>
            <li>We use `video.upload` and `video.publish` permissions exclusively to upload and publish original animated videos created in Bonnie&apos;s Boutique Trinket Tales Studio.</li>
            <li>We never sell, rent, or share OAuth tokens or user profile data with any third parties.</li>
          </ul>

          <h2 className="text-lg font-semibold text-[#e8748a]">3. Data Retention &amp; Revocation</h2>
          <p>
            You may disconnect or revoke access to your connected social accounts at any time through your TikTok, Instagram, or Google account security settings, or by requesting deletion of stored credentials.
          </p>
        </section>
      </div>
    </main>
  );
}
