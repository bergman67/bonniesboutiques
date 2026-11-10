'use client';

/**
 * src/components/studio/SocialMetricsTracker.tsx
 * Multi-Platform Social Media Metrics & "Road to 100,000 Views" Command Center
 * Tracks YouTube Shorts (@btboutiqe), Instagram Reels (@btboutiqevids),
 * Facebook Reels (Bonnie Boutiqe), and TikTok (@btboutiqevids).
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface PlatformVideoMetric {
  id: string;
  platform: string;
  platformLabel: string;
  title: string;
  url: string;
  publishedAt: string;
  caption?: string;
  views: number;
  likes: number;
  comments: number;
}

export interface PlatformSummaryMetric {
  platform: string;
  label: string;
  handle: string;
  profileUrl: string;
  connected: boolean;
  followers: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  videosCount: number;
  videos: PlatformVideoMetric[];
}

export interface SocialMetricsPayload {
  updatedAt: string;
  goalViews: number;
  totalViews: number;
  remainingViews: number;
  progressPercent: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
  totalVideosPublished: number;
  avgViewsPerVideo?: number;
  hourlyPostsPerDay?: number;
  platforms: PlatformSummaryMetric[];
  topVideos: PlatformVideoMetric[];
}

export function PlatformBrandIcon({ platform }: { platform: string }) {
  if (platform === 'youtube_shorts') {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
        <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }
  if (platform === 'instagram') {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#E1306C" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    );
  }
  if (platform === 'facebook_reels') {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#25F4EE" d="M19.29 6.39a4.83 4.83 0 0 1-3.77-4.25V1.8h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.1a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5 19.86a6.34 6.34 0 0 0 9.6-4.38v-7a8.16 8.16 0 0 0 4.69 1.52v-3.6z" />
      <path fill="#FE2C55" d="M20.09 7.09a4.83 4.83 0 0 1-3.77-4.25V2.5h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.8a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5.8 20.56a6.34 6.34 0 0 0 9.6-4.38v-7a8.16 8.16 0 0 0 4.69 1.52v-3.6z" />
      <path fill="#FFFFFF" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5.3 20.16a6.34 6.34 0 0 0 9.6-4.38v-7a8.16 8.16 0 0 0 4.69 1.52v-3.6z" />
    </svg>
  );
}

export function SocialMetricsTracker() {
  const [metrics, setMetrics] = useState<SocialMetricsPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCaption = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2500);
    } catch {}
  };

  const fetchMetrics = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      const res = await fetch(`/api/studio/metrics${forceRefresh ? '?refresh=1' : ''}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      // Fallback to static export file if needed
      try {
        const fallback = await fetch('/exports/social-metrics.json', { cache: 'no-store' });
        if (fallback.ok) setMetrics(await fallback.json());
      } catch {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(false);
  }, [fetchMetrics]);

  if (loading && !metrics) {
    return (
      <div className="p-6 rounded-2xl bg-stone-900/80 border border-rose-500/20 text-center text-stone-300 text-xs">
        Syncing live social media metrics across YouTube Shorts, Instagram Reels, Facebook &amp; TikTok...
      </div>
    );
  }

  const goal = metrics?.goalViews || 100000;
  const totalViews = metrics?.totalViews || 0;
  const remaining = Math.max(0, goal - totalViews);
  const pct = Math.min(100, Number(((totalViews / goal) * 100).toFixed(2)));
  const visualBarPct = Math.max(2, pct);

  return (
    <div className="space-y-4">
      {/* 1. Master 100,000 Views Goal Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/70 via-stone-900 to-amber-950/40 border border-amber-400/30 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
              🎯 Master Virality Goal
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
              Road to 100,000 Views
            </h3>
          </div>
          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold text-xs shadow transition cursor-pointer"
          >
            {refreshing ? '🔄 Syncing Live APIs...' : '🔄 Refresh Live Metrics'}
          </button>
        </div>

        {/* Big Counter */}
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-2xl sm:text-3xl font-black text-amber-300">
              {totalViews.toLocaleString()}
            </span>
            <span className="text-xs text-stone-400 ml-1.5">
              / {goal.toLocaleString()} total views ({pct}%)
            </span>
          </div>
          <span className="text-xs font-bold text-rose-300">
            {remaining.toLocaleString()} views to go
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-4 rounded-full bg-stone-950/90 border border-stone-700/70 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${visualBarPct}%` }}
          />
        </div>

        {/* Quick Global Totals */}
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-stone-800/80 text-center">
          <div className="p-2 rounded-xl bg-stone-950/60">
            <div className="text-sm font-extrabold text-white">
              {metrics?.totalVideosPublished || 0}
            </div>
            <div className="text-[10px] text-stone-400">Videos Live</div>
          </div>
          <div className="p-2 rounded-xl bg-stone-950/60">
            <div className="text-sm font-extrabold text-rose-400">
              {(metrics?.totalLikes || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-stone-400">Total Likes</div>
          </div>
          <div className="p-2 rounded-xl bg-stone-950/60">
            <div className="text-sm font-extrabold text-teal-400">
              {(metrics?.totalComments || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-stone-400">Comments</div>
          </div>
          <div className="p-2 rounded-xl bg-stone-950/60">
            <div className="text-sm font-extrabold text-amber-300">
              {(metrics?.totalFollowers || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-stone-400">Followers</div>
          </div>
        </div>
      </div>

      {/* 2. Per-Platform Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {(metrics?.platforms || []).map((p) => (
          <a
            key={p.platform}
            href={p.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-stone-900/90 hover:bg-stone-800/90 border border-stone-800 hover:border-rose-500/40 transition block"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white">
                <PlatformBrandIcon platform={p.platform} />
                {p.label}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                {p.connected ? '● LIVE' : '○ Pending'}
              </span>
            </div>
            <div className="text-[11px] text-rose-300 font-mono mb-2">{p.handle}</div>
            <div className="grid grid-cols-4 gap-1 text-center bg-stone-950/70 rounded-lg p-1.5">
              <div>
                <div className="text-xs font-extrabold text-amber-300">
                  {p.totalViews.toLocaleString()}
                </div>
                <div className="text-[9px] text-stone-400">Views</div>
              </div>
              <div>
                <div className="text-xs font-bold text-white">{p.videosCount}</div>
                <div className="text-[9px] text-stone-400">Videos</div>
              </div>
              <div>
                <div className="text-xs font-bold text-rose-400">{p.totalLikes}</div>
                <div className="text-[9px] text-stone-400">Likes</div>
              </div>
              <div>
                <div className="text-xs font-bold text-teal-300">{p.followers}</div>
                <div className="text-[9px] text-stone-400">Subs</div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* 3. Top Performing Videos Leaderboard */}
      <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-stone-800">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
            🏆 Top Performing Videos Leaderboard
          </h4>
          {metrics?.updatedAt && (
            <span className="text-[10px] text-stone-400">
              Updated {new Date(metrics.updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {(metrics?.topVideos || []).slice(0, 12).map((v, idx) => (
            <a
              key={`${v.platform}_${v.id}_${idx}`}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-stone-950/70 hover:bg-stone-800/80 border border-stone-800/70 transition text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-amber-400">#{idx + 1}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 font-semibold">
                    {v.platformLabel}
                  </span>
                </div>
                <div className="text-stone-200 font-medium truncate mt-0.5">{v.title}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-extrabold text-amber-300">
                  {v.views.toLocaleString()} views
                </div>
                <div className="text-[10px] text-rose-400">{v.likes} ♥</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 4. TikTok Inbox Ready-to-Paste Captions (1-Click Copy while App Audit Completes) */}
      {(() => {
        const ttPlatform = (metrics?.platforms || []).find((p) => p.platform === 'tiktok');
        const ttVideos = (ttPlatform?.videos || []).filter((v) => v.caption);
        if (ttVideos.length === 0) return null;
        return (
          <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-rose-500/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-300">
                🎵 TikTok Inbox Captions (1-Click Copy)
              </h4>
              <span className="text-[10px] text-stone-400">
                Tap to copy &amp; paste into TikTok Inbox video
              </span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {ttVideos.slice(0, 6).map((tv, idx) => (
                <div
                  key={tv.id || idx}
                  className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {idx === 0 ? '🆕 Latest: ' : `#${idx + 1}: `}
                      {tv.title}
                    </span>
                    <button
                      onClick={() => handleCopyCaption(tv.id, tv.caption || '')}
                      className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-[10px] shrink-0 cursor-pointer transition"
                    >
                      {copiedId === tv.id ? '✓ Copied!' : '📋 Copy TikTok Caption'}
                    </button>
                  </div>
                  <pre className="text-[10px] text-stone-300 font-mono whitespace-pre-wrap bg-black/40 p-2 rounded-lg border border-stone-800/80">
                    {tv.caption}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
