import assert from 'node:assert';
import sharp from 'sharp';
import {
  normalizeCutoutTo3x4Canvas,
  cleanCutoutRgba,
  PNG_MAGIC,
} from '../src/lib/image/isolation.ts';

console.log('=== FORENSIC INTEGRITY AUDIT: MILESTONE 2 ===\n');

async function testNormalizationVariousDimensions() {
  console.log('--- TEST 1: 3:4 Canvas Normalization with Arbitrary Dimensions & Aspect Ratios ---');

  // Case A: Tall trinket (aspect ratio 1:3), simulating a beaded pen or long bookmark
  const tallW = 200;
  const tallH = 600;
  const tallBuf = Buffer.alloc(tallW * tallH * 4, 0);
  // Fill center 100x500 with bright magenta (R=255, G=20, B=180, A=255)
  for (let y = 50; y < 550; y++) {
    for (let x = 50; x < 150; x++) {
      const idx = (y * tallW + x) * 4;
      tallBuf[idx] = 255;
      tallBuf[idx + 1] = 20;
      tallBuf[idx + 2] = 180;
      tallBuf[idx + 3] = 255;
    }
  }
  const tallPng = await sharp(tallBuf, { raw: { width: tallW, height: tallH, channels: 4 } }).png().toBuffer();

  const normTall = await normalizeCutoutTo3x4Canvas(tallPng);
  const metaTall = await sharp(normTall).metadata();
  assert.strictEqual(metaTall.width, 1200, 'Output width must be exactly 1200');
  assert.strictEqual(metaTall.height, 1600, 'Output height must be exactly 1600');
  assert.strictEqual(metaTall.channels, 4, 'Output channels must be 4 (RGBA)');

  const { data: rawTall } = await sharp(normTall).raw().toBuffer({ resolveWithObject: true });
  let minY = 1600, maxY = 0, minX = 1200, maxX = 0;
  for (let y = 0; y < 1600; y++) {
    for (let x = 0; x < 1200; x++) {
      if (rawTall[(y * 1200 + x) * 4 + 3] > 25) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const fillHTall = (maxY - minY + 1) / 1600;
  const fillWTall = (maxX - minX + 1) / 1200;
  console.log(`Tall trinket output bbox: [${minX}, ${minY}] to [${maxX}, ${maxY}]`);
  console.log(`Tall fillH: ${(fillHTall * 100).toFixed(2)}%, fillW: ${(fillWTall * 100).toFixed(2)}%`);
  assert(fillHTall >= 0.48 && fillHTall <= 0.52, `fillHTall (${fillHTall}) must be within 48%-52%`);
  assert(fillWTall <= 0.52, `fillWTall (${fillWTall}) must be <= 52%`);

  // Check centering (top padding ~ bottom padding, left padding ~ right padding)
  const topPad = minY;
  const botPad = 1600 - 1 - maxY;
  const leftPad = minX;
  const rightPad = 1200 - 1 - maxX;
  console.log(`Centering pads: top=${topPad}, bot=${botPad}, left=${leftPad}, right=${rightPad}`);
  assert(Math.abs(topPad - botPad) <= 2, `Vertical centering delta must be <= 2px (got ${Math.abs(topPad - botPad)})`);
  assert(Math.abs(leftPad - rightPad) <= 2, `Horizontal centering delta must be <= 2px (got ${Math.abs(leftPad - rightPad)})`);
  console.log('✔ Case A (Tall trinket) PASS');

  // Case B: Wide trinket (aspect ratio 2:1), simulating a wide horizontal charm
  const wideW = 600;
  const wideH = 300;
  const wideBuf = Buffer.alloc(wideW * wideH * 4, 0);
  for (let y = 50; y < 250; y++) {
    for (let x = 50; x < 550; x++) {
      const idx = (y * wideW + x) * 4;
      wideBuf[idx] = 30;
      wideBuf[idx + 1] = 200;
      wideBuf[idx + 2] = 255;
      wideBuf[idx + 3] = 255;
    }
  }
  const widePng = await sharp(wideBuf, { raw: { width: wideW, height: wideH, channels: 4 } }).png().toBuffer();
  const normWide = await normalizeCutoutTo3x4Canvas(widePng);
  const metaWide = await sharp(normWide).metadata();
  assert.strictEqual(metaWide.width, 1200);
  assert.strictEqual(metaWide.height, 1600);

  const { data: rawWide } = await sharp(normWide).raw().toBuffer({ resolveWithObject: true });
  let wMinY = 1600, wMaxY = 0, wMinX = 1200, wMaxX = 0;
  for (let y = 0; y < 1600; y++) {
    for (let x = 0; x < 1200; x++) {
      if (rawWide[(y * 1200 + x) * 4 + 3] > 25) {
        if (x < wMinX) wMinX = x;
        if (x > wMaxX) wMaxX = x;
        if (y < wMinY) wMinY = y;
        if (y > wMaxY) wMaxY = y;
      }
    }
  }
  const fillHWide = (wMaxY - wMinY + 1) / 1600;
  const fillWWide = (wMaxX - wMinX + 1) / 1200;
  console.log(`Wide trinket fillH: ${(fillHWide * 100).toFixed(2)}%, fillW: ${(fillWWide * 100).toFixed(2)}%`);
  assert(fillWWide <= 0.525, `Wide trinket width fill (${fillWWide}) must be <= 52%`);
  assert(Math.abs(wMinX - (1200 - 1 - wMaxX)) <= 2, 'Wide trinket must be horizontally centered');
  assert(Math.abs(wMinY - (1600 - 1 - wMaxY)) <= 2, 'Wide trinket must be vertically centered');
  console.log('✔ Case B (Wide trinket) PASS');

  // Case C: Empty image (all alpha 0)
  const emptyBuf = Buffer.alloc(100 * 100 * 4, 0);
  const emptyPng = await sharp(emptyBuf, { raw: { width: 100, height: 100, channels: 4 } }).png().toBuffer();
  const normEmpty = await normalizeCutoutTo3x4Canvas(emptyPng);
  const metaEmpty = await sharp(normEmpty).metadata();
  assert.strictEqual(metaEmpty.width, 1200);
  assert.strictEqual(metaEmpty.height, 1600);
  console.log('✔ Case C (Empty transparent input) PASS');
}

async function testEdgeDeFringingAndPocketRemoval() {
  console.log('\n--- TEST 2: Edge De-Fringing and Concavity Pocket Removal ---');

  // Create an image:
  // - Background: Tabletop gray [128, 118, 110]
  // - Foreground: A cyan horseshoe/fork shape with colorful pixels (R=0, G=220, B=230, A=255)
  // - Inside the fork concavity: A trapped tabletop gray pocket (R=128, G=118, B=110, A=255, 30x30 pixels)
  // - Outer boundary of cyan shape: 2px weak alpha gray fringe (A=100, R=128, G=118, B=110)
  const W = 300;
  const H = 300;
  const buf = Buffer.alloc(W * H * 4, 0);

  // Background samples on perimeter so algorithm estimates bg color
  for (let x = 0; x < W; x++) {
    const top = (0 * W + x) * 4;
    buf[top] = 128; buf[top + 1] = 118; buf[top + 2] = 110; buf[top + 3] = 40;
    const bot = ((H - 1) * W + x) * 4;
    buf[bot] = 128; buf[bot + 1] = 118; buf[bot + 2] = 110; buf[bot + 3] = 40;
  }
  for (let y = 0; y < H; y++) {
    const left = (y * W + 0) * 4;
    buf[left] = 128; buf[left + 1] = 118; buf[left + 2] = 110; buf[left + 3] = 40;
    const right = (y * W + (W - 1)) * 4;
    buf[right] = 128; buf[right + 1] = 118; buf[right + 2] = 110; buf[right + 3] = 40;
  }

  // Draw U / fork shape in center (Y=80..220, X=80..220)
  for (let y = 80; y <= 220; y++) {
    for (let x = 80; x <= 220; x++) {
      const isLeftArm = (x >= 80 && x <= 110 && y <= 180);
      const isRightArm = (x >= 190 && x <= 220 && y <= 180);
      const isBottom = (y >= 180 && y <= 220);
      const isPocket = (x > 110 && x < 190 && y >= 110 && y <= 170);

      const idx = (y * W + x) * 4;
      if (isLeftArm || isRightArm || isBottom) {
        // High saturation cyan foreground
        buf[idx] = 0;
        buf[idx + 1] = 220;
        buf[idx + 2] = 230;
        buf[idx + 3] = 255;
      } else if (isPocket) {
        // Trapped concavity tabletop pocket! (Gray, low saturation, A=255)
        buf[idx] = 128;
        buf[idx + 1] = 118;
        buf[idx + 2] = 110;
        buf[idx + 3] = 255;
      }
    }
  }

  // Add 2px weak alpha tabletop fringe (A=100) around the outer left arm
  for (let y = 80; y <= 180; y++) {
    for (let x = 78; x < 80; x++) {
      const idx = (y * W + x) * 4;
      buf[idx] = 128;
      buf[idx + 1] = 118;
      buf[idx + 2] = 110;
      buf[idx + 3] = 100;
    }
  }

  // Count pixels before cleanCutoutRgba
  let preFringeCount = 0;
  for (let y = 80; y <= 180; y++) {
    for (let x = 78; x < 80; x++) {
      if (buf[(y * W + x) * 4 + 3] > 0) preFringeCount++;
    }
  }
  let prePocketOpaque = 0;
  for (let y = 110; y <= 170; y++) {
    for (let x = 111; x < 190; x++) {
      if (buf[(y * W + x) * 4 + 3] > 0) prePocketOpaque++;
    }
  }
  console.log(`Before clean: preFringeCount=${preFringeCount}, prePocketOpaque=${prePocketOpaque}`);
  assert.strictEqual(preFringeCount, (180 - 80 + 1) * 2, 'Pre-fringe pixels must exist');
  assert(prePocketOpaque > 500, 'Pre-pocket pixels must exist');

  // Run cleanCutoutRgba
  cleanCutoutRgba(buf, W, H, { deFringe: true, removePockets: true });

  // Count pixels after cleanCutoutRgba
  let postFringeCount = 0;
  for (let y = 80; y <= 180; y++) {
    for (let x = 78; x < 80; x++) {
      if (buf[(y * W + x) * 4 + 3] > 0) postFringeCount++;
    }
  }
  let postPocketOpaque = 0;
  for (let y = 110; y <= 170; y++) {
    for (let x = 111; x < 190; x++) {
      if (buf[(y * W + x) * 4 + 3] > 0) postPocketOpaque++;
    }
  }
  console.log(`After clean: postFringeCount=${postFringeCount}, postPocketOpaque=${postPocketOpaque}`);

  // Verify cyan foreground was NOT removed
  let cyanCount = 0;
  for (let y = 80; y <= 220; y++) {
    for (let x = 80; x <= 110; x++) {
      if (buf[(y * W + x) * 4 + 1] === 220 && buf[(y * W + x) * 4 + 3] === 255) cyanCount++;
    }
  }
  console.log(`Foreground cyan preserved: ${cyanCount} pixels`);
  assert(cyanCount > 1000, 'Foreground cyan trinket pixels must be preserved');
  assert.strictEqual(postFringeCount, 0, 'All weak gray fringe pixels must be clamped to 0');
  assert.strictEqual(postPocketOpaque, 0, 'Trapped concavity background pocket must be cleared via BFS');
  console.log('✔ Edge de-fringing and concavity pocket removal PASS');
}

async function testMagicPngHeader() {
  console.log('\n--- TEST 3: PNG Header Validation ---');
  assert(PNG_MAGIC.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'PNG_MAGIC matches RFC 2083 standard');
  console.log('✔ PNG_MAGIC constant verified');
}

async function testPureJsFallback() {
  console.log('\n--- TEST 4: Pure JS Fallback Mode (Synchronous PNG.sync / pure-JS buffer manipulation) ---');
  // We simulate pure JS by passing a buffer directly through PNG sync decoding and encoding
  // or testing cleanCutoutRgba with pure Uint8Array
  const W = 100;
  const H = 200;
  const rawData = new Uint8Array(W * H * 4);
  // Center foreground
  for (let y = 50; y < 150; y++) {
    for (let x = 30; x < 70; x++) {
      const idx = (y * W + x) * 4;
      rawData[idx] = 255;
      rawData[idx + 1] = 100;
      rawData[idx + 2] = 50;
      rawData[idx + 3] = 255;
    }
  }

  // Add fringe around boundary
  for (let y = 48; y < 50; y++) {
    for (let x = 30; x < 70; x++) {
      const idx = (y * W + x) * 4;
      rawData[idx] = 120;
      rawData[idx + 1] = 110;
      rawData[idx + 2] = 100;
      rawData[idx + 3] = 80;
    }
  }

  cleanCutoutRgba(rawData, W, H, { deFringe: true, removePockets: true });

  let fringeRemaining = 0;
  for (let y = 48; y < 50; y++) {
    for (let x = 30; x < 70; x++) {
      if (rawData[(y * W + x) * 4 + 3] > 0) fringeRemaining++;
    }
  }
  assert.strictEqual(fringeRemaining, 0, 'Pure JS Uint8Array de-fringing must clear weak fringe');
  console.log('✔ Pure JS Uint8Array cleanCutoutRgba PASS');
}

async function runAll() {
  await testNormalizationVariousDimensions();
  await testEdgeDeFringingAndPocketRemoval();
  await testMagicPngHeader();
  await testPureJsFallback();
  console.log('\n======================================================');
  console.log('ALL INDEPENDENT FORENSIC INTEGRITY CHECKS PASSED (4/4)');
  console.log('======================================================\n');
}

runAll().catch((err) => {
  console.error('\n❌ FORENSIC VERIFICATION FAILED:', err);
  process.exit(1);
});
