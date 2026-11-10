'use client';

import { useCart } from '@/context/CartContext';
import Header from '@/components/Header';
import StoreFooter from '@/components/StoreFooter';
import {
  calculateOrderPricing,
  CART_IMPULSE_ADDONS,
  MIN_ORDER_SUBTOTAL,
  PROMO_STORAGE_KEY,
  validatePromoCode,
} from '@/lib/coupons';
import { getSavedAttribution, trackCommerceEvent } from '@/lib/analytics';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  paymentMethod: 'stripe' | 'paypal' | 'venmo';
};

type PublicSettings = {
  enableStripe: boolean;
  enableVenmo: boolean;
  enablePaypal: boolean;
  venmoHandle: string;
  paypalEmail: string | null;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  stripeConfigured: boolean;
};

export default function CheckoutPage() {
  const { items, totalPrice, totalItems, addItem, clearCart } = useCart();
  const [step, setStep] = useState<'info' | 'payment' | 'confirm'>('info');
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [storeSettings, setStoreSettings] = useState<PublicSettings>({
    enableStripe: true,
    enableVenmo: false,
    enablePaypal: false,
    venmoHandle: '@BonniesBoutique',
    paypalEmail: null,
    shippingFlatRate: 4.99,
    freeShippingThreshold: 25.0,
    stripeConfigured: true,
  });

  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    paymentMethod: 'stripe',
  });

  const initiatedTelemetryRef = useRef(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setStoreSettings(data);
          if (!data.enableStripe) {
            if (data.enableVenmo) setForm((f) => ({ ...f, paymentMethod: 'venmo' }));
            else if (data.enablePaypal) setForm((f) => ({ ...f, paymentMethod: 'paypal' }));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Hydrate saved or query-param promo code automatically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlPromo = params.get('promo') || params.get('code');
      const savedPromo = localStorage.getItem(PROMO_STORAGE_KEY);
      const candidate = (urlPromo || savedPromo || '').trim().toUpperCase();
      if (candidate) {
        const check = validatePromoCode(candidate, totalPrice || 20);
        if (check.valid) {
          setPromoInput(check.code);
          setAppliedPromoCode(check.code);
          localStorage.setItem(PROMO_STORAGE_KEY, check.code);
          setPromoFeedback({
            type: 'success',
            message: `${check.code} applied — ${check.percentOff}% off!`,
          });
        }
      }
    } catch {
      // Non-blocking storage access
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initiatedTelemetryRef.current && items.length > 0 && step !== 'confirm') {
      initiatedTelemetryRef.current = true;
      trackCommerceEvent('InitiateCheckout', {
        value: totalPrice,
        currency: 'USD',
        num_items: totalItems,
      });
    }
  }, [items.length, step, totalItems, totalPrice]);

  const verifiedSessionRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !verifiedSessionRef.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      const orderId = urlParams.get('order_id');
      if (sessionId) {
        verifiedSessionRef.current = true;
        setStep('confirm');
        clearCart();
        fetch('/api/checkout', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, sessionId }),
        })
          .then((r) => r.json())
          .then((resData) => {
            if (resData?.success) {
              trackCommerceEvent('Purchase', {
                transaction_id: resData.orderId || orderId || sessionId,
                currency: 'USD',
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [clearCart]);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const inputClass = 'w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 transition-all';
  const inputStyle = {
    background: 'rgba(26,15,36,0.7)',
    border: '1px solid rgba(232,116,138,0.2)',
    color: '#f5efe6',
  };

  const pricing = calculateOrderPricing({
    subtotal: totalPrice,
    promoCode: appliedPromoCode,
    shippingFlatRate: storeSettings.shippingFlatRate,
    freeShippingThreshold: storeSettings.freeShippingThreshold,
  });

  const handleApplyPromo = (codeOverride?: string) => {
    const codeToTest = (codeOverride ?? promoInput).trim().toUpperCase();
    const result = validatePromoCode(codeToTest, totalPrice);
    if (!result.valid) {
      setPromoFeedback({
        type: 'error',
        message: result.error || 'Invalid promo code.',
      });
      return;
    }
    setPromoInput(result.code);
    setAppliedPromoCode(result.code);
    setPromoFeedback({
      type: 'success',
      message: `🎉 ${result.code} applied — ${result.percentOff}% off (-$${result.discountAmount.toFixed(2)})!`,
    });
    try {
      localStorage.setItem(PROMO_STORAGE_KEY, result.code);
    } catch {}
    trackCommerceEvent('ApplyCoupon', {
      coupon: result.code,
      discount: result.discountAmount,
    });
  };

  const handleRemovePromo = () => {
    setAppliedPromoCode(null);
    setPromoInput('');
    setPromoFeedback(null);
    try {
      localStorage.removeItem(PROMO_STORAGE_KEY);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!pricing.meetsMinimumOrder) {
      setErrorMsg(
        `Our small-batch order minimum is $${MIN_ORDER_SUBTOTAL.toFixed(2)} before discounts. Add a $2 velvet gift pouch or $3 ink refill pack above to continue!`
      );
      return;
    }
    if (step === 'info') {
      setStep('payment');
      return;
    }
    if (step === 'payment') {
      setLoading(true);
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            form,
            total: totalPrice,
            promoCode: pricing.coupon?.code || undefined,
            attribution: getSavedAttribution(),
          }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else if (data.error) {
          setErrorMsg(data.error);
        } else {
          setStep('confirm');
          clearCart();
        }
      } catch (_err) {
        setErrorMsg('Something went wrong while processing your checkout. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderPromoWidget = () => (
    <div className="pt-3 border-t space-y-2" style={{ borderColor: 'rgba(232,116,138,0.12)' }}>
      <label
        className="block text-[11px] uppercase tracking-wider font-semibold"
        style={{ color: 'rgba(245,239,230,0.65)' }}
      >
        🎁 Promo or Gift Code
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
          placeholder="Enter code (e.g. BONNIE10)"
          className="flex-1 px-3 py-2 rounded-lg text-xs uppercase tracking-wider outline-none"
          style={{
            background: 'rgba(26,15,36,0.85)',
            border: '1px solid rgba(232,116,138,0.25)',
            color: '#f5efe6',
          }}
        />
        <button
          type="button"
          onClick={() => handleApplyPromo()}
          className="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          style={{
            background: 'rgba(232,116,138,0.2)',
            color: '#e8748a',
            border: '1px solid rgba(232,116,138,0.35)',
          }}
        >
          Apply
        </button>
      </div>
      {!appliedPromoCode && (
        <button
          type="button"
          onClick={() => handleApplyPromo('BONNIE10')}
          className="text-[11px] text-amber-300 hover:underline cursor-pointer"
        >
          ✨ First time here? Tap to apply <strong>BONNIE10</strong> for 10% off!
        </button>
      )}
      {promoFeedback && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span
            style={{
              color: promoFeedback.type === 'success' ? '#6bcb77' : '#fca5a5',
            }}
          >
            {promoFeedback.message}
          </span>
          {appliedPromoCode && (
            <button
              type="button"
              onClick={handleRemovePromo}
              className="text-[11px] underline cursor-pointer"
              style={{ color: 'rgba(245,239,230,0.45)' }}
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderTotalsBreakdown = (compact = false) => (
    <div
      className={`border-t pt-3 space-y-2 ${compact ? 'text-xs' : 'text-sm'}`}
      style={{ borderColor: 'rgba(232,116,138,0.1)' }}
    >
      <div className="flex justify-between">
        <span style={{ color: 'rgba(245,239,230,0.55)' }}>Subtotal ({totalItems} items)</span>
        <span style={{ color: '#f5efe6' }}>${pricing.preDiscountSubtotal.toFixed(2)}</span>
      </div>
      {pricing.coupon && pricing.discountAmount > 0 && (
        <div className="flex justify-between text-emerald-400 font-medium">
          <span>
            Promo ({pricing.coupon.code} · {pricing.coupon.percentOff}% off)
          </span>
          <span>-${pricing.discountAmount.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span style={{ color: 'rgba(245,239,230,0.55)' }}>Shipping</span>
        <span
          className={pricing.shippingCost === 0 ? 'text-emerald-400 font-semibold' : ''}
          style={pricing.shippingCost === 0 ? undefined : { color: 'rgba(245,239,230,0.8)' }}
        >
          {pricing.shippingCost === 0 ? 'Free US Shipping' : `$${pricing.shippingCost.toFixed(2)}`}
        </span>
      </div>
      {pricing.shippingCost === 3.99 && (
        <p className="text-[11px] text-amber-300">
          ✨ Subsidized $3.99 USPS Ground Advantage rate unlocked ($15+ cart)!
        </p>
      )}
      <div
        className={`flex justify-between ${compact ? 'text-sm' : 'text-base'} font-bold pt-2 border-t`}
        style={{ borderColor: 'rgba(232,116,138,0.15)', color: '#f5efe6' }}
      >
        <span>Total</span>
        <span style={{ color: '#e8748a' }}>${pricing.finalTotal.toFixed(2)}</span>
      </div>
    </div>
  );

  if (items.length === 0 && step !== 'confirm') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#2d1b3d' }}>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="text-6xl mb-6">🛍️</div>
          <h2
            className="text-2xl font-serif mb-3"
            style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}
          >
            Your cart is empty
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(245,239,230,0.5)' }}>
            Add some handcrafted beaded pens or trinkets before checking out!
          </p>
          <Link
            href="/"
            className="btn-primary px-8 py-3 rounded-full font-semibold text-sm"
            style={{
              background: 'linear-gradient(135deg, #e8748a, #c44b63)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '9999px',
              padding: '12px 32px',
            }}
          >
            Shop Now
          </Link>
        </div>
        <StoreFooter />
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#2d1b3d' }}>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] text-center px-6 py-16">
          <div className="text-7xl mb-6 float-anim">✨</div>
          <h2
            className="text-3xl font-serif mb-3"
            style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}
          >
            Order Confirmed!
          </h2>
          <p className="text-base mb-2" style={{ color: 'rgba(245,239,230,0.7)' }}>
            Thank you, {form.firstName || 'friend'}! Bonnie &amp; Tammy have received your order in Clearbrook, VA.
          </p>
          {form.paymentMethod === 'venmo' && (
            <p
              className="text-sm mb-4 px-4 py-2 rounded-xl"
              style={{
                background: 'rgba(249,199,79,0.15)',
                color: '#f9c74f',
                border: '1px solid rgba(249,199,79,0.3)',
              }}
            >
              Please send your total via Venmo to <strong>{storeSettings.venmoHandle}</strong> to complete payment!
            </p>
          )}
          {form.paymentMethod === 'paypal' && storeSettings.paypalEmail && (
            <p
              className="text-sm mb-4 px-4 py-2 rounded-xl"
              style={{
                background: 'rgba(249,199,79,0.15)',
                color: '#f9c74f',
                border: '1px solid rgba(249,199,79,0.3)',
              }}
            >
              Please send your total via PayPal to <strong>{storeSettings.paypalEmail}</strong> to complete payment!
            </p>
          )}
          <p className="text-sm mb-3" style={{ color: 'rgba(245,239,230,0.55)' }}>
            Your USPS Ground Advantage tracking number will be emailed to {form.email || 'your inbox'} within 1–2 business days.
          </p>
          <p className="text-xs mb-10 text-amber-300">
            💝 Thank-you perk for your next visit: save 15% anytime with VIP code <strong>GRANDMA15</strong>!
          </p>
          <Link
            href="/"
            style={{
              background: 'linear-gradient(135deg, #e8748a, #c44b63)',
              color: 'white',
              padding: '12px 32px',
              borderRadius: '9999px',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Continue Shopping
          </Link>
        </div>
        <StoreFooter />
      </div>
    );
  }

  const steps = [
    { key: 'info', label: 'Contact & Shipping' },
    { key: 'payment', label: 'Payment' },
  ];

  const paymentOptions = [
    {
      key: 'stripe',
      enabled: true,
      label: 'Card, Apple Pay or Google Pay',
      sub: 'Visa, Mastercard, Amex, Apple Pay & Google Pay — 256-Bit SSL via Stripe',
      icon: '💳',
    },
    {
      key: 'venmo',
      enabled: storeSettings.enableVenmo,
      label: 'Venmo',
      sub: `Pay via Venmo ${storeSettings.venmoHandle}`,
      icon: '📱',
    },
    {
      key: 'paypal',
      enabled: storeSettings.enablePaypal,
      label: 'PayPal',
      sub: storeSettings.paypalEmail
        ? `Pay via PayPal (${storeSettings.paypalEmail})`
        : 'Secure payment via PayPal',
      icon: '🅿️',
    },
  ].filter((o) => o.enabled);

  return (
    <div className="min-h-screen" style={{ background: '#2d1b3d' }}>
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest transition-colors"
            style={{ color: 'rgba(245,239,230,0.4)' }}
          >
            ← Back to Shop
          </Link>
          <h1
            className="text-2xl sm:text-3xl font-serif mt-2"
            style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}
          >
            Secure Checkout
          </h1>
        </div>

        {/* $10 Minimum Order Helper Banner */}
        {!pricing.meetsMinimumOrder && (
          <div
            className="mb-6 rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{
              background: 'rgba(249, 199, 79, 0.12)',
              borderColor: 'rgba(249, 199, 79, 0.4)',
            }}
          >
            <div>
              <p className="text-sm font-semibold text-amber-200">
                🛍️ Add ${pricing.amountToMinimumOrder.toFixed(2)} more to reach our $10.00 small-batch minimum
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(245,239,230,0.7)' }}>
                Top up your cart in one click below without leaving checkout:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CART_IMPULSE_ADDONS.slice(0, 2).map((addon) => (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() =>
                    addItem({
                      id: addon.id,
                      title: addon.title,
                      price: addon.price,
                      imageUrl: addon.imageUrl,
                    })
                  }
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                    color: 'white',
                  }}
                >
                  + {addon.id === 'addon-ink-refill-3pk' ? '3pk Ink Refills ($3)' : 'Velvet Gift Pouch ($2)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={
                    step === s.key || (step === 'payment' && i === 0)
                      ? { background: '#e8748a', color: 'white' }
                      : {
                          background: 'rgba(61,37,82,0.6)',
                          color: 'rgba(245,239,230,0.4)',
                          border: '1px solid rgba(232,116,138,0.2)',
                        }
                  }
                >
                  {step === 'payment' && i === 0 ? '✓' : i + 1}
                </div>
                <span
                  className="text-sm hidden sm:block"
                  style={{ color: step === s.key ? '#f5efe6' : 'rgba(245,239,230,0.35)' }}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="w-8 sm:w-16 h-px mx-1" style={{ background: 'rgba(232,116,138,0.2)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Collapsible Mobile Order Summary + Always-Accessible Promo Box */}
        <div
          className="lg:hidden mb-6 rounded-2xl overflow-hidden border"
          style={{ background: 'rgba(26,15,36,0.7)', borderColor: 'rgba(232,116,138,0.2)' }}
        >
          <button
            type="button"
            onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
            className="w-full px-5 py-4 flex items-center justify-between text-left transition-colors"
            style={{ background: 'rgba(61,37,82,0.4)' }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[#f5efe6]">
              <span>🛍️</span>
              <span>{mobileSummaryOpen ? 'Hide order summary' : 'Order summary & promo code'}</span>
              <span className="text-xs text-[#e8748a] font-mono">({totalItems} items)</span>
              <span
                className="text-xs transform transition-transform"
                style={{ transform: mobileSummaryOpen ? 'rotate(180deg)' : 'none' }}
              >
                ▼
              </span>
            </div>
            <span className="text-base font-bold text-[#e8748a]">${pricing.finalTotal.toFixed(2)}</span>
          </button>

          <div className="px-5 pb-4">{renderPromoWidget()}</div>

          {mobileSummaryOpen && (
            <div className="p-5 border-t space-y-4" style={{ borderColor: 'rgba(232,116,138,0.15)' }}>
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ background: '#2d1b3d' }}
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <span>🔑</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: 'rgba(245,239,230,0.8)' }}>
                        {item.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(245,239,230,0.4)' }}>
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#e8748a' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {renderTotalsBreakdown(true)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
            {errorMsg && (
              <div
                className="rounded-xl p-4 text-xs font-medium"
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#fca5a5',
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            {step === 'info' && (
              <>
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'rgba(61,37,82,0.4)', border: '1px solid rgba(232,116,138,0.1)' }}
                >
                  <h3 className="text-base font-semibold mb-5" style={{ color: '#f5efe6' }}>
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-xs mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(245,239,230,0.5)' }}
                      >
                        First Name *
                      </label>
                      <input
                        value={form.firstName}
                        onChange={set('firstName')}
                        required
                        type="text"
                        autoComplete="given-name"
                        placeholder="Bonnie"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(245,239,230,0.5)' }}
                      >
                        Last Name *
                      </label>
                      <input
                        value={form.lastName}
                        onChange={set('lastName')}
                        required
                        type="text"
                        autoComplete="family-name"
                        placeholder="Smith"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div className="col-span-2">
                      <label
                        className="block text-xs mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(245,239,230,0.5)' }}
                      >
                        Email *
                      </label>
                      <input
                        value={form.email}
                        onChange={set('email')}
                        required
                        type="email"
                        autoComplete="email"
                        placeholder="bonnie@example.com"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div className="col-span-2">
                      <label
                        className="block text-xs mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(245,239,230,0.5)' }}
                      >
                        Phone
                      </label>
                      <input
                        value={form.phone}
                        onChange={set('phone')}
                        type="tel"
                        autoComplete="tel"
                        placeholder="+1 (555) 000-0000"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'rgba(61,37,82,0.4)', border: '1px solid rgba(232,116,138,0.1)' }}
                >
                  <h3 className="text-base font-semibold mb-5" style={{ color: '#f5efe6' }}>
                    Shipping Address
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label
                        className="block text-xs mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(245,239,230,0.5)' }}
                      >
                        Street Address *
                      </label>
                      <input
                        value={form.address}
                        onChange={set('address')}
                        required
                        type="text"
                        autoComplete="street-address"
                        placeholder="123 Main St, Apt 4B"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(245,239,230,0.5)' }}
                      >
                        City *
                      </label>
                      <input
                        value={form.city}
                        onChange={set('city')}
                        required
                        type="text"
                        autoComplete="address-level2"
                        placeholder="New York"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(245,239,230,0.5)' }}
                      >
                        State *
                      </label>
                      <input
                        value={form.state}
                        onChange={set('state')}
                        required
                        type="text"
                        autoComplete="address-level1"
                        placeholder="NY"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(245,239,230,0.5)' }}
                      >
                        ZIP Code *
                      </label>
                      <input
                        value={form.zip}
                        onChange={set('zip')}
                        required
                        type="text"
                        autoComplete="postal-code"
                        placeholder="10001"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(245,239,230,0.5)' }}
                      >
                        Country *
                      </label>
                      <select
                        value={form.country}
                        onChange={set('country')}
                        autoComplete="country"
                        className={inputClass}
                        style={inputStyle}
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                        <option value="MX">Mexico</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 'payment' && (
              <div
                className="rounded-2xl p-6"
                style={{ background: 'rgba(61,37,82,0.4)', border: '1px solid rgba(232,116,138,0.1)' }}
              >
                <h3 className="text-base font-semibold mb-5" style={{ color: '#f5efe6' }}>
                  Payment Method
                </h3>

                <div className="space-y-3 mb-6">
                  {paymentOptions.map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
                      style={{
                        background:
                          form.paymentMethod === opt.key ? 'rgba(232,116,138,0.12)' : 'rgba(26,15,36,0.5)',
                        border: `1px solid ${
                          form.paymentMethod === opt.key ? 'rgba(232,116,138,0.4)' : 'rgba(232,116,138,0.1)'
                        }`,
                      }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={opt.key}
                        checked={form.paymentMethod === (opt.key as 'stripe' | 'paypal' | 'venmo')}
                        onChange={set('paymentMethod')}
                        className="hidden"
                      />
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center"
                        style={{
                          borderColor: form.paymentMethod === opt.key ? '#e8748a' : 'rgba(232,116,138,0.3)',
                        }}
                      >
                        {form.paymentMethod === opt.key && (
                          <div className="w-2 h-2 rounded-full" style={{ background: '#e8748a' }} />
                        )}
                      </div>
                      <span className="text-xl">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#f5efe6' }}>
                          {opt.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(245,239,230,0.45)' }}>
                          {opt.sub}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Stripe notice */}
                {form.paymentMethod === 'stripe' && (
                  <div
                    className="rounded-xl p-4 space-y-2"
                    style={{ background: 'rgba(26,15,36,0.6)', border: '1px solid rgba(232,116,138,0.1)' }}
                  >
                    <p className="text-xs flex items-start gap-2" style={{ color: 'rgba(245,239,230,0.65)' }}>
                      <span>🔒</span>
                      <span>
                        You&apos;ll complete payment on Stripe&apos;s 256-bit SSL checkout with instant{' '}
                        <strong>Apple Pay</strong>, <strong>Google Pay</strong>, or any credit/debit card. Bonnie&apos;s Boutique never stores your card details.
                      </span>
                    </p>
                  </div>
                )}

                {(form.paymentMethod === 'paypal' || form.paymentMethod === 'venmo') && (
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(26,15,36,0.6)', border: '1px solid rgba(249,199,79,0.2)' }}
                  >
                    <p className="text-xs flex items-start gap-2" style={{ color: 'rgba(249,199,79,0.8)' }}>
                      <span>⚠️</span>
                      <span>
                        {form.paymentMethod === 'paypal'
                          ? storeSettings.paypalEmail
                            ? `After placing your order, please send $${pricing.finalTotal.toFixed(2)} via PayPal to ${storeSettings.paypalEmail}.`
                            : "After placing your order, you'll be contacted with a PayPal payment link."
                          : `After placing your order, please send $${pricing.finalTotal.toFixed(2)} to ${storeSettings.venmoHandle} on Venmo. We'll confirm once received!`}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {step === 'payment' && (
                <button
                  type="button"
                  onClick={() => setStep('info')}
                  className="flex-1 py-3.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(61,37,82,0.5)',
                    color: 'rgba(245,239,230,0.6)',
                    border: '1px solid rgba(232,116,138,0.1)',
                  }}
                >
                  ← Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !pricing.meetsMinimumOrder}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(232,116,138,0.3)',
                }}
              >
                {loading
                  ? 'Processing...'
                  : step === 'info'
                  ? 'Continue to Payment →'
                  : `Pay $${pricing.finalTotal.toFixed(2)} Securely →`}
              </button>
            </div>
          </form>

          {/* Desktop Order Summary */}
          <div className="lg:col-span-2 hidden lg:block">
            <div
              className="rounded-2xl p-6 sticky top-24 space-y-5"
              style={{ background: 'rgba(26,15,36,0.7)', border: '1px solid rgba(232,116,138,0.15)' }}
            >
              <h3 className="text-base font-semibold" style={{ color: '#f5efe6' }}>
                Order Summary
              </h3>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ background: '#2d1b3d' }}
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <span>🔑</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: 'rgba(245,239,230,0.8)' }}>
                        {item.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(245,239,230,0.4)' }}>
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold flex-shrink-0" style={{ color: '#e8748a' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {renderPromoWidget()}
              {renderTotalsBreakdown(false)}

              {!pricing.isFreeShipping && (
                <div
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    background: 'rgba(61,37,82,0.4)',
                    border: '1px solid rgba(232,116,138,0.18)',
                  }}
                >
                  <p className="text-xs text-center" style={{ color: 'rgba(245,239,230,0.75)' }}>
                    Add <strong className="text-[#e8748a]">${pricing.amountToFreeShipping.toFixed(2)}</strong> more (before discounts) for <strong>FREE US shipping</strong>!
                  </p>
                  {pricing.amountToFreeShipping <= 6.0 && (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {CART_IMPULSE_ADDONS.slice(0, 2).map((addon) => (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() =>
                            addItem({
                              id: addon.id,
                              title: addon.title,
                              price: addon.price,
                              imageUrl: addon.imageUrl,
                            })
                          }
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer"
                          style={{
                            background: 'rgba(232,116,138,0.2)',
                            color: '#f5efe6',
                            border: '1px solid rgba(232,116,138,0.3)',
                          }}
                        >
                          + {addon.id === 'addon-ink-refill-3pk' ? '3pk Refills ($3)' : 'Velvet Pouch ($2)'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t space-y-1.5" style={{ borderColor: 'rgba(232,116,138,0.08)' }}>
                <p className="text-xs text-center" style={{ color: 'rgba(245,239,230,0.6)' }}>
                  🔒 256-Bit SSL · Stripe · Apple Pay · Google Pay
                </p>
                <p className="text-[11px] text-center" style={{ color: 'rgba(245,239,230,0.4)' }}>
                  Ships in 1–2 business days from Clearbrook, VA · 14-day hassle-free returns
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
