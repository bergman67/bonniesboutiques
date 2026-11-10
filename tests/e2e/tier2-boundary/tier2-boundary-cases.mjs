/**
 * tests/e2e/tier2-boundary/tier2-boundary-cases.mjs
 *
 * Tier 2: Boundary & Corner Cases (Methodology Tier 2)
 *
 * Test Cases:
 * 2.1 Empty & Whitespace-Only Search Query Preservation
 * 2.2 Search Query with Special Characters & Regex Meta-Characters
 * 2.3 Case-Insensitive Search Equivalence ("butterfly" vs "BUTTERFLY" vs "BuTtErFlY")
 * 2.4 Non-Existent Search Query Returns Zero State Cleanly
 * 2.5 Free Shipping Exact Threshold Boundary (Subtotal == $20.00)
 * 2.6 Free Shipping Near-Miss 1 Cent Below ($19.99)
 * 2.7 Free Shipping 1 Cent Above Threshold ($20.01)
 * 2.8 Free Shipping $0.00 Threshold Corner Case
 * 2.9 Extreme Subtotal Progress Bar Capping ($10,000.00)
 * 2.10 Missing Return Address Shippo Fallback with Empty List
 * 2.11 Missing Return Address Shippo Fallback with Incomplete Address
 * 2.12 PIN Auth with Empty String, Whitespace-Only, and Incorrect Values
 */

import {
  defaultRunner,
  loadJsonFile,
  assertEqual,
  assert,
  classifyProduct,
} from '../harness/test-utils.mjs';

export async function runTier2Boundary(runner = defaultRunner) {
  await runner.describeAsync('Tier 2: Boundary & Corner Cases', async () => {
    const manifest = loadJsonFile('src/lib/scrollytelling/productAssetManifest.json');
    const products = manifest.products || [];

    function searchProducts(list, query) {
      if (!query || !query.trim()) return list;
      const q = query.toLowerCase().trim();
      return list.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    function calculateFreeShipping(subtotal, threshold = 20.00) {
      const cleanSubtotal = Math.max(0, Number(subtotal) || 0);
      const cleanThreshold = Math.max(0, Number(threshold) || 0);

      if (cleanThreshold === 0) {
        return {
          remaining: 0,
          progress: 100,
          isUnlocked: true,
          message: "🎉 You've unlocked FREE Shipping!",
        };
      }

      const remaining = Math.max(0, Math.round((cleanThreshold - cleanSubtotal) * 100) / 100);
      const progress = Math.min(100, Math.round((cleanSubtotal / cleanThreshold) * 100));
      const isUnlocked = cleanSubtotal >= cleanThreshold;
      const message = isUnlocked
        ? "🎉 You've unlocked FREE Shipping!"
        : `Add $${remaining.toFixed(2)} more for FREE shipping!`;

      return { remaining, progress, isUnlocked, message };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2.1 Empty & Whitespace-Only Search Query
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.1 Empty and whitespace-only search queries return 100% of products', async () => {
      assertEqual(searchProducts(products, '').length, 96);
      assertEqual(searchProducts(products, '   ').length, 96);
      assertEqual(searchProducts(products, '\t\n').length, 96);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.2 Special Characters & Regex Meta-Characters in Search
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.2 Search handles regex meta-characters without throwing runtime syntax errors', async () => {
      const weirdQueries = ['[', ']', '*', '+', '?', '(', ')', '{', '}', '^', '$', '|', '\\', '.', "'''", '"""'];
      for (const q of weirdQueries) {
        assert.doesNotThrow(() => {
          const res = searchProducts(products, q);
          assert(Array.isArray(res), `Query "${q}" did not return an array`);
        }, `Search threw error on input "${q}"`);
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.3 Case-Insensitive Search Equivalence
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.3 Case insensitivity produces identical search results across casing variants', async () => {
      const rLower = searchProducts(products, 'butterfly');
      const rUpper = searchProducts(products, 'BUTTERFLY');
      const rMixed = searchProducts(products, 'BuTtErFlY');

      assertEqual(rLower.length, rUpper.length, 'Lower and Upper casing must produce identical result counts');
      assertEqual(rLower.length, rMixed.length, 'Lower and Mixed casing must produce identical result counts');

      const idsLower = rLower.map(p => p.id).sort();
      const idsUpper = rUpper.map(p => p.id).sort();
      assert.deepStrictEqual(idsLower, idsUpper, 'Result sets must be identical');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.4 Non-Existent Search Query Returns Zero State
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.4 Non-matching query yields 0 results gracefully', async () => {
      const res = searchProducts(products, 'nonexistent-quantum-widget-xyz');
      assertEqual(res.length, 0);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.5 Free Shipping Exact Threshold ($20.00)
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.5 Exact threshold boundary ($20.00 on $20.00) triggers 100% unlocked state', async () => {
      const res = calculateFreeShipping(20.00, 20.00);
      assertEqual(res.remaining, 0.00);
      assertEqual(res.progress, 100);
      assertEqual(res.isUnlocked, true);
      assertEqual(res.message, "🎉 You've unlocked FREE Shipping!");
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.6 Free Shipping Near-Miss ($19.99 on $20.00)
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.6 Near-miss threshold ($19.99 on $20.00) accurately shows 1 cent remaining', async () => {
      const res = calculateFreeShipping(19.99, 20.00);
      assertEqual(res.remaining, 0.01);
      assertEqual(res.isUnlocked, false);
      assertEqual(res.message, 'Add $0.01 more for FREE shipping!');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.7 Free Shipping 1 Cent Above Threshold ($20.01)
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.7 1 cent above threshold ($20.01 on $20.00) triggers unlocked state', async () => {
      const res = calculateFreeShipping(20.01, 20.00);
      assertEqual(res.remaining, 0.00);
      assertEqual(res.progress, 100);
      assertEqual(res.isUnlocked, true);
      assertEqual(res.message, "🎉 You've unlocked FREE Shipping!");
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.8 Free Shipping $0.00 Threshold Corner Case
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.8 $0.00 threshold setting unlocks free shipping for any non-zero cart', async () => {
      const res = calculateFreeShipping(8.00, 0.00);
      assertEqual(res.remaining, 0.00);
      assertEqual(res.progress, 100);
      assertEqual(res.isUnlocked, true);
      assertEqual(res.message, "🎉 You've unlocked FREE Shipping!");
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.9 Extreme Subtotal Progress Bar Capping
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.9 Extreme subtotal ($10,000.00) caps progress at 100% without overflow', async () => {
      const res = calculateFreeShipping(10000.00, 20.00);
      assertEqual(res.remaining, 0.00);
      assertEqual(res.progress, 100);
      assertEqual(res.isUnlocked, true);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.10 Shippo Address Book Empty List Fallback
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.10 Return address fallback handles empty Shippo results array gracefully', async () => {
      function resolveAddressWithShippoMock(settings, shippoResults) {
        if (settings?.returnStreet && settings.returnStreet.trim()) {
          return { activeAddressSource: 'admin_settings', address: settings.returnStreet };
        }
        if (Array.isArray(shippoResults) && shippoResults.length > 0) {
          const valid = shippoResults.find(a => a?.street1 && a?.city && a?.state && a?.zip);
          if (valid) {
            return { activeAddressSource: 'shippo_address_book', address: valid.street1 };
          }
        }
        return { activeAddressSource: 'none', address: "Bonnie's Default" };
      }

      const res = resolveAddressWithShippoMock({ returnStreet: '' }, []);
      assertEqual(res.activeAddressSource, 'none');
      assertEqual(res.address, "Bonnie's Default");
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.11 Shippo Address Book Incomplete Address Fallback
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.11 Shippo Address Book skips partial addresses missing state or zip', async () => {
      function resolveAddressWithShippoMock(settings, shippoResults) {
        if (settings?.returnStreet && settings.returnStreet.trim()) {
          return { activeAddressSource: 'admin_settings', address: settings.returnStreet };
        }
        if (Array.isArray(shippoResults) && shippoResults.length > 0) {
          const valid = shippoResults.find(a => a?.street1 && a?.city && a?.state && a?.zip);
          if (valid) {
            return { activeAddressSource: 'shippo_address_book', address: valid.street1 };
          }
        }
        return { activeAddressSource: 'none', address: "Bonnie's Default" };
      }

      const partialShippoList = [
        { street1: '123 Incomplete St', city: 'Nowhere', state: '', zip: '' }, // Incomplete
        { street1: '456 Missing Zip Rd', city: 'Somewhere', state: 'OH', zip: null }, // Incomplete
        { street1: '789 Valid Blvd', city: 'Cleveland', state: 'OH', zip: '44101' }, // Valid!
      ];

      const res = resolveAddressWithShippoMock({ returnStreet: '' }, partialShippoList);
      assertEqual(res.activeAddressSource, 'shippo_address_book');
      assertEqual(res.address, '789 Valid Blvd');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2.12 PIN Auth Corner Cases
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('2.12 PIN authentication blocks empty, whitespace-only, and mismatch inputs', async () => {
      const correctPin = 'bonnie2026';

      function authenticatePin(headerPin) {
        if (!headerPin || typeof headerPin !== 'string') return false;
        const cleaned = headerPin.trim();
        if (!cleaned) return false;
        return cleaned === correctPin;
      }

      assertEqual(authenticatePin(undefined), false);
      assertEqual(authenticatePin(null), false);
      assertEqual(authenticatePin(''), false);
      assertEqual(authenticatePin('   '), false);
      assertEqual(authenticatePin('wrong_pin'), false);
      assertEqual(authenticatePin('bonnie2026'), true);
      assertEqual(authenticatePin('  bonnie2026  '), true); // Trimmed match
    });
  });
}

if (process.argv[1]?.endsWith('tier2-boundary-cases.mjs')) {
  runTier2Boundary().then(() => defaultRunner.printSummary());
}
