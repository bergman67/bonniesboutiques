#!/usr/bin/env node
/**
 * scripts/challenger-upload-contract.mjs
 *
 * Adversarial verification harness for /api/upload endpoint contract:
 * 1. Standard real camera photo upload (JPEG) -> returns dual URLs, backward compat `url`, duration < 10s.
 * 2. TransparentUrl and OriginalUrl accessibility verification (HTTP 200 or local fs check).
 * 3. PNG input processing.
 * 4. WebP input processing.
 * 5. High-resolution input (4000x3000) resize boundary check.
 * 6. Missing file in FormData -> 400 Bad Request.
 * 7. Non-blob field -> 400 Bad Request.
 * 8. Zero-byte empty file -> 400 Bad Request.
 * 9. Corrupt/non-image buffer -> 500 Handled JSON Error.
 * 10. Serverless constraint (NETLIFY=true) -> sharp engine, < 5s duration.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { NextRequest } from 'next/server.js';
import 'dotenv/config';

import { POST } from '../src/app/api/upload/route.ts';

const results = [];

function pass(name, detail = '') {
  results.push({ name, status: 'PASS', detail });
  console.log(`  ✔ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  const msg = error instanceof Error ? error.message : String(error);
  results.push({ name, status: 'FAIL', error: msg });
  console.error(`  ✖ [FAIL] ${name}: ${msg}`);
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function runUploadContractTests() {
  console.log('======================================================================');
  console.log('CHALLENGER HARNESS 2: /api/upload ENDPOINT CONTRACT & ADVERSARIAL CASES');
  console.log('======================================================================\n');

  // Load a real camera photo from public/uploads
  const realPhotoPath = path.join(process.cwd(), 'public', 'uploads', '1789147836207-1-IMG_8918.JPEG');
  assert(fs.existsSync(realPhotoPath), `Real test photo not found at ${realPhotoPath}`);
  const realPhotoBuffer = fs.readFileSync(realPhotoPath);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Real Camera Photo Upload (JPEG)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Real Camera Photo Upload (/api/upload) ---');
  try {
    const t0 = Date.now();
    const formData = new FormData();
    const blob = new Blob([realPhotoBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, '1789147836207-1-IMG_8918.JPEG');

    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    const duration = Date.now() - t0;
    assert.strictEqual(res.status, 200, `Expected 200, got status ${res.status}`);

    const data = await res.json();
    assert.strictEqual(data.success, true, 'Response must have success: true');
    assert(data.transparentUrl, 'Response missing transparentUrl');
    assert(data.originalUrl, 'Response missing originalUrl');
    assert.strictEqual(data.url, data.transparentUrl, 'data.url must equal transparentUrl for backward compatibility');
    assert(data.filename.endsWith('.png'), 'data.filename must end with .png');
    assert(['sharp', 'imgly'].includes(data.engine), `Invalid engine: ${data.engine}`);
    assert(typeof data.durationMs === 'number', 'data.durationMs must be a number');
    assert(duration < 10000, `Upload route took too long: ${duration}ms`);

    pass('Real camera photo upload succeeds with complete contract', `engine=${data.engine}, duration=${duration}ms`);

    // ────────────────────────────────────────────────────────────────────────
    // TEST 2: Dual URL Accessibility Check
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 2: Dual URL Accessibility Verification ---');
    // Check transparentUrl
    if (data.transparentUrl.startsWith('http')) {
      const resp = await fetch(data.transparentUrl);
      assert.strictEqual(resp.status, 200, `Remote transparent URL returned ${resp.status}`);
      const buf = Buffer.from(await resp.arrayBuffer());
      assert(buf.subarray(0, 8).equals(PNG_MAGIC), 'Remote transparent file must have PNG magic');
      pass('Remote transparentUrl is HTTP 200 reachable and valid PNG', data.transparentUrl.slice(0, 60) + '...');
    } else {
      const localPath = path.join(process.cwd(), 'public', data.transparentUrl);
      assert(fs.existsSync(localPath), `Local transparent file missing: ${localPath}`);
      pass('Local transparentUrl exists on disk', data.transparentUrl);
    }

    // Check originalUrl
    if (data.originalUrl.startsWith('http')) {
      const resp = await fetch(data.originalUrl);
      assert.strictEqual(resp.status, 200, `Remote original URL returned ${resp.status}`);
      const buf = Buffer.from(await resp.arrayBuffer());
      assert(buf.length > 1000, 'Remote original file is too small');
      pass('Remote originalUrl is HTTP 200 reachable', data.originalUrl.slice(0, 60) + '...');
    } else {
      const localPath = path.join(process.cwd(), 'public', data.originalUrl);
      assert(fs.existsSync(localPath), `Local original file missing: ${localPath}`);
      pass('Local originalUrl exists on disk', data.originalUrl);
    }
  } catch (err) {
    fail('Real camera photo upload contract', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: PNG Input Upload
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: PNG Format Upload ---');
  try {
    const pngBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 250, g: 250, b: 250 },
      },
    })
      .composite([{
        input: Buffer.from(
          '<svg width="300" height="300"><circle cx="150" cy="150" r="60" fill="#ff4081" /></svg>'
        ),
      }])
      .png()
      .toBuffer();

    const formData = new FormData();
    const blob = new Blob([pngBuffer], { type: 'image/png' });
    formData.append('file', blob, 'rose_charm.png');

    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200, `PNG upload returned status ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.transparentUrl);
    assert(data.originalUrl);

    pass('PNG format upload succeeds', `transparentUrl=${data.transparentUrl.slice(0, 45)}...`);
  } catch (err) {
    fail('PNG format upload', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: WebP Format Upload
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: WebP Format Upload ---');
  try {
    const webpBuffer = await sharp({
      create: {
        width: 250,
        height: 250,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .composite([{
        input: Buffer.from(
          '<svg width="250" height="250"><rect x="75" y="75" width="100" height="100" fill="#20b2aa" /></svg>'
        ),
      }])
      .webp()
      .toBuffer();

    const formData = new FormData();
    const blob = new Blob([webpBuffer], { type: 'image/webp' });
    formData.append('file', blob, 'sea_turtle_charm.webp');

    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200, `WebP upload returned status ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.transparentUrl);
    assert(data.originalUrl);

    pass('WebP format upload succeeds', `transparentUrl=${data.transparentUrl.slice(0, 45)}...`);
  } catch (err) {
    fail('WebP format upload', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: High-Resolution (4000x3000) Auto-Resize Boundary Test
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: High-Resolution (4000x3000) Resize Boundary ---');
  try {
    const t0 = Date.now();
    const hugeBuffer = await sharp({
      create: {
        width: 4000,
        height: 3000,
        channels: 3,
        background: { r: 245, g: 245, b: 245 },
      },
    })
      .composite([{
        input: Buffer.from(
          '<svg width="4000" height="3000"><circle cx="2000" cy="1500" r="500" fill="#800080" /></svg>'
        ),
      }])
      .jpeg({ quality: 80 })
      .toBuffer();

    const formData = new FormData();
    const blob = new Blob([hugeBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'huge_camera_shot.jpeg');

    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    const duration = Date.now() - t0;
    assert.strictEqual(res.status, 200, `Huge photo upload returned status ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(duration < 10000, `Huge photo upload took too long: ${duration}ms`);

    // Verify stored transparent file dimension is <= 2048px
    if (data.transparentUrl.startsWith('http')) {
      const resp = await fetch(data.transparentUrl);
      const buf = Buffer.from(await resp.arrayBuffer());
      const meta = await sharp(buf).metadata();
      assert(meta.width <= 2048, `Width exceeds 2048: ${meta.width}`);
      assert(meta.height <= 2048, `Height exceeds 2048: ${meta.height}`);
      pass('Huge photo was constrained to max 2048px and completed in < 10s', `${meta.width}x${meta.height}, ${duration}ms`);
    } else {
      const localPath = path.join(process.cwd(), 'public', data.transparentUrl);
      const meta = await sharp(localPath).metadata();
      assert(meta.width <= 2048, `Width exceeds 2048: ${meta.width}`);
      assert(meta.height <= 2048, `Height exceeds 2048: ${meta.height}`);
      pass('Huge photo was constrained to max 2048px and completed in < 10s', `${meta.width}x${meta.height}, ${duration}ms`);
    }
  } catch (err) {
    fail('High-resolution auto-resize boundary', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Missing File in FormData
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 6: Missing File in FormData (Error Handling) ---');
  try {
    const formData = new FormData();
    formData.append('otherField', 'value');

    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'No file uploaded');

    pass('Missing file field returns 400 Bad Request with proper error message');
  } catch (err) {
    fail('Missing file field', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Empty File (0 Bytes)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 7: Empty File (0 Bytes) Error Handling ---');
  try {
    const formData = new FormData();
    const emptyBlob = new Blob([], { type: 'image/jpeg' });
    formData.append('file', emptyBlob, 'empty.jpeg');

    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Uploaded file is empty');

    pass('Empty 0-byte file returns 400 Bad Request with proper error message');
  } catch (err) {
    fail('Empty 0-byte file', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Corrupt / Non-Image Buffer Error Handling
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 8: Corrupt Non-Image Data Error Handling ---');
  try {
    const formData = new FormData();
    const corruptBlob = new Blob([Buffer.from('THIS IS NOT A VALID IMAGE BUFFER')], { type: 'image/jpeg' });
    formData.append('file', corruptBlob, 'corrupt.jpeg');

    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 500, `Expected 500 for unparseable image, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error, 'Response must include error message');

    pass('Corrupt non-image buffer safely returns 500 JSON without process crash', data.error);
  } catch (err) {
    fail('Corrupt non-image buffer', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 9: Netlify Serverless Constraint Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 9: Netlify Serverless Constraints ---');
  try {
    process.env.NETLIFY = 'true';
    const formData = new FormData();
    const blob = new Blob([realPhotoBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'serverless-test.jpeg');

    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    delete process.env.NETLIFY;

    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.engine, 'sharp', `Expected engine 'sharp' under NETLIFY, got ${data.engine}`);
    assert(data.durationMs < 5000, `Serverless execution took ${data.durationMs}ms (expected < 5000ms)`);

    pass('Netlify serverless mode strictly uses sharp engine and finishes in < 5s', `${data.durationMs}ms`);
  } catch (err) {
    delete process.env.NETLIFY;
    fail('Netlify serverless constraints', err);
  }

  // Summary
  console.log('\n══════════════════════════════════════════════════════════════════════');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`UPLOAD CONTRACT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('══════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUploadContractTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
