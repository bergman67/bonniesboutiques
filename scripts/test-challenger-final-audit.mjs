import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import { normalizeCutoutTo3x4Canvas, isolateWithSharp } from '../src/lib/image/isolation.ts';

const ROOT_DIR = process.cwd();
const prisma = new PrismaClient();

async function runChallengerAudit() {
  console.log('══════════════════════════════════════════════════════════════════════════');
  console.log(' FINAL CHALLENGER INDEPENDENT EMPIRICAL AUDIT SUITE');
  console.log(' Milestones 3 & 4: Scrollytelling Stage, Cutout Pipeline & Live Keychains');
  console.log('══════════════════════════════════════════════════════════════════════════\n');

  let passedTests = 0;
  let totalTests = 0;
  const failureList = [];

  async function test(name, fn) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
      failureList.push({ name, err });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GATE A: LevitatingProductViewer.tsx Stage Geometry & Obstruction Audit
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GATE A: 3D Stage Mesh & Obstruction Verification ---');

  await test('A.1: Zero cylinderGeometry meshes in LevitatingProductViewer.tsx', async () => {
    const filePath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'LevitatingProductViewer.tsx');
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/<cylinderGeometry/gi) || [];
    assert.strictEqual(matches.length, 0, `Expected 0 <cylinderGeometry>, found ${matches.length}`);
  });

  await test('A.2: Zero ringGeometry meshes in LevitatingProductViewer.tsx', async () => {
    const filePath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'LevitatingProductViewer.tsx');
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/<ringGeometry/gi) || [];
    assert.strictEqual(matches.length, 0, `Expected 0 <ringGeometry>, found ${matches.length}`);
  });

  await test('A.3: No visible pedestal meshes obscuring dangling charms', async () => {
    const filePath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'LevitatingProductViewer.tsx');
    const content = fs.readFileSync(filePath, 'utf8');
    // Ensure shadow mesh is invisible
    assert(
      content.includes('visible={false}') || !content.includes('shadowMeshRef'),
      'Shadow mesh must be hidden or removed'
    );
    // Ensure no legacy pedestal cylinder components are rendered
    assert(!content.includes('<cylinderGeometry args='), 'Cylinder geometry args must not exist');
  });

  await test('A.4: Dynamic fillRatio detection & bounds clamping in billboard plane', async () => {
    const filePath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'LevitatingProductViewer.tsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert(content.includes('fillRatio'), 'ProductCutoutTexturePlane must calculate dynamic fillRatio');
    assert(content.includes('maxAllowedWidth'), 'Must clamp plane width');
    assert(content.includes('maxAllowedHeight'), 'Must clamp plane height');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GATE B: Pipeline 3:4 Canvas Normalization, Fill-Ratio & De-Fringing
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GATE B: Smart Cutout Normalization Pipeline Empirical Stress Tests ---');

  await test('B.1: Normalization of standard elongated trinket', async () => {
    // 250x500 elongated trinket on 800x800 canvas
    const w = 800, h = 800;
    const buf = Buffer.alloc(w * h * 4, 0);
    for (let y = 150; y <= 650; y++) {
      for (let x = 275; x <= 525; x++) {
        const i = (y * w + x) * 4;
        buf[i] = 250; buf[i + 1] = 100; buf[i + 2] = 50; buf[i + 3] = 255;
      }
    }
    const inputPng = await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const normalized = await normalizeCutoutTo3x4Canvas(inputPng);
    const meta = await sharp(normalized).metadata();
    assert.strictEqual(meta.width, 1200);
    assert.strictEqual(meta.height, 1600);
    assert.strictEqual(meta.channels, 4);

    const { data } = await sharp(normalized).raw().toBuffer({ resolveWithObject: true });
    let minY = 1600, maxY = 0, minX = 1200, maxX = 0;
    for (let y = 0; y < 1600; y++) {
      for (let x = 0; x < 1200; x++) {
        const a = data[(y * 1200 + x) * 4 + 3];
        if (a > 25) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const fillH = (maxY - minY + 1) / 1600;
    const fillW = (maxX - minX + 1) / 1200;
    assert(fillH >= 0.48 && fillH <= 0.52, `fillH out of range: ${(fillH * 100).toFixed(2)}%`);
    assert(fillW <= 0.52, `fillW too wide: ${(fillW * 100).toFixed(2)}%`);
  });

  await test('B.2: Normalization of tall narrow beaded pen (aspect ratio stress)', async () => {
    // 60x700 tall object on 600x800 canvas
    const w = 600, h = 800;
    const buf = Buffer.alloc(w * h * 4, 0);
    for (let y = 50; y <= 750; y++) {
      for (let x = 270; x <= 330; x++) {
        const i = (y * w + x) * 4;
        buf[i] = 100; buf[i + 1] = 200; buf[i + 2] = 255; buf[i + 3] = 255;
      }
    }
    const inputPng = await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const normalized = await normalizeCutoutTo3x4Canvas(inputPng);
    const meta = await sharp(normalized).metadata();
    assert.strictEqual(meta.width, 1200);
    assert.strictEqual(meta.height, 1600);

    const { data } = await sharp(normalized).raw().toBuffer({ resolveWithObject: true });
    let minY = 1600, maxY = 0, minX = 1200, maxX = 0;
    for (let y = 0; y < 1600; y++) {
      for (let x = 0; x < 1200; x++) {
        const a = data[(y * 1200 + x) * 4 + 3];
        if (a > 25) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const fillH = (maxY - minY + 1) / 1600;
    const fillW = (maxX - minX + 1) / 1200;
    assert(fillH >= 0.48 && fillH <= 0.52, `Tall pen fillH must be ~50%, got ${(fillH * 100).toFixed(2)}%`);
    assert(fillW <= 0.52, `Tall pen fillW must be <= 52%, got ${(fillW * 100).toFixed(2)}%`);
  });

  await test('B.3: Normalization of wide horizontal charm (width-clamped stress)', async () => {
    // 700x80 wide object on 800x400 canvas
    const w = 800, h = 400;
    const buf = Buffer.alloc(w * h * 4, 0);
    for (let y = 160; y <= 240; y++) {
      for (let x = 50; x <= 750; x++) {
        const i = (y * w + x) * 4;
        buf[i] = 255; buf[i + 1] = 50; buf[i + 2] = 200; buf[i + 3] = 255;
      }
    }
    const inputPng = await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const normalized = await normalizeCutoutTo3x4Canvas(inputPng);
    const meta = await sharp(normalized).metadata();
    assert.strictEqual(meta.width, 1200);
    assert.strictEqual(meta.height, 1600);

    const { data } = await sharp(normalized).raw().toBuffer({ resolveWithObject: true });
    let minY = 1600, maxY = 0, minX = 1200, maxX = 0;
    for (let y = 0; y < 1600; y++) {
      for (let x = 0; x < 1200; x++) {
        const a = data[(y * 1200 + x) * 4 + 3];
        if (a > 25) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const fillH = (maxY - minY + 1) / 1600;
    const fillW = (maxX - minX + 1) / 1200;
    assert(fillW <= 0.521, `Wide charm fillW must not exceed 52%, got ${(fillW * 100).toFixed(2)}%`);
    assert(fillH <= 0.52, `Wide charm fillH must not exceed 52%, got ${(fillH * 100).toFixed(2)}%`);
  });

  await test('B.4: Zero-content empty canvas resilience', async () => {
    const emptyPng = await sharp({
      create: { width: 500, height: 500, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).png().toBuffer();
    const normalized = await normalizeCutoutTo3x4Canvas(emptyPng);
    const meta = await sharp(normalized).metadata();
    assert.strictEqual(meta.width, 1200);
    assert.strictEqual(meta.height, 1600);
  });

  await test('B.5: Tabletop gray halo decontamination check', async () => {
    // Generate foreground surrounded by low-saturation semi-transparent gray rim
    const w = 400, h = 400;
    const buf = Buffer.alloc(w * h * 4, 0);
    // Background tabletop color: r=128, g=128, b=128
    // Outer boundary has gray fringe (alpha 80, sat 0.05)
    for (let y = 80; y <= 320; y++) {
      for (let x = 80; x <= 320; x++) {
        const i = (y * w + x) * 4;
        const isBorder = (x < 100 || x > 300 || y < 100 || y > 300);
        if (isBorder) {
          buf[i] = 125; buf[i + 1] = 125; buf[i + 2] = 125; buf[i + 3] = 90; // semi-transparent gray
        } else {
          buf[i] = 240; buf[i + 1] = 180; buf[i + 2] = 20; buf[i + 3] = 255; // opaque gold trinket
        }
      }
    }
    const inputPng = await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const normalized = await normalizeCutoutTo3x4Canvas(inputPng);
    const { data } = await sharp(normalized).raw().toBuffer({ resolveWithObject: true });

    let grayFringeCount = 0;
    for (let i = 0; i < 1200 * 1600; i++) {
      const a = data[i * 4 + 3];
      if (a > 0 && a < 140) {
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
        const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
        if (sat < 0.20) grayFringeCount++;
      }
    }
    assert.strictEqual(grayFringeCount, 0, `Expected 0 gray fringe remnants, found ${grayFringeCount}`);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GATE C: Live Supabase W and Y Cutouts Deep Pixel Buffer Inspection
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GATE C: Live Supabase W and Y Keychains Deep Pixel Buffer Audit ---');

  const liveWUrl = 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/transparent/transparent-1792797228459-w.png';
  const liveYUrl = 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/transparent/transparent-1792799262887-IMG_1035.png';

  let wBuffer, yBuffer;

  await test('C.1: Live "Citrus Glow Letter W Keychain" HTTP 200 & buffer valid', async () => {
    const res = await fetch(liveWUrl);
    assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    wBuffer = Buffer.from(await res.arrayBuffer());
    assert(wBuffer.length > 50000, `Buffer too small: ${wBuffer.length} bytes`);
  });

  await test('C.2: Live W Keychain: 1200x1600 RGBA & 48%-52% fill ratio & 0 perimeter halo', async () => {
    const meta = await sharp(wBuffer).metadata();
    assert.strictEqual(meta.format, 'png');
    assert.strictEqual(meta.channels, 4);
    assert.strictEqual(meta.width, 1200);
    assert.strictEqual(meta.height, 1600);

    const { data, info } = await sharp(wBuffer).raw().toBuffer({ resolveWithObject: true });
    let minY = info.height, maxY = 0, minX = info.width, maxX = 0;
    let perimeterNonZero = 0;
    let grayFringe = 0;

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];

        if (a > 25) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }

        // Perimeter 5px boundary
        if (x < 5 || x >= info.width - 5 || y < 5 || y >= info.height - 5) {
          if (a > 0) perimeterNonZero++;
        }

        if (a > 0 && a < 140) {
          const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
          const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
          if (sat < 0.20) grayFringe++;
        }
      }
    }

    const fillH = (maxY - minY + 1) / info.height;
    const fillW = (maxX - minX + 1) / info.width;

    console.log(`    W Keychain: FillH=${(fillH * 100).toFixed(2)}%, FillW=${(fillW * 100).toFixed(2)}%, BoundingBox=[${maxX - minX + 1}x${maxY - minY + 1}], PerimeterNonZero=${perimeterNonZero}, GrayFringe=${grayFringe}`);

    assert(fillH >= 0.48 && fillH <= 0.52, `fillH must be 48%-52%, got ${(fillH * 100).toFixed(2)}%`);
    assert(fillW <= 0.52, `fillW must be <= 52%, got ${(fillW * 100).toFixed(2)}%`);
    assert.strictEqual(perimeterNonZero, 0, `Perimeter has ${perimeterNonZero} non-zero pixels`);
    assert.strictEqual(grayFringe, 0, `Found ${grayFringe} gray fringe pixels`);
  });

  await test('C.3: Live "Bright Candy Initial Y Keychain" HTTP 200 & buffer valid', async () => {
    const res = await fetch(liveYUrl);
    assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    yBuffer = Buffer.from(await res.arrayBuffer());
    assert(yBuffer.length > 50000, `Buffer too small: ${yBuffer.length} bytes`);
  });

  await test('C.4: Live Y Keychain: 1200x1600 RGBA & 48%-52% fill ratio & 0 perimeter halo', async () => {
    const meta = await sharp(yBuffer).metadata();
    assert.strictEqual(meta.format, 'png');
    assert.strictEqual(meta.channels, 4);
    assert.strictEqual(meta.width, 1200);
    assert.strictEqual(meta.height, 1600);

    const { data, info } = await sharp(yBuffer).raw().toBuffer({ resolveWithObject: true });
    let minY = info.height, maxY = 0, minX = info.width, maxX = 0;
    let perimeterNonZero = 0;
    let grayFringe = 0;

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];

        if (a > 25) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }

        // Perimeter 5px boundary
        if (x < 5 || x >= info.width - 5 || y < 5 || y >= info.height - 5) {
          if (a > 0) perimeterNonZero++;
        }

        if (a > 0 && a < 140) {
          const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
          const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
          if (sat < 0.20) grayFringe++;
        }
      }
    }

    const fillH = (maxY - minY + 1) / info.height;
    const fillW = (maxX - minX + 1) / info.width;

    console.log(`    Y Keychain: FillH=${(fillH * 100).toFixed(2)}%, FillW=${(fillW * 100).toFixed(2)}%, BoundingBox=[${maxX - minX + 1}x${maxY - minY + 1}], PerimeterNonZero=${perimeterNonZero}, GrayFringe=${grayFringe}`);

    assert(fillH >= 0.48 && fillH <= 0.52, `fillH must be 48%-52%, got ${(fillH * 100).toFixed(2)}%`);
    assert(fillW <= 0.52, `fillW must be <= 52%, got ${(fillW * 100).toFixed(2)}%`);
    assert.strictEqual(perimeterNonZero, 0, `Perimeter has ${perimeterNonZero} non-zero pixels`);
    assert.strictEqual(grayFringe, 0, `Found ${grayFringe} gray fringe pixels`);
  });

  await test('C.5: Adversarial Y Keychain Concavity Fork Transparency Inspection', async () => {
    // Specifically inspect the fork cavity of the Y charm
    const { data, info } = await sharp(yBuffer).raw().toBuffer({ resolveWithObject: true });

    let minY = info.height, maxY = 0, minX = info.width, maxX = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 25) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Charm letter "Y" is located in the bottom 30% of the bounding box
    const charmTop = Math.round(minY + (maxY - minY) * 0.70);
    const charmBottom = maxY;
    const charmLeft = minX;
    const charmRight = maxX;

    let transparentPixelsInCharmBox = 0;
    let opaquePixelsInCharmBox = 0;
    let trappedDeskPixels = 0;

    for (let y = charmTop; y <= charmBottom; y++) {
      for (let x = charmLeft; x <= charmRight; x++) {
        const idx = (y * info.width + x) * 4;
        const a = data[idx + 3];
        if (a === 0) {
          transparentPixelsInCharmBox++;
        } else {
          opaquePixelsInCharmBox++;
          // Check for gray desk pixels trapped inside
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
          const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
          if (sat < 0.15 && r > 80 && r < 200) {
            trappedDeskPixels++;
          }
        }
      }
    }

    console.log(`    Charm Box [Y ${charmTop}..${charmBottom}, X ${charmLeft}..${charmRight}]:`);
    console.log(`    - Transparent pixels: ${transparentPixelsInCharmBox}`);
    console.log(`    - Opaque pixels: ${opaquePixelsInCharmBox}`);
    console.log(`    - Trapped desk pixels: ${trappedDeskPixels}`);

    // Verify significant transparency within the bounding box of the charm (showing the concavities and fork are cleared)
    assert(transparentPixelsInCharmBox > 30000, `Expected concavity/air transparency in charm box > 30,000, got ${transparentPixelsInCharmBox}`);
    // Trapped desk pixels must be minimal (< 100, down from original 3157)
    assert(trappedDeskPixels < 100, `Trapped desk pixels must be < 100, got ${trappedDeskPixels}`);
  });

  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(` AUDIT COMPLETE: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('══════════════════════════════════════════════════════════════════════════\n');

  if (failureList.length > 0) {
    console.error('Failures encountered:');
    for (const f of failureList) {
      console.error(`- ${f.name}: ${f.err.message}`);
    }
    process.exit(1);
  }
}

runChallengerAudit()
  .catch((err) => {
    console.error('Fatal error during audit:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
