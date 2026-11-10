'use client';

import React from 'react';

export interface BeforeAfterCutoutPreviewProps {
  cutoutUrl: string | null;
  originalUrl: string;
  mode: 'cutout' | 'original';
  onModeChange: (mode: 'cutout' | 'original') => void;
  altTitle?: string;
  className?: string;
  badge?: string;
}

export default function BeforeAfterCutoutPreview({
  cutoutUrl,
  originalUrl,
  mode,
  onModeChange,
  altTitle = 'Trinket Photo',
  className = '',
  badge,
}: BeforeAfterCutoutPreviewProps) {
  const isCutoutActive = mode === 'cutout' && Boolean(cutoutUrl);

  return (
    <div className={`flex flex-col space-y-2.5 ${className}`}>
      {/* Interactive Toggle Pills */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-xl p-1 shadow-inner" style={{ background: 'rgba(26, 15, 36, 0.85)', border: '1px solid rgba(232, 116, 138, 0.3)' }}>
          <button
            type="button"
            onClick={() => onModeChange('cutout')}
            disabled={!cutoutUrl}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isCutoutActive
                ? 'shadow-md text-white scale-[1.02]'
                : 'text-rose-200/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            style={
              isCutoutActive
                ? { background: 'linear-gradient(135deg, #e8748a, #c44b63)' }
                : {}
            }
          >
            <span>✂️</span>
            <span>Isolated Cutout</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('original')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              !isCutoutActive
                ? 'shadow-md text-white scale-[1.02]'
                : 'text-rose-200/70 hover:text-white'
            }`}
            style={
              !isCutoutActive
                ? { background: 'linear-gradient(135deg, #e8748a, #c44b63)' }
                : {}
            }
          >
            <span>📷</span>
            <span>Original Photo</span>
          </button>
        </div>

        {badge && (
          <span
            className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
            style={{ background: 'rgba(232, 116, 138, 0.25)', color: '#fbcfe8', border: '1px solid rgba(232, 116, 138, 0.4)' }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Dark Plum Stage (#2d1b3d) */}
      <div
        className="relative aspect-square w-full rounded-2xl overflow-hidden flex items-center justify-center shadow-lg transition-all"
        style={{
          background: '#2d1b3d',
          border: '2px solid rgba(232, 116, 138, 0.3)',
        }}
      >
        {/* Subtle radial backdrop aura */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: 'radial-gradient(circle at center, rgba(232, 116, 138, 0.3) 0%, rgba(45, 27, 61, 0) 70%)',
          }}
        />

        {/* Cutout Image */}
        {cutoutUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cutoutUrl}
            alt={`${altTitle} - Transparent Cutout`}
            className={`absolute inset-0 w-full h-full object-contain p-4 transition-all duration-300 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] ${
              isCutoutActive ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          />
        )}

        {/* Original Photo */}
        {originalUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={originalUrl}
            alt={`${altTitle} - Original Photo`}
            className={`absolute inset-0 w-full h-full object-contain p-3 transition-all duration-300 ${
              !isCutoutActive ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          />
        )}

        {/* Loading / Empty placeholder if neither is ready */}
        {!cutoutUrl && !originalUrl && (
          <div className="text-center p-4">
            <span className="text-4xl animate-bounce">✂️</span>
            <p className="text-xs text-rose-200 mt-2 font-medium">Removing photo background...</p>
          </div>
        )}
      </div>
    </div>
  );
}
