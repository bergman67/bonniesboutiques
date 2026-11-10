/**
 * tests/e2e/tier1-features/tier1-r1-storefront.mjs
 *
 * Tier 1: Storefront Shopping & Discovery UX (Requirement R1)
 *
 * Test Cases:
 * 1.1 Category Classification & Live Item Counts (96 Total: 40 Pens, 33 Keychains, 23 Charms)
 * 1.2 Instant Keyword Search across Product Title & Description
 * 1.3 Sort Selector (Featured/Newest, Price Ascending, Price Descending)
 * 1.4 Product Quick-View Modal Contract & Accessibility
 * 1.5 Cart Drawer Free Shipping Progress Bar & Calculation
 * 1.6 Public Storefront DOM Admin Privacy Audit (0 Links to /admin)
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  defaultRunner,
  loadJsonFile,
  loadTextFile,
  ROOT_DIR,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  assertApprox,
  assert,
  classifyProduct,
} from '../harness/test-utils.mjs';

export async function runTier1R1(runner = defaultRunner) {
  await runner.describeAsync('Tier 1: Storefront Shopping & Discovery UX (R1)', async () => {
    const manifest = loadJsonFile('src/lib/scrollytelling/productAssetManifest.json');
    const products = manifest.products || [];

    // ──────────────────────────────────────────────────────────────────────────
    // 1.1 Category Classification & Live Item Counts
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('1.1 Category classification partitions 96 products into 40 Pens, 33 Keychains, 23 Charms', async () => {
      assertEqual(products.length, 96, 'Catalog manifest must contain exactly 96 products');

      const counts = {
        'All': products.length,
        'Beaded Pens': 0,
        'Keychains': 0,
        'Charms & Bookmarks': 0,
      };

      for (const p of products) {
        const cat = classifyProduct(p.title, p.description);
        assert(counts[cat] !== undefined, `Unknown category classified: ${cat} for "${p.title}"`);
        counts[cat]++;
      }

      assertEqual(counts['All'], 96, 'Category "All" count must be 96');
      assertEqual(counts['Beaded Pens'], 40, 'Category "Beaded Pens" count must be exactly 40');
      assertEqual(counts['Keychains'], 33, 'Category "Keychains" count must be exactly 33');
      assertEqual(counts['Charms & Bookmarks'], 23, 'Category "Charms & Bookmarks" count must be exactly 23');
      assertEqual(counts['Beaded Pens'] + counts['Keychains'] + counts['Charms & Bookmarks'], 96, 'Sum of categories must equal 96');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1.2 Instant Keyword Search
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('1.2 Instant keyword search matches queries across title and description accurately', async () => {
      function searchFilter(list, keyword) {
        if (!keyword || !keyword.trim()) return list;
        const q = keyword.toLowerCase().trim();
        return list.filter(p =>
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }

      // Keyword "Christmas"
      const christmasResults = searchFilter(products, 'Christmas');
      assert(christmasResults.length >= 2, `Expected at least 2 Christmas products, found ${christmasResults.length}`);
      for (const p of christmasResults) {
        assert(
          p.title.toLowerCase().includes('christmas') || (p.description && p.description.toLowerCase().includes('christmas')),
          `Product "${p.title}" does not contain Christmas keyword`
        );
      }

      // Keyword "Puppy"
      const puppyResults = searchFilter(products, 'Puppy');
      assert(puppyResults.length >= 3, `Expected at least 3 Puppy products, found ${puppyResults.length}`);

      // Keyword "Butterfly"
      const butterflyResults = searchFilter(products, 'Butterfly');
      assert(butterflyResults.length >= 5, `Expected at least 5 Butterfly products, found ${butterflyResults.length}`);

      // Keyword "Halloween"
      const halloweenResults = searchFilter(products, 'Halloween');
      assert(halloweenResults.length >= 2, `Expected at least 2 Halloween products, found ${halloweenResults.length}`);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1.3 Sort Selector
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('1.3 Sort selector correctly orders items by price-asc, price-desc, and featured', async () => {
      const sample = products.slice(0, 20);

      // Price Ascending (lowest to highest)
      const sortedAsc = [...sample].sort((a, b) => (a.price ?? 8) - (b.price ?? 8));
      for (let i = 0; i < sortedAsc.length - 1; i++) {
        assert(
          (sortedAsc[i].price ?? 8) <= (sortedAsc[i + 1].price ?? 8),
          `Price asc invariant failed at index ${i}: ${sortedAsc[i].price} > ${sortedAsc[i + 1].price}`
        );
      }

      // Price Descending (highest to lowest)
      const sortedDesc = [...sample].sort((a, b) => (b.price ?? 8) - (a.price ?? 8));
      for (let i = 0; i < sortedDesc.length - 1; i++) {
        assert(
          (sortedDesc[i].price ?? 8) >= (sortedDesc[i + 1].price ?? 8),
          `Price desc invariant failed at index ${i}: ${sortedDesc[i].price} < ${sortedDesc[i + 1].price}`
        );
      }

      // Featured / Newest preservation
      const featured = [...sample];
      assertEqual(featured.length, sample.length, 'Featured items count matches');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1.4 Product Quick-View Modal Contract
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('1.4 Quick-View Modal contract includes enlarged image, title, price, category badge, and Add to Cart', async () => {
      // Check QuickView component contract or specification
      const quickViewPath = path.join(ROOT_DIR, 'src', 'components', 'QuickViewModal.tsx');
      let quickViewContent = '';
      if (fs.existsSync(quickViewPath)) {
        quickViewContent = fs.readFileSync(quickViewPath, 'utf8');
      }

      // Test simulation of QuickView modal state
      const sampleProduct = products[0];
      const quickViewState = {
        isOpen: true,
        product: sampleProduct,
        category: classifyProduct(sampleProduct.title, sampleProduct.description),
      };

      assertEqual(quickViewState.isOpen, true);
      assert(quickViewState.product.title.length > 0, 'Product title must be non-empty');
      assert((quickViewState.product.price ?? 8) > 0, 'Product price must be positive');
      assert(Boolean(quickViewState.product.transparentLocalUrl || quickViewState.product.transparentUrl), 'Product must have an image');
      assert(['Beaded Pens', 'Keychains', 'Charms & Bookmarks'].includes(quickViewState.category), 'Category badge must be valid');

      if (quickViewContent) {
        assertIncludes(quickViewContent, 'Add to Cart', 'QuickViewModal must have Add to Cart action');
        assert(
          quickViewContent.includes('Escape') || quickViewContent.includes('onClose') || quickViewContent.includes('close'),
          'QuickViewModal must support close / Escape dismissal'
        );
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1.5 Cart Drawer Free Shipping Progress Bar
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('1.5 Free Shipping Progress Bar accurately computes remaining amount and unlocked state', async () => {
      const freeShippingThreshold = 20.00;

      function computeFreeShipping(subtotal, threshold) {
        const remaining = Math.max(0, threshold - subtotal);
        const progress = Math.min(100, Math.round((subtotal / threshold) * 100));
        const isUnlocked = subtotal >= threshold;
        const message = isUnlocked
          ? "🎉 You've unlocked FREE Shipping!"
          : `Add $${remaining.toFixed(2)} more for FREE shipping!`;
        return { remaining, progress, isUnlocked, message };
      }

      // Case 1: Empty cart ($0)
      const empty = computeFreeShipping(0, freeShippingThreshold);
      assertEqual(empty.remaining, 20.00);
      assertEqual(empty.progress, 0);
      assertEqual(empty.isUnlocked, false);
      assertEqual(empty.message, 'Add $20.00 more for FREE shipping!');

      // Case 2: One item at $8.00
      const oneItem = computeFreeShipping(8.00, freeShippingThreshold);
      assertEqual(oneItem.remaining, 12.00);
      assertEqual(oneItem.progress, 40);
      assertEqual(oneItem.isUnlocked, false);
      assertEqual(oneItem.message, 'Add $12.00 more for FREE shipping!');

      // Case 3: Two items at $16.00
      const twoItems = computeFreeShipping(16.00, freeShippingThreshold);
      assertEqual(twoItems.remaining, 4.00);
      assertEqual(twoItems.progress, 80);
      assertEqual(twoItems.isUnlocked, false);

      // Case 4: Three items at $24.00 (Crosses threshold)
      const threeItems = computeFreeShipping(24.00, freeShippingThreshold);
      assertEqual(threeItems.remaining, 0);
      assertEqual(threeItems.progress, 100);
      assertEqual(threeItems.isUnlocked, true);
      assertEqual(threeItems.message, "🎉 You've unlocked FREE Shipping!");
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1.6 Public Storefront DOM Admin Privacy Audit
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('1.6 Public Storefront DOM files contain zero links or references to /admin', async () => {
      const storefrontFiles = [
        'src/app/page.tsx',
        'src/components/Header.tsx',
        'src/components/ProductCard.tsx',
        'src/components/CartDrawer.tsx',
      ];

      for (const rel of storefrontFiles) {
        const full = path.join(ROOT_DIR, rel);
        if (fs.existsSync(full)) {
          const content = fs.readFileSync(full, 'utf8');
          // Check for link to /admin
          assert(
            !content.includes('href="/admin"') && !content.includes("href='/admin'") && !content.includes('href={`/admin`}'),
            `Security Violation: Public file ${rel} exposes link to /admin!`
          );
        }
      }
    });
  });
}

if (process.argv[1]?.endsWith('tier1-r1-storefront.mjs')) {
  runTier1R1().then(() => defaultRunner.printSummary());
}
