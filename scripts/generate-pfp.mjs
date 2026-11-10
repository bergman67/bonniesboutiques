#!/usr/bin/env node
/**
 * scripts/generate-pfp.mjs
 * Generates an 800x800 Profile Picture (PFP) and 2560x1440 YouTube Banner
 * for Bonnie's Boutique ("B&T Trinkets") featuring animated Bonnie & Tammy + floating trinkets.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const EXPORT_DIR = path.join(ROOT_DIR, 'public', 'exports');
fs.mkdirSync(EXPORT_DIR, { recursive: true });

const svgPfp = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#4a1d5e" />
      <stop offset="55%" stop-color="#2d1b3d" />
      <stop offset="100%" stop-color="#140a1d" />
    </radialGradient>
    <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde68a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <linearGradient id="roseRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#be123c" />
      <stop offset="50%" stop-color="#e8748a" />
      <stop offset="100%" stop-color="#be123c" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Circle & Full Bleed -->
  <rect width="800" height="800" fill="url(#bgGrad)" />
  <circle cx="400" cy="400" r="374" fill="none" stroke="url(#goldRim)" stroke-width="14" opacity="0.95" />
  <circle cx="400" cy="400" r="352" fill="none" stroke="#e8748a" stroke-width="4" stroke-dasharray="12 10" opacity="0.7" />

  <!-- Cozy Lantern Glow & Sparkles -->
  <circle cx="400" cy="360" r="240" fill="#e8748a" opacity="0.16" />
  <circle cx="170" cy="210" r="7" fill="#fde68a" filter="url(#glow)" />
  <circle cx="630" cy="200" r="8" fill="#fde68a" filter="url(#glow)" />
  <circle cx="400" cy="120" r="9" fill="#fbbf24" filter="url(#glow)" />
  <circle cx="135" cy="390" r="6" fill="#e8748a" />
  <circle cx="665" cy="380" r="6" fill="#2dd4bf" />

  <!-- Top Sparkle Crown Text -->
  <text x="400" y="150" text-anchor="middle" fill="#fde68a" font-family="Georgia, serif" font-weight="bold" font-size="30" letter-spacing="4">✦ EST. BY HAND ✦</text>

  <!-- GRANDMA BONNIE (Left) - Pixel Art Avatar -->
  <g transform="translate(265, 365) scale(1.75)" shape-rendering="crispEdges">
    <!-- Auburn Hair Back -->
    <rect x="-46" y="-82" width="92" height="90" rx="8" fill="#7c2d12" />
    <rect x="-36" y="-94" width="72" height="20" fill="#9a3412" />
    <!-- Rose Velvet Dress -->
    <rect x="-42" y="10" width="84" height="86" fill="#881337" />
    <!-- White Lace Apron Collar -->
    <rect x="-28" y="10" width="56" height="62" fill="#f5efe6" />
    <rect x="-18" y="10" width="36" height="14" fill="#ffe4e6" />
    <!-- Warm Face -->
    <rect x="-34" y="-62" width="68" height="68" fill="#fde68a" />
    <!-- Bangs -->
    <rect x="-36" y="-68" width="72" height="18" fill="#7c2d12" />
    <!-- Signature Rose Hairclip -->
    <rect x="20" y="-74" width="18" height="18" fill="#e8748a" />
    <rect x="25" y="-69" width="8" height="8" fill="#fff1f2" />
    <!-- Rosy Cheeks -->
    <rect x="-28" y="-22" width="12" height="8" fill="#fb7185" />
    <rect x="16" y="-22" width="12" height="8" fill="#fb7185" />
    <!-- Eyes -->
    <rect x="-18" y="-40" width="8" height="11" fill="#1e1b4b" />
    <rect x="10" y="-40" width="8" height="11" fill="#1e1b4b" />
    <rect x="-16" y="-39" width="3" height="3" fill="#ffffff" />
    <rect x="12" y="-39" width="3" height="3" fill="#ffffff" />
    <!-- Golden Grandma Glasses -->
    <rect x="-24" y="-45" width="20" height="19" fill="none" stroke="#f59e0b" stroke-width="3.5" />
    <rect x="4" y="-45" width="20" height="19" fill="none" stroke="#f59e0b" stroke-width="3.5" />
    <line x1="-4" y1="-36" x2="4" y2="-36" stroke="#f59e0b" stroke-width="3.5" />
    <!-- Warm Smile -->
    <rect x="-10" y="-14" width="20" height="6" fill="#881337" />
  </g>

  <!-- DAUGHTER TAMMY (Right) - Pixel Art Avatar -->
  <g transform="translate(535, 365) scale(1.75)" shape-rendering="crispEdges">
    <!-- Caramel Hair Back -->
    <rect x="-46" y="-80" width="92" height="96" fill="#b45309" />
    <rect x="-36" y="-90" width="72" height="18" fill="#d97706" />
    <!-- Teal Boutique Dress -->
    <rect x="-42" y="10" width="84" height="86" fill="#0d9488" />
    <!-- Cream Collar -->
    <rect x="-26" y="10" width="52" height="58" fill="#f5efe6" />
    <!-- Face -->
    <rect x="-34" y="-62" width="68" height="68" fill="#fde68a" />
    <!-- Caramel Bangs -->
    <rect x="-36" y="-68" width="72" height="18" fill="#b45309" />
    <!-- Teal Hair Bow -->
    <rect x="-38" y="-74" width="18" height="16" fill="#2dd4bf" />
    <!-- Rosy Cheeks -->
    <rect x="-28" y="-22" width="12" height="8" fill="#fb7185" />
    <rect x="16" y="-22" width="12" height="8" fill="#fb7185" />
    <!-- Eyes -->
    <rect x="-18" y="-40" width="8" height="11" fill="#1e1b4b" />
    <rect x="10" y="-40" width="8" height="11" fill="#1e1b4b" />
    <rect x="-16" y="-39" width="3" height="3" fill="#ffffff" />
    <rect x="12" y="-39" width="3" height="3" fill="#ffffff" />
    <!-- Happy Smile -->
    <rect x="-10" y="-14" width="20" height="6" fill="#881337" />
  </g>

  <!-- Center Floating Heart & Beaded Pen Charm Emblem -->
  <g transform="translate(400, 265)">
    <circle cx="0" cy="0" r="36" fill="#1a0f24" stroke="#fbbf24" stroke-width="4" />
    <path d="M0 16 C-22 0 -26 -18 -12 -22 C-4 -24 0 -16 0 -12 C0 -16 4 -24 12 -22 C26 -18 22 0 0 16 Z" fill="#e8748a" />
  </g>

  <!-- Mahogany Boutique Counter & Ribbon Banner -->
  <rect x="95" y="510" width="610" height="32" rx="10" fill="#78350f" stroke="#fbbf24" stroke-width="4" />
  
  <!-- Main Brand Nameplate -->
  <rect x="85" y="535" width="630" height="135" rx="34" fill="#1a0f24" stroke="url(#goldRim)" stroke-width="6" />
  <text x="400" y="596" text-anchor="middle" fill="#f5efe6" font-family="Georgia, serif" font-weight="bold" font-size="52">BONNIE'S BOUTIQUE</text>
  <text x="400" y="644" text-anchor="middle" fill="#e8748a" font-family="monospace" font-weight="bold" font-size="27" letter-spacing="3">B&amp;T TRINKETS • BTBOUTIQE.COM</text>
</svg>`;

async function main() {
  const outPfp = path.join(EXPORT_DIR, 'bonnies-boutique-pfp.png');
  await sharp(Buffer.from(svgPfp)).png().toFile(outPfp);
  console.log(`✅ Generated 800x800 Profile Picture (PFP): public/exports/bonnies-boutique-pfp.png`);

  // Also generate a matching 2560x1440 YouTube Channel Banner (safe center 1546x423)
  const svgBanner = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440">
    <defs>
      <linearGradient id="bGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#140a1d" />
        <stop offset="50%" stop-color="#2d1b3d" />
        <stop offset="100%" stop-color="#1a0f24" />
      </linearGradient>
    </defs>
    <rect width="2560" height="1440" fill="url(#bGrad)" />
    <!-- Safe zone frame (507..2053, 508..931) -->
    <rect x="520" y="515" width="1520" height="410" rx="36" fill="#1a0f24" stroke="#fbbf24" stroke-width="6" opacity="0.92" />
    <text x="1280" y="625" text-anchor="middle" fill="#fde68a" font-family="monospace" font-weight="bold" font-size="34" letter-spacing="6">✦ HANDCRAFTED WITH GENERATIONAL HEART ✦</text>
    <text x="1280" y="745" text-anchor="middle" fill="#f5efe6" font-family="Georgia, serif" font-weight="bold" font-size="92">BONNIE'S BOUTIQUE</text>
    <text x="1280" y="835" text-anchor="middle" fill="#e8748a" font-family="sans-serif" font-weight="bold" font-size="40" letter-spacing="3">Handmade Beaded Pens • Keychains • Charms • btboutiqe.com</text>
  </svg>`;
  const outBanner = path.join(EXPORT_DIR, 'bonnies-boutique-youtube-banner.png');
  await sharp(Buffer.from(svgBanner)).png().toFile(outBanner);
  console.log(`✅ Generated 2560x1440 YouTube Banner: public/exports/bonnies-boutique-youtube-banner.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
