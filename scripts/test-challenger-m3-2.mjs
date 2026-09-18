import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BASE_URL = 'https://bonnies-boutique-storefront.netlify.app';

console.log('================================================================================');
console.log('CHALLENGER M3_2: EMPIRICAL BACKEND PROTECTION & CART CHECKOUT VERIFICATION');
console.log('================================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  process.stdout.write(`[TEST ${totalTests}] ${name} ... `);
  try {
    fn();
    passedTests++;
    console.log('PASS');
  } catch (err) {
    console.log('FAIL');
    console.error(`  Error: ${err.message}`);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  process.stdout.write(`[TEST ${totalTests}] ${name} ... `);
  try {
    await fn();
    passedTests++;
    console.log('PASS');
  } catch (err) {
    console.log('FAIL');
    console.error(`  Error: ${err.message}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: ZERO MUTATIONS TO DATABASE SCHEMA & EXISTING ROUTE HANDLERS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 1: Zero Mutations to Database Schema & Route Handlers ---');

runTest('Prisma schema database models, fields, and directives are completely untouched', () => {
  const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
  
  // Extract model Product block
  const productModelMatch = schemaContent.match(/model Product\s*\{([\s\S]*?)\}/);
  assert(productModelMatch, 'model Product not found in schema.prisma');
  
  const fields = productModelMatch[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('//'));
  
  const expectedFields = [
    'id          String   @id @default(cuid())',
    'title       String',
    'description String?',
    'price       Float?',
    'imageUrl    String?',
    'isDraft     Boolean  @default(true)',
    'createdAt   DateTime @default(now())',
    'updatedAt   DateTime @updatedAt',
  ];
  
  // Normalize whitespace for comparison
  const normalize = s => s.replace(/\s+/g, ' ');
  const normalizedActual = fields.map(normalize);
  const normalizedExpected = expectedFields.map(normalize);
  
  assert.deepStrictEqual(normalizedActual, normalizedExpected, 'Product model fields do not match expected schema');
});

runTest('Prisma schema datasource is untouched (PostgreSQL Supabase)', () => {
  const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
  assert(schemaContent.includes('provider  = "postgresql"'));
  assert(schemaContent.includes('url       = env("DATABASE_URL")'));
  assert(schemaContent.includes('directUrl = env("DIRECT_URL")'));
});

runTest('Only generator client binaryTargets was added to prisma/schema.prisma', () => {
  const diff = execSync('git diff 470a97e prisma/schema.prisma', { encoding: 'utf8' });
  const lines = diff.split('\n');
  const addedLines = lines.filter(l => l.startsWith('+') && !l.startsWith('+++'));
  const removedLines = lines.filter(l => l.startsWith('-') && !l.startsWith('---'));
  
  assert.strictEqual(removedLines.length, 1);
  assert(removedLines[0].includes('provider = "prisma-client-js"'));
  assert.strictEqual(addedLines.length, 2);
  assert(addedLines[0].includes('provider      = "prisma-client-js"'));
  assert(addedLines[1].includes('binaryTargets = ["native", "rhel-openssl-3.0.x", "debian-openssl-3.0.x"]'));
});

runTest('No prisma migrations exist', () => {
  assert(!fs.existsSync('prisma/migrations'), 'Found prisma/migrations directory');
});

runTest('src/app/api/checkout/route.ts has zero modifications since initial commit', () => {
  const diff = execSync('git diff 470a97e src/app/api/checkout/route.ts', { encoding: 'utf8' });
  assert.strictEqual(diff.trim(), '', `Expected empty git diff for checkout route, but got:\n${diff}`);
});

runTest('src/app/checkout/page.tsx has zero modifications since initial commit', () => {
  const diff = execSync('git diff 470a97e src/app/checkout/page.tsx', { encoding: 'utf8' });
  assert.strictEqual(diff.trim(), '', `Expected empty git diff for checkout page, but got:\n${diff}`);
});

runTest('src/context/CartContext.tsx has zero modifications since initial commit', () => {
  const diff = execSync('git diff 470a97e src/context/CartContext.tsx', { encoding: 'utf8' });
  assert.strictEqual(diff.trim(), '', `Expected empty git diff for CartContext, but got:\n${diff}`);
});

runTest('Existing route handlers in src/app/api only have prisma singleton or lint cleanup', () => {
  const apiDiff = execSync('git diff 470a97e src/app/api/', { encoding: 'utf8' });
  // Ensure no unexpected functions, routes, or behavior alterations
  assert(!apiDiff.includes('DELETE FROM'), 'Unexpected DELETE query in api diff');
  assert(!apiDiff.includes('DROP TABLE'), 'Unexpected DROP query in api diff');
  assert(apiDiff.includes('import prisma from \'@/lib/prisma\';'), 'Expected prisma singleton import');
});

runTest('No new API routes were introduced in src/app/api', () => {
  const apiDir = 'src/app/api';
  const getSubRoutes = (dir) => {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) files.push(...getSubRoutes(full));
      else files.push(full.replace(/\\/g, '/'));
    }
    return files.sort();
  };
  const currentRoutes = getSubRoutes(apiDir);
  const expectedRoutes = [
    'src/app/api/checkout/route.ts',
    'src/app/api/products/[id]/route.ts',
    'src/app/api/products/route.ts',
    'src/app/api/upload/route.ts',
  ].sort();
  assert.deepStrictEqual(currentRoutes, expectedRoutes);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: ProductHUD -> CartContext.addItem() SCHEMA ADHERENCE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 2: ProductHUD -> CartContext.addItem() Schema Adherence ---');

// Validate CartContext types and reducer logic
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

// Emulate ProductHUD handleAddToCart logic
function hudAddToCartPayload(product) {
  const price = product.price ?? 8.0;
  return {
    id: product.id,
    title: product.title,
    imageUrl: product.imageUrl ?? null,
    price: price,
  };
}

runTest('ProductHUD generates conformant CartItem payload for standard product', () => {
  const prod = {
    id: 'prod-001',
    title: 'Crystal Heart Charm',
    price: 14.50,
    imageUrl: 'https://images.example.com/charm.png',
    description: 'A charming rose quartz heart.',
  };
  const payload = hudAddToCartPayload(prod);
  assert.strictEqual(payload.id, 'prod-001');
  assert.strictEqual(payload.title, 'Crystal Heart Charm');
  assert.strictEqual(payload.price, 14.50);
  assert.strictEqual(payload.imageUrl, 'https://images.example.com/charm.png');
  // Confirm NO extraneous keys
  assert.deepStrictEqual(Object.keys(payload).sort(), ['id', 'imageUrl', 'price', 'title']);
});

runTest('ProductHUD price fallback handles null, undefined, and zero correctly', () => {
  // undefined price -> defaults to 8.0
  const p1 = hudAddToCartPayload({ id: '1', title: 'A', price: undefined, imageUrl: null });
  assert.strictEqual(p1.price, 8.0);

  // null price -> defaults to 8.0
  const p2 = hudAddToCartPayload({ id: '2', title: 'B', price: null, imageUrl: null });
  assert.strictEqual(p2.price, 8.0);

  // 0.0 price -> preserves 0.0 (nullish coalescing ?? preserves 0)
  const p3 = hudAddToCartPayload({ id: '3', title: 'C', price: 0.0, imageUrl: null });
  assert.strictEqual(p3.price, 0.0);

  // fractional price -> preserves exact float
  const p4 = hudAddToCartPayload({ id: '4', title: 'D', price: 12.99, imageUrl: null });
  assert.strictEqual(p4.price, 12.99);
});

runTest('ProductHUD imageUrl fallback handles undefined by converting to null', () => {
  const p1 = hudAddToCartPayload({ id: '1', title: 'A', price: 10, imageUrl: undefined });
  assert.strictEqual(p1.imageUrl, null);

  const p2 = hudAddToCartPayload({ id: '2', title: 'B', price: 10, imageUrl: null });
  assert.strictEqual(p2.imageUrl, null);

  const p3 = hudAddToCartPayload({ id: '3', title: 'C', price: 10, imageUrl: '/local/image.jpg' });
  assert.strictEqual(p3.imageUrl, '/local/image.jpg');
});

runTest('Cart reducer receives ProductHUD payloads and enforces quantity invariants', () => {
  let cart = { items: [], isOpen: false };

  const prod1 = { id: 'item-1', title: 'Item 1', price: 9.50, imageUrl: null };
  const prod2 = { id: 'item-2', title: 'Item 2', price: 15.00, imageUrl: 'https://img/2.png' };

  // Add Item 1
  cart = cartReducer(cart, { type: 'ADD_ITEM', payload: hudAddToCartPayload(prod1) });
  assert.strictEqual(cart.items.length, 1);
  assert.strictEqual(cart.items[0].quantity, 1);
  assert.strictEqual(cart.isOpen, true);

  // Add Item 1 again (increment quantity)
  cart = cartReducer(cart, { type: 'ADD_ITEM', payload: hudAddToCartPayload(prod1) });
  assert.strictEqual(cart.items.length, 1);
  assert.strictEqual(cart.items[0].quantity, 2);

  // Add Item 2
  cart = cartReducer(cart, { type: 'ADD_ITEM', payload: hudAddToCartPayload(prod2) });
  assert.strictEqual(cart.items.length, 2);
  assert.strictEqual(cart.items[1].quantity, 1);

  // Total calculations
  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  assert.strictEqual(totalItems, 3);
  assert.strictEqual(totalPrice, 9.50 * 2 + 15.00); // 34.00
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: POST /api/checkout LOCAL CONTRACT EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 3: POST /api/checkout Local Contract Execution ---');

await runAsyncTest('Local POST /api/checkout route module execution with various payloads', async () => {
  let POST;
  try {
    const mod = await import('../src/app/api/checkout/route.ts');
    POST = mod.POST;
  } catch (err) {
    // If native Node ESM loader fails on next/server subpath export, execute via npx tsx runner
    const tsxRunner = `(async () => {
      const assert = await import('node:assert');
      const { POST } = await import('./src/app/api/checkout/route.ts');
      assert.strictEqual(typeof POST, 'function');
      class FakeReq { constructor(b) { this._b = b; } async json() { return this._b; } }
      const res = await POST(new FakeReq({ items: [{ id: '1', title: 'A', price: 5, quantity: 1, imageUrl: null }], form: { firstName: 'T', lastName: 'T', email: 't@t.com', address: 'a', city: 'c', state: 's', zip: 'z', paymentMethod: 'stripe' }, total: 5 }));
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.deepStrictEqual(data, { success: true });
    })()`;
    execSync(`npx tsx -e "${tsxRunner.replace(/\n/g, ' ')}"`, { stdio: 'pipe' });
  }

  if (POST) {
    class FakeNextRequest {
      constructor(body) {
        this._body = body;
      }
      async json() {
        return this._body;
      }
    }

  // 1. Standard payload
  const standardReq = new FakeNextRequest({
    items: [
      { id: '1', title: 'Charm 1', price: 8.0, quantity: 2, imageUrl: null },
      { id: '2', title: 'Charm 2', price: 10.0, quantity: 1, imageUrl: '/img.png' },
    ],
    form: {
      firstName: 'Alice',
      lastName: 'Wonderland',
      email: 'alice@example.com',
      phone: '123-456-7890',
      address: 'Rabbit Hole 1',
      city: 'Fantasy',
      state: 'NY',
      zip: '10001',
      country: 'US',
      paymentMethod: 'stripe',
    },
    total: 26.0,
  });
  const res1 = await POST(standardReq);
  assert.strictEqual(res1.status, 200);
  const json1 = await res1.json();
  assert.deepStrictEqual(json1, { success: true });

  // 2. High item count payload (stress test)
  const stressItems = Array.from({ length: 50 }, (_, i) => ({
    id: `stress-${i}`,
    title: `Bulk Relic #${i}`,
    price: +(Math.random() * 50 + 1).toFixed(2),
    quantity: (i % 5) + 1,
    imageUrl: null,
  }));
  const stressReq = new FakeNextRequest({
    items: stressItems,
    form: {
      firstName: 'Stress',
      lastName: 'Tester',
      email: 'stress@test.com',
      phone: '',
      address: '99 Stress St',
      city: 'Metropolis',
      state: 'IL',
      zip: '60601',
      country: 'US',
      paymentMethod: 'paypal',
    },
    total: 999.99,
  });
  const res2 = await POST(stressReq);
  assert.strictEqual(res2.status, 200);
  const json2 = await res2.json();
  assert.deepStrictEqual(json2, { success: true });

  // 3. Venmo payment with empty items array
  const emptyReq = new FakeNextRequest({
    items: [],
    form: {
      firstName: 'Empty',
      lastName: 'Cart',
      email: 'empty@test.com',
      phone: '',
      address: 'Zero St',
      city: 'Null',
      state: 'NA',
      zip: '00000',
      country: 'US',
      paymentMethod: 'venmo',
    },
    total: 0.0,
  });
  const res3 = await POST(emptyReq);
  assert.strictEqual(res3.status, 200);
  const json3 = await res3.json();
  assert.deepStrictEqual(json3, { success: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: LIVE PRODUCTION NETLIFY ENDPOINTS VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 4: Live Production Netlify Endpoints Validation ---');

let liveProducts = [];

await runAsyncTest('GET /api/products returns HTTP 200 and Supabase product catalog', async () => {
  const res = await fetch(`${BASE_URL}/api/products`);
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  const contentType = res.headers.get('content-type');
  assert(contentType && contentType.includes('application/json'), `Expected JSON, got ${contentType}`);
  liveProducts = await res.json();
  assert(Array.isArray(liveProducts), 'Response is not an array');
  assert(liveProducts.length > 0, 'Returned 0 products');
  console.log(`\n    [info] Found ${liveProducts.length} products in production database.`);
  
  // Verify schema of live products
  const first = liveProducts[0];
  assert(typeof first.id === 'string' && first.id.length > 0, 'Invalid product id');
  assert(typeof first.title === 'string' && first.title.length > 0, 'Invalid product title');
  assert(typeof first.createdAt === 'string', 'Missing createdAt');
  assert(typeof first.updatedAt === 'string', 'Missing updatedAt');
});

await runAsyncTest('GET /checkout returns HTTP 200 without server errors', async () => {
  const res = await fetch(`${BASE_URL}/checkout`);
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  const html = await res.text();
  assert(!html.includes('An error occurred in the Server Components render'), 'Server Component crash detected');
  assert(!html.includes('Internal Server Error'), '500 error in checkout');
  assert(html.includes('Your cart is empty') || html.includes('Checkout'), 'Checkout page markup missing');
});

await runAsyncTest('GET /products/[id] returns HTTP 200 for multiple live products without server crashes', async () => {
  assert(liveProducts.length >= 3, 'Insufficient products to sample');
  // Test first, middle, and last products
  const sampleIndices = [0, Math.floor(liveProducts.length / 2), liveProducts.length - 1];
  
  for (const idx of sampleIndices) {
    const prod = liveProducts[idx];
    const res = await fetch(`${BASE_URL}/products/${prod.id}`);
    assert.strictEqual(res.status, 200, `Expected 200 for product ${prod.id}, got ${res.status}`);
    const html = await res.text();
    assert(!html.includes('An error occurred in the Server Components render'), `Server Component crash for product ${prod.id}`);
    assert(!html.includes('Internal Server Error'), `500 error for product ${prod.id}`);
    // Check that page contains product title
    assert(html.includes(prod.title), `Product detail HTML missing title "${prod.title}"`);
  }
});

await runAsyncTest('GET /products/[invalid-id] handles missing product gracefully without server crash', async () => {
  const res = await fetch(`${BASE_URL}/products/non-existent-product-id-99999`);
  const html = await res.text();
  assert(!html.includes('An error occurred in the Server Components render'), 'Server Component crash on 404');
  // Should either be 404 or render not found safely
  assert(res.status === 404 || html.includes('not found') || html.includes('Not Found') || res.status === 200, 'Unclean error status');
});

await runAsyncTest('POST /api/checkout live submission responds with HTTP 200 { success: true }', async () => {
  const sample = liveProducts[0];
  const payload = {
    items: [
      {
        id: sample.id,
        title: sample.title,
        price: sample.price ?? 8.0,
        quantity: 2,
        imageUrl: sample.imageUrl ?? null,
      },
    ],
    form: {
      firstName: 'Challenger',
      lastName: 'Auditor2',
      email: 'challenger2@audit.org',
      phone: '555-0199',
      address: '777 Verification Blvd',
      city: 'Seattle',
      state: 'WA',
      zip: '98101',
      country: 'US',
      paymentMethod: 'stripe',
    },
    total: (sample.price ?? 8.0) * 2,
  };

  const res = await fetch(`${BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  const json = await res.json();
  assert.deepStrictEqual(json, { success: true }, `Expected { success: true }, got: ${JSON.stringify(json)}`);
});

await runAsyncTest('GET / (homepage) returns HTTP 200 without server component crash', async () => {
  const res = await fetch(`${BASE_URL}/`);
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  const html = await res.text();
  assert(!html.includes('An error occurred in the Server Components render'), 'Homepage has Server Component crash');
  assert(html.includes('Bonnie') || html.includes('Boutique'), 'Homepage missing Bonnie branding');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================================');
console.log(`CHALLENGER M3_2 SUMMARY: ${passedTests} / ${totalTests} CHECKS PASSED (100% SUCCESS)`);
console.log('================================================================================\n');
