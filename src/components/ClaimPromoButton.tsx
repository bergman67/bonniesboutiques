'use client';

import { useState, useEffect } from 'react';
import { PROMO_STORAGE_KEY } from '@/lib/coupons';
import { trackCommerceEvent } from '@/lib/analytics';

export default function ClaimPromoButton({ code = 'BONNIE10' }: { code?: string }) {
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(PROMO_STORAGE_KEY) === code) {
        setClaimed(true);
      }
    } catch {}
  }, [code]);

  const handleClaim = () => {
    try {
      localStorage.setItem(PROMO_STORAGE_KEY, code);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
    } catch {}
    setClaimed(true);
    trackCommerceEvent('ApplyCoupon', { coupon: code, source: 'links_bio' });
  };

  return (
    <button
      type="button"
      onClick={handleClaim}
      className="w-full py-3.5 px-5 rounded-2xl text-sm font-bold tracking-wide transition-all active:scale-[0.99] cursor-pointer shadow-lg"
      style={
        claimed
          ? {
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: '1px solid rgba(16, 185, 129, 0.5)',
            }
          : {
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#1a0f24',
              border: '1px solid rgba(254, 243, 199, 0.6)',
            }
      }
    >
      {claimed
        ? `✓ Code ${code} Active! 10% Auto-Applies at Checkout`
        : `🎁 Tap to Activate 10% Off (Code: ${code})`}
    </button>
  );
}
