import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const restBase = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1`;
const anonHeaders = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl
    }
  }
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function reportResult(name, passed, detail = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  }
}

async function verifyPostgresCatalog() {
  console.log('\n============================================================');
  console.log('PART 1: PostgreSQL Catalog Inspection (pg_tables & pg_class)');
  console.log('============================================================');

  // 1. Query pg_tables for rowsecurity
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `);

  console.log(`Found ${tables.length} tables in schema 'public':`);
  const expectedTables = ['Order', 'Product', 'StoreSettings', '_prisma_migrations'];
  for (const exp of expectedTables) {
    const found = tables.find(t => t.tablename === exp);
    reportResult(
      `Table "${exp}" exists in public schema`,
      Boolean(found),
      found ? `rowsecurity=${found.rowsecurity}` : 'table missing'
    );
  }

  const allRowSecurity = tables.every(t => t.rowsecurity === true);
  reportResult(
    '100% of public tables have rowsecurity = true in pg_tables',
    allRowSecurity && tables.length >= 4,
    `Verified ${tables.length}/${tables.length} tables`
  );

  // 2. Query pg_class for relrowsecurity and relforcerowsecurity
  const pgClass = await prisma.$queryRawUnsafe(`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname ASC
  `);

  const allForced = pgClass.every(c => c.relrowsecurity === true && c.relforcerowsecurity === true);
  reportResult(
    'All public tables have relforcerowsecurity = true (FORCE RLS)',
    allForced && pgClass.length >= 4,
    `${pgClass.length} tables enforced`
  );

  // 3. Query pg_roles to verify rolbypassrls configuration
  const roles = await prisma.$queryRawUnsafe(`
    SELECT rolname, rolbypassrls
    FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated', 'postgres', 'service_role')
  `);

  const anonRole = roles.find(r => r.rolname === 'anon');
  const authRole = roles.find(r => r.rolname === 'authenticated');
  const postgresRole = roles.find(r => r.rolname === 'postgres');
  const serviceRole = roles.find(r => r.rolname === 'service_role');

  reportResult(
    "Role 'anon' has rolbypassrls = false",
    anonRole && anonRole.rolbypassrls === false,
    `rolbypassrls=${anonRole?.rolbypassrls}`
  );
  reportResult(
    "Role 'authenticated' has rolbypassrls = false",
    authRole && authRole.rolbypassrls === false,
    `rolbypassrls=${authRole?.rolbypassrls}`
  );
  reportResult(
    "Role 'postgres' retains rolbypassrls = true (Prisma server connection)",
    postgresRole && postgresRole.rolbypassrls === true,
    `rolbypassrls=${postgresRole?.rolbypassrls}`
  );
  reportResult(
    "Role 'service_role' retains rolbypassrls = true",
    serviceRole && serviceRole.rolbypassrls === true,
    `rolbypassrls=${serviceRole?.rolbypassrls}`
  );
}

async function verifyPostgrestAttackerSuite() {
  console.log('\n============================================================');
  console.log('PART 2: PostgREST Simulated Attacker Penetration Suite');
  console.log('============================================================');

  // Test 2.1: StoreSettings Endpoint Hardening
  console.log('\n[2.1] StoreSettings Endpoint Hardening:');
  const resGetSettings = await fetch(`${restBase}/StoreSettings?select=*`, { headers: anonHeaders });
  const settingsStatus = resGetSettings.status;
  let settingsBody = null;
  try { settingsBody = await resGetSettings.json(); } catch {}
  const settingsBlocked = (settingsStatus === 401 || settingsStatus === 403) || 
    (Array.isArray(settingsBody) && settingsBody.length === 0);
  reportResult(
    'GET /rest/v1/StoreSettings is blocked for anon',
    settingsBlocked,
    `status=${settingsStatus}`
  );

  // Verify zero leaked secret keys
  let leakedSettingsKeys = false;
  if (Array.isArray(settingsBody) && settingsBody.length > 0) {
    const s = settingsBody[0];
    if (s.stripeSecretKey || s.adminPin || s.geminiApiKey || s.shippoApiKey || s.returnStreet) {
      leakedSettingsKeys = true;
    }
  }
  reportResult(
    'Zero secrets or admin keys leaked from StoreSettings',
    !leakedSettingsKeys,
    leakedSettingsKeys ? 'SECRETS LEAKED' : 'no secrets exposed'
  );

  const resPostSettings = await fetch(`${restBase}/StoreSettings`, {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({ id: 'attacker_injected', adminPin: 'evil' })
  });
  reportResult(
    'POST /rest/v1/StoreSettings insertion blocked for anon',
    resPostSettings.status === 401 || resPostSettings.status === 403,
    `status=${resPostSettings.status}`
  );

  const resPatchSettings = await fetch(`${restBase}/StoreSettings?id=eq.default`, {
    method: 'PATCH',
    headers: anonHeaders,
    body: JSON.stringify({ adminPin: 'hacked123' })
  });
  reportResult(
    'PATCH /rest/v1/StoreSettings mutation blocked for anon',
    resPatchSettings.status === 401 || resPatchSettings.status === 403,
    `status=${resPatchSettings.status}`
  );

  const resDeleteSettings = await fetch(`${restBase}/StoreSettings?id=eq.default`, {
    method: 'DELETE',
    headers: anonHeaders
  });
  reportResult(
    'DELETE /rest/v1/StoreSettings deletion blocked for anon',
    resDeleteSettings.status === 401 || resDeleteSettings.status === 403,
    `status=${resDeleteSettings.status}`
  );

  // Test 2.2: Order Endpoint Hardening
  console.log('\n[2.2] Order Endpoint Hardening:');
  const resGetOrder = await fetch(`${restBase}/Order?select=*`, { headers: anonHeaders });
  const orderStatus = resGetOrder.status;
  let orderBody = null;
  try { orderBody = await resGetOrder.json(); } catch {}
  const orderBlocked = (orderStatus === 401 || orderStatus === 403) ||
    (Array.isArray(orderBody) && orderBody.length === 0);
  reportResult(
    'GET /rest/v1/Order is blocked for anon',
    orderBlocked,
    `status=${orderStatus}`
  );

  let leakedOrderPii = false;
  if (Array.isArray(orderBody) && orderBody.length > 0) {
    const o = orderBody[0];
    if (o.customerEmail || o.customerName || o.shippingAddress || o.customerPhone) {
      leakedOrderPii = true;
    }
  }
  reportResult(
    'Zero customer PII leaked from Order',
    !leakedOrderPii,
    leakedOrderPii ? 'CUSTOMER PII LEAKED' : 'zero records exposed'
  );

  const resPostOrder = await fetch(`${restBase}/Order`, {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({
      customerName: 'Attacker Spoof',
      customerEmail: 'attacker@evil.com',
      shippingAddress: '123 Fake St',
      paymentMethod: 'stripe',
      itemsJson: '[]',
      subtotal: 0,
      shippingCost: 0,
      total: 0
    })
  });
  reportResult(
    'POST /rest/v1/Order insertion blocked for anon',
    resPostOrder.status === 401 || resPostOrder.status === 403,
    `status=${resPostOrder.status}`
  );

  const resPatchOrder = await fetch(`${restBase}/Order?id=neq.none`, {
    method: 'PATCH',
    headers: anonHeaders,
    body: JSON.stringify({ paymentStatus: 'paid' })
  });
  reportResult(
    'PATCH /rest/v1/Order modification blocked for anon',
    resPatchOrder.status === 401 || resPatchOrder.status === 403,
    `status=${resPatchOrder.status}`
  );

  const resDeleteOrder = await fetch(`${restBase}/Order?id=neq.none`, {
    method: 'DELETE',
    headers: anonHeaders
  });
  reportResult(
    'DELETE /rest/v1/Order mutation blocked for anon',
    resDeleteOrder.status === 401 || resDeleteOrder.status === 403,
    `status=${resDeleteOrder.status}`
  );

  // Test 2.3: _prisma_migrations Endpoint Hardening
  console.log('\n[2.3] _prisma_migrations Endpoint Hardening:');
  const resGetMigrations = await fetch(`${restBase}/_prisma_migrations?select=*`, { headers: anonHeaders });
  reportResult(
    'GET /rest/v1/_prisma_migrations is blocked for anon',
    resGetMigrations.status === 401 || resGetMigrations.status === 403,
    `status=${resGetMigrations.status}`
  );

  const resPostMigrations = await fetch(`${restBase}/_prisma_migrations`, {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({ id: 'fake', checksum: 'fake', migration_name: 'fake' })
  });
  reportResult(
    'POST /rest/v1/_prisma_migrations is blocked for anon',
    resPostMigrations.status === 401 || resPostMigrations.status === 403,
    `status=${resPostMigrations.status}`
  );

  const resDeleteMigrations = await fetch(`${restBase}/_prisma_migrations?id=neq.none`, {
    method: 'DELETE',
    headers: anonHeaders
  });
  reportResult(
    'DELETE /rest/v1/_prisma_migrations is blocked for anon',
    resDeleteMigrations.status === 401 || resDeleteMigrations.status === 403,
    `status=${resDeleteMigrations.status}`
  );

  // Test 2.4: Product Endpoint Hardening & Draft Isolation
  console.log('\n[2.4] Product Endpoint Hardening & Draft Isolation:');
  const resPostProduct = await fetch(`${restBase}/Product`, {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({ title: 'Hacked Product', price: 0.01 })
  });
  reportResult(
    'POST /rest/v1/Product unauthorized insertion blocked',
    resPostProduct.status === 401 || resPostProduct.status === 403,
    `status=${resPostProduct.status}`
  );

  const resPatchProduct = await fetch(`${restBase}/Product?id=neq.none`, {
    method: 'PATCH',
    headers: anonHeaders,
    body: JSON.stringify({ price: 0.00 })
  });
  reportResult(
    'PATCH /rest/v1/Product unauthorized modification blocked',
    resPatchProduct.status === 401 || resPatchProduct.status === 403,
    `status=${resPatchProduct.status}`
  );

  const resDeleteProduct = await fetch(`${restBase}/Product?id=neq.none`, {
    method: 'DELETE',
    headers: anonHeaders
  });
  reportResult(
    'DELETE /rest/v1/Product unauthorized deletion blocked',
    resDeleteProduct.status === 401 || resDeleteProduct.status === 403,
    `status=${resDeleteProduct.status}`
  );

  // Read public products: only published items (isDraft = false) must be returned
  const resGetProduct = await fetch(`${restBase}/Product?select=id,title,price,isDraft`, { headers: anonHeaders });
  let products = [];
  try { products = await resGetProduct.json(); } catch {}

  reportResult(
    'GET /rest/v1/Product returns HTTP 200 for public items',
    resGetProduct.status === 200 && Array.isArray(products) && products.length > 0,
    `status=${resGetProduct.status}, count=${products.length}`
  );

  const leakedDrafts = products.filter(p => p.isDraft === true);
  reportResult(
    'Zero draft products leaked in public GET /rest/v1/Product',
    leakedDrafts.length === 0,
    leakedDrafts.length === 0 ? '0 drafts returned' : `${leakedDrafts.length} drafts leaked!`
  );

  // Explicit draft attack: filter specifically for drafts
  const resGetDrafts = await fetch(`${restBase}/Product?isDraft=eq.true&select=id,title`, { headers: anonHeaders });
  let draftsBody = [];
  try { draftsBody = await resGetDrafts.json(); } catch {}
  reportResult(
    'Direct draft attack (isDraft=eq.true) returns 0 records',
    Array.isArray(draftsBody) && draftsBody.length === 0,
    `leaked=${draftsBody.length}`
  );
}

async function verifyPrismaOperations() {
  console.log('\n============================================================');
  console.log('PART 3: Server-Side Prisma Operational Integrity');
  console.log('============================================================');

  // Verify Prisma can read StoreSettings
  const settings = await prisma.storeSettings.findUnique({
    where: { id: 'default' }
  });
  reportResult(
    'Prisma can read StoreSettings',
    Boolean(settings && settings.id === 'default'),
    `id=${settings?.id}`
  );

  // Verify Prisma can read Orders
  const orders = await prisma.order.findMany({ take: 5 });
  reportResult(
    'Prisma can read Orders',
    Array.isArray(orders),
    `count=${orders.length}`
  );

  // Verify Prisma can read Products including drafts
  const allProducts = await prisma.product.findMany({ take: 5 });
  const drafts = await prisma.product.findMany({ where: { isDraft: true }, take: 5 });
  reportResult(
    'Prisma can read Products (including drafts with rolbypassrls)',
    allProducts.length > 0 && drafts.length > 0,
    `totalSample=${allProducts.length}, draftSample=${drafts.length}`
  );

  // Verify Prisma can write (update StoreSettings timestamp safely)
  const updatedSettings = await prisma.storeSettings.update({
    where: { id: 'default' },
    data: { updatedAt: new Date() }
  });
  reportResult(
    'Prisma can perform server-side updates on StoreSettings',
    Boolean(updatedSettings && updatedSettings.updatedAt),
    `updatedAt=${updatedSettings?.updatedAt?.toISOString()}`
  );
}

async function run() {
  console.log('============================================================');
  console.log("🔒 BONNIE'S BOUTIQUE — GATE A VERIFICATION SUITE");
  console.log('PostgreSQL Row-Level Security (RLS) & PostgREST Lockdown');
  console.log('============================================================');

  try {
    await verifyPostgresCatalog();
    await verifyPostgrestAttackerSuite();
    await verifyPrismaOperations();
  } catch (err) {
    console.error('\n❌ Unhandled exception during Gate A verification:', err);
    failedTests++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n============================================================');
  console.log(`SUMMARY: Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('============================================================');

  if (failedTests > 0) {
    console.error(`\n❌ Gate A Verification FAILED with ${failedTests} failure(s).`);
    process.exit(1);
  } else {
    console.log('\n🎉 Gate A Verification PASSED 100%! All security criteria satisfied.');
    process.exit(0);
  }
}

run();
