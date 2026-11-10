'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import QuickViewModal, { QuickViewProduct } from './QuickViewModal';
import { ProductCategory, CATEGORIES, getProductCategory, getCategoryCounts } from '@/lib/categories';

export interface CatalogProduct {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  description?: string | null;
  createdAt?: Date | string | null;
}

export interface ProductCatalogProps {
  products: CatalogProduct[];
}

const POPULAR_KEYWORDS = ['Christmas', 'Puppy', 'Butterfly', 'Halloween', 'Heart'];

export default function ProductCatalog({ products }: ProductCatalogProps) {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [selectedProduct, setSelectedProduct] = useState<QuickViewProduct | null>(null);

  // Support deep-linked ?q= and ?category= URL parameters for SEO SearchAction & category links
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    const catParam = params.get('category');
    if (qParam) {
      setSearchQuery(qParam);
    }
    if (catParam) {
      const matchedCat = CATEGORIES.find(
        (c) => c.toLowerCase() === catParam.trim().toLowerCase()
      );
      if (matchedCat) {
        setActiveCategory(matchedCat);
      }
    }
  }, []);

  // Calculate live category counts
  const categoryCounts = useMemo(() => {
    return getCategoryCounts(products);
  }, [products]);

  // Client-side filtering and sorting
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let list = products.filter((product) => {
      // 1. Category Filter
      if (activeCategory !== 'All') {
        const cat = getProductCategory(product.title, product.description);
        if (cat !== activeCategory) {
          return false;
        }
      }

      // 2. Keyword Search
      if (query) {
        const titleMatch = product.title.toLowerCase().includes(query);
        const descMatch = product.description ? product.description.toLowerCase().includes(query) : false;
        if (!titleMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });

    // 3. Sorting
    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => (a.price ?? 8) - (b.price ?? 8));
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => (b.price ?? 8) - (a.price ?? 8));
    }

    return list;
  }, [products, activeCategory, searchQuery, sortBy]);

  const handleResetFilters = () => {
    setActiveCategory('All');
    setSearchQuery('');
    setSortBy('featured');
  };

  return (
    <div className="w-full">
      {/* ── SECTION HEADER ───────────────────────────────────── */}
      <div className="text-center mb-8 sm:mb-12">
        <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: '#e8748a' }}>
          ✦ Handcrafted Treasures ✦
        </p>
        <h2
          className="text-3xl sm:text-4xl font-serif"
          style={{ color: '#f5efe6', fontFamily: "'Playfair Display', serif" }}
        >
          The Full Collection
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'rgba(245, 239, 230, 0.5)' }}>
          {products.length} unique handcrafted pieces · Tap any item for quick inspection
        </p>
      </div>

      {/* ── CONTROLS: CATEGORIES, SEARCH, SORT ───────────────── */}
      <div className="space-y-6 mb-10">
        {/* Category Filter Pills */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none px-2">
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category;
            const count = categoryCounts[category] ?? 0;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'shadow-lg shadow-[#e8748a]/20 scale-105'
                    : 'hover:bg-[#3d2552]/80 hover:text-white'
                }`}
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #e8748a, #c44b63)'
                    : 'rgba(61, 37, 82, 0.5)',
                  color: isActive ? '#ffffff' : 'rgba(245, 239, 230, 0.75)',
                  border: isActive
                    ? '1px solid #e8748a'
                    : '1px solid rgba(232, 116, 138, 0.15)',
                }}
              >
                <span>{category}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(232, 116, 138, 0.15)',
                    color: isActive ? '#ffffff' : '#e8748a',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 max-w-4xl mx-auto">
          {/* Instant Search Input */}
          <div className="relative flex-1">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
              style={{ color: 'rgba(245, 239, 230, 0.4)' }}
            >
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword (e.g. Christmas, Puppy, Butterfly, Halloween)..."
              aria-label="Search products"
              className="w-full pl-11 pr-10 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#e8748a]"
              style={{
                background: 'rgba(26, 15, 36, 0.7)',
                border: '1px solid rgba(232, 116, 138, 0.25)',
                color: '#f5efe6',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                style={{
                  background: 'rgba(232, 116, 138, 0.2)',
                  color: '#e8748a',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label
              htmlFor="product-sort"
              className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap hidden sm:inline"
              style={{ color: 'rgba(245, 239, 230, 0.5)' }}
            >
              Sort By:
            </label>
            <select
              id="product-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc')}
              aria-label="Sort products"
              className="px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#e8748a] cursor-pointer"
              style={{
                background: '#1a0f24',
                border: '1px solid rgba(232, 116, 138, 0.25)',
                color: '#f5efe6',
              }}
            >
              <option value="featured">Featured / Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Popular Keyword Chips */}
        <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
          <span style={{ color: 'rgba(245, 239, 230, 0.45)' }}>Popular tags:</span>
          {POPULAR_KEYWORDS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSearchQuery(tag)}
              className="px-2.5 py-1 rounded-lg transition-all cursor-pointer hover:border-[#e8748a]"
              style={{
                background: searchQuery.toLowerCase() === tag.toLowerCase()
                  ? 'rgba(232, 116, 138, 0.25)'
                  : 'rgba(61, 37, 82, 0.35)',
                color: searchQuery.toLowerCase() === tag.toLowerCase() ? '#ffffff' : '#e8748a',
                border: '1px solid rgba(232, 116, 138, 0.15)',
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* ── FILTER STATUS & RESULTS COUNT ───────────────────── */}
      <div className="flex items-center justify-between mb-6 px-1 text-xs">
        <p style={{ color: 'rgba(245, 239, 230, 0.6)' }}>
          Showing <span className="font-bold text-[#e8748a]">{filteredProducts.length}</span> of {products.length} trinkets
          {activeCategory !== 'All' && ` in "${activeCategory}"`}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>

        {(activeCategory !== 'All' || searchQuery) && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[#e8748a] hover:underline font-semibold cursor-pointer"
          >
            Clear all filters ✕
          </button>
        )}
      </div>

      {/* ── PRODUCT GRID OR EMPTY STATE ──────────────────────── */}
      {filteredProducts.length === 0 ? (
        <div
          className="text-center py-20 px-6 rounded-2xl border"
          style={{
            background: 'rgba(26, 15, 36, 0.5)',
            borderColor: 'rgba(232, 116, 138, 0.15)',
          }}
        >
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-serif font-bold mb-2" style={{ color: '#f5efe6' }}>
            No trinkets found
          </h3>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: 'rgba(245, 239, 230, 0.5)' }}>
            We couldn&apos;t find any items matching your current filters. Try searching with a different keyword or resetting your filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase text-white transition-all transform active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #e8748a, #c44b63)',
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {filteredProducts.map((p, index) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                title: p.title,
                imageUrl: p.imageUrl,
                price: p.price ?? 8.0,
                description: p.description,
              }}
              onQuickView={(prod) => setSelectedProduct(prod)}
              isRecent={index < 6}
            />
          ))}
        </div>
      )}

      {/* ── QUICK-VIEW MODAL ─────────────────────────────────── */}
      <QuickViewModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
