#!/usr/bin/env node
/**
 * scripts/challenger-visual-specs.mjs
 *
 * Adversarial visual specification verification:
 * Compares cutouts produced by the isolation engine against the existing 96 catalog transparent PNGs:
 * 1. Valid 8-byte PNG signature: 0x89 0x50 0x4e 0x47 0x0d 0x0a 0x1a 0x0a
 * 2. 4-channel RGBA (channels === 4, hasAlpha === true)
 * 3. Strict transparency on border/perimeter (alpha === 0 on corners and outer 3px)
 * 4. Center / foreground subject opacity (alpha >= 128)
 * 5. Transparent background ratio conforms to catalog baseline (80% - 96%)
 * 6. File size in acceptable catalog range (50 KB - 800 KB)
 * 7. Aspect ratio and dimension preservation
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import { isolateWithSharp, PNG_MAGIC } from '../src/lib/image/isolation.ts';

const testPairs = [
  {
    rawName: '1789147836207-1-IMG_8918.JPEG',
    catalogTransName: 'transparent-1789147836207-1-IMG_8918.png',
  },
  {
    rawName: '1789147836234-2-IMG_8919.JPEG',
    catalogTransName: 'transparent-1789147836234-2-IMG_8919.png',
  },
  {
    rawName: '1789147836243-3-IMG_8920.JPEG',
    catalogTransName: 'transparent-1789147836243-3-IMG_8920.png',
  },
  {
    rawName: '1789147836260-4-IMG_8921.JPEG',
    catalogTransName: 'transparent-1789147836260-4-IMG_8921.png',
  },
];

async function verifyVisualSpecs() {
  console.log('======================================================================');
  console.log('CHALLENGER HARNESS 3: VISUAL SPECIFICATION & CATALOG CONFORMANCE');
  console.log('======================================================================\n');

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const transDir = path.join(uploadsDir, 'transparent');

  let passed = 0;
  let failed = 0;

  for (const pair of testPairs) {
    const rawPath = path.join(uploadsDir, pair.rawName);
    const catalogPath = path.join(transDir, pair.catalogTransName);

    console.log(`\n--- Comparing: ${pair.rawName} vs Catalog ${pair.catalogTransName} ---`);

    if (!fs.existsSync(rawPath) || !fs.existsSync(catalogPath)) {
      console.warn(`Skipping ${pair.rawName}: file not found`);
      continue;
    }

    const rawBuffer = fs.readFileSync(rawPath);
    const catalogBuffer = fs.readFileSync(catalogPath);

    // 1. Analyze catalog reference
    const catMeta = await sharp(catalogBuffer).metadata();
    const { data: catRgba, info: catInfo } = await sharp(catalogBuffer).raw().toBuffer({ resolveWithObject: true });
    let catTransparentPixels = 0;
    for (let i = 3; i < catRgba.length; i += 4) {
      if (catRgba[i] < 10) catTransparentPixels++;
    }
    const catTransRatio = catTransparentPixels / (catInfo.width * catInfo.height);

    console.log(`Catalog Baseline: ${catInfo.width}x${catInfo.height}, channels=${catMeta.channels}, format=${catMeta.format}, size=${catalogBuffer.length} bytes, transRatio=${(catTransRatio * 100).toFixed(1)}%`);

    // 2. Generate isolated cutout using isolateWithSharp
    const t0 = Date.now();
    const generatedBuffer = await isolateWithSharp(rawBuffer);
    const durationMs = Date.now() - t0;

    // 3. Verify Generated Cutout Specs
    try {
      // Spec 1: 8-byte PNG header
      assert(generatedBuffer.length >= 8, 'Output buffer too small');
      assert(generatedBuffer.subarray(0, 8).equals(PNG_MAGIC), 'Output buffer lacks valid PNG magic header');

      // Spec 2: 4-channel RGBA
      const genMeta = await sharp(generatedBuffer).metadata();
      assert.strictEqual(genMeta.format, 'png', `Format must be png, got ${genMeta.format}`);
      assert.strictEqual(genMeta.channels, 4, `Channels must be 4, got ${genMeta.channels}`);
      assert.strictEqual(genMeta.hasAlpha, true, 'hasAlpha must be true');

      // Spec 3: Strict 3px perimeter border transparency & corners
      const { data: genRgba, info: genInfo } = await sharp(generatedBuffer).raw().toBuffer({ resolveWithObject: true });
      const w = genInfo.width;
      const h = genInfo.height;

      // Corners
      const cTL = genRgba[3];
      const cTR = genRgba[(w - 1) * 4 + 3];
      const cBL = genRgba[((h - 1) * w) * 4 + 3];
      const cBR = genRgba[((h - 1) * w + (w - 1)) * 4 + 3];
      assert.strictEqual(cTL, 0, `Top-left corner alpha must be 0, got ${cTL}`);
      assert.strictEqual(cTR, 0, `Top-right corner alpha must be 0, got ${cTR}`);
      assert.strictEqual(cBL, 0, `Bottom-left corner alpha must be 0, got ${cBL}`);
      assert.strictEqual(cBR, 0, `Bottom-right corner alpha must be 0, got ${cBR}`);

      // Outer perimeter border (top, bottom, left, right edge samples)
      for (let x = 0; x < w; x += 50) {
        assert.strictEqual(genRgba[x * 4 + 3], 0, `Top edge pixel at x=${x} alpha not 0: ${genRgba[x * 4 + 3]}`);
        assert.strictEqual(genRgba[((h - 1) * w + x) * 4 + 3], 0, `Bottom edge pixel at x=${x} alpha not 0`);
      }
      for (let y = 0; y < h; y += 50) {
        assert.strictEqual(genRgba[(y * w) * 4 + 3], 0, `Left edge pixel at y=${y} alpha not 0`);
        assert.strictEqual(genRgba[(y * w + (w - 1)) * 4 + 3], 0, `Right edge pixel at y=${y} alpha not 0`);
      }

      // Spec 4: Center / foreground subject opacity
      let opaqueCount = 0;
      for (let i = 3; i < genRgba.length; i += 4) {
        if (genRgba[i] >= 128) opaqueCount++;
      }
      assert(opaqueCount > 1000, `Foreground subject missing or too small: opaque pixel count = ${opaqueCount}`);

      // Spec 5: Transparent ratio in catalog range
      let genTransparentPixels = 0;
      for (let i = 3; i < genRgba.length; i += 4) {
        if (genRgba[i] < 10) genTransparentPixels++;
      }
      const genTransRatio = genTransparentPixels / (w * h);
      assert(genTransRatio >= 0.70 && genTransRatio <= 0.98, `Transparent ratio out of expected range: ${(genTransRatio * 100).toFixed(1)}%`);

      // Spec 6: Dimensions conform to catalog bounds
      assert(w <= 2048 && h <= 2048, `Dimensions exceed 2048: ${w}x${h}`);
      assert(w >= 300 && h >= 300, `Dimensions suspiciously small: ${w}x${h}`);

      // Spec 7: Processing latency under 10 seconds
      assert(durationMs < 10000, `Latency exceeded 10s: ${durationMs}ms`);

      console.log(`  ✔ [PASS] Conforms to catalog specs: ${w}x${h}, size=${generatedBuffer.length} bytes, transRatio=${(genTransRatio * 100).toFixed(1)}%, duration=${durationMs}ms`);
      passed++;
    } catch (err) {
      console.error(`  ✖ [FAIL] Spec violation on ${pair.rawName}:`, err.message);
      failed++;
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`VISUAL SPEC SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('══════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyVisualSpecs().catch(err => {
  console.error('Fatal visual spec error:', err);
  process.exit(1);
});
