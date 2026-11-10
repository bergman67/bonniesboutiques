#!/usr/bin/env node
/**
 * scripts/test-challenger-m2-storefront-admin-adversarial.mjs
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER TEST HARNESS
 * Milestone M2 & M3: Storefront & Full Regression Suite Verification
 *
 * Roles: critic, specialist
 * Archetype: empirical-challenger
 *
 * Sections:
 * Part 1: Public Customer Storefront Flows (GET /, GET /api/products, POST /api/checkout, GET /api/settings)
 * Part 2: Checkout Anti-Spoofing & Input Boundary Stress Tests
 * Part 3: Authenticated Admin Operations with Valid x-admin-pin (CRUD, Upload, Analyze, Settings, Studio)
 * Part 4: Cryptographic Constant-Time Admin PIN Verification Stress & Edge Cases
 * Part 5: Security Headers & Public Exposure Hardening
 */

import { spawnSync } from 'node:child_process';
import process from 'node:process';

// Auto-respawn with loader if run via standard `node`
if (!process.execArgv.some(arg => arg.includes('test-loader'))) {
  const result = spawnSync(
    process.execPath,
    ['--loader', './scripts/test-loader.mjs', ...process.argv.slice(1)],
    {
      stdio: 'inherit',
      env: process.env,
    }
  );
  process.exit(result.status ?? 0);
}

const { default: assert } = await import('node:assert');
const { default: dotenv } = await import('dotenv');
dotenv.config();

const { default: prisma } = await import('../src/lib/prisma.ts');
const { verifyAdminPin, getRequiredAdminPin, requireAdminAuth } = await import('../src/lib/auth/adminAuth.ts');

// Route Handlers
const { GET: ordersGET } = await import('../src/app/api/orders/route.ts');
const { GET: productsGET, POST: productsPOST } = await import('../src/app/api/products/route.ts');
const { PUT: productPUT, PATCH: productPATCH, DELETE: productDELETE } = await import('../src/app/api/products/[id]/route.ts');
const { POST: uploadPOST } = await import('../src/app/api/upload/route.ts');
const { POST: analyzePOST } = await import('../src/app/api/upload/analyze/route.ts');
const { GET: settingsGET } = await import('../src/app/api/settings/route.ts');
const { POST: testStripePOST } = await import('../src/app/api/settings/test-stripe/route.ts');
const { GET: testShippoGET, POST: testShippoPOST } = await import('../src/app/api/settings/test-shippo/route.ts');
const { POST: autopilotPOST } = await import('../src/app/api/studio/autopilot/route.ts');
const { GET: metricsGET } = await import('../src/app/api/studio/metrics/route.ts');
const { POST: checkoutPOST, PATCH: checkoutPATCH } = await import('../src/app/api/checkout/route.ts');
const { default: nextConfig } = await import('../next.config.mjs');
const fs = await import('node:fs');
const path = await import('node:path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(name, passed, detail = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  }
}

async function run() {
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       EMPIRICAL CHALLENGER: STOREFRONT & ADMIN ADVERSARIAL SUITE        ║');
  console.log('║         Adversarial Stress Testing & Requirement Verification            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  const effectivePin = await getRequiredAdminPin();
  console.log(`Admin PIN configured: ${effectivePin ? 'YES (length ' + effectivePin.length + ')' : 'NO'}`);
  assert(effectivePin, 'Critical: Admin PIN must be configured');

  // ────────────────────────────────────────────────────────────────
  // PART 1: Public Customer Storefront Flows
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('PART 1: Public Customer Storefront Flows (Zero Admin Auth)');
  console.log('============================================================');

  // 1.1 Server-Side Rendered Home Page Invariants (src/app/page.tsx)
  try {
    const pageSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/page.tsx'), 'utf8');
    report('src/app/page.tsx exists and is readable', pageSource.length > 0);
    report('src/app/page.tsx queries products where isDraft: false', pageSource.includes('where: { isDraft: false }'));
    report('src/app/page.tsx contains zero links to /admin', !pageSource.includes('/admin'));

    // Execute the exact query that Home() executes
    const homepageProducts = await prisma.product.findMany({
      where: { isDraft: false },
      orderBy: { createdAt: 'desc' },
    });

    report(
      'Storefront homepage query returns at least 96 published products',
      homepageProducts.length >= 96,
      `count=${homepageProducts.length}`
    );

    const hasAnyDrafts = homepageProducts.some((p) => p.isDraft === true);
    report('Storefront homepage query yields zero draft products', !hasAnyDrafts, `hasDrafts=${hasAnyDrafts}`);

    // Verify Blue Jay Feather Pen is published
    const blueJayPen = homepageProducts.find((p) => p.id === 'cmu1mpkla0007fsjlmke9q0b7');
    report(
      'Blue Jay Feather Pen (cmu1mpkla0007fsjlmke9q0b7) is active in storefront catalog',
      Boolean(blueJayPen && blueJayPen.isDraft !== true),
      `found=${Boolean(blueJayPen)}, isDraft=${blueJayPen?.isDraft}`
    );
  } catch (err) {
    report('Storefront homepage query and audit failed', false, err.message);
  }

  // 1.2 Public GET /api/products
  try {
    const reqPubProducts = new Request('http://localhost:3000/api/products');
    const resPubProducts = await productsGET(reqPubProducts);
    report('GET /api/products returns HTTP 200 without admin header', resPubProducts.status === 200);

    const productsData = await resPubProducts.json();
    report('GET /api/products returns array of products', Array.isArray(productsData) && productsData.length >= 96, `count=${productsData?.length}`);

    // Parameter pollution and SQL injection strings on GET /api/products
    const maliciousUrls = [
      'http://localhost:3000/api/products?admin=true',
      'http://localhost:3000/api/products?isDraft=true',
      'http://localhost:3000/api/products?id=%27%20OR%201=1%20--',
      'http://localhost:3000/api/products?x-admin-pin=invalid',
    ];
    let queryStressPass = true;
    for (const url of maliciousUrls) {
      const res = await productsGET(new Request(url));
      if (res.status !== 200) {
        queryStressPass = false;
        break;
      }
    }
    report('GET /api/products succeeds normally under parameter pollution/injections', queryStressPass);
  } catch (err) {
    report('GET /api/products error', false, err.message);
  }

  // 1.3 Public GET /api/settings
  try {
    const reqPubSettings = new Request('http://localhost:3000/api/settings');
    const resPubSettings = await settingsGET(reqPubSettings);
    report('GET /api/settings returns HTTP 200 without admin header', resPubSettings.status === 200);

    const settingsData = await resPubSettings.json();
    const forbiddenKeys = [
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
    let leakedCount = 0;
    for (const k of forbiddenKeys) {
      if (k in settingsData && settingsData[k] !== undefined) {
        leakedCount++;
      }
    }
    report('GET /api/settings strictly shields all secrets from public customers', leakedCount === 0, `leakedCount=${leakedCount}`);
    report('GET /api/settings returns storefront shipping constants', typeof settingsData.shippingFlatRate === 'number' && typeof settingsData.freeShippingThreshold === 'number');
  } catch (err) {
    report('GET /api/settings error', false, err.message);
  }

  // ────────────────────────────────────────────────────────────────
  // PART 2: Checkout Customer Flows & Anti-Spoofing Stress Tests
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('PART 2: Customer Checkout Creation & Anti-Spoofing Hardening');
  console.log('============================================================');

  let createdOrderIds = [];

  try {
    // 2.1 Customer checkout with subtotal < $25 threshold (standard shipping $5.50)
    const reqSub25 = new Request('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { id: 'item_sub25', title: 'Mini Beaded Charm', price: 10.0, quantity: 2, imageUrl: null }
        ],
        form: {
          firstName: 'Challenger',
          lastName: 'Customer',
          email: 'challenger@customer.test',
          address: '456 Elm St',
          city: 'Austin',
          state: 'TX',
          zip: '78701',
          paymentMethod: 'venmo',
        },
      }),
    });

    const resSub25 = await checkoutPOST(reqSub25);
    report('POST /api/checkout (under threshold) returns HTTP 200 without admin auth', resSub25.status === 200);
    const dataSub25 = await resSub25.json();
    report('POST /api/checkout returns orderId', Boolean(dataSub25?.orderId), `orderId=${dataSub25?.orderId}`);

    if (dataSub25?.orderId) {
      createdOrderIds.push(dataSub25.orderId);
      const dbOrder = await prisma.order.findUnique({ where: { id: dataSub25.orderId } });
      report('Order created in DB with status pending', dbOrder?.paymentStatus === 'pending');
      report('Shipping cost calculated accurately ($5.50)', dbOrder?.shippingCost === 5.50, `shippingCost=${dbOrder?.shippingCost}`);
      report('Order total calculated accurately ($25.50)', dbOrder?.total === 25.50, `total=${dbOrder?.total}`);
    }

    // 2.2 Customer checkout with subtotal >= $25 threshold (free shipping $0.00)
    const reqFreeShip = new Request('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { id: 'item_freeship', title: 'Deluxe Beaded Pen', price: 15.0, quantity: 2, imageUrl: null }
        ],
        form: {
          firstName: 'Free',
          lastName: 'Shipper',
          email: 'freeship@customer.test',
          address: '789 Oak Ave',
          city: 'Seattle',
          state: 'WA',
          zip: '98101',
          paymentMethod: 'paypal',
        },
      }),
    });

    const resFreeShip = await checkoutPOST(reqFreeShip);
    report('POST /api/checkout (free shipping qualification) returns HTTP 200', resFreeShip.status === 200);
    const dataFreeShip = await resFreeShip.json();
    if (dataFreeShip?.orderId) {
      createdOrderIds.push(dataFreeShip.orderId);
      const dbOrder = await prisma.order.findUnique({ where: { id: dataFreeShip.orderId } });
      report('Shipping cost unlocked as $0.00 for qualifying cart', dbOrder?.shippingCost === 0.0, `shippingCost=${dbOrder?.shippingCost}`);
      report('Order total equals subtotal ($30.00)', dbOrder?.total === 30.0, `total=${dbOrder?.total}`);
    }

    // 2.3 Boundary: Customer checkout with empty items array
    const reqEmpty = new Request('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [],
        form: {
          firstName: 'Empty',
          lastName: 'Cart',
          email: 'empty@test.com',
          paymentMethod: 'venmo',
        },
      }),
    });
    const resEmpty = await checkoutPOST(reqEmpty);
    report('POST /api/checkout handles empty cart gracefully without 500 error', resEmpty.status === 200);
    const dataEmpty = await resEmpty.json();
    if (dataEmpty?.orderId) createdOrderIds.push(dataEmpty.orderId);

    // 2.4 Adversarial: Prototype pollution payload in checkout form
    const reqProto = new Request('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: 'proto', title: 'Test', price: 5, quantity: 1, imageUrl: null }],
        form: {
          firstName: 'Proto',
          lastName: 'Test',
          __proto__: { polluter: true },
          paymentMethod: 'venmo',
        },
      }),
    });
    const resProto = await checkoutPOST(reqProto);
    report('POST /api/checkout handles prototype pollution attempt safely', resProto.status === 200);
    const dataProto = await resProto.json();
    if (dataProto?.orderId) createdOrderIds.push(dataProto.orderId);
    report('Object prototype remains unpolluted', ({}).polluter === undefined);

    // 2.5 Anti-Spoofing: Attacker calls PATCH /api/checkout with SQL injection sessionId
    const reqSqlInject = new Request('http://localhost:3000/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: createdOrderIds[0],
        sessionId: "' OR '1'='1' --",
      }),
    });
    const resSqlInject = await checkoutPATCH(reqSqlInject);
    report('PATCH /api/checkout rejects SQL injection sessionId with HTTP 400', resSqlInject.status === 400);

    // 2.6 Anti-Spoofing: Attacker calls PATCH /api/checkout with empty/whitespace sessionId
    const reqWhitespace = new Request('http://localhost:3000/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: createdOrderIds[0],
        sessionId: '   \t  \n  ',
      }),
    });
    const resWhitespace = await checkoutPATCH(reqWhitespace);
    report('PATCH /api/checkout rejects whitespace sessionId with HTTP 400', resWhitespace.status === 400);

    // 2.7 Anti-Spoofing: Verify orders remain in pending status
    for (const orderId of createdOrderIds) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      assert.strictEqual(order?.paymentStatus, 'pending');
    }
    report('All orders strictly remain in pending paymentStatus under adversarial attacks', true);

  } finally {
    // Clean up created test orders
    for (const orderId of createdOrderIds) {
      await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
    }
    console.log(`Cleaned up ${createdOrderIds.length} temporary test orders.`);
  }

  // ────────────────────────────────────────────────────────────────
  // PART 3: Authenticated Admin Operations with Valid x-admin-pin
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('PART 3: Authenticated Admin Operations (with valid x-admin-pin)');
  console.log('============================================================');

  const adminHeaders = {
    'x-admin-pin': effectivePin,
    'Content-Type': 'application/json',
  };

  // 3.1 Admin GET /api/orders
  const reqOrders = new Request('http://localhost:3000/api/orders', {
    headers: { 'x-admin-pin': effectivePin },
  });
  const resOrders = await ordersGET(reqOrders);
  report('Authenticated GET /api/orders returns HTTP 200', resOrders.status === 200);
  const ordersList = await resOrders.json();
  report('Authenticated GET /api/orders returns orders array', Array.isArray(ordersList));

  // 3.2 Admin GET /api/settings?admin=true
  const reqSettingsAdmin = new Request('http://localhost:3000/api/settings?admin=true', {
    headers: { 'x-admin-pin': effectivePin },
  });
  const resSettingsAdmin = await settingsGET(reqSettingsAdmin);
  report('Authenticated GET /api/settings?admin=true returns HTTP 200', resSettingsAdmin.status === 200);
  const settingsAdminData = await resSettingsAdmin.json();
  report('Authenticated GET /api/settings confirms requiresAuth === false', settingsAdminData.requiresAuth === false);

  // 3.3 Admin Product Full Lifecycle: Create -> Update -> Read -> Patch -> Delete
  let testProductId = null;
  try {
    // CREATE
    const reqCreate = new Request('http://localhost:3000/api/products', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'Challenger Automated Test Pen',
        description: 'Empirical adversarial testing bead pen.',
        price: 8.50,
        imageUrl: '/uploads/transparent/challenger-test.png',
        isDraft: true,
      }),
    });
    const resCreate = await productsPOST(reqCreate);
    report('Authenticated POST /api/products returns HTTP 201 Created', resCreate.status === 201);
    const createdProduct = await resCreate.json();
    testProductId = createdProduct?.id;
    report('Product successfully created with ID', Boolean(testProductId), `id=${testProductId}`);

    if (testProductId) {
      // UPDATE (PUT)
      const reqPut = new Request(`http://localhost:3000/api/products/${testProductId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          title: 'Challenger Automated Test Pen (Updated)',
          price: 12.00,
          isDraft: true,
        }),
      });
      const resPut = await productPUT(reqPut, { params: { id: testProductId } });
      report('Authenticated PUT /api/products/[id] returns HTTP 200', resPut.status === 200);
      const updatedProduct = await resPut.json();
      report('Product title updated accurately', updatedProduct?.title === 'Challenger Automated Test Pen (Updated)');

      // PATCH
      const reqPatch = new Request(`http://localhost:3000/api/products/${testProductId}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          price: 15.00,
        }),
      });
      const resPatch = await productPATCH(reqPatch, { params: { id: testProductId } });
      report('Authenticated PATCH /api/products/[id] returns HTTP 200', resPatch.status === 200);

      // DELETE
      const reqDel = new Request(`http://localhost:3000/api/products/${testProductId}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': effectivePin },
      });
      const resDel = await productDELETE(reqDel, { params: { id: testProductId } });
      report('Authenticated DELETE /api/products/[id] returns HTTP 200', resDel.status === 200);

      // Verify deletion from DB
      const dbCheck = await prisma.product.findUnique({ where: { id: testProductId } });
      report('Deleted product confirmed nonexistent in database', dbCheck === null);
      testProductId = null; // Cleaned up
    }
  } finally {
    if (testProductId) {
      await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
    }
  }

  // 3.4 Upload & Analyze Route PIN Gate Check
  // Note: with valid PIN, upload routes should proceed beyond the 401 gate
  const reqUploadNoFile = new Request('http://localhost:3000/api/upload', {
    method: 'POST',
    headers: { 'x-admin-pin': effectivePin },
    body: new FormData(), // empty form data
  });
  const resUpload = await uploadPOST(reqUploadNoFile);
  report('POST /api/upload with valid PIN passes auth gate (not 401)', resUpload.status !== 401, `status=${resUpload.status}`);

  const reqAnalyzeNoFile = new Request('http://localhost:3000/api/upload/analyze', {
    method: 'POST',
    headers: { 'x-admin-pin': effectivePin, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const resAnalyze = await analyzePOST(reqAnalyzeNoFile);
  report('POST /api/upload/analyze with valid PIN passes auth gate (not 401)', resAnalyze.status !== 401, `status=${resAnalyze.status}`);

  // 3.5 Test Stripe & Shippo Endpoints with valid PIN
  const reqTestStripe = new Request('http://localhost:3000/api/settings/test-stripe', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ stripeSecretKey: 'sk_test_fake_key' }),
  });
  const resTestStripe = await testStripePOST(reqTestStripe);
  report('POST /api/settings/test-stripe with valid PIN passes auth gate (not 401)', resTestStripe.status !== 401, `status=${resTestStripe.status}`);

  const reqTestShippo = new Request('http://localhost:3000/api/settings/test-shippo', {
    method: 'GET',
    headers: { 'x-admin-pin': effectivePin },
  });
  const resTestShippo = await testShippoGET(reqTestShippo);
  report('GET /api/settings/test-shippo with valid PIN passes auth gate (not 401)', resTestShippo.status !== 401, `status=${resTestShippo.status}`);

  // ────────────────────────────────────────────────────────────────
  // PART 4: Cryptographic Constant-Time PIN Verification Stress Tests
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('PART 4: Cryptographic Constant-Time PIN Verification Stress');
  console.log('============================================================');

  // 4.1 Exact Match
  report('verifyAdminPin matches exact correct PIN', verifyAdminPin(effectivePin, effectivePin) === true);

  // 4.2 Leading & Trailing Whitespace
  report('verifyAdminPin handles leading and trailing whitespace safely', verifyAdminPin(`  ${effectivePin}  `, effectivePin) === true);

  // 4.3 Case Sensitivity
  const flippedPin = effectivePin.toLowerCase() === effectivePin ? effectivePin.toUpperCase() : effectivePin.toLowerCase();
  if (flippedPin !== effectivePin) {
    report('verifyAdminPin is case sensitive (rejects casing mismatch)', verifyAdminPin(flippedPin, effectivePin) === false);
  } else {
    report('verifyAdminPin is case sensitive (numeric PIN test)', verifyAdminPin(effectivePin + '1', effectivePin) === false);
  }

  // 4.4 Massive Input String (DoS / Buffer overflow / timing attack attempt)
  const hugePin = 'A'.repeat(100_000);
  const startHuge = performance.now();
  const hugeResult = verifyAdminPin(hugePin, effectivePin);
  const elapsedHuge = performance.now() - startHuge;
  report('verifyAdminPin rejects 100k-char string safely and instantly', hugeResult === false && elapsedHuge < 50, `elapsedMs=${elapsedHuge.toFixed(2)}`);

  // 4.5 Edge cases: null, undefined, empty, non-string types
  report('verifyAdminPin rejects null input', verifyAdminPin(null, effectivePin) === false);
  report('verifyAdminPin rejects undefined input', verifyAdminPin(undefined, effectivePin) === false);
  report('verifyAdminPin rejects empty string', verifyAdminPin('', effectivePin) === false);
  report('verifyAdminPin rejects whitespace string', verifyAdminPin('   ', effectivePin) === false);

  // ────────────────────────────────────────────────────────────────
  // PART 5: Security Headers & Production Config Hardening
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('PART 5: HTTP Security Headers in next.config.mjs');
  console.log('============================================================');

  assert(typeof nextConfig.headers === 'function', 'nextConfig must export async headers()');
  const headersRules = await nextConfig.headers();
  const universalRule = headersRules.find((r) => r.source === '/(.*)');
  report('Universal security header rule /(.*) exists', Boolean(universalRule));

  const headersMap = new Map((universalRule?.headers || []).map((h) => [h.key, h.value]));
  report('X-Content-Type-Options: nosniff present', headersMap.get('X-Content-Type-Options') === 'nosniff');
  report('X-Frame-Options: DENY present', headersMap.get('X-Frame-Options') === 'DENY');
  report('Referrer-Policy: strict-origin-when-cross-origin present', headersMap.get('Referrer-Policy') === 'strict-origin-when-cross-origin');
  report('Permissions-Policy configured', headersMap.has('Permissions-Policy'));

  // ────────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log(`EMPIRICAL CHALLENGER SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('============================================================');

  if (failedTests > 0) {
    console.error(`\n❌ VERDICT: REQUEST_CHANGES (${failedTests} test failures detected)`);
    process.exit(1);
  } else {
    console.log('\n🎉 VERDICT: APPROVE (100% of empirical adversarial tests passed)');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
