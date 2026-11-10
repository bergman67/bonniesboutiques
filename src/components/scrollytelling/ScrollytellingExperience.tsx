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

class WebGLErrorBoundary extends React.Component<
  { onFallback?: () => void; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { onFallback?: () => void; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('WebGL canvas unavailable, falling back to 2D PixelStorefrontLayer:', error?.message);
    this.props.onFallback?.();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

interface ScrollytellingExperienceProps {
  products: ProductItem[];
}

export default function ScrollytellingExperience({
  products = [],
}: ScrollytellingExperienceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollProgressRef = useRef(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [webglSupported, setWebglSupported] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport, { passive: true });
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    try {
      const testCanvas = document.createElement('canvas');
      const gl =
        testCanvas.getContext('webgl2') ||
        testCanvas.getContext('webgl') ||
        testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
      }
    } catch {
      setWebglSupported(false);
    }
  }, []);

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
  }, [isMobile]);

  // Calculate layer opacities based on 4-phase descent:
  // Phase 1 (0.00 - 0.25): Celestial Sky Hero
  // Phase 2 (0.25 - 0.50): Dimensional Portal & Descent
  // Phase 3 (0.50 - 0.75): Retro RPG Storefront Layer fades in
  // Phase 4 (0.75 - 1.00): Levitating Product Showcase Pedestal & HUD
  const skyHeroOpacity = Math.max(0, 1 - scrollProgress / 0.22);

  const descentPromptOpacity =
    scrollProgress > 0.22 && scrollProgress < 0.52
      ? Math.sin(((scrollProgress - 0.22) / 0.3) * Math.PI)
      : 0;

  // Retro pixel storefront layer fades in during phase 3 and remains as the backdrop
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
      style={{ height: isMobile ? '185vh' : '400vh' }}
    >
      {/* ── PINNED FULLSCREEN VIEWPORT CONTAINER ───────────────────── */}
      <div className="sticky top-0 h-screen h-[100dvh] w-full overflow-hidden bg-[#1a0f24]">
        {/* 2. RETRO CANVAS STOREFRONT LAYER (Moved to background) */}
        <PixelStorefrontLayer
          opacity={webglSupported ? pixelLayerOpacity : Math.max(0.55, pixelLayerOpacity)}
          scrollProgress={scrollProgress}
          activeProductName={currentProduct.title}
        />

        {/* 1. 3D WEBGL R3F CANVAS LAYER (Moved to foreground) */}
        {webglSupported && (
          <div
            className="absolute inset-0 z-10 pointer-events-auto"
            style={{ touchAction: 'pan-y' }}
          >
            <WebGLErrorBoundary onFallback={() => setWebglSupported(false)}>
              <ScrollyCanvas
                scrollProgressRef={scrollProgressRef}
                activeProduct={currentProduct}
              />
            </WebGLErrorBoundary>
          </div>
        )}

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
              One-of-a-kind handmade beaded pens, keychains, and keepsakes crafted one by one by Bonnie &amp; Tammy in Clearbrook, Virginia.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5">
              <a
                href="#collections"
                className="btn-primary px-8 py-3 rounded-full font-semibold text-xs sm:text-sm tracking-widest uppercase shadow-xl"
              >
                Shop 140+ Keepsakes
              </a>
              <a
                href="#bundles"
                className="px-6 py-3 rounded-full font-semibold text-xs sm:text-sm tracking-wider shadow-lg transition-all hover:scale-105"
                style={{
                  background: 'rgba(26, 15, 36, 0.85)',
                  color: '#fef3c7',
                  border: '1px solid rgba(249, 199, 79, 0.45)',
                }}
              >
                🎁 3-Pen Free Ship Bundles
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
              Passing through cloud mists down to the nostalgic handcrafted shop counter...
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

        {/* ── 6. PERSISTENT SKIP-TO-CATALOG QUICK PILL ─────────────── */}
        {scrollProgress > 0.12 && scrollProgress < 0.85 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
            <a
              href="#collections"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shadow-xl backdrop-blur-md transition-transform hover:scale-105"
              style={{
                background: 'rgba(26, 15, 36, 0.88)',
                color: '#f5efe6',
                border: '1px solid rgba(232, 116, 138, 0.45)',
              }}
            >
              <span>Shop All Pens &amp; Gifts</span>
              <span className="text-[#e8748a]">↓</span>
            </a>
          </div>
        )}

        {/* ── 7. SCROLL PROGRESS BAR (TOP EDGE) ────────────────────── */}
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
