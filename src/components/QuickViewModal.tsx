'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { getProductCategory, stripCategoryTag } from '@/lib/categories';

export interface QuickViewProduct {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  description?: string | null;
}

interface QuickViewModalProps {
  product: QuickViewProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll when modal is open without altering scroll position
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Auto-focus close button for screen reader / keyboard accessibility
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) {
    return null;
  }

  const category = getProductCategory(product.title, product.description);
  const price = product.price ?? 8.0;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      title: product.title,
      imageUrl: product.imageUrl,
      price,
    });
    setJustAdded(true);
    // Smoothly close modal after brief visual feedback so CartDrawer slides out cleanly
    setTimeout(() => {
      setJustAdded(false);
      onClose();
    }, 450);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{
        background: 'rgba(10, 5, 15, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        // Close when clicking outer backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl transition-all"
        style={{
          background: '#1a0f24',
          border: '1px solid rgba(232, 116, 138, 0.25)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(232, 116, 138, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#e8748a]"
          style={{
            background: 'rgba(232, 116, 138, 0.12)',
            color: '#e8748a',
            border: '1px solid rgba(232, 116, 138, 0.25)',
          }}
        >
          ✕
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 p-6 sm:p-8">
          {/* Left Column: Enlarged Product Image */}
          <div
            className="aspect-square rounded-xl overflow-hidden flex items-center justify-center relative p-2 sm:p-4"
            style={{
              background: 'radial-gradient(circle, rgba(232, 116, 138, 0.15) 0%, rgba(45, 27, 61, 0.5) 70%, rgba(26, 15, 36, 0.9) 100%)',
              border: '1px solid rgba(232, 116, 138, 0.15)',
            }}
          >
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <div className="text-6xl">🔑</div>
            )}
          </div>

          {/* Right Column: Product Details */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Category & Scarcity badge */}
              <div className="mb-3 flex items-center gap-2 flex-wrap">
                <span
                  className="inline-block text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full"
                  style={{
                    background: 'rgba(232, 116, 138, 0.15)',
                    color: '#e8748a',
                    border: '1px solid rgba(232, 116, 138, 0.3)',
                  }}
                >
                  {category}
                </span>
                <span
                  className="inline-block text-xs font-medium tracking-wide px-2.5 py-1 rounded-full text-amber-300"
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                  }}
                >
                  ✦ 1 of 1 Unique
                </span>
              </div>

              {/* Title */}
              <h2
                id="quick-view-title"
                className="text-2xl sm:text-3xl font-serif font-bold leading-tight"
                style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}
              >
                {product.title}
              </h2>

              {/* Price */}
              <p className="text-2xl font-bold mt-3" style={{ color: '#e8748a' }}>
                ${price.toFixed(2)}
              </p>

              {/* Description */}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(232, 116, 138, 0.15)' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(245, 239, 230, 0.8)' }}>
                  {stripCategoryTag(product.description) ||
                    'Handcrafted with love and premium beads by Bonnie & Tammy. Each one is a unique, one-of-a-kind keepsake.'}
                </p>
              </div>

              {/* Trust highlights */}
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs" style={{ color: 'rgba(245, 239, 230, 0.6)' }}>
                <div className="flex items-center gap-1.5">
                  <span>✨</span>
                  <span>100% Handmade</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>📦</span>
                  <span>Fast shipping</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm tracking-wide text-white transition-all transform active:scale-98 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  background: justAdded
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #e8748a, #c44b63)',
                  boxShadow: justAdded
                    ? '0 6px 20px rgba(16, 185, 129, 0.4)'
                    : '0 6px 20px rgba(232, 116, 138, 0.35)',
                }}
              >
                {justAdded ? (
                  <>
                    <span>✓</span>
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    <span>Add to Cart · ${price.toFixed(2)}</span>
                  </>
                )}
              </button>

              <Link
                href={`/products/${product.id}`}
                onClick={onClose}
                className="block text-center text-xs tracking-wider transition-colors hover:underline"
                style={{ color: 'rgba(245, 239, 230, 0.5)' }}
              >
                View full product details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
