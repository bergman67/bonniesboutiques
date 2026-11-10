import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { isolateWithSharp, normalizeCutoutTo3x4Canvas } from '../src/lib/image/isolation.ts';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fvhjotdrsqlgitlkouwz.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in environment');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const prisma = new PrismaClient();

const PRODUCTS_TO_REPROCESS = [
  {
    id: 'cmvll7oap0000sdql72r4z621',
    name: 'Citrus Glow Letter W Keychain',
    rawUrl: 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/raw/raw-1792797228459-w.jpg',
    storagePath: 'transparent/transparent-1792797228459-w.png',
    localFilename: 'transparent-1792797228459-w.png',
    expectedPublicUrl: 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/transparent/transparent-1792797228459-w.png',
  },
  {
    id: 'cmvlmo03n0000s1l0b5hx04ds',
    name: 'Bright Candy Initial Y Keychain',
    rawUrl: 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/raw/raw-1792799262887-IMG_1035.jpg',
    storagePath: 'transparent/transparent-1792799262887-IMG_1035.png',
    localFilename: 'transparent-1792799262887-IMG_1035.png',
    expectedPublicUrl: 'https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/transparent/transparent-1792799262887-IMG_1035.png',
  },
];

async function measureCutout(buffer, label) {
  const meta = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  let semiTransCount = 0;
  let semiTransGray = 0;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a > 25) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      if (a > 0 && a < 140) {
        semiTransCount++;
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
        if (sat < 0.20) semiTransGray++;
      }
    }
  }

  const fillH = (maxY - minY + 1) / info.height;
  const fillW = (maxX - minX + 1) / info.width;

  console.log(`[${label}] Dimensions: ${info.width}x${info.height}, BBox: ${maxX - minX + 1}x${maxY - minY + 1}`);
  console.log(`[${label}] fillH: ${(fillH * 100).toFixed(2)}%, fillW: ${(fillW * 100).toFixed(2)}%`);
  console.log(`[${label}] semiTransCount: ${semiTransCount}, semiTransGray: ${semiTransGray}`);

  return { width: info.width, height: info.height, fillH, fillW, semiTransGray };
}

async function main() {
  console.log('=== Step 1: Reprocessing W and Y Raw Photos ===');

  const localUploadsDir = path.resolve(process.cwd(), 'public', 'uploads', 'transparent');
  await fs.promises.mkdir(localUploadsDir, { recursive: true });

  for (const item of PRODUCTS_TO_REPROCESS) {
    console.log(`\nFetching raw photo for ${item.name} (${item.rawUrl})...`);
    const resp = await fetch(item.rawUrl);
    if (!resp.ok) {
      throw new Error(`Failed to fetch ${item.rawUrl}: status ${resp.status}`);
    }
    const rawBuffer = Buffer.from(await resp.arrayBuffer());
    console.log(`Downloaded ${rawBuffer.length} bytes.`);

    console.log(`Isolating background for ${item.name}...`);
    const isolated = await isolateWithSharp(rawBuffer);

    console.log(`Normalizing to 1200x1200 canvas for ${item.name}...`);
    const normalized = await normalizeCutoutTo3x4Canvas(isolated, {
      canvasWidth: 1200,
      canvasHeight: 1200,
      targetFillH: 0.86,
      maxFillW: 0.86,
      deFringe: true,
      removePockets: true,
    });

    const metrics = await measureCutout(normalized, item.name);
    if (metrics.width !== 1200 || metrics.height !== 1200) {
      throw new Error(`Invalid dimensions for ${item.name}: ${metrics.width}x${metrics.height}`);
    }
    if (Math.max(metrics.fillH, metrics.fillW) < 0.80 || Math.max(metrics.fillH, metrics.fillW) > 0.90) {
      throw new Error(`fill out of bounds for ${item.name}: fillH=${metrics.fillH}, fillW=${metrics.fillW}`);
    }

    // Upload to Supabase Storage
    console.log(`Uploading to Supabase Storage: bucket 'products', path '${item.storagePath}'...`);
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(item.storagePath, normalized, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed for ${item.storagePath}: ${uploadError.message}`);
    }
    console.log(`Successfully uploaded ${item.storagePath} to Supabase Storage.`);

    // Write to local mirror
    const localPath = path.join(localUploadsDir, item.localFilename);
    await fs.promises.writeFile(localPath, normalized);
    console.log(`Saved local mirror at ${localPath}`);

    // Update PostgreSQL record ONLY if it still exists (never resurrect items Bonnie deleted!)
    const existing = await prisma.product.findUnique({ where: { id: item.id } });
    if (existing) {
      const updated = await prisma.product.update({
        where: { id: item.id },
        data: {
          imageUrl: item.expectedPublicUrl,
        },
      });
      console.log(`Updated product in DB: id=${updated.id}, title="${updated.title}", imageUrl="${updated.imageUrl}"`);
    }
  }

  const finalAll = await prisma.product.findMany();
  const finalPublished = await prisma.product.findMany({ where: { isDraft: false } });
  console.log(`\nFinal DB State: Total products = ${finalAll.length}, Published products = ${finalPublished.length}`);
  console.log('Reprocessing completed successfully (without resurrecting deleted items)!');
}

main()
  .catch((err) => {
    console.error('Fatal error in reprocess-and-sync:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
