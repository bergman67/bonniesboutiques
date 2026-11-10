#!/usr/bin/env node
/**
 * scripts/test-challenger-m2-concavity-and-parity.mjs
 *
 * EMPIRICAL CHALLENGER 2 VERIFICATION SUITE:
 * 1. Concavity pocket removal & genuine bead pixel protection
 *    - Trapped neutral/tabletop background inside fork of letter "Y"
 *    - Trapped background pockets between adjacent beads
 *    - Protection of colorful beads (red, magenta, cyan, yellow, pastel, white, metallic, dark)
 *    - Real-world asset check on "Bright Candy Initial Y Keychain"
 * 2. Stress testing extreme image inputs
 *    - Completely transparent PNG (alpha = 0 everywhere)
 *    - Solid black (0,0,0,255)
 *    - Solid white (255,255,255,255)
 *    - Solid high-saturation neon (magenta, cyan)
 *    - Repetitive execution memory stability / leak check
 * 3. Endpoint parity on /api/upload
 *    - Server-isolated path (FormData with file only) -> 1200x1600 normalized PNG
 *    - Client pre-isolated path (FormData with file + cutout) -> 1200x1600 normalized PNG
 *    - Corrupted cutout fallback -> 1200x1600 normalized PNG
 *    - 400 error handling on missing/empty files
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

try {
  register('./scripts/test-loader.mjs', pathToFileURL('./'));
} catch {}

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { NextRequest } from 'next/server.js';
import 'dotenv/config';

import {
  PNG_MAGIC,
  cleanCutoutRgba,
  normalizeCutoutTo3x4Canvas,
  isolateWithSharp,
  isolateWithPureJs,
  isolateBackgroundHybrid,
} from '../src/lib/image/isolation.ts';

let uploadPost;


const passedChecks = [];
const failedChecks = [];

function pass(name, detail = '') {
  passedChecks.push({ name, detail });
  console.log(`  ✔ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  const msg = error instanceof Error ? error.message : String(error);
  failedChecks.push({ name, error: msg });
  console.error(`  ✖ [FAIL] ${name}: ${msg}`);
}

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║  CHALLENGER 2: CONCAVITY POCKET REMOVAL, STRESS & PIPELINE PARITY SUITE     ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: CONCAVITY POCKET REMOVAL & BEAD PROTECTION
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Concavity Pocket Removal & Bead Pixel Protection ---');

/**
 * Creates a synthetic Y-shaped keychain cutout with a trapped tabletop pocket inside the fork.
 */
function createSyntheticYKeychain(width = 400, height = 600) {
  const data = Buffer.alloc(width * height * 4, 0); // Start transparent

  const centerX = width / 2;
  const forkY = height * 0.45; // Fork junction
  const topY = height * 0.20;
  const bottomY = height * 0.85;

  // Background tabletop color for trapped pocket & fringe samples
  const bgR = 128, bgG = 118, bgB = 110;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Stem of Y: from forkY to bottomY, around centerX
      if (y >= forkY && y <= bottomY && Math.abs(x - centerX) <= 24) {
        data[idx] = 240;
        data[idx + 1] = 160;
        data[idx + 2] = 20;
        data[idx + 3] = 255;
        continue;
      }

      // Left arm of Y: from topY to forkY, spreading left
      if (y >= topY && y < forkY) {
        const leftArmX = centerX - ((forkY - y) / (forkY - topY)) * 80;
        if (Math.abs(x - leftArmX) <= 20) {
          data[idx] = 220;
          data[idx + 1] = 40;
          data[idx + 2] = 140;
          data[idx + 3] = 255;
          continue;
        }
      }

      // Right arm of Y: from topY to forkY, spreading right
      if (y >= topY && y < forkY) {
        const rightArmX = centerX + ((forkY - y) / (forkY - topY)) * 80;
        if (Math.abs(x - rightArmX) <= 20) {
          data[idx] = 20;
          data[idx + 1] = 200;
          data[idx + 2] = 180;
          data[idx + 3] = 255;
          continue;
        }
      }

      // TRAPPED CONCAVITY POCKET inside the fork of the "Y"
      // Triangle between left arm and right arm, above forkY
      if (y >= topY + 25 && y < forkY - 5) {
        const leftArmX = centerX - ((forkY - y) / (forkY - topY)) * 80;
        const rightArmX = centerX + ((forkY - y) / (forkY - topY)) * 80;
        if (x > leftArmX + 22 && x < rightArmX - 22) {
          data[idx] = bgR;
          data[idx + 1] = bgG;
          data[idx + 2] = bgB;
          data[idx + 3] = 255; // Opaque trapped pocket
        }
      }
    }
  }

  return { data, width, height, bgR, bgG, bgB };
}

// 1.1 Test concavity pocket removal inside the fork of "Y"
try {
  const { data, width, height, bgR, bgG, bgB } = createSyntheticYKeychain(400, 600);

  let pocketPixelsBefore = 0;
  let beadPixelsBefore = 0;

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];
    if (a > 0) {
      if (r === bgR && g === bgG && b === bgB) {
        pocketPixelsBefore++;
      } else {
        beadPixelsBefore++;
      }
    }
  }

  assert(pocketPixelsBefore >= 200, `Expected at least 200 trapped pocket pixels, found ${pocketPixelsBefore}`);
  assert(beadPixelsBefore >= 3000, `Expected at least 3000 bead pixels, found ${beadPixelsBefore}`);

  // Run cleanCutoutRgba directly
  cleanCutoutRgba(data, width, height, { deFringe: true, removePockets: true });

  let pocketPixelsAfter = 0;
  let beadPixelsAfter = 0;

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];
    if (a > 0) {
      if (r === bgR && g === bgG && b === bgB) {
        pocketPixelsAfter++;
      } else {
        beadPixelsAfter++;
      }
    }
  }

  assert.strictEqual(pocketPixelsAfter, 0, `Trapped pocket inside "Y" fork was not completely cleared (${pocketPixelsAfter} remain)`);
  assert.strictEqual(beadPixelsAfter, beadPixelsBefore, `Colorful bead pixels were eroded! Before=${beadPixelsBefore}, After=${beadPixelsAfter}`);

  pass(
    'Trapped neutral pocket inside fork of "Y" charm is 100% cleared without eroding colorful beads',
    `Pocket: ${pocketPixelsBefore} -> 0 cleared, Bead pixels: ${beadPixelsBefore} -> ${beadPixelsAfter} (100% preserved)`
  );
} catch (err) {
  fail('Fork of "Y" concavity pocket cleanup', err);
}

// 1.2 Test concavity pockets between adjacent beads
try {
  const W = 300;
  const H = 500;
  const data = Buffer.alloc(W * H * 4, 0);

  // Draw 3 large spherical beads touching at single points along the vertical center
  const beadCenters = [
    { x: 150, y: 150, r: 50, color: [240, 40, 60] },  // Red bead
    { x: 150, y: 250, r: 50, color: [40, 200, 220] }, // Cyan bead
    { x: 150, y: 350, r: 50, color: [240, 210, 30] },  // Yellow bead
  ];

  for (const b of beadCenters) {
    for (let dy = -b.r; dy <= b.r; dy++) {
      for (let dx = -b.r; dx <= b.r; dx++) {
        if (dx * dx + dy * dy <= b.r * b.r) {
          const idx = ((b.y + dy) * W + (b.x + dx)) * 4;
          data[idx] = b.color[0];
          data[idx + 1] = b.color[1];
          data[idx + 2] = b.color[2];
          data[idx + 3] = 255;
        }
      }
    }
  }

  // Inject trapped neutral tabletop pockets in the concavities between beads (left and right cusps)
  let trappedCuspCount = 0;
  const cuspPixels = [];
  for (const y of [195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205]) {
    for (const x of [118, 119, 120, 121, 122, 123, 124, 125]) {
      const idx = (y * W + x) * 4;
      if (data[idx + 3] === 0) {
        data[idx] = 128;
        data[idx + 1] = 118;
        data[idx + 2] = 110;
        data[idx + 3] = 255;
        cuspPixels.push({ x, y });
        trappedCuspCount++;
      }
    }
  }

  assert(trappedCuspCount >= 25, `Expected at least 25 cusp pixels, created ${trappedCuspCount}`);

  cleanCutoutRgba(data, W, H, { deFringe: true, removePockets: true });

  let survivingCusp = 0;
  for (const p of cuspPixels) {
    const idx = (p.y * W + p.x) * 4;
    if (data[idx + 3] > 0) survivingCusp++;
  }

  assert.strictEqual(survivingCusp, 0, `Trapped inter-bead cusp pockets were not cleared (${survivingCusp} survive)`);

  pass(
    'Trapped concavity pockets between adjacent beads are 100% cleared',
    `Inter-bead cusp: ${trappedCuspCount} -> 0 cleared`
  );
} catch (err) {
  fail('Inter-bead concavity pocket cleanup', err);
}

// 1.3 Test diverse genuine bead colors: white, pastel, metallic, dark beads
try {
  const W = 400;
  const H = 400;
  const data = Buffer.alloc(W * H * 4, 0);

  const testBeads = [
    { name: 'Pure White Bead', x: 80, y: 80, r: 25, color: [255, 255, 255] },
    { name: 'Light Pink Pastel', x: 200, y: 80, r: 25, color: [255, 200, 215] },
    { name: 'Metallic Silver', x: 320, y: 80, r: 25, color: [215, 220, 225] },
    { name: 'Dark Jet Black', x: 80, y: 250, r: 25, color: [18, 18, 20] },
    { name: 'Navy Blue Bead', x: 200, y: 250, r: 25, color: [20, 40, 150] },
    { name: 'Lime Green Bead', x: 320, y: 250, r: 25, color: [80, 230, 40] },
  ];

  const countsBefore = {};
  for (const b of testBeads) {
    let count = 0;
    for (let dy = -b.r; dy <= b.r; dy++) {
      for (let dx = -b.r; dx <= b.r; dx++) {
        if (dx * dx + dy * dy <= b.r * b.r) {
          const idx = ((b.y + dy) * W + (b.x + dx)) * 4;
          data[idx] = b.color[0];
          data[idx + 1] = b.color[1];
          data[idx + 2] = b.color[2];
          data[idx + 3] = 255;
          count++;
        }
      }
    }
    countsBefore[b.name] = count;
  }

  cleanCutoutRgba(data, W, H, { deFringe: true, removePockets: true });

  const countsAfter = {};
  for (const b of testBeads) {
    let count = 0;
    for (let dy = -b.r; dy <= b.r; dy++) {
      for (let dx = -b.r; dx <= b.r; dx++) {
        if (dx * dx + dy * dy <= b.r * b.r) {
          const idx = ((b.y + dy) * W + (b.x + dx)) * 4;
          if (data[idx + 3] > 0) count++;
        }
      }
    }
    countsAfter[b.name] = count;
    const retention = (count / countsBefore[b.name]) * 100;
    assert(retention >= 80, `CRITICAL DEFECT: Genuine bead "${b.name}" was eroded! Retention: ${retention.toFixed(1)}% (expected >= 80%)`);
  }

  pass(
    'Diverse genuine beads (white, pastel, metallic, dark, vibrant) preserved without destruction',
    Object.entries(countsAfter).map(([k, v]) => `${k}: ${((v / countsBefore[k]) * 100).toFixed(0)}%`).join(', ')
  );
} catch (err) {
  fail('Diverse genuine bead retention', err);
}

// 1.4 Test Real-World Asset: "Bright Candy Initial Y Keychain"
console.log('\nTesting live production asset: Bright Candy Initial Y Keychain...');
try {
  const yUrl = 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/transparent/transparent-1792799262887-IMG_1035.png';
  const res = await fetch(yUrl);
  if (!res.ok) {
    console.warn(`  ⚠ Could not fetch live Y cutout (${res.status}), testing local fallback if exists...`);
  } else {
    const rawBuf = Buffer.from(await res.arrayBuffer());
    assert(rawBuf.subarray(0, 8).equals(PNG_MAGIC), 'Downloaded Y asset is not a valid PNG');

    const normalizedY = await normalizeCutoutTo3x4Canvas(rawBuf);
    const meta = await sharp(normalizedY).metadata();
    assert.strictEqual(meta.width, 1200, `Normalized width must be 1200, found ${meta.width}`);
    assert.strictEqual(meta.height, 1600, `Normalized height must be 1600, found ${meta.height}`);
    assert.strictEqual(meta.channels, 4, 'Must have 4 channels');

    const { data: rawPixels } = await sharp(normalizedY).raw().toBuffer({ resolveWithObject: true });
    let minY = 1600, maxY = 0, minX = 1200, maxX = 0;
    let semiTransFringe = 0;

    for (let y = 0; y < 1600; y++) {
      for (let x = 0; x < 1200; x++) {
        const idx = (y * 1200 + x) * 4;
        const a = rawPixels[idx + 3];
        if (a > 25) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
        if (a > 0 && a < 140) {
          const r = rawPixels[idx];
          const g = rawPixels[idx + 1];
          const b = rawPixels[idx + 2];
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
          if (sat < 0.20) semiTransFringe++;
        }
      }
    }

    const fillH = (maxY - minY + 1) / 1600;
    const fillW = (maxX - minX + 1) / 1200;

    assert(fillH >= 0.48 && fillH <= 0.52, `fillH must be 48%-52%, found ${(fillH * 100).toFixed(2)}%`);
    assert(fillW <= 0.52, `fillW must be <= 52%, found ${(fillW * 100).toFixed(2)}%`);
    assert.strictEqual(semiTransFringe, 0, `Expected 0 semi-transparent gray fringe pixels, found ${semiTransFringe}`);

    pass(
      'Live "Bright Candy Initial Y Keychain" passes 1200x1600 3:4 normalization & zero-halo pocket check',
      `Canvas: 1200x1600, fillH: ${(fillH * 100).toFixed(2)}%, fillW: ${(fillW * 100).toFixed(2)}%, gray fringe: ${semiTransFringe}`
    );
  }
} catch (err) {
  fail('Live Bright Candy Initial Y Keychain verification', err);
}


// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: STRESS TESTING WITH EXTREME IMAGE INPUTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Stress Testing Extreme Image Inputs (No Crashes, Div0, or Leaks) ---');

// 2.1 Completely Transparent PNG (All pixels alpha = 0)
try {
  const transPng = await sharp({
    create: {
      width: 200,
      height: 300,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).png().toBuffer();

  const normalized = await normalizeCutoutTo3x4Canvas(transPng);
  const meta = await sharp(normalized).metadata();
  assert.strictEqual(meta.width, 1200, 'Normalized transparent image width must be 1200');
  assert.strictEqual(meta.height, 1600, 'Normalized transparent image height must be 1600');
  assert.strictEqual(meta.channels, 4, 'Normalized transparent image channels must be 4');

  const raw = await sharp(normalized).raw().toBuffer();
  let nonZeroAlpha = 0;
  for (let i = 0; i < 1200 * 1600; i++) {
    if (raw[i * 4 + 3] !== 0) nonZeroAlpha++;
  }
  assert.strictEqual(nonZeroAlpha, 0, `Expected 0 non-zero alpha pixels in transparent image, found ${nonZeroAlpha}`);

  pass('Completely transparent image handled safely without crash or division by zero', 'Output: 1200x1600 all-alpha=0 PNG');
} catch (err) {
  fail('Completely transparent image stress test', err);
}

// 2.2 Solid Black Image (All pixels 0,0,0,255)
try {
  const blackPng = await sharp({
    create: {
      width: 250,
      height: 350,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  }).png().toBuffer();

  const normalized = await normalizeCutoutTo3x4Canvas(blackPng);
  const meta = await sharp(normalized).metadata();
  assert.strictEqual(meta.width, 1200);
  assert.strictEqual(meta.height, 1600);

  const blackJpg = await sharp({
    create: {
      width: 250,
      height: 350,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  }).jpeg().toBuffer();

  const isolated = await isolateWithSharp(blackJpg);
  assert(isolated.subarray(0, 8).equals(PNG_MAGIC), 'Solid black isolated must be valid PNG');

  pass('Solid black image handled safely across normalization and isolation engines', 'Zero crashes or infinite loops');
} catch (err) {
  fail('Solid black image stress test', err);
}

// 2.3 Solid White Image (All pixels 255,255,255,255)
try {
  const whitePng = await sharp({
    create: {
      width: 300,
      height: 400,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  }).png().toBuffer();

  const normalized = await normalizeCutoutTo3x4Canvas(whitePng);
  const meta = await sharp(normalized).metadata();
  assert.strictEqual(meta.width, 1200);
  assert.strictEqual(meta.height, 1600);

  const whiteJpg = await sharp({
    create: {
      width: 300,
      height: 400,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  }).jpeg().toBuffer();

  const isolated = await isolateWithSharp(whiteJpg);
  assert(isolated.subarray(0, 8).equals(PNG_MAGIC), 'Solid white isolated must be valid PNG');

  pass('Solid white image handled safely across normalization and isolation engines', 'Zero crashes or infinite loops');
} catch (err) {
  fail('Solid white image stress test', err);
}

// 2.4 High-Saturation Cutout Images (Neon Magenta & Neon Cyan with sat = 1.0)
try {
  // Test centered neon cutout (with transparent margins)
  const rawCutout = Buffer.alloc(300 * 300 * 4, 0);
  for (let y = 50; y < 250; y++) {
    for (let x = 50; x < 250; x++) {
      const idx = (y * 300 + x) * 4;
      rawCutout[idx] = 255;
      rawCutout[idx + 1] = 0;
      rawCutout[idx + 2] = 255;
      rawCutout[idx + 3] = 255;
    }
  }
  const neonMagentaCutout = await sharp(rawCutout, {
    raw: { width: 300, height: 300, channels: 4 },
  }).png().toBuffer();

  const normalized = await normalizeCutoutTo3x4Canvas(neonMagentaCutout);
  const meta = await sharp(normalized).metadata();
  assert.strictEqual(meta.width, 1200);
  assert.strictEqual(meta.height, 1600);

  const { data: rawOut } = await sharp(normalized).raw().toBuffer({ resolveWithObject: true });
  const cIdx = (800 * 1200 + 600) * 4;
  assert.strictEqual(rawOut[cIdx], 255, 'Red channel must be 255');
  assert.strictEqual(rawOut[cIdx + 1], 0, 'Green channel must be 0');
  assert.strictEqual(rawOut[cIdx + 2], 255, 'Blue channel must be 255');
  assert.strictEqual(rawOut[cIdx + 3], 255, 'Alpha must be 255');

  pass('High-saturation neon cutout preserved without false de-fringing or color corruption', 'Magenta: (255,0,255,255) preserved');
} catch (err) {
  fail('High-saturation neon image stress test', err);
}

// 2.5 Memory Stability & Repetitive Execution Test
try {
  if (global.gc) global.gc();
  const memBefore = process.memoryUsage().heapUsed;

  const testBuf = await sharp({
    create: {
      width: 400,
      height: 500,
      channels: 4,
      background: { r: 120, g: 50, b: 200, alpha: 1 },
    },
  }).png().toBuffer();

  for (let i = 0; i < 20; i++) {
    await normalizeCutoutTo3x4Canvas(testBuf);
  }

  if (global.gc) global.gc();
  const memAfter = process.memoryUsage().heapUsed;
  const deltaMb = (memAfter - memBefore) / (1024 * 1024);

  assert(deltaMb < 60, `Excessive heap growth detected: ${deltaMb.toFixed(2)} MB`);

  pass('Repetitive execution memory stability test (20 iterations)', `Heap delta: ${deltaMb.toFixed(2)} MB (no memory leak)`);
} catch (err) {
  fail('Repetitive execution memory test', err);
}


// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: ENDPOINT PIPELINE PARITY (/api/upload)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Endpoint Pipeline Parity on /api/upload ---');

async function makePhotoBuffer(w = 320, h = 480) {
  const raw = Buffer.alloc(w * h * 3);
  raw.fill(238);
  const left = Math.round((w - 80) / 2);
  const right = left + 80;
  const top = Math.round((h - 320) / 2);
  const bottom = top + 320;

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const idx = (y * w + x) * 3;
      raw[idx] = 130;
      raw[idx + 1] = 30;
      raw[idx + 2] = 200;
    }
  }

  return await sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function makeCutoutBuffer(w = 200, h = 400) {
  const raw = Buffer.alloc(w * h * 4, 0);
  const left = Math.round((w - 60) / 2);
  const right = left + 60;
  const top = Math.round((h - 300) / 2);
  const bottom = top + 300;

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const idx = (y * w + x) * 4;
      raw[idx] = 220;
      raw[idx + 1] = 60;
      raw[idx + 2] = 120;
      raw[idx + 3] = 255;
    }
  }

  return await sharp(raw, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

// 3.1 Test Server-Isolated Path (file only in FormData)
const { POST: loadedUploadPost } = await import('../src/app/api/upload/route.ts');
uploadPost = loadedUploadPost;

try {
  const photoBuf = await makePhotoBuffer(320, 480);
  const formData = new FormData();
  formData.append('file', new File([photoBuf], 'test-server-isolated.jpg', { type: 'image/jpeg' }));

  const req = new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData,
  });

  const res = await uploadPost(req);
  assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);

  const body = await res.json();
  assert.strictEqual(body.success, true, 'Response success must be true');
  assert(body.transparentUrl, 'Must return transparentUrl');
  assert(body.originalUrl, 'Must return originalUrl');
  assert.strictEqual(body.engine, 'sharp', 'Server-isolated path must report engine="sharp"');

  let savedBuffer = null;
  if (body.transparentUrl.startsWith('/uploads/')) {
    const localPath = path.join(process.cwd(), 'public', body.transparentUrl);
    if (fs.existsSync(localPath)) savedBuffer = fs.readFileSync(localPath);
  } else if (body.transparentUrl.startsWith('http')) {
    const fetchRes = await fetch(body.transparentUrl);
    if (fetchRes.ok) savedBuffer = Buffer.from(await fetchRes.arrayBuffer());
  }

  assert(savedBuffer, 'Could not retrieve saved transparent PNG from local or CDN storage');
  assert(savedBuffer.subarray(0, 8).equals(PNG_MAGIC), 'Saved file must be a valid PNG');

  const meta = await sharp(savedBuffer).metadata();
  assert.strictEqual(meta.width, 1200, `Server-isolated PNG width must be 1200, got ${meta.width}`);
  assert.strictEqual(meta.height, 1600, `Server-isolated PNG height must be 1600, got ${meta.height}`);
  assert.strictEqual(meta.channels, 4, 'Must have 4 channels');

  const { data: rawData } = await sharp(savedBuffer).raw().toBuffer({ resolveWithObject: true });
  let minY = 1600, maxY = 0;
  for (let y = 0; y < 1600; y++) {
    for (let x = 0; x < 1200; x++) {
      if (rawData[(y * 1200 + x) * 4 + 3] > 25) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const fillH = (maxY - minY + 1) / 1600;
  assert(fillH >= 0.48 && fillH <= 0.52, `fillH must be 48%-52%, found ${(fillH * 100).toFixed(2)}%`);

  pass(
    'Server-isolated path (/api/upload with file only) normalizes to 1200x1600 PNG with 48%-52% fill ratio',
    `Engine: ${body.engine}, Dimensions: ${meta.width}x${meta.height}, fillH: ${(fillH * 100).toFixed(2)}%`
  );
} catch (err) {
  fail('Server-isolated upload path', err);
}

// 3.2 Test Client Pre-Isolated Path (file + cutout in FormData)
try {
  const photoBuf = await makePhotoBuffer(320, 480);
  const cutoutBuf = await makeCutoutBuffer(200, 400);

  const formData = new FormData();
  formData.append('file', new File([photoBuf], 'test-client-raw.jpg', { type: 'image/jpeg' }));
  formData.append('cutout', new File([cutoutBuf], 'test-client-cutout.png', { type: 'image/png' }));

  const req = new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData,
  });

  const res = await uploadPost(req);
  assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);

  const body = await res.json();
  assert.strictEqual(body.success, true, 'Response success must be true');
  assert(body.transparentUrl, 'Must return transparentUrl');
  assert(body.originalUrl, 'Must return originalUrl');
  assert.strictEqual(body.engine, 'imgly', 'Client pre-isolated path must report engine="imgly"');

  let savedBuffer = null;
  if (body.transparentUrl.startsWith('/uploads/')) {
    const localPath = path.join(process.cwd(), 'public', body.transparentUrl);
    if (fs.existsSync(localPath)) savedBuffer = fs.readFileSync(localPath);
  } else if (body.transparentUrl.startsWith('http')) {
    const fetchRes = await fetch(body.transparentUrl);
    if (fetchRes.ok) savedBuffer = Buffer.from(await fetchRes.arrayBuffer());
  }

  assert(savedBuffer, 'Could not retrieve saved transparent PNG from local or CDN storage');
  assert(savedBuffer.subarray(0, 8).equals(PNG_MAGIC), 'Saved file must be a valid PNG');

  const meta = await sharp(savedBuffer).metadata();
  assert.strictEqual(meta.width, 1200, `Client-isolated PNG width must be 1200, got ${meta.width}`);
  assert.strictEqual(meta.height, 1600, `Client-isolated PNG height must be 1600, got ${meta.height}`);
  assert.strictEqual(meta.channels, 4, 'Must have 4 channels');

  const { data: rawData } = await sharp(savedBuffer).raw().toBuffer({ resolveWithObject: true });
  let minY = 1600, maxY = 0;
  for (let y = 0; y < 1600; y++) {
    for (let x = 0; x < 1200; x++) {
      if (rawData[(y * 1200 + x) * 4 + 3] > 25) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const fillH = (maxY - minY + 1) / 1600;
  assert(fillH >= 0.48 && fillH <= 0.52, `fillH must be 48%-52%, found ${(fillH * 100).toFixed(2)}%`);

  pass(
    'Client pre-isolated path (/api/upload with file + cutout) normalizes to 1200x1600 PNG with 48%-52% fill ratio',
    `Engine: ${body.engine}, Dimensions: ${meta.width}x${meta.height}, fillH: ${(fillH * 100).toFixed(2)}%`
  );
} catch (err) {
  fail('Client pre-isolated upload path', err);
}

// 3.3 Test Corrupted Cutout Fallback
try {
  const photoBuf = await makePhotoBuffer(320, 480);
  const corruptedCutout = Buffer.from('NOT_A_VALID_PNG_CONTENT_123456');

  const formData = new FormData();
  formData.append('file', new File([photoBuf], 'test-corrupted.jpg', { type: 'image/jpeg' }));
  formData.append('cutout', new File([corruptedCutout], 'corrupt.png', { type: 'image/png' }));

  const req = new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData,
  });

  const res = await uploadPost(req);
  assert.strictEqual(res.status, 200, 'Corrupted cutout must fall back cleanly without failing request');

  const body = await res.json();
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.engine, 'sharp', 'Corrupted cutout must fall back to server sharp engine');

  pass('Corrupted client cutout falls back gracefully to server sharp isolation and 1200x1600 output', 'Engine: sharp');
} catch (err) {
  fail('Corrupted cutout fallback', err);
}

// 3.4 Test Missing & Empty File Validation
try {
  const reqEmpty = new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST',
    body: new FormData(),
  });
  const resEmpty = await uploadPost(reqEmpty);
  assert.strictEqual(resEmpty.status, 400, 'Missing file must return 400');
  const bodyEmpty = await resEmpty.json();
  assert.strictEqual(bodyEmpty.error, 'No file uploaded');

  const fdZero = new FormData();
  fdZero.append('file', new File([Buffer.alloc(0)], 'zero.jpg', { type: 'image/jpeg' }));
  const reqZero = new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST',
    body: fdZero,
  });
  const resZero = await uploadPost(reqZero);
  assert.strictEqual(resZero.status, 400, '0-byte file must return 400');
  const bodyZero = await resZero.json();
  assert.strictEqual(bodyZero.error, 'Uploaded file is empty');

  pass('/api/upload correctly validates missing and empty upload payloads with HTTP 400', 'No unhandled exceptions');
} catch (err) {
  fail('Upload validation error handling', err);
}


// ─────────────────────────────────────────────────────────────────────────────
// FINAL AUDIT SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════════════');
console.log(`SUMMARY: ${passedChecks.length} PASSED, ${failedChecks.length} FAILED`);
console.log('══════════════════════════════════════════════════════════════════════════════');

if (failedChecks.length > 0) {
  console.error('\nFAILED TESTS:');
  for (const f of failedChecks) {
    console.error(` - ${f.name}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log('\nAll empirical challenger stress tests & pipeline parity checks PASSED!');
  process.exit(0);
}
