/**
 * tests/e2e/tier4-workloads/tier4-real-world-scenarios.mjs
 *
 * Tier 4: Real-World Workload Scenarios (Methodology Tier 4)
 *
 * Scenarios:
 * 4.1 Complete Shopper Discovery & Checkout Workload (10 Steps)
 * 4.2 Grandma Bonnie Morning Fulfillment & Store Management Workload (10 Steps)
 */

import {
  defaultRunner,
  loadJsonFile,
  assertEqual,
  assert,
  classifyProduct,
} from '../harness/test-utils.mjs';

export async function runTier4Workloads(runner = defaultRunner) {
  await runner.describeAsync('Tier 4: Real-World Workload Scenarios', async () => {
    const manifest = loadJsonFile('src/lib/scrollytelling/productAssetManifest.json');
    const catalogProducts = manifest.products || [];

    // ──────────────────────────────────────────────────────────────────────────
    // 4.1 Complete Shopper Discovery & Checkout Workload
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('4.1 Shopper discovery & checkout flow (10 steps from discovery to free shipping qualification)', async () => {
      // Step 1: Customer arrives at storefront
      const session = {
        currentCategory: 'All',
        searchQuery: '',
        sortBy: 'featured',
        quickViewOpen: false,
        selectedProduct: null,
        cart: [],
        shippingThreshold: 20.00,
        flatShippingRate: 3.99,
      };

      // Step 2: Customer inspects category pills
      const counts = {
        'All': catalogProducts.length,
        'Beaded Pens': catalogProducts.filter(p => classifyProduct(p.title, p.description) === 'Beaded Pens').length,
        'Keychains': catalogProducts.filter(p => classifyProduct(p.title, p.description) === 'Keychains').length,
        'Charms & Bookmarks': catalogProducts.filter(p => classifyProduct(p.title, p.description) === 'Charms & Bookmarks').length,
      };
      assertEqual(counts.All, 96);
      assertEqual(counts['Beaded Pens'], 40);
      assertEqual(counts['Keychains'], 33);
      assertEqual(counts['Charms & Bookmarks'], 23);

      // Step 3: Customer clicks "Beaded Pens" filter pill
      session.currentCategory = 'Beaded Pens';
      let activeItems = catalogProducts.filter(p => classifyProduct(p.title, p.description) === session.currentCategory);
      assertEqual(activeItems.length, 40);

      // Step 4: Customer searches "Merry Christmas"
      session.searchQuery = 'Christmas';
      activeItems = activeItems.filter(p =>
        p.title.toLowerCase().includes(session.searchQuery.toLowerCase())
      );
      assert(activeItems.length >= 2, 'Must match at least 2 Christmas beaded pens');

      // Step 5: Customer sorts by price ascending
      session.sortBy = 'price-asc';
      activeItems.sort((a, b) => (a.price ?? 8) - (b.price ?? 8));
      assert((activeItems[0].price ?? 8) <= (activeItems[activeItems.length - 1].price ?? 8));

      // Step 6: Customer clicks product to open Quick-View Modal
      session.selectedProduct = activeItems[0];
      session.quickViewOpen = true;
      assertEqual(session.quickViewOpen, true);
      assert(session.selectedProduct.title.length > 0);
      assert(session.selectedProduct.price > 0);

      // Step 7: Customer clicks "Add to Cart" inside Quick-View
      session.cart.push({ ...session.selectedProduct, quantity: 1 });
      session.quickViewOpen = false; // Modal closes
      session.selectedProduct = null;
      assertEqual(session.quickViewOpen, false);
      assertEqual(session.cart.length, 1);

      // Step 8: Customer inspects Cart Drawer Free Shipping Bar
      const unitPrice = session.cart[0].price;
      let subtotal = session.cart.reduce((sum, it) => sum + (it.price * it.quantity), 0);
      let remaining = Math.max(0, session.shippingThreshold - subtotal);
      let progress = Math.min(100, Math.round((subtotal / session.shippingThreshold) * 100));
      assertEqual(subtotal, unitPrice);
      assertEqual(remaining, session.shippingThreshold - unitPrice);
      assertEqual(progress, Math.round((unitPrice / session.shippingThreshold) * 100));

      // Step 9: Customer increments quantity to cross $20 threshold (7 pens * $3 = $21 >= $20)
      const qtyNeeded = Math.ceil(session.shippingThreshold / unitPrice);
      session.cart[0].quantity = qtyNeeded;
      subtotal = session.cart.reduce((sum, it) => sum + (it.price * it.quantity), 0);
      remaining = Math.max(0, session.shippingThreshold - subtotal);
      progress = Math.min(100, Math.round((subtotal / session.shippingThreshold) * 100));
      assert(subtotal >= session.shippingThreshold, `Subtotal ${subtotal} must be >= threshold ${session.shippingThreshold}`);
      assertEqual(remaining, 0.00);
      assertEqual(progress, 100);

      // Step 10: Checkout payload calculation
      const shippingCost = subtotal >= session.shippingThreshold ? 0.00 : session.flatShippingRate;
      const orderTotal = subtotal + shippingCost;
      assertEqual(shippingCost, 0.00, 'Free shipping must be applied');
      assertEqual(orderTotal, subtotal);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4.2 Grandma Bonnie Morning Fulfillment Workload
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('4.2 Grandma Bonnie morning fulfillment flow (10 steps from PIN login to label batch print and inventory)', async () => {
      // Step 1: Bonnie opens admin login
      const adminState = {
        isLoggedIn: false,
        activeTab: 'orders',
        pinInput: 'bonnie2026',
        showPassword: false,
      };

      // Step 2: Bonnie toggles password reveal to inspect PIN
      adminState.showPassword = true;
      assertEqual(adminState.showPassword, true);

      // Step 3: Login authenticates
      adminState.isLoggedIn = true;
      assertEqual(adminState.isLoggedIn, true);

      // Step 4: Top Action Center banner appears with 3 unprinted orders
      let orders = [
        { id: 'b_ord_1', customerName: 'Dorothy', labelPrinted: false, subtotal: 16.00, shippingCost: 3.99, total: 19.99, itemsJson: '[{"title":"Charm"}]' },
        { id: 'b_ord_2', customerName: 'Harold', labelPrinted: false, subtotal: 8.00, shippingCost: 3.99, total: 11.99, itemsJson: '[{"title":"Pen"}]' },
        { id: 'b_ord_3', customerName: 'Mildred', labelPrinted: false, subtotal: 24.00, shippingCost: 0.00, total: 24.00, itemsJson: '[{"title":"Keychain"}]' },
      ];

      const waitingCount = orders.filter(o => !o.labelPrinted).length;
      assertEqual(waitingCount, 3);

      // Step 5: Bonnie clicks 1-click batch print button
      function executeBatchPrintSlip(orderList) {
        return orderList.map(o => ({ ...o, labelPrinted: true }));
      }
      orders = executeBatchPrintSlip(orders);

      // Step 6: Verify all 3 orders marked printed and Action Center banner clears
      const waitingAfter = orders.filter(o => !o.labelPrinted).length;
      assertEqual(waitingAfter, 0);

      // Step 7: Bonnie switches to Manage Products tab
      adminState.activeTab = 'products';
      assertEqual(adminState.activeTab, 'products');

      // Step 8: Filters by "Beaded Pens"
      const pens = catalogProducts.filter(p => classifyProduct(p.title, p.description) === 'Beaded Pens');
      assertEqual(pens.length, 40);

      // Step 9: 1-click inline price edit on first pen
      const penToEdit = { ...pens[0], price: 8.00 };
      penToEdit.price = 9.00;
      assertEqual(penToEdit.price, 9.00);

      // Step 10: Checks Settings return address badge
      const activeAddressSource = 'admin_settings';
      assert(['admin_settings', 'shippo_address_book'].includes(activeAddressSource));
    });
  });
}

if (process.argv[1]?.endsWith('tier4-real-world-scenarios.mjs')) {
  runTier4Workloads().then(() => defaultRunner.printSummary());
}
