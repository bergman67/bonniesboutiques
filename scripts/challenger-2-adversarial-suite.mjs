#!/usr/bin/env node
/**
 * scripts/challenger-2-adversarial-suite.mjs
 *
 * Empirical Challenger 2 Adversarial Test Suite
 * Objective: Find bugs, security vulnerabilities, edge-case failures, and catalog inconsistencies.
 *
 * Scope:
 * 1. Security & Privacy Attacks on GET /api/settings
 * 2. Shippo Address Book Fallback Verification
 * 3. Catalog Integrity & File System Verification (96 products)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();

import { resolveReturnAddress, parseShippingAddress } from '../src/lib/shipping.ts';
import { GET as settingsGET, PUT as settingsPUT } from '../src/app/api/settings/route.ts';
import { POST as testShippoPOST, GET as testShippoGET } from '../src/app/api/settings/test-shippo/route.ts';
import prismaModule from '../src/lib/prisma.ts';
const prisma = prismaModule.storeSettings ? prismaModule : (prismaModule.default || prismaModule.prisma);

const SENSITIVE_FIELDS = [
  'returnStreet',
  'returnCity',
  'returnState',
  'returnZip',
  'returnName',
  'shippoApiKey',
  'shippoKeyMasked',
  'stripeSecretKey',
  'stripeSecretKeyMasked',
  'adminPin',
  'adminPinConfigured',
  'activeAddressSource',
  'shippoReturnAddress',
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const findings = [];

function recordTest(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${desc}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✖ [FAIL] ${desc}: ${err.message}`);
    findings.push({ test: desc, error: err.message });
  }
}

async function recordTestAsync(desc, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${desc}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✖ [FAIL] ${desc}: ${err.message}`);
    findings.push({ test: desc, error: err.message });
  }
}

async function runSuite() {
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       CHALLENGER 2: ADVERSARIAL PRIVACY, SHIPPO & CATALOG SUITE          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  const initialSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  const realAdminPin = initialSettings?.adminPin || process.env.ADMIN_PASSWORD || 'welcome1';

  // ══════════════════════════════════════════════════════════════════════════
  // OBJECTIVE 1: SECURITY & PRIVACY ATTACKS ON /api/settings & test-shippo
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n─── SECTION 1: Settings API Privacy & Authentication Attacks ───');

  // Ensure DB has sensitive return address populated to test leakage under real data
  await prisma.storeSettings.update({
    where: { id: 'default' },
    data: {
      returnStreet: '123 Classified Grandma Lane',
      returnCity: 'Secret City',
      returnState: 'OH',
      returnZip: '44101',
      returnName: "Bonnie's Private Residence",
    },
  });

  try {
    // 1.1 Plain GET /api/settings without ?admin=true
    await recordTestAsync('1.1 Plain GET /api/settings omits ALL sensitive fields even when DB is populated', async () => {
      const req = new Request('http://localhost:3000/api/settings');
      const res = await settingsGET(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      for (const field of SENSITIVE_FIELDS) {
        assert(!(field in data), `Privacy Leak: Field '${field}' was exposed in public response! Value: ${JSON.stringify(data[field])}`);
      }
      assert.strictEqual(data.enableStripe, true);
      assert.strictEqual(typeof data.shippingFlatRate, 'number');
      assert.strictEqual(typeof data.freeShippingThreshold, 'number');
    });

    // 1.2 Variations of admin parameter that must NOT trigger admin mode
    const spoofParams = ['admin=false', 'admin=0', 'admin=TRUE', 'admin=True', 'admin=yes', 'admin=true%20', 'admin=1', 'is_admin=true'];
    for (const p of spoofParams) {
      await recordTestAsync(`1.2 Query spoof GET /api/settings?${p} does not trigger admin mode`, async () => {
        const req = new Request(`http://localhost:3000/api/settings?${p}`);
        const res = await settingsGET(req);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        for (const field of SENSITIVE_FIELDS) {
          assert(!(field in data), `Privacy Leak on ?${p}: Field '${field}' was exposed!`);
        }
      });
    }

    // 1.3 Sending x-admin-pin header on public request (without ?admin=true)
    await recordTestAsync('1.3 Public request with x-admin-pin header returns only public data', async () => {
      const req = new Request('http://localhost:3000/api/settings', {
        headers: { 'x-admin-pin': realAdminPin },
      });
      const res = await settingsGET(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      for (const field of SENSITIVE_FIELDS) {
        assert(!(field in data), `Field '${field}' leaked when ?admin=true was missing!`);
      }
    });

    // 1.4 Query param PIN attack: GET /api/settings?admin=true&pin=<correct_pin> without header
    await recordTestAsync('1.4 Query param attack ?admin=true&pin=<correct_pin> is REJECTED without header', async () => {
      const req = new Request(`http://localhost:3000/api/settings?admin=true&pin=${encodeURIComponent(realAdminPin)}`);
      const res = await settingsGET(req);
      const data = await res.json();

      assert.strictEqual(data.requiresAuth, true, 'Must return requiresAuth: true');
      for (const field of SENSITIVE_FIELDS) {
        assert(!(field in data), `Privacy Leak in URL attack: Field '${field}' was exposed!`);
      }
    });

    // 1.5 Other query param pin attacks
    const queryAttacks = ['x-admin-pin', 'adminPin', 'password', 'key', 'auth'];
    for (const q of queryAttacks) {
      await recordTestAsync(`1.5 Query param attack ?admin=true&${q}=${realAdminPin} is rejected`, async () => {
        const req = new Request(`http://localhost:3000/api/settings?admin=true&${q}=${encodeURIComponent(realAdminPin)}`);
        const res = await settingsGET(req);
        const data = await res.json();
        assert.strictEqual(data.requiresAuth, true);
        for (const field of SENSITIVE_FIELDS) {
          assert(!(field in data), `Privacy leak on ?${q}: Field '${field}' was exposed!`);
        }
      });
    }

    // 1.6 Header attacks on GET /api/settings?admin=true
    const headerAttacks = [
      { name: 'Empty PIN header', headers: { 'x-admin-pin': '' } },
      { name: 'Whitespace PIN header', headers: { 'x-admin-pin': '   ' } },
      { name: 'Wrong PIN', headers: { 'x-admin-pin': 'completely_wrong_pin' } },
      { name: 'SQL Injection in PIN header', headers: { 'x-admin-pin': "' OR '1'='1" } },
      { name: 'Null byte in PIN header', headers: { 'x-admin-pin': `${realAdminPin}\x00extra` } },
      { name: 'Case mismatch in PIN value', headers: { 'x-admin-pin': realAdminPin.toUpperCase() } },
    ];

    for (const att of headerAttacks) {
      await recordTestAsync(`1.6 Header attack [${att.name}] rejects and protects sensitive data`, async () => {
        let req;
        try {
          req = new Request('http://localhost:3000/api/settings?admin=true', {
            headers: att.headers,
          });
        } catch (headerErr) {
          // Blocked at the HTTP/WHATWG protocol layer (e.g. invalid header character/null byte)
          assert(headerErr instanceof TypeError || String(headerErr).includes('invalid header'), `Unexpected header error: ${headerErr.message}`);
          return; // Successfully rejected at the HTTP protocol parser!
        }
        const res = await settingsGET(req);
        const data = await res.json();
        assert.strictEqual(data.requiresAuth, true, `Expected requiresAuth: true for ${att.name}`);
        for (const field of SENSITIVE_FIELDS) {
          assert(!(field in data), `Privacy leak on ${att.name}: Field '${field}' was exposed!`);
        }
      });
    }

    // 1.7 Valid PIN in header grants admin access
    await recordTestAsync('1.7 Valid x-admin-pin header grants admin access with return address', async () => {
      const req = new Request('http://localhost:3000/api/settings?admin=true', {
        headers: { 'x-admin-pin': realAdminPin },
      });
      const res = await settingsGET(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.requiresAuth, false);
      assert.strictEqual(data.hasAdminPin, true);
      assert.strictEqual(data.adminPinConfigured, true);
      assert.strictEqual(data.returnStreet, '123 Classified Grandma Lane');
      assert.strictEqual(data.activeAddressSource, 'admin_settings');
      // Verify raw secrets are never returned, only masked
      assert(!('stripeSecretKey' in data) || data.stripeSecretKey === undefined, 'Raw stripeSecretKey must never be returned');
      assert('stripeSecretKeyMasked' in data, 'stripeSecretKeyMasked must be present');
    });

    // 1.8 Unconfigured DB state: PIN is null
    await recordTestAsync('1.8 Unconfigured PIN state NEVER emits physical address or secrets', async () => {
      // Temporarily remove adminPin
      await prisma.storeSettings.update({
        where: { id: 'default' },
        data: { adminPin: null },
      });

      try {
        const req = new Request('http://localhost:3000/api/settings?admin=true');
        const res = await settingsGET(req);
        const data = await res.json();

        assert.strictEqual(data.hasAdminPin, false);
        assert.strictEqual(data.requiresAuth, false);
        // CRITICAL CHECK: returnStreet must NEVER be emitted
        assert(!('returnStreet' in data), 'VULNERABILITY: returnStreet was leaked in unconfigured state!');
        assert(!('returnCity' in data), 'VULNERABILITY: returnCity was leaked in unconfigured state!');
        assert(!('returnState' in data), 'VULNERABILITY: returnState was leaked in unconfigured state!');
        assert(!('returnZip' in data), 'VULNERABILITY: returnZip was leaked in unconfigured state!');
        assert(!('stripeSecretKey' in data), 'VULNERABILITY: stripeSecretKey leaked in unconfigured state!');
        assert(!('shippoApiKey' in data), 'VULNERABILITY: shippoApiKey leaked in unconfigured state!');
      } finally {
        // Restore adminPin
        await prisma.storeSettings.update({
          where: { id: 'default' },
          data: { adminPin: realAdminPin },
        });
      }
    });

    // 1.9 POST /api/settings/test-shippo unauthorized attacks
    await recordTestAsync('1.9 POST /api/settings/test-shippo without x-admin-pin returns 401 Unauthorized', async () => {
      const req = new Request('http://localhost:3000/api/settings/test-shippo', {
        method: 'POST',
        body: JSON.stringify({ shippoApiKey: 'shippo_test_123' }),
      });
      const res = await testShippoPOST(req);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.ok, false);
    });

    await recordTestAsync('1.10 POST /api/settings/test-shippo with wrong PIN returns 401', async () => {
      const req = new Request('http://localhost:3000/api/settings/test-shippo', {
        method: 'POST',
        headers: { 'x-admin-pin': 'wrong_pin' },
        body: JSON.stringify({ shippoApiKey: 'shippo_test_123' }),
      });
      const res = await testShippoPOST(req);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.ok, false);
    });

    await recordTestAsync('1.11 POST /api/settings/test-shippo with PIN in query param returns 401', async () => {
      const req = new Request(`http://localhost:3000/api/settings/test-shippo?pin=${encodeURIComponent(realAdminPin)}`, {
        method: 'POST',
        body: JSON.stringify({ shippoApiKey: 'shippo_test_123' }),
      });
      const res = await testShippoPOST(req);
      assert.strictEqual(res.status, 401);
    });

    await recordTestAsync('1.12 POST /api/settings/test-shippo with PIN in body returns 401', async () => {
      const req = new Request('http://localhost:3000/api/settings/test-shippo', {
        method: 'POST',
        body: JSON.stringify({ adminPin: realAdminPin, verifyPin: realAdminPin, shippoApiKey: 'shippo_test_123' }),
      });
      const res = await testShippoPOST(req);
      assert.strictEqual(res.status, 401);
    });

    await recordTestAsync('1.13 GET /api/settings/test-shippo without x-admin-pin returns 401', async () => {
      const req = new Request('http://localhost:3000/api/settings/test-shippo');
      const res = await testShippoGET(req);
      assert.strictEqual(res.status, 401);
    });

    await recordTestAsync('1.14 test-shippo under unconfigured PIN state returns 401', async () => {
      await prisma.storeSettings.update({
        where: { id: 'default' },
        data: { adminPin: null },
      });
      try {
        const req = new Request('http://localhost:3000/api/settings/test-shippo', {
          method: 'POST',
          body: JSON.stringify({ shippoApiKey: 'test' }),
        });
        const res = await testShippoPOST(req);
        assert.strictEqual(res.status, 401);
        const data = await res.json();
        assert.strictEqual(data.ok, false);
      } finally {
        await prisma.storeSettings.update({
          where: { id: 'default' },
          data: { adminPin: realAdminPin },
        });
      }
    });

    // 1.15 PUT /api/settings unauthorized attacks
    await recordTestAsync('1.15 PUT /api/settings without x-admin-pin or with wrong PIN returns 401 or 403', async () => {
      const unauthedReq = new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ returnStreet: 'Hacked Address' }),
      });
      const unauthedRes = await settingsPUT(unauthedReq);
      assert.ok([401, 403].includes(unauthedRes.status), `Expected 401 or 403, got ${unauthedRes.status}`);

      const wrongPinReq = new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: { 'x-admin-pin': 'wrong_pin_xyz' },
        body: JSON.stringify({ returnStreet: 'Hacked Address' }),
      });
      const wrongPinRes = await settingsPUT(wrongPinReq);
      assert.ok([401, 403].includes(wrongPinRes.status), `Expected 401 or 403, got ${wrongPinRes.status}`);
    });
  } finally {
    // Restore original DB settings
    await prisma.storeSettings.update({
      where: { id: 'default' },
      data: {
        returnStreet: initialSettings?.returnStreet || null,
        returnCity: initialSettings?.returnCity || null,
        returnState: initialSettings?.returnState || null,
        returnZip: initialSettings?.returnZip || null,
        returnName: initialSettings?.returnName || "Bonnie's Boutique",
        adminPin: realAdminPin,
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OBJECTIVE 2: SHIPPO ADDRESS BOOK FALLBACK VERIFICATION
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n─── SECTION 2: Shippo Address Book Fallback Verification ───');

  // Condition A: returnStreet populated in settings
  await recordTestAsync('2.1 Condition A: returnStreet populated in settings -> activeAddressSource is admin_settings', async () => {
    const res = await resolveReturnAddress({
      returnName: 'Bonnie Direct',
      returnStreet: '100 Craft Street',
      returnCity: 'Columbus',
      returnState: 'OH',
      returnZip: '43215',
      shippoApiKey: 'shippo_test_token_ignored',
    });
    assert.strictEqual(res.activeAddressSource, 'admin_settings');
    assert.strictEqual(res.address.street1, '100 Craft Street');
    assert.strictEqual(res.address.city, 'Columbus');
    assert.strictEqual(res.address.state, 'OH');
    assert.strictEqual(res.address.zip, '43215');
    assert.strictEqual(res.address.name, 'Bonnie Direct');
  });

  // Condition B: returnStreet empty, valid Shippo token -> fetches Shippo address book
  await recordTestAsync('2.2 Condition B: returnStreet empty, valid Shippo token -> activeAddressSource is shippo_address_book', async () => {
    const origFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).includes('https://api.goshippo.com/addresses/')) {
          return {
            ok: true,
            json: async () => ({
              results: [
                {
                  name: 'Shippo Saved Warehouse',
                  street1: '500 Logistics Way',
                  city: 'Akron',
                  state: 'OH',
                  zip: '44301',
                  country: 'US',
                },
              ],
            }),
          };
        }
        return origFetch(url, options);
      };

      const res = await resolveReturnAddress(
        { returnStreet: '', returnCity: '', returnState: '', returnZip: '' },
        'shippo_live_mock_token'
      );
      assert.strictEqual(res.activeAddressSource, 'shippo_address_book');
      assert.strictEqual(res.address.street1, '500 Logistics Way');
      assert.strictEqual(res.address.city, 'Akron');
      assert.strictEqual(res.address.state, 'OH');
      assert.strictEqual(res.address.zip, '44301');
      assert.strictEqual(res.address.name, 'Shippo Saved Warehouse');
    } finally {
      global.fetch = origFetch;
    }
  });

  // Condition B Stress: Shippo returns incomplete addresses first, finds first valid complete address
  await recordTestAsync('2.3 Condition B Stress: Skips partial addresses missing state or zip and picks first complete', async () => {
    const origFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).includes('https://api.goshippo.com/addresses/')) {
          return {
            ok: true,
            json: async () => ({
              results: [
                { name: 'Incomplete 1', street1: '123 Bad St', city: 'Nowhere', state: '', zip: '' },
                { name: 'Incomplete 2', street1: '', city: 'NoStreet', state: 'OH', zip: '44101' },
                { name: 'Complete Target', street1: '999 Valid Ave', city: 'Dayton', state: 'OH', zip: '45402', country: 'US' },
              ],
            }),
          };
        }
        return origFetch(url, options);
      };

      const res = await resolveReturnAddress({ returnStreet: null }, 'shippo_test_mock');
      assert.strictEqual(res.activeAddressSource, 'shippo_address_book');
      assert.strictEqual(res.address.street1, '999 Valid Ave');
      assert.strictEqual(res.address.city, 'Dayton');
    } finally {
      global.fetch = origFetch;
    }
  });

  // Condition C: returnStreet empty, no token or empty address book -> falls back safely
  await recordTestAsync('2.4 Condition C1: returnStreet empty, no Shippo token -> activeAddressSource is none', async () => {
    const res = await resolveReturnAddress({ returnStreet: '', shippoApiKey: '' }, '');
    assert.strictEqual(res.activeAddressSource, 'none');
    assert.strictEqual(res.address.street1, '');
    assert.strictEqual(res.address.name, "Bonnie's Boutique");
  });

  await recordTestAsync('2.5 Condition C2: returnStreet empty, Shippo returns empty results [] -> activeAddressSource is none', async () => {
    const origFetch = global.fetch;
    try {
      global.fetch = async () => ({
        ok: true,
        json: async () => ({ results: [] }),
      });
      const res = await resolveReturnAddress({ returnStreet: '' }, 'shippo_token');
      assert.strictEqual(res.activeAddressSource, 'none');
      assert.strictEqual(res.address.street1, '');
    } finally {
      global.fetch = origFetch;
    }
  });

  await recordTestAsync('2.6 Condition C3: returnStreet empty, Shippo API returns 401/500 -> activeAddressSource is none without throwing', async () => {
    const origFetch = global.fetch;
    try {
      global.fetch = async () => ({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid token' }),
      });
      const res = await resolveReturnAddress({ returnStreet: '' }, 'shippo_token');
      assert.strictEqual(res.activeAddressSource, 'none');
      assert.strictEqual(res.address.street1, '');
    } finally {
      global.fetch = origFetch;
    }
  });

  await recordTestAsync('2.7 Condition C4: returnStreet empty, fetch throws network error -> handles gracefully without crash', async () => {
    const origFetch = global.fetch;
    try {
      global.fetch = async () => {
        throw new Error('Network timeout socket hang up');
      };
      const res = await resolveReturnAddress({ returnStreet: '' }, 'shippo_token');
      assert.strictEqual(res.activeAddressSource, 'none');
      assert.strictEqual(res.address.street1, '');
    } finally {
      global.fetch = origFetch;
    }
  });

  await recordTestAsync('2.8 Whitespace-only returnStreet ("   ") is treated as empty and falls back safely', async () => {
    const res = await resolveReturnAddress({ returnStreet: '   ', shippoApiKey: '' }, '');
    assert.strictEqual(res.activeAddressSource, 'none');
    assert.strictEqual(res.address.street1, '');
  });

  await recordTestAsync('2.9 Malformed Shippo address results (null/non-string fields) do not crash resolver', async () => {
    const origFetch = global.fetch;
    try {
      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          results: [
            null,
            {},
            { street1: 12345, city: null, state: false, zip: {} },
            { street1: 'Valid Street', city: 'Valid City', state: 'OH', zip: '44101', country: 'US' },
          ],
        }),
      });
      const res = await resolveReturnAddress({ returnStreet: '' }, 'mock_token');
      assert.strictEqual(res.activeAddressSource, 'shippo_address_book');
      assert.strictEqual(res.address.street1, 'Valid Street');
      assert.strictEqual(res.address.city, 'Valid City');
    } finally {
      global.fetch = origFetch;
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // OBJECTIVE 3: CATALOG INTEGRITY & FILE SYSTEM VERIFICATION
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n─── SECTION 3: Catalog Integrity & File System Verification (96 Products) ───');

  const manifestPath = path.resolve('src/lib/scrollytelling/productAssetManifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const dbProducts = await prisma.product.findMany();

  // 3.1 Total count checks
  recordTest('3.1 Manifest totalProducts and products array length are exactly 96', () => {
    assert.strictEqual(manifest.totalProducts, 96);
    assert.strictEqual(manifest.products.length, 96);
  });

  recordTest('3.2 Database contains exactly 96 products', () => {
    assert.strictEqual(dbProducts.length, 96);
  });

  recordTest('3.3 Database product IDs match manifest IDs 1-to-1 (exact bijection)', () => {
    const manifestIds = new Set(manifest.products.map(p => p.id));
    const dbIds = new Set(dbProducts.map(p => p.id));
    assert.strictEqual(manifestIds.size, 96, 'All manifest IDs must be distinct');
    assert.strictEqual(dbIds.size, 96, 'All DB IDs must be distinct');

    const missingInDb = manifest.products.filter(p => !dbIds.has(p.id));
    const missingInManifest = dbProducts.filter(p => !manifestIds.has(p.id));

    assert.strictEqual(missingInDb.length, 0, `Products in manifest missing in DB: ${JSON.stringify(missingInDb)}`);
    assert.strictEqual(missingInManifest.length, 0, `Products in DB missing in manifest: ${JSON.stringify(missingInManifest)}`);
  });

  // 3.4 Discrepancy analysis between DB and manifest
  recordTest('3.4 Catalog cross-check: titles, prices, and image URLs', () => {
    const manifestMap = new Map(manifest.products.map(p => [p.id, p]));
    const titleDiscrepancies = [];
    const priceDiscrepancies = [];
    const imageDiscrepancies = [];

    for (const dbp of dbProducts) {
      const mp = manifestMap.get(dbp.id);
      if (dbp.title !== mp.title) {
        titleDiscrepancies.push({ id: dbp.id, dbTitle: dbp.title, manifestTitle: mp.title });
      }
      if (dbp.price !== mp.price) {
        priceDiscrepancies.push({ id: dbp.id, dbPrice: dbp.price, manifestPrice: mp.price });
      }
      const expectedImg = mp.transparentUrl || mp.transparentCloudUrl;
      if (dbp.imageUrl !== expectedImg) {
        imageDiscrepancies.push({ id: dbp.id, dbImage: dbp.imageUrl, manifestImage: expectedImg });
      }
    }

    console.log(`    ℹ Title discrepancies: ${titleDiscrepancies.length}`);
    if (titleDiscrepancies.length > 0) {
      console.log(`      ${JSON.stringify(titleDiscrepancies)}`);
    }
    console.log(`    ℹ Price discrepancies: ${priceDiscrepancies.length}`);
    if (priceDiscrepancies.length > 0) {
      console.log(`      ${JSON.stringify(priceDiscrepancies)}`);
    }
    console.log(`    ℹ Image URL discrepancies: ${imageDiscrepancies.length}`);

    assert.strictEqual(imageDiscrepancies.length, 0, 'Image URLs must match 100%');
    // Notice: 1 title discrepancy is known (refinement in TEST_READY.md)
    assert(titleDiscrepancies.length <= 1, `Unexpected title discrepancies: ${JSON.stringify(titleDiscrepancies)}`);
  });

  // 3.5 Disk verification: All 96 images exist on disk and are valid PNGs
  recordTest('3.5 All 96 transparent PNG files exist on disk with valid magic bytes and dimensions', () => {
    const pngMagic = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    let missingFiles = 0;
    let corruptedFiles = 0;
    let zeroByteFiles = 0;

    for (const p of manifest.products) {
      const filename = p.filename || p.localPath.split(/[\\/]/).pop();
      const diskPath = path.resolve('public', 'uploads', 'transparent', filename);

      if (!fs.existsSync(diskPath)) {
        console.error(`    ✖ Missing file on disk: ${diskPath}`);
        missingFiles++;
        continue;
      }

      const stat = fs.statSync(diskPath);
      if (stat.size === 0) {
        console.error(`    ✖ Zero-byte empty file: ${diskPath}`);
        zeroByteFiles++;
        continue;
      }

      const buf = fs.readFileSync(diskPath);
      if (buf.length < 24 || !buf.subarray(0, 8).equals(pngMagic)) {
        console.error(`    ✖ Invalid PNG magic bytes: ${diskPath}`);
        corruptedFiles++;
        continue;
      }

      // Check PNG IHDR chunk
      const chunkType = buf.toString('ascii', 12, 16);
      if (chunkType !== 'IHDR') {
        console.error(`    ✖ Missing IHDR chunk in PNG: ${diskPath}`);
        corruptedFiles++;
        continue;
      }

      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      if (width === 0 || height === 0) {
        console.error(`    ✖ Invalid image dimensions ${width}x${height} in ${diskPath}`);
        corruptedFiles++;
      }
    }

    assert.strictEqual(missingFiles, 0, `Found ${missingFiles} missing image files on disk`);
    assert.strictEqual(zeroByteFiles, 0, `Found ${zeroByteFiles} zero-byte empty image files`);
    assert.strictEqual(corruptedFiles, 0, `Found ${corruptedFiles} corrupted PNG files`);
  });

  // 3.6 Leftover framed art check
  recordTest('3.6 Zero framed art items in database or manifest (case-insensitive "frame")', () => {
    const dbFramed = dbProducts.filter(p => {
      const t = (p.title || '').toLowerCase();
      const d = (p.description || '').toLowerCase();
      return t.includes('framed') || t.includes('frame') || d.includes('framed art') || d.includes('frame');
    });

    const manifestFramed = manifest.products.filter(p => {
      const t = (p.title || '').toLowerCase();
      const d = (p.description || '').toLowerCase();
      return t.includes('framed') || t.includes('frame') || d.includes('framed art') || d.includes('frame');
    });

    assert.strictEqual(dbFramed.length, 0, `Found ${dbFramed.length} framed art items in DB: ${JSON.stringify(dbFramed.map(p => p.title))}`);
    assert.strictEqual(manifestFramed.length, 0, `Found ${manifestFramed.length} framed art items in manifest: ${JSON.stringify(manifestFramed.map(p => p.title))}`);
  });

  // 3.7 Duplicate image URL check
  recordTest('3.7 Zero duplicate image URLs across database and manifest', () => {
    const dbUrls = dbProducts.map(p => p.imageUrl);
    const dbUrlSet = new Set(dbUrls);
    assert.strictEqual(dbUrlSet.size, 96, `Duplicate image URLs in DB! Found ${dbUrlSet.size} unique out of 96`);

    const manifestUrls = manifest.products.map(p => p.transparentUrl || p.transparentCloudUrl);
    const manifestUrlSet = new Set(manifestUrls);
    assert.strictEqual(manifestUrlSet.size, 96, `Duplicate image URLs in manifest! Found ${manifestUrlSet.size} unique out of 96`);

    const manifestFilenames = manifest.products.map(p => p.filename);
    const manifestFilenameSet = new Set(manifestFilenames);
    assert.strictEqual(manifestFilenameSet.size, 96, `Duplicate filenames in manifest! Found ${manifestFilenameSet.size} unique out of 96`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY & VERDICT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(`TEST EXECUTION SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
  console.log('══════════════════════════════════════════════════════════════════════════');

  if (failedTests > 0) {
    console.error(`\n❌ VERDICT: REJECT (${failedTests} tests failed)`);
    process.exit(1);
  } else {
    console.log('\n🎉 VERDICT: APPROVE (100% of adversarial tests passed)');
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('Fatal Suite Exception:', err);
  process.exit(1);
});
