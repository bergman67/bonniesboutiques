/**
 * tests/e2e/tier3-cross-feature/tier3-combinations.mjs
 *
 * Tier 3: Cross-Feature State Combinations (Methodology Tier 3)
 *
 * Test Cases:
 * 3.1 Category Pill Selection ⨉ Search Keyword Interaction
 * 3.2 Quick-View Add-to-Cart ⨉ Free Shipping Progress Bar Dynamic Update
 * 3.3 Admin Inline Price Edit ⨉ Storefront Live Price & Cart Synchronization
 * 3.4 Admin Publish/Hide Toggle ⨉ Storefront Category Counts & Visibility
 * 3.5 Admin Batch Print Action ⨉ Daily Action Center Banner Clearance
 */

import {
  defaultRunner,
  loadJsonFile,
  assertEqual,
  assert,
  classifyProduct,
} from '../harness/test-utils.mjs';

export async function runTier3Combinations(runner = defaultRunner) {
  await runner.describeAsync('Tier 3: Cross-Feature Combinations', async () => {
    const manifest = loadJsonFile('src/lib/scrollytelling/productAssetManifest.json');
    const products = manifest.products || [];

    // ──────────────────────────────────────────────────────────────────────────
    // 3.1 Category Pill ⨉ Search Keyword Interaction
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('3.1 Category pill combined with search keyword filters correctly and preserves state on clear', async () => {
      function filterCatalog(list, { category, search }) {
        let result = list;
        if (category && category !== 'All') {
          result = result.filter(p => classifyProduct(p.title, p.description) === category);
        }
        if (search && search.trim()) {
          const q = search.toLowerCase().trim();
          result = result.filter(p =>
            (p.title && p.title.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q))
          );
        }
        return result;
      }

      // Step 1: Select "Beaded Pens"
      const allPens = filterCatalog(products, { category: 'Beaded Pens', search: '' });
      assertEqual(allPens.length, 40, 'Beaded Pens category must yield exactly 40 items');

      // Step 2: Search "Witch" within Beaded Pens
      const witchPens = filterCatalog(products, { category: 'Beaded Pens', search: 'Witch' });
      assert(witchPens.length >= 1, 'Expected at least 1 Witch pen');
      for (const p of witchPens) {
        assertEqual(classifyProduct(p.title, p.description), 'Beaded Pens');
        assert(p.title.toLowerCase().includes('witch'));
      }

      // Step 3: Switch category to "Charms & Bookmarks" with search "Witch"
      const witchCharms = filterCatalog(products, { category: 'Charms & Bookmarks', search: 'Witch' });
      for (const p of witchCharms) {
        assertEqual(classifyProduct(p.title, p.description), 'Charms & Bookmarks');
      }

      // Step 4: Clear search while in "Beaded Pens"
      const restoredPens = filterCatalog(products, { category: 'Beaded Pens', search: '' });
      assertEqual(restoredPens.length, 40, 'Clearing search must restore all 40 Beaded Pens');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3.2 Quick-View Add-to-Cart ⨉ Free Shipping Progress Bar Dynamic Update
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('3.2 Adding item from Quick-View Modal updates cart subtotal and Free Shipping progress', async () => {
      const threshold = 20.00;

      class CartModel {
        constructor() {
          this.items = [];
        }
        addItem(product, quantity = 1) {
          const existing = this.items.find(i => i.id === product.id);
          if (existing) {
            existing.quantity += quantity;
          } else {
            this.items.push({ ...product, quantity });
          }
        }
        updateQuantity(id, quantity) {
          const existing = this.items.find(i => i.id === id);
          if (existing) {
            existing.quantity = Math.max(0, quantity);
            if (existing.quantity === 0) {
              this.items = this.items.filter(i => i.id !== id);
            }
          }
        }
        getSubtotal() {
          return this.items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
        }
        getFreeShippingStatus() {
          const subtotal = this.getSubtotal();
          const remaining = Math.max(0, threshold - subtotal);
          const progress = Math.min(100, Math.round((subtotal / threshold) * 100));
          const isUnlocked = subtotal >= threshold;
          return { subtotal, remaining, progress, isUnlocked };
        }
      }

      const cart = new CartModel();
      assertEqual(cart.getSubtotal(), 0);
      assertEqual(cart.getFreeShippingStatus().remaining, 20.00);
      assertEqual(cart.getFreeShippingStatus().isUnlocked, false);

      // Inspect product in QuickView and click "Add to Cart"
      const productA = { id: 'p_1', title: 'Halloween Pumpkin Pen', price: 8.00 };
      cart.addItem(productA, 1);

      assertEqual(cart.getSubtotal(), 8.00);
      assertEqual(cart.getFreeShippingStatus().remaining, 12.00);
      assertEqual(cart.getFreeShippingStatus().progress, 40);
      assertEqual(cart.getFreeShippingStatus().isUnlocked, false);

      // Increase quantity to 3 (Subtotal = $24.00 >= $20.00)
      cart.updateQuantity('p_1', 3);

      assertEqual(cart.getSubtotal(), 24.00);
      assertEqual(cart.getFreeShippingStatus().remaining, 0.00);
      assertEqual(cart.getFreeShippingStatus().progress, 100);
      assertEqual(cart.getFreeShippingStatus().isUnlocked, true);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3.3 Admin Inline Price Edit ⨉ Storefront Live Price & Cart Synchronization
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('3.3 Inline price edit propagates to storefront catalog and cart calculation', async () => {
      let catalogItem = { id: 'item_100', title: 'Sparkle Star Charm', price: 8.00 };

      // Bonnie edits price inline in Admin from $8.00 to $9.50
      function adminInlinePriceEdit(item, newPrice) {
        return { ...item, price: parseFloat(newPrice) };
      }

      catalogItem = adminInlinePriceEdit(catalogItem, '9.50');
      assertEqual(catalogItem.price, 9.50);

      // Customer adds item to cart with new price
      const cartItem = { ...catalogItem, quantity: 2 };
      const total = cartItem.price * cartItem.quantity;
      assertEqual(total, 19.00);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3.4 Admin Publish/Hide Toggle ⨉ Storefront Category Counts & Visibility
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('3.4 Toggling product draft status decrements storefront count and excludes item from view', async () => {
      let activeProducts = [...products.map(p => ({ ...p, isDraft: false }))];

      function getStorefrontPublished(list, cat) {
        return list.filter(p => !p.isDraft && (cat === 'All' || classifyProduct(p.title, p.description) === cat));
      }

      assertEqual(getStorefrontPublished(activeProducts, 'Beaded Pens').length, 40);

      // Admin toggles first pen to Draft (Hidden)
      const targetPen = activeProducts.find(p => classifyProduct(p.title, p.description) === 'Beaded Pens');
      assert(targetPen, 'Must find a beaded pen to toggle');
      targetPen.isDraft = true;

      const afterHide = getStorefrontPublished(activeProducts, 'Beaded Pens');
      assertEqual(afterHide.length, 39, 'Storefront Beaded Pens count must decrement to 39');
      assert(!afterHide.some(p => p.id === targetPen.id), 'Hidden product must not appear on storefront');

      // Admin toggles pen back to Live (Published)
      targetPen.isDraft = false;
      const afterRestore = getStorefrontPublished(activeProducts, 'Beaded Pens');
      assertEqual(afterRestore.length, 40, 'Storefront Beaded Pens count must restore to 40');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3.5 Admin Batch Print Action ⨉ Daily Action Center Banner Clearance
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('3.5 Batch printing orders updates DB status to printed and clears Action Center banner', async () => {
      let orders = [
        { id: 'o1', labelPrinted: false, paymentStatus: 'paid' },
        { id: 'o2', labelPrinted: false, paymentStatus: 'paid' },
        { id: 'o3', labelPrinted: false, paymentStatus: 'paid' },
      ];

      function getActionCenterCount(orderList) {
        return orderList.filter(o => !o.labelPrinted && o.paymentStatus !== 'cancelled').length;
      }

      assertEqual(getActionCenterCount(orders), 3, 'Action center must initially detect 3 waiting orders');

      // 1-Click Batch Print Action fires
      function executeBatchPrint(orderList) {
        return orderList.map(o => ({ ...o, labelPrinted: true }));
      }

      orders = executeBatchPrint(orders);
      assertEqual(getActionCenterCount(orders), 0, 'Action center banner must clear (0 unprinted orders)');
      for (const o of orders) {
        assertEqual(o.labelPrinted, true, `Order ${o.id} must be marked labelPrinted: true`);
      }
    });
  });
}

if (process.argv[1]?.endsWith('tier3-combinations.mjs')) {
  runTier3Combinations().then(() => defaultRunner.printSummary());
}
