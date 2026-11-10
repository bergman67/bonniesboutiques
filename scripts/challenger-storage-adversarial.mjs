#!/usr/bin/env node
/**
 * scripts/challenger-storage-adversarial.mjs
 *
 * Adversarial verification harness for productStorage:
 * 1. Supabase credentials valid (live upload and public HTTP GET verification).
 * 2. Supabase credentials unset (local fallback to public/uploads/).
 * 3. Supabase credentials invalid (bad JWT key, unresolvable domain) -> verify graceful fallback.
 * 4. Adversarial filename handling (unicode, spaces, special chars, multiple dots, uppercase extensions).
 * 5. Dual storage verification: both transparent cutout and raw photo exist and are readable.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

import { storeProductAssets } from '../src/lib/storage/productStorage.ts';

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

// 8-byte PNG signature
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Minimal valid PNG buffer
const dummyPng = Buffer.concat([
  PNG_MAGIC,
  Buffer.from('0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex')
]);

// Minimal valid JPEG buffer
const dummyJpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x80, 0xff, 0xd9
]);

async function runStorageAdversarialTests() {
  console.log('======================================================================');
  console.log('CHALLENGER HARNESS 1: DUAL STORAGE & ADVERSARIAL CREDENTIAL FALLBACK');
  console.log('======================================================================\n');

  const originalEnvSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalEnvAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const originalEnvServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Supabase Enabled with Valid Credentials -> Remote & Local Storage
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Supabase Upload with Valid Credentials ---');
  try {
    assert(originalEnvSupabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL must be configured');
    const res = await storeProductAssets({
      rawBuffer: dummyJpeg,
      transparentBuffer: dummyPng,
      originalFilename: 'challenger-test-valid.jpeg',
      mimeType: 'image/jpeg',
    });

    assert(res.transparentUrl.startsWith('https://'), `Expected Supabase URL, got: ${res.transparentUrl}`);
    assert(res.originalUrl.startsWith('https://'), `Expected Supabase URL, got: ${res.originalUrl}`);
    assert(res.filename.startsWith('transparent-'), `Expected filename prefix, got: ${res.filename}`);

    // Verify both remote URLs are HTTP 200 reachable
    const fetchTrans = await fetch(res.transparentUrl);
    assert.strictEqual(fetchTrans.status, 200, `Supabase transparent URL returned status ${fetchTrans.status}`);
    const transBuf = Buffer.from(await fetchTrans.arrayBuffer());
    assert(transBuf.subarray(0, 8).equals(PNG_MAGIC), 'Supabase transparent download must have PNG magic');

    const fetchRaw = await fetch(res.originalUrl);
    assert.strictEqual(fetchRaw.status, 200, `Supabase raw URL returned status ${fetchRaw.status}`);
    const rawBuf = Buffer.from(await fetchRaw.arrayBuffer());
    assert.strictEqual(rawBuf.length, dummyJpeg.length, 'Supabase raw file byte size mismatch');

    // Verify local disk files were also written (dual storage)
    const localTransPath = path.join(process.cwd(), 'public', 'uploads', 'transparent', res.filename);
    assert(fs.existsSync(localTransPath), `Local transparent file missing: ${localTransPath}`);
    const localRawName = res.filename.replace(/^transparent-/, 'raw-').replace(/\.png$/, '.jpeg');
    const localRawPath = path.join(process.cwd(), 'public', 'uploads', localRawName);
    assert(fs.existsSync(localRawPath), `Local raw file missing: ${localRawPath}`);

    pass('Supabase upload with valid credentials succeeds and dual assets are reachable', `transStatus=${fetchTrans.status}, rawStatus=${fetchRaw.status}`);
  } catch (err) {
    fail('Supabase upload with valid credentials', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Credentials UNSET -> Clean Local Filesystem Fallback
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Supabase Credentials Unset Fallback ---');
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const res = await storeProductAssets({
      rawBuffer: dummyJpeg,
      transparentBuffer: dummyPng,
      originalFilename: 'challenger-test-unset.jpeg',
      mimeType: 'image/jpeg',
    });

    assert(res.transparentUrl.startsWith('/uploads/transparent/'), `Expected local transparent URL, got ${res.transparentUrl}`);
    assert(res.originalUrl.startsWith('/uploads/'), `Expected local raw URL, got ${res.originalUrl}`);
    assert(!res.originalUrl.includes('//'), `Double slash in original URL: ${res.originalUrl}`);

    const localTransPath = path.join(process.cwd(), 'public', res.transparentUrl);
    const localRawPath = path.join(process.cwd(), 'public', res.originalUrl);

    assert(fs.existsSync(localTransPath), `Local transparent file does not exist: ${localTransPath}`);
    assert(fs.existsSync(localRawPath), `Local raw file does not exist: ${localRawPath}`);

    const savedTrans = fs.readFileSync(localTransPath);
    const savedRaw = fs.readFileSync(localRawPath);

    assert(savedTrans.subarray(0, 8).equals(PNG_MAGIC), 'Local transparent file must have PNG magic');
    assert.strictEqual(savedRaw.length, dummyJpeg.length, 'Local raw file byte length mismatch');

    pass('Supabase credentials unset cleanly falls back to local disk storage', `transparentUrl=${res.transparentUrl}`);
  } catch (err) {
    fail('Supabase credentials unset fallback', err);
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnvSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnvServiceKey;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnvAnonKey;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Invalid Supabase Credentials (Bad Key) -> Graceful Fallback
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Invalid Supabase Service Key Fallback ---');
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnvSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'invalid-bad-secret-key-12345';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'invalid-bad-secret-key-12345';

    const res = await storeProductAssets({
      rawBuffer: dummyJpeg,
      transparentBuffer: dummyPng,
      originalFilename: 'challenger-test-badkey.jpeg',
      mimeType: 'image/jpeg',
    });

    // When Supabase upload fails with 401/403, storeProductAssets must fall back to local URLs
    assert(res.transparentUrl.startsWith('/uploads/transparent/'), `Expected fallback transparent URL, got: ${res.transparentUrl}`);
    assert(res.originalUrl.startsWith('/uploads/'), `Expected fallback raw URL, got: ${res.originalUrl}`);

    const localTransPath = path.join(process.cwd(), 'public', res.transparentUrl);
    const localRawPath = path.join(process.cwd(), 'public', res.originalUrl);
    assert(fs.existsSync(localTransPath), `Fallback transparent file not found: ${localTransPath}`);
    assert(fs.existsSync(localRawPath), `Fallback raw file not found: ${localRawPath}`);

    pass('Invalid Supabase credentials (401/403) gracefully falls back to local URLs', `url=${res.transparentUrl}`);
  } catch (err) {
    fail('Invalid Supabase credentials fallback', err);
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnvSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnvServiceKey;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnvAnonKey;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Malformed / Unresolvable Supabase URL -> Graceful Fallback
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Unresolvable Supabase Domain Fallback ---');
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://nonexistent-domain-xyz-404-challenger.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'any-key';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'any-key';

    const res = await storeProductAssets({
      rawBuffer: dummyJpeg,
      transparentBuffer: dummyPng,
      originalFilename: 'challenger-test-badurl.jpeg',
      mimeType: 'image/jpeg',
    });

    assert(res.transparentUrl.startsWith('/uploads/transparent/'), `Expected local fallback on unresolvable URL, got: ${res.transparentUrl}`);
    assert(res.originalUrl.startsWith('/uploads/'), `Expected local fallback on unresolvable URL, got: ${res.originalUrl}`);

    pass('Unresolvable Supabase domain gracefully falls back to local URLs without crash', `url=${res.transparentUrl}`);
  } catch (err) {
    fail('Unresolvable Supabase domain fallback', err);
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnvSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnvServiceKey;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnvAnonKey;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Adversarial Filename Sanitization & Extensions
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Adversarial Filename Handling ---');
  const adversarialFilenames = [
    { input: 'Sparkling Rose & Butterfly (Special #1) [Final]!.PNG', expectedExt: 'png' },
    { input: 'My Cute Trinket ✨💖 beads.JPEG', expectedExt: 'jpeg' },
    { input: 'no-extension-file', expectedExt: 'jpeg' },
    { input: '../../../etc/passwd.jpg', expectedExt: 'jpg' },
    { input: 'double.extension.test.WEBP', expectedExt: 'webp' },
  ];

  for (const { input, expectedExt } of adversarialFilenames) {
    try {
      const res = await storeProductAssets({
        rawBuffer: dummyJpeg,
        transparentBuffer: dummyPng,
        originalFilename: input,
      });

      // Filename must NOT contain directory traversal
      assert(!res.filename.includes('..'), `Path traversal detected in filename: ${res.filename}`);
      assert(!res.filename.includes('/'), `Slash detected in filename: ${res.filename}`);
      assert(!res.filename.includes('\\'), `Backslash detected in filename: ${res.filename}`);
      assert(res.filename.endsWith('.png'), `Cutout must end with .png: ${res.filename}`);

      // Original URL must contain sanitized extension
      assert(
        res.originalUrl.endsWith(`.${expectedExt}`) || res.originalUrl.endsWith('.jpeg'),
        `Expected extension .${expectedExt} or fallback .jpeg, got: ${res.originalUrl}`
      );

      pass(`Adversarial filename sanitized: "${input}"`, `filename=${res.filename}`);
    } catch (err) {
      fail(`Adversarial filename: "${input}"`, err);
    }
  }

  // Summary
  console.log('\n══════════════════════════════════════════════════════════════════════');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`STORAGE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('══════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStorageAdversarialTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
