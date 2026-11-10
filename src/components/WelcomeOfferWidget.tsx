'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PROMO_STORAGE_KEY } from '@/lib/coupons';
import { trackCommerceEvent } from '@/lib/analytics';

const DISMISS_KEY = 'bonnies-welcome-offer-state';

export default function WelcomeOfferWidget() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const savedState = localStorage.getItem(DISMISS_KEY);
      if (savedState === 'dismissed' || savedState === 'claimed') {
        setDismissed(savedState === 'dismissed');
        if (savedState === 'claimed') {
          setClaimedCode(localStorage.getItem(PROMO_STORAGE_KEY) || 'WELCOME10');
        }
      }
    } catch {}
  }, []);

  if (!mounted) return null;
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/checkout')) {
    return null;
  }
  if (dismissed && !expanded) return null;

  const handleDismiss = () => {
    setExpanded(false);
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, 'dismissed');
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          topic: 'welcome-10-offer',
          source: 'welcome-widget',
        }),
      });
      const data = await res.json();
      const code = data?.couponCode || 'WELCOME10';
      setClaimedCode(code);
      try {
        localStorage.setItem(PROMO_STORAGE_KEY, code);
        localStorage.setItem(DISMISS_KEY, 'claimed');
      } catch {}
      trackCommerceEvent('Lead', { source: 'welcome_widget', coupon: code });
    } catch {
      setClaimedCode('WELCOME10');
      try {
        localStorage.setItem(PROMO_STORAGE_KEY, 'WELCOME10');
      } catch {}
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    if (claimedCode) return null;
    return (
      <div className="fixed bottom-20 md:bottom-5 left-4 z-30 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="px-3.5 py-2 rounded-full text-xs font-semibold shadow-xl transition-transform hover:scale-105 cursor-pointer flex items-center gap-1.5"
          style={{
            background: 'linear-gradient(135deg, #2d1b3d, #1a0f24)',
            color: '#fef3c7',
            border: '1px solid rgba(249, 199, 79, 0.45)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
          }}
        >
          <span>🎁</span>
          <span>Unlock 10% Off</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Hide welcome offer"
          className="w-6 h-6 rounded-full text-[10px] flex items-center justify-center cursor-pointer"
          style={{
            background: 'rgba(26, 15, 36, 0.85)',
            color: 'rgba(245, 239, 230, 0.55)',
            border: '1px solid rgba(232, 116, 138, 0.2)',
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-20 md:bottom-5 left-4 right-4 sm:right-auto sm:w-80 z-40 rounded-2xl p-5 shadow-2xl"
      style={{
        background: 'linear-gradient(155deg, #2d1b3d, #1a0f24)',
        border: '1px solid rgba(232, 116, 138, 0.35)',
        boxShadow: '0 18px 50px rgba(0, 0, 0, 0.65)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs uppercase tracking-widest font-semibold text-amber-300">
          🎁 Bonnie &amp; Tammy VIP Gift
        </p>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            if (claimedCode) setDismissed(true);
          }}
          aria-label="Close welcome offer"
          className="text-xs px-1.5 py-0.5 rounded cursor-pointer"
          style={{ color: 'rgba(245, 239, 230, 0.5)' }}
        >
          ✕
        </button>
      </div>

      {claimedCode ? (
        <div className="space-y-3">
          <p className="text-sm font-serif font-bold text-[#f5efe6]">
            Your 10% Gift Is Active! ✨
          </p>
          <div
            className="rounded-xl px-3 py-2.5 text-center font-mono text-sm font-bold tracking-widest"
            style={{
              background: 'rgba(107, 203, 119, 0.14)',
              border: '1px dashed rgba(107, 203, 119, 0.5)',
              color: '#6bcb77',
            }}
          >
            {claimedCode}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.72)' }}>
            We&apos;ve automatically saved <strong>{claimedCode}</strong> to your cart so 10% comes right off at checkout!
          </p>
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setDismissed(true);
            }}
            className="w-full py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #e8748a, #c44b63)',
              color: 'white',
            }}
          >
            Start Shopping With 10% Off →
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <h3
            className="text-base font-serif font-bold text-[#f5efe6]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Take 10% Off Your First Keepsake
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.7)' }}>
            Join our small-batch Clearbrook, VA workshop list for instant 10% savings + early alerts on new handmade beaded pens.
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email..."
            className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
            style={{
              background: 'rgba(26, 15, 36, 0.85)',
              border: '1px solid rgba(232, 116, 138, 0.28)',
              color: '#f5efe6',
            }}
          />
          {error && <p className="text-[11px] text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #e8748a, #c44b63)',
              color: 'white',
            }}
          >
            {submitting ? 'Activating...' : 'Unlock My 10% Code →'}
          </button>
        </form>
      )}
    </div>
  );
}
