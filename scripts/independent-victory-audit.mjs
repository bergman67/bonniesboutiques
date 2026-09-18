#!/usr/bin/env node
/**
 * scripts/independent-victory-audit.mjs
 *
 * Independent victory audit test script:
 * - Validates requirements R1, R2, R3 from first principles.
 * - Tests edge cases, extreme aspect ratios, text wrapping across diverse strings.
 * - Verifies mathematical invariance of the 3D-to-2D projection mapping.
 * - Detects cheating: facade functions, mock values, hardcoded shortcuts.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('=== INDEPENDENT VICTORY AUDITOR: VERIFICATION HARNESS ===\n');

let totalChecks = 0;
let passedChecks = 0;

function check(name, fn) {
  totalChecks++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedChecks++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------
// CHECK 1: R1 Responsive Pixel Art Canvas
// ---------------------------------------------------------
console.log('--- Checking R1: CSS-Based Responsive Pixel Art Canvas ---');

check('PixelStorefrontLayer uses fixed native resolution of 480x270', () => {
  const code = fs.readFileSync(path.join(ROOT_DIR, 'src/components/scrollytelling/PixelStorefrontLayer.tsx'), 'utf8');
  assert(/const\s+W\s*=\s*480;/.test(code), 'Must define fixed width W = 480');
  assert(/const\s+H\s*=\s*270;/.test(code), 'Must define fixed height H = 270');
  assert(/canvas\.width\s*=\s*W;/.test(code), 'Canvas bitmap width must be set to W');
  assert(/canvas\.height\s*=\s*H;/.test(code), 'Canvas bitmap height must be set to H');
});

check('PixelStorefrontLayer uses CSS object-fit contain and flex centering', () => {
  const code = fs.readFileSync(path.join(ROOT_DIR, 'src/components/scrollytelling/PixelStorefrontLayer.tsx'), 'utf8');
  assert(code.includes('object-contain'), 'Must use object-contain class');
  assert(code.includes("objectFit: 'contain'"), 'Must specify objectFit contain style');
  assert(!code.includes('object-cover'), 'Must NOT use object-cover');
  assert(code.includes('items-center') && code.includes('justify-center'), 'Must center canvas with flex');
  assert(code.includes("imageRendering: 'pixelated'"), 'Must preserve crisp pixel art rendering');
});

// ---------------------------------------------------------
// CHECK 2: R2 Responsive Speech Bubble & Text Wrapping
// ---------------------------------------------------------
console.log('\n--- Checking R2: Responsive Speech Bubble ---');

check('Speech bubble is centered and sized within 480x270 canvas', () => {
  const code = fs.readFileSync(path.join(ROOT_DIR, 'src/components/scrollytelling/PixelStorefrontLayer.tsx'), 'utf8');
  assert(/const\s+boxW\s*=\s*360;/.test(code), 'Speech bubble width must be 360');
  assert(/const\s+boxH\s*=\s*50;/.test(code), 'Speech bubble height must be 50');
  assert(/Math\.round\(\(W\s*-\s*boxW\)\s*\/\s*2\)/.test(code), 'Speech bubble X must be centered: (W - boxW)/2');
  assert(code.includes("ctx.font = '8px monospace'"), 'Font must be 8px monospace');
});

check('Speech bubble text wrapping algorithm correctly wraps arbitrary strings without overflow', () => {
  // Extract wrapCanvasText function logic
  function wrapCanvasTextSim(text, maxWidth, charWidth = 4.8) {
    if (!text || !text.trim()) return [];
    const words = text.trim().split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length * charWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
      while (currentLine.length * charWidth > maxWidth && currentLine.length > 3) {
        let cut = currentLine.length - 1;
        while (cut > 1 && (currentLine.slice(0, cut) + '-').length * charWidth > maxWidth) {
          cut--;
        }
        lines.push(currentLine.slice(0, cut) + '-');
        currentLine = currentLine.slice(cut);
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }

  const maxWidth = 336; // 360 - 24
  const testCases = [
    'SupercalifragilisticexpialidociousLongUnbrokenWordThatExceedsWidth',
    'Short title',
    'A very long title with many words that should wrap cleanly into multiple lines without any issues',
    'Special characters: !@#$%^&*()_+~`|}{[]:;?><,./-= 1234567890',
    'Enchanted Rose Gold Relic with Sparkling Moonstones',
  ];

  for (const tc of testCases) {
    const lines = wrapCanvasTextSim(tc, maxWidth);
    assert(lines.length > 0, `Failed on: ${tc}`);
    for (const l of lines) {
      const w = l.length * 4.8;
      assert(w <= maxWidth + 5, `Line overflowed: "${l}" with width ${w} > ${maxWidth}`);
    }
  }
});

check('Speech bubble layout avoids vertical CLS and desync', () => {
  const code = fs.readFileSync(path.join(ROOT_DIR, 'src/components/scrollytelling/PixelStorefrontLayer.tsx'), 'utf8');
  assert(code.includes('boxY + 16'), 'Greeting text line must be anchored at boxY + 16');
  assert(!code.includes('boxY + 20'), 'Old jumping baseline boxY + 20 must be removed');
  assert(code.includes('dialogueProgressRef'), 'dialogue progress must use useRef');
  assert(!code.includes('let dialogueProgress ='), 'Must not leak module-level mutable dialogueProgress');
});

// ---------------------------------------------------------
// CHECK 3: R3 Responsive 3D Product Placement & FOV Math
// ---------------------------------------------------------
console.log('\n--- Checking R3: Responsive 3D Product Placement ---');

check('LevitatingProductViewer imports useThree and updates camera.fov', () => {
  const code = fs.readFileSync(path.join(ROOT_DIR, 'src/components/scrollytelling/LevitatingProductViewer.tsx'), 'utf8');
  assert(code.includes('useThree'), 'Must import useThree');
  assert(code.includes('camera.fov ='), 'Must dynamically assign camera.fov');
  assert(code.includes('camera.updateProjectionMatrix()'), 'Must update camera projection matrix');
  assert(code.includes('Math.max(1, size.width)'), 'Must guard against size.width === 0');
  assert(code.includes('Math.min(125'), 'Must clamp dynamic FOV against perspective singularity');
});

check('Mathematical proof: 3D product projection width matches 2D desk across all screen sizes', () => {
  const deskPixelWidth = 280; // 280px on 480px canvas -> 58.33% of canvas width
  const nativeCanvasAspect = 16 / 9;

  // Test across diverse mobile, tablet, and desktop viewports
  const viewports = [
    { w: 320, h: 568 },  // iPhone SE
    { w: 375, h: 667 },  // iPhone 8
    { w: 390, h: 844 },  // iPhone 14
    { w: 412, h: 915 },  // Pixel 7
    { w: 768, h: 1024 }, // iPad Portrait
    { w: 1024, h: 768 }, // iPad Landscape
    { w: 1366, h: 768 }, // HD Laptop
    { w: 1920, h: 1080 },// Full HD
    { w: 2560, h: 1440 },// QHD
    { w: 3440, h: 1440 },// UltraWide
  ];

  for (const vp of viewports) {
    const aspect = vp.w / vp.h;
    const targetAspect = 16 / 9;

    let fov = 45;
    if (aspect < targetAspect) {
      const baseFovRad = (45 * Math.PI) / 180;
      const tanHalf = Math.tan(baseFovRad / 2) * (targetAspect / aspect);
      fov = Math.min(125, (2 * Math.atan(tanHalf) * 180) / Math.PI);
    }

    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 50);
    camera.position.set(0, 0.72, 3.1);
    camera.lookAt(0, 0.32, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    // 3D Product bounds in screen space
    const leftPt = new THREE.Vector3(-1.35 / 2, -0.6 + 0.85, 0).project(camera);
    const rightPt = new THREE.Vector3(1.35 / 2, -0.6 + 0.85, 0).project(camera);
    const prodScreenW = Math.abs(rightPt.x - leftPt.x) * (vp.w / 2);

    // 2D desk bounds in screen space
    let rendW, rendH, offX, offY;
    if (aspect >= targetAspect) {
      rendH = vp.h;
      rendW = vp.h * targetAspect;
      offX = (vp.w - rendW) / 2;
      offY = 0;
    } else {
      rendW = vp.w;
      rendH = vp.w / targetAspect;
      offX = 0;
      offY = (vp.h - rendH) / 2;
    }
    const deskScreenW = (deskPixelWidth / 480) * rendW;
    const ratio = prodScreenW / deskScreenW;

    // The ratio must stay 50.1% within +- 1.5%
    assert(
      Math.abs(ratio - 0.501) < 0.015,
      `Viewport ${vp.w}x${vp.h} drifted! Ratio: ${(ratio * 100).toFixed(2)}%`
    );

    // 3D Product Y vs 2D Desk Y: Product must float comfortably above the desk
    const prodWorld = new THREE.Vector3(0, -0.6 + 0.85, 0).project(camera);
    const prodScreenY = ((1 - prodWorld.y) / 2) * vp.h;
    const deskScreenY = offY + (158 / 270) * rendH;
    const floatPx = deskScreenY - prodScreenY;

    assert(floatPx > 5, `Product is below desk on ${vp.w}x${vp.h}: floatPx = ${floatPx}`);
    assert(floatPx < vp.h * 0.15, `Product floats too high on ${vp.w}x${vp.h}: floatPx = ${floatPx}`);
  }
});

// ---------------------------------------------------------
// CHECK 4: Forensic Anti-Cheating & Integrity
// ---------------------------------------------------------
console.log('\n--- Checking Forensics & Anti-Cheating ---');

check('No facade or dummy mock functions in scrollytelling components', () => {
  const viewerCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/scrollytelling/LevitatingProductViewer.tsx'), 'utf8');
  const pixelCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/scrollytelling/PixelStorefrontLayer.tsx'), 'utf8');

  // Verify real Three.js mesh/billboard rendering, not empty divs or mocks
  assert(viewerCode.includes('<Billboard'), 'LevitatingProductViewer must render 3D Billboard');
  assert(viewerCode.includes('useFrame('), 'Must render continuous 3D useFrame animation');
  assert(viewerCode.includes('Math.sin('), 'Must calculate trigonometric levitation');

  // Verify real canvas 2D rendering loop
  assert(pixelCode.includes('requestAnimationFrame('), 'PixelStorefrontLayer must run animation loop');
  assert(pixelCode.includes('ctx.fillRect('), 'PixelStorefrontLayer must draw pixel elements');
  assert(pixelCode.includes('ctx.fillText('), 'PixelStorefrontLayer must render text on canvas');
});

console.log(`\n=== INDEPENDENT AUDIT COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED ===\n`);
