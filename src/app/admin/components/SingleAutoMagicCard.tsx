'use client';

import React from 'react';
import { PRODUCT_CATEGORIES, ProductCategory } from '@/lib/categories';
import BeforeAfterCutoutPreview from './BeforeAfterCutoutPreview';
import { MagicQueueItem } from '../utils/autoMagicPipeline';

export interface SingleAutoMagicCardProps {
  item: MagicQueueItem;
  onUpdateItem: (updates: Partial<MagicQueueItem>) => void;
  onPublish: (item: MagicQueueItem) => Promise<void>;
  onCancel: () => void;
  onRegenerateName: (item: MagicQueueItem) => Promise<void>;
  isPublishing?: boolean;
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(26, 15, 36, 0.7)',
  border: '1px solid rgba(232, 116, 138, 0.35)',
  color: '#f5efe6',
};

export default function SingleAutoMagicCard({
  item,
  onUpdateItem,
  onPublish,
  onCancel,
  onRegenerateName,
  isPublishing = false,
}: SingleAutoMagicCardProps) {
  const isBusy = item.status === 'isolating' || item.status === 'naming' || item.status === 'publishing' || isPublishing;
  const isReady = item.status === 'ready';
  const isPublished = item.status === 'published';
  const isError = item.status === 'error';

  return (
    <div
      className="rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 transition-all"
      style={{
        background: 'rgba(61, 37, 82, 0.75)',
        border: '2px solid rgba(232, 116, 138, 0.35)',
      }}
    >
      {/* 1. Header & Reassuring 3-Step Progress Banner */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Auto-Magic Trinket Creator
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl border transition-all text-rose-200/80 hover:text-white hover:border-rose-400 cursor-pointer disabled:opacity-40"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(232, 116, 138, 0.3)',
            }}
          >
            ✕ Start Over
          </button>
        </div>

        {/* 3-Step Progress Indicators */}
        <div
          className="rounded-2xl p-4 transition-all"
          style={{
            background: isPublished
              ? 'rgba(16, 185, 129, 0.2)'
              : isError
              ? 'rgba(239, 68, 68, 0.2)'
              : isReady
              ? 'rgba(245, 158, 11, 0.16)'
              : 'rgba(26, 15, 36, 0.8)',
            border: isPublished
              ? '2px solid #10b981'
              : isReady
              ? '2px solid #f59e0b'
              : isError
              ? '2px solid #ef4444'
              : '2px solid rgba(232, 116, 138, 0.3)',
          }}
        >
          {/* Progress message with dynamic icon & color */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <span className={`text-xl ${isBusy || isReady ? 'animate-pulse' : ''}`}>
                {item.status === 'isolating' && '✂️'}
                {item.status === 'naming' && '✨'}
                {item.status === 'ready' && '👇'}
                {item.status === 'published' && '🎉'}
                {item.status === 'error' && '⚠️'}
                {item.status === 'pending' && '⏳'}
              </span>
              <p
                className="text-base sm:text-lg font-extrabold tracking-wide"
                style={{
                  color: isPublished
                    ? '#6ee7b7'
                    : isError
                    ? '#fca5a5'
                    : '#fcd34d',
                }}
              >
                {item.status === 'isolating' && '✂️ Step 1: Removing background...'}
                {item.status === 'naming' && '✨ Step 2: Naming your trinket...'}
                {item.status === 'ready' && '✅ Ready! Tap "Add to Live Store" to Publish!'}
                {item.status === 'published' && '🎉 Live on Your Store!'}
                {item.status === 'error' && (item.errorMessage || 'Something went wrong')}
                {item.status === 'pending' && '⏳ Preparing Photo...'}
              </p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full text-white bg-rose-500/30 border border-rose-400/40">
              {isPublished ? '100%' : isReady ? 'Step 3 of 3' : `${item.stepProgress}%`}
            </span>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${isPublished ? 100 : isReady ? 85 : item.stepProgress}%`,
                background: isPublished
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : isError
                  ? '#ef4444'
                  : 'linear-gradient(90deg, #e8748a, #f59e0b)',
              }}
            />
          </div>

          {/* Visual Step Pills */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-white/10 text-center">
            <div
              className={`text-xs font-bold py-1 px-2 rounded-lg transition-all ${
                item.stepProgress >= 33
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-black/20 text-white/40'
              }`}
            >
              ✓ 1. Cutout
            </div>
            <div
              className={`text-xs font-bold py-1 px-2 rounded-lg transition-all ${
                item.stepProgress >= 66
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-black/20 text-white/40'
              }`}
            >
              ✓ 2. AI Name
            </div>
            <div
              className={`text-xs font-bold py-1 px-2 rounded-lg transition-all ${
                isPublished
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : isReady
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-400/60 animate-pulse'
                  : 'bg-black/20 text-white/40'
              }`}
            >
              {isPublished ? '✓ 3. Live!' : isReady ? '👉 3. Tap Publish' : '3. Publish'}
            </div>
          </div>

          {/* TOP 1-CLICK PUBLISH BUTTON: Immediately visible on phones without scrolling down! */}
          {isReady && !isPublished && (
            <button
              type="button"
              onClick={() => onPublish(item)}
              disabled={isBusy}
              className="mt-4 w-full min-h-[56px] py-3.5 px-6 rounded-2xl text-lg sm:text-xl font-black tracking-wide text-white transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-3"
              style={{
                background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                boxShadow: '0 8px 25px rgba(232, 116, 138, 0.5)',
                border: '2px solid rgba(255, 255, 255, 0.45)',
              }}
            >
              <span>🚀</span>
              <span>
                {isBusy
                  ? 'Adding to Store...'
                  : `Add to Live Store ($${(item.price || 8).toFixed(2)})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Before / After Interactive Cutout Preview */}
      <BeforeAfterCutoutPreview
        cutoutUrl={item.transparentUrl}
        originalUrl={item.originalPreviewUrl}
        mode={item.previewMode}
        onModeChange={(mode) => onUpdateItem({ previewMode: mode })}
        altTitle={item.title || 'Product'}
        badge={item.category}
      />

      {/* 3. Published State Banner */}
      {isPublished ? (
        <div className="rounded-2xl p-6 text-center space-y-4 bg-emerald-500/15 border-2 border-emerald-500">
          <div className="text-4xl animate-bounce">💖</div>
          <div>
            <h3 className="text-xl font-black text-emerald-300">
              Trinket Published to Live Store!
            </h3>
            <p className="text-sm text-emerald-100/90 mt-1">
              &ldquo;{item.title}&rdquo; is now visible to all shoppers for $
              {item.price.toFixed(2)}.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[48px] py-3 px-6 rounded-2xl text-base font-extrabold text-white shadow-lg transition-all hover:scale-[1.01] cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
            }}
          >
            + Add Another Trinket
          </button>
        </div>
      ) : (
        /* 4. Pre-filled Metadata Fields & Action Buttons */
        <div className="space-y-4">
          {/* Pre-filled Title Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-extrabold uppercase tracking-wider text-rose-200">
                Product Title (AI Pre-Filled)
              </label>
              {item.isRegeneratingName && (
                <span className="text-xs font-bold text-amber-300 animate-pulse">
                  Suggesting new name...
                </span>
              )}
            </div>
            <input
              type="text"
              value={item.title}
              disabled={isBusy}
              onChange={(e) => onUpdateItem({ title: e.target.value })}
              placeholder="e.g. Sparkling Rose Butterfly Pen"
              className="w-full px-4 py-3 rounded-xl text-base font-bold outline-none shadow-inner"
              style={inputStyle}
            />
          </div>

          {/* Suggest Another Name Button */}
          <button
            type="button"
            onClick={() => onRegenerateName(item)}
            disabled={!item.transparentUrl || isBusy || item.isRegeneratingName}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: 'rgba(232, 116, 138, 0.25)',
              color: '#f5efe6',
              border: '1.5px solid rgba(232, 116, 138, 0.5)',
            }}
          >
            <span className={item.isRegeneratingName ? 'animate-spin' : ''}>🔄</span>
            <span>
              {item.isRegeneratingName
                ? 'Thinking of Another Cute Name...'
                : '🔄 Suggest Another Name'}
            </span>
          </button>

          {/* Category Selector Pills */}
          <div>
            <label className="block text-sm font-extrabold mb-1.5 uppercase tracking-wider text-rose-200">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRODUCT_CATEGORIES.map((cat) => {
                const isSelected = item.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={isBusy}
                    onClick={() => onUpdateItem({ category: cat as ProductCategory })}
                    className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'text-white shadow-md scale-[1.02]'
                        : 'text-rose-200/70 hover:text-white'
                    }`}
                    style={
                      isSelected
                        ? { background: 'linear-gradient(135deg, #e8748a, #c44b63)', border: '1px solid rgba(255,255,255,0.4)' }
                        : { background: 'rgba(26, 15, 36, 0.7)', border: '1px solid rgba(232, 116, 138, 0.25)' }
                    }
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-sm font-extrabold mb-1.5 uppercase tracking-wider text-rose-200">
              Description (Warm &amp; Charming)
            </label>
            <textarea
              rows={3}
              value={item.description}
              disabled={isBusy}
              onChange={(e) => onUpdateItem({ description: e.target.value })}
              placeholder="Describe this trinket..."
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none resize-none shadow-inner leading-relaxed"
              style={inputStyle}
            />
          </div>

          {/* Price Input */}
          <div>
            <label className="block text-sm font-extrabold mb-1.5 uppercase tracking-wider text-rose-200">
              Price ($)
            </label>
            <input
              type="number"
              step="0.50"
              value={item.price}
              disabled={isBusy}
              onChange={(e) => onUpdateItem({ price: parseFloat(e.target.value) || 8.00 })}
              className="w-full px-4 py-3 rounded-xl text-base font-black outline-none shadow-inner"
              style={inputStyle}
            />
          </div>

          {/* GIANT 1-CLICK PUBLISH BUTTON (Min 52-56px height, high contrast) */}
          <button
            type="button"
            onClick={() => onPublish(item)}
            disabled={!isReady || isBusy}
            className="w-full min-h-[56px] py-4 px-6 rounded-2xl text-lg sm:text-xl font-black tracking-wide text-white transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #e8748a, #c44b63)',
              boxShadow: '0 8px 25px rgba(232, 116, 138, 0.45)',
              border: '1.5px solid rgba(255, 255, 255, 0.35)',
            }}
          >
            <span>🚀</span>
            <span>
              {isBusy
                ? 'Adding to Store...'
                : `Add to Live Store ($${(item.price || 8).toFixed(2)})`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
