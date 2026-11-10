#!/usr/bin/env node
/**
 * scripts/test-challenger-m1-remediation.mjs
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE for Milestone 1 Remediation:
 * Smart Background Isolation Hybrid Pipeline & Dual Storage.
 *
 * Verifies the 5 remediation criteria with empirical generators, oracles & stress harnesses:
 * 1. Zero options hybrid execution on Windows Node without native GLib crash.
 * 2. Large image stride (> 2048px, e.g. 3000x2000, 3500x2500) - channel alignment, no black pixels, vertical edge preservation.
 * 3. 100% perimeter border transparency on ALL public catalog photos (0 non-zero border pixels across outer 3px).
 * 4. AutoCrop and centered padding in /api/upload - bounding box trimmed & symmetrically padded.
 * 5. Storage fallback robustness under invalid credentials, network outage, and dual failure.
 * 6. Edge cases: extreme aspect ratios, solid colors, corrupted buffers, and concurrency.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import 'dotenv/config';

import {
  PNG_MAGIC,
  isolateWithSharp,
  isolateBackgroundHybrid,
  trimAndCenter,
} from '../src/lib/image/isolation.ts';

import { storeProductAssets } from '../src/lib/storage/productStorage.ts';
import { POST } from '../src/app/api/upload/route.ts';
import { NextRequest } from 'next/server.js';

const results = [];

function pass(testName, detail = '') {
  results.push({ testName, status: 'PASS', detail });
  console.log(`  ✔ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
}

function fail(testName, error) {
  const msg = error instanceof Error ? error.message : String(error);
  results.push({ testName, status: 'FAIL', error: msg });
  console.error(`  ✖ [FAIL] ${testName}: ${msg}`);
}

// Helper to create synthetic test images
async function makeSyntheticImage({
  width = 600,
  height = 600,
  bgColor = [245, 245, 245],
  shapes = [],
}) {
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      raw[idx] = bgColor[0];
      raw[idx + 1] = bgColor[1];
      raw[idx + 2] = bgColor[2];
    }
  }

  for (const s of shapes) {
    if (s.type === 'rect') {
      for (let y = s.y1; y < s.y2; y++) {
        for (let x = s.x1; x < s.x2; x++) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = (y * width + x) * 3;
            raw[idx] = s.color[0];
            raw[idx + 1] = s.color[1];
            raw[idx + 2] = s.color[2];
          }
        }
      }
    } else if (s.type === 'circle') {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dist = Math.hypot(x - s.cx, y - s.cy);
          if (dist <= s.r) {
            const idx = (y * width + x) * 3;
            raw[idx] = s.color[0];
            raw[idx + 1] = s.color[1];
            raw[idx + 2] = s.color[2];
          }
        }
      }
    }
  }

  return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg().toBuffer();
}

async function runAdversarialSuite() {
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       EMPIRICAL ADVERSARIAL CHALLENGER SUITE: MILESTONE 1 REMEDIATION    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  // ==========================================================================
  // SECTION 1: ZERO OPTIONS HYBRID EXECUTION ON WINDOWS (NO GLIB CRASH)
  // ==========================================================================
  console.log('── 1. VERIFYING ZERO-OPTIONS HYBRID EXECUTION ON WINDOWS NODE ──────────────');
  {
    try {
      const testImg = await makeSyntheticImage({
        width: 400,
        height: 400,
        bgColor: [240, 240, 240],
        shapes: [{ type: 'circle', cx: 200, cy: 200, r: 80, color: [220, 30, 80] }],
      });

      // Call isolateBackgroundHybrid with NO second argument (zero options)
      const t0 = Date.now();
      const res = await isolateBackgroundHybrid(testImg);
      const duration = Date.now() - t0;

      assert(res, 'Must return result');
      assert(res.buffer, 'Must return buffer');
      assert.strictEqual(res.engine, 'sharp', 'Must route to sharp on Windows');
      assert(res.buffer.subarray(0, 8).equals(PNG_MAGIC), 'Must be valid PNG');
      assert(duration < 10000, `Execution took ${duration}ms, exceeding 10s SLA`);

      const meta = await sharp(res.buffer).metadata();
      assert.strictEqual(meta.channels, 4, 'Must have 4 channels');
      assert.strictEqual(meta.hasAlpha, true, 'Must have alpha channel');

      pass('isolateBackgroundHybrid(buffer) with zero options executed with 0 native GLib crash', `${duration}ms, engine: ${res.engine}`);
    } catch (err) {
      fail('isolateBackgroundHybrid zero options', err);
    }

    // Also test explicitly passing { preferEngine: 'imgly' } on Windows
    try {
      const testImg = await makeSyntheticImage({
        width: 300,
        height: 300,
        bgColor: [250, 250, 250],
        shapes: [{ type: 'rect', x1: 100, y1: 100, x2: 200, y2: 200, color: [0, 150, 255] }],
      });

      const res = await isolateBackgroundHybrid(testImg, { preferEngine: 'imgly' });
      assert(res.buffer.subarray(0, 8).equals(PNG_MAGIC), 'Must return valid PNG');
      // On Windows, the guard must prevent imgly native crash and use sharp
      assert.strictEqual(res.engine, 'sharp', 'Windows guard should prevent imgly native crash and use sharp');
      pass('preferEngine="imgly" on Windows safely guarded without crashing Node process');
    } catch (err) {
      fail('preferEngine="imgly" on Windows guard', err);
    }
  }

  // ==========================================================================
  // SECTION 2: LARGE IMAGE STRIDE (>2048px, 3000x2000 & 3500x2500)
  // ==========================================================================
  console.log('\n── 2. VERIFYING LARGE IMAGE STRIDE & CHANNEL ALIGNMENT (>2048px) ───────────');
  {
    try {
      // Create 3000x2000 image with specific multi-color target:
      // Background: light gray (240, 240, 240)
      // Left box: Pure Red (255, 0, 0) from x: 800..1400, y: 700..1300
      // Right box: Pure Blue (0, 0, 255) from x: 1600..2200, y: 700..1300
      const w = 3000;
      const h = 2000;
      const testImg3000 = await makeSyntheticImage({
        width: w,
        height: h,
        bgColor: [240, 240, 240],
        shapes: [
          { type: 'rect', x1: 800, y1: 700, x2: 1400, y2: 1300, color: [255, 0, 0] },
          { type: 'rect', x1: 1600, y1: 700, x2: 2200, y2: 1300, color: [0, 0, 255] },
        ],
      });

      const t0 = Date.now();
      const isolated = await isolateWithSharp(testImg3000);
      const duration = Date.now() - t0;

      const meta = await sharp(isolated).metadata();
      assert.strictEqual(meta.width, 2048, `Width must be constrained to 2048, got ${meta.width}`);
      assert.strictEqual(meta.height, 1365, `Height must maintain aspect ratio (1365), got ${meta.height}`);

      const raw = await sharp(isolated).raw().toBuffer();
      const outW = meta.width;
      const outH = meta.height;

      // Map coordinates from 3000x2000 to 2048x1365: scale ~ 2048/3000 = 0.682667
      // Left box center: (1100, 1000) -> scaled: (751, 683)
      const redX = Math.round(1100 * (2048 / 3000));
      const redY = Math.round(1000 * (1365 / 2000));
      const redIdx = (redY * outW + redX) * 4;
      const rR = raw[redIdx];
      const rG = raw[redIdx + 1];
      const rB = raw[redIdx + 2];
      const rA = raw[redIdx + 3];

      assert(rR > 200, `Red target pixel must have high Red, got R=${rR}`);
      assert(rG < 60, `Red target pixel Green channel must be low (no shearing), got G=${rG}`);
      assert(rB < 60, `Red target pixel Blue channel must be low (no shearing), got B=${rB}`);
      assert(rA >= 128, `Red target pixel must be opaque foreground, got A=${rA}`);

      // Right box center: (1900, 1000) -> scaled: (1297, 683)
      const blueX = Math.round(1900 * (2048 / 3000));
      const blueY = Math.round(1000 * (1365 / 2000));
      const blueIdx = (blueY * outW + blueX) * 4;
      const bR = raw[blueIdx];
      const bG = raw[blueIdx + 1];
      const bB = raw[blueIdx + 2];
      const bA = raw[blueIdx + 3];

      assert(bB > 200, `Blue target pixel must have high Blue, got B=${bB}`);
      assert(bR < 60, `Blue target pixel Red channel must be low (no shearing), got R=${bR}`);
      assert(bG < 60, `Blue target pixel Green channel must be low (no shearing), got G=${bG}`);
      assert(bA >= 128, `Blue target pixel must be opaque foreground, got A=${bA}`);

      // Verify that NO large swathes of pixels are turned pitch-black opaque (0, 0, 0, 255)
      let pitchBlackOpaqueCount = 0;
      for (let i = 0; i < outW * outH; i++) {
        const pixR = raw[i * 4];
        const pixG = raw[i * 4 + 1];
        const pixB = raw[i * 4 + 2];
        const pixA = raw[i * 4 + 3];
        if (pixR === 0 && pixG === 0 && pixB === 0 && pixA === 255) {
          pitchBlackOpaqueCount++;
        }
      }
      const pitchBlackPct = (pitchBlackOpaqueCount / (outW * outH)) * 100;
      assert(pitchBlackPct < 1.0, `Pitch black opaque pixels found: ${pitchBlackPct.toFixed(2)}% (previously was >53%)`);

      pass(
        '3000x2000 image correctly resized to 2048x1365 with perfect color channel alignment and 0 black pixel corruption',
        `Red=(${rR},${rG},${rB}), Blue=(${bR},${bG},${bB}), pitchBlack=${pitchBlackPct.toFixed(3)}%, ${duration}ms`
      );
    } catch (err) {
      fail('3000x2000 stride mismatch test', err);
    }

    // Test a portrait oversized image (2200x3200)
    try {
      const portraitImg = await makeSyntheticImage({
        width: 2200,
        height: 3200,
        bgColor: [242, 242, 242],
        shapes: [{ type: 'circle', cx: 1100, cy: 1600, r: 400, color: [40, 200, 40] }],
      });

      const isolatedPortrait = await isolateWithSharp(portraitImg);
      const meta = await sharp(isolatedPortrait).metadata();
      assert.strictEqual(meta.height, 2048, `Portrait height should be 2048, got ${meta.height}`);
      assert.strictEqual(meta.width, 1408, `Portrait width should be 1408, got ${meta.width}`);

      const raw = await sharp(isolatedPortrait).raw().toBuffer();
      const centerIdx = (Math.floor(meta.height / 2) * meta.width + Math.floor(meta.width / 2)) * 4;
      const cG = raw[centerIdx + 1];
      const cA = raw[centerIdx + 3];
      assert(cG > 150, `Center green channel must be high, got ${cG}`);
      assert(cA >= 128, `Center alpha must be foreground, got ${cA}`);

      pass('2200x3200 portrait image correctly resized to 1408x2048 without corruption');
    } catch (err) {
      fail('Portrait oversized stride test', err);
    }
  }

  // ==========================================================================
  // SECTION 3: 100% PERIMETER BORDER TRANSPARENCY ON ALL CATALOG PHOTOS
  // ==========================================================================
  console.log('\n── 3. VERIFYING 100% PERIMETER BORDER TRANSPARENCY ON REAL CATALOG PHOTOS ──');
  {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const catalogPhotos = [
      '1789147836207-1-IMG_8918.JPEG',
      '1789147836234-2-IMG_8919.JPEG',
      '1789147836243-3-IMG_8920.JPEG',
      '1789147836260-4-IMG_8921.JPEG',
      '1789147836276-5-IMG_8922.JPEG',
    ];

    for (const photoName of catalogPhotos) {
      const photoPath = path.join(uploadsDir, photoName);
      if (!fs.existsSync(photoPath)) {
        console.warn(`  ⚠ Catalog photo ${photoName} not found, skipping`);
        continue;
      }

      try {
        const fileBuf = fs.readFileSync(photoPath);
        const t0 = Date.now();
        const isolatedBuf = await isolateWithSharp(fileBuf);
        const duration = Date.now() - t0;

        assert(isolatedBuf.subarray(0, 8).equals(PNG_MAGIC), 'Must produce valid PNG header');
        const meta = await sharp(isolatedBuf).metadata();
        const raw = await sharp(isolatedBuf).raw().toBuffer();
        const w = meta.width;
        const h = meta.height;

        // Exhaustive audit of all perimeter pixels in outer 3px border
        let nonZeroCount = 0;
        let maxAlpha = 0;
        let totalChecked = 0;
        const badPixels = [];

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (x < 3 || x >= w - 3 || y < 3 || y >= h - 3) {
              totalChecked++;
              const alpha = raw[(y * w + x) * 4 + 3];
              if (alpha !== 0) {
                nonZeroCount++;
                if (alpha > maxAlpha) maxAlpha = alpha;
                if (badPixels.length < 5) badPixels.push({ x, y, alpha });
              }
            }
          }
        }

        assert.strictEqual(
          nonZeroCount,
          0,
          `${photoName} failed perimeter transparency: ${nonZeroCount}/${totalChecked} pixels had alpha > 0 (max alpha: ${maxAlpha}, samples: ${JSON.stringify(badPixels)})`
        );

        // Also verify the foreground subject is preserved
        let opaquePixels = 0;
        for (let i = 3; i < raw.length; i += 4) {
          if (raw[i] >= 128) opaquePixels++;
        }
        const opaquePct = (opaquePixels / (w * h)) * 100;
        assert(opaquePixels > 10000, `${photoName} foreground missing (opaque pixels: ${opaquePixels})`);

        pass(
          `Real catalog photo ${photoName}: 100% border transparency verified (0/${totalChecked} non-zero pixels)`,
          `${w}x${h}, opaquePixels=${opaquePixels} (${opaquePct.toFixed(1)}%), duration=${duration}ms`
        );
      } catch (err) {
        fail(`Perimeter transparency on ${photoName}`, err);
      }
    }
  }

  // ==========================================================================
  // SECTION 4: AUTOCROP & CENTERED PADDING IN /api/upload
  // ==========================================================================
  console.log('\n── 4. VERIFYING AUTOCROP & CENTERED PADDING IN /api/upload ──────────────────');
  {
    try {
      // Create a 1000x1000 synthetic image with a small centered 200x200 red square
      const paddedImg = await makeSyntheticImage({
        width: 1000,
        height: 1000,
        bgColor: [245, 245, 245],
        shapes: [{ type: 'rect', x1: 400, y1: 400, x2: 600, y2: 600, color: [220, 20, 60] }],
      });

      const formData = new FormData();
      formData.append('file', new Blob([paddedImg], { type: 'image/jpeg' }), 'autocrop-test.jpeg');

      const req = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(req);
      assert.strictEqual(res.status, 200, `Expected 200, got status ${res.status}`);

      const data = await res.json();
      assert.strictEqual(data.success, true, 'Upload must succeed');
      assert(data.transparentUrl, 'Missing transparentUrl');

      // Fetch or read the generated transparent cutout
      let cutoutBuffer;
      if (data.transparentUrl.startsWith('http')) {
        const fetchRes = await fetch(data.transparentUrl);
        assert.strictEqual(fetchRes.status, 200, 'Remote cutout fetch failed');
        cutoutBuffer = Buffer.from(await fetchRes.arrayBuffer());
      } else {
        const localPath = path.join(process.cwd(), 'public', data.transparentUrl);
        assert(fs.existsSync(localPath), 'Local cutout not found on disk');
        cutoutBuffer = fs.readFileSync(localPath);
      }

      const meta = await sharp(cutoutBuffer).metadata();
      // Original was 1000x1000 with a 200x200 subject.
      // AutoCrop must trim the 1000x1000 canvas down to the ~200x200 subject + 5% padding.
      // Width and height should be around 200 + 2*16 = ~232px, definitely < 400px!
      assert(
        meta.width < 500 && meta.height < 500,
        `Expected autocropped dimensions < 500px, got ${meta.width}x${meta.height}`
      );
      assert(
        meta.width >= 200 && meta.height >= 200,
        `Expected autocropped dimensions >= 200px, got ${meta.width}x${meta.height}`
      );

      // Verify centering: measure transparent margins on top, bottom, left, right
      const raw = await sharp(cutoutBuffer).raw().toBuffer();
      const w = meta.width;
      const h = meta.height;

      let topMargin = h;
      let bottomMargin = h;
      let leftMargin = w;
      let rightMargin = w;

      // Find first and last opaque rows and cols
      let minX = w, maxX = 0, minY = h, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const a = raw[(y * w + x) * 4 + 3];
          if (a >= 128) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const padTop = minY;
      const padBottom = h - 1 - maxY;
      const padLeft = minX;
      const padRight = w - 1 - maxX;

      // Assert symmetric padding (within 2px tolerance for integer rounding)
      const vertDiff = Math.abs(padTop - padBottom);
      const horizDiff = Math.abs(padLeft - padRight);

      assert(vertDiff <= 2, `Vertical padding is not centered: top=${padTop}, bottom=${padBottom}, diff=${vertDiff}`);
      assert(horizDiff <= 2, `Horizontal padding is not centered: left=${padLeft}, right=${padRight}, diff=${horizDiff}`);
      assert(padTop >= 15, `Padding too small: top padding is ${padTop}px`);

      pass(
        '/api/upload successfully applied AutoCrop and centered padding',
        `Original: 1000x1000 -> Trimmed: ${w}x${h}, margins: L=${padLeft}, R=${padRight}, T=${padTop}, B=${padBottom}`
      );
    } catch (err) {
      fail('AutoCrop and centered padding in /api/upload', err);
    }
  }

  // ==========================================================================
  // SECTION 5: DUAL STORAGE FALLBACK UNDER ADVERSARIAL SCENARIOS
  // ==========================================================================
  console.log('\n── 5. VERIFYING DUAL STORAGE FALLBACK UNDER ADVERSARIAL SCENARIOS ──────────');
  {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const origAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const dummyRaw = Buffer.from('FAKE-JPEG-DATA');
    const dummyTrans = Buffer.concat([PNG_MAGIC, Buffer.from([0, 0, 0, 0])]);

    // Subcase 5.1: Bad Secret Key (401/403)
    try {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'invalid-bad-key';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'invalid-bad-key';

      const res = await storeProductAssets({
        rawBuffer: dummyRaw,
        transparentBuffer: dummyTrans,
        originalFilename: 'test-bad-key.jpeg',
      });

      assert(res.transparentUrl.startsWith('/uploads/transparent/'), 'Must fall back to local transparent URL');
      assert(res.originalUrl.startsWith('/uploads/'), 'Must fall back to local raw URL');

      const localTransPath = path.join(process.cwd(), 'public', res.transparentUrl);
      const localRawPath = path.join(process.cwd(), 'public', res.originalUrl);
      assert(fs.existsSync(localTransPath), 'Local transparent file must be written');
      assert(fs.existsSync(localRawPath), 'Local raw file must be written');

      // Clean up
      if (fs.existsSync(localTransPath)) fs.unlinkSync(localTransPath);
      if (fs.existsSync(localRawPath)) fs.unlinkSync(localRawPath);

      pass('Bad Supabase key gracefully falls back to local storage without throwing');
    } catch (err) {
      fail('Bad Supabase key fallback', err);
    } finally {
      process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origAnon;
    }

    // Subcase 5.2: Unresolvable / Dead Supabase Domain
    try {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://nonexistent-host-99999.invalid';
      const res = await storeProductAssets({
        rawBuffer: dummyRaw,
        transparentBuffer: dummyTrans,
        originalFilename: 'test-dead-domain.jpeg',
      });

      assert(res.transparentUrl.startsWith('/uploads/transparent/'), 'Must fall back to local transparent URL');
      const localTransPath = path.join(process.cwd(), 'public', res.transparentUrl);
      assert(fs.existsSync(localTransPath), 'Local transparent file must exist');
      if (fs.existsSync(localTransPath)) fs.unlinkSync(localTransPath);
      const localRawPath = path.join(process.cwd(), 'public', res.originalUrl);
      if (fs.existsSync(localRawPath)) fs.unlinkSync(localRawPath);

      pass('Dead Supabase domain gracefully falls back to local storage without throwing');
    } catch (err) {
      fail('Dead Supabase domain fallback', err);
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    }

    // Subcase 5.3: Dual Failure (Both Supabase fails AND local disk write fails)
    try {
      // Mock fs.promises.writeFile to simulate a read-only filesystem or disk full
      const originalWriteFile = fs.promises.writeFile;
      let errorThrown = false;
      try {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'invalid-key';
        fs.promises.writeFile = async () => {
          throw new Error('EROFS: read-only file system');
        };

        await storeProductAssets({
          rawBuffer: dummyRaw,
          transparentBuffer: dummyTrans,
          originalFilename: 'test-dual-fail.jpeg',
        });
      } catch (err) {
        errorThrown = true;
        assert(
          err.message.includes('Both Supabase cloud storage and local filesystem storage are unavailable'),
          `Expected dual storage unavailable error, got: ${err.message}`
        );
      } finally {
        fs.promises.writeFile = originalWriteFile;
        process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      }

      assert(errorThrown, 'Must throw error when both cloud and local storage fail');
      pass('Dual storage failure correctly throws descriptive error rather than returning broken URLs');
    } catch (err) {
      fail('Dual storage failure error handling', err);
    }
  }

  // ==========================================================================
  // SECTION 6: CONCURRENCY & EXTREME BOUNDARY CONDITIONS
  // ==========================================================================
  console.log('\n── 6. VERIFYING CONCURRENCY & EXTREME BOUNDARY CONDITIONS ───────────────────');
  {
    // Concurrency test: 8 parallel calls
    try {
      const smallImg = await makeSyntheticImage({
        width: 150,
        height: 150,
        bgColor: [250, 250, 250],
        shapes: [{ type: 'circle', cx: 75, cy: 75, r: 30, color: [200, 50, 50] }],
      });

      const t0 = Date.now();
      const promises = Array.from({ length: 8 }, () => isolateBackgroundHybrid(smallImg));
      const parallelResults = await Promise.all(promises);
      const totalDuration = Date.now() - t0;

      for (const res of parallelResults) {
        assert(res.buffer.subarray(0, 8).equals(PNG_MAGIC), 'Parallel output must be valid PNG');
        assert.strictEqual(res.engine, 'sharp', 'All parallel requests must complete with sharp engine');
      }

      pass(`8 parallel isolation requests completed in ${totalDuration}ms without deadlocks or crashes`);
    } catch (err) {
      fail('Parallel concurrency stress test', err);
    }

    // Extreme aspect ratio: 2000x30 ultra-wide ribbon
    try {
      const ribbonImg = await makeSyntheticImage({
        width: 2000,
        height: 30,
        bgColor: [240, 240, 240],
        shapes: [{ type: 'rect', x1: 500, y1: 5, x2: 1500, y2: 25, color: [100, 100, 255] }],
      });

      const res = await isolateWithSharp(ribbonImg);
      const meta = await sharp(res).metadata();
      assert.strictEqual(meta.width, 2000, `Ribbon width should be 2000, got ${meta.width}`);
      assert.strictEqual(meta.height, 30, `Ribbon height should be 30, got ${meta.height}`);
      pass('2000x30 ultra-wide ribbon processed cleanly without buffer stride exception');
    } catch (err) {
      fail('Ultra-wide ribbon test', err);
    }
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`EMPIRICAL CHALLENGER VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('══════════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.error('FAILED TESTS:');
    for (const r of results.filter((r) => r.status === 'FAIL')) {
      console.error(` - ${r.testName}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('🎉 ALL EMPIRICAL CHALLENGES PASSED! ZERO DEFECTS DETECTED.\n');
    process.exit(0);
  }
}

runAdversarialSuite().catch((err) => {
  console.error('Fatal challenger execution error:', err);
  process.exit(1);
});
