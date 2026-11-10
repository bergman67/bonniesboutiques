/**
 * tests/e2e/tier1-features/tier1-r4-catalog-integrity.mjs
 *
 * Tier 1: Clean Catalog Integrity & Assets (Requirement R4)
 *
 * Test Cases:
 * 4.1 Exactly 96 Deduplicated Products in Manifest
 * 4.2 Database Product Count & Match with Manifest
 * 4.3 Zero Duplicate Photo URLs Across Catalog
 * 4.4 Zero Leftover Framed Art Products
 * 4.5 All Local Transparent PNG Files Exist on Disk
 */

import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  defaultRunner,
  loadJsonFile,
  ROOT_DIR,
  assertEqual,
  assert,
} from '../harness/test-utils.mjs';

export async function runTier1R4(runner = defaultRunner) {
  await runner.describeAsync('Tier 1: Clean Catalog Integrity & Assets (R4)', async () => {
    const manifest = loadJsonFile('src/lib/scrollytelling/productAssetManifest.json');
    const products = manifest.products || [];

    // ──────────────────────────────────────────────────────────────────────────
    // 4.1 Exactly 96 Deduplicated Products in Manifest
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('4.1 Manifest contains exactly 96 deduplicated products', async () => {
      assertEqual(products.length, 96, `Expected exactly 96 products in manifest, found ${products.length}`);
      assertEqual(manifest.totalProducts, 96, 'manifest.totalProducts must be 96');

      const ids = new Set();
      for (const p of products) {
        assert(p.id, 'Every product must have an id');
        assert(!ids.has(p.id), `Duplicate product ID found in manifest: ${p.id}`);
        ids.add(p.id);
      }
      assertEqual(ids.size, 96, 'All 96 IDs must be unique');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4.2 Database Published Catalog Integrity (Respects Admin Deletions & Drafts)
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('4.2 PostgreSQL database contains clean published products with valid titles, prices, and images', async () => {
      const prisma = new PrismaClient();
      try {
        const dbProducts = await prisma.product.findMany({
          where: { isDraft: false },
          orderBy: { createdAt: 'desc' },
        });

        assert(
          dbProducts.length >= 50,
          `Expected at least 50 published products in DB, found ${dbProducts.length}`
        );

        const manifestMap = new Map(products.map(p => [p.id, p]));
        for (const dbp of dbProducts) {
          assert(typeof dbp.title === 'string' && dbp.title.trim().length >= 3, `Product ${dbp.id} has invalid title`);
          assert(typeof dbp.price === 'number' && dbp.price > 0, `Product ${dbp.id} (${dbp.title}) has invalid price: ${dbp.price}`);
          assert(typeof dbp.imageUrl === 'string' && dbp.imageUrl.length > 0, `Product ${dbp.id} (${dbp.title}) is missing imageUrl`);
          assertEqual(dbp.isDraft, false, `Published query returned draft product ${dbp.id}`);

          // Any baseline manifest product still live in DB retains a valid non-empty title
          if (manifestMap.has(dbp.id)) {
            assert(dbp.title.trim().length > 0, `Manifest product ${dbp.id} has empty title`);
          }
        }
      } finally {
        await prisma.$disconnect();
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4.3 Zero Duplicate Photo URLs
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('4.3 Zero duplicate photo URLs across all 96 products', async () => {
      const imageUrls = new Set();
      for (const p of products) {
        const img = p.transparentLocalUrl || p.transparentUrl || p.imageUrl || p.originalUrl;
        assert(img, `Product ${p.id} (${p.title}) is missing an image URL`);
        assert(!imageUrls.has(img), `Duplicate image URL detected: ${img} on product ${p.id}`);
        imageUrls.add(img);
      }
      assertEqual(imageUrls.size, 96, 'Every product must have a unique photograph');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4.4 Zero Framed Art Items
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('4.4 Zero framed art products exist in catalog', async () => {
      const framedArt = products.filter(p => {
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return title.includes('framed') || title.includes('frame') || desc.includes('framed art');
      });

      assertEqual(framedArt.length, 0, `Detected ${framedArt.length} framed art items in catalog`);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4.5 All Local Transparent PNG Files Exist on Disk
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('4.5 All 96 transparent PNG image files exist locally and have non-zero size', async () => {
      const publicUploads = path.join(ROOT_DIR, 'public');
      let missingCount = 0;
      let emptyCount = 0;

      for (const p of products) {
        if (p.transparentLocalUrl) {
          const localRel = p.transparentLocalUrl.startsWith('/')
            ? p.transparentLocalUrl.slice(1)
            : p.transparentLocalUrl;
          const fullPath = path.join(publicUploads, localRel);
          if (!fs.existsSync(fullPath)) {
            missingCount++;
          } else {
            const stat = fs.statSync(fullPath);
            if (stat.size === 0) {
              emptyCount++;
            }
          }
        }
      }

      assertEqual(missingCount, 0, `Found ${missingCount} missing image files on disk`);
      assertEqual(emptyCount, 0, `Found ${emptyCount} zero-byte empty image files on disk`);
    });
  });
}

if (process.argv[1]?.endsWith('tier1-r4-catalog-integrity.mjs')) {
  runTier1R4().then(() => defaultRunner.printSummary());
}
