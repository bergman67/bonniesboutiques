#!/usr/bin/env node
/**
 * scripts/verify-gate-b-api-auth.mjs
 *
 * Comprehensive Gate B Verification Suite:
 * - API Route Authentication across all privileged endpoints (R2)
 * - Anti-Spoofing in PATCH /api/checkout (R2)
 * - Secret Exposure Audit & Public Settings Privacy (R3)
 * - Authenticated Admin Functionality (Gate C)
 * - HTTP Security Headers in next.config.mjs (R3)
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
const { GET: ordersGET, PATCH: ordersPATCH, DELETE: ordersDELETE } = await import('../src/app/api/orders/route.ts');
const { POST: labelPOST } = await import('../src/app/api/orders/label/route.ts');
const { GET: productsGET, POST: productsPOST } = await import('../src/app/api/products/route.ts');
const { PUT: productPUT, PATCH: productPATCH, DELETE: productDELETE } = await import('../src/app/api/products/[id]/route.ts');
const { POST: uploadPOST } = await import('../src/app/api/upload/route.ts');
const { POST: analyzePOST } = await import('../src/app/api/upload/analyze/route.ts');
const { GET: settingsGET, PUT: settingsPUT, POST: settingsPOST } = await import('../src/app/api/settings/route.ts');
const { POST: testStripePOST } = await import('../src/app/api/settings/test-stripe/route.ts');
const { GET: testShippoGET, POST: testShippoPOST } = await import('../src/app/api/settings/test-shippo/route.ts');
const { POST: autopilotPOST } = await import('../src/app/api/studio/autopilot/route.ts');
const { GET: metricsGET } = await import('../src/app/api/studio/metrics/route.ts');
const { PATCH: checkoutPATCH } = await import('../src/app/api/checkout/route.ts');
const { default: nextConfig } = await import('../next.config.mjs');

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

async function runGateBSuite() {
  console.log('============================================================');
  console.log('🔒 BONNIE\'S BOUTIQUE — GATE B API AUTHENTICATION SUITE');
  console.log('Requirements R2 & R3: API Route Auth, Anti-Spoofing & Privacy');
  console.log('============================================================\n');

  const requiredPin = await getRequiredAdminPin();
  const effectivePin = requiredPin || 'welcome1';

  // ────────────────────────────────────────────────────────────────
  // PART 1: Centralized Admin Auth Helper Unit Tests
  // ────────────────────────────────────────────────────────────────
  console.log('============================================================');
  console.log('PART 1: Centralized Auth Helper Unit Tests (verifyAdminPin)');
  console.log('============================================================');

  report(
    'verifyAdminPin matches identical strings',
    verifyAdminPin('welcome1', 'welcome1') === true
  );

  report(
    'verifyAdminPin trims surrounding whitespace before comparing',
    verifyAdminPin('  welcome1  ', 'welcome1') === true
  );

  report(
    'verifyAdminPin rejects mismatched strings',
    verifyAdminPin('wrong_pin', 'welcome1') === false
  );

  report(
    'verifyAdminPin rejects empty or whitespace-only inputs',
    verifyAdminPin('', 'welcome1') === false &&
    verifyAdminPin('   ', 'welcome1') === false &&
    verifyAdminPin('welcome1', '') === false
  );

  report(
    'verifyAdminPin safely handles null and undefined without throwing',
    verifyAdminPin(null, 'welcome1') === false &&
    verifyAdminPin('welcome1', undefined) === false &&
    verifyAdminPin(null, null) === false
  );

  report(
    'verifyAdminPin safely compares different length buffers without RangeError',
    verifyAdminPin('a', 'a'.repeat(256)) === false &&
    verifyAdminPin('short', 'much_longer_string_for_testing') === false
  );

  report(
    'getRequiredAdminPin returns non-empty configured admin password',
    typeof requiredPin === 'string' && requiredPin.length > 0,
    `Resolved PIN: ${requiredPin.slice(0, 3)}***`
  );

  // ────────────────────────────────────────────────────────────────
  // PART 2: Unauthenticated & Bogus PIN Attack Suite (100% Blocked)
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('PART 2: Unauthenticated & Bogus PIN Attack Suite (100% Blocked)');
  console.log('============================================================');

  const attackHeaders = [
    { label: 'Missing Header', headers: {} },
    { label: 'Wrong PIN', headers: { 'x-admin-pin': 'wrong_pin_attack' } },
    { label: 'Empty PIN Header', headers: { 'x-admin-pin': '' } },
    { label: 'Whitespace PIN Header', headers: { 'x-admin-pin': '   ' } },
  ];

  // 2.1 Orders Routes
  for (const attack of attackHeaders) {
    const reqGet = new Request('http://localhost:3000/api/orders', { headers: attack.headers });
    const resGet = await ordersGET(reqGet);
    report(`GET /api/orders blocked [${attack.label}]`, resGet.status === 401, `status=${resGet.status}`);

    const reqPatch = new Request('http://localhost:3000/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...attack.headers },
      body: JSON.stringify({ id: 'fake_order', paymentStatus: 'paid' }),
    });
    const resPatch = await ordersPATCH(reqPatch);
    report(`PATCH /api/orders blocked [${attack.label}]`, resPatch.status === 401, `status=${resPatch.status}`);

    const reqDel = new Request('http://localhost:3000/api/orders?id=fake_order', {
      method: 'DELETE',
      headers: attack.headers,
    });
    const resDel = await ordersDELETE(reqDel);
    report(`DELETE /api/orders blocked [${attack.label}]`, resDel.status === 401, `status=${resDel.status}`);
  }

  // 2.2 Orders Label Route
  for (const attack of attackHeaders) {
    const req = new Request('http://localhost:3000/api/orders/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...attack.headers },
      body: JSON.stringify({ orderId: 'fake_order' }),
    });
    const res = await labelPOST(req);
    report(`POST /api/orders/label blocked [${attack.label}]`, res.status === 401, `status=${res.status}`);
  }

  // 2.3 Products Route (POST) - GET remains public
  for (const attack of attackHeaders) {
    const req = new Request('http://localhost:3000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...attack.headers },
      body: JSON.stringify({ title: 'Hacked Product', price: 0.01 }),
    });
    const res = await productsPOST(req);
    report(`POST /api/products blocked [${attack.label}]`, res.status === 401, `status=${res.status}`);
  }

  // 2.4 Products [id] Routes (PUT, PATCH, DELETE)
  for (const attack of attackHeaders) {
    const reqPut = new Request('http://localhost:3000/api/products/fake_id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...attack.headers },
      body: JSON.stringify({ title: 'Defaced Title', price: 0.01 }),
    });
    const resPut = await productPUT(reqPut, { params: { id: 'fake_id' } });
    report(`PUT /api/products/[id] blocked [${attack.label}]`, resPut.status === 401, `status=${resPut.status}`);

    const reqPatch = new Request('http://localhost:3000/api/products/fake_id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...attack.headers },
      body: JSON.stringify({ price: 0.01 }),
    });
    const resPatch = await productPATCH(reqPatch, { params: { id: 'fake_id' } });
    report(`PATCH /api/products/[id] blocked [${attack.label}]`, resPatch.status === 401, `status=${resPatch.status}`);

    const reqDel = new Request('http://localhost:3000/api/products/fake_id', {
      method: 'DELETE',
      headers: attack.headers,
    });
    const resDel = await productDELETE(reqDel, { params: { id: 'fake_id' } });
    report(`DELETE /api/products/[id] blocked [${attack.label}]`, resDel.status === 401, `status=${resDel.status}`);
  }

  // 2.5 Upload Routes
  for (const attack of attackHeaders) {
    const formData = new FormData();
    formData.append('file', new Blob(['test image bytes'], { type: 'image/png' }), 'test.png');
    const reqUpload = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: attack.headers,
      body: formData,
    });
    const resUpload = await uploadPOST(reqUpload);
    report(`POST /api/upload blocked [${attack.label}]`, resUpload.status === 401, `status=${resUpload.status}`);

    const reqAnalyze = new Request('http://localhost:3000/api/upload/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...attack.headers },
      body: JSON.stringify({ imageUrl: 'https://example.com/photo.png' }),
    });
    const resAnalyze = await analyzePOST(reqAnalyze);
    report(`POST /api/upload/analyze blocked [${attack.label}]`, resAnalyze.status === 401, `status=${resAnalyze.status}`);
  }

  // 2.6 Settings Admin Routes
  for (const attack of attackHeaders) {
    const reqGet = new Request('http://localhost:3000/api/settings?admin=true', { headers: attack.headers });
    const resGet = await settingsGET(reqGet);
    const dataGet = await resGet.json().catch(() => ({}));
    report(
      `GET /api/settings?admin=true blocked [${attack.label}]`,
      resGet.status === 401 && dataGet.requiresAuth === true,
      `status=${resGet.status}, requiresAuth=${dataGet.requiresAuth}`
    );

    const reqPut = new Request('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...attack.headers },
      body: JSON.stringify({ returnStreet: '123 Hacked St' }),
    });
    const resPut = await settingsPUT(reqPut);
    report(`PUT /api/settings blocked [${attack.label}]`, resPut.status === 401, `status=${resPut.status}`);

    const reqPost = new Request('http://localhost:3000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...attack.headers },
      body: JSON.stringify({ returnStreet: '123 Hacked St' }),
    });
    const resPost = await settingsPOST(reqPost);
    report(`POST /api/settings blocked [${attack.label}]`, resPost.status === 401, `status=${resPost.status}`);
  }

  // 2.7 Settings Test Integration Routes
  for (const attack of attackHeaders) {
    const reqStripe = new Request('http://localhost:3000/api/settings/test-stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...attack.headers },
      body: JSON.stringify({}),
    });
    const resStripe = await testStripePOST(reqStripe);
    report(`POST /api/settings/test-stripe blocked [${attack.label}]`, resStripe.status === 401, `status=${resStripe.status}`);

    const reqShippoPost = new Request('http://localhost:3000/api/settings/test-shippo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...attack.headers },
      body: JSON.stringify({}),
    });
    const resShippoPost = await testShippoPOST(reqShippoPost);
    report(`POST /api/settings/test-shippo blocked [${attack.label}]`, resShippoPost.status === 401, `status=${resShippoPost.status}`);

    const reqShippoGet = new Request('http://localhost:3000/api/settings/test-shippo', {
      method: 'GET',
      headers: attack.headers,
    });
    const resShippoGet = await testShippoGET(reqShippoGet);
    report(`GET /api/settings/test-shippo blocked [${attack.label}]`, resShippoGet.status === 401, `status=${resShippoGet.status}`);
  }

  // 2.8 Studio Privileged Routes
  for (const attack of attackHeaders) {
    const reqAutopilot = new Request('http://localhost:3000/api/studio/autopilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...attack.headers },
      body: JSON.stringify({ mode: 'dry_run' }),
    });
    const resAutopilot = await autopilotPOST(reqAutopilot);
    report(`POST /api/studio/autopilot blocked [${attack.label}]`, resAutopilot.status === 401, `status=${resAutopilot.status}`);

    const reqMetrics = new Request('http://localhost:3000/api/studio/metrics?refresh=1', {
      headers: attack.headers,
    });
    const resMetrics = await metricsGET(reqMetrics);
    report(`GET /api/studio/metrics?refresh=1 blocked [${attack.label}]`, resMetrics.status === 401, `status=${resMetrics.status}`);
  }

  // ────────────────────────────────────────────────────────────────
  // PART 3: Checkout Anti-Spoofing Verification
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('PART 3: Checkout Anti-Spoofing Verification (PATCH /api/checkout)');
  console.log('============================================================');

  // Create temporary test order to verify order status is not spoofed
  const testOrder = await prisma.order.create({
    data: {
      customerName: 'Anti-Spoofing Test Customer',
      customerEmail: 'spoof-test@example.com',
      shippingAddress: '123 Fake St, City, ST 12345 (US)',
      paymentMethod: 'stripe',
      paymentStatus: 'pending',
      itemsJson: '[]',
      subtotal: 8.0,
      shippingCost: 0.0,
      total: 8.0,
    },
  });

  try {
    // 3.1 Attempt spoofing without sessionId
    const reqNoSession = new Request('http://localhost:3000/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: testOrder.id }),
    });
    const resNoSession = await checkoutPATCH(reqNoSession);
    report('PATCH /api/checkout without sessionId rejected with 400', resNoSession.status === 400, `status=${resNoSession.status}`);

    // 3.2 Attempt spoofing with fake sessionId
    const reqFakeSession = new Request('http://localhost:3000/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: testOrder.id, sessionId: 'cs_fake_test_attack' }),
    });
    const resFakeSession = await checkoutPATCH(reqFakeSession);
    report('PATCH /api/checkout with fake sessionId rejected with 400', resFakeSession.status === 400, `status=${resFakeSession.status}`);

    // 3.3 Verify order remains pending (never marked paid)
    const orderCheck = await prisma.order.findUnique({ where: { id: testOrder.id } });
    report(
      'Order remains unpaid after spoof attacks',
      orderCheck?.paymentStatus === 'pending',
      `paymentStatus=${orderCheck?.paymentStatus}`
    );
  } finally {
    // Clean up test order
    await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {});
  }

  // ────────────────────────────────────────────────────────────────
  // PART 4: Public Settings Privacy Verification
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('PART 4: Public Settings Privacy Verification (GET /api/settings)');
  console.log('============================================================');

  const reqPublic = new Request('http://localhost:3000/api/settings');
  const resPublic = await settingsGET(reqPublic);
  const dataPublic = await resPublic.json();

  report('Public GET /api/settings returns HTTP 200', resPublic.status === 200);

  const sensitiveKeys = [
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

  let leakedSecrets = 0;
  for (const key of sensitiveKeys) {
    if (key in dataPublic && dataPublic[key] !== undefined) {
      leakedSecrets++;
      console.error(`    ❌ LEAK: Field '${key}' exposed in public response:`, dataPublic[key]);
    }
  }

  report('Public GET /api/settings exposes ZERO secrets', leakedSecrets === 0, `leaked=${leakedSecrets}`);
  report('Public response includes public storefront flags', 'enableStripe' in dataPublic && 'shippingFlatRate' in dataPublic);

  // ────────────────────────────────────────────────────────────────
  // PART 5: Authenticated Privileged Access (with valid x-admin-pin)
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('PART 5: Authenticated Privileged Access (with valid x-admin-pin)');
  console.log('============================================================');

  const authHeaders = { 'x-admin-pin': effectivePin };

  // 5.1 Authenticated orders GET
  const reqAuthOrders = new Request('http://localhost:3000/api/orders', { headers: authHeaders });
  const resAuthOrders = await ordersGET(reqAuthOrders);
  report('Authenticated GET /api/orders returns HTTP 200', resAuthOrders.status === 200);

  // 5.2 Authenticated settings GET
  const reqAuthSettings = new Request('http://localhost:3000/api/settings?admin=true', { headers: authHeaders });
  const resAuthSettings = await settingsGET(reqAuthSettings);
  const dataAuthSettings = await resAuthSettings.json();
  report(
    'Authenticated GET /api/settings?admin=true returns HTTP 200 with requiresAuth=false',
    resAuthSettings.status === 200 && dataAuthSettings.requiresAuth === false,
    `requiresAuth=${dataAuthSettings.requiresAuth}`
  );

  // 5.3 Authenticated product lifecycle
  const reqCreateProd = new Request('http://localhost:3000/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      title: 'Gate B Test Bead Pen',
      description: 'A genuine test product created to verify Gate B authenticated pipeline.',
      price: 8.0,
      isDraft: true,
    }),
  });
  const resCreateProd = await productsPOST(reqCreateProd);
  report('Authenticated POST /api/products returns HTTP 201 Created', resCreateProd.status === 201);
  const createdProd = await resCreateProd.json();

  if (createdProd?.id) {
    const reqUpdateProd = new Request(`http://localhost:3000/api/products/${createdProd.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        title: 'Gate B Test Bead Pen (Updated)',
        price: 9.5,
        isDraft: true,
      }),
    });
    const resUpdateProd = await productPUT(reqUpdateProd, { params: { id: createdProd.id } });
    report('Authenticated PUT /api/products/[id] returns HTTP 200', resUpdateProd.status === 200);

    const reqPatchProd = new Request(`http://localhost:3000/api/products/${createdProd.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        price: 10.0,
      }),
    });
    const resPatchProd = await productPATCH(reqPatchProd, { params: { id: createdProd.id } });
    report('Authenticated PATCH /api/products/[id] returns HTTP 200', resPatchProd.status === 200);

    const reqDelProd = new Request(`http://localhost:3000/api/products/${createdProd.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const resDelProd = await productDELETE(reqDelProd, { params: { id: createdProd.id } });
    report('Authenticated DELETE /api/products/[id] returns HTTP 200', resDelProd.status === 200);
  }

  // ────────────────────────────────────────────────────────────────
  // PART 6: HTTP Security Headers in next.config.mjs
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('PART 6: HTTP Security Headers in next.config.mjs');
  console.log('============================================================');

  report('nextConfig defines headers() async function', typeof nextConfig.headers === 'function');
  const headersConfig = await nextConfig.headers();
  report('nextConfig.headers() returns non-empty rules', Array.isArray(headersConfig) && headersConfig.length > 0);

  const universalRule = headersConfig.find(r => r.source === '/(.*)');
  report('universal header rule /(.*) is configured', Boolean(universalRule));

  const headersMap = new Map((universalRule?.headers || []).map(h => [h.key.toLowerCase(), h.value]));

  report(
    'X-Content-Type-Options: nosniff is set',
    headersMap.get('x-content-type-options') === 'nosniff',
    `value=${headersMap.get('x-content-type-options')}`
  );

  report(
    'X-Frame-Options: DENY is set',
    headersMap.get('x-frame-options') === 'DENY',
    `value=${headersMap.get('x-frame-options')}`
  );

  report(
    'Referrer-Policy: strict-origin-when-cross-origin is set',
    headersMap.get('referrer-policy') === 'strict-origin-when-cross-origin',
    `value=${headersMap.get('referrer-policy')}`
  );

  report(
    'Permissions-Policy: camera=(), microphone=(), geolocation=() is set',
    headersMap.get('permissions-policy') === 'camera=(), microphone=(), geolocation=()',
    `value=${headersMap.get('permissions-policy')}`
  );

  // ────────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log(`SUMMARY: Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('============================================================');

  if (failedTests > 0) {
    console.error(`\n❌ Gate B Verification FAILED with ${failedTests} failure(s).`);
    process.exit(1);
  } else {
    console.log('\n🎉 Gate B Verification PASSED 100%! All API authentication, anti-spoofing, privacy, and security criteria satisfied.');
    process.exit(0);
  }
}

runGateBSuite().catch((err) => {
  console.error('Fatal error during Gate B test execution:', err);
  process.exit(1);
});
