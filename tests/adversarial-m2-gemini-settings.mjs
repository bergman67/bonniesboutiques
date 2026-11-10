#!/usr/bin/env node
/**
 * tests/adversarial-m2-gemini-settings.mjs
 *
 * Empirical Challenger Adversarial Stress Test Suite for Milestone 2:
 * 1. Deep StoreSettings Security & Leakage Probing
 * 2. PUT Corruption Resistance (Masked, Empty, Malformed, Types)
 * 3. Gemini Vision API /api/upload/analyze Edge Cases & Error Handling
 * 4. Real Catalog Photos Classification (Pens, Keychains, Raw JPEGs)
 * 5. Multi-Round "Suggest Another Name" Uniqueness Verification
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const isLoadedWithLoader = process.execArgv.some(a => a.includes('test-loader.mjs'));
if (!isLoadedWithLoader) {
  const result = spawnSync(process.execPath, [
    '--loader',
    './scripts/test-loader.mjs',
    fileURLToPath(import.meta.url),
    ...process.argv.slice(2),
  ], { stdio: 'inherit' });
  process.exit(result.status ?? 0);
}

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const { GET: settingsGET, PUT: settingsPUT } = await import('../src/app/api/settings/route.ts');
const { POST: analyzePOST } = await import('../src/app/api/upload/analyze/route.ts');
const { analyzeProductPhoto, getEffectiveGeminiApiKey } = await import('../src/lib/gemini.ts');

const prisma = new PrismaClient();

const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function pass(name, detail = '') {
  results.passed++;
  results.tests.push({ name, status: 'PASS', detail });
  console.log(`  ✔ [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, error) {
  results.failed++;
  const msg = error instanceof Error ? error.message : String(error);
  results.tests.push({ name, status: 'FAIL', error: msg });
  console.error(`  ✖ [FAIL] ${name}: ${msg}`);
}

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║   ADVERSARIAL CHALLENGER SUITE: MILESTONE 2 EMPIRICAL AUDIT             ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

async function runAdversarialSuite() {
  const defaultSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  assert(defaultSettings, 'Database must have "default" settings record');
  const originalDbKey = defaultSettings.geminiApiKey;
  const adminPin = defaultSettings.adminPin || 'welcome1';

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 1: SETTINGS SECURITY & LEAKAGE PROBING
  // ════════════════════════════════════════════════════════════════════════════
  console.log('══════════════════════════════════════════════════════════════════════════');
  console.log(' SECTION 1: SETTINGS SECURITY & SECRET LEAKAGE AUDIT');
  console.log('══════════════════════════════════════════════════════════════════════════');

  const forbiddenSecrets = [
    'geminiApiKey',
    'shippoApiKey',
    'stripeSecretKey',
    'adminPin',
    'returnStreet',
    'returnCity',
    'returnState',
    'returnZip',
  ];

  function assertNoSecrets(data, label) {
    for (const secret of forbiddenSecrets) {
      assert(
        !(secret in data),
        `SECURITY VIOLATION [${label}]: Secret field '${secret}' was leaked in response!`
      );
    }
  }

  // 1.1 Standard unauthenticated GET
  try {
    const req = new Request('http://localhost:3000/api/settings');
    const res = await settingsGET(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assertNoSecrets(data, 'Standard Unauthenticated GET');
    assert(!('geminiKeyMasked' in data), 'geminiKeyMasked should not appear in standard public GET');
    pass('1.1 Standard unauthenticated GET strictly omits all secret keys and masked keys');
  } catch (err) {
    fail('1.1 Standard unauthenticated GET strictly omits all secret keys and masked keys', err);
  }

  // 1.2 Query parameter exploit attempts (attempting to bypass header auth)
  const exploitUrls = [
    'http://localhost:3000/api/settings?admin=true',
    `http://localhost:3000/api/settings?admin=true&x-admin-pin=${adminPin}`,
    `http://localhost:3000/api/settings?admin=true&pin=${adminPin}`,
    `http://localhost:3000/api/settings?admin=true&adminPin=${adminPin}`,
    `http://localhost:3000/api/settings?admin=1&x-admin-pin=${adminPin}`,
    'http://localhost:3000/api/settings?admin=yes',
    'http://localhost:3000/api/settings?admin=true&geminiApiKey=true',
  ];

  for (let i = 0; i < exploitUrls.length; i++) {
    const url = exploitUrls[i];
    try {
      const req = new Request(url);
      const res = await settingsGET(req);
      const data = await res.json();
      assertNoSecrets(data, `Exploit URL ${url}`);
      assert(!('geminiApiKey' in data), 'Raw geminiApiKey must not be in response');
      if (data.requiresAuth === true) {
        assert(!('geminiKeyMasked' in data), 'Masked key must not leak on unauthenticated admin attempt');
      }
      pass(`1.2.${i + 1} Query param exploit thwarted: ${url.replace('http://localhost:3000', '')}`);
    } catch (err) {
      fail(`1.2.${i + 1} Query param exploit thwarted: ${url}`, err);
    }
  }

  // 1.3 Invalid or bogus header PINs
  const badPins = ['wrong_pin', '', '   ', '1234', 'null', 'undefined', 'WELCOME1'];
  for (let i = 0; i < badPins.length; i++) {
    const pin = badPins[i];
    try {
      const req = new Request('http://localhost:3000/api/settings?admin=true', {
        headers: { 'x-admin-pin': pin },
      });
      const res = await settingsGET(req);
      const data = await res.json();
      assert.strictEqual(data.requiresAuth, true, `Expected requiresAuth: true for pin "${pin}"`);
      assertNoSecrets(data, `Bad PIN "${pin}"`);
      assert(!('geminiKeyMasked' in data), 'Masked key must not leak for invalid PIN');
      pass(`1.3.${i + 1} Unauthorized PIN rejected: "${pin}"`);
    } catch (err) {
      fail(`1.3.${i + 1} Unauthorized PIN rejected: "${pin}"`, err);
    }
  }

  // 1.4 Valid Authenticated Admin GET
  try {
    const req = new Request('http://localhost:3000/api/settings?admin=true', {
      headers: { 'x-admin-pin': adminPin },
    });
    const res = await settingsGET(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.requiresAuth, false);
    assert.strictEqual(data.geminiConfigured, true);
    assert(typeof data.geminiKeyMasked === 'string', 'geminiKeyMasked must be string');
    assert(data.geminiKeyMasked.includes('••••'), 'geminiKeyMasked must contain bullet characters');
    // Raw secret must NEVER be returned
    assert(!('geminiApiKey' in data), 'SECURITY: Raw geminiApiKey must NEVER be in response');
    assert(!('stripeSecretKey' in data), 'SECURITY: Raw stripeSecretKey must NEVER be in response');
    assert(!('shippoApiKey' in data), 'SECURITY: Raw shippoApiKey must NEVER be in response');
    assert(!('adminPin' in data), 'SECURITY: Raw adminPin must NEVER be in response');
    pass('1.4 Authenticated Admin GET returns masked key and strictly conceals raw secrets', `Masked: ${data.geminiKeyMasked}`);
  } catch (err) {
    fail('1.4 Authenticated Admin GET returns masked key and strictly conceals raw secrets', err);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 2: ADVERSARIAL PUT SETTINGS & CORRUPTION RESISTANCE
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(' SECTION 2: PUT SETTINGS CORRUPTION RESISTANCE AUDIT');
  console.log('══════════════════════════════════════════════════════════════════════════');

  // 2.1 Unauthenticated PUT blocked
  try {
    const req = new Request('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geminiApiKey: 'HACKED_KEY' }),
    });
    const res = await settingsPUT(req);
    assert.ok([401, 403].includes(res.status), `PUT without credentials must return 401 or 403, got ${res.status}`);
    const dbNow = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    assert.strictEqual(dbNow.geminiApiKey, originalDbKey, 'DB key must be untouched');
    pass('2.1 Unauthenticated PUT /api/settings correctly blocked with 401/403');
  } catch (err) {
    fail('2.1 Unauthenticated PUT /api/settings correctly blocked with 401/403', err);
  }

  // 2.2 Wrong PIN in PUT blocked
  try {
    const req = new Request('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': 'wrong_password_attempt',
      },
      body: JSON.stringify({ geminiApiKey: 'HACKED_KEY' }),
    });
    const res = await settingsPUT(req);
    assert.ok([401, 403].includes(res.status), `PUT with wrong pin must return 401 or 403, got ${res.status}`);
    const dbNow = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    assert.strictEqual(dbNow.geminiApiKey, originalDbKey, 'DB key must be untouched');
    pass('2.2 PUT with incorrect x-admin-pin rejected with 401/403');
  } catch (err) {
    fail('2.2 PUT with incorrect x-admin-pin rejected with 401/403', err);
  }

  // 2.3 Masked strings variations must NEVER corrupt the DB key
  const maskedPayloads = [
    'AQ.xxxx••••••••xxxx',
    '••••••••',
    '••••',
    '   ••••••••   ',
    'PREFIX••••SUFFIX',
    '••••••••••••••••••••••••••••••••',
  ];

  for (let i = 0; i < maskedPayloads.length; i++) {
    const maskedVal = maskedPayloads[i];
    try {
      const req = new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({ geminiApiKey: maskedVal }),
      });
      const res = await settingsPUT(req);
      assert.strictEqual(res.status, 200);
      const dbNow = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
      assert.strictEqual(dbNow.geminiApiKey, originalDbKey, `Key was corrupted by masked string "${maskedVal}"!`);
      pass(`2.3.${i + 1} Masked string "${maskedVal}" safely ignored, preserving real key`);
    } catch (err) {
      fail(`2.3.${i + 1} Masked string "${maskedVal}" safety check`, err);
    }
  }

  // 2.4 Empty and whitespace strings must NEVER wipe the DB key
  const emptyPayloads = ['', '   ', '\t', '\n'];
  for (let i = 0; i < emptyPayloads.length; i++) {
    const emptyVal = emptyPayloads[i];
    try {
      const req = new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({ geminiApiKey: emptyVal }),
      });
      const res = await settingsPUT(req);
      assert.strictEqual(res.status, 200);
      const dbNow = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
      assert.strictEqual(dbNow.geminiApiKey, originalDbKey, `Key was erased by empty string "${emptyVal}"!`);
      pass(`2.4.${i + 1} Empty/whitespace string safely ignored, preserving real key`);
    } catch (err) {
      fail(`2.4.${i + 1} Empty/whitespace string safety check`, err);
    }
  }

  // 2.5 Non-string values in geminiApiKey must not crash or corrupt
  const malformedTypePayloads = [12345, true, false, {}, ['array'], { nested: 'val' }];
  for (let i = 0; i < malformedTypePayloads.length; i++) {
    const val = malformedTypePayloads[i];
    try {
      const req = new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({ geminiApiKey: val }),
      });
      const res = await settingsPUT(req);
      assert.strictEqual(res.status, 200);
      const dbNow = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
      assert.strictEqual(dbNow.geminiApiKey, originalDbKey, `Key was corrupted by non-string type "${typeof val}"!`);
      pass(`2.5.${i + 1} Non-string type ${typeof val} safely ignored`);
    } catch (err) {
      fail(`2.5.${i + 1} Non-string type safety check`, err);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 3: /api/upload/analyze EDGE CASES & INPUT VALIDATION
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(' SECTION 3: /api/upload/analyze EDGE CASES & ERROR RESILIENCE');
  console.log('══════════════════════════════════════════════════════════════════════════');

  // 3.1 Empty JSON body
  try {
    const req = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await analyzePOST(req);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert(body.error && body.error.includes('No image provided'));
    pass('3.1 Empty JSON payload returns 400 Bad Request');
  } catch (err) {
    fail('3.1 Empty JSON payload returns 400 Bad Request', err);
  }

  // 3.2 Empty or null imageUrl / imageBase64
  const emptyBodies = [
    { imageUrl: '' },
    { imageUrl: null },
    { imageBase64: '' },
    { imageBase64: null },
  ];
  for (let i = 0; i < emptyBodies.length; i++) {
    try {
      const req = new Request('http://localhost:3000/api/upload/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emptyBodies[i]),
      });
      const res = await analyzePOST(req);
      assert.strictEqual(res.status, 400);
      pass(`3.2.${i + 1} Empty image attribute ${JSON.stringify(emptyBodies[i])} returns 400 Bad Request`);
    } catch (err) {
      fail(`3.2.${i + 1} Empty image attribute check`, err);
    }
  }

  // 3.2b Whitespace or invalid imageUrl strings return an error status (>= 400) without process crash
  const invalidUrlBodies = [
    { imageUrl: '   ' },
    { imageUrl: 'not_a_valid_url_protocol' },
  ];
  for (let i = 0; i < invalidUrlBodies.length; i++) {
    try {
      const req = new Request('http://localhost:3000/api/upload/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUrlBodies[i]),
      });
      const res = await analyzePOST(req);
      assert(res.status >= 400, `Expected error status >= 400, got ${res.status}`);
      const body = await res.json();
      assert(body.error, 'Error payload must contain error message');
      pass(`3.2b.${i + 1} Invalid URL payload ${JSON.stringify(invalidUrlBodies[i])} safely returned error (${res.status})`);
    } catch (err) {
      fail(`3.2b.${i + 1} Invalid URL payload check`, err);
    }
  }

  // 3.3 Empty multipart/form-data
  try {
    const formData = new FormData();
    const req = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      body: formData,
    });
    const res = await analyzePOST(req);
    assert.strictEqual(res.status, 400);
    pass('3.3 Empty FormData returns 400 Bad Request');
  } catch (err) {
    fail('3.3 Empty FormData returns 400 Bad Request', err);
  }

  // 3.3b 0-byte file in multipart/form-data
  try {
    const formData = new FormData();
    const emptyBlob = new Blob([], { type: 'image/png' });
    formData.append('file', emptyBlob, 'zero_byte.png');
    const req = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      body: formData,
    });
    const res = await analyzePOST(req);
    assert.strictEqual(res.status, 400);
    pass('3.3b 0-byte file in FormData returns 400 Bad Request');
  } catch (err) {
    fail('3.3b 0-byte file in FormData returns 400 Bad Request', err);
  }

  // 3.4 Non-existent image URL handles gracefully (500/400 without crashing process)
  try {
    const req = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: 'https://btboutiqe.com/uploads/non-existent-image-404.png' }),
    });
    const res = await analyzePOST(req);
    assert(res.status >= 400);
    const body = await res.json();
    assert(body.error);
    pass('3.4 Non-existent external image URL returns error status gracefully without unhandled crash');
  } catch (err) {
    fail('3.4 Non-existent external image URL error handling', err);
  }

  // 3.5 Malformed JSON body string
  try {
    const req = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ this is invalid json !!!',
    });
    const res = await analyzePOST(req);
    assert.strictEqual(res.status, 400);
    pass('3.5 Malformed JSON string gracefully returns 400 Bad Request');
  } catch (err) {
    fail('3.5 Malformed JSON string test', err);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 4: REAL CATALOG PHOTO ANALYSIS & CATEGORY RECOGNITION
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(' SECTION 4: REAL CATALOG PHOTO ANALYSIS ACROSS CATEGORIES');
  console.log('══════════════════════════════════════════════════════════════════════════');

  // 4.1 Real Pen photo via JSON imageUrl
  let penTitle = '';
  try {
    const req = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: '/uploads/transparent/transparent-1789413705065-46-IMG_8963.png',
      }),
    });
    const res = await analyzePOST(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.strictEqual(body.category, 'Beaded Pens', `Expected 'Beaded Pens', got '${body.category}'`);
    assert(body.title.toLowerCase().includes('pen'), `Title should end with Pen/Beaded Pen: "${body.title}"`);
    assert.strictEqual(body.price, 8.00);
    assert(typeof body.description === 'string' && body.description.length > 20);
    assert(['gemini-flash-latest', 'gemini-3.8-flash'].includes(body.modelUsed), `Model used: ${body.modelUsed}`);
    penTitle = body.title;
    pass('4.1 Real Beaded Pen analyzed accurately with Gemini Vision', `Title: "${body.title}", Model: ${body.modelUsed}`);
  } catch (err) {
    fail('4.1 Real Beaded Pen analyzed accurately with Gemini Vision', err);
  }

  // 4.2 Real Keychain photo via FormData file upload
  let keychainTitle = '';
  try {
    const keychainFilePath = path.join(process.cwd(), 'public', 'uploads', 'transparent', 'transparent-1789413688662-2-IMG_8919.png');
    const keychainBuf = fs.readFileSync(keychainFilePath);
    const formData = new FormData();
    const blob = new Blob([keychainBuf], { type: 'image/png' });
    formData.append('file', blob, 'keychain.png');

    const req = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      body: formData,
    });
    const res = await analyzePOST(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.strictEqual(body.category, 'Keychains', `Expected 'Keychains', got '${body.category}'`);
    assert(
      body.title.toLowerCase().includes('keychain') ||
      body.title.toLowerCase().includes('wristlet') ||
      body.title.toLowerCase().includes('loop'),
      `Title should indicate keychain/wristlet: "${body.title}"`
    );
    assert.strictEqual(body.price, 8.00);
    keychainTitle = body.title;
    pass('4.2 Real Keychain analyzed accurately with Gemini Vision via multipart file', `Title: "${body.title}", Category: ${body.category}`);
  } catch (err) {
    fail('4.2 Real Keychain analyzed accurately with Gemini Vision via multipart file', err);
  }

  // 4.3 Real Raw JPEG photo (before transparent background removal)
  try {
    const rawPhotoPath = path.join(process.cwd(), 'public', 'uploads', '1789147836207-1-IMG_8918.JPEG');
    const rawBuf = fs.readFileSync(rawPhotoPath);
    const formData = new FormData();
    formData.append('file', new Blob([rawBuf], { type: 'image/jpeg' }), 'raw.jpeg');

    const req = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      body: formData,
    });
    const res = await analyzePOST(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert(['Beaded Pens', 'Keychains', 'Charms & Bookmarks'].includes(body.category));
    assert(body.title.length > 5);
    pass('4.3 Real Raw JPEG photo analyzed directly before isolation', `Title: "${body.title}", Category: ${body.category}`);
  } catch (err) {
    fail('4.3 Real Raw JPEG photo analyzed directly before isolation', err);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 5: "SUGGEST ANOTHER NAME" MULTI-ROUND UNIQUENESS STRESS TEST
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(' SECTION 5: "SUGGEST ANOTHER NAME" MULTI-ROUND UNIQUENESS STRESS TEST');
  console.log('══════════════════════════════════════════════════════════════════════════');

  // Bonnie repeatedly clicks "Suggest Another Name" 5 times on the same item.
  // We accumulate excludeTitles and verify every single suggestion is unique.
  const accumulatedTitles = [penTitle];
  const maxRounds = 5;

  for (let round = 1; round <= maxRounds; round++) {
    try {
      const req = new Request('http://localhost:3000/api/upload/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: '/uploads/transparent/transparent-1789413705065-46-IMG_8963.png',
          excludeTitles: accumulatedTitles,
        }),
      });
      const res = await analyzePOST(req);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      const newTitle = body.title;

      assert(newTitle && newTitle.trim().length > 0, 'New title must be non-empty');
      assert(
        !accumulatedTitles.includes(newTitle),
        `DUPLICATE TITLE DETECTED at round ${round}: "${newTitle}" was already in ${JSON.stringify(accumulatedTitles)}`
      );

      accumulatedTitles.push(newTitle);
      pass(`5.${round} Round ${round} "Suggest Another Name" produced distinct title: "${newTitle}"`);
    } catch (err) {
      fail(`5.${round} Round ${round} "Suggest Another Name" uniqueness test`, err);
    }
  }

  // 5.6 Test adversarial excludeTitles payloads
  const adversarialExcludes = [
    [],
    [null, undefined, 123, ''],
    'Just a single raw string (not in array)',
    ['Title with "quotes" and symbols: !@#$%^&*()'],
    Array.from({ length: 25 }, (_, i) => `Previous Generated Title #${i + 1}`),
  ];

  for (let i = 0; i < adversarialExcludes.length; i++) {
    const excludeVal = adversarialExcludes[i];
    try {
      const req = new Request('http://localhost:3000/api/upload/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: '/uploads/transparent/transparent-1789413705065-46-IMG_8963.png',
          excludeTitles: excludeVal,
        }),
      });
      const res = await analyzePOST(req);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert(body.success === true && body.title);
      pass(`5.6.${i + 1} Adversarial excludeTitles payload handled without error (${i === 4 ? '25 excluded titles' : 'special chars'})`);
    } catch (err) {
      fail(`5.6.${i + 1} Adversarial excludeTitles payload check`, err);
    }
  }

  // 5.7 Multipart stringified excludeTitles in FormData
  try {
    const formData = new FormData();
    formData.append('imageUrl', '/uploads/transparent/transparent-1789413705065-46-IMG_8963.png');
    formData.append('excludeTitles', JSON.stringify(['Title X', 'Title Y']));

    const req = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      body: formData,
    });
    const res = await analyzePOST(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert(!['Title X', 'Title Y'].includes(body.title));
    pass('5.7 Multipart FormData with stringified JSON excludeTitles parsed properly');
  } catch (err) {
    fail('5.7 Multipart FormData with stringified JSON excludeTitles parsed properly', err);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUMMARY REPORT
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(`ADVERSARIAL AUDIT COMPLETE: ${results.passed} Passed, ${results.failed} Failed`);
  console.log('══════════════════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();

  if (results.failed > 0) {
    console.error('❌ ADVERSARIAL AUDIT DETECTED FAILURES. REQUESTING CHANGES.');
    process.exit(1);
  } else {
    console.log('✅ ALL ADVERSARIAL CHALLENGES PASSED. VERDICT: APPROVE.');
    process.exit(0);
  }
}

runAdversarialSuite().catch(async (err) => {
  console.error('Fatal test harness error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
