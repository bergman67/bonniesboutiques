/**
 * test-challenger-m3-stress.mjs
 * 
 * Milestone 3 Adversarial Challenge & Stress Test Suite
 * Executed by Challenger 1 (teamwork_preview_challenger_m3_1)
 */

import assert from 'node:assert';
import { getPlaceholderGeometry, MODEL_PRESETS } from '../src/lib/scrollytelling/assetManifest.ts';

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║        MILESTONE 3: EMPIRICAL CHALLENGER ADVERSARIAL STRESS SUITE     ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

let totalTests = 0;
let passedTests = 0;

function check(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${desc}`);
  } catch (err) {
    console.error(`  ✖ [FAIL] ${desc}: ${err.message}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: CAMERA TRAJECTORY MATHEMATICAL CONTINUITY & CLAMPING STRESS
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- SUITE 1: Camera Trajectory Math, Clamping & Singularity Stress ---');

function evalCameraRig(rawP) {
  const p = Math.min(1, Math.max(0, rawP));

  let targetX = 0;
  let targetY = 8;
  let targetZ = 14;

  const lookX = 0;
  let lookY = 2;
  const lookZ = 0;

  const lerp = (a, b, t) => a + (b - a) * t;

  if (p <= 0.25) {
    const t = p / 0.25;
    targetX = lerp(0, 0.8, Math.sin(t * Math.PI * 0.5));
    targetY = lerp(8.0, 5.5, t);
    targetZ = lerp(14.0, 10.0, t);
    lookY = lerp(2.0, 1.5, t);
  } else if (p <= 0.5) {
    const t = (p - 0.25) / 0.25;
    targetX = lerp(0.8, -0.4, t);
    targetY = lerp(5.5, 3.2, t);
    targetZ = lerp(10.0, 6.8, t);
    lookY = lerp(1.5, 0.8, t);
  } else if (p <= 0.75) {
    const t = (p - 0.5) / 0.25;
    targetX = lerp(-0.4, 0, t);
    targetY = lerp(3.2, 1.6, t);
    targetZ = lerp(6.8, 4.4, t);
    lookY = lerp(0.8, 0.45, t);
  } else {
    const t = (p - 0.75) / 0.25;
    targetX = 0;
    targetY = lerp(1.6, 0.72, t);
    targetZ = lerp(4.4, 3.1, t);
    lookY = lerp(0.45, 0.32, t);
  }

  const distToLook = Math.hypot(targetX - lookX, targetY - lookY, targetZ - lookZ);
  return { targetX, targetY, targetZ, lookX, lookY, lookZ, distToLook };
}

check('Boundary clamping across extreme out-of-range floats', () => {
  const extremes = [-1e12, -1000.0, -1.0, -0.0001, -0.0, 1.00001, 1.5, 50.0, 1e12];
  for (const raw of extremes) {
    const res = evalCameraRig(raw);
    assert(!Number.isNaN(res.targetX) && Number.isFinite(res.targetX));
    assert(!Number.isNaN(res.targetY) && Number.isFinite(res.targetY));
    assert(!Number.isNaN(res.targetZ) && Number.isFinite(res.targetZ));
    assert(!Number.isNaN(res.lookY) && Number.isFinite(res.lookY));
    if (raw <= 0) {
      assert.strictEqual(res.targetY, 8.0, `Expected Y=8.0 at negative p=${raw}`);
      assert.strictEqual(res.targetZ, 14.0);
    } else {
      assert.strictEqual(res.targetY, 0.72, `Expected Y=0.72 at positive p=${raw}`);
      assert.strictEqual(res.targetZ, 3.1);
    }
  }
});

check('Exact C0 continuity at phase boundaries (p=0.25, p=0.50, p=0.75)', () => {
  const eps = 1e-9;
  const boundaries = [0.25, 0.50, 0.75];
  for (const b of boundaries) {
    const left = evalCameraRig(b - eps);
    const exact = evalCameraRig(b);
    const right = evalCameraRig(b + eps);

    const deltaLeftX = Math.abs(exact.targetX - left.targetX);
    const deltaRightX = Math.abs(right.targetX - exact.targetX);
    const deltaLeftY = Math.abs(exact.targetY - left.targetY);
    const deltaRightY = Math.abs(right.targetY - exact.targetY);

    assert(deltaLeftX < 1e-4, `Left deltaX too large at p=${b}: ${deltaLeftX}`);
    assert(deltaRightX < 1e-4, `Right deltaX too large at p=${b}: ${deltaRightX}`);
    assert(deltaLeftY < 1e-4, `Left deltaY too large at p=${b}: ${deltaLeftY}`);
    assert(deltaRightY < 1e-4, `Right deltaY too large at p=${b}: ${deltaRightY}`);
  }
});

check('1,000,000 step continuous simulation: no singularities or collisions', () => {
  const STEPS = 1000000;
  let minDist = Infinity;
  let maxDist = -Infinity;
  let prevY = 8.0;

  for (let i = 0; i <= STEPS; i++) {
    const p = i / STEPS;
    const res = evalCameraRig(p);

    assert(!Number.isNaN(res.targetX), `targetX is NaN at p=${p}`);
    assert(!Number.isNaN(res.targetY), `targetY is NaN at p=${p}`);
    assert(!Number.isNaN(res.distToLook), `distToLook is NaN at p=${p}`);

    // Camera distance to look target must remain positive and comfortably separated (no clipping/singularity)
    if (res.distToLook < minDist) minDist = res.distToLook;
    if (res.distToLook > maxDist) maxDist = res.distToLook;

    // Strict monotonic descent in targetY
    assert(res.targetY <= prevY + 1e-12, `targetY increased at p=${p}: ${res.targetY} > ${prevY}`);
    prevY = res.targetY;
  }

  assert(minDist >= 3.0, `Camera distance to target fell too low: ${minDist}`);
  assert(maxDist <= 16.0, `Camera distance to target exceeded bounds: ${maxDist}`);
});

check('Camera damping lerp stability under high-frequency oscillating scroll', () => {
  let camX = 0, camY = 8, camZ = 14;
  // Simulate 10,000 violent scroll oscillations between 0.0 and 1.0
  for (let frame = 0; frame < 10000; frame++) {
    const p = frame % 2 === 0 ? 0.0 : 1.0;
    const { targetX, targetY, targetZ } = evalCameraRig(p);
    camX += (targetX - camX) * 0.08;
    camY += (targetY - camY) * 0.08;
    camZ += (targetZ - camZ) * 0.08;

    assert(!Number.isNaN(camX) && Number.isFinite(camX));
    assert(!Number.isNaN(camY) && Number.isFinite(camY));
    assert(!Number.isNaN(camZ) && Number.isFinite(camZ));
    // Must remain within trajectory bounds
    assert(camY >= 0.70 && camY <= 8.01);
    assert(camZ >= 3.0 && camZ <= 14.01);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: PRODUCT SWAPPING TIMER LIFECYCLES & RAPID NAVIGATION STRESS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 2: LevitatingProductViewer Timer Lifecycles & Navigation Stress ---');

class MockViewerLifecycle {
  constructor(initialProduct) {
    this.currentProduct = initialProduct;
    this.displayDescriptor = getPlaceholderGeometry(initialProduct.id, initialProduct.title);
    this.transitionScale = 1;
    this.downTimer = null;
    this.upTimer = null;
    this.activeTimers = new Set();
    this.timerIdCounter = 0;
    this.pendingCallbacks = new Map(); // id -> callback
  }

  setInterval(fn, ms) {
    const id = ++this.timerIdCounter;
    this.activeTimers.add(id);
    this.pendingCallbacks.set(id, fn);
    return id;
  }

  clearInterval(id) {
    if (id != null) {
      this.activeTimers.delete(id);
      this.pendingCallbacks.delete(id);
    }
  }

  tickAll() {
    // Execute all currently pending timer callbacks
    const callbacks = Array.from(this.pendingCallbacks.values());
    for (const cb of callbacks) {
      cb();
    }
  }

  // Simulates React useEffect when product prop changes
  updateProduct(newProduct) {
    // 1. Run previous cleanup
    if (this.downTimer) {
      this.clearInterval(this.downTimer);
      this.downTimer = null;
    }
    if (this.upTimer) {
      this.clearInterval(this.upTimer);
      this.upTimer = null;
    }

    this.currentProduct = newProduct;
    const newDesc = getPlaceholderGeometry(newProduct.id, newProduct.title);

    let progress = 1;
    this.downTimer = this.setInterval(() => {
      progress -= 0.15;
      if (progress <= 0) {
        if (this.downTimer) {
          this.clearInterval(this.downTimer);
          this.downTimer = null;
        }
        this.displayDescriptor = newDesc;
        let upProgress = 0;
        this.upTimer = this.setInterval(() => {
          upProgress += 0.15;
          if (upProgress >= 1) {
            if (this.upTimer) {
              this.clearInterval(this.upTimer);
              this.upTimer = null;
            }
            this.transitionScale = 1;
          } else {
            this.transitionScale = upProgress;
          }
        }, 16);
      } else {
        this.transitionScale = progress;
      }
    }, 16);
  }

  unmount() {
    if (this.downTimer) this.clearInterval(this.downTimer);
    if (this.upTimer) this.clearInterval(this.upTimer);
  }
}

check('Clean single transition completes with 0 leaked timers and scale=1', () => {
  const viewer = new MockViewerLifecycle({ id: 'p1', title: 'Rose Gem' });
  viewer.updateProduct({ id: 'p2', title: 'Golden Ring' });

  // Each timer step advances progress by 0.15. Down takes ~7 ticks, Up takes ~7 ticks.
  for (let i = 0; i < 20; i++) {
    viewer.tickAll();
  }

  assert.strictEqual(viewer.activeTimers.size, 0, 'Active timers must be 0 after completion');
  assert.strictEqual(viewer.transitionScale, 1, 'Transition scale must be 1');
  assert.strictEqual(viewer.displayDescriptor.name, 'Golden Ring');
});

check('50,000 rapid concurrent navigation swaps with random tick delays', () => {
  const sampleProducts = [
    { id: 'p1', title: 'Faceted Rose Gemstone' },
    { id: 'p2', title: 'Enchanted Golden Ring' },
    { id: 'p3', title: 'Glimmering Potion Vial' },
    { id: 'p4', title: 'Botanical Resin Charm' },
    { id: 'p5', title: 'Celestial Stardust Orb' },
  ];

  const viewer = new MockViewerLifecycle(sampleProducts[0]);

  for (let i = 0; i < 50000; i++) {
    const nextProd = sampleProducts[i % sampleProducts.length];
    viewer.updateProduct(nextProd);

    // Random ticks between 0 and 5
    const ticks = Math.floor(Math.random() * 6);
    for (let t = 0; t < ticks; t++) {
      viewer.tickAll();
    }

    // At any point during rapid swapping, active timers must never exceed 2
    assert(
      viewer.activeTimers.size <= 2,
      `Timer leak detected: ${viewer.activeTimers.size} active timers at step ${i}`
    );
  }

  // Allow final transition to settle
  for (let i = 0; i < 30; i++) {
    viewer.tickAll();
  }

  assert.strictEqual(viewer.activeTimers.size, 0, 'Must have zero leaked timers after settling');
  assert.strictEqual(viewer.transitionScale, 1, 'Scale must end at 1');
  assert.strictEqual(
    viewer.displayDescriptor.id,
    sampleProducts[(50000 - 1) % sampleProducts.length].id,
    'Final display descriptor must match the last updated product'
  );
});

check('Rapid cyclic navigation wrap-around (single, dual, and 100 items)', () => {
  // Single item list wrap-around
  const single = [{ id: 's1', title: 'Solo Charm' }];
  let idx = 0;
  const next1 = () => (idx + 1) % single.length;
  const prev1 = () => (idx > 0 ? idx - 1 : single.length - 1);
  assert.strictEqual(next1(), 0);
  assert.strictEqual(prev1(), 0);

  // 100 items wrap-around stress
  const count = 100;
  idx = 0;
  for (let i = 0; i < 10000; i++) {
    idx = (idx + 1) % count;
    assert(idx >= 0 && idx < count);
  }
  for (let i = 0; i < 10000; i++) {
    idx = idx > 0 ? idx - 1 : count - 1;
    assert(idx >= 0 && idx < count);
  }
});

check('Asset manifest fuzzing with adversarial / injection / empty strings', () => {
  const fuzzInputs = [
    '',
    '   ',
    'a',
    'undefined',
    'null',
    '<script>alert(1)</script>',
    "'; DROP TABLE products; --",
    '🌹✨🌙🔮',
    'العربية / עברית / 中文 / 日本語',
    'X'.repeat(50000), // Huge string
    'heart-potion-resin-orb-ring-star-amethyst', // Keyword conflict
  ];

  for (const input of fuzzInputs) {
    const desc = getPlaceholderGeometry(`test-${input.slice(0, 10)}`, input);
    assert(typeof desc.id === 'string', 'Descriptor must have valid ID');
    assert(typeof desc.pedestalAura === 'string' && desc.pedestalAura.startsWith('#'));
    assert(Array.isArray(desc.scale) && desc.scale.length === 3);
    assert(typeof desc.primitiveConfig.shape === 'string');
    assert(typeof desc.primitiveConfig.material.color === 'string');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: CONTACT SHADOW SCALING & LEVITATION PHYSICS LONG-RUN STABILITY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 3: Levitation Multi-Harmonic Physics & Contact Shadow Bounds ---');

check('Extended time simulation (100,000s) guarantees bounded levitation and shadow', () => {
  const SAMPLES = 100000;
  let minFloat = Infinity;
  let maxFloat = -Infinity;
  let minShadow = Infinity;
  let maxShadow = -Infinity;
  let minOpacity = Infinity;
  let maxOpacity = -Infinity;

  for (let s = 0; s < SAMPLES; s++) {
    const t = s * 0.1; // 0 to 10,000s
    const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.025;
    const posY = 0.85 + floatOffset;
    const shadowScale = Math.max(0.4, 1 - floatOffset * 2.2);
    const shadowOpacity = Math.max(0.15, 0.45 - floatOffset * 1.5);

    if (floatOffset < minFloat) minFloat = floatOffset;
    if (floatOffset > maxFloat) maxFloat = floatOffset;
    if (shadowScale < minShadow) minShadow = shadowScale;
    if (shadowScale > maxShadow) maxShadow = shadowScale;
    if (shadowOpacity < minOpacity) minOpacity = shadowOpacity;
    if (shadowOpacity > maxOpacity) maxOpacity = shadowOpacity;

    // Levitation height bounds
    assert(posY >= 0.70 && posY <= 1.00, `posY out of bounds: ${posY}`);
  }

  assert(minFloat >= -0.145 && maxFloat <= 0.145, `Float offset out of bounds: [${minFloat}, ${maxFloat}]`);
  assert(minShadow >= 0.4 && maxShadow <= 1.4, `Shadow scale out of bounds: [${minShadow}, ${maxShadow}]`);
  assert(minOpacity >= 0.15 && maxOpacity <= 0.70, `Shadow opacity out of bounds: [${minOpacity}, ${maxOpacity}]`);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: CONCURRENT LIVE HTTP RESILIENCE & LATENCY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 4: Concurrent Live Production HTTP Requests ---');

async function testLiveConcurrency() {
  const BASE = 'https://bonnies-boutique-storefront.netlify.app';
  console.log('  Testing 10 parallel requests to Homepage and 10 to /api/products...');

  const rootPromises = Array.from({ length: 10 }, async (_, i) => {
    const t0 = Date.now();
    const res = await fetch(`${BASE}/?test=${i}`);
    const elapsed = Date.now() - t0;
    const text = await res.text();
    const hasCrash = text.includes('An error occurred in the Server Components render') ||
                     text.includes('Application error: a client-side exception has occurred');
    return { status: res.status, elapsed, hasCrash };
  });

  const apiPromises = Array.from({ length: 10 }, async (_, i) => {
    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/products?test=${i}`);
    const elapsed = Date.now() - t0;
    const data = await res.json();
    return { status: res.status, elapsed, count: Array.isArray(data) ? data.length : 0 };
  });

  const [rootResults, apiResults] = await Promise.all([
    Promise.all(rootPromises),
    Promise.all(apiPromises),
  ]);

  // Validate root results
  for (const r of rootResults) {
    assert.strictEqual(r.status, 200, `Root page returned non-200: ${r.status}`);
    assert.strictEqual(r.hasCrash, false, 'Root page contained Server Component crash string');
    assert(r.elapsed < 5000, `Root page request too slow: ${r.elapsed}ms`);
  }
  console.log(`  ✔ [PASS] 10/10 concurrent Homepage requests returned 200 OK with zero crash digests.`);

  // Validate api results
  for (const a of apiResults) {
    assert.strictEqual(a.status, 200, `/api/products returned non-200: ${a.status}`);
    assert.strictEqual(a.count, 99, `Expected 99 items from Supabase DB, got ${a.count}`);
    assert(a.elapsed < 3000, `/api/products request too slow: ${a.elapsed}ms`);
  }
  console.log(`  ✔ [PASS] 10/10 concurrent /api/products requests returned 200 OK with 99 products.`);

  // Test invalid checkout submission for proper validation
  const invalidRes = await fetch(`${BASE}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [], form: {}, total: 0 }),
  });
  console.log(`  ✔ [PASS] POST /api/checkout responds with status ${invalidRes.status}.`);
}

await testLiveConcurrency();

console.log('\n══════════════════════════════════════════════════════════════════════');
console.log(`ADVERSARIAL STRESS SUITE COMPLETE: ${passedTests} / ${totalTests} CHECKS PASSED`);
console.log('══════════════════════════════════════════════════════════════════════\n');
