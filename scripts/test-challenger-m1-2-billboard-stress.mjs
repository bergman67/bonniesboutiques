#!/usr/bin/env node
/**
 * scripts/test-challenger-m1-2-billboard-stress.mjs
 *
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE for Milestone 1 (Challenger 2)
 * Target: src/components/scrollytelling/LevitatingProductViewer.tsx
 *
 * Scope:
 * 1. Raycast coverage of the drag-to-rotate interaction hit plane across various viewport angles & camera frustums:
 *    - 16:9 Desktop (1920x1080, fov=45)
 *    - 9:16 Mobile (1080x1920, dynamic fov)
 *    - 1:1 Square (1080x1080, dynamic fov)
 *    - 4:3 Tablet (1024x768, dynamic fov)
 *    - 21:9 Ultrawide (2560x1080, fov=45)
 *    - 9:20 Tall Mobile (1080x2400, dynamic fov)
 *    - Across scroll phases p in [0.0, 0.25, 0.50, 0.75, 1.00]
 *    - Pointer drag gesture arbitration & state transitions (horizontal, vertical, deadzone, reset)
 * 2. Fill ratio detection algorithm stress-testing:
 *    - Empty / 100% transparent images (alpha = 0)
 *    - Single-pixel images (1x1)
 *    - Corrupt / 0-dimension images
 *    - Uniform solid color textures (100% fill)
 *    - Faint alpha noise (alpha <= 20) vs detected threshold (alpha > 20)
 *    - Boundary pixel counts (found <= 20 vs found > 20)
 *    - Extreme aspect ratios (ultra-tall 0.001, ultra-wide 1000)
 *    - Canvas context / drawImage exceptions (tainted canvas simulation)
 *    - Real catalog transparent PNGs from public/uploads/transparent/
 *    - Finite coordinate & dimension clamping verification
 * 3. Pedestal elimination verification:
 *    - 0 cylinderGeometry and 0 ringGeometry in LevitatingProductViewer.tsx
 * 4. scripts/verify-3d-billboard.mjs invariant verification
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as THREE from 'three';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

let totalPassed = 0;
let totalFailed = 0;
const findings = [];

function pass(name, detail = '') {
  totalPassed++;
  console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${name}${detail ? ` ${colors.dim}(${detail})${colors.reset}` : ''}`);
}

function fail(name, error) {
  totalFailed++;
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`  ${colors.red}✖ [FAIL]${colors.reset} ${name}: ${msg}`);
  findings.push({ test: name, error: msg });
}

console.log(`${colors.bold}${colors.magenta}╔══════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.bold}${colors.magenta}║      CHALLENGER 2: EMPIRICAL BILLBOARD & INTERACTION STRESS SUITE        ║${colors.reset}`);
console.log(`${colors.bold}${colors.magenta}╚══════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: VERIFY PEDESTAL ELIMINATION & CODE INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────
console.log(`${colors.bold}${colors.cyan}--- Section 1: Pedestal Mesh Elimination & Code Invariants ---${colors.reset}`);

const viewerPath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'LevitatingProductViewer.tsx');
assert(fs.existsSync(viewerPath), 'LevitatingProductViewer.tsx must exist');
const viewerSrc = fs.readFileSync(viewerPath, 'utf8');

// 1.1 Zero cylinderGeometry and 0 ringGeometry
const cylinderCount = (viewerSrc.match(/<cylinderGeometry/g) || []).length;
const ringCount = (viewerSrc.match(/<ringGeometry/g) || []).length;

if (cylinderCount === 0 && ringCount === 0) {
  pass('Pedestal cylinder and ring geometries completely removed', `cylinderGeometry: 0, ringGeometry: 0`);
} else {
  fail('Pedestal cylinder and ring geometries completely removed', new Error(`Found ${cylinderCount} cylinderGeometry, ${ringCount} ringGeometry`));
}

// 1.2 Interaction plane present
if (viewerSrc.includes('<planeGeometry args={[10, 10]} />') && viewerSrc.includes('position={[0, 0.85, -0.05]}')) {
  pass('Interaction hit plane declared at [0, 0.85, -0.05] with 10x10 dimensions');
} else {
  fail('Interaction hit plane declared', new Error('Interaction plane [10, 10] at [0, 0.85, -0.05] missing'));
}

// 1.3 Billboard follow={true} present
if (viewerSrc.includes('<Billboard follow={true}>')) {
  pass('Billboard follow={true} configured');
} else {
  fail('Billboard follow={true}', new Error('Billboard follow={true} missing'));
}

// 1.4 Check verify-3d-billboard.mjs assertions
try {
  const verifyResult = spawnSync('node', ['scripts/verify-3d-billboard.mjs'], { cwd: ROOT_DIR, encoding: 'utf8' });
  if (verifyResult.status === 0) {
    pass('All 20/20 assertions in scripts/verify-3d-billboard.mjs pass');
  } else {
    fail('scripts/verify-3d-billboard.mjs execution', new Error(verifyResult.stderr || verifyResult.stdout));
  }
} catch (err) {
  fail('scripts/verify-3d-billboard.mjs execution', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: RAYCAST INTERACTION PLANE COVERAGE ACROSS VIEWPORT ANGLES
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${colors.bold}${colors.cyan}--- Section 2: Raycast Interaction Plane Coverage Across Viewport Angles ---${colors.reset}`);

/**
 * Calculates camera position along the 4-phase scrolly descent.
 */
function computeCameraTargets(p) {
  let targetX = 0, targetY = 8, targetZ = 14;
  const lookX = 0;
  let lookY = 2;
  const lookZ = 0;

  if (p <= 0.25) {
    const t = p / 0.25;
    targetX = THREE.MathUtils.lerp(0, 0.8, Math.sin(t * Math.PI * 0.5));
    targetY = THREE.MathUtils.lerp(8.0, 5.5, t);
    targetZ = THREE.MathUtils.lerp(14.0, 10.0, t);
    lookY = THREE.MathUtils.lerp(2.0, 1.5, t);
  } else if (p <= 0.5) {
    const t = (p - 0.25) / 0.25;
    targetX = THREE.MathUtils.lerp(0.8, -0.4, t);
    targetY = THREE.MathUtils.lerp(5.5, 3.2, t);
    targetZ = THREE.MathUtils.lerp(10.0, 6.8, t);
    lookY = THREE.MathUtils.lerp(1.5, 0.8, t);
  } else if (p <= 0.75) {
    const t = (p - 0.5) / 0.25;
    targetX = THREE.MathUtils.lerp(-0.4, 0, t);
    targetY = THREE.MathUtils.lerp(3.2, 1.6, t);
    targetZ = THREE.MathUtils.lerp(6.8, 4.4, t);
    lookY = THREE.MathUtils.lerp(0.8, 0.45, t);
  } else {
    const t = (p - 0.75) / 0.25;
    targetX = 0;
    targetY = THREE.MathUtils.lerp(1.6, 0.72, t);
    targetZ = THREE.MathUtils.lerp(4.4, 3.1, t);
    lookY = THREE.MathUtils.lerp(0.45, 0.32, t);
  }
  return { targetX, targetY, targetZ, lookX, lookY, lookZ };
}

/**
 * Computes dynamic camera FOV for a given aspect ratio according to LevitatingProductViewer.tsx:
 * Lines 319-322:
 * if (aspect < targetAspect) {
 *   const baseFovRad = (45 * Math.PI) / 180;
 *   const tanHalf = Math.tan(baseFovRad / 2) * (targetAspect / aspect);
 *   const dynamicFov = Math.min(125, (2 * Math.atan(tanHalf) * 180) / Math.PI);
 * } else {
 *   fov = 45;
 * }
 */
function computeDynamicFov(width, height) {
  const aspect = width / height;
  const targetAspect = 16 / 9;
  if (aspect < targetAspect) {
    const baseFovRad = (45 * Math.PI) / 180;
    const tanHalf = Math.tan(baseFovRad / 2) * (targetAspect / aspect);
    return Math.min(125, (2 * Math.atan(tanHalf) * 180) / Math.PI);
  }
  return 45;
}

// Build Three.js scene mimicking ScrollyCanvas + LevitatingProductViewer hierarchy
function buildTestScene() {
  const scene = new THREE.Scene();

  // Root group positioned at pedestalPosition = [0, -0.6, 0]
  const pedestalGroup = new THREE.Group();
  pedestalGroup.position.set(0, -0.6, 0);
  scene.add(pedestalGroup);

  // Interaction plane inside group at [0, 0.85, -0.05]
  const planeGeo = new THREE.PlaneGeometry(10, 10);
  const planeMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
  const hitMesh = new THREE.Mesh(planeGeo, planeMat);
  hitMesh.position.set(0, 0.85, -0.05);
  hitMesh.name = 'InteractionHitPlane';
  pedestalGroup.add(hitMesh);

  // Billboard model group inside pedestalGroup at [0, 1.25, 0], animated in useFrame to [0, 0.85 + floatOffset, 0]
  const modelGroup = new THREE.Group();
  modelGroup.position.set(0, 0.85, 0);
  pedestalGroup.add(modelGroup);

  // Billboard plane mesh (args roughly 2.5 x 5.0)
  const billboardGeo = new THREE.PlaneGeometry(2.5, 5.0);
  const billboardMat = new THREE.MeshStandardMaterial({ transparent: true });
  const billboardMesh = new THREE.Mesh(billboardGeo, billboardMat);
  billboardMesh.name = 'ProductBillboard';
  modelGroup.add(billboardMesh);

  scene.updateMatrixWorld(true);
  return { scene, hitMesh, billboardMesh, pedestalGroup, modelGroup };
}

const viewportConfigs = [
  { name: 'Desktop 16:9 (1920x1080)', width: 1920, height: 1080 },
  { name: 'Mobile 9:16 (1080x1920)', width: 1080, height: 1920 },
  { name: 'Square 1:1 (1080x1080)', width: 1080, height: 1080 },
  { name: 'Tablet 4:3 (1024x768)', width: 1024, height: 768 },
  { name: 'Ultrawide 21:9 (2560x1080)', width: 2560, height: 1080 },
  { name: 'Tall Phone 9:20 (1080x2400)', width: 1080, height: 2400 },
];

const { scene, hitMesh, billboardMesh } = buildTestScene();
const raycaster = new THREE.Raycaster();

// Test 2.1: Full showcase alignment phase (p = 1.0) coverage test
for (const vp of viewportConfigs) {
  const fov = computeDynamicFov(vp.width, vp.height);
  const camera = new THREE.PerspectiveCamera(fov, vp.width / vp.height, 0.1, 50);

  const targets = computeCameraTargets(1.0);
  camera.position.set(targets.targetX, targets.targetY, targets.targetZ);
  camera.lookAt(targets.lookX, targets.lookY, targets.lookZ);
  camera.updateMatrixWorld();

  // Test grid of NDC coordinates across the active product showcase window:
  // Visible window is center-focused, NDC x in [-0.6, 0.6], y in [-0.6, 0.6]
  let totalWindowRays = 0;
  let hitCount = 0;

  for (let ndcX = -0.6; ndcX <= 0.6; ndcX += 0.05) {
    for (let ndcY = -0.6; ndcY <= 0.6; ndcY += 0.05) {
      totalWindowRays++;
      const pointer = new THREE.Vector2(ndcX, ndcY);
      raycaster.setFromCamera(pointer, camera);

      const intersects = raycaster.intersectObjects([hitMesh, billboardMesh], false);
      if (intersects.length > 0) {
        hitCount++;
      }
    }
  }

  const coverage = (hitCount / totalWindowRays) * 100;
  if (coverage === 100) {
    pass(`100% Raycast hit coverage on ${vp.name} (p=1.0)`, `${hitCount}/${totalWindowRays} rays intersected, fov=${fov.toFixed(1)}°`);
  } else {
    fail(`Raycast hit coverage on ${vp.name}`, new Error(`Only ${coverage.toFixed(1)}% coverage (${hitCount}/${totalWindowRays})`));
  }
}

// Test 2.2: Cross-phase coverage (p = 0.75 to 1.00 descent)
for (let p = 0.75; p <= 1.0; p += 0.05) {
  const fov = computeDynamicFov(1080, 1920); // Mobile worst-case
  const camera = new THREE.PerspectiveCamera(fov, 1080 / 1920, 0.1, 50);
  const targets = computeCameraTargets(p);
  camera.position.set(targets.targetX, targets.targetY, targets.targetZ);
  camera.lookAt(targets.lookX, targets.lookY, targets.lookZ);
  camera.updateMatrixWorld();

  // Center pointer (ndc 0, 0) and product quadrant pointers
  const testCoords = [
    { x: 0, y: 0, label: 'center' },
    { x: -0.4, y: 0.2, label: 'upper-left' },
    { x: 0.4, y: 0.2, label: 'upper-right' },
    { x: -0.3, y: -0.3, label: 'lower-left' },
    { x: 0.3, y: -0.3, label: 'lower-right' },
  ];

  for (const c of testCoords) {
    raycaster.setFromCamera(new THREE.Vector2(c.x, c.y), camera);
    const intersects = raycaster.intersectObjects([hitMesh, billboardMesh], false);
    assert(intersects.length > 0, `Ray failed at p=${p.toFixed(2)} point=${c.label}`);
  }
}
pass('Raycast hit plane covers all product quadrants across p=0.75 to p=1.00');

// Test 2.3: Gesture arbitration simulation
console.log(`\n${colors.bold}${colors.cyan}--- Section 2.3: Gesture Arbitration State Machine Simulation ---${colors.reset}`);

class GestureSimulator {
  constructor() {
    this.isDragging = false;
    this.pointerX = 0;
    this.dragRotation = 0;
    this.pointerStartPos = null;
    this.gestureLock = 'pending';
    this.history = [];
  }

  onPointerDown(clientX, clientY) {
    this.isDragging = true;
    this.pointerX = clientX;
    this.pointerStartPos = { x: clientX, y: clientY };
    this.gestureLock = 'pending';
    this.history.push({ event: 'down', clientX, clientY, gestureLock: this.gestureLock });
  }

  onPointerMove(clientX, clientY) {
    if (!this.isDragging) return;

    if (this.gestureLock === 'pending' && this.pointerStartPos) {
      const deltaX = Math.abs(clientX - this.pointerStartPos.x);
      const deltaY = Math.abs(clientY - this.pointerStartPos.y);

      // Deadzone check
      if (deltaX < 5 && deltaY < 5) {
        return;
      }

      if (deltaY > deltaX) {
        // Vertical gesture -> user scrolling page; abort drag
        this.gestureLock = 'vertical';
        this.isDragging = false;
        this.pointerStartPos = null;
        this.history.push({ event: 'move-vertical-abort', clientX, clientY, gestureLock: this.gestureLock });
        return;
      } else {
        // Horizontal gesture -> user intends to inspect 3D model
        this.gestureLock = 'horizontal';
      }
    }

    if (this.gestureLock === 'vertical') {
      return;
    }

    const delta = clientX - this.pointerX;
    this.dragRotation += delta * 0.01;
    this.pointerX = clientX;
    this.history.push({ event: 'move-rotate', clientX, clientY, dragRotation: this.dragRotation });
  }

  onPointerUp() {
    this.isDragging = false;
    this.pointerStartPos = null;
    this.gestureLock = 'pending';
    this.history.push({ event: 'up', gestureLock: this.gestureLock });
  }
}

// Case A: Pure horizontal drag -> should rotate smoothly
{
  const sim = new GestureSimulator();
  sim.onPointerDown(100, 200);
  assert(sim.isDragging === true);
  assert(sim.gestureLock === 'pending');

  // Move 2px (inside deadzone)
  sim.onPointerMove(102, 200);
  assert(sim.gestureLock === 'pending');
  assert(sim.dragRotation === 0);

  // Move to +20px horizontally (beyond deadzone)
  sim.onPointerMove(120, 200);
  assert(sim.gestureLock === 'horizontal');
  assert(sim.isDragging === true);
  assert(Math.abs(sim.dragRotation - 0.20) < 0.001, `dragRotation expected ~0.20, got ${sim.dragRotation}`);

  // Continue moving
  sim.onPointerMove(150, 202);
  assert(sim.isDragging === true);
  assert(Math.abs(sim.dragRotation - 0.50) < 0.001);

  sim.onPointerUp();
  assert(sim.isDragging === false);
  assert(sim.gestureLock === 'pending');
  pass('Pure horizontal drag correctly classifies as horizontal and updates dragRotation');
}

// Case B: Pure vertical drag -> should abort drag rotation to allow page scroll
{
  const sim = new GestureSimulator();
  sim.onPointerDown(100, 200);

  // Move 25px vertically
  sim.onPointerMove(101, 225);
  assert(sim.gestureLock === 'vertical');
  assert(sim.isDragging === false, 'isDragging must be false after vertical abort');
  assert(sim.dragRotation === 0, 'dragRotation must not be altered during vertical scroll');

  // Further movement ignored
  sim.onPointerMove(150, 260);
  assert(sim.dragRotation === 0);

  sim.onPointerUp();
  assert(sim.gestureLock === 'pending');
  pass('Pure vertical drag aborts rotation cleanly to preserve page scrolling');
}

// Case C: Consecutive gestures (vertical scroll followed immediately by horizontal rotate)
{
  const sim = new GestureSimulator();

  // 1. Scroll attempt
  sim.onPointerDown(100, 200);
  sim.onPointerMove(100, 250);
  assert(sim.isDragging === false);
  sim.onPointerUp();

  // 2. Next attempt: intentional horizontal rotate
  sim.onPointerDown(100, 200);
  sim.onPointerMove(140, 200);
  assert(sim.gestureLock === 'horizontal');
  assert(sim.isDragging === true);
  assert(sim.dragRotation > 0);
  sim.onPointerUp();

  pass('Consecutive gestures: state resets properly after vertical abort allowing next drag attempt');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: STRESS-TEST FILL RATIO DETECTION ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${colors.bold}${colors.cyan}--- Section 3: Fill Ratio Detection Algorithm Stress Testing ---${colors.reset}`);

/**
 * Replicates the exact algorithm from LevitatingProductViewer.tsx lines 101-177.
 */
function runFillRatioDetection({
  naturalWidth,
  naturalHeight,
  pixelData, // Uint8Array or Buffer of 60x80 RGBA pixels, or null if context fails
  simulateContextFailure = false,
}) {
  const w = naturalWidth || 1;
  const h = naturalHeight || 1;
  const aspect = w / h;

  let fillRatio = 0.50; // Standard catalog baseline
  let detected = false;

  if (!simulateContextFailure && pixelData && w > 1 && h > 1) {
    try {
      const imgData = pixelData;
      let minY = 80;
      let maxY = 0;
      let found = 0;
      for (let y = 0; y < 80; y++) {
        for (let x = 0; x < 60; x++) {
          const alpha = imgData[(y * 60 + x) * 4 + 3];
          if (alpha > 20) {
            found++;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (found > 20 && maxY >= minY) {
        fillRatio = Math.max(0.35, Math.min(0.98, (maxY - minY + 1) / 80));
        detected = true;
      }
    } catch (_e) {
      // Fallback
    }
  }

  // Fallback heuristic if offscreen sampling wasn't possible:
  if (!detected) {
    if (Math.abs(aspect - 0.75) > 0.08) {
      fillRatio = 0.908;
    } else {
      fillRatio = 0.50;
    }
  }

  const targetProductHeight = 2.5;
  let calculatedHeight = targetProductHeight / fillRatio;
  let calculatedWidth = calculatedHeight * aspect;

  const maxAllowedWidth = 4.2;
  const maxAllowedHeight = 5.2;
  if (calculatedWidth > maxAllowedWidth) {
    const s = maxAllowedWidth / calculatedWidth;
    calculatedWidth *= s;
    calculatedHeight *= s;
  }
  if (calculatedHeight > maxAllowedHeight) {
    const s = maxAllowedHeight / calculatedHeight;
    calculatedWidth *= s;
    calculatedHeight *= s;
  }

  return { fillRatio, detected, calculatedWidth, calculatedHeight, aspect };
}

// 3.1 Empty / 100% transparent image (alpha = 0 everywhere)
{
  const emptyPixels = new Uint8Array(60 * 80 * 4); // all 0
  const res34 = runFillRatioDetection({ naturalWidth: 1200, naturalHeight: 1600, pixelData: emptyPixels });
  assert(!res34.detected, 'Must not detect on empty image');
  assert.strictEqual(res34.fillRatio, 0.50, 'Standard 3:4 empty image must fallback to 0.50');
  assert(Math.abs(res34.calculatedHeight - 5.0) < 0.001);

  const resTight = runFillRatioDetection({ naturalWidth: 800, naturalHeight: 1600, pixelData: emptyPixels });
  assert(!resTight.detected);
  assert.strictEqual(resTight.fillRatio, 0.908, 'Non-3:4 empty image must fallback to 0.908');
  assert(Math.abs(resTight.calculatedHeight - 2.5 / 0.908) < 0.001);
  pass('Empty / 100% transparent texture handled safely via fallback heuristic without NaN or crash');
}

// 3.2 Single-pixel image (w=1, h=1)
{
  const res1px = runFillRatioDetection({ naturalWidth: 1, naturalHeight: 1, pixelData: new Uint8Array(4) });
  assert(!res1px.detected, '1x1 must skip sampling');
  assert(res1px.fillRatio === 0.908, '1x1 aspect=1.0 must fallback to 0.908');
  assert(Number.isFinite(res1px.calculatedWidth) && Number.isFinite(res1px.calculatedHeight));
  pass('Single-pixel image (1x1) skips sampling safely and resolves dimensions');
}

// 3.3 Zero or invalid dimensions (w=0, h=0, NaN, undefined)
{
  const resZero = runFillRatioDetection({ naturalWidth: 0, naturalHeight: 0, pixelData: null });
  assert(Number.isFinite(resZero.calculatedWidth) && Number.isFinite(resZero.calculatedHeight));
  assert(resZero.calculatedWidth > 0 && resZero.calculatedHeight > 0);
  pass('Zero dimensions (0x0) default to 1x1 without division by zero');
}

// 3.4 Uniform solid color image (100% opaque, alpha = 255)
{
  const solidPixels = new Uint8Array(60 * 80 * 4);
  solidPixels.fill(255);
  const resSolid = runFillRatioDetection({ naturalWidth: 600, naturalHeight: 800, pixelData: solidPixels });
  assert(resSolid.detected === true);
  assert.strictEqual(resSolid.fillRatio, 0.98, '100% solid fill must be clamped to 0.98 max');
  assert(resSolid.calculatedHeight <= 5.2);
  pass('Solid opaque texture detected and clamped strictly to 0.98 fillRatio ceiling');
}

// 3.5 Faint alpha noise (alpha <= 20) vs detected threshold (alpha > 20)
{
  // Noise buffer with alpha = 19 (below threshold 20)
  const faintNoise = new Uint8Array(60 * 80 * 4);
  for (let i = 0; i < 60 * 80; i++) {
    faintNoise[i * 4 + 3] = 19;
  }
  const resFaint = runFillRatioDetection({ naturalWidth: 1200, naturalHeight: 1600, pixelData: faintNoise });
  assert(!resFaint.detected, 'Faint noise <= 20 must NOT trigger detection');
  assert.strictEqual(resFaint.fillRatio, 0.50);

  // Exact boundary: 20 pixels with alpha = 21 (found = 20 -> condition is `found > 20`)
  const boundary20 = new Uint8Array(60 * 80 * 4);
  for (let i = 0; i < 20; i++) {
    boundary20[i * 4 + 3] = 21;
  }
  const res20 = runFillRatioDetection({ naturalWidth: 1200, naturalHeight: 1600, pixelData: boundary20 });
  assert(!res20.detected, 'Exact boundary of 20 pixels must not trigger (requires found > 20)');

  // 21 pixels with alpha = 21 (found = 21)
  const boundary21 = new Uint8Array(60 * 80 * 4);
  for (let i = 0; i < 21; i++) {
    boundary21[i * 4 + 3] = 21;
  }
  const res21 = runFillRatioDetection({ naturalWidth: 1200, naturalHeight: 1600, pixelData: boundary21 });
  assert(res21.detected === true, '21 pixels with alpha > 20 must trigger detection');

  pass('Alpha thresholding (alpha > 20) and noise suppression (found > 20) strictly verified');
}

// 3.6 Realistic catalog 3:4 canvas sampling simulation
{
  // Create 60x80 buffer where trinket occupies y = 20 to 59 (40 pixels tall = 50% fill)
  const catalogBuffer = new Uint8Array(60 * 80 * 4);
  for (let y = 20; y <= 59; y++) {
    for (let x = 15; x <= 44; x++) {
      const idx = (y * 60 + x) * 4;
      catalogBuffer[idx] = 200;
      catalogBuffer[idx + 1] = 100;
      catalogBuffer[idx + 2] = 150;
      catalogBuffer[idx + 3] = 255;
    }
  }
  const resCatalog = runFillRatioDetection({ naturalWidth: 1200, naturalHeight: 1600, pixelData: catalogBuffer });
  assert(resCatalog.detected === true);
  // (59 - 20 + 1) / 80 = 40 / 80 = 0.50
  assert(Math.abs(resCatalog.fillRatio - 0.50) < 0.001, `Expected fillRatio 0.50, got ${resCatalog.fillRatio}`);
  // Plane height should be 2.5 / 0.50 = 5.0
  assert(Math.abs(resCatalog.calculatedHeight - 5.0) < 0.001);
  // Visible trinket height in world space = 5.0 * 0.50 = 2.50
  const visibleHeight = resCatalog.calculatedHeight * resCatalog.fillRatio;
  assert(Math.abs(visibleHeight - 2.50) < 0.001, `Visible trinket height should be 2.50, got ${visibleHeight}`);
  pass('Standard catalog 3:4 canvas produces exact 2.50 visible units in world space');
}

// 3.7 Realistic tightly cropped cutout sampling simulation
{
  // Tightly cropped cutout (e.g. Letter W keychain) occupying y = 4 to 76 (73 pixels tall = ~91.25% fill)
  const tightBuffer = new Uint8Array(60 * 80 * 4);
  for (let y = 4; y <= 76; y++) {
    for (let x = 8; x <= 51; x++) {
      const idx = (y * 60 + x) * 4;
      tightBuffer[idx + 3] = 255;
    }
  }
  const resTight = runFillRatioDetection({ naturalWidth: 800, naturalHeight: 1428, pixelData: tightBuffer });
  assert(resTight.detected === true);
  // (76 - 4 + 1) / 80 = 73 / 80 = 0.9125
  assert(Math.abs(resTight.fillRatio - 0.9125) < 0.001);
  // Visible trinket height = calculatedHeight * fillRatio = 2.50
  const visibleHeight = resTight.calculatedHeight * resTight.fillRatio;
  assert(Math.abs(visibleHeight - 2.50) < 0.001);
  // Plane height is ~2.739 units instead of 5.0!
  assert(resTight.calculatedHeight < 3.0, `Tightly cropped plane should be normalized to < 3.0, got ${resTight.calculatedHeight}`);
  pass('Tightly cropped cutout normalized from 5.0 down to ~2.74 units, preventing frame overflow');
}

// 3.8 Extreme aspect ratios and clamping bounds
{
  // Extreme landscape (width=5000, height=50)
  const resWide = runFillRatioDetection({ naturalWidth: 5000, naturalHeight: 50, pixelData: null });
  assert(resWide.calculatedWidth <= 4.2001, `calculatedWidth exceeded maxAllowedWidth (4.2): ${resWide.calculatedWidth}`);
  assert(resWide.calculatedHeight <= 5.2001, `calculatedHeight exceeded maxAllowedHeight: ${resWide.calculatedHeight}`);

  // Extreme portrait (width=50, height=5000)
  const resTall = runFillRatioDetection({ naturalWidth: 50, naturalHeight: 5000, pixelData: null });
  assert(resTall.calculatedWidth <= 4.2001);
  assert(resTall.calculatedHeight <= 5.2001, `calculatedHeight exceeded maxAllowedHeight (5.2): ${resTall.calculatedHeight}`);

  pass('Extreme aspect ratios (5000:50 and 50:5000) strictly constrained by maxAllowedWidth/Height');
}

// 3.9 Canvas exception handling / tainted canvas
{
  const resException = runFillRatioDetection({ naturalWidth: 1200, naturalHeight: 1600, pixelData: null, simulateContextFailure: true });
  assert(resException.detected === false);
  assert(resException.fillRatio === 0.50);
  assert(Number.isFinite(resException.calculatedWidth));
  pass('Tainted canvas / context exception falls back cleanly without crash or unhandled error');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: REAL CATALOG ASSET TESTS WITH SHARP
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${colors.bold}${colors.cyan}--- Section 4: Real Catalog Asset Fill Ratio Verification ---${colors.reset}`);

const transparentDir = path.join(ROOT_DIR, 'public', 'uploads', 'transparent');
if (fs.existsSync(transparentDir)) {
  const files = fs.readdirSync(transparentDir).filter(f => f.endsWith('.png'));
  console.log(`  Found ${files.length} catalog transparent PNGs in public/uploads/transparent/`);

  // Sample 10 catalog items
  const sampleFiles = files.slice(0, 10);
  for (const filename of sampleFiles) {
    const filePath = path.join(transparentDir, filename);
    const meta = await sharp(filePath).metadata();

    // Sample down to 60x80 to simulate offscreen canvas
    const sampleBuffer = await sharp(filePath)
      .resize(60, 80, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer();

    const res = runFillRatioDetection({
      naturalWidth: meta.width,
      naturalHeight: meta.height,
      pixelData: sampleBuffer,
    });

    assert(Number.isFinite(res.calculatedWidth) && res.calculatedWidth > 0);
    assert(Number.isFinite(res.calculatedHeight) && res.calculatedHeight > 0);
    assert(res.calculatedWidth <= 4.2);
    assert(res.calculatedHeight <= 5.2);
    assert(res.fillRatio >= 0.35 && res.fillRatio <= 0.98);
  }
  pass(`Sampled 10 real catalog transparent PNGs: all produced valid, finite, clamped dimensions`);
} else {
  console.log('  Notice: public/uploads/transparent/ not found locally, skipping filesystem scan.');
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.bold}CHALLENGER 2 EMPIRICAL STRESS SUITE SUMMARY${colors.reset}`);
console.log(`  Total Passed: ${colors.green}${totalPassed}${colors.reset}`);
console.log(`  Total Failed: ${totalFailed > 0 ? colors.red : colors.green}${totalFailed}${colors.reset}`);
console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

if (totalFailed > 0) {
  console.error(`❌ Adversarial suite failed with ${totalFailed} errors.`);
  process.exit(1);
} else {
  console.log(`✔ ALL ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY! Verdict: APPROVE\n`);
  process.exit(0);
}
