'use client';

import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { ProductItem } from './LevitatingProductViewer';

interface ProductHUDProps {
  product: ProductItem;
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
  visible?: boolean;
}

export default function ProductHUD({
  product,
  currentIndex,
  totalCount,
  onPrev,
  onNext,
  visible = true,
}: ProductHUDProps) {
  const { addItem } = useCart();
  const [addedAnimation, setAddedAnimation] = useState(false);

  const price = product.price ?? 8.0;
  const formattedPrice = `$${price.toFixed(2)}`;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      title: product.title,
      imageUrl: product.imageUrl ?? null,
      price: price,
    });
    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
    }, 1800);
  };

  return (
    <div
      className={`absolute inset-x-0 bottom-6 sm:bottom-12 z-20 flex justify-center px-4 transition-all duration-700 pointer-events-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
      }`}
    >
      <div
        className="pointer-events-auto max-w-xl w-full rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-md border border-rose-400/20"
        style={{
          background: 'linear-gradient(135deg, rgba(26, 15, 36, 0.92) 0%, rgba(45, 27, 61, 0.92) 100%)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(232, 116, 138, 0.15)',
        }}
      >
        {/* Header Metadata Bar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase px-2.5 py-1 rounded-full border border-rose-400/30"
            style={{ color: '#e8748a', background: 'rgba(232, 116, 138, 0.1)' }}
          >
            ✦ CHARM {String(currentIndex + 1).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}
          </span>

          <span
            className="text-lg sm:text-xl font-bold font-mono px-3 py-0.5 rounded-lg border border-amber-400/30"
            style={{ color: '#fbbf24', background: 'rgba(251, 191, 36, 0.08)' }}
          >
            {formattedPrice}
          </span>
        </div>

        {/* Product Title & Description */}
        <div className="mb-5">
          <h2
            className="text-xl sm:text-2xl md:text-3xl font-serif text-cream-100 mb-2 leading-tight transition-all duration-300"
            style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}
          >
            {product.title}
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-cream-200/70 line-clamp-2">
            {product.description ||
              'Handcrafted with mystical love and care by Bonnie. An enchanting keepsake carrying a little bit of magic wherever you wander.'}
          </p>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-rose-400/15">
          {/* Previous Button */}
          <button
            onClick={onPrev}
            aria-label="Previous product"
            className="group flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border border-rose-400/25 hover:border-rose-400/60 hover:bg-rose-500/10 text-cream-100 active:scale-95"
            style={{ background: 'rgba(26, 15, 36, 0.6)' }}
          >
            <span className="transition-transform group-hover:-translate-x-0.5 text-rose-400">‹</span>
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Add to Cart CTA */}
          <button
            onClick={handleAddToCart}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-5 rounded-xl font-semibold text-xs sm:text-sm tracking-wider uppercase transition-all shadow-lg active:scale-98 ${
              addedAnimation
                ? 'bg-emerald-600 text-white shadow-emerald-600/40'
                : 'btn-primary text-white hover:shadow-rose-500/30'
            }`}
          >
            {addedAnimation ? (
              <>
                <span>✓</span>
                <span>Added to Basket!</span>
              </>
            ) : (
              <>
                <span>✦</span>
                <span>Claim This Relic ({formattedPrice})</span>
              </>
            )}
          </button>

          {/* Next Button */}
          <button
            onClick={onNext}
            aria-label="Next product"
            className="group flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border border-rose-400/25 hover:border-rose-400/60 hover:bg-rose-500/10 text-cream-100 active:scale-95"
            style={{ background: 'rgba(26, 15, 36, 0.6)' }}
          >
            <span className="hidden sm:inline">Next</span>
            <span className="transition-transform group-hover:translate-x-0.5 text-rose-400">›</span>
          </button>
        </div>

        {/* Drag Hint */}
        <p className="text-center text-[10px] text-cream-200/40 mt-3 font-mono">
          ✦ Drag 3D charm to rotate · Scroll to travel dimensions ✦
        </p>
      </div>
    </div>
  );
}
