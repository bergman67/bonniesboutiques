'use client';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { useEffect } from 'react';

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalItems, totalPrice } = useCart();

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
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
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
            className="w-9 h-9 flex items-center justify-center rounded-full transition-all"
            style={{ background: 'rgba(232,116,138,0.1)', color: '#e8748a' }}
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="text-5xl mb-4">🛍️</div>
              <p className="text-base font-serif mb-2" style={{ color: '#f5efe6' }}>Your cart is empty</p>
              <p className="text-sm mb-6" style={{ color: 'rgba(245,239,230,0.4)' }}>Add some trinkets to get started!</p>
              <button onClick={closeCart} className="btn-primary px-6 py-2 rounded-full text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', border: 'none', cursor: 'pointer' }}>
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
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                      style={{ background: 'rgba(232,116,138,0.15)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.3)' }}
                    >−</button>
                    <span className="text-sm font-medium w-4 text-center" style={{ color: '#f5efe6' }}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                      style={{ background: 'rgba(232,116,138,0.15)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.3)' }}
                    >+</button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto text-xs transition-colors"
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
          <div className="px-6 py-5 border-t space-y-4" style={{ borderColor: 'rgba(232,116,138,0.15)' }}>
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'rgba(245,239,230,0.6)' }}>Subtotal</span>
              <span className="text-xl font-bold" style={{ color: '#f5efe6' }}>${totalPrice.toFixed(2)}</span>
            </div>
            <p className="text-xs text-center" style={{ color: 'rgba(245,239,230,0.35)' }}>
              Shipping & taxes calculated at checkout
            </p>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full text-center py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all"
              style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', boxShadow: '0 4px 15px rgba(232,116,138,0.3)' }}
            >
              Proceed to Checkout →
            </Link>
            <button
              onClick={closeCart}
              className="block w-full text-center py-2 text-sm transition-colors"
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
