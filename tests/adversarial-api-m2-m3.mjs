#!/usr/bin/env node
/**
 * tests/adversarial-api-m2-m3.mjs
 *
 * Independent Empirical Adversarial Challenger Test Suite
 * Milestone M2 & M3: Unauthenticated API Attack Suite & Anti-Spoofing Hardening
 *
 * Coverage:
 * 1. Unauthenticated & Wrong-PIN attacks against all 12 protected routes (100% HTTP 401)
 * 2. PATCH /api/checkout anti-spoofing attacks (fake sessionId, fake orderId, unpaid session)
 * 3. GET /api/settings secret leakage probing (0 secrets leaked in public / unauthorized responses)
 * 4. Authenticated admin access verification with valid PIN
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Auto-respawn with test loader if executed directly via node
const isLoadedWithLoader = process.execArgv.some(a => a.includes('test-loader.mjs'));
if (!isLoadedWithLoader) {
  const result = spawnSync(process.execPath, [
    '--loader',
    './scripts/test-loader.mjs',
    fileURLToPath(import.meta.url),
    ...process.argv.slice(2),
  ], { stdio: 'inherit', env: process.env });
  process.exit(result.status ?? 0);
}

import assert from 'node:assert';
import process from 'node:process';
import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const { default: prisma } = await import('../src/lib/prisma.ts');
const { verifyAdminPin, getRequiredAdminPin } = await import('../src/lib/auth/adminAuth.ts');

// Import all 12 route handlers under test
const { GET: ordersGET, PATCH: ordersPATCH, DELETE: ordersDELETE } = await import('../src/app/api/orders/route.ts');
const { POST: labelPOST } = await import('../src/app/api/orders/label/route.ts');
const { GET: productsGET, POST: productsPOST } = await import('../src/app/api/products/route.ts');
const { PUT: productPUT, PATCH: productPATCH, DELETE: productDELETE } = await import('../src/app/api/products/[id]/route.ts');
const { POST: uploadPOST } = await import('../src/app/api/upload/route.ts');
const { POST: analyzePOST } = await import('../src/app/api/upload/analyze/route.ts');
const { GET: settingsGET, PUT: settingsPUT, POST: settingsPOST } = await import('../src/app/api/settings/route.ts');
const { POST: testStripePOST } = await import('../src/app/api/settings/test-stripe/route.ts');
const { GET: testShippoGET, POST: testShippoPOST } = await import('../src/app/api/settings/test-shippo/route.ts');
const { POST: autopilotPOST, GET: autopilotGET } = await import('../src/app/api/studio/autopilot/route.ts');
const { GET: metricsGET } = await import('../src/app/api/studio/metrics/route.ts');
const { PATCH: checkoutPATCH, POST: checkoutPOST } = await import('../src/app/api/checkout/route.ts');

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
};

function recordTest(name, passed, detail = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`  [PASS] ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    results.failed++;
    results.failures.push({ name, detail });
    console.error(`  [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  }
}

async function runAdversarialSuite() {
  console.log('======================================================================');
  console.log('⚔️  ADVERSARIAL CHALLENGER SUITE: MILESTONE M2 & M3');
  console.log('    1. Unauthenticated API Attack Suite (12 Protected Routes)');
  console.log('    2. PATCH /api/checkout Anti-Spoofing & Zero Paid/Label Guarantee');
  console.log('    3. GET /api/settings Secret Exposure Probe');
  console.log('======================================================================\n');

  const configuredPin = await getRequiredAdminPin();
  const validPin = configuredPin || 'welcome1';
  console.log(`[*] Target admin PIN configured: ${validPin.slice(0, 2)}*** (${validPin.length} chars)\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 1: Adversarial Attacks Against All 12 Protected Route Endpoints
  // Target: 100% of unauthorized attacks MUST return HTTP 401
  // ──────────────────────────────────────────────────────────────────────────
  console.log('----------------------------------------------------------------------');
  console.log('SECTION 1: Adversarial Attack Suite Against 12 Protected Routes');
  console.log('----------------------------------------------------------------------');

  const attackVectors = [
    { label: 'Missing Header', headers: {} },
    { label: 'Empty PIN Header', headers: { 'x-admin-pin': '' } },
    { label: 'Whitespace PIN Header', headers: { 'x-admin-pin': '   ' } },
    { label: 'Wrong PIN', headers: { 'x-admin-pin': 'attacker_wrong_guess_999' } },
    { label: 'Prefix Substring PIN', headers: { 'x-admin-pin': validPin.slice(0, Math.max(1, validPin.length - 2)) } },
    { label: 'PIN with Appended Garbage', headers: { 'x-admin-pin': `${validPin}_malicious` } },
    { label: 'SQL Injection Payload', headers: { 'x-admin-pin': "' OR '1'='1' --" } },
    { label: 'XSS / Script Tag Injection', headers: { 'x-admin-pin': `${validPin}<script>alert(1)</script>` } },
    { label: 'URL-Encoded Null Byte', headers: { 'x-admin-pin': `${validPin}%00admin` } },
    { label: 'Special Symbols & Punctuation', headers: { 'x-admin-pin': '!@#$%^&*()_+~{}|:<>?' } },
  ];

  // Helper dummy multipart upload body
  function makeDummyUploadFormData() {
    const fd = new FormData();
    fd.append('file', new Blob(['fake image bytes'], { type: 'image/png' }), 'test.png');
    return fd;
  }

  // 1.1 Route 1: /api/orders (GET, PATCH, DELETE)
  for (const v of attackVectors) {
    // GET
    const resGet = await ordersGET(new Request('http://localhost:3000/api/orders', { headers: v.headers }));
    recordTest(`GET /api/orders blocked [${v.label}]`, resGet.status === 401, `status=${resGet.status}`);

    // PATCH
    const resPatch = await ordersPATCH(new Request('http://localhost:3000/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify({ id: 'fake_order_id', paymentStatus: 'paid' }),
    }));
    recordTest(`PATCH /api/orders blocked [${v.label}]`, resPatch.status === 401, `status=${resPatch.status}`);

    // DELETE
    const resDel = await ordersDELETE(new Request('http://localhost:3000/api/orders?id=fake_order_id', {
      method: 'DELETE',
      headers: v.headers,
    }));
    recordTest(`DELETE /api/orders blocked [${v.label}]`, resDel.status === 401, `status=${resDel.status}`);
  }

  // 1.2 Route 2: /api/orders/label (POST)
  for (const v of attackVectors) {
    const res = await labelPOST(new Request('http://localhost:3000/api/orders/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify({ orderId: 'fake_order_id' }),
    }));
    recordTest(`POST /api/orders/label blocked [${v.label}]`, res.status === 401, `status=${res.status}`);
  }

  // 1.3 Route 3: /api/products (POST) - (GET is public storefront catalog)
  for (const v of attackVectors) {
    const res = await productsPOST(new Request('http://localhost:3000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify({ title: 'Adversarial Product', price: 99.99 }),
    }));
    recordTest(`POST /api/products blocked [${v.label}]`, res.status === 401, `status=${res.status}`);
  }

  // 1.4 Route 4: /api/products/[id] (PUT, PATCH, DELETE)
  for (const v of attackVectors) {
    // PUT
    const resPut = await productPUT(new Request('http://localhost:3000/api/products/fake_id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify({ title: 'Hacked Product' }),
    }), { params: { id: 'fake_id' } });
    recordTest(`PUT /api/products/[id] blocked [${v.label}]`, resPut.status === 401, `status=${resPut.status}`);

    // PATCH
    const resPatch = await productPATCH(new Request('http://localhost:3000/api/products/fake_id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify({ price: 0.01 }),
    }), { params: { id: 'fake_id' } });
    recordTest(`PATCH /api/products/[id] blocked [${v.label}]`, resPatch.status === 401, `status=${resPatch.status}`);

    // DELETE
    const resDel = await productDELETE(new Request('http://localhost:3000/api/products/fake_id', {
      method: 'DELETE',
      headers: v.headers,
    }), { params: { id: 'fake_id' } });
    recordTest(`DELETE /api/products/[id] blocked [${v.label}]`, resDel.status === 401, `status=${resDel.status}`);
  }

  // 1.5 Route 5: /api/upload (POST)
  for (const v of attackVectors) {
    const res = await uploadPOST(new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: v.headers,
      body: makeDummyUploadFormData(),
    }));
    recordTest(`POST /api/upload blocked [${v.label}]`, res.status === 401, `status=${res.status}`);
  }

  // 1.6 Route 6: /api/upload/analyze (POST)
  for (const v of attackVectors) {
    const res = await analyzePOST(new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify({ imageUrl: 'https://example.com/fake.png' }),
    }));
    recordTest(`POST /api/upload/analyze blocked [${v.label}]`, res.status === 401, `status=${res.status}`);
  }

  // 1.7 Route 7: /api/settings (GET ?admin=true, PUT, POST)
  for (const v of attackVectors) {
    // GET ?admin=true
    const resGet = await settingsGET(new Request('http://localhost:3000/api/settings?admin=true', { headers: v.headers }));
    recordTest(`GET /api/settings?admin=true blocked [${v.label}]`, resGet.status === 401, `status=${resGet.status}`);

    // PUT
    const resPut = await settingsPUT(new Request('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify({ returnStreet: 'Evil Street 666' }),
    }));
    recordTest(`PUT /api/settings blocked [${v.label}]`, resPut.status === 401, `status=${resPut.status}`);

    // POST
    const resPost = await settingsPOST(new Request('http://localhost:3000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify({ returnStreet: 'Evil Street 666' }),
    }));
    recordTest(`POST /api/settings blocked [${v.label}]`, resPost.status === 401, `status=${resPost.status}`);
  }

  // Additional settings attack: verifyPin in body with invalid values
  const bodyPinAttacks = [
    { label: 'body.verifyPin wrong string', body: { verifyPin: 'wrong_pin_val' } },
    { label: 'body.verifyPin empty string', body: { verifyPin: '' } },
    { label: 'body.verifyPin object injection', body: { verifyPin: { $ne: null } } },
    { label: 'body.verifyPin boolean true', body: { verifyPin: true } },
  ];
  for (const b of bodyPinAttacks) {
    const resPut = await settingsPUT(new Request('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b.body),
    }));
    recordTest(`PUT /api/settings blocked [${b.label}]`, resPut.status === 401, `status=${resPut.status}`);
  }

  // 1.8 Route 8: /api/settings/test-stripe (POST)
  for (const v of attackVectors) {
    const res = await testStripePOST(new Request('http://localhost:3000/api/settings/test-stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify({ stripeSecretKey: 'sk_test_fake_key' }),
    }));
    recordTest(`POST /api/settings/test-stripe blocked [${v.label}]`, res.status === 401, `status=${res.status}`);
  }

  // 1.9 Route 9: /api/settings/test-shippo (GET, POST)
  for (const v of attackVectors) {
    // GET
    const resGet = await testShippoGET(new Request('http://localhost:3000/api/settings/test-shippo', { headers: v.headers }));
    recordTest(`GET /api/settings/test-shippo blocked [${v.label}]`, resGet.status === 401, `status=${resGet.status}`);

    // POST
    const resPost = await testShippoPOST(new Request('http://localhost:3000/api/settings/test-shippo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify({ shippoApiKey: 'shippo_test_fake' }),
    }));
    recordTest(`POST /api/settings/test-shippo blocked [${v.label}]`, resPost.status === 401, `status=${resPost.status}`);
  }

  // 1.10 Route 10: /api/studio/autopilot (POST) - (GET is public queue state)
  for (const v of attackVectors) {
    const res = await autopilotPOST(new Request('http://localhost:3000/api/studio/autopilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify({ mode: 'dry_run' }),
    }));
    recordTest(`POST /api/studio/autopilot blocked [${v.label}]`, res.status === 401, `status=${res.status}`);
  }

  // 1.11 Route 11: /api/studio/metrics (GET ?refresh=1) - (GET without refresh=1 is public cached)
  for (const v of attackVectors) {
    const res = await metricsGET(new Request('http://localhost:3000/api/studio/metrics?refresh=1', { headers: v.headers }));
    recordTest(`GET /api/studio/metrics?refresh=1 blocked [${v.label}]`, res.status === 401, `status=${res.status}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 2: PATCH /api/checkout Anti-Spoofing & Zero Paid/Label Guarantee
  // Target: Reject fake session, fake orderId, unpaid session (400/401)
  // Verify 0 orders marked paid and 0 Shippo labels generated
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n----------------------------------------------------------------------');
  console.log('SECTION 2: PATCH /api/checkout Anti-Spoofing Verification');
  console.log('----------------------------------------------------------------------');

  // Create an empirical test order in pending status
  const testOrder = await prisma.order.create({
    data: {
      customerName: 'Adversarial Challenger Test',
      customerEmail: 'adversarial-challenger@example.com',
      shippingAddress: '789 Defense Way, Testing, NY 10001 (US)',
      paymentMethod: 'stripe',
      paymentStatus: 'pending',
      itemsJson: JSON.stringify([{ id: 'test_item', title: 'Test Item', price: 8.0, quantity: 1 }]),
      subtotal: 8.0,
      shippingCost: 5.5,
      total: 13.5,
      labelPrinted: false,
      trackingNumber: null,
      labelUrl: null,
    },
  });

  console.log(`[*] Created temporary test order: ${testOrder.id}`);

  try {
    // Attack 2.1: Request with missing sessionId
    const resNoSession = await checkoutPATCH(new Request('http://localhost:3000/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: testOrder.id }),
    }));
    recordTest(
      'PATCH /api/checkout without sessionId rejected with 400',
      resNoSession.status === 400,
      `status=${resNoSession.status}`
    );

    // Attack 2.2: Request with empty string sessionId
    const resEmptySession = await checkoutPATCH(new Request('http://localhost:3000/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: testOrder.id, sessionId: '' }),
    }));
    recordTest(
      'PATCH /api/checkout with empty sessionId rejected with 400',
      resEmptySession.status === 400,
      `status=${resEmptySession.status}`
    );

    // Attack 2.3: Request with whitespace sessionId
    const resWhitespaceSession = await checkoutPATCH(new Request('http://localhost:3000/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: testOrder.id, sessionId: '     ' }),
    }));
    recordTest(
      'PATCH /api/checkout with whitespace sessionId rejected with 400',
      resWhitespaceSession.status === 400,
      `status=${resWhitespaceSession.status}`
    );

    // Attack 2.4: Request with non-string sessionId (number)
    const resNumberSession = await checkoutPATCH(new Request('http://localhost:3000/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: testOrder.id, sessionId: 987654 }),
    }));
    recordTest(
      'PATCH /api/checkout with non-string sessionId rejected with 400',
      resNumberSession.status === 400,
      `status=${resNumberSession.status}`
    );

    // Attack 2.5: Request with fake sessionId ('cs_fake_adversarial_token')
    const resFakeSession = await checkoutPATCH(new Request('http://localhost:3000/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: testOrder.id, sessionId: 'cs_fake_adversarial_token' }),
    }));
    recordTest(
      'PATCH /api/checkout with fake sessionId rejected with 400',
      resFakeSession.status === 400,
      `status=${resFakeSession.status}`
    );

    // Attack 2.6: Fake orderId with fake sessionId
    const resFakeOrderAndSession = await checkoutPATCH(new Request('http://localhost:3000/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'completely_nonexistent_order_id', sessionId: 'cs_fake_token_xyz' }),
    }));
    recordTest(
      'PATCH /api/checkout with fake orderId and fake sessionId rejected with 400',
      resFakeOrderAndSession.status === 400,
      `status=${resFakeOrderAndSession.status}`
    );

    // Attack 2.7: Missing orderId with fake sessionId
    const resNoOrderFakeSession = await checkoutPATCH(new Request('http://localhost:3000/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'cs_fake_token_xyz' }),
    }));
    recordTest(
      'PATCH /api/checkout with no orderId and fake sessionId rejected with 400',
      resNoOrderFakeSession.status === 400,
      `status=${resNoOrderFakeSession.status}`
    );

    // Dynamic mock testing on Stripe Sessions prototype
    const dummyStripe = new Stripe('sk_test_dummy');
    const sessionProto = Object.getPrototypeOf(dummyStripe.checkout.sessions);
    const originalRetrieve = sessionProto.retrieve;

    try {
      // Attack 2.8: Unpaid Stripe session (payment_status: 'unpaid')
      sessionProto.retrieve = async function(id) {
        return {
          id,
          payment_status: 'unpaid',
          client_reference_id: testOrder.id,
        };
      };

      const resUnpaidSession = await checkoutPATCH(new Request('http://localhost:3000/api/checkout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: testOrder.id, sessionId: 'cs_test_mocked_unpaid' }),
      }));
      recordTest(
        'PATCH /api/checkout with unpaid Stripe session rejected with 400',
        resUnpaidSession.status === 400,
        `status=${resUnpaidSession.status}`
      );

      // Attack 2.9: Mismatched client_reference_id
      sessionProto.retrieve = async function(id) {
        return {
          id,
          payment_status: 'paid',
          client_reference_id: 'different_victim_order_id',
        };
      };

      const resMismatchedOrder = await checkoutPATCH(new Request('http://localhost:3000/api/checkout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: testOrder.id, sessionId: 'cs_test_mocked_mismatched' }),
      }));
      recordTest(
        'PATCH /api/checkout with mismatched client_reference_id rejected with 400',
        resMismatchedOrder.status === 400,
        `status=${resMismatchedOrder.status}`
      );

      // Attack 2.10: Hijacking attempt when order already has a different stripeSessionId
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { stripeSessionId: 'cs_original_session_abc' },
      });

      sessionProto.retrieve = async function(id) {
        return {
          id: 'cs_different_session_hijack',
          payment_status: 'paid',
          client_reference_id: testOrder.id,
        };
      };

      const resHijack = await checkoutPATCH(new Request('http://localhost:3000/api/checkout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: testOrder.id, sessionId: 'cs_different_session_hijack' }),
      }));
      recordTest(
        'PATCH /api/checkout cross-session hijacking rejected with 400',
        resHijack.status === 400,
        `status=${resHijack.status}`
      );

      // Reset testOrder stripeSessionId back to null for remaining assertions
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { stripeSessionId: null },
      });

    } finally {
      sessionProto.retrieve = originalRetrieve;
    }

    // Verify DB integrity: Test order must STILL be pending, un-paid, and with zero shipping labels
    const refreshedOrder = await prisma.order.findUnique({
      where: { id: testOrder.id },
    });

    recordTest(
      'DB Invariant: Test order remains strictly paymentStatus=pending',
      refreshedOrder?.paymentStatus === 'pending',
      `paymentStatus=${refreshedOrder?.paymentStatus}`
    );

    recordTest(
      'DB Invariant: Zero Shippo labels generated (labelPrinted remains false)',
      refreshedOrder?.labelPrinted === false,
      `labelPrinted=${refreshedOrder?.labelPrinted}`
    );

    recordTest(
      'DB Invariant: Zero tracking numbers created (trackingNumber is null)',
      refreshedOrder?.trackingNumber === null,
      `trackingNumber=${refreshedOrder?.trackingNumber}`
    );

    recordTest(
      'DB Invariant: Zero labelUrl created (labelUrl is null)',
      refreshedOrder?.labelUrl === null,
      `labelUrl=${refreshedOrder?.labelUrl}`
    );

    // Verify across the entire database: No orders were mutated to paid by our attacks
    const anySpoofedPaid = await prisma.order.findFirst({
      where: { customerEmail: 'adversarial-challenger@example.com', paymentStatus: 'paid' },
    });
    recordTest(
      'Global Guarantee: Exactly zero orders marked paid across all attacks',
      anySpoofedPaid === null,
      `found=${Boolean(anySpoofedPaid)}`
    );

  } finally {
    // Clean up temporary order
    await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {});
    console.log(`[*] Cleaned up temporary test order: ${testOrder.id}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 3: Deep Secret Leakage Probes on GET /api/settings
  // Target: 0 secrets leaked across all public and unauthorized requests
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n----------------------------------------------------------------------');
  console.log('SECTION 3: Deep Secret Leakage Probes on GET /api/settings');
  console.log('----------------------------------------------------------------------');

  const secretFieldNames = [
    'stripeSecretKey',
    'shippoApiKey',
    'geminiApiKey',
    'adminPin',
    'returnStreet',
    'returnCity',
    'returnState',
    'returnZip',
    'shippoReturnAddress',
  ];

  // 3.1 Public Storefront Request (no query params)
  const resPublic1 = await settingsGET(new Request('http://localhost:3000/api/settings'));
  const bodyPublic1 = await resPublic1.json();

  recordTest('Public GET /api/settings returns HTTP 200', resPublic1.status === 200, `status=${resPublic1.status}`);

  let leakedPublic1 = 0;
  for (const field of secretFieldNames) {
    if (field in bodyPublic1 && bodyPublic1[field] !== undefined && bodyPublic1[field] !== null) {
      leakedPublic1++;
      console.error(`    [!] LEAK DETECTED in Public GET /api/settings: ${field} = ${JSON.stringify(bodyPublic1[field])}`);
    }
  }
  recordTest('Public GET /api/settings leaks ZERO secrets (0 of 9 fields)', leakedPublic1 === 0, `leakedCount=${leakedPublic1}`);

  // Confirm legitimate public fields are present
  recordTest(
    'Public GET /api/settings includes required public storefront fields',
    'shippingFlatRate' in bodyPublic1 && 'freeShippingThreshold' in bodyPublic1 && 'enableStripe' in bodyPublic1,
    `keys=${Object.keys(bodyPublic1).join(', ')}`
  );

  // 3.2 Public Request with ?admin=false
  const resPublic2 = await settingsGET(new Request('http://localhost:3000/api/settings?admin=false'));
  const bodyPublic2 = await resPublic2.json();
  let leakedPublic2 = 0;
  for (const field of secretFieldNames) {
    if (field in bodyPublic2 && bodyPublic2[field] !== undefined && bodyPublic2[field] !== null) {
      leakedPublic2++;
    }
  }
  recordTest('GET /api/settings?admin=false leaks ZERO secrets', resPublic2.status === 200 && leakedPublic2 === 0);

  // 3.3 Unauthorized probe: GET /api/settings?admin=true with no header
  const resAdminUnauth = await settingsGET(new Request('http://localhost:3000/api/settings?admin=true'));
  const bodyAdminUnauth = await resAdminUnauth.json();
  recordTest('GET /api/settings?admin=true (no header) returns HTTP 401', resAdminUnauth.status === 401);

  let leakedAdminUnauth = 0;
  for (const field of secretFieldNames) {
    if (field in bodyAdminUnauth && bodyAdminUnauth[field] !== undefined && bodyAdminUnauth[field] !== null) {
      leakedAdminUnauth++;
    }
  }
  recordTest('GET /api/settings?admin=true (no header) leaks ZERO secrets', leakedAdminUnauth === 0);

  // 3.4 Unauthorized probe: GET /api/settings?admin=true with wrong PIN
  const resAdminWrong = await settingsGET(new Request('http://localhost:3000/api/settings?admin=true', {
    headers: { 'x-admin-pin': 'wrong_pin_attack' },
  }));
  const bodyAdminWrong = await resAdminWrong.json();
  recordTest('GET /api/settings?admin=true (wrong PIN) returns HTTP 401', resAdminWrong.status === 401);
  let leakedAdminWrong = 0;
  for (const field of secretFieldNames) {
    if (field in bodyAdminWrong && bodyAdminWrong[field] !== undefined && bodyAdminWrong[field] !== null) {
      leakedAdminWrong++;
    }
  }
  recordTest('GET /api/settings?admin=true (wrong PIN) leaks ZERO secrets', leakedAdminWrong === 0);

  // 3.5 URL Parameter Injection Probes: Ensure PIN passed in query string does NOT grant auth
  const urlParamAttacks = [
    'http://localhost:3000/api/settings?admin=true&adminPin=' + encodeURIComponent(validPin),
    'http://localhost:3000/api/settings?admin=true&pin=' + encodeURIComponent(validPin),
    'http://localhost:3000/api/settings?admin=true&x-admin-pin=' + encodeURIComponent(validPin),
  ];
  for (const url of urlParamAttacks) {
    const resUrlParam = await settingsGET(new Request(url));
    recordTest(
      `URL query parameter PIN probe blocked (returns 401): ${url.split('?')[1]}`,
      resUrlParam.status === 401,
      `status=${resUrlParam.status}`
    );
  }

  // 3.6 Authenticated Admin Request (Valid PIN Header): Verify sensitive API keys are MASKED
  const resAdminAuth = await settingsGET(new Request('http://localhost:3000/api/settings?admin=true', {
    headers: { 'x-admin-pin': validPin },
  }));
  const bodyAdminAuth = await resAdminAuth.json();
  recordTest('Authenticated GET /api/settings?admin=true returns HTTP 200', resAdminAuth.status === 200);

  // Verify that raw secrets are never returned in plaintext even to authenticated admin
  recordTest(
    'Admin authenticated response omits raw stripeSecretKey',
    !('stripeSecretKey' in bodyAdminAuth) || bodyAdminAuth.stripeSecretKey === undefined
  );
  recordTest(
    'Admin authenticated response omits raw shippoApiKey',
    !('shippoApiKey' in bodyAdminAuth) || bodyAdminAuth.shippoApiKey === undefined
  );
  recordTest(
    'Admin authenticated response omits raw geminiApiKey',
    !('geminiApiKey' in bodyAdminAuth) || bodyAdminAuth.geminiApiKey === undefined
  );
  recordTest(
    'Admin authenticated response omits raw adminPin',
    !('adminPin' in bodyAdminAuth) || bodyAdminAuth.adminPin === undefined
  );

  // If masked keys are present, verify they contain bullet mask characters '••••'
  if (bodyAdminAuth.stripeSecretKeyMasked) {
    recordTest(
      'stripeSecretKeyMasked is properly masked',
      bodyAdminAuth.stripeSecretKeyMasked.includes('••••'),
      `value=${bodyAdminAuth.stripeSecretKeyMasked}`
    );
  }
  if (bodyAdminAuth.shippoKeyMasked) {
    recordTest(
      'shippoKeyMasked is properly masked',
      bodyAdminAuth.shippoKeyMasked.includes('••••'),
      `value=${bodyAdminAuth.shippoKeyMasked}`
    );
  }
  if (bodyAdminAuth.geminiKeyMasked) {
    recordTest(
      'geminiKeyMasked is properly masked',
      bodyAdminAuth.geminiKeyMasked.includes('••••'),
      `value=${bodyAdminAuth.geminiKeyMasked}`
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 4: Final Summary & Invariant Verdict
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log('⚔️  ADVERSARIAL TEST RESULTS SUMMARY');
  console.log(`    Total Adversarial Probes: ${results.total}`);
  console.log(`    Passed:                   ${results.passed}`);
  console.log(`    Failed:                   ${results.failed}`);
  console.log('======================================================================');

  if (results.failed > 0) {
    console.error('\n❌ FAILURES DETECTED:');
    for (const f of results.failures) {
      console.error(`  - ${f.name} (${f.detail})`);
    }
    process.exit(1);
  } else {
    console.log('\n🎉 ALL ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS RATE.');
    console.log('    Verdict: APPROVE');
  }
}

runAdversarialSuite().catch((err) => {
  console.error('Fatal unhandled error in adversarial test suite:', err);
  process.exit(1);
});
