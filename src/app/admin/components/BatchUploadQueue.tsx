'use client';

import React from 'react';
import { PRODUCT_CATEGORIES, ProductCategory } from '@/lib/categories';
import BeforeAfterCutoutPreview from './BeforeAfterCutoutPreview';
import { MagicQueueItem } from '../utils/autoMagicPipeline';

export interface BatchUploadQueueProps {
  items: MagicQueueItem[];
  onUpdateItem: (id: string, updates: Partial<MagicQueueItem>) => void;
  onPublishItem: (id: string) => Promise<void>;
  onPublishAll: () => Promise<void>;
  onDeleteItem: (id: string) => void;
  onRegenerateName: (id: string) => Promise<void>;
  onAddMoreFiles: () => void;
  onClearAll: () => void;
  isPublishingAll?: boolean;
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(26, 15, 36, 0.75)',
  border: '1px solid rgba(232, 116, 138, 0.35)',
  color: '#f5efe6',
};

export default function BatchUploadQueue({
  items,
  onUpdateItem,
  onPublishItem,
  onPublishAll,
  onDeleteItem,
  onRegenerateName,
  onAddMoreFiles,
  onClearAll,
  isPublishingAll = false,
}: BatchUploadQueueProps) {
  const totalCount = items.length;
  const readyCount = items.filter((i) => i.status === 'ready').length;
  const inProgressCount = items.filter(
    (i) => i.status === 'isolating' || i.status === 'naming' || i.status === 'pending'
  ).length;
  const publishedCount = items.filter((i) => i.status === 'published').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  const totalStepScore = items.reduce(
    (acc, cur) => acc + (cur.status === 'published' ? 100 : cur.stepProgress),
    0
  );
  const overallProgress = totalCount > 0 ? Math.round(totalStepScore / totalCount) : 0;

  // Header summary text
  let summaryText = `Processing ${totalCount} trinkets: ${readyCount} ready, ${inProgressCount} in progress...`;
  if (publishedCount === totalCount && totalCount > 0) {
    summaryText = `🎉 All ${totalCount} trinkets published to live store!`;
  } else if (inProgressCount === 0 && readyCount > 0) {
    summaryText = `✅ All ${readyCount} trinket${readyCount > 1 ? 's are' : ' is'} ready to publish!`;
  } else if (inProgressCount === 0 && readyCount === 0 && errorCount > 0) {
    summaryText = `⚠️ Encountered issues with ${errorCount} photo${errorCount > 1 ? 's' : ''}.`;
  }

  return (
    <div className="space-y-6">
      {/* 1. Sticky Aggregate Header */}
      <div
        className="sticky top-20 z-20 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md transition-all space-y-4"
        style={{
          background: 'rgba(45, 27, 61, 0.95)',
          border: '2px solid rgba(232, 116, 138, 0.45)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">✨</span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Batch Trinket Queue
              </h2>
              <span className="text-xs font-black px-3 py-1 rounded-full text-white bg-rose-500/30 border border-rose-400/40">
                {totalCount} Total
              </span>
            </div>
            <p className="text-sm sm:text-base font-bold text-rose-200">
              {summaryText}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAddMoreFiles}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all border text-white hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
              style={{
                background: 'rgba(232, 116, 138, 0.25)',
                borderColor: 'rgba(232, 116, 138, 0.5)',
              }}
            >
              <span>📷</span>
              <span>+ Upload More</span>
            </button>
            <button
              type="button"
              onClick={onClearAll}
              disabled={isPublishingAll}
              className="px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border text-rose-200/70 hover:text-white cursor-pointer disabled:opacity-40"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(232, 116, 138, 0.25)',
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Overall Progress Bar Track */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-black uppercase tracking-wider text-rose-200/80">
            <span>Overall Batch Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="w-full h-3.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${overallProgress}%`,
                background:
                  overallProgress === 100
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, #e8748a, #f59e0b)',
              }}
            />
          </div>
        </div>

        {/* GIANT "PUBLISH ALL (N) PRODUCTS TO STORE" BUTTON */}
        <button
          type="button"
          onClick={onPublishAll}
          disabled={readyCount === 0 || isPublishingAll}
          className="w-full min-h-[56px] py-4 px-6 rounded-2xl text-lg sm:text-xl font-black tracking-wide text-white transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          style={{
            background: 'linear-gradient(135deg, #e8748a, #c44b63)',
            boxShadow: '0 8px 25px rgba(232, 116, 138, 0.45)',
            border: '1.5px solid rgba(255, 255, 255, 0.35)',
          }}
        >
          <span>🚀</span>
          <span>
            {isPublishingAll
              ? `Publishing ${readyCount} Products to Store...`
              : readyCount > 0
              ? `Publish All (${readyCount}) Ready Products to Store`
              : inProgressCount > 0
              ? 'Waiting for Trinkets to Finish Processing...'
              : 'No Ready Trinkets to Publish'}
          </span>
        </button>
      </div>

      {/* 2. Responsive Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => {
          const isItemBusy =
            item.status === 'isolating' ||
            item.status === 'naming' ||
            item.status === 'publishing' ||
            isPublishingAll;
          const isItemReady = item.status === 'ready';
          const isItemPublished = item.status === 'published';
          const isItemError = item.status === 'error';

          return (
            <div
              key={item.id}
              className="rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 transition-all relative flex flex-col justify-between"
              style={{
                background: isItemPublished
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(61, 37, 82, 0.7)',
                border: isItemPublished
                  ? '2px solid #10b981'
                  : isItemReady
                  ? '2px solid rgba(16, 185, 129, 0.7)'
                  : isItemError
                  ? '2px solid #ef4444'
                  : '2px solid rgba(232, 116, 138, 0.3)',
              }}
            >
              {/* Delete / Discard Card Button */}
              <button
                type="button"
                onClick={() => onDeleteItem(item.id)}
                disabled={isItemBusy}
                aria-label="Remove trinket from queue"
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-rose-200/70 hover:text-white bg-black/40 hover:bg-black/60 border border-white/10 transition-all cursor-pointer disabled:opacity-30"
              >
                ✕
              </button>

              <div className="space-y-4">
                {/* Status & Step Banner */}
                <div className="pr-8">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={isItemBusy ? 'animate-pulse' : ''}>
                      {item.status === 'isolating' && '✂️'}
                      {item.status === 'naming' && '✨'}
                      {item.status === 'ready' && '✅'}
                      {item.status === 'published' && '🎉'}
                      {item.status === 'error' && '⚠️'}
                      {item.status === 'pending' && '⏳'}
                    </span>
                    <span
                      className="text-xs sm:text-sm font-extrabold truncate"
                      style={{
                        color: isItemPublished || isItemReady
                          ? '#6ee7b7'
                          : isItemError
                          ? '#fca5a5'
                          : '#fcd34d',
                      }}
                    >
                      {item.status === 'isolating' && '✂️ Removing background...'}
                      {item.status === 'naming' && '✨ Naming your trinket...'}
                      {item.status === 'ready' && '✅ Ready to Add to Store!'}
                      {item.status === 'published' && '🎉 Live on Store!'}
                      {item.status === 'error' && (item.errorMessage || 'Processing error')}
                      {item.status === 'pending' && '⏳ In Queue...'}
                    </span>
                  </div>

                  {/* Micro Progress Track */}
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${item.status === 'published' ? 100 : item.stepProgress}%`,
                        background:
                          isItemPublished || isItemReady
                            ? '#10b981'
                            : isItemError
                            ? '#ef4444'
                            : 'linear-gradient(90deg, #e8748a, #f59e0b)',
                      }}
                    />
                  </div>
                </div>

                {/* Before/After Cutout Preview */}
                <BeforeAfterCutoutPreview
                  cutoutUrl={item.transparentUrl}
                  originalUrl={item.originalPreviewUrl}
                  mode={item.previewMode}
                  onModeChange={(mode) => onUpdateItem(item.id, { previewMode: mode })}
                  altTitle={item.title || 'Trinket'}
                  badge={item.category}
                />

                {/* Card Form Fields */}
                <div className="space-y-3">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-extrabold mb-1 uppercase tracking-wider text-rose-200">
                      Title
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      disabled={isItemBusy || isItemPublished}
                      onChange={(e) => onUpdateItem(item.id, { title: e.target.value })}
                      placeholder="Trinket title..."
                      className="w-full px-3 py-2 rounded-xl text-sm font-bold outline-none shadow-inner"
                      style={inputStyle}
                    />
                  </div>

                  {/* Suggest Another Name Button */}
                  {!isItemPublished && (
                    <button
                      type="button"
                      onClick={() => onRegenerateName(item.id)}
                      disabled={!item.transparentUrl || isItemBusy || item.isRegeneratingName}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                      style={{
                        background: 'rgba(232, 116, 138, 0.2)',
                        borderColor: 'rgba(232, 116, 138, 0.4)',
                        color: '#f5efe6',
                      }}
                    >
                      <span className={item.isRegeneratingName ? 'animate-spin' : ''}>🔄</span>
                      <span>
                        {item.isRegeneratingName
                          ? 'Suggesting...'
                          : 'Suggest Another Name'}
                      </span>
                    </button>
                  )}

                  {/* Category Pills */}
                  <div>
                    <label className="block text-xs font-extrabold mb-1 uppercase tracking-wider text-rose-200">
                      Category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {PRODUCT_CATEGORIES.map((cat) => {
                        const isSelected = item.category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            disabled={isItemBusy || isItemPublished}
                            onClick={() =>
                              onUpdateItem(item.id, { category: cat as ProductCategory })
                            }
                            className={`py-1.5 px-1 rounded-lg text-xs font-extrabold transition-all text-center cursor-pointer ${
                              isSelected
                                ? 'text-white shadow-md'
                                : 'text-rose-200/70 hover:text-white'
                            }`}
                            style={
                              isSelected
                                ? { background: 'linear-gradient(135deg, #e8748a, #c44b63)' }
                                : {
                                    background: 'rgba(26, 15, 36, 0.7)',
                                    border: '1px solid rgba(232, 116, 138, 0.2)',
                                  }
                            }
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-xs font-extrabold mb-1 uppercase tracking-wider text-rose-200">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      value={item.price}
                      disabled={isItemBusy || isItemPublished}
                      onChange={(e) =>
                        onUpdateItem(item.id, {
                          price: parseFloat(e.target.value) || 8.0,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-sm font-bold outline-none shadow-inner"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Individual Publish Button */}
              <div className="pt-3 border-t border-white/10 mt-3">
                {isItemPublished ? (
                  <div className="py-2.5 px-4 rounded-xl text-xs font-black text-center text-emerald-300 bg-emerald-500/20 border border-emerald-500/40">
                    ✓ Published to Live Store ($
                    {(item.price || 8).toFixed(2)})
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPublishItem(item.id)}
                    disabled={!isItemReady || isItemBusy}
                    className="w-full min-h-[46px] py-2.5 px-4 rounded-xl text-sm font-black text-white transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                      boxShadow: '0 4px 15px rgba(232, 116, 138, 0.35)',
                    }}
                  >
                    <span>🚀</span>
                    <span>
                      {item.status === 'publishing'
                        ? 'Publishing...'
                        : `Publish This Trinket ($${(item.price || 8).toFixed(2)})`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
