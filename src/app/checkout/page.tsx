'use client';

import { useCart } from '@/context/CartContext';
import Header from '@/components/Header';
import Link from 'next/link';
import { useState, useEffect } from 'react';

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
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const [step, setStep] = useState<'info' | 'payment' | 'confirm'>('info');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [storeSettings, setStoreSettings] = useState<PublicSettings>({
    enableStripe: true,
    enableVenmo: true,
    enablePaypal: true,
    venmoHandle: '@BonniesBoutique',
    paypalEmail: null,
    shippingFlatRate: 3.99,
    freeShippingThreshold: 20.0,
    stripeConfigured: true,
  });

  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '', country: 'US',
    paymentMethod: 'stripe',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setStoreSettings(data);
          // Default to first available payment method if Stripe isn't enabled/configured
          if (!data.enableStripe) {
            if (data.enableVenmo) setForm((f) => ({ ...f, paymentMethod: 'venmo' }));
            else if (data.enablePaypal) setForm((f) => ({ ...f, paymentMethod: 'paypal' }));
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      const orderId = urlParams.get('order_id');
      if (sessionId) {
        setStep('confirm');
        clearCart();
        fetch('/api/checkout', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, sessionId }),
        }).catch(() => {});
      }
    }
  }, [clearCart]);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 transition-all";
  const inputStyle = {
    background: 'rgba(26,15,36,0.7)',
    border: '1px solid rgba(232,116,138,0.2)',
    color: '#f5efe6',
  };

  const shippingCost = totalPrice >= storeSettings.freeShippingThreshold ? 0 : storeSettings.shippingFlatRate;
  const finalTotal = totalPrice + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (step === 'info') { setStep('payment'); return; }
    if (step === 'payment') {
      setLoading(true);
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, form, total: totalPrice }),
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

  if (items.length === 0 && step !== 'confirm') {
    return (
      <div className="min-h-screen" style={{ background: '#2d1b3d' }}>
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="text-6xl mb-6">🛍️</div>
          <h2 className="text-2xl font-serif mb-3" style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>
            Your cart is empty
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(245,239,230,0.5)' }}>
            Add some trinkets before checking out!
          </p>
          <Link href="/" className="btn-primary px-8 py-3 rounded-full font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', textDecoration: 'none', borderRadius: '9999px', padding: '12px 32px' }}>
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="min-h-screen" style={{ background: '#2d1b3d' }}>
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 py-16">
          <div className="text-7xl mb-6 float-anim">✨</div>
          <h2 className="text-3xl font-serif mb-3" style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>
            Order Confirmed!
          </h2>
          <p className="text-base mb-2" style={{ color: 'rgba(245,239,230,0.7)' }}>
            Thank you, {form.firstName || 'friend'}! Your order has been received.
          </p>
          {form.paymentMethod === 'venmo' && (
            <p className="text-sm mb-4 px-4 py-2 rounded-xl" style={{ background: 'rgba(249,199,79,0.15)', color: '#f9c74f', border: '1px solid rgba(249,199,79,0.3)' }}>
              Please send your total via Venmo to <strong>{storeSettings.venmoHandle}</strong> to complete payment!
            </p>
          )}
          {form.paymentMethod === 'paypal' && storeSettings.paypalEmail && (
            <p className="text-sm mb-4 px-4 py-2 rounded-xl" style={{ background: 'rgba(249,199,79,0.15)', color: '#f9c74f', border: '1px solid rgba(249,199,79,0.3)' }}>
              Please send your total via PayPal to <strong>{storeSettings.paypalEmail}</strong> to complete payment!
            </p>
          )}
          <p className="text-sm mb-10" style={{ color: 'rgba(245,239,230,0.45)' }}>
            Updates will be sent to {form.email || 'your email'}.
          </p>
          <Link href="/" style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', padding: '12px 32px', borderRadius: '9999px', fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}>
            Continue Shopping
          </Link>
        </div>
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
      enabled: true, // Always show so customer/admin sees it; backend handles if unconfigured
      label: 'Credit / Debit Card',
      sub: 'Visa, Mastercard, Amex, Apple Pay — Powered by Stripe',
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
      sub: storeSettings.paypalEmail ? `Pay via PayPal (${storeSettings.paypalEmail})` : 'Secure payment via PayPal',
      icon: '🅿️',
    },
  ].filter(o => o.enabled);

  return (
    <div className="min-h-screen" style={{ background: '#2d1b3d' }}>
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <Link href="/" className="text-xs uppercase tracking-widest transition-colors"
            style={{ color: 'rgba(245,239,230,0.4)' }}>← Back to Shop</Link>
          <h1 className="text-2xl sm:text-3xl font-serif mt-2" style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}>
            Checkout
          </h1>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={step === s.key || (step === 'payment' && i === 0)
                    ? { background: '#e8748a', color: 'white' }
                    : { background: 'rgba(61,37,82,0.6)', color: 'rgba(245,239,230,0.4)', border: '1px solid rgba(232,116,138,0.2)' }}>
                  {step === 'payment' && i === 0 ? '✓' : i + 1}
                </div>
                <span className="text-sm hidden sm:block"
                  style={{ color: step === s.key ? '#f5efe6' : 'rgba(245,239,230,0.35)' }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="w-8 sm:w-16 h-px mx-1" style={{ background: 'rgba(232,116,138,0.2)' }} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
            {errorMsg && (
              <div className="rounded-xl p-4 text-xs font-medium" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {step === 'info' && (
              <>
                <div className="rounded-2xl p-6" style={{ background: 'rgba(61,37,82,0.4)', border: '1px solid rgba(232,116,138,0.1)' }}>
                  <h3 className="text-base font-semibold mb-5" style={{ color: '#f5efe6' }}>Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.5)' }}>First Name *</label>
                      <input value={form.firstName} onChange={set('firstName')} required type="text" placeholder="Bonnie" className={inputClass} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.5)' }}>Last Name *</label>
                      <input value={form.lastName} onChange={set('lastName')} required type="text" placeholder="Smith" className={inputClass} style={inputStyle} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.5)' }}>Email *</label>
                      <input value={form.email} onChange={set('email')} required type="email" placeholder="bonnie@example.com" className={inputClass} style={inputStyle} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.5)' }}>Phone</label>
                      <input value={form.phone} onChange={set('phone')} type="tel" placeholder="+1 (555) 000-0000" className={inputClass} style={inputStyle} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-6" style={{ background: 'rgba(61,37,82,0.4)', border: '1px solid rgba(232,116,138,0.1)' }}>
                  <h3 className="text-base font-semibold mb-5" style={{ color: '#f5efe6' }}>Shipping Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.5)' }}>Street Address *</label>
                      <input value={form.address} onChange={set('address')} required type="text" placeholder="123 Main St, Apt 4B" className={inputClass} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.5)' }}>City *</label>
                      <input value={form.city} onChange={set('city')} required type="text" placeholder="New York" className={inputClass} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.5)' }}>State *</label>
                      <input value={form.state} onChange={set('state')} required type="text" placeholder="NY" className={inputClass} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.5)' }}>ZIP Code *</label>
                      <input value={form.zip} onChange={set('zip')} required type="text" placeholder="10001" className={inputClass} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.5)' }}>Country *</label>
                      <select value={form.country} onChange={set('country')} className={inputClass} style={inputStyle}>
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
              <div className="rounded-2xl p-6" style={{ background: 'rgba(61,37,82,0.4)', border: '1px solid rgba(232,116,138,0.1)' }}>
                <h3 className="text-base font-semibold mb-5" style={{ color: '#f5efe6' }}>Payment Method</h3>

                <div className="space-y-3 mb-6">
                  {paymentOptions.map(opt => (
                    <label key={opt.key} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: form.paymentMethod === opt.key ? 'rgba(232,116,138,0.12)' : 'rgba(26,15,36,0.5)',
                        border: `1px solid ${form.paymentMethod === opt.key ? 'rgba(232,116,138,0.4)' : 'rgba(232,116,138,0.1)'}`,
                      }}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={opt.key}
                        checked={form.paymentMethod === opt.key as 'stripe' | 'paypal' | 'venmo'}
                        onChange={set('paymentMethod')}
                        className="hidden"
                      />
                      <div className="w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center"
                        style={{ borderColor: form.paymentMethod === opt.key ? '#e8748a' : 'rgba(232,116,138,0.3)' }}>
                        {form.paymentMethod === opt.key && (
                          <div className="w-2 h-2 rounded-full" style={{ background: '#e8748a' }} />
                        )}
                      </div>
                      <span className="text-xl">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#f5efe6' }}>{opt.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(245,239,230,0.45)' }}>{opt.sub}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Stripe notice */}
                {form.paymentMethod === 'stripe' && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(26,15,36,0.6)', border: '1px solid rgba(232,116,138,0.1)' }}>
                    <p className="text-xs flex items-start gap-2" style={{ color: 'rgba(245,239,230,0.5)' }}>
                      <span>🔒</span>
                      <span>You will be securely redirected to Stripe to enter your card details. We never store your card information.</span>
                    </p>
                  </div>
                )}

                {(form.paymentMethod === 'paypal' || form.paymentMethod === 'venmo') && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(26,15,36,0.6)', border: '1px solid rgba(249,199,79,0.2)' }}>
                    <p className="text-xs flex items-start gap-2" style={{ color: 'rgba(249,199,79,0.8)' }}>
                      <span>⚠️</span>
                      <span>
                        {form.paymentMethod === 'paypal'
                          ? (storeSettings.paypalEmail
                            ? `After placing your order, please send $${finalTotal.toFixed(2)} via PayPal to ${storeSettings.paypalEmail}.`
                            : 'After placing your order, you\'ll be contacted with a PayPal payment link.')
                          : `After placing your order, please send $${finalTotal.toFixed(2)} to ${storeSettings.venmoHandle} on Venmo. We'll confirm once received!`}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {step === 'payment' && (
                <button type="button" onClick={() => setStep('info')}
                  className="flex-1 py-3.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(61,37,82,0.5)', color: 'rgba(245,239,230,0.6)', border: '1px solid rgba(232,116,138,0.1)' }}>
                  ← Back
                </button>
              )}
              <button type="submit" disabled={loading}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', boxShadow: '0 4px 15px rgba(232,116,138,0.3)' }}>
                {loading ? 'Processing...' : step === 'info' ? 'Continue to Payment →' : 'Place Order →'}
              </button>
            </div>
          </form>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl p-6 sticky top-24" style={{ background: 'rgba(26,15,36,0.7)', border: '1px solid rgba(232,116,138,0.15)' }}>
              <h3 className="text-base font-semibold mb-5" style={{ color: '#f5efe6' }}>Order Summary</h3>

              <div className="space-y-3 mb-5 max-h-64 overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ background: '#2d1b3d' }}>
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain p-1" />
                      ) : <span>🔑</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: 'rgba(245,239,230,0.8)' }}>{item.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(245,239,230,0.4)' }}>Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold flex-shrink-0" style={{ color: '#e8748a' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2" style={{ borderColor: 'rgba(232,116,138,0.1)' }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(245,239,230,0.5)' }}>Subtotal ({totalItems} items)</span>
                  <span style={{ color: '#f5efe6' }}>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(245,239,230,0.5)' }}>Shipping</span>
                  <span style={{ color: 'rgba(245,239,230,0.7)' }}>
                    {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t" style={{ borderColor: 'rgba(232,116,138,0.15)', color: '#f5efe6' }}>
                  <span>Total</span>
                  <span style={{ color: '#e8748a' }}>
                    ${finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {totalPrice < storeSettings.freeShippingThreshold && (
                <p className="text-xs mt-3 text-center" style={{ color: 'rgba(245,239,230,0.4)' }}>
                  Add ${(storeSettings.freeShippingThreshold - totalPrice).toFixed(2)} more for free shipping!
                </p>
              )}

              <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(232,116,138,0.08)' }}>
                <p className="text-xs text-center" style={{ color: 'rgba(245,239,230,0.3)' }}>
                  🔒 Secure & encrypted checkout
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-20 py-8 text-center border-t" style={{ borderColor: 'rgba(232,116,138,0.1)', background: '#1a0f24' }}>
        <p className="text-xs" style={{ color: 'rgba(245,239,230,0.35)' }}>
          &copy; {new Date().getFullYear()} Bonnie&apos;s Boutique · Handcrafted with love
        </p>
      </footer>
    </div>
  );
}
