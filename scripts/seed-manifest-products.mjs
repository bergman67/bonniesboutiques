#!/usr/bin/env node
/**
 * scripts/seed-manifest-products.mjs
 *
 * Idempotently seeds any products present in `src/lib/scrollytelling/productAssetManifest.json`
 * that are missing from the PostgreSQL `Product` table, eliminating 404 errors from social video
 * product links and restoring flagship Beaded Pens to the live storefront & `/admin` portal.
 * Also heals known storefront listing typos and enriches generic placeholder descriptions while
 * preserving existing admin draft/price customizations.
 *
 * Usage:
 *   node scripts/seed-manifest-products.mjs --dry-run
 *   node scripts/seed-manifest-products.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');
const isHealOnly = process.argv.includes('--heal-only');

function buildArtisanDescription(title) {
  const lower = (title || '').toLowerCase();
  if (lower.includes('pen')) {
    return (
      `Handcrafted ${title} lovingly assembled one by one by Bonnie & Tammy in Clearbrook, Virginia. ` +
      `Writes smoothly with a replaceable 1.0mm medium black ballpoint ink refill (twist-off brass tip) ` +
      `and features durable, wipe-clean silicone and focal beads — an unforgettable gift for teachers, nurses, coworkers, and writers.`
    );
  }
  if (lower.includes('bookmark') || lower.includes('charm') || lower.includes('tassel')) {
    return (
      `One-of-a-kind handcrafted ${title} made with generational love by Bonnie & Tammy in Clearbrook, Virginia. ` +
      `Crafted with vibrant focal beads and sturdy clasp hardware — ready to clip onto your favorite tote, planner, keys, or gift bag.`
    );
  }
  return (
    `One-of-a-kind handcrafted ${title} designed and assembled by hand by mother-daughter duo Bonnie & Tammy in Clearbrook, Virginia. ` +
    `Built with durable keyring hardware and wipe-clean focal beads — ready for everyday carry or thoughtful gifting.`
  );
}

const TEXT_TYPO_FIXES = [
  { match: /wrislet/gi, replace: 'Wristlet' },
  { match: /key\s+hain/gi, replace: 'Keychain' },
  { match: /rottwelier/gi, replace: 'Rottweiler' },
  { match: /bag\s+charn-\s*key\s*-chain/gi, replace: 'Bag Charm Keychain' },
  { match: /bag\s+charn-key\s+chain/gi, replace: 'Bag Charm Keychain' },
  { match: /\bcharn\b/gi, replace: 'Charm' },
  { match: /\bfoe\s+keys\b/gi, replace: 'for keys' },
];

function healTitleTypos(text) {
  let updated = text;
  for (const rule of TEXT_TYPO_FIXES) {
    updated = updated.replace(rule.match, rule.replace);
  }
  return updated.replace(/\s{2,}/g, ' ').trim();
}

async function main() {
  const manifestPath = path.resolve(process.cwd(), 'src/lib/scrollytelling/productAssetManifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const manifestProducts = Array.isArray(manifest.products) ? manifest.products : [];

  const existingProducts = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      imageUrl: true,
      isDraft: true,
    },
  });

  const existingById = new Map(existingProducts.map((p) => [p.id, p]));
  const missingManifestItems = manifestProducts.filter((m) => !existingById.has(m.id));

  console.log(`[seed-manifest] Mode: ${isDryRun ? 'DRY RUN' : 'LIVE EXECUTION'}`);
  console.log(`[seed-manifest] Manifest products: ${manifestProducts.length}`);
  console.log(`[seed-manifest] Existing DB products: ${existingProducts.length} (${existingProducts.filter((p) => !p.isDraft).length} live, ${existingProducts.filter((p) => p.isDraft).length} draft)`);
  console.log(`[seed-manifest] Missing manifest products to seed: ${missingManifestItems.length}`);

  let seededCount = 0;
  let seededPens = 0;
  for (const item of isHealOnly ? [] : missingManifestItems) {
    const cleanTitle = healTitleTypos(item.title || 'Handcrafted Trinket');
    const imageUrl =
      item.transparentCloudUrl ||
      item.transparentUrl ||
      item.transparentLocalUrl ||
      item.originalUrl ||
      null;
    const price = typeof item.price === 'number' && item.price > 0 ? item.price : 8.0;
    const description =
      item.description && item.description.trim().length > 35
        ? item.description.trim()
        : buildArtisanDescription(cleanTitle);

    if (cleanTitle.toLowerCase().includes('pen')) {
      seededPens++;
    }

    if (!isDryRun) {
      await prisma.product.upsert({
        where: { id: item.id },
        update: {},
        create: {
          id: item.id,
          title: cleanTitle,
          description,
          price,
          imageUrl,
          isDraft: false,
        },
      });
    }
    seededCount++;
  }

  // Heal known title/description typos and generic 1-line placeholders on live DB listings
  let healedCount = 0;
  for (const existing of existingProducts) {
    if (existing.isDraft) continue;
    const healedTitle = healTitleTypos(existing.title);
    const rawDesc = (existing.description || '').trim();
    const categoryTagMatch = rawDesc.match(/\s*(\[Category:\s*[^\]]+\])\s*$/i);
    const categorySuffix = categoryTagMatch ? ` ${categoryTagMatch[1]}` : '';
    const strippedDesc = rawDesc.replace(/\s*\[Category:\s*[^\]]+\]\s*$/i, '').trim();

    let nextDesc = existing.description;
    if (!strippedDesc || strippedDesc === "Handmade trinket from Bonnie's Boutique.") {
      nextDesc = `${buildArtisanDescription(healedTitle)}${categorySuffix}`;
    } else {
      const healedBody = healTitleTypos(strippedDesc);
      if (healedBody !== strippedDesc) {
        nextDesc = `${healedBody}${categorySuffix}`;
      }
    }

    if (healedTitle !== existing.title || nextDesc !== existing.description) {
      if (!isDryRun) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            title: healedTitle,
            description: nextDesc,
          },
        });
      }
      healedCount++;
    }
  }

  console.log(`[seed-manifest] Seeded ${seededCount} missing manifest products (including ${seededPens} Beaded Pens).`);
  console.log(`[seed-manifest] Healed copy/typos on ${healedCount} existing live listings.`);

  if (!isDryRun) {
    const finalLive = await prisma.product.count({ where: { isDraft: false } });
    console.log(`[seed-manifest] Total live published products in PostgreSQL: ${finalLive}`);
  }
}

main()
  .catch((err) => {
    console.error('[seed-manifest] Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
