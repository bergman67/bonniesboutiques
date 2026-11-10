import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { SocialMetricsTracker } from '@/components/studio/SocialMetricsTracker';

export const metadata: Metadata = {
  title: "Road to 100,000 Views — Bonnie's Boutique Social Metrics Tracker",
  description:
    'Live multi-platform social media analytics tracker for YouTube Shorts (@btboutiqe), Instagram Reels (@btboutiqevids), Facebook Reels (Bonnie Boutiqe), and TikTok (@btboutiqevids).',
};

export default function MetricsDashboardPage() {
  return (
    <main
      className="min-h-screen p-4 sm:p-8 text-stone-100"
      style={{
        background: 'linear-gradient(135deg, #120919 0%, #1a0f24 50%, #251235 100%)',
      }}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-rose-500/20">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-rose-400">
              Bonnie&apos;s Boutique • 24/7 Social Autopilot
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
              🎯 Road to 100,000 Views Command Center
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/studio"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white shadow transition"
            >
              🎬 Open Studio
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-stone-200 border border-white/20 transition"
            >
              🛍️ Storefront
            </Link>
          </div>
        </header>

        <SocialMetricsTracker />
      </div>
    </main>
  );
}
