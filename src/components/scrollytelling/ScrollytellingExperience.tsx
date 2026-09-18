'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PixelStorefrontLayer from './PixelStorefrontLayer';
import ProductHUD from './ProductHUD';
import { ProductItem } from './LevitatingProductViewer';

// Register GSAP ScrollTrigger plugin on client
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Dynamically import Three.js R3F Canvas without SSR
const ScrollyCanvas = dynamic(() => import('./ScrollyCanvas'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#1a0f24]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-cream-100/60 tracking-widest uppercase">
          Loading 3D Boutique Canvas...
        </p>
      </div>
    </div>
  ),
});

interface ScrollytellingExperienceProps {
  products: ProductItem[];
}

export default function ScrollytellingExperience({
  products = [],
}: ScrollytellingExperienceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollProgressRef = useRef(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Active product index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Ensure fallback if products array is empty
  const activeProducts = Array.isArray(products) && products.length > 0
    ? products
    : [
        {
          id: 'placeholder-1',
          title: 'Faceted Rose Gemstone Keychain',
          price: 8.0,
          description: 'Handcrafted rose quartz facet wrapped in gold wiring with celestial stardust.',
        },
      ];

  const currentProduct = activeProducts[currentIndex % activeProducts.length];

  // Manual navigation handlers
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : activeProducts.length - 1));
  }, [activeProducts.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % activeProducts.length);
  }, [activeProducts.length]);

  // GSAP ScrollTrigger setup with React 18 cleanup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: container,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.0,
        onUpdate: (self) => {
          scrollProgressRef.current = self.progress;
          setScrollProgress(self.progress);
        },
      });
    }, container);

    return () => {
      ctx.revert();
    };
  }, []);

  // Calculate layer opacities based on 4-phase descent:
  // Phase 1 (0.00 - 0.25): Celestial Sky Hero
  // Phase 2 (0.25 - 0.50): Dimensional Portal & Descent
  // Phase 3 (0.50 - 0.75): 16-Bit RPG Storefront Layer fades in
  // Phase 4 (0.75 - 1.00): Levitating Product Showcase Pedestal & HUD
  const skyHeroOpacity = Math.max(0, 1 - scrollProgress / 0.22);

  const descentPromptOpacity =
    scrollProgress > 0.22 && scrollProgress < 0.52
      ? Math.sin(((scrollProgress - 0.22) / 0.3) * Math.PI)
      : 0;

  // 16-bit pixel storefront layer fades in during phase 3 and remains as the backdrop
  const pixelLayerOpacity =
    scrollProgress < 0.45
      ? 0
      : scrollProgress < 0.7
      ? (scrollProgress - 0.45) / 0.25
      : 0.85;

  // Product HUD active in Phase 4
  const hudVisible = scrollProgress >= 0.7;

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: '400vh' }}
    >
      {/* ── PINNED FULLSCREEN VIEWPORT CONTAINER ───────────────────── */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#1a0f24]">
        {/* ── 1. 3D WEBGL R3F CANVAS LAYER ─────────────────────────── */}
        <ScrollyCanvas
          scrollProgressRef={scrollProgressRef}
          activeProduct={currentProduct}
        />

        {/* ── 2. 16-BIT RETRO CANVAS STOREFRONT LAYER ──────────────── */}
        <PixelStorefrontLayer
          opacity={pixelLayerOpacity}
          scrollProgress={scrollProgress}
          activeProductName={currentProduct.title}
        />

        {/* ── 3. PHASE 1: CELESTIAL SKY HERO OVERLAY ───────────────── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none transition-opacity duration-300 z-20"
          style={{ opacity: skyHeroOpacity }}
        >
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <p
              className="text-xs sm:text-sm tracking-[0.35em] uppercase mb-4 sm:mb-6 font-mono"
              style={{ color: '#e8748a' }}
            >
              ✦ Welcome to Bonnie&apos;s Boutique ✦
            </p>
            <h1
              className="text-4xl sm:text-6xl md:text-7xl font-serif mb-5 leading-tight tracking-tight text-[#f5efe6]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Every Piece Tells
              <span className="block italic text-[#e8748a]">a Story</span>
            </h1>
            <p className="text-base sm:text-lg mb-8 max-w-xl mx-auto text-[#f5efe6]/75">
              Unique handmade keychains and trinkets, lovingly crafted one by one.
              Descend from the celestial sky into our 16-bit enchanted boutique.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a
                href="#collections"
                className="btn-primary px-8 py-3 rounded-full font-semibold text-xs sm:text-sm tracking-widest uppercase shadow-xl"
              >
                Explore Collection
              </a>
            </div>

            {/* Bouncing scroll down indicator */}
            <div className="mt-12 flex flex-col items-center gap-2 text-rose-300/60 animate-bounce">
              <span className="text-[11px] font-mono tracking-widest uppercase">
                Scroll to Descend
              </span>
              <span className="text-lg">↓</span>
            </div>
          </div>
        </div>

        {/* ── 4. PHASE 2: DIMENSIONAL DESCENT PROMPT ───────────────── */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 z-20"
          style={{ opacity: descentPromptOpacity }}
        >
          <div className="text-center px-6 max-w-lg">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-[#fbbf24] mb-2">
              ✦ Dimension Shift ✦
            </p>
            <h2
              className="text-2xl sm:text-4xl font-serif text-[#f5efe6] mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Entering the Workshop
            </h2>
            <p className="text-xs sm:text-sm text-[#f5efe6]/70 font-mono">
              Passing through cloud mists down to the nostalgic 16-bit shop counter...
            </p>
          </div>
        </div>

        {/* ── 5. PHASE 4: DYNAMIC PRODUCT HUD & CART INTEGRATION ───── */}
        <ProductHUD
          product={currentProduct}
          currentIndex={currentIndex}
          totalCount={activeProducts.length}
          onPrev={handlePrev}
          onNext={handleNext}
          visible={hudVisible}
        />

        {/* ── 6. SCROLL PROGRESS BAR (TOP EDGE) ────────────────────── */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/40 z-30 pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-[#e8748a] via-[#fbbf24] to-[#a855f7] transition-all duration-75"
            style={{ width: `${Math.round(scrollProgress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
