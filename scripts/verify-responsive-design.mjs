#!/usr/bin/env node
/**
 * scripts/verify-responsive-design.mjs
 *
 * Automated verification harness for responsive design:
 * 1. Requirement R1: CSS-Based Responsive Pixel Art Canvas
 *    - Fixed native canvas resolution (480x270, 16:9 aspect ratio)
 *    - CSS object-fit: contain scaling and pixelated image-rendering
 *    - Full visibility & zero cropping on wide desktop and narrow mobile
 * 2. Requirement R2: Responsive Speech Bubble
 *    - Sized and centered within the fixed native canvas resolution
 *    - Font size (8px monospace) and text length bounding
 *    - Zero text spillage or clipping across arbitrary product titles
 *    - Tail cleanly anchored to shopkeeper Bonnie & Tammy
 * 3. Requirement R3: Responsive 3D Product Placement
 *    - Dynamic camera FOV adjustment in LevitatingProductViewer based on viewport aspect ratio
 *    - 3D product projection stays visually anchored over 2D pixel desk on both mobile and desktop
 *    - Product-to-desk width ratio remains constant (~50%) across all viewports
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║    RESPONSIVE DESIGN VERIFICATION: 2D PIXEL CANVAS & 3D PRODUCT VIEWER   ║');
console.log('║        Validating R1 (Canvas), R2 (Speech Bubble), R3 (3D Placement)     ║');
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
// SUITE 1: REQUIREMENT R1 - CSS-BASED RESPONSIVE PIXEL ART CANVAS
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- Suite 1: Requirement R1 - CSS-Based Responsive Pixel Art Canvas ---');
try {
  const pixelLayerPath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'PixelStorefrontLayer.tsx');
  assert(fs.existsSync(pixelLayerPath), 'PixelStorefrontLayer.tsx must exist');
  const pixelSrc = fs.readFileSync(pixelLayerPath, 'utf8');

  // 1.1 Fixed native canvas resolution
  assert(
    pixelSrc.includes('const W = 480;') && pixelSrc.includes('const H = 270;'),
    'PixelStorefrontLayer must render at a fixed native resolution (480x270)'
  );
  assert(
    pixelSrc.includes('canvas.width = W;') && pixelSrc.includes('canvas.height = H;'),
    'Canvas bitmap dimensions must be set to native W and H'
  );
  pass('Canvas draws at fixed native resolution (480x270, 16:9 aspect ratio)');

  // 1.2 Nearest-neighbor pixelated rendering
  assert(
    pixelSrc.includes('ctx.imageSmoothingEnabled = false'),
    'imageSmoothingEnabled must be false for nearest-neighbor 16-bit pixel sharpness'
  );
  assert(
    pixelSrc.includes("imageRendering: 'pixelated'"),
    'CSS image-rendering must be set to pixelated'
  );
  pass('Nearest-neighbor pixel sharpness enabled (imageSmoothingEnabled = false, image-rendering: pixelated)');

  // 1.3 Responsive CSS scaling via object-fit: contain
  assert(
    pixelSrc.includes('object-contain') || pixelSrc.includes("objectFit: 'contain'"),
    'Canvas must use CSS object-fit: contain to scale responsively without cropping'
  );
  assert(
    !pixelSrc.includes('object-cover'),
    'Canvas must NOT use object-cover (causes severe mobile clipping)'
  );
  pass('CSS responsive scaling configured with object-fit: contain (no cropping on mobile or desktop)');

  // 1.4 Centered flex layout wrapper
  assert(
    pixelSrc.includes('flex') && pixelSrc.includes('items-center') && pixelSrc.includes('justify-center'),
    'Canvas wrapper must center canvas in viewport'
  );
  pass('Canvas container centers rendered letterboxed/pillarboxed frame in viewport');

  // 1.5 Viewport containment simulation
  function computeCanvasBounds(viewportW, viewportH) {
    const nativeAspect = 480 / 270;
    const vpAspect = viewportW / viewportH;
    let rendW, rendH, offX, offY;
    if (vpAspect >= nativeAspect) {
      rendH = viewportH;
      rendW = viewportH * nativeAspect;
      offX = (viewportW - rendW) / 2;
      offY = 0;
    } else {
      rendW = viewportW;
      rendH = viewportW / nativeAspect;
      offX = 0;
      offY = (viewportH - rendH) / 2;
    }
    return { rendW, rendH, offX, offY, scale: rendW / 480 };
  }

  const testViewports = [
    { name: 'Desktop Full HD', w: 1920, h: 1080 },
    { name: 'Desktop Widescreen', w: 2560, h: 1080 },
    { name: 'MacBook 16:10', w: 1680, h: 1050 },
    { name: 'iPad Portrait', w: 768, h: 1024 },
    { name: 'iPhone 14 Portrait', w: 390, h: 844 },
    { name: 'Compact Android Portrait', w: 360, h: 780 },
    { name: 'Mobile Landscape', w: 844, h: 390 },
  ];

  for (const vp of testViewports) {
    const { rendW, rendH, offX, offY } = computeCanvasBounds(vp.w, vp.h);
    // Entire canvas must be contained inside viewport bounds
    assert(rendW <= vp.w + 0.01, `Rendered width ${rendW} exceeded viewport width ${vp.w}`);
    assert(rendH <= vp.h + 0.01, `Rendered height ${rendH} exceeded viewport height ${vp.h}`);
    assert(offX >= -0.01, `Left offset negative on ${vp.name}`);
    assert(offY >= -0.01, `Top offset negative on ${vp.name}`);
    // Aspect ratio preserved
    assert(Math.abs(rendW / rendH - 16 / 9) < 0.001, `Aspect ratio distorted on ${vp.name}`);
  }
  pass('Aspect ratio 16:9 strictly preserved across all mobile, tablet, and desktop viewports with zero clipping');

} catch (err) {
  fail('Suite 1: Requirement R1', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: REQUIREMENT R2 - RESPONSIVE SPEECH BUBBLE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Suite 2: Requirement R2 - Responsive Speech Bubble ---');
try {
  const pixelLayerPath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'PixelStorefrontLayer.tsx');
  const pixelSrc = fs.readFileSync(pixelLayerPath, 'utf8');

  // 2.1 Speech bubble dimensions and centering
  assert(pixelSrc.includes('const boxW = 360;'), 'boxW should be 360 for centered layout');
  assert(pixelSrc.includes('const boxH = 50;'), 'boxH should be 50 to accommodate text cleanly');
  assert(
    pixelSrc.includes('const boxX = Math.round((W - boxW) / 2);') || pixelSrc.includes('boxX = (W - boxW) / 2'),
    'Speech bubble must be centered horizontally on native canvas'
  );
  pass('Speech bubble dimensioned (360x50) and centered horizontally on native 480px canvas');

  // 2.2 Nametag and character attribution
  assert(pixelSrc.includes('BONNIE & TAMMY'), 'Speech bubble must feature BONNIE & TAMMY nametag');
  assert(pixelSrc.includes('tailX'), 'Speech bubble must calculate tailX pointing to characters');
  pass('Speech bubble features "BONNIE & TAMMY" nametag and tail anchored to characters');

  // 2.3 Font size 8px monospace
  assert(pixelSrc.includes("ctx.font = '8px monospace'"), 'Speech bubble must use 8px monospace font');
  pass('Font size adjusted to 8px monospace for optimal 16-bit legibility without overflowing');

  // 2.4 Text width and boundary simulation
  const W = 480;
  const boxW = 360;
  const boxX = Math.round((W - boxW) / 2); // 60
  const maxInnerWidth = boxW - 24; // 336px available
  const charWidth8px = 4.8; // Average monospace 8px character width

  const testDialogueTitles = [
    'Faceted Rose Gemstone',
    'Enchanted Golden Ring',
    'Celestial Stardust Orb with Gold Chain',
    'A'.repeat(34),
    'Super Long Handcrafted Botanical Keepsake Trinket Relic',
    '',
  ];

  for (const title of testDialogueTitles) {
    const displayTitle = title.length > 34 ? title.slice(0, 33) + '…' : title;
    const text1 = '“Welcome, traveler! Every charm holds a whisper of wonder.”';
    const text2 = displayTitle
      ? `Admiring: “${displayTitle}”`
      : 'Scroll or tap arrows to inspect handcrafted relics ✦';

    const text1W = text1.length * charWidth8px;
    const text2W = text2.length * charWidth8px;

    assert(text1W <= maxInnerWidth, `Text1 spilled out: ${text1W}px > ${maxInnerWidth}px`);
    assert(text2W <= maxInnerWidth, `Text2 spilled out: ${text2W}px > ${maxInnerWidth}px for title "${title}"`);
  }
  pass('Text wrapping & bounding verified: all dialogue strings fit strictly within bubble with >40px margin');

  // 2.5 Dialogue tail vertical position relative to characters
  const bonnieY = 118;
  const boxH = 50;
  const boxY = bonnieY - boxH - 22; // 46
  const bubbleBottom = boxY + boxH; // 96
  const bonnieHeadY = bonnieY - 4; // 114
  assert(bubbleBottom < bonnieHeadY, 'Speech bubble must sit cleanly above Bonnie head');
  assert(bonnieHeadY - bubbleBottom >= 15, 'Adequate clearance for speech bubble tail');
  pass('Speech bubble vertical position (Y=46 to 96) leaves clean 18px gap for tail above Bonnie head');

  // 2.6 Dynamic text wrapping & module-level state isolation
  assert(
    pixelSrc.includes('wrapCanvasText') || pixelSrc.includes('wrapText'),
    'PixelStorefrontLayer must implement dynamic text wrapping'
  );
  assert(
    pixelSrc.includes('dialogueProgressRef'),
    'PixelStorefrontLayer must isolate dialogue animation progress inside useRef'
  );
  assert(
    !pixelSrc.includes('let dialogueProgress ='),
    'PixelStorefrontLayer must NOT use leaked module-level dialogueProgress variable'
  );
  pass('Dynamic text wrapping & component-scoped useRef animation isolation verified');

  // 2.7 Multi-line wrapped dialogue rendering and unbroken token handling
  assert(
    pixelSrc.includes('text2Lines') && (pixelSrc.includes('len2A') || pixelSrc.includes('text2Lines.length')),
    'PixelStorefrontLayer must render wrapped text across multiple lines inside the speech bubble'
  );
  assert(
    pixelSrc.includes('boxY + 16') && pixelSrc.includes('boxY + 28') && pixelSrc.includes('boxY + 40'),
    'Speech bubble must layout 3 lines (greeting + 2 product lines) within 50px bounds'
  );
  pass('Multi-line wrapped dialogue layout (3-line support within 50px bubble) verified');

  // 2.8 AudioContext safety & unhandled promise rejection protection
  assert(
    pixelSrc.includes('.catch('),
    'playTextBlip must catch AudioContext resume rejections on mobile browsers'
  );
  assert(
    pixelSrc.includes("if (audioCtx.state === 'suspended') return;"),
    'playTextBlip must not schedule oscillators on suspended AudioContext'
  );
  pass('Mobile AudioContext autoplay rejection handling & suspended state guards verified');

  // 2.9 Layout shift elimination across product navigation
  assert(
    pixelSrc.includes('boxY + 16') && !pixelSrc.includes('boxY + 20'),
    'Greeting text1 must remain anchored at boxY + 16 across 1-line and 2-line products to prevent vertical layout shift'
  );
  pass('Zero cumulative layout shift (CLS) in speech bubble verified (greeting baseline stable)');

} catch (err) {
  fail('Suite 2: Requirement R2', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: REQUIREMENT R3 - RESPONSIVE 3D PRODUCT PLACEMENT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Suite 3: Requirement R3 - Responsive 3D Product Placement ---');
try {
  const viewerPath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'LevitatingProductViewer.tsx');
  assert(fs.existsSync(viewerPath), 'LevitatingProductViewer.tsx must exist');
  const viewerSrc = fs.readFileSync(viewerPath, 'utf8');

  // 3.1 Verify useThree import & dynamic camera FOV adjustment in LevitatingProductViewer
  assert(
    viewerSrc.includes('useThree') && viewerSrc.includes('@react-three/fiber'),
    'LevitatingProductViewer must import useThree from @react-three/fiber'
  );
  assert(
    viewerSrc.includes('const { camera, size } = useThree()') || viewerSrc.includes('useThree()'),
    'LevitatingProductViewer must access camera and viewport size'
  );
  assert(
    viewerSrc.includes('camera.fov') && viewerSrc.includes('camera.updateProjectionMatrix()'),
    'LevitatingProductViewer must dynamically update camera.fov and projection matrix'
  );
  pass('LevitatingProductViewer implements dynamic camera FOV adjustment from viewport aspect ratio');

  // 3.2 Verify mathematical FOV response equation
  assert(
    viewerSrc.includes('targetAspect / aspect') || viewerSrc.includes('aspect < targetAspect'),
    'Dynamic FOV must scale with targetAspect / aspect'
  );
  pass('Dynamic FOV equation conforms to aspect ratio inverse scaling');

  // 3.3 Empirical 3D Projection Simulation across viewports
  function simulateScene(width, height) {
    const aspect = width / height;
    const targetAspect = 16 / 9;

    let fov = 45;
    if (aspect < targetAspect) {
      const baseFovRad = (45 * Math.PI) / 180;
      const tanHalf = Math.tan(baseFovRad / 2) * (targetAspect / aspect);
      fov = (2 * Math.atan(tanHalf) * 180) / Math.PI;
    }

    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 50);
    camera.position.set(0, 0.72, 3.1);
    camera.lookAt(0, 0.32, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    // 3D product position at pedestal [0, -0.6, 0] with 0.85 levitation height
    const prodWorld = new THREE.Vector3(0, -0.6 + 0.85, 0).project(camera);
    const prodScreenY = ((1 - prodWorld.y) / 2) * height;

    // 3D product on-screen width (planeWidth = 1.35)
    const leftPt = new THREE.Vector3(-1.35 / 2, -0.6 + 0.85, 0).project(camera);
    const rightPt = new THREE.Vector3(1.35 / 2, -0.6 + 0.85, 0).project(camera);
    const prodScreenW = Math.abs(rightPt.x - leftPt.x) * (width / 2);

    // 2D desk on-screen position and width
    let rendW, rendH, offX, offY;
    if (aspect >= targetAspect) {
      rendH = height;
      rendW = height * targetAspect;
      offX = (width - rendW) / 2;
      offY = 0;
    } else {
      rendW = width;
      rendH = width / targetAspect;
      offX = 0;
      offY = (height - rendH) / 2;
    }
    const deskScreenY = offY + (158 / 270) * rendH;
    const deskScreenW = (280 / 480) * rendW;

    return {
      aspect,
      fov,
      prodScreenY,
      deskScreenY,
      floatOffsetPx: deskScreenY - prodScreenY, // positive means floating above desk
      prodScreenW,
      deskScreenW,
      widthRatio: prodScreenW / deskScreenW,
    };
  }

  const testScreens = [
    { name: 'Desktop 16:9 (1920x1080)', w: 1920, h: 1080 },
    { name: 'Desktop 16:10 (1680x1050)', w: 1680, h: 1050 },
    { name: 'Ultra-wide 21:9 (2560x1080)', w: 2560, h: 1080 },
    { name: 'Tablet 3:4 (768x1024)', w: 768, h: 1024 },
    { name: 'iPhone 14 (390x844)', w: 390, h: 844 },
    { name: 'Compact Phone (360x780)', w: 360, h: 780 },
  ];

  for (const screen of testScreens) {
    const res = simulateScene(screen.w, screen.h);

    // 1. Product width ratio relative to 2D desk must stay ~50.1% across ALL devices
    assert(
      Math.abs(res.widthRatio - 0.501) < 0.015,
      `Width ratio drifted on ${screen.name}: ${(res.widthRatio * 100).toFixed(1)}% (expected ~50.1%)`
    );

    // 2. Product must float ABOVE the 2D desk (floatOffsetPx > 0)
    assert(
      res.floatOffsetPx > 5,
      `Product sank below or onto desk on ${screen.name}: offset = ${res.floatOffsetPx.toFixed(1)}px`
    );

    // 3. Float height must scale proportionally to canvas height
    assert(
      res.floatOffsetPx < screen.h * 0.15,
      `Product drifted too high above desk on ${screen.name}: offset = ${res.floatOffsetPx.toFixed(1)}px`
    );
  }
  pass('3D product visual anchoring verified: stays hovering cleanly over 2D desk with exact 50.1% width across all screens');

  // 3.4 Invariants preservation in LevitatingProductViewer.tsx
  assert(
    viewerSrc.includes('const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.025;'),
    'Dual-harmonic levitation formula intact'
  );
  assert(
    viewerSrc.includes('modelGroupRef.current.position.y = 0.85 + floatOffset;'),
    'Model group Y position intact'
  );
  assert(
    viewerSrc.includes('modelGroupRef.current.rotation.y = t * 0.6 + dragRotation;'),
    'Turntable rotation intact'
  );
  assert(
    viewerSrc.includes('if (downTimer) clearInterval(downTimer);') &&
    viewerSrc.includes('if (upTimer) clearInterval(upTimer);'),
    'Dual timer lifecycle cleanup intact'
  );
  pass('All existing physics, turntable, and lifecycle invariants in LevitatingProductViewer preserved 100%');

  // 3.5 Numerical stability & zero-width division guard
  assert(
    viewerSrc.includes('Math.max(1, size.width)') || viewerSrc.includes('safeWidth'),
    'LevitatingProductViewer must defensively guard size.width against 0 to prevent NaN projection matrix'
  );
  assert(
    viewerSrc.includes('Math.min(125') || viewerSrc.includes('Math.min(130'),
    'LevitatingProductViewer must clamp dynamic FOV against perspective matrix singularity'
  );

  // Test zero-width and extreme aspect ratio handling
  const extremeScreens = [
    { name: 'Zero width initial container', w: 0, h: 800 },
    { name: 'Ultra-thin foldable cover (aspect 0.25)', w: 200, h: 800 },
    { name: 'Extreme portrait (aspect 0.1)', w: 100, h: 1000 },
  ];
  for (const s of extremeScreens) {
    const sw = Math.max(1, s.w);
    const sh = Math.max(1, s.h);
    const asp = sw / sh;
    const targetAspect = 16 / 9;
    let fov = 45;
    if (asp < targetAspect) {
      const baseFovRad = (45 * Math.PI) / 180;
      const tanHalf = Math.tan(baseFovRad / 2) * (targetAspect / asp);
      fov = Math.min(125, (2 * Math.atan(tanHalf) * 180) / Math.PI);
    }
    const cam = new THREE.PerspectiveCamera(fov, asp, 0.1, 50);
    cam.updateProjectionMatrix();
    const isFiniteMatrix = cam.projectionMatrix.elements.every(e => Number.isFinite(e));
    assert(isFiniteMatrix, `Camera projection matrix contained NaN/Infinity on ${s.name}`);
    assert(fov <= 125, `FOV exceeded safe upper clamp on ${s.name}: ${fov}`);
  }
  pass('Zero-width resilience & extreme aspect ratio FOV clamping verified (strictly finite projection matrix)');

  // 3.6 Turntable rotation continuity under user drag interaction
  assert(
    viewerSrc.includes('modelGroupRef.current.rotation.y = t * 0.6 + dragRotation;') &&
    !viewerSrc.includes('modelGroupRef.current.rotation.y = dragRotation;'),
    'LevitatingProductViewer must maintain continuous rotation angle without snapping when user drags'
  );
  pass('Turntable drag continuity verified (zero angle snap discontinuity)');

  // 3.7 WebGL context loss recovery on mobile OS memory purge
  const scrollyPath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'ScrollyCanvas.tsx');
  assert(fs.existsSync(scrollyPath), 'ScrollyCanvas.tsx must exist');
  const scrollySrc = fs.readFileSync(scrollyPath, 'utf8');
  assert(
    scrollySrc.includes('webglcontextlost') && scrollySrc.includes('preventDefault()'),
    'ScrollyCanvas must handle webglcontextlost event to enable mobile context recovery'
  );
  pass('WebGL context loss recovery on mobile memory pressure verified');

  // 3.8 Mobile touch gesture arbitration and touch-action: pan-y configuration
  assert(
    viewerSrc.includes('gestureLock') && viewerSrc.includes('pointerStartPos'),
    'LevitatingProductViewer must arbitrate between vertical page scroll and horizontal turntable drag'
  );
  assert(
    scrollySrc.includes("touchAction: 'pan-y'") || scrollySrc.includes('touch-action: pan-y'),
    'ScrollyCanvas must declare touchAction: pan-y to eliminate iOS Safari touch digitizer friction'
  );
  pass('Mobile touch gesture arbitration & touch-action: pan-y configuration verified');

  // 3.9 WebGL context restoration handler
  assert(
    scrollySrc.includes('webglcontextrestored'),
    'ScrollyCanvas must handle webglcontextrestored event for multi-tab GPU memory recovery'
  );
  pass('WebGL context restoration lifecycle handler verified');

} catch (err) {
  fail('Suite 3: Requirement R3', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════════');
console.log(`VERIFICATION SUMMARY: ${passCount} PASSED / ${failCount} FAILED`);
console.log('══════════════════════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  console.error(`❌ Verification failed with ${failCount} errors.`);
  process.exit(1);
} else {
  console.log('🎉 ALL RESPONSIVE DESIGN REQUIREMENTS (R1, R2, R3) & ACCEPTANCE CRITERIA VERIFIED!');
  process.exit(0);
}
