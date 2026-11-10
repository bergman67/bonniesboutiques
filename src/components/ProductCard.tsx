'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { getProductCategory } from '@/lib/categories';

export interface ProductCardProduct {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number;
  description?: string | null;
}

export interface ProductCardProps {
  product: ProductCardProduct;
  onQuickView?: (product: ProductCardProduct) => void;
  isRecent?: boolean;
}

export default function ProductCard({ product, onQuickView, isRecent }: ProductCardProps) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const category = getProductCategory(product.title, product.description);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      title: product.title,
      imageUrl: product.imageUrl,
      price: product.price,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onQuickView) {
      e.preventDefault();
      onQuickView(product);
    }
  };

  const cardInner = (
    <article className="card-inner flex flex-col h-full">
      {/* Category badge & scarcity */}
      <div className="pt-3 px-3 flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(232, 116, 138, 0.12)',
              color: '#e8748a',
              border: '1px solid rgba(232, 116, 138, 0.22)',
            }}
          >
            {category}
          </span>
          {isRecent && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500/30 to-amber-500/30 text-amber-300 border border-amber-400/40 animate-pulse">
              ✨ New Arrival
            </span>
          )}
        </div>
        <span
          className="text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full text-amber-300"
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}
        >
          ✦ 1 of 1 Unique
        </span>
      </div>

      {/* Image with Quick View trigger */}
      <div
        className="product-image-wrap aspect-square cursor-pointer relative group"
        onClick={handleCardClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={`${product.title} — Handcrafted ${category} by Bonnie's Boutique`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🔑</div>
        )}
        {onQuickView && (
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase font-semibold tracking-wider px-2.5 py-0.5 rounded-full bg-black/60 text-white/90 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs pointer-events-none whitespace-nowrap">
            Quick View
          </span>
        )}
      </div>

      {/* Info - Title allows direct navigation */}
      <div className="p-3 pb-2 flex-1 flex flex-col justify-between">
        <h3
          className="text-xs font-medium leading-snug line-clamp-2 hover:text-[#e8748a] transition-colors"
          style={{ color: 'rgba(245, 239, 230, 0.85)' }}
        >
          <Link
            href={`/products/${product.id}`}
            onClick={(e) => {
              // Direct navigation: do not prevent default, stop propagation so card container does not open QuickView
              e.stopPropagation();
            }}
            className="hover:text-[#e8748a] transition-colors"
          >
            {product.title}
          </Link>
        </h3>
        <p
          className="text-sm font-bold mt-1.5"
          style={{ color: '#e8748a' }}
        >
          ${product.price.toFixed(2)}
        </p>
      </div>

      {/* Add to cart */}
      <div className="px-3 pb-3 mt-auto">
        <button
          type="button"
          onClick={handleAddToCart}
          className={`btn-primary w-full text-xs py-2 rounded-lg font-semibold tracking-wide active:scale-95 transition-all cursor-pointer ${
            justAdded ? '!bg-emerald-600 !text-white' : ''
          }`}
        >
          {justAdded ? '✓ Added!' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );

  if (onQuickView) {
    return (
      <div
        className="product-card cursor-pointer block select-none h-full"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onQuickView(product);
          }
        }}
      >
        {cardInner}
      </div>
    );
  }

  return (
    <Link href={`/products/${product.id}`} className="product-card cursor-pointer block select-none h-full">
      {cardInner}
    </Link>
  );
}
