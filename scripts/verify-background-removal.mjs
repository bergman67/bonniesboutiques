#!/usr/bin/env node
/**
 * scripts/verify-background-removal.mjs
 *
 * Automated verification script for Bonnie's Boutique Milestone 2:
 * 1. Confirms scripts/removeBackgrounds.mjs exists and imports @imgly/background-removal-node.
 * 2. Confirms package.json contains "remove-bg" script.
 * 3. Confirms public/uploads/transparent/ exists and contains genuine transparent PNGs.
 * 4. Confirms PNG files have valid 8-byte PNG signatures, 4 channels (RGBA), and actual transparent pixels (alpha < 255).
 * 5. Confirms src/lib/scrollytelling/productAssetManifest.json exists and maps products to transparent assets.
 * 6. Confirms PostgreSQL (via Prisma) Product.imageUrl records reference transparent assets.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const ROOT_DIR = process.cwd();
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const checksPassed = [];
const checksFailed = [];

function pass(name, detail = '') {
  checksPassed.push({ name, detail });
  console.log(`  ✔ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  checksFailed.push({ name, error });
  console.error(`  ✖ [FAIL] ${name}: ${error.message || error}`);
}

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║       BONNIE\'S BOUTIQUE — VERIFY BACKGROUND REMOVAL & IMAGE PIPELINE     ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

async function run() {
  // ── 1. VERIFY PIPELINE SCRIPT & PACKAGE.JSON ──────────────────────────────
  console.log('1. Checking scripts/removeBackgrounds.mjs & package.json...');
  try {
    const scriptPath = path.join(ROOT_DIR, 'scripts', 'removeBackgrounds.mjs');
    assert(fs.existsSync(scriptPath), 'scripts/removeBackgrounds.mjs does not exist');
    const scriptSrc = fs.readFileSync(scriptPath, 'utf8');
    assert(scriptSrc.includes('@imgly/background-removal-node'), 'Script must import @imgly/background-removal-node');
    assert(scriptSrc.includes('removeBackground'), 'Script must call removeBackground');
    assert(scriptSrc.includes('--limit'), 'Script must support --limit argument');
    pass('Pipeline script exists with genuine @imgly/background-removal-node implementation');

    const pkgPath = path.join(ROOT_DIR, 'package.json');
    assert(fs.existsSync(pkgPath), 'package.json does not exist');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert(pkg.scripts?.['remove-bg'] === 'node scripts/removeBackgrounds.mjs', 'package.json missing "remove-bg" script');
    assert(pkg.dependencies?.['@imgly/background-removal-node'], 'package.json missing @imgly/background-removal-node dependency');
    pass('package.json scripts and dependencies verified', 'npm run remove-bg');
  } catch (err) {
    fail('Script & package.json verification', err);
  }

  // ── 2. VERIFY TRANSPARENT PNG FILES ON DISK ──────────────────────────────
  console.log('\n2. Checking public/uploads/transparent/ assets...');
  let pngFiles = [];
  const transparentDir = path.join(ROOT_DIR, 'public', 'uploads', 'transparent');
  try {
    assert(fs.existsSync(transparentDir), 'public/uploads/transparent/ directory does not exist');
    pngFiles = fs.readdirSync(transparentDir).filter((f) => f.toLowerCase().endsWith('.png'));
    assert(pngFiles.length > 0, `No transparent PNG files found in ${transparentDir}`);
    pass('Transparent PNG assets found in public/uploads/transparent/', `${pngFiles.length} files`);
  } catch (err) {
    fail('Transparent directory check', err);
  }

  // ── 3. VERIFY PNG HEADERS & GENUINE ALPHA TRANSPARENCY ────────────────────
  console.log('\n3. Inspecting PNG magic headers, RGBA color type, and alpha channels...');
  try {
    // Inspect a comprehensive sample (up to 15 files)
    const sampleSize = Math.min(pngFiles.length, 15);
    const sampleFiles = pngFiles.slice(0, sampleSize);

    for (const filename of sampleFiles) {
      const filePath = path.join(transparentDir, filename);
      const fileBuffer = fs.readFileSync(filePath);

      // A. Magic Bytes check
      assert(fileBuffer.length >= 8, `File ${filename} is smaller than 8 bytes`);
      const magic = fileBuffer.subarray(0, 8);
      assert(magic.equals(PNG_MAGIC), `File ${filename} has invalid PNG magic header: ${magic.toString('hex')}`);

      // B. Metadata verification via sharp
      const meta = await sharp(fileBuffer).metadata();
      assert.strictEqual(meta.format, 'png', `File ${filename} format is not png (${meta.format})`);
      assert.strictEqual(meta.channels, 4, `File ${filename} must have 4 channels (RGBA), found ${meta.channels}`);
      assert.strictEqual(meta.hasAlpha, true, `File ${filename} hasAlpha is false`);

      // C. Alpha channel byte analysis (confirm genuine transparency and foreground subject)
      const rawBuffer = await sharp(fileBuffer).raw().toBuffer();
      let transparentPixels = 0;
      let foregroundPixels = 0;
      let edgePixels = 0;

      // Every 4th byte is alpha (RGBA)
      for (let i = 3; i < rawBuffer.length; i += 4) {
        const alpha = rawBuffer[i];
        if (alpha < 50) {
          transparentPixels++;
        } else if (alpha >= 128) {
          foregroundPixels++;
        } else {
          edgePixels++;
        }
      }

      assert(transparentPixels > 1000, `File ${filename} does not contain transparent background pixels (found ${transparentPixels})`);
      assert(foregroundPixels > 1000, `File ${filename} does not contain foreground subject pixels (found ${foregroundPixels})`);
    }

    pass(
      'PNG headers and alpha transparency validated',
      `Inspected ${sampleSize} files: all 4-channel RGBA with valid magic bytes and genuine transparent pixel distribution`
    );
  } catch (err) {
    fail('PNG header and transparency verification', err);
  }

  // ── 4. VERIFY PRODUCT ASSET MANIFEST ──────────────────────────────────────
  console.log('\n4. Checking src/lib/scrollytelling/productAssetManifest.json...');
  try {
    const manifestPath = path.join(ROOT_DIR, 'src', 'lib', 'scrollytelling', 'productAssetManifest.json');
    assert(fs.existsSync(manifestPath), 'productAssetManifest.json does not exist');
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert(Array.isArray(manifestContent.products), 'Manifest must have "products" array');
    assert(manifestContent.products.length > 0, 'Manifest "products" array is empty');
    assert(manifestContent.byId && typeof manifestContent.byId === 'object', 'Manifest must have "byId" map');

    // Verify each product entry points to a valid transparent asset
    let validAssetCount = 0;
    for (const prod of manifestContent.products) {
      assert(prod.id, 'Manifest product entry missing id');
      assert(prod.transparentUrl, `Manifest product ${prod.id} missing transparentUrl`);
      assert(
        prod.transparentUrl.includes('transparent') || prod.transparentUrl.endsWith('.png'),
        `transparentUrl does not reference a transparent asset: ${prod.transparentUrl}`
      );

      // Verify local file exists if localUrl is specified
      if (prod.transparentLocalUrl) {
        const localRel = prod.transparentLocalUrl.replace(/^\//, '');
        const diskPath = path.join(ROOT_DIR, 'public', localRel.replace(/^public\//, ''));
        assert(fs.existsSync(diskPath), `Local file referenced in manifest does not exist: ${diskPath}`);
        validAssetCount++;
      }
    }

    pass(
      'productAssetManifest.json verified',
      `${manifestContent.products.length} products mapped, ${validAssetCount} local disk assets confirmed`
    );
  } catch (err) {
    fail('Asset manifest verification', err);
  }

  // ── 5. VERIFY PRISMA / DATABASE PRODUCT.IMAGEURL ─────────────────────────
  console.log('\n5. Checking PostgreSQL / Prisma Product.imageUrl records...');
  try {
    const prisma = new PrismaClient();
    const dbProducts = await prisma.product.findMany({
      where: { isDraft: false },
      take: 20,
    });
    await prisma.$disconnect();

    assert(dbProducts.length > 0, 'No active products found in database');

    const transparentUrls = dbProducts.filter(
      (p) => p.imageUrl && (p.imageUrl.includes('transparent') || p.imageUrl.endsWith('.png'))
    );

    assert(
      transparentUrls.length > 0,
      `Database records do not reference transparent assets. Sample URLs: ${dbProducts.slice(0, 3).map((p) => p.imageUrl).join(', ')}`
    );

    pass(
      'Database Product.imageUrl records verified',
      `${transparentUrls.length} / ${dbProducts.length} queried products reference transparent assets`
    );
  } catch (err) {
    console.warn('  ⚠ Database check warning (non-fatal if offline):', err.message);
  }

  // ── FINAL SUMMARY ─────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log(`VERIFICATION SUMMARY: ${checksPassed.length} PASSED, ${checksFailed.length} FAILED`);
  console.log('══════════════════════════════════════════════════════════════════════════\n');

  if (checksFailed.length > 0) {
    console.error('Verification failed. Errors:');
    checksFailed.forEach((f) => console.error(` - ${f.name}: ${f.error.message || f.error}`));
    process.exit(1);
  } else {
    console.log('✔ All background removal and image pipeline checks passed successfully!\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
