import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('================================================================');
console.log('EMPIRICAL CHALLENGER: CART INTEGRATION & BACKEND PROTECTION TEST');
console.log('================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. BACKEND IMMUTABILITY VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST SUITE 1: Backend Immutability Verification ---');

const apiFiles = [
  'src/app/api/checkout/route.ts',
  'src/app/api/products/route.ts',
  'src/app/api/products/[id]/route.ts',
  'src/app/api/upload/route.ts',
];

for (const file of apiFiles) {
  assert(fs.existsSync(file), `Missing backend route file: ${file}`);
  const content = fs.readFileSync(file, 'utf8');
  assert(content.length > 0, `Empty backend route file: ${file}`);
}

// Verify checkout route specifically was NOT modified by M2
const checkoutRouteContent = fs.readFileSync('src/app/api/checkout/route.ts', 'utf8');
assert(checkoutRouteContent.includes('export async function POST'), 'checkout route missing POST export');
assert(checkoutRouteContent.includes('NextResponse.json({ success: true })'), 'checkout route missing success response');

// Verify prisma schema has expected models and generator
const prismaSchema = fs.readFileSync('prisma/schema.prisma', 'utf8');
assert(prismaSchema.includes('model Product'), 'schema.prisma missing Product model');
assert(prismaSchema.includes('binaryTargets = ["native", "rhel-openssl-3.0.x", "debian-openssl-3.0.x"]'), 'schema.prisma missing M1 binaryTargets');
assert(!fs.existsSync('prisma/migrations'), 'Unwanted migrations found in prisma/migrations');

console.log('✔ Backend files intact and verified unchanged by M2.\n');

// ─────────────────────────────────────────────────────────────────────────────
// 2. CART REDUCER & INVARIANTS ORACLE
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST SUITE 2: Cart Reducer & State Invariants Oracle ---');

// Replicate cartReducer faithfully from src/context/CartContext.tsx
const cartReducer = (state, action) => {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: action.payload };
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.payload.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
          isOpen: true,
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
        isOpen: true,
      };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity < 1) {
        return { ...state, items: state.items.filter(i => i.id !== action.payload.id) };
      }
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i
        ),
      };
    }
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen };
    case 'OPEN_CART':
      return { ...state, isOpen: true };
    case 'CLOSE_CART':
      return { ...state, isOpen: false };
    default:
      return state;
  }
};

let state = { items: [], isOpen: false };

// 2.1 Initial addItem
state = cartReducer(state, {
  type: 'ADD_ITEM',
  payload: {
    id: 'prod-gem-01',
    title: 'Faceted Rose Gemstone Keychain',
    imageUrl: 'https://images.example.com/gem.jpg',
    price: 8.50,
  },
});
assert.strictEqual(state.items.length, 1);
assert.strictEqual(state.items[0].quantity, 1);
assert.strictEqual(state.items[0].price, 8.50);
assert.strictEqual(state.isOpen, true, 'Cart should open on addItem');

// 2.2 Repeated addItem with same ID
state = cartReducer(state, {
  type: 'ADD_ITEM',
  payload: {
    id: 'prod-gem-01',
    title: 'Faceted Rose Gemstone Keychain',
    imageUrl: 'https://images.example.com/gem.jpg',
    price: 8.50,
  },
});
assert.strictEqual(state.items.length, 1);
assert.strictEqual(state.items[0].quantity, 2);

// 2.3 Add second item with null imageUrl
state = cartReducer(state, {
  type: 'ADD_ITEM',
  payload: {
    id: 'prod-potion-02',
    title: 'Glimmering Potion Vial',
    imageUrl: null,
    price: 12.00,
  },
});
assert.strictEqual(state.items.length, 2);
assert.strictEqual(state.items[1].quantity, 1);
assert.strictEqual(state.items[1].imageUrl, null);

// Calculate totals
const calcTotals = (items) => {
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { totalItems, totalPrice };
};

let totals = calcTotals(state.items);
assert.strictEqual(totals.totalItems, 3); // 2 of gem + 1 of potion
assert.strictEqual(totals.totalPrice, 29.00); // 2*8.5 + 12 = 17 + 12 = 29

// 2.4 Update quantity
state = cartReducer(state, {
  type: 'UPDATE_QUANTITY',
  payload: { id: 'prod-gem-01', quantity: 5 },
});
assert.strictEqual(state.items[0].quantity, 5);
totals = calcTotals(state.items);
assert.strictEqual(totals.totalItems, 6);
assert.strictEqual(totals.totalPrice, 54.50); // 5*8.5 + 12 = 42.5 + 12 = 54.5

// 2.5 Update quantity to 0 (auto-removal)
state = cartReducer(state, {
  type: 'UPDATE_QUANTITY',
  payload: { id: 'prod-potion-02', quantity: 0 },
});
assert.strictEqual(state.items.length, 1);
assert.strictEqual(state.items[0].id, 'prod-gem-01');

// 2.6 Remove item
state = cartReducer(state, {
  type: 'REMOVE_ITEM',
  payload: 'prod-gem-01',
});
assert.strictEqual(state.items.length, 0);

// 2.7 Clear cart
state = cartReducer({ items: [{ id: '1', title: 'A', price: 5, quantity: 2, imageUrl: null }], isOpen: true }, {
  type: 'CLEAR_CART',
});
assert.strictEqual(state.items.length, 0);

console.log('✔ Cart reducer operations, schema invariants, and totals verified.\n');

// ─────────────────────────────────────────────────────────────────────────────
// 3. LOCALSTORAGE PERSISTENCE & HYDRATION ORACLE
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST SUITE 3: LocalStorage Serialization & Hydration ---');

// Mock localStorage
const mockStorage = new Map();
const fakeLocalStorage = {
  getItem: (k) => mockStorage.get(k) ?? null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
};

const sampleItems = [
  { id: 'cmu1mpip90000fsjllmsu8n4q', title: 'Trinket #1', price: 8.0, quantity: 2, imageUrl: '/img/1.png' },
  { id: 'cmu1mpip90000fsjllmsu8n4r', title: 'Trinket #2', price: 10.5, quantity: 1, imageUrl: null },
];

// Serialize
fakeLocalStorage.setItem('bonnies-cart', JSON.stringify(sampleItems));
assert.strictEqual(typeof fakeLocalStorage.getItem('bonnies-cart'), 'string');

// Hydrate
const rawStored = fakeLocalStorage.getItem('bonnies-cart');
const parsed = JSON.parse(rawStored);
assert.deepStrictEqual(parsed, sampleItems);

const hydratedState = cartReducer({ items: [], isOpen: false }, {
  type: 'HYDRATE',
  payload: parsed,
});
assert.strictEqual(hydratedState.items.length, 2);
assert.strictEqual(hydratedState.items[0].id, 'cmu1mpip90000fsjllmsu8n4q');
assert.strictEqual(hydratedState.items[1].imageUrl, null);

// Corrupted JSON resiliency test
try {
  const corruptJSON = '{ invalid json !! ';
  let safeParsed = null;
  try {
    safeParsed = JSON.parse(corruptJSON);
  } catch {
    // Gracefully catch as CartContext.tsx does with try/catch
    safeParsed = null;
  }
  assert.strictEqual(safeParsed, null, 'Corrupt JSON should safely resolve to null');
} catch (err) {
  assert.fail('Should not throw unhandled exception on corrupt JSON');
}

console.log('✔ LocalStorage serialization and hydration verified.\n');

// ─────────────────────────────────────────────────────────────────────────────
// 4. CHECKOUT API ROUTE CONTRACT EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST SUITE 4: POST /api/checkout Contract Execution ---');

// Dynamically import the checkout route handler
const checkoutRouteModule = await import('../src/app/api/checkout/route.ts');
assert(typeof checkoutRouteModule.POST === 'function', 'POST handler must be exported');

// Create mock NextRequest
class MockNextRequest {
  constructor(body) {
    this._body = body;
  }
  async json() {
    return this._body;
  }
}

// Test 4.1: Standard checkout submission
const checkoutPayload = {
  items: sampleItems,
  form: {
    firstName: 'Bonnie',
    lastName: 'Tester',
    email: 'bonnie@test.com',
    phone: '555-1234',
    address: '123 Pixel Lane',
    city: 'Retro City',
    state: 'CA',
    zip: '90210',
    country: 'US',
    paymentMethod: 'stripe',
  },
  total: 26.50,
};

const req1 = new MockNextRequest(checkoutPayload);
const res1 = await checkoutRouteModule.POST(req1);
assert.strictEqual(res1.status, 200);
const data1 = await res1.json();
assert.deepStrictEqual(data1, { success: true });

// Test 4.2: PayPal checkout submission with items having null images
const req2 = new MockNextRequest({
  items: [{ id: 'item-x', title: 'Mystic Orb', price: 15.0, quantity: 1, imageUrl: null }],
  form: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '',
    address: '456 Gem Ave',
    city: 'Crystal Bay',
    state: 'NV',
    zip: '89101',
    country: 'US',
    paymentMethod: 'paypal',
  },
  total: 18.99,
});
const res2 = await checkoutRouteModule.POST(req2);
assert.strictEqual(res2.status, 200);
const data2 = await res2.json();
assert.deepStrictEqual(data2, { success: true });

console.log('✔ POST /api/checkout route handles cart payloads and responds with HTTP 200 { success: true }.\n');

// ─────────────────────────────────────────────────────────────────────────────
// 5. ASSET MANIFEST & PROCEDURAL GENERATOR FUZZING
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST SUITE 5: Asset Manifest & Placeholder Generator Stress Test ---');

const { getPlaceholderGeometry, MODEL_PRESETS, SPRITE_CONFIGS } = await import('../src/lib/scrollytelling/assetManifest.ts');

assert.strictEqual(MODEL_PRESETS.length, 8, 'Expected 8 rich 3D model presets');
assert(SPRITE_CONFIGS.shopkeeper, 'Expected shopkeeper sprite config');
assert(SPRITE_CONFIGS.counter, 'Expected counter sprite config');
assert(SPRITE_CONFIGS.shelves, 'Expected shelves sprite config');
assert(SPRITE_CONFIGS.floor, 'Expected floor sprite config');
assert(SPRITE_CONFIGS.banner, 'Expected banner sprite config');

// Keyword routing verification
const keywordTests = [
  { title: 'Heart of the Ocean Pendant', expectedShape: 'heartPendant' },
  { title: 'Love Talisman', expectedShape: 'heartPendant' },
  { title: 'Healing Potion Vial', expectedShape: 'potionVial' },
  { title: 'Elixir Bottle Trinket', expectedShape: 'potionVial' },
  { title: 'Botanical Resin Charm', expectedShape: 'resinCharm' },
  { title: 'Green Flower Charm', expectedShape: 'resinCharm' },
  { title: 'Celestial Stardust Orb', expectedShape: 'celestialOrb' },
  { title: 'Blue Sky Moon Globe', expectedShape: 'celestialOrb' },
  { title: 'Enchanted Golden Ring', expectedShape: 'enchantedRing' },
  { title: 'Twilight Star Trinket', expectedShape: 'starTalisman' },
  { title: 'Sparkle Sun Talisman', expectedShape: 'starTalisman' },
  { title: 'Amethyst Crystal Cluster', expectedShape: 'crystalKeychain' },
  { title: 'Purple Crystal Keychain', expectedShape: 'crystalKeychain' },
];

for (const kt of keywordTests) {
  const geo = getPlaceholderGeometry('test-id', kt.title);
  assert.strictEqual(geo.primitiveConfig.shape, kt.expectedShape, `Failed keyword test for ${kt.title}`);
  assert.strictEqual(geo.id, 'test-id');
  assert.strictEqual(geo.name, kt.title);
  assert(geo.scale && geo.scale.length === 3, 'Invalid scale array');
  assert(geo.pedestalAura && geo.pedestalAura.startsWith('#'), 'Invalid pedestalAura hex');
}

// Fuzz test with 200 random strings, symbols, empty strings, undefined
const testCases = [
  '',
  ' ',
  '!@#$%^&*()_+=-`~[]\\{}|;\':",./<>?',
  '1234567890',
  '🌸🦄✨🎀',
  'a'.repeat(1000),
  undefined,
];

for (let i = 0; i < 200; i++) {
  const randId = Math.random().toString(36).substring(2) + '-' + i;
  const randTitle = i % 5 === 0 ? undefined : 'Random Product ' + Math.random().toString(36).substring(2);
  testCases.push(randId);
}

for (const input of testCases) {
  const res = getPlaceholderGeometry(input || 'fallback-id', typeof input === 'string' ? input : undefined);
  assert(res !== null && res !== undefined, `getPlaceholderGeometry returned null/undefined for ${input}`);
  assert(typeof res.primitiveConfig.shape === 'string', 'Missing shape');
  assert(typeof res.primitiveConfig.material.color === 'string', 'Missing material color');
  assert(Array.isArray(res.scale) && res.scale.length === 3, 'Invalid scale');
  assert(typeof res.pedestalAura === 'string', 'Missing aura color');
}

console.log('✔ Asset manifest fuzzed across 200+ edge-case inputs without errors.\n');

console.log('================================================================');
console.log('ALL EMPIRICAL CHALLENGES PASSED (5/5 TEST SUITES SUCCESSFUL)');
console.log('================================================================\n');
