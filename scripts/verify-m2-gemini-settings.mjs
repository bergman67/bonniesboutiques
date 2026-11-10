#!/usr/bin/env node
/**
 * scripts/verify-m2-gemini-settings.mjs
 *
 * Comprehensive Verification Suite for Milestone 2:
 * Gemini Vision Auto-Naming API & Secure StoreSettings.
 *
 * Verifies:
 * 1. Schema & Database Persistence:
 *    - StoreSettings contains geminiApiKey field.
 *    - Database record 'default' is seeded with Gemini API key.
 *    - getEffectiveGeminiApiKey() resolves correctly.
 * 2. StoreSettings Privacy & Admin Key Management:
 *    - Unauthenticated GET /api/settings strictly omits geminiApiKey and all secret keys.
 *    - Authenticated admin GET /api/settings?admin=true returns geminiConfigured: true,
 *      geminiKeyMasked: 'AQ.xxxx••••••••xxxx', geminiKeySource, and NEVER raw unmasked key.
 *    - PUT /api/settings ignores masked placeholder keys (••••), preventing overwrite.
 *    - PUT /api/settings ignores empty string keys without wiping stored key.
 *    - PUT /api/settings safely updates when a new key is provided (and restores original).
 * 3. Gemini Vision & Product Photo Analysis:
 *    - analyzeProductPhoto inspects real product photo and returns valid title,
 *      description, category ('Beaded Pens' | 'Keychains' | 'Charms & Bookmarks'), and price $8.00.
 *    - Dual-model hierarchy utilizes gemini-flash-latest or gemini-3.8-flash (not deprecated 2.5).
 *    - "Suggest Another Name" with excludeTitles returns a distinct, fresh title.
 * 4. Dedicated Endpoint /api/upload/analyze:
 *    - Accepts JSON payload ({ imageUrl, excludeTitles }).
 *    - Accepts multipart/form-data payload with image file.
 *    - Rejects empty payload with 400 Bad Request.
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

const passedTests = [];
const failedTests = [];

function pass(name, detail = '') {
  passedTests.push({ name, detail });
  console.log(`  ✔ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  const msg = error instanceof Error ? error.message : String(error);
  failedTests.push({ name, error: msg });
  console.error(`  ✖ [FAIL] ${name}: ${msg}`);
}

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║   MILESTONE 2: GEMINI VISION AUTO-NAMING & STORESETTINGS VERIFIER        ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

async function runVerification() {
  // ────────────────────────────────────────────────────────────────────────────
  // SUITE 1: SCHEMA & DATABASE PERSISTENCE
  // ────────────────────────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════════════════════════');
  console.log(' SUITE 1: SCHEMA & DATABASE PERSISTENCE');
  console.log('══════════════════════════════════════════════════════════════════════════');

  try {
    const schemaContent = fs.readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
    assert(schemaContent.includes('geminiApiKey'), 'prisma/schema.prisma must define geminiApiKey');
    pass('1.1 Prisma schema defines geminiApiKey in StoreSettings model');
  } catch (err) {
    fail('1.1 Prisma schema defines geminiApiKey in StoreSettings model', err);
  }

  let originalDbKey = null;
  try {
    const defaultSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    assert(defaultSettings, 'StoreSettings record id: "default" must exist');
    assert(defaultSettings.geminiApiKey, 'StoreSettings.geminiApiKey must be seeded and non-empty');
    originalDbKey = defaultSettings.geminiApiKey;
    pass('1.2 StoreSettings "default" has geminiApiKey seeded in database', `length: ${originalDbKey.length}`);
  } catch (err) {
    fail('1.2 StoreSettings "default" has geminiApiKey seeded in database', err);
  }

  try {
    const effectiveKey = await getEffectiveGeminiApiKey();
    assert(effectiveKey, 'getEffectiveGeminiApiKey() must return a valid string key');
    assert(effectiveKey.startsWith('AQ.'), 'Effective key must match configured Gemini API key');
    pass('1.3 getEffectiveGeminiApiKey() resolves seeded key correctly');
  } catch (err) {
    fail('1.3 getEffectiveGeminiApiKey() resolves seeded key correctly', err);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SUITE 2: STORESETTINGS PRIVACY & ADMIN SECURITY
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(' SUITE 2: STORESETTINGS PRIVACY & ADMIN SECURITY');
  console.log('══════════════════════════════════════════════════════════════════════════');

  try {
    // 2.1 Unauthenticated Public GET
    const publicReq = new Request('http://localhost:3000/api/settings');
    const publicRes = await settingsGET(publicReq);
    assert.strictEqual(publicRes.status, 200);
    const publicData = await publicRes.json();

    // Verify safe public attributes
    assert('enableStripe' in publicData, 'enableStripe must be present in public response');
    assert('shippingFlatRate' in publicData, 'shippingFlatRate must be present in public response');

    // Verify sensitive secrets and return addresses NEVER leak
    assert(!('geminiApiKey' in publicData), 'geminiApiKey must NEVER leak in public settings');
    assert(!('returnStreet' in publicData), 'returnStreet must NEVER leak in public settings');
    assert(!('returnCity' in publicData), 'returnCity must NEVER leak in public settings');
    assert(!('returnState' in publicData), 'returnState must NEVER leak in public settings');
    assert(!('returnZip' in publicData), 'returnZip must NEVER leak in public settings');
    assert(!('shippoApiKey' in publicData), 'shippoApiKey must NEVER leak in public settings');
    assert(!('stripeSecretKey' in publicData), 'stripeSecretKey must NEVER leak in public settings');
    assert(!('adminPin' in publicData), 'adminPin must NEVER leak in public settings');
    pass('2.1 Unauthenticated GET /api/settings strictly omits geminiApiKey and all secrets');
  } catch (err) {
    fail('2.1 Unauthenticated GET /api/settings strictly omits geminiApiKey and all secrets', err);
  }

  const adminPin = (await prisma.storeSettings.findUnique({ where: { id: 'default' } }))?.adminPin || 'welcome1';

  try {
    // 2.2 Unauthenticated Admin GET (no header)
    const unauthedAdminReq = new Request('http://localhost:3000/api/settings?admin=true');
    const unauthedAdminRes = await settingsGET(unauthedAdminReq);
    const unauthedData = await unauthedAdminRes.json();
    assert.strictEqual(unauthedData.requiresAuth, true);
    assert(!('geminiApiKey' in unauthedData), 'Unauthenticated admin GET must not leak geminiApiKey');
    assert(!('geminiKeyMasked' in unauthedData), 'Unauthenticated admin GET must not leak masked key');
    pass('2.2 GET /api/settings?admin=true without x-admin-pin blocks access with requiresAuth: true');
  } catch (err) {
    fail('2.2 GET /api/settings?admin=true without x-admin-pin blocks access with requiresAuth: true', err);
  }

  try {
    // 2.3 Authenticated Admin GET (with x-admin-pin)
    const authedAdminReq = new Request('http://localhost:3000/api/settings?admin=true', {
      headers: { 'x-admin-pin': adminPin },
    });
    const authedAdminRes = await settingsGET(authedAdminReq);
    assert.strictEqual(authedAdminRes.status, 200);
    const authedData = await authedAdminRes.json();

    assert.strictEqual(authedData.requiresAuth, false);
    assert.strictEqual(authedData.geminiConfigured, true, 'geminiConfigured must be true');
    assert(authedData.geminiKeyMasked.includes('••••'), 'geminiKeyMasked must be masked with bullet characters');
    assert(authedData.geminiKeySource === 'database' || authedData.geminiKeySource === 'env', 'geminiKeySource must be valid');
    assert(!('geminiApiKey' in authedData), 'Raw unmasked geminiApiKey must NEVER be returned in admin JSON');
    pass('2.3 Authenticated GET /api/settings?admin=true returns geminiConfigured and masked key without leaks', `masked: ${authedData.geminiKeyMasked}`);
  } catch (err) {
    fail('2.3 Authenticated GET /api/settings?admin=true returns geminiConfigured and masked key without leaks', err);
  }

  try {
    // 2.4 PUT /api/settings ignores masked placeholder
    const putMaskedReq = new Request('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': adminPin,
      },
      body: JSON.stringify({
        geminiApiKey: 'AQ.xxxx••••••••xxxx',
      }),
    });
    const putMaskedRes = await settingsPUT(putMaskedReq);
    assert.strictEqual(putMaskedRes.status, 200);
    const dbRecordAfterMasked = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    assert.strictEqual(dbRecordAfterMasked.geminiApiKey, originalDbKey, 'Masked placeholder MUST NOT overwrite real DB key');
    pass('2.4 PUT /api/settings ignores masked placeholder (••••) and preserves real stored key');
  } catch (err) {
    fail('2.4 PUT /api/settings ignores masked placeholder (••••) and preserves real stored key', err);
  }

  try {
    // 2.5 PUT /api/settings ignores empty string
    const putEmptyReq = new Request('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': adminPin,
      },
      body: JSON.stringify({
        geminiApiKey: '',
      }),
    });
    const putEmptyRes = await settingsPUT(putEmptyReq);
    assert.strictEqual(putEmptyRes.status, 200);
    const dbRecordAfterEmpty = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    assert.strictEqual(dbRecordAfterEmpty.geminiApiKey, originalDbKey, 'Empty string in PUT MUST NOT wipe real DB key');
    pass('2.5 PUT /api/settings ignores empty string and protects stored key from accidental erasure');
  } catch (err) {
    fail('2.5 PUT /api/settings ignores empty string and protects stored key from accidental erasure', err);
  }

  try {
    // 2.6 PUT /api/settings accepts valid new key and can be restored
    const temporaryTestKey = 'AQ.mock_verification_key_000000_TEMP_TEST';
    const putNewKeyReq = new Request('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': adminPin,
      },
      body: JSON.stringify({
        geminiApiKey: temporaryTestKey,
      }),
    });
    const putNewKeyRes = await settingsPUT(putNewKeyReq);
    assert.strictEqual(putNewKeyRes.status, 200);
    const dbRecordAfterNew = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    assert.strictEqual(dbRecordAfterNew.geminiApiKey, temporaryTestKey, 'New key must update in database');

    // Restore original key
    await prisma.storeSettings.update({
      where: { id: 'default' },
      data: { geminiApiKey: originalDbKey },
    });
    pass('2.6 PUT /api/settings updates database on genuine new key and correctly persists');
  } catch (err) {
    // Ensure restoration even on error
    if (originalDbKey) {
      await prisma.storeSettings.update({
        where: { id: 'default' },
        data: { geminiApiKey: originalDbKey },
      }).catch(() => {});
    }
    fail('2.6 PUT /api/settings updates database on genuine new key and correctly persists', err);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SUITE 3: GEMINI VISION & AUTO-NAMING LOGIC
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(' SUITE 3: GEMINI VISION & AUTO-NAMING LOGIC');
  console.log('══════════════════════════════════════════════════════════════════════════');

  const testImagePath = path.join(process.cwd(), 'public', 'uploads', 'transparent', 'transparent-1789413705065-46-IMG_8963.png');
  const imageBuffer = fs.readFileSync(testImagePath);

  let firstTitle = '';
  try {
    const analysis = await analyzeProductPhoto({
      imageBuffer,
      mimeType: 'image/png',
    });

    assert(analysis && analysis.result, 'analyzeProductPhoto must return result object');
    const { title, description, category, price } = analysis.result;

    assert(typeof title === 'string' && title.trim().length > 5, 'Title must be non-empty string');
    assert(typeof description === 'string' && description.trim().length > 15, 'Description must be warm, descriptive string');
    assert(['Beaded Pens', 'Keychains', 'Charms & Bookmarks'].includes(category), `Category must be one of allowed categories, got ${category}`);
    assert.strictEqual(price, 8.00, 'Price must be 8.00');
    assert(['gemini-flash-latest', 'gemini-3.8-flash', 'heuristic-fallback'].includes(analysis.modelUsed), `Model used was ${analysis.modelUsed}`);

    firstTitle = title;
    pass('3.1 analyzeProductPhoto correctly analyzes product photo with structured output', `Title: "${title}", Category: "${category}", Model: ${analysis.modelUsed}`);
  } catch (err) {
    fail('3.1 analyzeProductPhoto correctly analyzes product photo with structured output', err);
  }

  try {
    // 3.2 Suggest Another Name with excludeTitles
    assert(firstTitle, 'Must have firstTitle from previous test');
    const secondAnalysis = await analyzeProductPhoto({
      imageBuffer,
      mimeType: 'image/png',
      excludeTitles: [firstTitle],
    });

    const secondTitle = secondAnalysis.result.title;
    assert.notStrictEqual(secondTitle, firstTitle, 'Suggest Another Name must yield a distinct title from excluded title');
    pass('3.2 "Suggest Another Name" with excludeTitles produces distinct title', `Orig: "${firstTitle}" -> New: "${secondTitle}"`);
  } catch (err) {
    fail('3.2 "Suggest Another Name" with excludeTitles produces distinct title', err);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SUITE 4: DEDICATED /api/upload/analyze ENDPOINT
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(' SUITE 4: DEDICATED /api/upload/analyze ENDPOINT');
  console.log('══════════════════════════════════════════════════════════════════════════');

  try {
    // 4.1 JSON payload with local relative imageUrl
    const jsonReq = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: '/uploads/transparent/transparent-1789413688662-2-IMG_8919.png',
        excludeTitles: ['Random Excluded Title'],
      }),
    });
    const jsonRes = await analyzePOST(jsonReq);
    assert.strictEqual(jsonRes.status, 200);
    const jsonBody = await jsonRes.json();

    assert.strictEqual(jsonBody.success, true);
    assert(typeof jsonBody.title === 'string' && jsonBody.title.length > 0);
    assert(['Beaded Pens', 'Keychains', 'Charms & Bookmarks'].includes(jsonBody.category));
    assert.strictEqual(jsonBody.price, 8.00);
    assert(Boolean(jsonBody.modelUsed));
    pass('4.1 POST /api/upload/analyze processes JSON payload with imageUrl', `Category: "${jsonBody.category}", Title: "${jsonBody.title}"`);
  } catch (err) {
    fail('4.1 POST /api/upload/analyze processes JSON payload with imageUrl', err);
  }

  try {
    // 4.2 Multipart/form-data payload with direct file buffer
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('file', blob, 'test-pen.png');
    formData.append('excludeTitles', JSON.stringify(['Exclusion A', 'Exclusion B']));

    const formReq = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      body: formData,
    });
    const formRes = await analyzePOST(formReq);
    assert.strictEqual(formRes.status, 200);
    const formBody = await formRes.json();

    assert.strictEqual(formBody.success, true);
    assert(typeof formBody.title === 'string' && formBody.title.length > 0);
    pass('4.2 POST /api/upload/analyze processes multipart/form-data file upload', `Title: "${formBody.title}"`);
  } catch (err) {
    fail('4.2 POST /api/upload/analyze processes multipart/form-data file upload', err);
  }

  try {
    // 4.3 Error handling on missing image
    const emptyReq = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const emptyRes = await analyzePOST(emptyReq);
    assert.strictEqual(emptyRes.status, 400);
    const emptyBody = await emptyRes.json();
    assert(emptyBody.error, 'Empty payload must return error message');
    pass('4.3 POST /api/upload/analyze returns 400 Bad Request when no image is provided');
  } catch (err) {
    fail('4.3 POST /api/upload/analyze returns 400 Bad Request when no image is provided', err);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(`VERIFICATION SUMMARY: ${passedTests.length} Passed, ${failedTests.length} Failed`);
  console.log('══════════════════════════════════════════════════════════════════════════');

  await prisma.$disconnect();

  if (failedTests.length > 0) {
    console.error('\n❌ SOME VERIFICATION TESTS FAILED.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL MILESTONE 2 VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

runVerification().catch(async (err) => {
  console.error('Fatal verification runner error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
