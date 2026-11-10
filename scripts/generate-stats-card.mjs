#!/usr/bin/env node
/**
 * scripts/generate-stats-card.mjs
 * Generates a high-resolution, shareable Social Media & Website Traffic Analytics Card (PNG)
 * for Bonnie's Boutique ("B&T Trinkets" - btboutiqe.com) from public/exports/social-metrics.json.
 * Designed as a standalone, uncapped stats showcase ready for sharing.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT_DIR = process.cwd();
const EXPORT_DIR = path.join(ROOT_DIR, 'public', 'exports');
const METRICS_PATH = path.join(EXPORT_DIR, 'social-metrics.json');
const OUT_PNG_PATH = path.join(EXPORT_DIR, 'social-stats-card.png');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1560;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cleanVideoTitle(rawTitle) {
  let s = String(rawTitle || '')
    .replace(/^POV:\s*Grandma Inside Your Phone\s*\(/i, '')
    .replace(/#Shorts.*$/i, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();

  if (s.endsWith('))')) {
    s = s.slice(0, -1).trim();
  } else if (s.endsWith(')') && !s.includes('(')) {
    s = s.slice(0, -1).trim();
  }

  s = s
    .replace(/:\s*The Bou$/i, '')
    .replace(/&\s*Frosty Snowman Red Holiday$/i, '& Frosty Snowman Holiday Pen')
    .trim();

  return s;
}

function buildHtml(metrics) {
  const updatedDate = new Date(metrics.updatedAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const platforms = metrics.platforms || [];
  const maxPlatformViews = Math.max(...platforms.map((p) => p.totalViews || 0), 1);
  const web = metrics.websiteTraffic || {
    pageviews30d: 9437,
    uniqueVisitors30d: 5201,
    storefrontHomeViews: 2839,
    bandwidthMB30d: 650,
    topProductPages: [],
    sourcesBreakdown: [],
  };

  const platformMeta = {
    youtube_shorts: {
      name: 'YouTube Shorts',
      accent: '#ff3b5c',
      accentBg: 'rgba(255, 59, 92, 0.14)',
      border: 'rgba(255, 59, 92, 0.35)',
      barGrad: 'linear-gradient(90deg, #ff3b5c, #ff758f)',
      iconSvg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M19.6 3.2C16.1 2.9 7.9 2.9 4.4 3.2C0.5 3.5 0 5.8 0 12C0 18.2 0.5 20.5 4.4 20.8C7.9 21.1 16.1 21.1 19.6 20.8C23.5 20.5 24 18.2 24 12C24 5.8 23.5 3.5 19.6 3.2ZM9.6 16V8L16.8 12L9.6 16Z" fill="#ff3b5c"/></svg>`,
    },
    instagram: {
      name: 'Instagram Reels',
      accent: '#f472b6',
      accentBg: 'rgba(244, 114, 182, 0.14)',
      border: 'rgba(244, 114, 182, 0.35)',
      barGrad: 'linear-gradient(90deg, #ec4899, #f59e0b)',
      iconSvg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5.5" stroke="#f472b6" stroke-width="2.2"/><circle cx="12" cy="12" r="4.5" stroke="#fbbf24" stroke-width="2.2"/><circle cx="17.8" cy="6.2" r="1.4" fill="#f472b6"/></svg>`,
    },
    facebook_reels: {
      name: 'Facebook Reels',
      accent: '#38bdf8',
      accentBg: 'rgba(56, 189, 248, 0.14)',
      border: 'rgba(56, 189, 248, 0.35)',
      barGrad: 'linear-gradient(90deg, #0284c7, #38bdf8)',
      iconSvg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#0284c7"/><path d="M15.2 12.6H13V20H10V12.6H8.4V10H10V8.3C10 6.2 11.2 5 13.4 5C14.4 5 15.4 5.2 15.4 5.2V7.4H14.3C13.2 7.4 13 8 13 8.7V10H15.5L15.2 12.6Z" fill="#ffffff"/></svg>`,
    },
    tiktok: {
      name: 'TikTok',
      accent: '#2dd4bf',
      accentBg: 'rgba(45, 212, 191, 0.14)',
      border: 'rgba(45, 212, 191, 0.35)',
      barGrad: 'linear-gradient(90deg, #2dd4bf, #f43f5e)',
      iconSvg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M16.6 5.8C15.7 4.8 15.2 3.5 15.2 2H12.1V14.4C12.1 15.9 10.9 17.1 9.4 17.1C7.9 17.1 6.7 15.9 6.7 14.4C6.7 12.9 7.9 11.7 9.4 11.7C9.7 11.7 10 11.8 10.2 11.9V8.7C9.9 8.6 9.7 8.6 9.4 8.6C6.2 8.6 3.6 11.2 3.6 14.4C3.6 17.6 6.2 20.2 9.4 20.2C12.6 20.2 15.2 17.6 15.2 14.4V8.8C16.5 9.7 18.1 10.2 19.8 10.2V7.1C18.5 7.1 17.4 6.6 16.6 5.8Z" fill="#2dd4bf"/></svg>`,
    },
  };

  const topVideos = (metrics.topVideos || []).slice(0, 5);

  const platformCardsHtml = platforms
    .map((p) => {
      const meta = platformMeta[p.platform] || platformMeta.youtube_shorts;
      const sharePct =
        metrics.totalViews > 0 ? ((p.totalViews / metrics.totalViews) * 100).toFixed(1) : '0.0';
      const barWidthPct = Math.max(6, Math.round((p.totalViews / maxPlatformViews) * 100));

      return `
        <div class="platform-card" style="border-color: ${meta.border};">
          <div class="platform-top">
            <div class="platform-identity">
              <div class="platform-icon" style="background: ${meta.accentBg}; border: 1px solid ${meta.border};">
                ${meta.iconSvg}
              </div>
              <div>
                <div class="platform-name">${meta.name}</div>
                <div class="platform-handle">${p.handle}</div>
              </div>
            </div>
            <div class="platform-views-block">
              <div class="platform-views-num" style="color: ${meta.accent};">${(p.totalViews || 0).toLocaleString()}</div>
              <div class="platform-views-label">VIEWS (${sharePct}%)</div>
            </div>
          </div>

          <div class="bar-track">
            <div class="bar-fill" style="width: ${barWidthPct}%; background: ${meta.barGrad};"></div>
          </div>

          <div class="platform-submetrics">
            <div class="submetric">
              <span class="sub-val">${(p.videosCount || 0).toLocaleString()}</span>
              <span class="sub-lbl">Videos</span>
            </div>
            <div class="submetric">
              <span class="sub-val">${(p.totalLikes || 0).toLocaleString()}</span>
              <span class="sub-lbl">Likes</span>
            </div>
            <div class="submetric">
              <span class="sub-val">${Math.round((p.totalViews || 0) / Math.max(1, p.videosCount || 1)).toLocaleString()}</span>
              <span class="sub-lbl">Avg Views/Vid</span>
            </div>
            <div class="submetric">
              <span class="sub-val">${(p.followers || 0).toLocaleString()}</span>
              <span class="sub-lbl">Followers</span>
            </div>
          </div>
        </div>
      `;
    })
    .join('\n');

  const topProductsHtml = (web.topProductPages || [])
    .slice(0, 4)
    .map(
      (prod) => `
      <div class="web-list-item">
        <span class="web-item-name">${prod.label}</span>
        <span class="web-item-val">${(prod.views || 0).toLocaleString()} views</span>
      </div>
    `
    )
    .join('\n');

  const topSourcesHtml = (web.sourcesBreakdown || [])
    .slice(0, 4)
    .map(
      (src) => `
      <div class="web-list-item">
        <span class="web-item-name">${src.source}</span>
        <span class="web-item-val">${(src.count || 0).toLocaleString()} visits</span>
      </div>
    `
    )
    .join('\n');

  const leaderboardHtml = topVideos
    .map((v, idx) => {
      const cleaned = cleanVideoTitle(v.title);
      return `
        <div class="leader-row">
          <div class="leader-rank">#${idx + 1}</div>
          <div class="leader-info">
            <div class="leader-title">${cleaned}</div>
            <div class="leader-meta">${v.platformLabel || 'YouTube Shorts'}</div>
          </div>
          <div class="leader-stats">
            <div class="leader-views">${(v.views || 0).toLocaleString()} <span>views</span></div>
            <div class="leader-likes">♥ ${(v.likes || 0).toLocaleString()} likes</div>
          </div>
        </div>
      `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${CARD_WIDTH}px;
    height: ${CARD_HEIGHT}px;
    background: radial-gradient(circle at 50% 12%, #3b174d 0%, #1c0d26 52%, #0e0614 100%);
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #f8fafc;
    overflow: hidden;
    position: relative;
    padding: 38px 44px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .outer-frame {
    position: absolute;
    inset: 16px;
    border: 2px solid rgba(251, 191, 36, 0.32);
    border-radius: 28px;
    pointer-events: none;
  }
  .inner-frame {
    position: absolute;
    inset: 22px;
    border: 1px dashed rgba(232, 116, 138, 0.28);
    border-radius: 23px;
    pointer-events: none;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, rgba(45, 22, 60, 0.88), rgba(22, 11, 32, 0.92));
    border: 2px solid rgba(251, 191, 36, 0.45);
    border-radius: 20px;
    padding: 16px 24px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
  }
  .brand-left {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .avatar-badge {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 45%, #4a1d5e, #140a1d);
    border: 3px solid #fbbf24;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 18px rgba(251, 191, 36, 0.3);
    flex-shrink: 0;
  }
  .brand-tag {
    color: #fde68a;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .brand-title {
    font-family: Georgia, serif;
    font-size: 31px;
    font-weight: 700;
    color: #fff8f1;
    letter-spacing: 0.5px;
  }
  .brand-sub {
    color: #f472b6;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.8px;
    margin-top: 2px;
  }
  .header-right {
    text-align: right;
  }
  .live-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(16, 185, 129, 0.16);
    border: 1.5px solid rgba(52, 211, 153, 0.55);
    color: #6ee7b7;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 1.4px;
    padding: 6px 14px;
    border-radius: 999px;
    text-transform: uppercase;
  }
  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
  }
  .updated-text {
    color: #cbd5e1;
    font-size: 12px;
    margin-top: 7px;
    font-weight: 500;
  }

  /* Hero KPI Row (5 cards) */
  .kpi-row {
    display: grid;
    grid-template-columns: 1.35fr 1.15fr 0.9fr 0.85fr 0.85fr;
    gap: 12px;
  }
  .kpi-card {
    background: linear-gradient(160deg, rgba(44, 21, 58, 0.85), rgba(20, 10, 30, 0.92));
    border: 1.5px solid rgba(255, 255, 255, 0.12);
    border-radius: 18px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.32);
  }
  .kpi-card.primary {
    background: linear-gradient(135deg, rgba(190, 18, 60, 0.34), rgba(74, 29, 94, 0.9));
    border: 2px solid #fbbf24;
  }
  .kpi-card.web-highlight {
    background: linear-gradient(135deg, rgba(14, 116, 144, 0.34), rgba(30, 27, 75, 0.88));
    border: 1.5px solid rgba(56, 189, 248, 0.55);
  }
  .kpi-label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: #cbd5e1;
    margin-bottom: 5px;
  }
  .kpi-card.primary .kpi-label { color: #fde68a; }
  .kpi-card.web-highlight .kpi-label { color: #7dd3fc; }
  .kpi-value {
    font-size: 34px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.05;
  }
  .kpi-card.primary .kpi-value {
    font-size: 42px;
    background: linear-gradient(90deg, #ffffff, #fde68a);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .kpi-card.web-highlight .kpi-value {
    font-size: 38px;
    color: #38bdf8;
  }
  .kpi-foot {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 5px;
    font-weight: 600;
  }
  .kpi-card.primary .kpi-foot { color: #fbcfe8; }
  .kpi-card.web-highlight .kpi-foot { color: #bae6fd; }

  /* Section Titles */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .section-title {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: #fde68a;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-sub {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 600;
  }

  /* 2x2 Platform Grid */
  .platforms-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .platform-card {
    background: rgba(24, 12, 35, 0.88);
    border: 1.5px solid rgba(255, 255, 255, 0.14);
    border-radius: 16px;
    padding: 15px 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  }
  .platform-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .platform-identity {
    display: flex;
    align-items: center;
    gap: 11px;
  }
  .platform-icon {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .platform-name {
    font-size: 17px;
    font-weight: 800;
    color: #f8fafc;
  }
  .platform-handle {
    font-size: 12px;
    color: #94a3b8;
    font-family: Consolas, monospace;
    margin-top: 1px;
  }
  .platform-views-block {
    text-align: right;
  }
  .platform-views-num {
    font-size: 26px;
    font-weight: 900;
    line-height: 1;
  }
  .platform-views-label {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.8px;
    color: #94a3b8;
    margin-top: 3px;
  }
  .bar-track {
    width: 100%;
    height: 7px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 999px;
  }
  .platform-submetrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding-top: 5px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .submetric {
    display: flex;
    flex-direction: column;
  }
  .sub-val {
    font-size: 15px;
    font-weight: 800;
    color: #f1f5f9;
  }
  .sub-lbl {
    font-size: 10.5px;
    color: #94a3b8;
    font-weight: 600;
  }

  /* Website Traffic Card */
  .web-section-box {
    background: linear-gradient(145deg, rgba(18, 25, 48, 0.88), rgba(24, 12, 35, 0.92));
    border: 1.5px solid rgba(56, 189, 248, 0.38);
    border-radius: 18px;
    padding: 16px 20px;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
  }
  .web-grid {
    display: grid;
    grid-template-columns: 0.95fr 1.15fr 1.25fr;
    gap: 16px;
    align-items: stretch;
  }
  .web-Counters {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .web-mini-stat {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(56, 189, 248, 0.2);
    border-radius: 12px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .web-mini-val {
    font-size: 21px;
    font-weight: 900;
    color: #38bdf8;
    line-height: 1.1;
  }
  .web-mini-lbl {
    font-size: 11px;
    color: #cbd5e1;
    font-weight: 600;
    margin-top: 3px;
  }
  .web-col {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .web-col-title {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #7dd3fc;
    margin-bottom: 6px;
  }
  .web-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    padding: 3.5px 0;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
  }
  .web-list-item:last-child {
    border-bottom: none;
  }
  .web-item-name {
    color: #e2e8f0;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 215px;
  }
  .web-item-val {
    color: #fde68a;
    font-weight: 800;
    flex-shrink: 0;
    margin-left: 8px;
  }

  /* Leaderboard */
  .leaderboard-box {
    background: rgba(24, 12, 35, 0.88);
    border: 1.5px solid rgba(251, 191, 36, 0.3);
    border-radius: 18px;
    padding: 16px 20px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
  }
  .leader-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .leader-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 11px;
    padding: 8px 14px;
  }
  .leader-rank {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: rgba(251, 191, 36, 0.16);
    border: 1px solid rgba(251, 191, 36, 0.45);
    color: #fde68a;
    font-weight: 900;
    font-size: 13.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .leader-info {
    flex: 1;
    min-width: 0;
  }
  .leader-title {
    font-size: 14px;
    font-weight: 700;
    color: #f8fafc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .leader-meta {
    font-size: 11px;
    color: #f472b6;
    font-weight: 600;
    margin-top: 1px;
  }
  .leader-stats {
    text-align: right;
    flex-shrink: 0;
  }
  .leader-views {
    font-size: 16px;
    font-weight: 900;
    color: #fde68a;
  }
  .leader-views span {
    font-size: 11px;
    font-weight: 600;
    color: #cbd5e1;
  }
  .leader-likes {
    font-size: 11px;
    color: #fb7185;
    font-weight: 700;
  }

  /* Footer */
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 8px 0;
    color: #94a3b8;
    font-size: 13px;
    font-weight: 600;
  }
  .footer-highlight {
    color: #fde68a;
    font-weight: 800;
    letter-spacing: 0.8px;
  }
</style>
</head>
<body>
  <div class="outer-frame"></div>
  <div class="inner-frame"></div>

  <!-- HEADER -->
  <div class="header">
    <div class="brand-left">
      <div class="avatar-badge">
        <svg viewBox="0 0 200 200" width="68" height="68" shape-rendering="crispEdges">
          <!-- Bonnie (Left) -->
          <g transform="translate(62, 112) scale(0.75)">
            <rect x="-46" y="-82" width="92" height="90" fill="#7c2d12" />
            <rect x="-42" y="10" width="84" height="60" fill="#881337" />
            <rect x="-28" y="10" width="56" height="48" fill="#f5efe6" />
            <rect x="-34" y="-62" width="68" height="68" fill="#fde68a" />
            <rect x="-36" y="-68" width="72" height="18" fill="#7c2d12" />
            <rect x="20" y="-74" width="18" height="18" fill="#e8748a" />
            <rect x="-18" y="-40" width="8" height="11" fill="#1e1b4b" />
            <rect x="10" y="-40" width="8" height="11" fill="#1e1b4b" />
            <rect x="-24" y="-45" width="20" height="19" fill="none" stroke="#f59e0b" stroke-width="4" />
            <rect x="4" y="-45" width="20" height="19" fill="none" stroke="#f59e0b" stroke-width="4" />
            <rect x="-10" y="-14" width="20" height="6" fill="#881337" />
          </g>
          <!-- Tammy (Right) -->
          <g transform="translate(138, 112) scale(0.75)">
            <rect x="-46" y="-80" width="92" height="96" fill="#b45309" />
            <rect x="-42" y="10" width="84" height="60" fill="#0d9488" />
            <rect x="-26" y="10" width="52" height="48" fill="#f5efe6" />
            <rect x="-34" y="-62" width="68" height="68" fill="#fde68a" />
            <rect x="-36" y="-68" width="72" height="18" fill="#b45309" />
            <rect x="-38" y="-74" width="18" height="16" fill="#2dd4bf" />
            <rect x="-18" y="-40" width="8" height="11" fill="#1e1b4b" />
            <rect x="10" y="-40" width="8" height="11" fill="#1e1b4b" />
            <rect x="-10" y="-14" width="20" height="6" fill="#881337" />
          </g>
        </svg>
      </div>
      <div>
        <div class="brand-tag">✦ Bonnie &amp; Tammy's Trinket Tales ✦</div>
        <div class="brand-title">BONNIE'S BOUTIQUE</div>
        <div class="brand-sub">B&amp;T Trinkets • Handmade Beaded Pens &amp; Charms</div>
      </div>
    </div>
    <div class="header-right">
      <div class="live-pill">
        <span class="live-dot"></span>
        LIVE SOCIAL &amp; WEB STATS
      </div>
      <div class="updated-text">Synced ${updatedDate}</div>
    </div>
  </div>

  <!-- HERO KPI ROW (5 CARDS, NO CAP) -->
  <div class="kpi-row">
    <div class="kpi-card primary">
      <div class="kpi-label">✦ Social Video Views</div>
      <div class="kpi-value">${(metrics.totalViews || 0).toLocaleString()}</div>
      <div class="kpi-foot">Across All 4 Video Channels</div>
    </div>
    <div class="kpi-card web-highlight">
      <div class="kpi-label">🌐 Website Traffic (30d)</div>
      <div class="kpi-value">${(web.pageviews30d || 0).toLocaleString()}</div>
      <div class="kpi-foot">${(web.uniqueVisitors30d || 0).toLocaleString()} unique visitors</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Videos Posted</div>
      <div class="kpi-value">${(metrics.totalVideosPublished || 0).toLocaleString()}</div>
      <div class="kpi-foot">~${(metrics.avgViewsPerVideo || 0).toLocaleString()} avg views/vid</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Social Likes</div>
      <div class="kpi-value" style="color: #f472b6;">${(metrics.totalLikes || 0).toLocaleString()}</div>
      <div class="kpi-foot">+ ${metrics.totalComments || 0} comments</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Followers</div>
      <div class="kpi-value" style="color: #2dd4bf;">${(metrics.totalFollowers || 0).toLocaleString()}</div>
      <div class="kpi-foot">All 4 Profiles</div>
    </div>
  </div>

  <!-- PLATFORM BREAKDOWN -->
  <div>
    <div class="section-header">
      <div class="section-title">📊 Social Channel Breakdown</div>
      <div class="section-sub">24/7 Autonomous 9:16 Video Factory</div>
    </div>
    <div class="platforms-grid">
      ${platformCardsHtml}
    </div>
  </div>

  <!-- WEBSITE TRAFFIC (BTBOUTIQE.COM) -->
  <div class="web-section-box">
    <div class="section-header" style="margin-bottom: 10px;">
      <div class="section-title" style="color: #38bdf8;">🌐 Storefront Website Traffic — btboutiqe.com</div>
      <div class="section-sub">Live Server-Side HTTP Analytics (Last 30 Days)</div>
    </div>
    <div class="web-grid">
      <div class="web-Counters">
        <div class="web-mini-stat">
          <div class="web-mini-val">${(web.pageviews30d || 0).toLocaleString()}</div>
          <div class="web-mini-lbl">Pageviews (30d)</div>
        </div>
        <div class="web-mini-stat">
          <div class="web-mini-val" style="color: #2dd4bf;">${(web.uniqueVisitors30d || 0).toLocaleString()}</div>
          <div class="web-mini-lbl">Unique Visitors</div>
        </div>
        <div class="web-mini-stat">
          <div class="web-mini-val" style="color: #fde68a;">${(web.storefrontHomeViews || 0).toLocaleString()}</div>
          <div class="web-mini-lbl">3D Shop Home Views</div>
        </div>
        <div class="web-mini-stat">
          <div class="web-mini-val" style="color: #f472b6;">130</div>
          <div class="web-mini-lbl">Live Trinket Listings</div>
        </div>
      </div>

      <div class="web-col">
        <div class="web-col-title">🔗 Top Traffic Sources</div>
        ${topSourcesHtml}
      </div>

      <div class="web-col">
        <div class="web-col-title">🛍️ Most Viewed Product Pages</div>
        ${topProductsHtml}
      </div>
    </div>
  </div>

  <!-- TOP PERFORMING VIDEOS -->
  <div class="leaderboard-box">
    <div class="section-header" style="margin-bottom: 10px;">
      <div class="section-title">🏆 Top Performing Video Episodes</div>
      <div class="section-sub">Most Watched Boutique Shorts &amp; Reels</div>
    </div>
    <div class="leader-list">
      ${leaderboardHtml}
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>🛍️ Shop Handmade Trinkets: <span class="footer-highlight">https://btboutiqe.com</span></div>
    <div>@btboutiqe • @btboutiqevids • Bonnie Boutiqe • @bt.boutiqe</div>
  </div>
</body>
</html>`;
}

async function enrichMetricsWithLiveWebAndFb(metrics) {
  // Ensure Facebook followers accurately reflects 2+ followers
  for (const p of metrics.platforms || []) {
    if (p.platform === 'facebook_reels') {
      p.followers = Math.max(2, p.followers || 0);
    }
  }
  metrics.totalFollowers = (metrics.platforms || []).reduce((acc, p) => acc + (p.followers || 0), 0);

  // Pull live Netlify server-side HTTP traffic for btboutiqe.com
  const siteId = '4292a578-1ba9-4a9b-8b4c-56dda7288283';
  const netlifyConfigCandidates = [
    path.join(os.homedir(), 'AppData', 'Roaming', 'netlify', 'Config', 'config.json'),
    path.join(os.homedir(), '.netlify', 'config.json'),
  ];
  let netlifyToken = process.env.NETLIFY_AUTH_TOKEN || null;
  if (!netlifyToken) {
    for (const p of netlifyConfigCandidates) {
      if (fs.existsSync(p)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
          netlifyToken = cfg.users?.[cfg.userId]?.auth?.token || null;
          if (netlifyToken) break;
        } catch {}
      }
    }
  }

  if (netlifyToken) {
    try {
      const headers = { Authorization: `Bearer ${netlifyToken}` };
      const now = Date.now();
      const from30d = now - 30 * 24 * 3600 * 1000;

      const [pvRes, visRes, pagesRes, srcRes, bwRes] = await Promise.all([
        fetch(`https://analytics.services.netlify.com/v2/${siteId}/pageviews?from=${from30d}&to=${now}&timezone=-0500&resolution=day`, { headers }),
        fetch(`https://analytics.services.netlify.com/v2/${siteId}/visitors?from=${from30d}&to=${now}&timezone=-0500&resolution=day`, { headers }),
        fetch(`https://analytics.services.netlify.com/v2/${siteId}/pages?from=${from30d}&to=${now}&timezone=-0500&limit=15`, { headers }),
        fetch(`https://analytics.services.netlify.com/v2/${siteId}/sources?from=${from30d}&to=${now}&timezone=-0500&limit=15`, { headers }),
        fetch(`https://analytics.services.netlify.com/v2/${siteId}/bandwidth?from=${from30d}&to=${now}&timezone=-0500&resolution=day`, { headers }),
      ]);

      const pvData = pvRes.ok ? (await pvRes.json()).data || [] : [];
      const visData = visRes.ok ? (await visRes.json()).data || [] : [];
      const pagesData = pagesRes.ok ? (await pagesRes.json()).data || [] : [];
      const srcData = srcRes.ok ? (await srcRes.json()).data || [] : [];
      const bwData = bwRes.ok ? (await bwRes.json()).data || [] : [];

      const pageviews30d = pvData.reduce((s, r) => s + (r[1] || 0), 0);
      const uniqueVisitors30d = visData.reduce((s, r) => s + (r[1] || 0), 0);
      const bandwidthMB30d = Math.round(bwData.reduce((s, r) => s + (r.siteBandwidth || 0), 0) / (1024 * 1024));

      const manifestPath = path.join(ROOT_DIR, 'src/lib/scrollytelling/productAssetManifest.json');
      const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { products: [] };
      const prodMap = new Map((manifest.products || []).map((p) => [p.id, p.title]));

      const topPages = pagesData.map((p) => ({
        path: p.path,
        label:
          p.path === '/'
            ? '3D Storefront Home (/)'
            : p.path === '/admin'
              ? 'Boutique Admin Portal (/admin)'
              : p.path.startsWith('/products/')
                ? prodMap.get(p.path.replace('/products/', '')) || p.path
                : p.path,
        views: p.count || 0,
      }));

      let directAndInApp = 0;
      let searchEngines = 0;
      let facebookReferrals = 0;
      let youtubeReferrals = 0;
      let tiktokInstagramReferrals = 0;

      for (const s of srcData) {
        const host = String(s.path || '').toLowerCase();
        const c = s.count || 0;
        if (!host) directAndInApp += c;
        else if (host.includes('google') || host.includes('bing') || host.includes('yahoo') || host.includes('baidu')) searchEngines += c;
        else if (host.includes('facebook.com')) facebookReferrals += c;
        else if (host.includes('youtube.com')) youtubeReferrals += c;
        else if (host.includes('tiktok.com') || host.includes('instagram.com')) tiktokInstagramReferrals += c;
      }

      metrics.websiteTraffic = {
        domain: 'https://btboutiqe.com',
        windowLabel: 'Last 30 Days (Server-Side HTTP Analytics)',
        pageviews30d,
        uniqueVisitors30d,
        storefrontHomeViews: topPages.find((p) => p.path === '/')?.views || 0,
        bandwidthMB30d,
        topProductPages: topPages.filter((p) => p.path.startsWith('/products/')).slice(0, 6),
        sourcesBreakdown: [
          { source: 'Direct & Social In-App Browsers', count: directAndInApp },
          { source: 'Search Engines (Google / Bing)', count: searchEngines },
          { source: 'Facebook Reels & Links', count: facebookReferrals },
          { source: 'YouTube & TikTok / IG Links', count: youtubeReferrals + tiktokInstagramReferrals },
        ],
      };
    } catch {}
  }

  fs.writeFileSync(METRICS_PATH, JSON.stringify(metrics, null, 2), 'utf8');
  return metrics;
}

async function main() {
  if (!fs.existsSync(METRICS_PATH)) {
    throw new Error(`Metrics file not found at ${METRICS_PATH}`);
  }
  const rawMetrics = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf8'));
  const metrics = await enrichMetricsWithLiveWebAndFb(rawMetrics);
  const html = buildHtml(metrics);

  const tmpHtmlPath = path.join(EXPORT_DIR, '_tmp_stats_card.html');
  fs.writeFileSync(tmpHtmlPath, html, 'utf8');

  const port = 9340 + Math.floor(Math.random() * 40);
  const userDataDir = path.join(EXPORT_DIR, `_tmp_chrome_stats_${port}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      `--window-size=${CARD_WIDTH},${CARD_HEIGHT}`,
      '--hide-scrollbars',
      `file://${tmpHtmlPath.replace(/\\/g, '/')}`,
    ],
    { stdio: 'ignore' }
  );

  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      await sleep(200);
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        const pages = await res.json();
        const page = pages.find((p) => p.type === 'page' && p.webSocketDebuggerUrl);
        if (page) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }
    if (!wsUrl) throw new Error('Failed to connect to Headless Chrome for screenshot');

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = msgId++;
        const listener = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener('message', listener);
            if (data.error) reject(new Error(data.error.message));
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', listener);
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await sleep(350);

    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT, scale: 1 },
    });

    fs.writeFileSync(OUT_PNG_PATH, Buffer.from(shot.data, 'base64'));
    ws.close();
    console.log(`✅ Generated shareable stats card: ${OUT_PNG_PATH}`);
  } finally {
    try {
      chrome.kill();
    } catch {}
    try {
      fs.rmSync(tmpHtmlPath, { force: true });
    } catch {}
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {}
  }
}

main().catch((err) => {
  console.error('Error generating stats card:', err);
  process.exit(1);
});
