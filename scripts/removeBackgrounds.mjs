#!/usr/bin/env node
/**
 * scripts/removeBackgrounds.mjs
 *
 * Backend pipeline for Bonnie's Boutique:
 * Automatically strips backgrounds from product photos using @imgly/background-removal-node,
 * saves transparent PNGs locally into public/uploads/transparent/,
 * uploads them to Supabase Storage ('products' bucket under transparent/),
 * updates Prisma Product.imageUrl, and emits src/lib/scrollytelling/productAssetManifest.json.
 *
 * CLI Usage:
 *   node scripts/removeBackgrounds.mjs
 *   node scripts/removeBackgrounds.mjs --limit 5
 *   node scripts/removeBackgrounds.mjs --force
 *   node scripts/removeBackgrounds.mjs --concurrency 2
 *   node scripts/removeBackgrounds.mjs --skip-upload
 *   node scripts/removeBackgrounds.mjs --skip-db
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { removeBackground } from '@imgly/background-removal-node';

// PNG Magic Header Bytes: \x89PNG\r\n\x1a\n
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Parse CLI flags
function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let force = false;
  let skipUpload = false;
  let skipDb = false;
  let concurrency = 2;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--skip-upload') {
      skipUpload = true;
    } else if (arg === '--skip-db') {
      skipDb = true;
    } else if (arg === '--concurrency' && args[i + 1]) {
      concurrency = Math.max(1, parseInt(args[i + 1], 10));
      i++;
    } else if (arg.startsWith('--concurrency=')) {
      concurrency = Math.max(1, parseInt(arg.split('=')[1], 10));
    }
  }

  return { limit, force, skipUpload, skipDb, concurrency };
}

// Ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Verify a buffer has valid PNG header
function isValidPng(buffer) {
  if (!buffer || buffer.length < 8) return false;
  return buffer.subarray(0, 8).equals(PNG_MAGIC);
}

// Simple asynchronous queue for controlled concurrency
async function runWithConcurrency(items, concurrency, workerFn) {
  const results = [];
  let index = 0;

  async function nextWorker() {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      try {
        const res = await workerFn(item, currentIndex, items.length);
        results[currentIndex] = { success: true, ...res };
      } catch (err) {
        results[currentIndex] = { success: false, item, error: err.message || String(err) };
      }
    }
  }

  const workers = [];
  for (let w = 0; w < Math.min(concurrency, items.length); w++) {
    workers.push(nextWorker());
  }
  await Promise.all(workers);
  return results;
}

async function main() {
  const options = parseArgs();
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       BONNIE\'S BOUTIQUE — BACKGROUND REMOVAL & IMAGE PIPELINE            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
  console.log('Options:', options);

  const rootDir = process.cwd();
  const uploadsDir = path.join(rootDir, 'public', 'uploads');
  const transparentDir = path.join(uploadsDir, 'transparent');
  const manifestDir = path.join(rootDir, 'src', 'lib', 'scrollytelling');
  const manifestPath = path.join(manifestDir, 'productAssetManifest.json');

  ensureDir(uploadsDir);
  ensureDir(transparentDir);
  ensureDir(manifestDir);

  // Initialize Supabase Client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabase = null;
  if (supabaseUrl && supabaseKey && !options.skipUpload) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✔ Supabase Storage client initialized for bucket "products"');
    } catch (err) {
      console.warn('⚠ Could not initialize Supabase client:', err.message);
    }
  } else {
    console.log('ℹ Supabase upload skipped or credentials missing; local fallback will be used');
  }

  // Initialize Prisma Client
  let prisma = null;
  let products = [];
  if (!options.skipDb) {
    try {
      prisma = new PrismaClient();
      products = await prisma.product.findMany({
        orderBy: { createdAt: 'asc' },
      });
      console.log(`✔ Connected to database via Prisma: found ${products.length} products`);
    } catch (err) {
      console.warn('⚠ Prisma database connection failed:', err.message);
      prisma = null;
    }
  }

  // Scan local uploads directory for available files
  const localUploadFiles = fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir).filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return ext === '.jpeg' || ext === '.jpg' || ext === '.png';
      })
    : [];
  console.log(`✔ Found ${localUploadFiles.length} source images in public/uploads/`);

  // Build processing target list
  let itemsToProcess = [];

  if (products.length > 0) {
    // Database records available
    for (const prod of products) {
      const originalUrl = prod.imageUrl || '';
      let urlBasename = '';
      try {
        urlBasename = path.basename(new URL(originalUrl).pathname);
      } catch {
        urlBasename = path.basename(originalUrl);
      }

      // Extract stem without 'transparent-' and extension
      const stem = urlBasename.replace(/^transparent-/, '').replace(/\.[^.]+$/, '');
      const match = stem.match(/-(IMG_\d+)/i) || stem.match(/(IMG_\d+)/i);
      const imgCode = match ? match[1] : null;

      // Find best local source match
      let localSourceFile = localUploadFiles.find(
        (f) => f === `${stem}.JPEG` || f === `${stem}.jpg` || f === urlBasename
      );

      if (!localSourceFile && imgCode) {
        localSourceFile = localUploadFiles.find((f) => f.includes(imgCode));
      }

      itemsToProcess.push({
        id: prod.id,
        title: prod.title,
        price: prod.price,
        originalUrl: prod.imageUrl,
        stem,
        imgCode,
        localSourceFile: localSourceFile ? path.join(uploadsDir, localSourceFile) : null,
        localSourceBasename: localSourceFile || null,
        targetFilename: `transparent-${stem}.png`,
        targetPath: path.join(transparentDir, `transparent-${stem}.png`),
      });
    }
  } else {
    // Standalone fallback: iterate over public/uploads directly
    console.log('ℹ No DB records loaded; using local public/uploads files as product source');
    let count = 1;
    for (const file of localUploadFiles) {
      const stem = file.replace(/\.[^.]+$/, '');
      itemsToProcess.push({
        id: `local-prod-${count}`,
        title: `Product #${count}`,
        price: 8.0,
        originalUrl: `/uploads/${file}`,
        stem,
        imgCode: stem,
        localSourceFile: path.join(uploadsDir, file),
        localSourceBasename: file,
        targetFilename: `transparent-${stem}.png`,
        targetPath: path.join(transparentDir, `transparent-${stem}.png`),
      });
      count++;
    }
  }

  // Apply --limit
  if (options.limit < itemsToProcess.length) {
    console.log(`ℹ Applying limit: processing first ${options.limit} of ${itemsToProcess.length} items`);
    itemsToProcess = itemsToProcess.slice(0, options.limit);
  }

  console.log(`\nStarting background removal for ${itemsToProcess.length} items (concurrency: ${options.concurrency})...\n`);

  // Existing manifest data for merging
  let existingManifest = { products: [], byId: {}, byFilename: {} };
  if (fs.existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      // ignore
    }
  }

  // Worker function for each item
  async function processItem(item, idx, total) {
    const logPrefix = `[${idx + 1}/${total}] "${item.title}"`;
    const targetPath = item.targetPath;
    let pngBuffer = null;
    let skippedProcessing = false;

    // 1. Check if transparent PNG already exists and is valid
    if (!options.force && fs.existsSync(targetPath)) {
      try {
        const existingBuf = fs.readFileSync(targetPath);
        if (isValidPng(existingBuf) && existingBuf.length > 500) {
          pngBuffer = existingBuf;
          skippedProcessing = true;
          console.log(`${logPrefix}: Found existing transparent PNG (${(existingBuf.length / 1024).toFixed(1)} KB) - skipping removal`);
        }
      } catch {
        // re-generate if reading failed
      }
    }

    // 2. Perform background removal if not cached
    if (!pngBuffer) {
      console.log(`${logPrefix}: Stripping background with @imgly/background-removal-node...`);
      const startTime = Date.now();
      let inputSource = null;

      if (item.localSourceFile && fs.existsSync(item.localSourceFile)) {
        // Pass file URL for local file
        inputSource = pathToFileURL(item.localSourceFile).href;
      } else if (item.originalUrl && item.originalUrl.startsWith('http')) {
        console.log(`${logPrefix}: Local file not found, fetching from ${item.originalUrl}...`);
        const res = await fetch(item.originalUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${item.originalUrl}`);
        const arrayBuf = await res.arrayBuffer();
        inputSource = new Blob([arrayBuf], { type: 'image/jpeg' });
      } else {
        throw new Error(`No local or remote source available for ${item.title}`);
      }

      // Execute genuine neural background removal
      const blob = await removeBackground(inputSource, {
        model: 'medium',
        output: {
          format: 'image/png',
          quality: 0.85,
        },
      });

      const arrayBuf = await blob.arrayBuffer();
      pngBuffer = Buffer.from(arrayBuf);

      if (!isValidPng(pngBuffer)) {
        throw new Error(`Generated output for ${item.title} is not a valid PNG`);
      }

      // Save transparent PNG to disk
      fs.writeFileSync(targetPath, pngBuffer);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`${logPrefix}: Successfully created transparent PNG in ${elapsed}s (${(pngBuffer.length / 1024).toFixed(1)} KB)`);

      // If localSourceBasename differs, also write/copy local alias
      if (item.localSourceBasename) {
        const localStem = item.localSourceBasename.replace(/\.[^.]+$/, '');
        const altFilename = `transparent-${localStem}.png`;
        const altPath = path.join(transparentDir, altFilename);
        if (altPath !== targetPath) {
          fs.writeFileSync(altPath, pngBuffer);
        }
      }
    }

    // 3. Upload to Supabase Storage
    let transparentCloudUrl = null;
    let transparentLocalUrl = `/uploads/transparent/${item.targetFilename}`;
    let transparentUrl = transparentLocalUrl;

    if (supabase && !options.skipUpload) {
      try {
        const storagePath = `transparent/${item.targetFilename}`;
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(storagePath, pngBuffer, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) {
          console.warn(`${logPrefix}: Supabase upload warning:`, uploadError.message);
        } else {
          const { data } = supabase.storage.from('products').getPublicUrl(storagePath);
          transparentCloudUrl = data.publicUrl;
          transparentUrl = data.publicUrl; // Prefer Supabase public CDN URL for production/cross-origin
          console.log(`${logPrefix}: Uploaded to Supabase -> ${storagePath}`);
        }
      } catch (err) {
        console.warn(`${logPrefix}: Supabase upload exception:`, err.message);
      }
    }

    // 4. Update Prisma Database Record
    if (prisma && item.id && !options.skipDb) {
      try {
        await prisma.product.update({
          where: { id: item.id },
          data: { imageUrl: transparentUrl },
        });
        console.log(`${logPrefix}: Updated Prisma Product.imageUrl -> ${transparentUrl}`);
      } catch (err) {
        console.warn(`${logPrefix}: Prisma update warning:`, err.message);
      }
    }

    return {
      id: item.id,
      title: item.title,
      price: item.price,
      originalUrl: item.originalUrl,
      transparentUrl,
      transparentCloudUrl,
      transparentLocalUrl,
      filename: item.targetFilename,
      localPath: targetPath,
      sizeBytes: pngBuffer.length,
      skippedProcessing,
      processedAt: new Date().toISOString(),
    };
  }

  // Run the batch with concurrency control
  const executionResults = await runWithConcurrency(
    itemsToProcess,
    options.concurrency,
    processItem
  );

  // Compile Manifest
  const successItems = executionResults
    .filter((r) => r.success)
    .map((r) => {
      const { success, ...data } = r;
      return data;
    });

  const failureItems = executionResults.filter((r) => !r.success);

  // Merge into manifest
  const manifestProductsMap = new Map();
  if (Array.isArray(existingManifest.products)) {
    for (const p of existingManifest.products) {
      if (p.id) manifestProductsMap.set(p.id, p);
    }
  }
  for (const item of successItems) {
    if (item.id) manifestProductsMap.set(item.id, item);
  }

  const allManifestProducts = Array.from(manifestProductsMap.values());
  const byId = {};
  const byFilename = {};

  for (const prod of allManifestProducts) {
    if (prod.id) byId[prod.id] = prod;
    if (prod.filename) byFilename[prod.filename] = prod.transparentUrl;
    if (prod.originalUrl) {
      const origBasename = path.basename(prod.originalUrl);
      byFilename[origBasename] = prod.transparentUrl;
    }
  }

  const manifestData = {
    updatedAt: new Date().toISOString(),
    totalProducts: allManifestProducts.length,
    products: allManifestProducts,
    byId,
    byFilename,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');
  console.log(`\n✔ Saved product asset manifest to ${manifestPath} (${allManifestProducts.length} entries)`);

  // Disconnect DB
  if (prisma) {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  }

  // Print Summary
  console.log('\n========================================================================');
  console.log('SUMMARY OF BACKGROUND REMOVAL PIPELINE');
  console.log('========================================================================');
  console.log(`Total Target Items:  ${itemsToProcess.length}`);
  console.log(`Successfully Done:   ${successItems.length}`);
  console.log(`Failed:              ${failureItems.length}`);
  if (failureItems.length > 0) {
    console.log('\nErrors:');
    failureItems.forEach((f) => console.log(` - ${f.item.title}: ${f.error}`));
  }
  console.log('========================================================================\n');

  if (failureItems.length > 0 && successItems.length === 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal pipeline error:', err);
  process.exit(1);
});
