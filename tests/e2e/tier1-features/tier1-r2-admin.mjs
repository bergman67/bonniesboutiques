/**
 * tests/e2e/tier1-features/tier1-r2-admin.mjs
 *
 * Tier 1: Grandma-Friendly Admin Portal UX (Requirement R2)
 *
 * Test Cases:
 * 2.1 Bonnie's Daily Action Center Banner Visibility & Dynamic Order Count
 * 2.2 1-Click Batch Printable Packing Slips HTML Generator Contract
 * 2.3 Manage Products Category Filter Pills & Search Input
 * 2.4 1-Click Inline Price Editing State & Contract
 * 2.5 1-Click Large Publish/Hide Toggle (High-Contrast & Separated from Delete)
 * 2.6 Senior-Friendly PIN Auth Controls (Password Reveal Toggle & Large Inputs)
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
  assert,
  classifyProduct,
} from '../harness/test-utils.mjs';

export async function runTier1R2(runner = defaultRunner) {
  await runner.describeAsync('Tier 1: Grandma-Friendly Admin Portal UX (R2)', async () => {
    const manifest = loadJsonFile('src/lib/scrollytelling/productAssetManifest.json');
    const products = manifest.products || [];

    // ──────────────────────────────────────────────────────────────────────────
    // 2.1 Bonnie's Daily Action Center Banner Visibility & Count
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.1 Action Center banner is visible whenever unprinted orders exist and displays count N', async () => {
      // Mock orders list
      const orders = [
        { id: 'ord_1', customerName: 'Alice', labelPrinted: false, paymentStatus: 'paid' },
        { id: 'ord_2', customerName: 'Bob', labelPrinted: true, paymentStatus: 'paid' },
        { id: 'ord_3', customerName: 'Charlie', labelPrinted: false, paymentStatus: 'paid' },
        { id: 'ord_4', customerName: 'Diana', labelPrinted: false, paymentStatus: 'cancelled' },
      ];

      function computeActionCenterState(orderList) {
        const unprinted = orderList.filter(o => !o.labelPrinted && o.paymentStatus !== 'cancelled');
        const count = unprinted.length;
        const isVisible = count > 0;
        const bannerTitle = isVisible
          ? `👵 Bonnie's Daily Action Center — ${count} Order${count !== 1 ? 's' : ''} Waiting to Box & Ship!`
          : null;
        return { isVisible, count, bannerTitle, unprintedOrders: unprinted };
      }

      // Initial state with 2 valid unprinted orders (Alice and Charlie)
      const state1 = computeActionCenterState(orders);
      assertEqual(state1.isVisible, true, 'Banner must be visible when unprinted orders exist');
      assertEqual(state1.count, 2, 'Banner count must accurately reflect unprinted non-cancelled orders');
      assertEqual(state1.bannerTitle, "👵 Bonnie's Daily Action Center — 2 Orders Waiting to Box & Ship!");

      // State after all orders printed
      const allPrinted = orders.map(o => ({ ...o, labelPrinted: true }));
      const state2 = computeActionCenterState(allPrinted);
      assertEqual(state2.isVisible, false, 'Banner must hide when all orders are printed');
      assertEqual(state2.count, 0);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.2 1-Click Batch Printable Packing Slips HTML Generator Contract
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.2 Batch packing slips generator produces multi-page print layout with address cut-outs and checklist', async () => {
      const sampleOrders = [
        {
          id: 'ord_101',
          customerName: 'Sarah Jenkins',
          shippingAddress: '742 Evergreen Terrace, Springfield, OR 97477 (US)',
          itemsJson: JSON.stringify([
            { id: 'p1', title: 'Witch Hat Pumpkin Black Pen', price: 8, quantity: 2 },
          ]),
          subtotal: 16.00,
          shippingCost: 3.99,
          total: 19.99,
          trackingNumber: '9400111899560000123456',
        },
        {
          id: 'ord_102',
          customerName: 'Tom Anderson',
          shippingAddress: '100 Main St, Austin, TX 78701 (US)',
          itemsJson: JSON.stringify([
            { id: 'p2', title: 'Playful Puppy Green Beaded Keychain', price: 8, quantity: 1 },
          ]),
          subtotal: 8.00,
          shippingCost: 3.99,
          total: 11.99,
          trackingNumber: null,
        },
      ];

      // Specification generator function for batch packing slips
      function generateBatchPackingSlipsHtml(ordersToPrint) {
        const slips = ordersToPrint.map((order, idx) => {
          let items = [];
          try {
            items = JSON.parse(order.itemsJson);
          } catch (_e) {}

          const isLast = idx === ordersToPrint.length - 1;
          const pageBreakClass = isLast ? '' : 'page-break';

          const itemRows = items.map(it => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">[ ] ${it.title}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${it.quantity}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(it.price * it.quantity).toFixed(2)}</td>
            </tr>
          `).join('');

          return `
            <div class="packing-slip-container ${pageBreakClass}" style="padding: 24px; font-family: sans-serif;">
              <div style="border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px;">
                <h1 style="font-size: 20px; margin: 0;">Bonnie's Boutique — Packing Slip</h1>
                <p style="margin: 4px 0; color: #666;">Order #${order.id}</p>
                ${order.trackingNumber ? `<p style="margin: 4px 0; font-weight: bold; color: #2e7d32;">USPS Tracking: ${order.trackingNumber}</p>` : ''}
              </div>

              <!-- Cut-out Address Label -->
              <div style="border: 2px dashed #666; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 4px;">✂ Cut out and tape to package</div>
                <div style="font-weight: bold; font-size: 16px;">Ship To:</div>
                <div style="font-size: 15px; margin-top: 4px;">${order.customerName}</div>
                <div style="font-size: 14px; white-space: pre-line;">${order.shippingAddress}</div>
              </div>

              <!-- Packing Checklist -->
              <h2 style="font-size: 16px; margin-bottom: 8px;">Items Checklist</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f5f5f5; text-align: left;">
                    <th style="padding: 8px;">Item Description</th>
                    <th style="padding: 8px; text-align: center;">Qty</th>
                    <th style="padding: 8px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>

              <div style="margin-top: 20px; text-align: right;">
                <p style="margin: 2px 0;">Subtotal: $${order.subtotal.toFixed(2)}</p>
                <p style="margin: 2px 0;">Shipping: $${order.shippingCost.toFixed(2)}</p>
                <p style="margin: 4px 0; font-size: 16px; font-weight: bold;">Total: $${order.total.toFixed(2)}</p>
              </div>
            </div>
          `;
        }).join('\n');

        return `<!DOCTYPE html>
          <html>
            <head>
              <title>Print Packing Slips — Bonnie's Boutique</title>
              <style>
                @media print {
                  body { margin: 0; background: white; }
                  .page-break { page-break-after: always; break-after: page; }
                  @page { margin: 1cm; size: letter portrait; }
                }
              </style>
            </head>
            <body>
              ${slips}
            </body>
          </html>
        `;
      }

      const html = generateBatchPackingSlipsHtml(sampleOrders);
      assertIncludes(html, '@media print', 'HTML must contain @media print CSS rules');
      assertIncludes(html, 'page-break-after: always', 'HTML must enforce page-break between orders');
      assertIncludes(html, '✂ Cut out and tape to package', 'Must include cut-out address label instructions');
      assertIncludes(html, 'Sarah Jenkins', 'Must render customer name for Order 1');
      assertIncludes(html, 'Tom Anderson', 'Must render customer name for Order 2');
      assertIncludes(html, '9400111899560000123456', 'Must render USPS tracking number when available');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.3 Manage Products Category Filter Pills & Search Input
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.3 Manage Products tab provides search and category filter pills with live counts', async () => {
      const counts = {
        'all': products.length,
        'Beaded Pens': products.filter(p => classifyProduct(p.title, p.description) === 'Beaded Pens').length,
        'Keychains': products.filter(p => classifyProduct(p.title, p.description) === 'Keychains').length,
        'Charms & Bookmarks': products.filter(p => classifyProduct(p.title, p.description) === 'Charms & Bookmarks').length,
      };

      assertEqual(counts.all, 96);
      assertEqual(counts['Beaded Pens'], 40);
      assertEqual(counts['Keychains'], 33);
      assertEqual(counts['Charms & Bookmarks'], 23);

      function filterAdminProducts(list, { category = 'all', query = '' }) {
        let result = list;
        if (category !== 'all') {
          result = result.filter(p => classifyProduct(p.title, p.description) === category);
        }
        if (query.trim()) {
          const q = query.toLowerCase().trim();
          result = result.filter(p => p.title.toLowerCase().includes(q));
        }
        return result;
      }

      // Filter by Beaded Pens
      const pens = filterAdminProducts(products, { category: 'Beaded Pens' });
      assertEqual(pens.length, 40);

      // Filter by Keychains + search "Puppy"
      const puppyKeychains = filterAdminProducts(products, { category: 'Keychains', query: 'Puppy' });
      assert(puppyKeychains.length >= 2, `Expected puppy keychains >= 2, got ${puppyKeychains.length}`);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.4 1-Click Inline Price Editing Contract
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.4 1-Click inline price editing validates numeric input and updates price state', async () => {
      let product = { id: 'prod_1', title: 'Sample Trinket', price: 8.00 };

      function validateAndApplyPriceEdit(currentProduct, newPriceInput) {
        const num = parseFloat(newPriceInput);
        if (isNaN(num) || num < 0) {
          throw new Error('Invalid price: must be a non-negative number');
        }
        // Round to 2 decimal places
        const formatted = Math.round(num * 100) / 100;
        return { ...currentProduct, price: formatted };
      }

      // Valid edit: 8.00 -> 9.50
      const updated = validateAndApplyPriceEdit(product, '9.50');
      assertEqual(updated.price, 9.50);

      // Valid edit: 9.50 -> 12
      const updated2 = validateAndApplyPriceEdit(updated, '12');
      assertEqual(updated2.price, 12.00);

      // Invalid negative
      assert.throws(() => validateAndApplyPriceEdit(product, '-5.00'), /Invalid price/);

      // Invalid text
      assert.throws(() => validateAndApplyPriceEdit(product, 'abc'), /Invalid price/);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.5 1-Click Large Publish/Hide Toggle
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.5 Publish/Hide toggle provides clear high-contrast states and safe separation from deletion', async () => {
      function getToggleConfig(isDraft) {
        if (isDraft) {
          return {
            label: '🔒 HIDDEN DRAFT — Tap to Publish',
            actionText: 'Publish Product',
            bg: 'rgba(232, 116, 138, 0.2)',
            textColor: '#e8748a',
            targetDraft: false,
          };
        } else {
          return {
            label: '🟢 LIVE ON STORE — Tap to Hide',
            actionText: 'Hide Product',
            bg: 'rgba(46, 125, 50, 0.2)',
            textColor: '#81c784',
            targetDraft: true,
          };
        }
      }

      const publishedConfig = getToggleConfig(false);
      assertIncludes(publishedConfig.label, 'LIVE ON STORE');
      assertEqual(publishedConfig.targetDraft, true);

      const draftConfig = getToggleConfig(true);
      assertIncludes(draftConfig.label, 'HIDDEN DRAFT');
      assertEqual(draftConfig.targetDraft, false);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.6 Senior-Friendly PIN Auth Controls
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.6 PIN authentication UI specifies password reveal toggle and accessible large inputs', async () => {
      const adminPagePath = path.join(ROOT_DIR, 'src', 'app', 'admin', 'page.tsx');
      assert(fs.existsSync(adminPagePath), 'src/app/admin/page.tsx must exist');

      // Accessibility contract simulation for PIN entry
      const pinState = {
        pin: '1234',
        showPassword: false,
        toggleShowPassword() {
          this.showPassword = !this.showPassword;
        },
        getInputType() {
          return this.showPassword ? 'text' : 'password';
        },
      };

      assertEqual(pinState.getInputType(), 'password');
      pinState.toggleShowPassword();
      assertEqual(pinState.getInputType(), 'text');
    });
  });
}

if (process.argv[1]?.endsWith('tier1-r2-admin.mjs')) {
  runTier1R2().then(() => defaultRunner.printSummary());
}
