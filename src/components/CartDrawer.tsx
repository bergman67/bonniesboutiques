'use client';

import { useCart } from '@/context/CartContext';
import {
  CART_IMPULSE_ADDONS,
  MIN_ORDER_SUBTOTAL,
  SUBSIDIZED_SHIPPING_SUBTOTAL,
} from '@/lib/coupons';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const UPSELL_CANDIDATES = [
  {
    id: 'cmu1mpizd0001fsjlzee32zkl',
    title: 'Golden Orange Paw Print Keychain',
    price: 8.0,
    imageUrl: 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/transparent/transparent-1789413688662-2-IMG_8919.png',
  },
  {
    id: 'cmu1mpja40002fsjljykvy8dl',
    title: 'Playful Puppy Green Beaded Keychain',
    price: 8.0,
    imageUrl: 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/transparent/transparent-1789413689024-3-IMG_8920.png',
  },
  {
    id: 'cmu1mpjin0003fsjlovg6976m',
    title: 'Sweet Black & Tan Puppy Keychain',
    price: 8.0,
    imageUrl: 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/transparent/transparent-1789413689415-4-IMG_8921.png',
  },
];

export default function CartDrawer() {
  const { items, isOpen, closeCart, addItem, removeItem, updateQuantity, totalItems, totalPrice } = useCart();
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(25.0);

  // Fetch freeShippingThreshold from /api/settings on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/settings')
      .then((res) => {
        if (!res.ok) throw new Error('Settings fetch failed');
        return res.json();
      })
      .then((data) => {
        if (isMounted && typeof data.freeShippingThreshold === 'number' && data.freeShippingThreshold > 0) {
          setFreeShippingThreshold(data.freeShippingThreshold);
        }
      })
      .catch(() => {
        // Fallback standardized to 25.00
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const threshold = freeShippingThreshold > 0 ? freeShippingThreshold : 25.0;
  const isFreeShipping = totalPrice >= threshold;
  const amountRemaining = Math.max(0, threshold - totalPrice);
  const progressPercent = Math.min(100, Math.max(0, (totalPrice / threshold) * 100));
  const isBelowMinOrder = totalPrice > 0 && totalPrice < MIN_ORDER_SUBTOTAL;
  const amountToMinOrder = Math.max(0, MIN_ORDER_SUBTOTAL - totalPrice);
  const hasSubsidizedShipping = !isFreeShipping && totalPrice >= SUBSIDIZED_SHIPPING_SUBTOTAL;

  const recommendedItem = UPSELL_CANDIDATES.find(c => !items.some(item => item.id === c.id)) || UPSELL_CANDIDATES[0];
  const availableAddons = CART_IMPULSE_ADDONS.filter(a => !items.some(item => item.id === a.id));

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 z-[55] transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-[60] flex flex-col"
        style={{
          width: 'min(420px, 100vw)',
          background: '#1a0f24',
          borderLeft: '1px solid rgba(232, 116, 138, 0.2)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
          boxShadow: isOpen ? '-20px 0 60px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(232,116,138,0.15)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#f5efe6' }}>Your Cart</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(245,239,230,0.4)' }}>
              {totalItems === 0 ? 'No items yet' : `${totalItems} item${totalItems !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer"
            style={{ background: 'rgba(232,116,138,0.1)', color: '#e8748a' }}
          >
            ✕
          </button>
        </div>

        {/* Dynamic Free Shipping Progress Bar */}
        <div
          className="px-6 py-3.5 border-b"
          style={{
            borderColor: 'rgba(232, 116, 138, 0.15)',
            background: 'rgba(45, 27, 61, 0.45)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
            {isFreeShipping ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span>🎉</span> You&apos;ve unlocked FREE Shipping!
              </span>
            ) : (
              <span style={{ color: 'rgba(245, 239, 230, 0.9)' }}>
                Add <span className="font-bold text-[#e8748a]">${amountRemaining.toFixed(2)}</span> more for FREE shipping!
              </span>
            )}
            <span className="text-[11px] font-mono" style={{ color: 'rgba(245, 239, 230, 0.5)' }}>
              ${totalPrice.toFixed(2)} / ${threshold.toFixed(2)}
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: 'rgba(26, 15, 36, 0.8)' }}
          >
            <div
              className="h-full transition-all duration-300 ease-out rounded-full"
              style={{
                width: `${progressPercent}%`,
                background: isFreeShipping
                  ? '#10b981'
                  : 'linear-gradient(90deg, #e8748a, #c44b63)',
              }}
            />
          </div>
          {hasSubsidizedShipping && (
            <p className="text-[11px] mt-1.5 text-amber-300 font-medium">
              ✨ $3.99 subsidized USPS shipping unlocked! Add ${amountRemaining.toFixed(2)} more for FREE shipping.
            </p>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="text-5xl mb-4">🛍️</div>
              <p className="text-base font-serif mb-2" style={{ color: '#f5efe6' }}>Your cart is empty</p>
              <p className="text-sm mb-6" style={{ color: 'rgba(245,239,230,0.4)' }}>Add some trinkets to get started!</p>
              <button onClick={closeCart} className="btn-primary px-6 py-2 rounded-full text-sm font-semibold cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', border: 'none' }}>
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-4 p-3 rounded-xl" style={{ background: 'rgba(61,37,82,0.4)', border: '1px solid rgba(232,116,138,0.1)' }}>
                {/* Image */}
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#2d1b3d' }}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-2xl">🔑</span>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#f5efe6' }}>{item.title}</p>
                  <p className="text-sm font-bold mt-1" style={{ color: '#e8748a' }}>${item.price.toFixed(2)}</p>
                  {/* Quantity controls */}
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                      style={{ background: 'rgba(232,116,138,0.15)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.3)' }}
                    >−</button>
                    <span className="text-sm font-medium w-4 text-center" style={{ color: '#f5efe6' }}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                      style={{ background: 'rgba(232,116,138,0.15)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.3)' }}
                    >+</button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto text-xs transition-colors cursor-pointer"
                      style={{ color: 'rgba(245,239,230,0.3)' }}
                    >Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t space-y-3.5" style={{ borderColor: 'rgba(232,116,138,0.15)' }}>
            {/* $10.00 Minimum Order Booster */}
            {isBelowMinOrder && (
              <div
                className="p-3 rounded-xl border space-y-2"
                style={{
                  background: 'rgba(249, 199, 79, 0.1)',
                  borderColor: 'rgba(249, 199, 79, 0.35)',
                }}
              >
                <p className="text-xs font-medium text-amber-200">
                  🛍️ Add <strong>${amountToMinOrder.toFixed(2)}</strong> more to reach our $10.00 small-batch minimum:
                </p>
                <div className="flex flex-wrap gap-1.5">
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
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
                      style={{
                        background: 'rgba(232,116,138,0.2)',
                        color: '#f5efe6',
                        border: '1px solid rgba(232,116,138,0.35)',
                      }}
                    >
                      + {addon.id === 'addon-ink-refill-3pk' ? '3pk Ink Refills' : 'Velvet Gift Pouch'} (${addon.price.toFixed(2)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 1-Click Upsell Booster to Reach Free Shipping */}
            {!isFreeShipping && !isBelowMinOrder && (
              <div
                className="p-3 rounded-xl border transition-all space-y-2.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(61,37,82,0.7), rgba(45,27,61,0.9))',
                  borderColor: 'rgba(232, 116, 138, 0.25)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-300 flex items-center gap-1">
                    <span>⚡</span>
                    {amountRemaining <= 6.0
                      ? `Just $${amountRemaining.toFixed(2)} away from FREE shipping!`
                      : 'Free Shipping Booster'}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(232,116,138,0.15)',
                      color: '#e8748a',
                      border: '1px solid rgba(232,116,138,0.3)',
                    }}
                  >
                    1-Click Add
                  </span>
                </div>

                {amountRemaining <= 6.0 && availableAddons.length > 0 ? (
                  <div className="space-y-2">
                    {availableAddons.slice(0, 2).map((addon) => (
                      <div key={addon.id} className="flex items-center justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate" style={{ color: '#f5efe6' }}>
                            {addon.title}
                          </p>
                          <p className="text-[11px]" style={{ color: 'rgba(245,239,230,0.55)' }}>
                            {addon.subtitle}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            addItem({
                              id: addon.id,
                              title: addon.title,
                              price: addon.price,
                              imageUrl: addon.imageUrl,
                            })
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                          style={{
                            background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                            color: 'white',
                            boxShadow: '0 2px 10px rgba(232,116,138,0.3)',
                          }}
                        >
                          + Add (${addon.price.toFixed(2)})
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-1"
                        style={{ background: '#2d1b3d', border: '1px solid rgba(232,116,138,0.15)' }}
                      >
                        {recommendedItem.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={recommendedItem.imageUrl} alt={recommendedItem.title} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xl">✨</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: '#f5efe6' }}>{recommendedItem.title}</p>
                        <p className="text-xs font-bold mt-0.5" style={{ color: '#e8748a' }}>${recommendedItem.price.toFixed(2)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addItem(recommendedItem)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                        style={{
                          background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                          color: 'white',
                          boxShadow: '0 2px 10px rgba(232,116,138,0.3)',
                        }}
                      >
                        + Add ($8)
                      </button>
                    </div>
                    {availableAddons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t" style={{ borderColor: 'rgba(232,116,138,0.12)' }}>
                        {availableAddons.slice(0, 2).map((addon) => (
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
                            className="px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                            style={{
                              background: 'rgba(26,15,36,0.6)',
                              color: 'rgba(245,239,230,0.8)',
                              border: '1px solid rgba(232,116,138,0.2)',
                            }}
                          >
                            + {addon.id === 'addon-ink-refill-3pk' ? '3pk Ink Refills ($3)' : 'Velvet Gift Pouch ($2)'}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'rgba(245,239,230,0.6)' }}>Subtotal</span>
              <span className="text-xl font-bold" style={{ color: '#f5efe6' }}>${totalPrice.toFixed(2)}</span>
            </div>
            <p className="text-xs text-center" style={{ color: 'rgba(245,239,230,0.45)' }}>
              Promo codes (try <strong>BONNIE10</strong>) &amp; shipping applied at checkout
            </p>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full text-center py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all"
              style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', boxShadow: '0 4px 15px rgba(232,116,138,0.3)' }}
            >
              Proceed to Checkout →
            </Link>
            <p className="text-[11px] text-center" style={{ color: 'rgba(245,239,230,0.45)' }}>
              🔒 SSL Encrypted · 💳 Stripe ·  Apple Pay · G Pay
            </p>
            <button
              onClick={closeCart}
              className="block w-full text-center py-1.5 text-sm transition-colors cursor-pointer"
              style={{ color: 'rgba(245,239,230,0.4)' }}
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
