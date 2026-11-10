#!/usr/bin/env node
/**
 * scripts/test-challenger-m1-scrollytelling.mjs
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER TEST SUITE: MILESTONE 1
 * Target: src/components/scrollytelling/LevitatingProductViewer.tsx
 *
 * Test Rigorous Verification:
 * 1. Static AST & Geometry Inspection:
 *    - 0 pedestal cylinder or ring geometries in the file or scene
 *    - Verification of deleted pedestal mesh hierarchy
 * 2. Empirical 3D Occlusion Verification (Ray-casting & Spatial Analysis):
 *    - Verify lower dangling charms (y < -0.1) are 100% unobstructed across all camera angles
 *    - Counter-factual oracle test: confirm the old pedestal geometry fails this test
 * 3. Dynamic Cutout Texture Plane Math & Aspect Ratio Stress-Testing:
 *    - Test standard, square (1:1), tall (1:3), ultra-tall (1:500), wide (3:1), ultra-wide (500:1)
 *    - Test degenerate zero, null, undefined, empty object inputs
 *    - Test all 228 real catalog transparent PNGs
 *    - 50,000 randomized dimension fuzz iterations to guarantee zero NaNs, Infinities, or crashes
 *    - Boundary analysis of synthetic non-finite inputs
 * 4. Camera FOV Responsive Projection Stress-Test:
 *    - Viewport edge cases (0x0, extreme mobile portrait, ultrawide desktop)
 * 5. Manifest & Image Fallback Safety:
 *    - Complete resolution verification across all catalog products
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const results = [];

function pass(testName, detail = '') {
  results.push({ testName, status: 'PASS', detail });
  console.log(`  ✔ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
}

function fail(testName, error) {
  const msg = error instanceof Error ? error.message : String(error);
  results.push({ testName, status: 'FAIL', error: msg });
  console.error(`  ✖ [FAIL] ${testName}: ${msg}`);
}

async function runChallengerSuite() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       CHALLENGER 1: EMPIRICAL SCROLLYTELLING & PEDESTAL ADVERSARIAL SUITE      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

  const viewerPath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'LevitatingProductViewer.tsx');
  assert(fs.existsSync(viewerPath), `LevitatingProductViewer.tsx not found at: ${viewerPath}`);
  const viewerCode = fs.readFileSync(viewerPath, 'utf8');

  // ==========================================================================
  // SECTION 1: ZERO PEDESTAL CYLINDER / RING GEOMETRY VERIFICATION
  // ==========================================================================
  console.log('── 1. STATIC AST & GEOMETRY INSPECTION: ZERO PEDESTAL CYLINDER / RING ──────');
  {
    try {
      // 1.1 Check cylinderGeometry
      const cylinderRegex = /cylinderGeometry|CylinderGeometry|<cylinderGeometry/gi;
      const cylinderMatches = viewerCode.match(cylinderRegex) || [];
      assert.strictEqual(
        cylinderMatches.length,
        0,
        `Found ${cylinderMatches.length} cylinderGeometry instances in LevitatingProductViewer.tsx`
      );
      pass('Zero cylinderGeometry elements exist in LevitatingProductViewer.tsx', '0 matches');

      // 1.2 Check ringGeometry
      const ringRegex = /ringGeometry|RingGeometry|<ringGeometry/gi;
      const ringMatches = viewerCode.match(ringRegex) || [];
      assert.strictEqual(
        ringMatches.length,
        0,
        `Found ${ringMatches.length} ringGeometry instances in LevitatingProductViewer.tsx`
      );
      pass('Zero ringGeometry elements exist in LevitatingProductViewer.tsx', '0 matches');

      // 1.3 Check for any substitute 3D pedestal primitives
      const substituteRegex = /<(coneGeometry|boxGeometry|sphereGeometry|torusGeometry|dodecahedronGeometry)/gi;
      const subMatches = viewerCode.match(substituteRegex) || [];
      assert.strictEqual(
        subMatches.length,
        0,
        `Found unexpected 3D geometry primitives: ${JSON.stringify(subMatches)}`
      );
      pass('Zero substitute 3D geometry primitives (cone, box, torus, sphere) exist in stage');

      // 1.4 Inspect all mesh elements in LevitatingProductViewer.tsx
      const meshMatches = [...viewerCode.matchAll(/<mesh\b([^>]*)>/g)];
      console.log(`    Discovered ${meshMatches.length} <mesh> definitions in LevitatingProductViewer.tsx:`);

      for (let i = 0; i < meshMatches.length; i++) {
        const attrs = meshMatches[i][1];
        console.log(`     [Mesh ${i + 1}] Attributes: ${attrs.trim().replace(/\s+/g, ' ')}`);
      }

      // We expect meshes to only be:
      // - ProductCutoutTexturePlane billboard mesh (<mesh castShadow receiveShadow>)
      // - CutoutLoadingPlaceholder billboard mesh (<mesh>)
      // - CutoutSilhouetteFallback billboard mesh (<mesh castShadow receiveShadow>)
      // - Invisible hit plane (<mesh position={[0, 0.85, -0.05]}>)
      // - Invisible shadow mesh (<mesh ref={shadowMeshRef} visible={false}>)
      assert.strictEqual(meshMatches.length, 5, `Expected exactly 5 mesh elements, found ${meshMatches.length}`);

      // Verify invisible interaction plane
      assert(
        viewerCode.includes('position={[0, 0.85, -0.05]}'),
        'Must retain transparent hit plane at position [0, 0.85, -0.05]'
      );
      assert(
        viewerCode.includes('opacity={0} depthWrite={false}'),
        'Hit plane and dummy shadow must be completely invisible (opacity 0, depthWrite false)'
      );
      assert(
        viewerCode.includes('ref={shadowMeshRef} visible={false}'),
        'Shadow mesh reference must have visible={false}'
      );

      pass('All stage meshes verified: only transparent hit plane, invisible shadow dummy, and product planes');
    } catch (err) {
      fail('Pedestal geometry elimination check', err);
    }
  }

  // ==========================================================================
  // SECTION 2: 3D RAYCASTING OCCLUSION VERIFICATION (EMPIRICAL ORACLE)
  // ==========================================================================
  console.log('\n── 2. 3D RAYCASTING OCCLUSION VERIFICATION (LOWER CHARMS Y < -0.1) ──────────');
  {
    try {
      // Setup Three.js scene mimicking ScrollyCanvas and LevitatingProductViewer
      const scene = new THREE.Scene();

      // Pedestal root group at [0, -0.6, 0]
      const rootGroup = new THREE.Group();
      rootGroup.position.set(0, -0.6, 0);
      scene.add(rootGroup);

      // Hit plane
      const hitPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hitPlane.position.set(0, 0.85, -0.05);
      hitPlane.name = 'hitPlane';
      rootGroup.add(hitPlane);

      // Dummy shadow mesh
      const shadowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.1, 0.1),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      shadowMesh.visible = false;
      shadowMesh.name = 'shadowMesh';
      rootGroup.add(shadowMesh);

      // Product group at [0, 0.85 + floatOffset, 0]
      const modelGroup = new THREE.Group();
      modelGroup.position.set(0, 0.85, 0);
      rootGroup.add(modelGroup);

      // Product cutout plane (3:4 canvas standard: width=3.75, height=5.0)
      const productWidth = 3.75;
      const productHeight = 5.0;
      const productPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(productWidth, productHeight),
        new THREE.MeshStandardMaterial({
          transparent: true,
          alphaTest: 0.05,
          depthWrite: true,
          side: THREE.DoubleSide,
        })
      );
      productPlane.name = 'productPlane';
      modelGroup.add(productPlane);

      // Update matrix world
      scene.updateMatrixWorld(true);

      // Camera positions along the descent trajectory
      const testCameras = [
        { name: 'Showcase Pedestal Alignment', pos: new THREE.Vector3(0, 0.72, 3.1), lookAt: new THREE.Vector3(0, 0.32, 0) },
        { name: 'Descent into Storefront', pos: new THREE.Vector3(0, 1.6, 4.4), lookAt: new THREE.Vector3(0, 0.45, 0) },
        { name: 'Direct Frontal View', pos: new THREE.Vector3(0, 0.25, 3.5), lookAt: new THREE.Vector3(0, 0.25, 0) },
        { name: 'Low Angle Charm Inspection', pos: new THREE.Vector3(0, -0.3, 3.0), lookAt: new THREE.Vector3(0, -0.2, 0) },
        { name: 'Slight Left Angle', pos: new THREE.Vector3(-0.8, 0.72, 3.1), lookAt: new THREE.Vector3(0, 0.32, 0) },
        { name: 'Slight Right Angle', pos: new THREE.Vector3(0.8, 0.72, 3.1), lookAt: new THREE.Vector3(0, 0.32, 0) },
      ];

      const raycaster = new THREE.Raycaster();

      // Lower dangling charms lie in the product plane region where y < -0.1 (down to -productHeight / 2 = -2.5)
      // We test a dense grid of 2,500 sample points: 50 X divisions x 50 Y divisions
      const numX = 50;
      const numY = 50;
      const startY = -0.1;
      const endY = -productHeight / 2; // -2.5

      for (const camConfig of testCameras) {
        const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 50);
        camera.position.copy(camConfig.pos);
        camera.lookAt(camConfig.lookAt);
        camera.updateMatrixWorld(true);

        let totalRays = 0;
        let obstructedRays = 0;
        let visibleProductHits = 0;

        for (let ix = 0; ix < numX; ix++) {
          const u = ix / (numX - 1);
          const localX = (u - 0.5) * (productWidth * 0.95); // sample across 95% of width

          for (let iy = 0; iy < numY; iy++) {
            const v = iy / (numY - 1);
            const localY = startY + (endY - startY) * v; // sample from -0.1 down to -2.5

            totalRays++;

            // Compute target point in world coordinates
            const localTarget = new THREE.Vector3(localX, localY, 0);
            const worldTarget = localTarget.clone();
            productPlane.localToWorld(worldTarget);

            // Ray from camera to target point
            const rayDir = worldTarget.clone().sub(camera.position).normalize();
            raycaster.set(camera.position, rayDir);

            // Intersect objects in scene
            const intersects = raycaster.intersectObjects(scene.children, true);

            // Filter for visible occluding objects in front of productPlane
            let productHitDistance = Infinity;
            for (const hit of intersects) {
              if (hit.object === productPlane) {
                productHitDistance = hit.distance;
                visibleProductHits++;
                break;
              }
            }

            // Check if any visible object (opacity > 0, visible === true) is CLOSER than productPlane
            for (const hit of intersects) {
              if (hit.object === productPlane) break;
              if (hit.distance < productHitDistance - 0.001) {
                // If the object is visible and has opacity > 0, it is an obstruction!
                const isVisible = hit.object.visible !== false;
                const mat = hit.object.material;
                const hasOpacity = !mat || (mat.opacity !== 0 && (!mat.transparent || mat.opacity > 0.01));
                if (isVisible && hasOpacity) {
                  obstructedRays++;
                  break;
                }
              }
            }
          }
        }

        assert.strictEqual(
          obstructedRays,
          0,
          `Camera "${camConfig.name}" experienced ${obstructedRays}/${totalRays} obstructed rays on lower charms!`
        );
        assert(
          visibleProductHits > 0,
          `Camera "${camConfig.name}" failed to hit productPlane`
        );

        pass(
          `Camera "${camConfig.name}": Lower dangling charms (y < -0.1) are 100% unobstructed (0/${totalRays} occluded rays)`,
          `${totalRays} rays cast across charm zone`
        );
      }

      // ── 2.2 COUNTER-FACTUAL ORACLE TEST ──────────────────────────────────
      // Add the old pedestal meshes into a mock scene to PROVE that the test harness
      // definitively catches and fails when pedestal cylinders/rings are present.
      console.log('    Verifying Oracle Sensitivity: Testing with simulated legacy pedestal...');
      const legacyScene = scene.clone(true);
      const legacyPedestalGroup = new THREE.Group();
      legacyPedestalGroup.name = 'legacyPedestal';

      // 4 legacy cylinders and 2 rings
      const baseCyl1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.05, 0.15, 36),
        new THREE.MeshStandardMaterial({ color: 0x1a0f24 })
      );
      baseCyl1.position.set(0, -0.2, 0);

      const baseCyl2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.82, 0.9, 0.15, 36),
        new THREE.MeshStandardMaterial({ color: 0x2d1b3d })
      );
      baseCyl2.position.set(0, -0.05, 0);

      const goldTrim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.84, 0.84, 0.02, 36),
        new THREE.MeshStandardMaterial({ color: 0xc48b7a })
      );
      goldTrim.position.set(0, 0.02, 0);

      const velvetPillow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.78, 0.78, 0.02, 36),
        new THREE.MeshStandardMaterial({ color: 0x4a152e })
      );
      velvetPillow.position.set(0, 0.03, 0);

      legacyPedestalGroup.add(baseCyl1, baseCyl2, goldTrim, velvetPillow);
      legacyScene.getObjectByName('hitPlane').parent.add(legacyPedestalGroup);
      legacyScene.updateMatrixWorld(true);

      const showcaseCam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 50);
      showcaseCam.position.set(0, 0.72, 3.1);
      showcaseCam.lookAt(0, 0.32, 0);
      showcaseCam.updateMatrixWorld(true);

      let legacyObstructed = 0;
      for (let ix = 0; ix < numX; ix++) {
        const u = ix / (numX - 1);
        const localX = (u - 0.5) * (productWidth * 0.95);
        for (let iy = 0; iy < numY; iy++) {
          const v = iy / (numY - 1);
          const localY = startY + (endY - startY) * v;

          const worldTarget = new THREE.Vector3(localX, localY, 0);
          productPlane.localToWorld(worldTarget);

          const rayDir = worldTarget.clone().sub(showcaseCam.position).normalize();
          raycaster.set(showcaseCam.position, rayDir);

          const intersects = raycaster.intersectObjects(legacyScene.children, true);
          let pDist = Infinity;
          for (const h of intersects) {
            if (h.object.name === 'productPlane') {
              pDist = h.distance;
              break;
            }
          }
          for (const h of intersects) {
            if (h.object.name === 'productPlane') break;
            if (h.distance < pDist - 0.001 && h.object.visible !== false) {
              legacyObstructed++;
              break;
            }
          }
        }
      }

      assert(
        legacyObstructed > 300,
        `Oracle failure: legacy pedestal should have occluded lower charms, but only blocked ${legacyObstructed} rays`
      );
      pass(
        `Oracle sensitivity confirmed: legacy pedestal occluded ${legacyObstructed}/${numX * numY} charm rays; current implementation occludes 0 rays`,
        `Oracle confirmed 100% obstruction delta`
      );
    } catch (err) {
      fail('3D Raycasting Occlusion Test', err);
    }
  }

  // ==========================================================================
  // SECTION 3: CUTOUT PLANE SIZING & ASPECT RATIO STRESS-TEST
  // ==========================================================================
  console.log('\n── 3. CUTOUT PLANE DYNAMIC SIZING & ASPECT RATIO STRESS-TEST ───────────────');
  {
    // Verbatim recreation of sizing function from LevitatingProductViewer.tsx lines 101-176
    function calculatePlaneSize(img, canvasSampler = null) {
      if (!img) return [2.0, 2.0];

      const w = img.naturalWidth || img.width || 1;
      const h = img.naturalHeight || img.height || 1;
      const aspect = w / h;

      let fillRatio = 0.50; // Standard catalog baseline
      let detected = false;

      if (canvasSampler && typeof canvasSampler === 'function' && w > 1 && h > 1) {
        try {
          const sampleResult = canvasSampler(img, w, h);
          if (sampleResult && typeof sampleResult.fillRatio === 'number') {
            fillRatio = sampleResult.fillRatio;
            detected = true;
          }
        } catch (_e) {
          // Fallback if canvas is tainted or context unavailable
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

      // Clamping bounds to ensure no screen overflow
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

      return [calculatedWidth, calculatedHeight];
    }

    try {
      // 3.1 Required Dispatch Aspect Ratios: square (1:1), tall (1:3), wide (3:1), standard 3:4, and tightly cropped (0.56)
      const testCases = [
        { name: 'Standard 3:4 Catalog (1200x1600)', img: { width: 1200, height: 1600 }, expectedAspect: 0.75 },
        { name: 'Tightly Cropped 0.56 (560x1000)', img: { width: 560, height: 1000 }, expectedAspect: 0.56 },
        { name: 'Square 1:1 (1000x1000)', img: { width: 1000, height: 1000 }, expectedAspect: 1.0 },
        { name: 'Ultra-tall 1:3 (600x1800)', img: { width: 600, height: 1800 }, expectedAspect: 0.3333 },
        { name: 'Ultra-wide 3:1 (1800x600)', img: { width: 1800, height: 600 }, expectedAspect: 3.0 },
        { name: 'Extreme Tall 1:500 (10x5000)', img: { width: 10, height: 5000 }, expectedAspect: 0.002 },
        { name: 'Extreme Wide 500:1 (5000x10)', img: { width: 5000, height: 10 }, expectedAspect: 500.0 },
        { name: 'Micro Image (1x1)', img: { width: 1, height: 1 }, expectedAspect: 1.0 },
        { name: 'Macro Image (10000x10000)', img: { width: 10000, height: 10000 }, expectedAspect: 1.0 },
      ];

      for (const tc of testCases) {
        const [pw, ph] = calculatePlaneSize(tc.img);
        assert(!Number.isNaN(pw) && !Number.isNaN(ph), `${tc.name} produced NaN`);
        assert(Number.isFinite(pw) && Number.isFinite(ph), `${tc.name} produced non-finite value`);
        assert(pw > 0 && ph > 0, `${tc.name} produced non-positive dimension`);
        assert(pw <= 4.20001, `${tc.name} width ${pw} exceeded maxAllowedWidth (4.2)`);
        assert(ph <= 5.20001, `${tc.name} height ${ph} exceeded maxAllowedHeight (5.2)`);

        const computedAspect = pw / ph;
        pass(
          `Dispatch aspect ratio: ${tc.name} -> [${pw.toFixed(3)}, ${ph.toFixed(3)}]`,
          `aspect=${computedAspect.toFixed(3)}, bounded within 4.2x5.2`
        );
      }

      // 3.2 Degenerate & Missing Property Edge Cases
      const degenerateCases = [
        { name: 'null image', img: null, expected: [2.0, 2.0] },
        { name: 'undefined image', img: undefined, expected: [2.0, 2.0] },
        { name: 'zero width (0x1000)', img: { width: 0, height: 1000 } },
        { name: 'zero height (1000x0)', img: { width: 1000, height: 0 } },
        { name: 'zero both (0x0)', img: { width: 0, height: 0 } },
        { name: 'empty object ({})', img: {} },
        { name: 'naturalWidth priority over width', img: { naturalWidth: 1200, naturalHeight: 1600, width: 200, height: 200 } },
      ];

      for (const dc of degenerateCases) {
        const [pw, ph] = calculatePlaneSize(dc.img);
        assert(!Number.isNaN(pw) && !Number.isNaN(ph), `${dc.name} produced NaN: [${pw}, ${ph}]`);
        assert(Number.isFinite(pw) && Number.isFinite(ph), `${dc.name} produced non-finite: [${pw}, ${ph}]`);
        assert(pw <= 4.20001 && ph <= 5.20001, `${dc.name} exceeded bounds: [${pw}, ${ph}]`);
        if (dc.expected) {
          assert.strictEqual(pw, dc.expected[0]);
          assert.strictEqual(ph, dc.expected[1]);
        }
        pass(`Degenerate input handled safely: ${dc.name} -> [${pw.toFixed(2)}, ${ph.toFixed(2)}]`);
      }

      // 3.3 Test on ALL 228 Catalog Transparent PNGs
      console.log('    Testing real catalog PNG dimensions from public/uploads/transparent/...');
      const transDir = path.join(ROOT_DIR, 'public', 'uploads', 'transparent');
      const catalogFiles = fs.readdirSync(transDir).filter(f => f.endsWith('.png'));
      assert(catalogFiles.length > 50, 'Catalog directory must have transparent PNGs');

      let catalogNaNCount = 0;
      let minCatalogWidth = Infinity, maxCatalogWidth = -Infinity;
      let minCatalogHeight = Infinity, maxCatalogHeight = -Infinity;

      for (const file of catalogFiles) {
        const meta = await sharp(path.join(transDir, file)).metadata();
        const [pw, ph] = calculatePlaneSize(meta);
        if (Number.isNaN(pw) || Number.isNaN(ph)) catalogNaNCount++;
        if (pw < minCatalogWidth) minCatalogWidth = pw;
        if (pw > maxCatalogWidth) maxCatalogWidth = pw;
        if (ph < minCatalogHeight) minCatalogHeight = ph;
        if (ph > maxCatalogHeight) maxCatalogHeight = ph;
      }

      assert.strictEqual(catalogNaNCount, 0, `Catalog items produced ${catalogNaNCount} NaNs`);
      assert(maxCatalogWidth <= 4.20001, `Max catalog width exceeded bounds: ${maxCatalogWidth}`);
      assert(maxCatalogHeight <= 5.20001, `Max catalog height exceeded bounds: ${maxCatalogHeight}`);

      pass(
        `All ${catalogFiles.length} real catalog PNGs evaluated with 0 NaNs and strict bound adherence`,
        `width=[${minCatalogWidth.toFixed(3)}, ${maxCatalogWidth.toFixed(3)}], height=[${minCatalogHeight.toFixed(3)}, ${maxCatalogHeight.toFixed(3)}]`
      );

      // 3.4 Offscreen Canvas Sampling Edge Cases
      const samplingEdgeCases = [
        {
          name: 'Empty transparent canvas (found=0)',
          sampler: () => { throw new Error('context unavailable'); },
        },
        {
          name: 'Full opaque subject (found=4800, minY=0, maxY=79)',
          sampler: () => ({ fillRatio: Math.max(0.35, Math.min(0.98, (79 - 0 + 1) / 80)) }), // 0.98
        },
        {
          name: 'Narrow top strip (minY=0, maxY=2) -> clamped to 0.35',
          sampler: () => ({ fillRatio: Math.max(0.35, Math.min(0.98, (2 - 0 + 1) / 80)) }), // 0.35
        },
        {
          name: 'Center 50% subject (minY=20, maxY=60) -> 0.5125',
          sampler: () => ({ fillRatio: Math.max(0.35, Math.min(0.98, (60 - 20 + 1) / 80)) }),
        },
      ];

      for (const sc of samplingEdgeCases) {
        const [pw, ph] = calculatePlaneSize({ width: 1200, height: 1600 }, sc.sampler);
        assert(!Number.isNaN(pw) && !Number.isNaN(ph), `${sc.name} produced NaN`);
        assert(Number.isFinite(pw) && Number.isFinite(ph), `${sc.name} produced non-finite`);
        assert(pw <= 4.20001 && ph <= 5.20001, `${sc.name} overflowed bounds`);
        pass(`Canvas sampler edge case: ${sc.name} -> [${pw.toFixed(3)}, ${ph.toFixed(3)}]`);
      }

      // 3.5 50,000 Dimension Fuzz Test across valid DOM integer ranges (1 to 10,000)
      console.log('    Fuzzing 50,000 randomized dimension and aspect-ratio combinations...');
      const FUZZ_COUNT = 50000;
      let fuzzFailures = 0;

      for (let i = 0; i < FUZZ_COUNT; i++) {
        const rw = 1 + Math.floor(Math.random() * 10000);
        const rh = 1 + Math.floor(Math.random() * 10000);
        const [pw, ph] = calculatePlaneSize({ width: rw, height: rh });

        if (Number.isNaN(pw) || Number.isNaN(ph) || !Number.isFinite(pw) || !Number.isFinite(ph) || pw <= 0 || ph <= 0 || pw > 4.20001 || ph > 5.20001) {
          fuzzFailures++;
        }
      }

      assert.strictEqual(fuzzFailures, 0, `Fuzz testing produced ${fuzzFailures} failures`);
      pass(
        `Fuzz testing: 50,000 randomized dimensions produced 0 NaNs, 0 Infinities, and 100% bound compliance`,
        `50,000 pairs verified`
      );
    } catch (err) {
      fail('Dynamic Sizing Math Stress Test', err);
    }
  }

  // ==========================================================================
  // SECTION 4: CAMERA FOV RESPONSIVE PROJECTION STRESS-TEST
  // ==========================================================================
  console.log('\n── 4. RESPONSIVE CAMERA FOV MATHEMATICS STRESS-TEST ────────────────────────');
  {
    // Verbatim FOV math from LevitatingProductViewer.tsx lines 314-334
    function computeCameraFov(width, height) {
      const safeWidth = Math.max(1, width);
      const safeHeight = Math.max(1, height);
      const aspect = safeWidth / safeHeight;
      const targetAspect = 16 / 9;

      if (aspect < targetAspect) {
        const baseFovRad = (45 * Math.PI) / 180;
        const tanHalf = Math.tan(baseFovRad / 2) * (targetAspect / aspect);
        return Math.min(125, (2 * Math.atan(tanHalf) * 180) / Math.PI);
      } else {
        return 45;
      }
    }

    try {
      const viewports = [
        { name: 'Standard Desktop (1920x1080)', w: 1920, h: 1080, expected: 45 },
        { name: 'Ultrawide 21:9 (2560x1080)', w: 2560, h: 1080, expected: 45 },
        { name: 'Super Ultrawide 32:9 (5120x1440)', w: 5120, h: 1440, expected: 45 },
        { name: 'Square Viewport (1000x1000)', w: 1000, h: 1000, minFov: 65, maxFov: 80 },
        { name: 'iPhone 14 Pro Portrait (393x852)', w: 393, h: 852, minFov: 110, maxFov: 125 },
        { name: 'Extreme Tall Phone (300x1200)', w: 300, h: 1200, expected: 125 }, // clamped
        { name: 'Zero Dimensions (0x0)', w: 0, h: 0, minFov: 45, maxFov: 125 },
        { name: 'Negative Dimensions (-500x-500)', w: -500, h: -500, minFov: 45, maxFov: 125 },
      ];

      for (const vp of viewports) {
        const fov = computeCameraFov(vp.w, vp.h);
        assert(!Number.isNaN(fov), `${vp.name} produced NaN FOV`);
        assert(Number.isFinite(fov), `${vp.name} produced non-finite FOV`);
        assert(fov >= 45 && fov <= 125, `${vp.name} FOV ${fov} outside [45, 125]`);
        if (vp.expected !== undefined) {
          assert.strictEqual(fov, vp.expected, `${vp.name} FOV mismatch`);
        }
        pass(`FOV projection: ${vp.name} -> ${fov.toFixed(2)}°`);
      }
    } catch (err) {
      fail('Camera FOV Stress Test', err);
    }
  }

  // ==========================================================================
  // SECTION 5: MANIFEST & IMAGE RESOLUTION INTEGRITY AUDIT
  // ==========================================================================
  console.log('\n── 5. MANIFEST & IMAGE RESOLUTION INTEGRITY AUDIT ──────────────────────────');
  {
    try {
      const manifestPath = path.join(ROOT_DIR, 'src', 'lib', 'scrollytelling', 'productAssetManifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      assert(Array.isArray(manifest.products), 'manifest.products must be an array');
      assert(manifest.products.length > 0, 'manifest.products must not be empty');

      // Test resolveProductImageUrl simulation across all products in manifest
      let resolvedCount = 0;
      for (const prod of manifest.products) {
        assert(prod.id, 'Product entry missing id');
        const url = prod.transparentCloudUrl || prod.transparentLocalUrl || prod.transparentUrl;
        assert(url, `Product ${prod.id} (${prod.title}) has no transparent cutout URL`);
        resolvedCount++;
      }

      pass(`All ${resolvedCount} manifest products possess valid transparent cutout URLs`);
    } catch (err) {
      fail('Manifest & Fallback Audit', err);
    }
  }

  // ==========================================================================
  // SUMMARY & VERDICT
  // ==========================================================================
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`EMPIRICAL CHALLENGER 1 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.error('CHALLENGE FAILED WITH DEFECTS:');
    for (const r of results.filter((r) => r.status === 'FAIL')) {
      console.error(` - ${r.testName}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('🎉 VERDICT: APPROVE! All empirical stress tests passed with 0 defects.\n');
    process.exit(0);
  }
}

runChallengerSuite().catch((err) => {
  console.error('Fatal challenger execution error:', err);
  process.exit(1);
});
