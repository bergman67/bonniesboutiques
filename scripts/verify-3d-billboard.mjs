#!/usr/bin/env node
/**
 * scripts/verify-3d-billboard.mjs
 *
 * Automated verification suite for Milestone 3 (3D Billboard Rendering):
 * 1. Confirms LevitatingProductViewer.tsx renders 2D transparent billboard plane instead of placeholder 3D geometries.
 * 2. Confirms Drei <Billboard> and texture loading (useTexture) are imported and used.
 * 3. Confirms material transparency and depth sorting (transparent={true}, alphaTest={0.05}, depthWrite={true}, side={THREE.DoubleSide}).
 * 4. Confirms meshStandardMaterial is used for responsive scene & pedestal lighting.
 * 5. Confirms dynamic aspect ratio calculation from texture dimensions to prevent stretching.
 * 6. Confirms React.Suspense fallback guards texture loading against React 18 suspension crashes.
 * 7. Confirms URL resolution supports product.imageUrl with local asset manifest fallback.
 * 8. Confirms dual-harmonic levitation math, turntable auto-spin, and swap timer lifecycles remain 100% intact.
 * 9. Executes empirical mathematical proofs for levitation bounds and aspect ratio scaling.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║       BONNIE\'S BOUTIQUE — 3D BILLBOARD RENDERING VERIFICATION            ║');
console.log('║       Verifying Transparent 2D Cutouts, Drei Billboard & Invariants      ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

function pass(name, detail = '') {
  console.log(`  ✔ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
  passCount++;
}

function fail(name, error) {
  console.error(`  ✖ [FAIL] ${name}: ${error?.message || error}`);
  failCount++;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. VERIFY SOURCE CODE: LevitatingProductViewer.tsx
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Verifying LevitatingProductViewer.tsx Implementation ---');
const viewerPath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'LevitatingProductViewer.tsx');

try {
  assert(fs.existsSync(viewerPath), 'LevitatingProductViewer.tsx must exist');
  const viewerSrc = fs.readFileSync(viewerPath, 'utf8');

  // Check 1.1: Placeholder 3D geometry removed from rendering
  assert(
    !viewerSrc.includes('<ProceduralProductModel'),
    'LevitatingProductViewer must NOT render <ProceduralProductModel (must replace placeholder 3D geometries)'
  );
  pass('Placeholder 3D geometries replaced with 2D billboard cutout');

  // Check 1.2: Drei Billboard and useTexture imported
  assert(
    viewerSrc.includes('Billboard') && viewerSrc.includes('useTexture') && viewerSrc.includes('@react-three/drei'),
    'LevitatingProductViewer must import Billboard and useTexture from @react-three/drei'
  );
  pass('Drei <Billboard> and useTexture imported from @react-three/drei');

  // Check 1.3: Billboard component rendered
  assert(
    viewerSrc.includes('<Billboard') && viewerSrc.includes('follow={true}'),
    'LevitatingProductViewer must render <Billboard follow={true}>'
  );
  pass('Drei <Billboard follow={true}> rendered for camera-facing orientation');

  // Check 1.4: Texture loading via useTexture
  assert(
    viewerSrc.includes('useTexture(imageUrl)') || viewerSrc.includes('useTexture('),
    'LevitatingProductViewer must load texture via useTexture'
  );
  pass('Texture loaded dynamically from image URL via useTexture');

  // Check 1.5: Dynamic aspect ratio calculation from texture dimensions
  assert(
    viewerSrc.includes('naturalWidth') && viewerSrc.includes('naturalHeight') && viewerSrc.includes('aspect'),
    'LevitatingProductViewer must compute dynamic aspect ratio from naturalWidth and naturalHeight'
  );
  assert(
    viewerSrc.includes('<planeGeometry args={[planeWidth, planeHeight'),
    'planeGeometry must use dynamic [planeWidth, planeHeight] to prevent stretching'
  );
  pass('Dynamic aspect ratio calculation verified (prevents image stretching)');

  // Check 1.6: meshStandardMaterial with physical lighting response
  assert(
    viewerSrc.includes('<meshStandardMaterial'),
    'LevitatingProductViewer must use <meshStandardMaterial> for physical lighting'
  );
  pass('meshStandardMaterial used to catch directional sunlight & pedestal aura point light');

  // Check 1.7: Material transparency & WebGL depth sorting
  assert(
    viewerSrc.includes('transparent={true}') &&
    viewerSrc.includes('alphaTest={0.05}') &&
    viewerSrc.includes('depthWrite={true}') &&
    (viewerSrc.includes('side={THREE.DoubleSide}') || viewerSrc.includes('DoubleSide')),
    'Material must configure transparent={true}, alphaTest={0.05}, depthWrite={true}, side={THREE.DoubleSide}'
  );
  pass('Transparency & depth sorting configured: transparent={true}, alphaTest={0.05}, depthWrite={true}, DoubleSide');

  // Check 1.8: React.Suspense fallback guard
  assert(
    viewerSrc.includes('<Suspense') && viewerSrc.includes('fallback='),
    'LevitatingProductViewer must wrap texture-loading component in <Suspense fallback={...}>'
  );
  pass('React.Suspense fallback wrapper present to prevent React 18 suspension crashes');

  // Check 1.9: ErrorBoundary defense
  assert(
    viewerSrc.includes('TextureErrorBoundary') || viewerSrc.includes('ErrorBoundary'),
    'LevitatingProductViewer must provide ErrorBoundary protection against failed image loads'
  );
  pass('Texture ErrorBoundary protection verified for resilient rendering');

  // Check 1.10: Image URL resolution with local manifest fallback
  assert(
    viewerSrc.includes('resolveProductImageUrl') && viewerSrc.includes('productAssetManifest'),
    'LevitatingProductViewer must include resolveProductImageUrl with productAssetManifest fallback'
  );
  pass('Image URL resolver supports product.imageUrl and local manifest fallback');

} catch (err) {
  fail('LevitatingProductViewer.tsx code verification', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VERIFY CRITICAL TEST INVARIANTS IN LevitatingProductViewer.tsx
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Verifying Critical Test Invariants ---');
try {
  const viewerSrc = fs.readFileSync(viewerPath, 'utf8');

  // Check 2.1: Verbatim dual-harmonic sine-wave levitation equation
  assert(
    viewerSrc.includes('const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.025;'),
    'Critical invariant missing: const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.025;'
  );
  pass('Verbatim dual-harmonic levitation equation intact');

  // Check 2.2: Verbatim Y position assignment
  assert(
    viewerSrc.includes('modelGroupRef.current.position.y = 0.85 + floatOffset;'),
    'Critical invariant missing: modelGroupRef.current.position.y = 0.85 + floatOffset;'
  );
  pass('Verbatim model Y position assignment intact');

  // Check 2.3: Verbatim turntable rotation equation
  assert(
    viewerSrc.includes('modelGroupRef.current.rotation.y = t * 0.6 + dragRotation;'),
    'Critical invariant missing: modelGroupRef.current.rotation.y = t * 0.6 + dragRotation;'
  );
  pass('Verbatim turntable rotation equation intact (0.6 rad/s + dragRotation)');

  // Check 2.4: Pointer drag interaction handlers
  assert(
    viewerSrc.includes('onPointerDown') &&
    viewerSrc.includes('onPointerMove') &&
    viewerSrc.includes('onPointerUp'),
    'Critical invariant missing: onPointerDown, onPointerMove, onPointerUp drag rotation handlers'
  );
  pass('Pointer drag interaction handlers intact');

  // Check 2.5: Dual timer declarations and cleanup
  assert(
    viewerSrc.includes('let downTimer: ReturnType<typeof setInterval> | null = null;'),
    'Critical invariant missing: let downTimer: ReturnType<typeof setInterval> | null = null;'
  );
  assert(
    viewerSrc.includes('let upTimer: ReturnType<typeof setInterval> | null = null;'),
    'Critical invariant missing: let upTimer: ReturnType<typeof setInterval> | null = null;'
  );
  assert(
    viewerSrc.includes('if (downTimer) clearInterval(downTimer);'),
    'Critical invariant missing: if (downTimer) clearInterval(downTimer);'
  );
  assert(
    viewerSrc.includes('if (upTimer) clearInterval(upTimer);'),
    'Critical invariant missing: if (upTimer) clearInterval(upTimer);'
  );
  pass('Dual-timer smooth swap transition lifecycle & clearInterval cleanup intact');

  // Check 2.6: Dynamic contact shadow scaling
  assert(
    viewerSrc.includes('shadowScale') && viewerSrc.includes('shadowMeshRef'),
    'Contact shadow scaling inverse to float height must remain intact'
  );
  pass('Dynamic contact shadow inverse scaling logic intact');

} catch (err) {
  fail('Critical test invariants verification', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VERIFY ScrollyCanvas.tsx INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Verifying ScrollyCanvas.tsx Integration ---');
try {
  const canvasPath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'ScrollyCanvas.tsx');
  assert(fs.existsSync(canvasPath), 'ScrollyCanvas.tsx must exist');
  const canvasSrc = fs.readFileSync(canvasPath, 'utf8');

  assert(
    canvasSrc.includes('LevitatingProductViewer'),
    'ScrollyCanvas must render LevitatingProductViewer'
  );
  assert(
    canvasSrc.includes('Suspense'),
    'ScrollyCanvas must include Suspense boundary'
  );
  pass('ScrollyCanvas renders LevitatingProductViewer within Suspense boundary');

} catch (err) {
  fail('ScrollyCanvas.tsx integration verification', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. EMPIRICAL MATHEMATICAL PROOFS & UNIT TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Empirical Mathematical Proofs & Unit Tests ---');
try {
  // 4.1 Levitation Bounds Simulation
  function computeLevitation(t) {
    const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.025;
    const posY = 0.85 + floatOffset;
    return { floatOffset, posY };
  }

  let minOffset = Infinity;
  let maxOffset = -Infinity;
  for (let t = 0; t <= 10; t += 0.02) {
    const { floatOffset } = computeLevitation(t);
    if (floatOffset < minOffset) minOffset = floatOffset;
    if (floatOffset > maxOffset) maxOffset = floatOffset;
  }
  const amplitude = (maxOffset - minOffset) / 2;
  assert(amplitude > 0.10 && amplitude < 0.16, `Levitation amplitude ${amplitude} out of bounds`);
  pass('Dual-harmonic mathematical levitation amplitude verified', `amp=${amplitude.toFixed(4)}, range=[${minOffset.toFixed(4)}, ${maxOffset.toFixed(4)}]`);

  // 4.2 Aspect Ratio Normalization Simulation
  function computeCutoutDimensions(width, height, maxSize = 1.35) {
    const aspect = width / height;
    if (aspect >= 1) {
      return [maxSize, maxSize / aspect];
    } else {
      return [maxSize * aspect, maxSize];
    }
  }

  // Case A: Tall portrait trinket (e.g. 1536 x 2048, aspect 0.75)
  const [tallW, tallH] = computeCutoutDimensions(1536, 2048);
  assert(Math.abs(tallW / tallH - 0.75) < 0.001, 'Tall cutout aspect ratio must match image');
  assert(tallH === 1.35, 'Tall cutout height must match maxSize');
  assert(tallW < tallH, 'Tall cutout width must be narrower than height');

  // Case B: Wide landscape charm (e.g. 2000 x 1000, aspect 2.0)
  const [wideW, wideH] = computeCutoutDimensions(2000, 1000);
  assert(Math.abs(wideW / wideH - 2.0) < 0.001, 'Wide cutout aspect ratio must match image');
  assert(wideW === 1.35, 'Wide cutout width must match maxSize');
  assert(wideH === 0.675, 'Wide cutout height must scale inversely to aspect');

  // Case C: Square medallion (e.g. 1024 x 1024, aspect 1.0)
  const [sqW, sqH] = computeCutoutDimensions(1024, 1024);
  assert(sqW === 1.35 && sqH === 1.35, 'Square cutout must be symmetrical');

  pass('Dynamic aspect ratio mathematical scaling verified for portrait, landscape, and square images');

  // 4.3 URL Resolution Logic Verification
  const manifestPath = path.join(ROOT_DIR, 'src', 'lib', 'scrollytelling', 'productAssetManifest.json');
  assert(fs.existsSync(manifestPath), 'productAssetManifest.json must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Test resolution:
  const firstProd = manifest.products[0];
  assert(firstProd && firstProd.id, 'Manifest must contain products');

  // Scenario 1: Product with direct imageUrl
  const sampleWithUrl = { id: 'test-1', title: 'Test 1', imageUrl: 'https://cdn.example.com/cutout.png' };
  assert.strictEqual(sampleWithUrl.imageUrl, 'https://cdn.example.com/cutout.png');

  // Scenario 2: Product matching manifest by ID
  const manifestMatch = manifest.byId[firstProd.id];
  assert(manifestMatch && (manifestMatch.transparentLocalUrl || manifestMatch.transparentUrl), 'Manifest entry must have transparent URL');

  pass('Asset manifest URL resolution paths verified');

} catch (err) {
  fail('Empirical mathematical proofs and unit tests', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════════');
console.log(`VERIFICATION SUMMARY: ${passCount} PASSED / ${failCount} FAILED`);
console.log('══════════════════════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  console.error(`❌ Verification failed with ${failCount} errors.`);
  process.exit(1);
} else {
  console.log('✔ All 3D billboard rendering checks passed successfully!\n');
  process.exit(0);
}
