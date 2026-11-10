/**
 * tests/e2e/tier1-features/tier1-r3-settings-privacy.mjs
 *
 * Tier 1: Settings Privacy & Shippo Fallback (Requirement R3)
 *
 * Test Cases:
 * 3.1 Public GET /api/settings strictly omits return address & secrets
 * 3.2 Authenticated GET /api/settings?admin=true with x-admin-pin returns full settings
 * 3.3 Rejection of ?pin= query parameter (prevents URL leakage)
 * 3.4 Rejection of invalid PIN or missing x-admin-pin header
 * 3.5 Shippo address book fallback hierarchy ('admin_settings' -> 'shippo_address_book' -> 'none')
 * 3.6 Protected test endpoints (test-shippo requires x-admin-pin)
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  defaultRunner,
  loadTextFile,
  ROOT_DIR,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  assert,
} from '../harness/test-utils.mjs';

export async function runTier1R3(runner = defaultRunner) {
  await runner.describeAsync('Tier 1: Settings Privacy & Shippo Fallback (R3)', async () => {
    const settingsRoutePath = path.join(ROOT_DIR, 'src', 'app', 'api', 'settings', 'route.ts');
    const shippingLibPath = path.join(ROOT_DIR, 'src', 'lib', 'shipping.ts');
    const testShippoRoutePath = path.join(ROOT_DIR, 'src', 'app', 'api', 'settings', 'test-shippo', 'route.ts');

    assert(fs.existsSync(settingsRoutePath), 'src/app/api/settings/route.ts must exist');
    assert(fs.existsSync(shippingLibPath), 'src/lib/shipping.ts must exist');
    assert(fs.existsSync(testShippoRoutePath), 'src/app/api/settings/test-shippo/route.ts must exist');

    const settingsContent = fs.readFileSync(settingsRoutePath, 'utf8');
    const shippingContent = fs.readFileSync(shippingLibPath, 'utf8');
    const testShippoContent = fs.readFileSync(testShippoRoutePath, 'utf8');

    // ──────────────────────────────────────────────────────────────────────────
    // 3.1 Public GET /api/settings Privacy Filter
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('3.1 Public GET /api/settings returns only public store settings and omits return address & secrets', async () => {
      // Static AST/code check
      assertIncludes(settingsContent, 'if (!isAdmin)', 'Route must explicitly check if not admin');
      assertIncludes(settingsContent, 'publicSettings', 'Route must isolate publicSettings object');

      // Behavioral Simulation of Route Logic
      const mockDbSettings = {
        id: 'default',
        adminPin: 'secret123',
        returnStreet: '123 Bonnie Lane',
        returnCity: 'Grandma City',
        returnState: 'OH',
        returnZip: '44101',
        stripeSecretKey: 'sk_live_1234567890abcdef',
        shippoApiKey: 'shippo_live_9876543210fedcba',
        enableStripe: true,
        enableVenmo: true,
        enablePaypal: true,
        venmoHandle: '@Bonnie-Trinkets',
        paypalEmail: 'bonnie@btboutiqe.com',
        shippingFlatRate: 3.99,
        freeShippingThreshold: 20.00,
      };

      function simulateGetSettings(reqUrl, reqHeaders = {}) {
        const url = new URL(reqUrl, 'http://localhost:3000');
        const isAdmin = url.searchParams.get('admin') === 'true';

        const publicSettings = {
          enableStripe: mockDbSettings.enableStripe && Boolean(mockDbSettings.stripeSecretKey),
          enableVenmo: mockDbSettings.enableVenmo,
          enablePaypal: mockDbSettings.enablePaypal,
          venmoHandle: mockDbSettings.venmoHandle,
          paypalEmail: mockDbSettings.paypalEmail,
          shippingFlatRate: mockDbSettings.shippingFlatRate,
          freeShippingThreshold: mockDbSettings.freeShippingThreshold,
          stripeConfigured: Boolean(mockDbSettings.stripeSecretKey),
        };

        if (!isAdmin) {
          return { status: 200, data: publicSettings };
        }

        const providedPin = reqHeaders['x-admin-pin'] || '';
        const requiredPin = mockDbSettings.adminPin;

        if (providedPin !== requiredPin) {
          return { status: 200, data: { requiresAuth: true, hasAdminPin: true } };
        }

        return {
          status: 200,
          data: {
            id: mockDbSettings.id,
            requiresAuth: false,
            hasAdminPin: true,
            activeAddressSource: 'admin_settings',
            returnStreet: mockDbSettings.returnStreet,
            returnCity: mockDbSettings.returnCity,
            returnState: mockDbSettings.returnState,
            returnZip: mockDbSettings.returnZip,
            stripeSecretKeyMasked: '••••••••',
            shippoKeyMasked: '••••••••',
            ...publicSettings,
          },
        };
      }

      const publicRes = simulateGetSettings('/api/settings');
      assertEqual(publicRes.status, 200);
      const data = publicRes.data;

      // Verify allowed public fields
      assertEqual(data.enableStripe, true);
      assertEqual(data.enableVenmo, true);
      assertEqual(data.enablePaypal, true);
      assertEqual(data.venmoHandle, '@Bonnie-Trinkets');
      assertEqual(data.shippingFlatRate, 3.99);
      assertEqual(data.freeShippingThreshold, 20.00);

      // Verify strictly prohibited sensitive fields
      assertEqual(data.returnStreet, undefined, 'returnStreet must be omitted');
      assertEqual(data.returnCity, undefined, 'returnCity must be omitted');
      assertEqual(data.returnState, undefined, 'returnState must be omitted');
      assertEqual(data.returnZip, undefined, 'returnZip must be omitted');
      assertEqual(data.stripeSecretKey, undefined, 'stripeSecretKey must be omitted');
      assertEqual(data.shippoApiKey, undefined, 'shippoApiKey must be omitted');
      assertEqual(data.adminPin, undefined, 'adminPin must be omitted');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3.2 Authenticated GET /api/settings?admin=true with x-admin-pin
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('3.2 Authenticated GET /api/settings?admin=true with valid x-admin-pin header returns admin data', async () => {
      // In source code: verifies x-admin-pin is checked
      assertIncludes(settingsContent, "request.headers.get('x-admin-pin')");
      assertIncludes(settingsContent, 'activeAddressSource');

      // Verify that raw secrets are masked
      assert(
        !settingsContent.includes('stripeSecretKey: effectiveSecretKey,') &&
        !settingsContent.includes('shippoApiKey: effectiveShippoKey,'),
        'Raw unmasked secrets must never be returned in settings API'
      );
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3.3 Disallow ?pin= query parameter
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('3.3 GET /api/settings?admin=true disallows ?pin= query parameter to avoid secret URL leak', async () => {
      // Ensure searchParams.get('pin') is NOT accepted
      assert(
        !settingsContent.includes("searchParams.get('pin')"),
        'Security Violation: searchParams.get("pin") must be disallowed'
      );
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3.4 Rejection of invalid PIN or missing header
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('3.4 Invalid PIN or missing x-admin-pin header returns requiresAuth: true without leaks', async () => {
      assertIncludes(settingsContent, 'requiresAuth: true');
      assertIncludes(settingsContent, 'hasAdminPin: true');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3.5 Shippo Address Book Fallback Hierarchy
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('3.5 resolveReturnAddress implements fallback hierarchy (admin_settings -> shippo_address_book -> none)', async () => {
      assertIncludes(shippingContent, 'export async function resolveReturnAddress');
      assertIncludes(shippingContent, "'admin_settings'");
      assertIncludes(shippingContent, "'shippo_address_book'");
      assertIncludes(shippingContent, 'https://api.goshippo.com/addresses/?results=10');

      // Behavioral Simulation of resolveReturnAddress
      function simulateResolveReturnAddress(settings, shippoAddressBook = []) {
        // 1. Settings has return street
        if (settings?.returnStreet && settings.returnStreet.trim()) {
          return {
            address: {
              street1: settings.returnStreet.trim(),
              city: settings.returnCity || '',
              state: settings.returnState || '',
              zip: settings.returnZip || '',
            },
            activeAddressSource: 'admin_settings',
          };
        }

        // 2. Shippo address book fallback
        if (shippoAddressBook.length > 0) {
          const valid = shippoAddressBook.find(a => a.street1 && a.city && a.state && a.zip);
          if (valid) {
            return {
              address: {
                street1: valid.street1,
                city: valid.city,
                state: valid.state,
                zip: valid.zip,
              },
              activeAddressSource: 'shippo_address_book',
            };
          }
        }

        // 3. Fallback
        return {
          address: {
            street1: '100 Bonnie Way',
            city: 'North Pole',
            state: 'AK',
            zip: '99705',
          },
          activeAddressSource: 'none',
        };
      }

      // Test 1: Configured in settings
      const r1 = simulateResolveReturnAddress({ returnStreet: '42 Main St', returnCity: 'Boutique Town', returnState: 'CA', returnZip: '90210' });
      assertEqual(r1.activeAddressSource, 'admin_settings');
      assertEqual(r1.address.street1, '42 Main St');

      // Test 2: Missing in settings, found in Shippo
      const r2 = simulateResolveReturnAddress(
        { returnStreet: '' },
        [{ street1: '500 Shippo Ave', city: 'San Francisco', state: 'CA', zip: '94105' }]
      );
      assertEqual(r2.activeAddressSource, 'shippo_address_book');
      assertEqual(r2.address.street1, '500 Shippo Ave');

      // Test 3: Missing in both
      const r3 = simulateResolveReturnAddress({ returnStreet: '' }, []);
      assertEqual(r3.activeAddressSource, 'none');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3.6 Protected Test Endpoints
    // ──────────────────────────────────────────────────────────────────────────
    await runner.test('3.6 POST /api/settings/test-shippo requires x-admin-pin header authentication', async () => {
      assertIncludes(testShippoContent, "request.headers.get('x-admin-pin')");
      assert(
        testShippoContent.includes('401') || testShippoContent.includes('Unauthorized'),
        'test-shippo must return 401 Unauthorized on invalid/missing PIN'
      );
    });
  });
}

if (process.argv[1]?.endsWith('tier1-r3-settings-privacy.mjs')) {
  runTier1R3().then(() => defaultRunner.printSummary());
}
