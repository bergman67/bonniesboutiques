#!/usr/bin/env node
import assert from 'node:assert';
import dotenv from 'dotenv';
dotenv.config();

import { resolveReturnAddress, parseShippingAddress } from '../src/lib/shipping.ts';
import { GET as settingsGET } from '../src/app/api/settings/route.ts';
import { POST as testShippoPOST, GET as testShippoGET } from '../src/app/api/settings/test-shippo/route.ts';
import prismaModule from '../src/lib/prisma.ts';
const prisma = prismaModule.storeSettings ? prismaModule : (prismaModule.default || prismaModule.prisma);

async function run() {
  console.log('Testing Requirement R3: Settings Privacy & Shippo Fallback...');
  let passed = 0;

  // 1. Test parseShippingAddress
  const parsed = parseShippingAddress('123 Main St, New York, NY 10001 (US)');
  assert.strictEqual(parsed.street1, '123 Main St');
  assert.strictEqual(parsed.city, 'New York');
  assert.strictEqual(parsed.state, 'NY');
  assert.strictEqual(parsed.zip, '10001');
  assert.strictEqual(parsed.country, 'US');
  console.log('✔ parseShippingAddress works correctly');
  passed++;

  // 2. Test resolveReturnAddress with admin settings populated
  const adminResolved = await resolveReturnAddress({
    returnName: 'Bonnie Test',
    returnStreet: '456 Crafter Lane',
    returnCity: 'Phoenix',
    returnState: 'AZ',
    returnZip: '85001',
    shippoApiKey: 'shippo_test_mock',
  });
  assert.strictEqual(adminResolved.activeAddressSource, 'admin_settings');
  assert.strictEqual(adminResolved.address.street1, '456 Crafter Lane');
  assert.strictEqual(adminResolved.address.city, 'Phoenix');
  assert.strictEqual(adminResolved.address.state, 'AZ');
  assert.strictEqual(adminResolved.address.zip, '85001');
  console.log('✔ resolveReturnAddress correctly identifies admin_settings source');
  passed++;

  // 3. Test resolveReturnAddress with empty returnStreet and invalid shippo key
  const noneResolved = await resolveReturnAddress({
    returnName: "Bonnie's Boutique",
    returnStreet: '',
    returnCity: '',
    returnState: '',
    returnZip: '',
    shippoApiKey: 'invalid_key_that_fails',
  });
  assert.strictEqual(noneResolved.activeAddressSource, 'none');
  console.log('✔ resolveReturnAddress falls back to none when unconfigured');
  passed++;

  // 4. Test resolveReturnAddress with mock Shippo API fetch
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url, options) => {
      if (String(url).includes('https://api.goshippo.com/addresses/')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                name: 'Bonnie Shippo Book',
                street1: '789 Craft Way',
                city: 'Tucson',
                state: 'AZ',
                zip: '85701',
                country: 'US',
              },
            ],
          }),
        };
      }
      return originalFetch(url, options);
    };

    const shippoResolved = await resolveReturnAddress({
      returnStreet: null,
      shippoApiKey: 'shippo_live_mock',
    });
    assert.strictEqual(shippoResolved.activeAddressSource, 'shippo_address_book');
    assert.strictEqual(shippoResolved.address.street1, '789 Craft Way');
    assert.strictEqual(shippoResolved.address.city, 'Tucson');
    assert.strictEqual(shippoResolved.address.name, 'Bonnie Shippo Book');
    console.log('✔ resolveReturnAddress automatically pulls from Shippo address book fallback');
    passed++;
  } finally {
    global.fetch = originalFetch;
  }

  // 5. Test Settings GET public endpoint (no ?admin=true)
  const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  const publicReq = new Request('http://localhost:3000/api/settings');
  const publicRes = await settingsGET(publicReq);
  assert.strictEqual(publicRes.status, 200);
  const publicData = await publicRes.json();

  // Verify safe public fields exist
  assert('enableStripe' in publicData, 'enableStripe must be present in public response');
  assert('shippingFlatRate' in publicData, 'shippingFlatRate must be present in public response');
  assert('freeShippingThreshold' in publicData, 'freeShippingThreshold must be present in public response');

  // Verify sensitive fields NEVER leak
  assert(!('returnStreet' in publicData), 'returnStreet must NEVER leak in public response');
  assert(!('returnCity' in publicData), 'returnCity must NEVER leak in public response');
  assert(!('returnState' in publicData), 'returnState must NEVER leak in public response');
  assert(!('returnZip' in publicData), 'returnZip must NEVER leak in public response');
  assert(!('shippoApiKey' in publicData), 'shippoApiKey must NEVER leak in public response');
  assert(!('stripeSecretKey' in publicData), 'stripeSecretKey must NEVER leak in public response');
  assert(!('adminPin' in publicData), 'adminPin must NEVER leak in public response');
  console.log('✔ GET /api/settings (public) strictly omits all sensitive fields');
  passed++;

  // 6. Test Settings GET with ?admin=true but NO x-admin-pin header
  const adminNoPinReq = new Request('http://localhost:3000/api/settings?admin=true');
  const adminNoPinRes = await settingsGET(adminNoPinReq);
  const adminNoPinData = await adminNoPinRes.json();

  assert(!('returnStreet' in adminNoPinData), 'Unauthenticated admin GET must not contain returnStreet');
  assert(!('stripeSecretKey' in adminNoPinData), 'Unauthenticated admin GET must not contain stripeSecretKey');
  assert(!('shippoApiKey' in adminNoPinData), 'Unauthenticated admin GET must not contain shippoApiKey');
  console.log('✔ GET /api/settings?admin=true without x-admin-pin protects sensitive data');
  passed++;

  // 7. Test Settings GET with ?admin=true&pin=... query param (disallowed)
  const pinInUrlReq = new Request('http://localhost:3000/api/settings?admin=true&pin=wrongorright');
  const pinInUrlRes = await settingsGET(pinInUrlReq);
  const pinInUrlData = await pinInUrlRes.json();
  assert(!('returnStreet' in pinInUrlData), 'Query param pin must NOT authenticate');
  console.log('✔ Query parameter ?pin= is ignored and does NOT authenticate');
  passed++;

  // 8. Test Settings GET with ?admin=true and valid x-admin-pin
  const requiredPin = settings?.adminPin || process.env.ADMIN_PASSWORD || '';
  if (requiredPin) {
    const adminAuthedReq = new Request('http://localhost:3000/api/settings?admin=true', {
      headers: { 'x-admin-pin': requiredPin },
    });
    const adminAuthedRes = await settingsGET(adminAuthedReq);
    const adminAuthedData = await adminAuthedRes.json();

    assert.strictEqual(adminAuthedData.requiresAuth, false);
    assert.strictEqual(adminAuthedData.hasAdminPin, true);
    assert('activeAddressSource' in adminAuthedData, 'Admin response must include activeAddressSource');
    assert(['admin_settings', 'shippo_address_book', 'none'].includes(adminAuthedData.activeAddressSource));
    assert('returnStreet' in adminAuthedData, 'Authenticated admin response includes returnStreet');
    console.log(`✔ Authenticated GET /api/settings?admin=true returns activeAddressSource: '${adminAuthedData.activeAddressSource}'`);
    passed++;
  } else {
    console.log('ℹ No adminPin configured in database or env, skipping authed GET test');
  }

  // 9. Test POST /api/settings/test-shippo without x-admin-pin (should be 401)
  const unauthedShippoReq = new Request('http://localhost:3000/api/settings/test-shippo', {
    method: 'POST',
    body: JSON.stringify({ shippoApiKey: 'test' }),
  });
  const unauthedShippoRes = await testShippoPOST(unauthedShippoReq);
  assert.strictEqual(unauthedShippoRes.status, 401);
  const unauthedShippoData = await unauthedShippoRes.json();
  assert.strictEqual(unauthedShippoData.ok, false);
  console.log('✔ POST /api/settings/test-shippo rejects unauthenticated requests with 401');
  passed++;

  // 10. Test POST /api/settings/test-shippo with wrong x-admin-pin (should be 401)
  const wrongPinShippoReq = new Request('http://localhost:3000/api/settings/test-shippo', {
    method: 'POST',
    headers: { 'x-admin-pin': 'definitely_wrong_pin_xyz' },
    body: JSON.stringify({ shippoApiKey: 'test' }),
  });
  const wrongPinShippoRes = await testShippoPOST(wrongPinShippoReq);
  assert.strictEqual(wrongPinShippoRes.status, 401);
  console.log('✔ POST /api/settings/test-shippo rejects incorrect PIN with 401');
  passed++;

  // 11. Test POST /api/settings/test-shippo with valid PIN & mock carrier check
  if (requiredPin) {
    const mockOriginalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).includes('https://api.goshippo.com/carrier_accounts/')) {
          return {
            ok: true,
            json: async () => ({
              results: [{ carrier: 'USPS' }, { carrier: 'UPS' }],
            }),
          };
        }
        if (String(url).includes('https://api.goshippo.com/addresses/')) {
          return {
            ok: true,
            json: async () => ({
              results: [
                {
                  name: "Bonnie's Workshop",
                  street1: '100 Craft Blvd',
                  city: 'Mesa',
                  state: 'AZ',
                  zip: '85201',
                  country: 'US',
                },
              ],
            }),
          };
        }
        return mockOriginalFetch(url, options);
      };

      const authedShippoReq = new Request('http://localhost:3000/api/settings/test-shippo', {
        method: 'POST',
        headers: { 'x-admin-pin': requiredPin },
        body: JSON.stringify({ shippoApiKey: 'shippo_live_mock1234567890' }),
      });
      const authedShippoRes = await testShippoPOST(authedShippoReq);
      assert.strictEqual(authedShippoRes.status, 200);
      const authedShippoData = await authedShippoRes.json();

      assert.strictEqual(authedShippoData.ok, true);
      assert.strictEqual(authedShippoData.valid, true);
      assert('activeAddressSource' in authedShippoData, 'test-shippo response must include activeAddressSource');
      assert('address' in authedShippoData, 'test-shippo response must include address');
      console.log(`✔ Authenticated POST /api/settings/test-shippo returns ok: true, activeAddressSource: '${authedShippoData.activeAddressSource}'`);
      passed++;
      // 12. Test GET /api/settings/test-shippo with valid PIN
      const authedShippoGetReq = new Request('http://localhost:3000/api/settings/test-shippo', {
        method: 'GET',
        headers: { 'x-admin-pin': requiredPin },
      });
      const authedShippoGetRes = await testShippoGET(authedShippoGetReq);
      assert.strictEqual(authedShippoGetRes.status, 200);
      const authedShippoGetData = await authedShippoGetRes.json();
      assert.strictEqual(authedShippoGetData.ok, true);
      assert.strictEqual(authedShippoGetData.valid, true);
      console.log(`✔ Authenticated GET /api/settings/test-shippo returns ok: true, activeAddressSource: '${authedShippoGetData.activeAddressSource}'`);
      passed++;
    } finally {
      global.fetch = mockOriginalFetch;
    }
  }

  console.log(`\n🎉 ALL ${passed} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
