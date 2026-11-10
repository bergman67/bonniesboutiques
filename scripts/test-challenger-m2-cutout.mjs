#!/usr/bin/env node
/**
 * scripts/test-challenger-m2-cutout.mjs
 *
 * EMPIRICAL CHALLENGER TEST SUITE (Milestone 2)
 * Adversarial Testing of normalizeCutoutTo3x4Canvas and Edge De-Fringing in src/lib/image/isolation.ts:
 *
 * 1. Extreme aspect ratios:
 *    - 1:1 Square
 *    - 1:4 Needle pen (extreme portrait)
 *    - 4:1 Horizontal pen (extreme wide)
 *    - 10x10 Tiny cutout
 *    - 4000x5000 Huge image
 *    - 1:10 Extreme needle
 *    - 10:1 Extreme banner
 * 2. Fill ratio invariants:
 *    - Portrait/standard inputs (W:H <= 0.78): Height fill in [48%, 52%] (target 50%)
 *    - Wide inputs (W:H > 0.78): Width fill <= 52%
 *    - Exact 1200x1600 canvas dimensions and centering
 * 3. Edge de-fringing and gray halo clamping:
 *    - Images with tabletop gray halos (alpha < 140, low saturation)
 *    - Verify ALL fringe pixels are clamped (alpha === 0 in output)
 *    - Preserves high-saturation colorful product edges (colored beads)
 *    - Trapped concavity background pocket removal
 * 4. Boundary and degenerate edge cases:
 *    - Pure transparent input (no opaque pixels)
 *    - Pure halo input (only alpha < 140 gray pixels)
 *    - 1x1 degenerate input
 * 5. Pure-JS fallback path verification
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PNG } from 'pngjs';

import {
  PNG_MAGIC,
  normalizeCutoutTo3x4Canvas,
  cleanCutoutRgba,
  isolateWithPureJs,
  isolateBackgroundHybrid,
} from '../src/lib/image/isolation.ts';

const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function pass(name, detail = '') {
  results.passed++;
  results.tests.push({ name, status: 'PASS', detail });
  console.log(`  ✔ [PASS] ${name}${detail ? ` -> ${detail}` : ''}`);
}

function fail(name, error) {
  results.failed++;
  const msg = error instanceof Error ? error.message : String(error);
  results.tests.push({ name, status: 'FAIL', detail: msg });
  console.error(`  ✖ [FAIL] ${name} -> ${msg}`);
}

/**
 * Creates a synthetic PNG image buffer with customizable dimensions,
 * object rectangle, colors, alpha, halo fringe, and concavity pockets.
 */
async function createSyntheticImage({
  width,
  height,
  objX,
  objY,
  objW,
  objH,
  objColor = [220, 50, 50, 255],
  fringeWidth = 0,
  fringeAlpha = 100,
  fringeColor = [128, 128, 128],
  concavityPocket = null,
}) {
  const buf = Buffer.alloc(width * height * 4, 0);

  // 1. Draw outer fringe halo if requested
  if (fringeWidth > 0) {
    const minFY = Math.max(0, objY - fringeWidth);
    const maxFY = Math.min(height, objY + objH + fringeWidth);
    const minFX = Math.max(0, objX - fringeWidth);
    const maxFX = Math.min(width, objX + objW + fringeWidth);

    for (let y = minFY; y < maxFY; y++) {
      for (let x = minFX; x < maxFX; x++) {
        const idx = (y * width + x) * 4;
        buf[idx] = fringeColor[0];
        buf[idx + 1] = fringeColor[1];
        buf[idx + 2] = fringeColor[2];
        buf[idx + 3] = fringeAlpha;
      }
    }
  }

  // 2. Draw object
  for (let y = objY; y < objY + objH; y++) {
    for (let x = objX; x < objX + objW; x++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
        buf[idx] = objColor[0];
        buf[idx + 1] = objColor[1];
        buf[idx + 2] = objColor[2];
        buf[idx + 3] = objColor[3] ?? 255;
      }
    }
  }

  // 3. Draw concavity pocket if specified
  if (concavityPocket) {
    const { x: px, y: py, w: pw, h: ph, color: pColor = [128, 128, 128], alpha: pAlpha = 110 } = concavityPocket;
    for (let y = py; y < py + ph; y++) {
      for (let x = px; x < px + pw; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          buf[idx] = pColor[0];
          buf[idx + 1] = pColor[1];
          buf[idx + 2] = pColor[2];
          buf[idx + 3] = pAlpha;
        }
      }
    }
  }

  return await sharp(buf, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * Decodes and inspects normalized output PNG to measure canvas size,
 * bounding box, fill ratios, centering, and fringe pixel remnants.
 */
async function inspectNormalizedOutput(buffer) {
  assert(buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_MAGIC), 'Output must be a valid PNG');

  const meta = await sharp(buffer).metadata();
  assert.strictEqual(meta.format, 'png', 'Output format must be png');
  assert.strictEqual(meta.channels, 4, 'Output channels must be 4');
  assert.strictEqual(meta.width, 1200, 'Canvas width must be 1200');
  assert.strictEqual(meta.height, 1600, 'Canvas height must be 1600');

  const { data: raw, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  let minX = W, maxX = -1, minY = H, maxY = -1;
  let minX25 = W, maxX25 = -1, minY25 = H, maxY25 = -1;
  let nonZeroCount = 0;
  let fringeRemnants = 0; // count of pixels with alpha < 140 that have low saturation (gray halo)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const r = raw[idx];
      const g = raw[idx + 1];
      const b = raw[idx + 2];
      const a = raw[idx + 3];

      if (a > 0) {
        nonZeroCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        if (a < 140) {
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
          if (sat < 0.20) {
            fringeRemnants++;
          }
        }
      }

      if (a > 25) {
        if (x < minX25) minX25 = x;
        if (x > maxX25) maxX25 = x;
        if (y < minY25) minY25 = y;
        if (y > maxY25) maxY25 = y;
      }
    }
  }

  const hasContent = nonZeroCount > 0;
  const bboxW = hasContent ? maxX - minX + 1 : 0;
  const bboxH = hasContent ? maxY - minY + 1 : 0;
  const fillW = bboxW / W;
  const fillH = bboxH / H;

  const bboxW25 = maxX25 >= minX25 ? maxX25 - minX25 + 1 : 0;
  const bboxH25 = maxY25 >= minY25 ? maxY25 - minY25 + 1 : 0;
  const fillW25 = bboxW25 / W;
  const fillH25 = bboxH25 / H;

  const centerX = hasContent ? (minX + maxX) / 2 : W / 2;
  const centerY = hasContent ? (minY + maxY) / 2 : H / 2;

  return {
    width: W,
    height: H,
    hasContent,
    nonZeroCount,
    fringeRemnants,
    bbox: { minX, maxX, minY, maxY, bboxW, bboxH },
    bbox25: { minX: minX25, maxX: maxX25, minY: minY25, maxY: maxY25, bboxW: bboxW25, bboxH: bboxH25 },
    fillW,
    fillH,
    fillW25,
    fillH25,
    centerX,
    centerY,
  };
}

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║       EMPIRICAL CHALLENGER: MILESTONE 2 CUTOUT NORMALIZATION & DE-FRINGING   ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

async function runAllTests() {
  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 1: EXTREME ASPECT RATIOS & FILL RATIO INVARIANTS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('=== SUITE 1: EXTREME ASPECT RATIOS & FILL RATIOS ===');

  // Test 1.1: 1:1 Square Cutout (500x500 box on 800x800 image)
  // Wide input (ratio 1.0 > 0.78): width fill must be <= 52% (target 52%)
  try {
    const input = await createSyntheticImage({
      width: 800,
      height: 800,
      objX: 150,
      objY: 150,
      objW: 500,
      objH: 500,
      objColor: [220, 40, 40, 255],
    });
    const output = await normalizeCutoutTo3x4Canvas(input);
    const metrics = await inspectNormalizedOutput(output);

    assert(metrics.hasContent, 'Square cutout must produce non-empty content');
    console.log(`    Square 1:1 -> BBox25: ${metrics.bbox25.bboxW}x${metrics.bbox25.bboxH}, fillW: ${(metrics.fillW25 * 100).toFixed(2)}%, fillH: ${(metrics.fillH25 * 100).toFixed(2)}%`);
    assert(metrics.fillW25 <= 0.525, `Width fill must be <= 52% (found ${(metrics.fillW25 * 100).toFixed(2)}%)`);
    assert(metrics.fillW25 >= 0.510, `Width fill for square must be close to 52% (found ${(metrics.fillW25 * 100).toFixed(2)}%)`);
    // Centering check: center within +/- 2px
    assert(Math.abs(metrics.centerX - 600) <= 2, `Object must be centered horizontally (found ${metrics.centerX})`);
    assert(Math.abs(metrics.centerY - 800) <= 2, `Object must be centered vertically (found ${metrics.centerY})`);
    pass('Test 1.1: 1:1 Square cutout normalized with width fill <= 52% and centered', `fillW: ${(metrics.fillW25 * 100).toFixed(1)}%`);
  } catch (err) {
    fail('Test 1.1: 1:1 Square cutout', err);
  }

  // Test 1.2: 1:4 Needle Pen (extreme portrait: 100x400 on 300x600 image, ratio 0.25)
  // Portrait/standard input: height fill must be in [48%, 52%]
  try {
    const input = await createSyntheticImage({
      width: 300,
      height: 600,
      objX: 100,
      objY: 100,
      objW: 100,
      objH: 400,
      objColor: [30, 180, 220, 255],
    });
    const output = await normalizeCutoutTo3x4Canvas(input);
    const metrics = await inspectNormalizedOutput(output);

    assert(metrics.hasContent, 'Needle pen cutout must produce non-empty content');
    console.log(`    Needle 1:4 -> BBox25: ${metrics.bbox25.bboxW}x${metrics.bbox25.bboxH}, fillH: ${(metrics.fillH25 * 100).toFixed(2)}%, fillW: ${(metrics.fillW25 * 100).toFixed(2)}%`);
    assert(metrics.fillH25 >= 0.48 && metrics.fillH25 <= 0.52, `Height fill must be between 48% and 52% (found ${(metrics.fillH25 * 100).toFixed(2)}%)`);
    assert(metrics.fillW25 <= 0.52, `Width fill must be <= 52% (found ${(metrics.fillW25 * 100).toFixed(2)}%)`);
    assert(Math.abs(metrics.centerX - 600) <= 2, `Horizontally centered (found ${metrics.centerX})`);
    assert(Math.abs(metrics.centerY - 800) <= 2, `Vertically centered (found ${metrics.centerY})`);
    pass('Test 1.2: 1:4 Needle pen cutout height fill within [48%, 52%]', `fillH: ${(metrics.fillH25 * 100).toFixed(1)}%`);
  } catch (err) {
    fail('Test 1.2: 1:4 Needle pen cutout', err);
  }

  // Test 1.3: 4:1 Horizontal Pen (extreme wide: 400x100 on 600x300 image, ratio 4.0)
  // Wide input: width fill must be <= 52%
  try {
    const input = await createSyntheticImage({
      width: 600,
      height: 300,
      objX: 100,
      objY: 100,
      objW: 400,
      objH: 100,
      objColor: [240, 190, 40, 255],
    });
    const output = await normalizeCutoutTo3x4Canvas(input);
    const metrics = await inspectNormalizedOutput(output);

    assert(metrics.hasContent, 'Horizontal pen cutout must produce non-empty content');
    console.log(`    Horizontal 4:1 -> BBox25: ${metrics.bbox25.bboxW}x${metrics.bbox25.bboxH}, fillW: ${(metrics.fillW25 * 100).toFixed(2)}%, fillH: ${(metrics.fillH25 * 100).toFixed(2)}%`);
    assert(metrics.fillW25 <= 0.525, `Width fill must be <= 52% (found ${(metrics.fillW25 * 100).toFixed(2)}%)`);
    assert(metrics.fillH25 <= 0.52, `Height fill must be <= 52% (found ${(metrics.fillH25 * 100).toFixed(2)}%)`);
    assert(Math.abs(metrics.centerX - 600) <= 2, `Horizontally centered`);
    assert(Math.abs(metrics.centerY - 800) <= 2, `Vertically centered`);
    pass('Test 1.3: 4:1 Horizontal pen cutout width fill <= 52%', `fillW: ${(metrics.fillW25 * 100).toFixed(1)}%`);
  } catch (err) {
    fail('Test 1.3: 4:1 Horizontal pen cutout', err);
  }

  // Test 1.4: Tiny 10x10 Cutout
  // Verifies no division by zero, no scale distortion, and valid lanczos3 upscaling
  try {
    const input = await createSyntheticImage({
      width: 100,
      height: 100,
      objX: 45,
      objY: 45,
      objW: 10,
      objH: 10,
      objColor: [200, 30, 180, 255],
    });
    const output = await normalizeCutoutTo3x4Canvas(input);
    const metrics = await inspectNormalizedOutput(output);

    assert(metrics.hasContent, 'Tiny 10x10 cutout must produce non-empty content');
    console.log(`    Tiny 10x10 -> BBox25: ${metrics.bbox25.bboxW}x${metrics.bbox25.bboxH}, fillW: ${(metrics.fillW25 * 100).toFixed(2)}%, fillH: ${(metrics.fillH25 * 100).toFixed(2)}%`);
    assert(metrics.fillW25 <= 0.525, `Width fill must be <= 52%`);
    assert(metrics.fillH25 <= 0.525, `Height fill must be <= 52%`);
    pass('Test 1.4: Tiny 10x10 cutout handles upscaling without crash or stride fault', `${metrics.bbox25.bboxW}x${metrics.bbox25.bboxH}`);
  } catch (err) {
    fail('Test 1.4: Tiny 10x10 cutout', err);
  }

  // Test 1.5: Huge 4000x5000 Image with 1500x3500 object (portrait aspect ratio ~0.43)
  // Verifies pipeline processes massive resolution without OOM or memory leak
  try {
    const t0 = Date.now();
    const input = await createSyntheticImage({
      width: 4000,
      height: 5000,
      objX: 1250,
      objY: 750,
      objW: 1500,
      objH: 3500,
      objColor: [50, 150, 230, 255],
    });
    const durationGen = Date.now() - t0;
    console.log(`    Generated 4000x5000 input in ${durationGen}ms`);

    const t1 = Date.now();
    const output = await normalizeCutoutTo3x4Canvas(input);
    const durationNorm = Date.now() - t1;
    console.log(`    Normalized 4000x5000 in ${durationNorm}ms`);

    const metrics = await inspectNormalizedOutput(output);
    assert(metrics.hasContent, 'Huge image must produce valid content');
    console.log(`    Huge 4000x5000 -> BBox25: ${metrics.bbox25.bboxW}x${metrics.bbox25.bboxH}, fillH: ${(metrics.fillH25 * 100).toFixed(2)}%`);
    assert(metrics.fillH25 >= 0.48 && metrics.fillH25 <= 0.52, `Height fill must be within [48%, 52%] (found ${(metrics.fillH25 * 100).toFixed(2)}%)`);
    assert(metrics.fillW25 <= 0.52, `Width fill must be <= 52%`);
    pass('Test 1.5: Huge 4000x5000 image processed cleanly with exact [48%, 52%] height fill', `${durationNorm}ms`);
  } catch (err) {
    fail('Test 1.5: Huge 4000x5000 image', err);
  }

  // Test 1.6: Extreme 1:10 Needle Pen (50x500 box, ratio 0.10)
  try {
    const input = await createSyntheticImage({
      width: 200,
      height: 700,
      objX: 75,
      objY: 100,
      objW: 50,
      objH: 500,
      objColor: [60, 200, 100, 255],
    });
    const output = await normalizeCutoutTo3x4Canvas(input);
    const metrics = await inspectNormalizedOutput(output);

    assert(metrics.hasContent, '1:10 needle must produce valid content');
    console.log(`    Extreme Needle 1:10 -> BBox25: ${metrics.bbox25.bboxW}x${metrics.bbox25.bboxH}, fillH: ${(metrics.fillH25 * 100).toFixed(2)}%`);
    assert(metrics.fillH25 >= 0.48 && metrics.fillH25 <= 0.52, `Height fill must be in [48%, 52%] (found ${(metrics.fillH25 * 100).toFixed(2)}%)`);
    pass('Test 1.6: Extreme 1:10 needle pen satisfies 48%-52% height fill', `fillH: ${(metrics.fillH25 * 100).toFixed(1)}%`);
  } catch (err) {
    fail('Test 1.6: Extreme 1:10 needle pen', err);
  }

  // Test 1.7: Standard Catalog Ratio (~1:2 Portrait Beaded Pen: 300x600 box, ratio 0.50)
  try {
    const input = await createSyntheticImage({
      width: 500,
      height: 900,
      objX: 100,
      objY: 150,
      objW: 300,
      objH: 600,
      objColor: [210, 80, 160, 255],
    });
    const output = await normalizeCutoutTo3x4Canvas(input);
    const metrics = await inspectNormalizedOutput(output);

    assert(metrics.hasContent, 'Standard catalog pen must produce valid content');
    console.log(`    Standard Catalog Pen 1:2 -> BBox25: ${metrics.bbox25.bboxW}x${metrics.bbox25.bboxH}, fillH: ${(metrics.fillH25 * 100).toFixed(2)}%`);
    assert(metrics.fillH25 >= 0.48 && metrics.fillH25 <= 0.52, `Height fill must be in [48%, 52%] (found ${(metrics.fillH25 * 100).toFixed(2)}%)`);
    pass('Test 1.7: Standard catalog beaded pen ratio satisfies 48%-52% height fill', `fillH: ${(metrics.fillH25 * 100).toFixed(1)}%`);
  } catch (err) {
    fail('Test 1.7: Standard catalog beaded pen', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 2: EDGE DE-FRINGING & GRAY HALO CLAMPING (alpha < 140)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n=== SUITE 2: EDGE DE-FRINGING & GRAY HALO CLAMPING ===');

  // Test 2.1: Image with Tabletop Gray Halos (alpha=120, sat=0, 8px outer border)
  try {
    const input = await createSyntheticImage({
      width: 400,
      height: 600,
      objX: 100,
      objY: 100,
      objW: 200,
      objH: 400,
      objColor: [220, 40, 40, 255], // Vibrant red trinket
      fringeWidth: 8,
      fringeAlpha: 120, // Tabletop gray halo alpha < 140
      fringeColor: [128, 128, 128], // Neutral gray
    });
    const output = await normalizeCutoutTo3x4Canvas(input);
    const metrics = await inspectNormalizedOutput(output);

    assert(metrics.hasContent, 'Output must have content');
    console.log(`    Tabletop halo (alpha=120, sat=0) -> fringe remnants in output: ${metrics.fringeRemnants}`);
    assert.strictEqual(metrics.fringeRemnants, 0, `All gray fringe pixels must be clamped to alpha=0, found ${metrics.fringeRemnants}`);
    pass('Test 2.1: Tabletop gray halo (alpha=120) completely clamped with 0 remnants', `fringeRemnants: 0`);
  } catch (err) {
    fail('Test 2.1: Tabletop gray halo alpha=120', err);
  }

  // Test 2.2: Halo Gradient Test (alpha range 30..138 with warm tabletop gray cast [138, 130, 120])
  try {
    const w = 400;
    const h = 600;
    const raw = Buffer.alloc(w * h * 4, 0);

    // Draw central trinket (160x360)
    for (let y = 120; y < 480; y++) {
      for (let x = 120; x < 280; x++) {
        const idx = (y * w + x) * 4;
        raw[idx] = 40;
        raw[idx + 1] = 200;
        raw[idx + 2] = 100;
        raw[idx + 3] = 255;
      }
    }

    // Draw a gradient tabletop halo around the trinket with alpha stepped from 35 to 135
    for (let ring = 1; ring <= 10; ring++) {
      const ringAlpha = Math.round(35 + ring * 10); // 45 to 135
      const topY = 120 - ring;
      const botY = 480 + ring - 1;
      const leftX = 120 - ring;
      const rightX = 280 + ring - 1;

      for (let x = leftX; x <= rightX; x++) {
        if (topY >= 0) {
          const idx = (topY * w + x) * 4;
          raw[idx] = 138; raw[idx + 1] = 130; raw[idx + 2] = 120; raw[idx + 3] = ringAlpha;
        }
        if (botY < h) {
          const idx = (botY * w + x) * 4;
          raw[idx] = 138; raw[idx + 1] = 130; raw[idx + 2] = 120; raw[idx + 3] = ringAlpha;
        }
      }
      for (let y = topY; y <= botY; y++) {
        if (leftX >= 0) {
          const idx = (y * w + leftX) * 4;
          raw[idx] = 138; raw[idx + 1] = 130; raw[idx + 2] = 120; raw[idx + 3] = ringAlpha;
        }
        if (rightX < w) {
          const idx = (y * w + rightX) * 4;
          raw[idx] = 138; raw[idx + 1] = 130; raw[idx + 2] = 120; raw[idx + 3] = ringAlpha;
        }
      }
    }

    const inputPng = await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const output = await normalizeCutoutTo3x4Canvas(inputPng);
    const metrics = await inspectNormalizedOutput(output);

    console.log(`    Gradient tabletop halo (alpha 35..135) -> fringe remnants: ${metrics.fringeRemnants}`);
    assert.strictEqual(metrics.fringeRemnants, 0, `All gradient fringe pixels (alpha < 140) must be clamped, found ${metrics.fringeRemnants}`);
    pass('Test 2.2: Gradient tabletop halo (alpha 35..135) completely eliminated', `fringeRemnants: 0`);
  } catch (err) {
    fail('Test 2.2: Gradient tabletop halo', err);
  }

  // Test 2.3: Preservation of High-Saturation Colorful Product Edges (semi-transparent glass beads)
  // Product has a red edge with alpha=100 and sat=0.85; this should NOT be clamped to 0!
  try {
    const input = await createSyntheticImage({
      width: 400,
      height: 600,
      objX: 120,
      objY: 150,
      objW: 160,
      objH: 300,
      objColor: [230, 20, 20, 255], // Core opaque red bead
      fringeWidth: 4,
      fringeAlpha: 100, // Semi-transparent edge
      fringeColor: [240, 30, 30], // High-saturation red bead fringe (sat = 0.875)
    });
    const output = await normalizeCutoutTo3x4Canvas(input);
    const metrics = await inspectNormalizedOutput(output);

    // In the output, the red bead edge must survive (since sat > 0.20)
    const { data: raw, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
    let colorfulAlphaSurviving = 0;
    for (let i = 0; i < info.width * info.height; i++) {
      const r = raw[i * 4];
      const g = raw[i * 4 + 1];
      const b = raw[i * 4 + 2];
      const a = raw[i * 4 + 3];
      if (a > 60 && a < 140 && r > 180 && g < 80 && b < 80) {
        colorfulAlphaSurviving++;
      }
    }
    console.log(`    Colorful product edge preservation -> surviving colored edge pixels: ${colorfulAlphaSurviving}`);
    assert(colorfulAlphaSurviving > 0, 'High-saturation colorful bead edge pixels must NOT be erroneously zeroed');
    pass('Test 2.3: High-saturation colorful product edges preserved while gray halos stripped', `${colorfulAlphaSurviving} edge pixels`);
  } catch (err) {
    fail('Test 2.3: Colorful edge preservation', err);
  }

  // Test 2.4: Concavity Background Pocket Removal
  // Simulates a hollow fork in a keychain (like the "Y" charm) trapped with gray tabletop pixels
  try {
    const input = await createSyntheticImage({
      width: 400,
      height: 600,
      objX: 100,
      objY: 100,
      objW: 200,
      objH: 400,
      objColor: [220, 180, 40, 255], // Gold keychain charm
      concavityPocket: {
        x: 160,
        y: 200,
        w: 80,
        h: 100,
        color: [125, 120, 115], // Gray tabletop trapped pocket
        alpha: 110,
      },
    });
    const output = await normalizeCutoutTo3x4Canvas(input);
    const metrics = await inspectNormalizedOutput(output);

    assert.strictEqual(metrics.fringeRemnants, 0, 'Concavity pocket gray tabletop pixels must be removed');
    pass('Test 2.4: Concavity background pocket cleanly cleared inside charm fork', `fringeRemnants: 0`);
  } catch (err) {
    fail('Test 2.4: Concavity background pocket removal', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 3: BOUNDARY & DEGENERATE EDGE CASES
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n=== SUITE 3: BOUNDARY & DEGENERATE EDGE CASES ===');

  // Test 3.1: Completely Transparent PNG Input (zero opaque pixels)
  try {
    const emptyInput = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).png().toBuffer();

    const output = await normalizeCutoutTo3x4Canvas(emptyInput);
    const metrics = await inspectNormalizedOutput(output);

    assert.strictEqual(metrics.nonZeroCount, 0, 'Output must be 100% transparent canvas');
    assert.strictEqual(metrics.width, 1200, 'Canvas width must be 1200');
    assert.strictEqual(metrics.height, 1600, 'Canvas height must be 1600');
    pass('Test 3.1: Completely transparent input produces blank 1200x1600 canvas without crashing', '0 non-zero px');
  } catch (err) {
    fail('Test 3.1: Completely transparent input', err);
  }

  // Test 3.2: Pure Halo Input (only gray tabletop pixels with alpha < 140, no trinket)
  try {
    const haloOnlyInput = await createSyntheticImage({
      width: 300,
      height: 300,
      objX: 50,
      objY: 50,
      objW: 200,
      objH: 200,
      objColor: [128, 128, 128, 100], // Low sat, alpha < 140
    });

    const output = await normalizeCutoutTo3x4Canvas(haloOnlyInput);
    const metrics = await inspectNormalizedOutput(output);

    assert.strictEqual(metrics.nonZeroCount, 0, 'Output must be 100% transparent after de-fringe strips pure halo');
    pass('Test 3.2: Pure halo input (alpha < 140) completely stripped to blank canvas', '0 remnants');
  } catch (err) {
    fail('Test 3.2: Pure halo input', err);
  }

  // Test 3.3: 1x1 Degenerate Single Pixel Input
  try {
    const singlePixel = Buffer.from([255, 0, 0, 255]);
    const inputPng = await sharp(singlePixel, { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();
    const output = await normalizeCutoutTo3x4Canvas(inputPng);
    const metrics = await inspectNormalizedOutput(output);

    assert(metrics.hasContent, '1x1 pixel input scales up to centered content');
    pass('Test 3.3: 1x1 single pixel scales and centers without division by zero', `${metrics.bbox25.bboxW}x${metrics.bbox25.bboxH}`);
  } catch (err) {
    fail('Test 3.3: 1x1 degenerate input', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 4: PURE-JS FALLBACK PATH VERIFICATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n=== SUITE 4: PURE-JS FALLBACK PATH VERIFICATION ===');

  // Test 4.1: cleanCutoutRgba direct algorithm test on RGBA buffer
  try {
    const W = 100;
    const H = 100;
    const data = new Uint8Array(W * H * 4);

    // Opaque central object: red [220, 40, 40, 255]
    for (let y = 30; y < 70; y++) {
      for (let x = 30; x < 70; x++) {
        const idx = (y * W + x) * 4;
        data[idx] = 220; data[idx + 1] = 40; data[idx + 2] = 40; data[idx + 3] = 255;
      }
    }

    // Tabletop gray fringe around object (alpha=110, [128, 128, 128])
    for (let y = 25; y < 75; y++) {
      for (let x = 25; x < 75; x++) {
        if (x < 30 || x >= 70 || y < 30 || y >= 70) {
          const idx = (y * W + x) * 4;
          data[idx] = 128; data[idx + 1] = 128; data[idx + 2] = 128; data[idx + 3] = 110;
        }
      }
    }

    // Tabletop perimeter weak pixels (alpha=40)
    for (let x = 0; x < W; x++) {
      const iTop = (0 * W + x) * 4;
      data[iTop] = 128; data[iTop + 1] = 128; data[iTop + 2] = 128; data[iTop + 3] = 40;
    }

    cleanCutoutRgba(data, W, H, { deFringe: true, removePockets: true });

    let survivingGray = 0;
    let survivingRed = 0;
    for (let i = 0; i < W * H; i++) {
      const a = data[i * 4 + 3];
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      if (a > 0) {
        if (r > 180 && g < 60) survivingRed++;
        if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10) survivingGray++;
      }
    }

    assert.strictEqual(survivingGray, 0, `All gray fringe must be 0, found ${survivingGray}`);
    assert.strictEqual(survivingRed, 40 * 40, `Core object red pixels must be preserved (${40 * 40}), found ${survivingRed}`);
    pass('Test 4.1: cleanCutoutRgba correctly strips tabletop fringe while preserving core object', `red: ${survivingRed}, gray: 0`);
  } catch (err) {
    fail('Test 4.1: cleanCutoutRgba pure algorithm', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 5: REAL CATALOG ASSET TESTING (W & Y KEYCHAINS)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n=== SUITE 5: REAL CATALOG ASSET TESTING (W & Y KEYCHAINS) ===');

  // Test 5.1: Real Raw Photo Isolation & 3:4 Normalization: Citrus Glow Letter W Keychain
  try {
    const rawUrlW = 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/raw/raw-1792797228459-w.jpg';
    console.log(`    Fetching real raw photo: ${rawUrlW}...`);
    const res = await fetch(rawUrlW);
    assert(res.ok, `Failed to fetch ${rawUrlW} (HTTP ${res.status})`);
    const rawBuf = Buffer.from(await res.arrayBuffer());

    const t0 = Date.now();
    const isolation = await isolateBackgroundHybrid(rawBuf, {
      preferEngine: 'sharp',
      autoCrop: false,
    });
    const isolatedDur = Date.now() - t0;
    console.log(`    Isolated raw W photo via ${isolation.engine} in ${isolatedDur}ms`);

    const t1 = Date.now();
    const normalized = await normalizeCutoutTo3x4Canvas(isolation.buffer);
    const normDur = Date.now() - t1;
    console.log(`    Normalized W cutout to 3:4 canvas in ${normDur}ms`);

    const metrics = await inspectNormalizedOutput(normalized);
    assert(metrics.hasContent, 'Normalized W cutout must have content');
    console.log(`    W Keychain -> BBox25: ${metrics.bbox25.bboxW}x${metrics.bbox25.bboxH}, fillH: ${(metrics.fillH25 * 100).toFixed(2)}%, fillW: ${(metrics.fillW25 * 100).toFixed(2)}%, fringeRemnants: ${metrics.fringeRemnants}`);

    // Fill ratio must be in 45%-55% (acceptance criteria) and <= 52% width
    assert(metrics.fillH25 >= 0.45 && metrics.fillH25 <= 0.55, `Height fill must be between 45% and 55% (found ${(metrics.fillH25 * 100).toFixed(2)}%)`);
    assert(metrics.fillW25 <= 0.525, `Width fill must be <= 52% (found ${(metrics.fillW25 * 100).toFixed(2)}%)`);
    assert.strictEqual(metrics.fringeRemnants, 0, `Gray tabletop fringe remnants must be 0, found ${metrics.fringeRemnants}`);
    pass('Test 5.1: Citrus Glow Letter W raw photo isolated & normalized to 3:4 canvas with [45%, 55%] fill and 0 fringe remnants', `fillH: ${(metrics.fillH25 * 100).toFixed(1)}%`);
  } catch (err) {
    fail('Test 5.1: Real W photo isolation & normalization', err);
  }

  // Test 5.2: Real Raw Photo Isolation & 3:4 Normalization: Bright Candy Initial Y Keychain
  try {
    const rawUrlY = 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/raw/raw-1792799262887-IMG_1035.jpg';
    console.log(`    Fetching real raw photo: ${rawUrlY}...`);
    const res = await fetch(rawUrlY);
    assert(res.ok, `Failed to fetch ${rawUrlY} (HTTP ${res.status})`);
    const rawBuf = Buffer.from(await res.arrayBuffer());

    const t0 = Date.now();
    const isolation = await isolateBackgroundHybrid(rawBuf, {
      preferEngine: 'sharp',
      autoCrop: false,
    });
    const isolatedDur = Date.now() - t0;
    console.log(`    Isolated raw Y photo via ${isolation.engine} in ${isolatedDur}ms`);

    const t1 = Date.now();
    const normalized = await normalizeCutoutTo3x4Canvas(isolation.buffer);
    const normDur = Date.now() - t1;
    console.log(`    Normalized Y cutout to 3:4 canvas in ${normDur}ms`);

    const metrics = await inspectNormalizedOutput(normalized);
    assert(metrics.hasContent, 'Normalized Y cutout must have content');
    console.log(`    Y Keychain -> BBox25: ${metrics.bbox25.bboxW}x${metrics.bbox25.bboxH}, fillH: ${(metrics.fillH25 * 100).toFixed(2)}%, fillW: ${(metrics.fillW25 * 100).toFixed(2)}%, fringeRemnants: ${metrics.fringeRemnants}`);

    assert(metrics.fillH25 >= 0.45 && metrics.fillH25 <= 0.55, `Height fill must be between 45% and 55% (found ${(metrics.fillH25 * 100).toFixed(2)}%)`);
    assert(metrics.fillW25 <= 0.525, `Width fill must be <= 52% (found ${(metrics.fillW25 * 100).toFixed(2)}%)`);
    assert.strictEqual(metrics.fringeRemnants, 0, `Gray tabletop fringe remnants must be 0, found ${metrics.fringeRemnants}`);
    pass('Test 5.2: Bright Candy Initial Y raw photo isolated & normalized to 3:4 canvas with [45%, 55%] fill and 0 fringe remnants', `fillH: ${(metrics.fillH25 * 100).toFixed(1)}%`);
  } catch (err) {
    fail('Test 5.2: Real Y photo isolation & normalization', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log(`EMPIRICAL CHALLENGE SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log('══════════════════════════════════════════════════════════════════════════════\n');

  if (results.failed > 0) {
    console.error('VERDICT: REJECT');
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
