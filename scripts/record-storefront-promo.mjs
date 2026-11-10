#!/usr/bin/env node
/**
 * scripts/record-storefront-promo.mjs
 * Records the Official "Bonnie's Boutique (btboutiqe.com)" Storefront Promo Video
 *
 * Features:
 * - Self-contained local HTTP server + Headless Chrome 1080x1920 (9:16 vertical) capture
 * - Showcases real transparent product cutouts from public/uploads/transparent/
 * - Features animated 16-bit Bonnie & Tammy welcoming Facebook friends & family
 * - Synthesizes 44.1kHz 16-bit Stereo WAV soundtrack (72 BPM cozy lo-fi chords + chimes + voice blips)
 * - Outputs ready-to-upload MP4: public/exports/bonnies-boutique-storefront-promo.mp4
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const EXPORT_DIR = path.join(ROOT_DIR, 'public', 'exports');
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache', 'promo_recorder');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

fs.mkdirSync(EXPORT_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, 'src/lib/scrollytelling/productAssetManifest.json'), 'utf8')
);
const showcaseProducts = (manifest.products || []).slice(0, 6);

const BEATS = [
  {
    speaker: 'bonnie',
    badge: '👵 GRANDMA BONNIE',
    title: 'Welcome to Bonnie\'s Boutique!',
    subtitle: 'Handcrafted Beaded Pens • Keychains • Charms',
    dialogue: 'Hello Facebook friends & family! Come step inside our new online craft shop at btboutiqe.com!',
    durationSec: 4.5,
    effect: 'screen_tap',
  },
  {
    speaker: 'tammy',
    badge: '✨ DAUGHTER TAMMY',
    title: 'Generational Crafting & 3D Showcase',
    subtitle: '96 One-of-a-Kind Handmade Treasures',
    dialogue: 'Every single beaded pen, keychain, and charm is lovingly handmade by Mom and me!',
    durationSec: 4.5,
    effect: 'carousel',
  },
  {
    speaker: 'bonnie',
    badge: '👵 GRANDMA BONNIE',
    title: 'Interactive Animated Storefront',
    subtitle: 'Spin Our Floating 3D Cutouts & Chat With Us!',
    dialogue: 'You can explore our cozy animated counter, inspect every bead up close, and pick your favorite!',
    durationSec: 4.5,
    effect: 'appraisal',
  },
  {
    speaker: 'both',
    badge: '💝 SHOP NOW AT BTBOUTIQE.COM',
    title: 'btboutiqe.com',
    subtitle: 'Tap the Link in Our Post to Visit Today!',
    dialogue: 'Thank you for supporting our family boutique! Tap btboutiqe.com and say hello in the comments!',
    durationSec: 4.5,
    effect: 'finale',
  },
];

function synthesizePromoWav(outWavPath) {
  const sampleRate = 44100;
  const totalSec = BEATS.reduce((acc, b) => acc + b.durationSec, 0);
  const numSamples = Math.ceil(totalSec * sampleRate);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  const chords = [
    [174.61, 220.0, 261.63, 329.63],
    [164.81, 196.0, 246.94, 293.66],
    [146.83, 174.61, 220.0, 261.63],
    [130.81, 164.81, 196.0, 246.94],
  ];
  const chordDurSec = (60 / 72) * 4;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.floor(t / chordDurSec) % chords.length;
    const barTime = t % chordDurSec;
    const env = Math.min(1, barTime / 0.12) * Math.exp(-barTime * 0.5);
    const freqs = chords[chordIdx];
    const vibrato = 1 + Math.sin(2 * Math.PI * 4.2 * t) * 0.002;
    let sig = 0;
    for (let c = 0; c < freqs.length; c++) {
      sig += Math.sin(2 * Math.PI * freqs[c] * vibrato * t) * 0.035;
    }
    const vinyl = (Math.random() * 2 - 1) * 0.002;
    left[i] += sig * env + vinyl;
    right[i] += sig * env * 0.96 + vinyl;
  }

  function addTone(startSec, durSec, fStart, fEnd, gain) {
    const startIdx = Math.max(0, Math.floor(startSec * sampleRate));
    const len = Math.floor(durSec * sampleRate);
    for (let i = 0; i < len && startIdx + i < left.length; i++) {
      const p = i / len;
      const env = Math.sin(Math.PI * p);
      const freq = fStart + (fEnd - fStart) * p;
      const t = i / sampleRate;
      const s = Math.sin(2 * Math.PI * freq * t) * gain * env;
      left[startIdx + i] += s;
      right[startIdx + i] += s;
    }
  }

  let beatStart = 0;
  for (const beat of BEATS) {
    // Magical chime on each scene transition
    addTone(beatStart + 0.04, 0.22, 587.33, 880, 0.14);
    addTone(beatStart + 0.16, 0.28, 880, 1174.66, 0.12);

    const text = beat.dialogue;
    const typingDur = beat.durationSec * 0.78;
    const baseFreq = beat.speaker === 'bonnie' ? 395 : 535;
    for (let c = 0; c < text.length; c += 2) {
      if (text[c] === ' ') continue;
      const charTime = beatStart + (c / text.length) * typingDur;
      const f0 = baseFreq + (((c * 37) % 80) - 30);
      addTone(charTime, 0.045, f0, f0 * 1.14, 0.13);
    }
    beatStart += beat.durationSec;
  }

  const dataBytes = numSamples * 4;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    buf.writeInt16LE(Math.floor(l * 32767), offset);
    buf.writeInt16LE(Math.floor(r * 32767), offset + 2);
    offset += 4;
  }
  fs.writeFileSync(outWavPath, buf);
}

function buildPromoHtml() {
  const productsJson = JSON.stringify(
    showcaseProducts.map((p) => ({
      title: p.title,
      price: p.price || 9.5,
      url: p.transparentLocalUrl,
    }))
  );
  const beatsJson = JSON.stringify(BEATS);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; padding: 0; background: #140a1d; overflow: hidden; }
  canvas { display: block; width: 1080px; height: 1920px; }
</style>
</head>
<body>
<canvas id="promoCanvas" width="1080" height="1920"></canvas>
<script>
const PRODUCTS = ${productsJson};
const BEATS = ${beatsJson};
const canvas = document.getElementById('promoCanvas');
const ctx = canvas.getContext('2d');

const loadedImages = [];
let imagesReady = false;

Promise.all(PRODUCTS.map(p => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve({ ...p, img });
  img.onerror = () => resolve({ ...p, img: null });
  img.src = p.url;
}))).then((res) => {
  loadedImages.push(...res);
  imagesReady = true;
  window.__PROMO_READY = true;
});

function drawPixelCharacter(ctx, x, y, scale, isBonnie, t, waving) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(t * 4) * 6;
  ctx.translate(0, bob);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 130 * scale, 48 * scale, 14 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair back
  ctx.fillStyle = isBonnie ? '#7c2d12' : '#b45309';
  ctx.fillRect(-38 * scale, -72 * scale, 76 * scale, 82 * scale);

  // Dress / Torso
  ctx.fillStyle = isBonnie ? '#881337' : '#0d9488';
  ctx.fillRect(-34 * scale, 8 * scale, 68 * scale, 96 * scale);

  // White lace apron / collar
  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(-22 * scale, 12 * scale, 44 * scale, 70 * scale);

  // Face
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(-28 * scale, -54 * scale, 56 * scale, 56 * scale);

  // Cheeks
  ctx.fillStyle = '#fb7185';
  ctx.fillRect(-22 * scale, -20 * scale, 10 * scale, 6 * scale);
  ctx.fillRect(12 * scale, -20 * scale, 10 * scale, 6 * scale);

  // Eyes
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(-14 * scale, -34 * scale, 7 * scale, 9 * scale);
  ctx.fillRect(7 * scale, -34 * scale, 7 * scale, 9 * scale);

  // Glasses for Grandma Bonnie
  if (isBonnie) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3 * scale;
    ctx.strokeRect(-19 * scale, -38 * scale, 16 * scale, 14 * scale);
    ctx.strokeRect(3 * scale, -38 * scale, 16 * scale, 14 * scale);
    // Rose hairclip
    ctx.fillStyle = '#e8748a';
    ctx.fillRect(20 * scale, -64 * scale, 14 * scale, 14 * scale);
  }

  // Smile
  ctx.fillStyle = '#881337';
  ctx.fillRect(-8 * scale, -12 * scale, 16 * scale, 5 * scale);

  // Waving Arm
  const armAngle = waving ? Math.sin(t * 10) * 0.45 - 0.6 : 0.2;
  ctx.save();
  ctx.translate(34 * scale, 22 * scale);
  ctx.rotate(armAngle);
  ctx.fillStyle = isBonnie ? '#881337' : '#0d9488';
  ctx.fillRect(0, -8 * scale, 36 * scale, 16 * scale);
  ctx.restore();

  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    const test = current ? current + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

window.renderPromoFrame = function(globalTimeSec) {
  let acc = 0;
  let beatIdx = 0;
  let beatLocalTime = 0;
  for (let i = 0; i < BEATS.length; i++) {
    if (globalTimeSec < acc + BEATS[i].durationSec || i === BEATS.length - 1) {
      beatIdx = i;
      beatLocalTime = Math.max(0, globalTimeSec - acc);
      break;
    }
    acc += BEATS[i].durationSec;
  }
  const beat = BEATS[beatIdx];
  const progress = Math.min(1, beatLocalTime / beat.durationSec);

  // 1. Cozy Enchanted Boutique Gradient Background
  const grad = ctx.createLinearGradient(0, 0, 0, 1920);
  grad.addColorStop(0, '#1a0f2e');
  grad.addColorStop(0.5, '#2d1b4e');
  grad.addColorStop(1, '#140a1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Floating Golden & Rose Stardust Particles
  for (let i = 0; i < 42; i++) {
    const px = (i * 197 + Math.sin(globalTimeSec * 0.8 + i) * 90) % 1080;
    const py = (i * 263 - globalTimeSec * 55 + 1920 * 4) % 1920;
    const r = 2.5 + (i % 4) * 1.8;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(251, 191, 36, 0.55)' : 'rgba(232, 116, 138, 0.55)';
    ctx.beginPath();
    ctx.arc((px + 1080) % 1080, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Top Header Banner ("BONNIE'S BOUTIQUE • BTBOUTIQE.COM")
  ctx.fillStyle = 'rgba(26, 15, 36, 0.88)';
  ctx.strokeStyle = '#e8748a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(70, 90, 940, 165, 28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('✦ HANDCRAFTED BY BONNIE & TAMMY ✦', 540, 145);

  ctx.fillStyle = '#f5efe6';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.fillText(beat.title, 540, 202);

  ctx.fillStyle = '#e8748a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(beat.subtitle, 540, 238);

  // 4. Center Stage: 3D Levitating Product Cutouts Showcase
  const activeProdIdx = Math.floor(globalTimeSec * 0.85) % Math.max(1, loadedImages.length);
  const centerY = 670 + Math.sin(globalTimeSec * 3.2) * 26;

  // Pedestal Aura Glow
  const aura = ctx.createRadialGradient(540, 690, 30, 540, 690, 340);
  aura.addColorStop(0, 'rgba(232, 116, 138, 0.48)');
  aura.addColorStop(0.5, 'rgba(251, 191, 36, 0.18)');
  aura.addColorStop(1, 'rgba(26, 15, 36, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(540, 690, 340, 0, Math.PI * 2);
  ctx.fill();

  // Draw 3 Levitating Product Cutout Cards (Left, Center Hero, Right)
  if (loadedImages.length > 0) {
    const indices = [
      (activeProdIdx + loadedImages.length - 1) % loadedImages.length,
      activeProdIdx,
      (activeProdIdx + 1) % loadedImages.length,
    ];
    const positions = [
      { x: 215, y: centerY + 35, scale: 0.58, alpha: 0.78 },
      { x: 540, y: centerY - 20, scale: 1.0, alpha: 1.0 },
      { x: 865, y: centerY + 35, scale: 0.58, alpha: 0.78 },
    ];

    for (let slot = 0; slot < 3; slot++) {
      const item = loadedImages[indices[slot]];
      const pos = positions[slot];
      if (!item) continue;

      ctx.save();
      ctx.globalAlpha = pos.alpha;
      ctx.translate(pos.x, pos.y);

      // Card Frame
      const w = 360 * pos.scale;
      const h = 440 * pos.scale;
      ctx.fillStyle = 'rgba(45, 27, 61, 0.88)';
      ctx.strokeStyle = slot === 1 ? '#fbbf24' : '#e8748a';
      ctx.lineWidth = slot === 1 ? 5 : 3;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 26 * pos.scale);
      ctx.fill();
      ctx.stroke();

      if (item.img) {
        const imgSize = 290 * pos.scale;
        ctx.drawImage(item.img, -imgSize / 2, -h / 2 + 24 * pos.scale, imgSize, imgSize);
      }

      // Product Title & Price Pill
      ctx.fillStyle = '#f5efe6';
      ctx.font = 'bold ' + Math.round(24 * pos.scale) + 'px sans-serif';
      ctx.textAlign = 'center';
      const shortTitle = item.title.length > 22 ? item.title.slice(0, 20) + '…' : item.title;
      ctx.fillText(shortTitle, 0, h / 2 - 58 * pos.scale);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold ' + Math.round(26 * pos.scale) + 'px monospace';
      ctx.fillText('$' + Number(item.price).toFixed(2) + ' • HANDMADE', 0, h / 2 - 22 * pos.scale);

      ctx.restore();
    }
  }

  // 5. Cozy 16-Bit Boutique Counter + Bonnie & Tammy Characters
  const counterY = 1230;
  // Counter backdrop arch
  ctx.fillStyle = '#3b1d4a';
  ctx.fillRect(100, counterY - 220, 880, 240);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.strokeRect(100, counterY - 220, 880, 240);

  // Bonnie (Left) & Tammy (Right)
  drawPixelCharacter(ctx, 350, counterY - 95, 1.35, true, globalTimeSec, beat.speaker === 'bonnie' || beat.speaker === 'both');
  drawPixelCharacter(ctx, 730, counterY - 95, 1.35, false, globalTimeSec + 1.2, beat.speaker === 'tammy' || beat.speaker === 'both');

  // Mahogany Wood Shop Counter
  const woodGrad = ctx.createLinearGradient(0, counterY, 0, counterY + 130);
  woodGrad.addColorStop(0, '#78350f');
  woodGrad.addColorStop(1, '#451a03');
  ctx.fillStyle = woodGrad;
  ctx.fillRect(70, counterY, 940, 120);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(70, counterY, 940, 120);

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨ B&T TRINKETS • https://btboutiqe.com/ ✨', 540, counterY + 72);

  // 6. Synced Typewriter Caption Box (TikTok / Facebook Reels Safe Zone)
  const capY = 1400;
  ctx.fillStyle = 'rgba(20, 10, 29, 0.94)';
  ctx.strokeStyle = beat.speaker === 'bonnie' ? '#f43f5e' : beat.speaker === 'tammy' ? '#14b8a6' : '#fbbf24';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(70, capY, 940, 290, 28);
  ctx.fill();
  ctx.stroke();

  // Speaker Pill
  ctx.fillStyle = beat.speaker === 'bonnie' ? '#f43f5e' : beat.speaker === 'tammy' ? '#0d9488' : '#d97706';
  ctx.beginPath();
  ctx.roundRect(110, capY - 24, 420, 48, 24);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(beat.badge, 135, capY + 8);

  // Typewriter Dialogue Reveal
  const revealCount = Math.min(beat.dialogue.length, Math.floor(beat.dialogue.length * Math.min(1, progress * 1.25)));
  const visibleText = beat.dialogue.slice(0, revealCount);
  ctx.fillStyle = '#f5efe6';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  const lines = wrapText(ctx, visibleText, 840);
  lines.forEach((line, idx) => {
    ctx.fillText(line, 540, capY + 95 + idx * 52);
  });

  // Bottom CTA Ribbon
  ctx.fillStyle = '#e8748a';
  ctx.beginPath();
  ctx.roundRect(160, 1735, 760, 86, 43);
  ctx.fill();
  ctx.fillStyle = '#1a0f24';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🛍️ Tap Link to Shop: btboutiqe.com', 540, 1790);
};
</script>
</body>
</html>`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\n🎬 Recording Official Storefront Promo Video ("bonnies-boutique-storefront-promo.mp4")...`);

  const promoHtml = buildPromoHtml();
  const serverPort = 9388;
  const debugPort = 9249;

  // Serve promo HTML + static files from public/
  const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    if (urlPath === '/' || urlPath === '/promo') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(promoHtml);
      return;
    }
    const diskPath = path.join(ROOT_DIR, 'public', decodeURIComponent(urlPath));
    if (fs.existsSync(diskPath) && fs.statSync(diskPath).isFile()) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(fs.readFileSync(diskPath));
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  });

  await new Promise((resolve) => server.listen(serverPort, '127.0.0.1', resolve));

  const framesDir = path.join(CACHE_DIR, 'promo_frames');
  if (fs.existsSync(framesDir)) {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(framesDir, { recursive: true });

  const userDataDir = path.join(CACHE_DIR, 'chrome-promo-profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=1080,1920',
      '-- mute-audio',
      `http://127.0.0.1:${serverPort}/promo`,
    ],
    { stdio: 'ignore' }
  );

  try {
    let wsUrl = null;
    for (let i = 0; i < 35; i++) {
      await sleep(300);
      try {
        const res = await fetch(`http://127.0.0.1:${debugPort}/json`);
        const pages = await res.json();
        const page = pages.find((p) => p.type === 'page' && p.url.includes(String(serverPort)));
        if (page?.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    if (!wsUrl) throw new Error('Could not connect to Headless Chrome for promo capture.');

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

    await send('Runtime.enable');

    // Wait for product images to finish loading
    for (let i = 0; i < 40; i++) {
      const check = await send('Runtime.evaluate', {
        expression: `Boolean(window.__PROMO_READY)`,
        returnByValue: true,
      });
      if (check?.result?.value === true) break;
      await sleep(200);
    }

    const fps = 15;
    const totalSec = BEATS.reduce((acc, b) => acc + b.durationSec, 0);
    const totalFrames = Math.ceil(totalSec * fps);

    console.log(`   📸 Capturing ${totalFrames} deterministic 1080x1920 frames (${totalSec}s @ ${fps}fps)...`);

    for (let f = 0; f < totalFrames; f++) {
      const tSec = f / fps;
      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          window.renderPromoFrame(${tSec.toFixed(4)});
          return document.getElementById('promoCanvas').toDataURL('image/png');
        })()`,
        returnByValue: true,
      });
      const dataUrl = res?.result?.value;
      if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
        const padded = String(f).padStart(4, '0');
        fs.writeFileSync(
          path.join(framesDir, `frame_${padded}.png`),
          Buffer.from(dataUrl.replace('data:image/png;base64,', ''), 'base64')
        );
      }
    }

    ws.close();

    // Synthesize stereo audio track
    const wavPath = path.join(CACHE_DIR, 'storefront-promo.wav');
    synthesizePromoWav(wavPath);

    // Encode H.264 MP4 + Stereo AAC
    const outMp4Path = path.join(EXPORT_DIR, 'bonnies-boutique-storefront-promo.mp4');
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-framerate',
        String(fps),
        '-i',
        path.join(framesDir, 'frame_%04d.png'),
        '-i',
        wavPath,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-shortest',
        outMp4Path,
      ],
      { stdio: 'ignore' }
    );

    const stat = fs.statSync(outMp4Path);
    console.log(`   ✅ Exported Storefront Promo Video: public/exports/bonnies-boutique-storefront-promo.mp4 (${Math.round(stat.size / 1024)} KB)\n`);
  } finally {
    chrome.kill();
    server.close();
  }
}

main().catch((err) => {
  console.error('Promo recording failed:', err);
  process.exit(1);
});
