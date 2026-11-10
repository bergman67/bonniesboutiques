import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!supabaseUrl || !anonKey || !directUrl) {
  console.error('Missing required env variables');
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
    db: { url: directUrl }
  }
});

let auditPassed = true;
const findings = [];

function recordCheck(name, pass, details) {
  findings.push({ name, pass, details });
  const icon = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}: ${name}`);
  if (details) console.log(`   Details: ${details}`);
  if (!pass) auditPassed = false;
}

async function runForensicAudit() {
  console.log('============================================================');
  console.log('🔍 INDEPENDENT FORENSIC AUDIT: GATE A & POSTGRESQL RLS');
  console.log('============================================================\n');

  // 1. Direct PostgreSQL Catalog Query: pg_tables
  console.log('--- Phase 1: Live PostgreSQL Catalog Audit ---');
  const pgTables = await prisma.$queryRawUnsafe(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `);
  console.log('pg_tables result:', JSON.stringify(pgTables));

  const expectedTables = ['Order', 'Product', 'StoreSettings', '_prisma_migrations'];
  for (const t of expectedTables) {
    const found = pgTables.find(row => row.tablename === t);
    recordCheck(
      `Table "${t}" rowsecurity in pg_tables`,
      Boolean(found && found.rowsecurity === true),
      found ? `found (rowsecurity=${found.rowsecurity})` : 'NOT FOUND'
    );
  }

  const allTablesSecured = pgTables.length > 0 && pgTables.every(t => t.rowsecurity === true);
  recordCheck(
    '100% of public tables have rowsecurity = true',
    allTablesSecured,
    `Total tables: ${pgTables.length}, all secured: ${allTablesSecured}`
  );

  // 2. Direct PostgreSQL Catalog Query: pg_class (FORCE ROW LEVEL SECURITY)
  const pgClass = await prisma.$queryRawUnsafe(`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname ASC
  `);
  console.log('pg_class result:', JSON.stringify(pgClass));

  for (const t of expectedTables) {
    const found = pgClass.find(row => row.relname === t);
    recordCheck(
      `Table "${t}" relforcerowsecurity in pg_class`,
      Boolean(found && found.relrowsecurity === true && found.relforcerowsecurity === true),
      found ? `relrowsecurity=${found.relrowsecurity}, relforcerowsecurity=${found.relforcerowsecurity}` : 'NOT FOUND'
    );
  }

  // 3. Direct PostgreSQL Catalog Query: pg_policy
  const pgPolicies = await prisma.$queryRawUnsafe(`
    SELECT 
      pol.polname,
      c.relname AS tablename,
      pol.polcmd,
      pol.polpermissive,
      pg_get_expr(pol.polqual, pol.polrelid) AS qual,
      pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check,
      ARRAY(
        SELECT r.rolname 
        FROM pg_roles r 
        WHERE r.oid = ANY(pol.polroles)
      ) AS roles
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    ORDER BY c.relname, pol.polname
  `);
  console.log('pg_policy result:', JSON.stringify(pgPolicies, null, 2));

  const productDraftPolicy = pgPolicies.find(p => 
    p.tablename === 'Product' && 
    p.polname === 'Public can view published products' &&
    p.qual.includes('"isDraft" = false')
  );
  recordCheck(
    'Product table enforces isDraft = false policy for public',
    Boolean(productDraftPolicy),
    productDraftPolicy ? `qual: ${productDraftPolicy.qual}, roles: ${productDraftPolicy.roles}` : 'NOT FOUND'
  );

  // 4. Direct PostgreSQL Catalog Query: information_schema.table_privileges
  const tablePrivs = await prisma.$queryRawUnsafe(`
    SELECT grantee, table_name, privilege_type
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
    ORDER BY table_name, grantee, privilege_type
  `);
  console.log('table_privileges result:', JSON.stringify(tablePrivs, null, 2));

  const sensitiveTables = ['StoreSettings', 'Order', '_prisma_migrations'];
  for (const st of sensitiveTables) {
    const privsForTable = tablePrivs.filter(p => p.table_name === st);
    recordCheck(
      `Zero table privileges for anon/authenticated on "${st}"`,
      privsForTable.length === 0,
      `Privileges found: ${privsForTable.length} (${privsForTable.map(p => `${p.grantee}:${p.privilege_type}`).join(', ') || 'none'})`
    );
  }

  const productPrivs = tablePrivs.filter(p => p.table_name === 'Product');
  const nonSelectProductPrivs = productPrivs.filter(p => p.privilege_type !== 'SELECT');
  recordCheck(
    'Only SELECT granted to anon/authenticated on "Product" (no INSERT/UPDATE/DELETE)',
    nonSelectProductPrivs.length === 0 && productPrivs.length > 0,
    `Privileges: ${productPrivs.map(p => `${p.grantee}:${p.privilege_type}`).join(', ')}`
  );

  // 5. Live PostgREST Penetration Tests
  console.log('\n--- Phase 2: Live PostgREST Penetration Attacks ---');

  // StoreSettings
  const getSettings = await fetch(`${restBase}/StoreSettings?select=*`, { headers: anonHeaders });
  const getSettingsBody = await getSettings.text();
  recordCheck(
    'Live PostgREST GET /rest/v1/StoreSettings blocked',
    getSettings.status === 401 || getSettings.status === 403 || getSettingsBody === '[]',
    `HTTP ${getSettings.status}, body: ${getSettingsBody.substring(0, 100)}`
  );

  const postSettings = await fetch(`${restBase}/StoreSettings`, {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({ id: 'forensic_hack', adminPin: 'compromised' })
  });
  recordCheck(
    'Live PostgREST POST /rest/v1/StoreSettings blocked',
    postSettings.status === 401 || postSettings.status === 403,
    `HTTP ${postSettings.status}`
  );

  const patchSettings = await fetch(`${restBase}/StoreSettings?id=eq.default`, {
    method: 'PATCH',
    headers: anonHeaders,
    body: JSON.stringify({ adminPin: 'compromised' })
  });
  recordCheck(
    'Live PostgREST PATCH /rest/v1/StoreSettings blocked',
    patchSettings.status === 401 || patchSettings.status === 403,
    `HTTP ${patchSettings.status}`
  );

  const deleteSettings = await fetch(`${restBase}/StoreSettings?id=eq.default`, {
    method: 'DELETE',
    headers: anonHeaders
  });
  recordCheck(
    'Live PostgREST DELETE /rest/v1/StoreSettings blocked',
    deleteSettings.status === 401 || deleteSettings.status === 403,
    `HTTP ${deleteSettings.status}`
  );

  // Order
  const getOrder = await fetch(`${restBase}/Order?select=*`, { headers: anonHeaders });
  const getOrderBody = await getOrder.text();
  recordCheck(
    'Live PostgREST GET /rest/v1/Order blocked',
    getOrder.status === 401 || getOrder.status === 403 || getOrderBody === '[]',
    `HTTP ${getOrder.status}, body: ${getOrderBody.substring(0, 100)}`
  );

  const postOrder = await fetch(`${restBase}/Order`, {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({ customerEmail: 'hacker@blackhat.com', total: 0 })
  });
  recordCheck(
    'Live PostgREST POST /rest/v1/Order blocked',
    postOrder.status === 401 || postOrder.status === 403,
    `HTTP ${postOrder.status}`
  );

  // _prisma_migrations
  const getMigrations = await fetch(`${restBase}/_prisma_migrations?select=*`, { headers: anonHeaders });
  recordCheck(
    'Live PostgREST GET /rest/v1/_prisma_migrations blocked',
    getMigrations.status === 401 || getMigrations.status === 403,
    `HTTP ${getMigrations.status}`
  );

  // Product write attacks
  const postProduct = await fetch(`${restBase}/Product`, {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({ title: 'Hacked Product', price: 1 })
  });
  recordCheck(
    'Live PostgREST POST /rest/v1/Product blocked',
    postProduct.status === 401 || postProduct.status === 403,
    `HTTP ${postProduct.status}`
  );

  const patchProduct = await fetch(`${restBase}/Product?id=neq.none`, {
    method: 'PATCH',
    headers: anonHeaders,
    body: JSON.stringify({ price: 0 })
  });
  recordCheck(
    'Live PostgREST PATCH /rest/v1/Product blocked',
    patchProduct.status === 401 || patchProduct.status === 403,
    `HTTP ${patchProduct.status}`
  );

  const deleteProduct = await fetch(`${restBase}/Product?id=neq.none`, {
    method: 'DELETE',
    headers: anonHeaders
  });
  recordCheck(
    'Live PostgREST DELETE /rest/v1/Product blocked',
    deleteProduct.status === 401 || deleteProduct.status === 403,
    `HTTP ${deleteProduct.status}`
  );

  // Product public read and draft isolation
  const getProduct = await fetch(`${restBase}/Product?select=id,title,price,isDraft`, { headers: anonHeaders });
  const products = await getProduct.json();
  const hasProducts = Array.isArray(products) && products.length > 0;
  const leakedDraftsInPublic = hasProducts ? products.filter(p => p.isDraft === true) : [];
  recordCheck(
    'Live PostgREST GET /rest/v1/Product returns published products',
    getProduct.status === 200 && hasProducts,
    `HTTP ${getProduct.status}, count: ${products?.length}`
  );
  recordCheck(
    'Zero draft products leaked in public Product list',
    leakedDraftsInPublic.length === 0,
    `drafts found: ${leakedDraftsInPublic.length}`
  );

  // Explicit draft attack
  const getDraftsAttack = await fetch(`${restBase}/Product?isDraft=eq.true&select=id,title`, { headers: anonHeaders });
  const draftsAttackBody = await getDraftsAttack.json();
  recordCheck(
    'Targeted attack GET /rest/v1/Product?isDraft=eq.true leaks 0 rows',
    Array.isArray(draftsAttackBody) && draftsAttackBody.length === 0,
    `returned rows: ${draftsAttackBody?.length}`
  );

  console.log('\n--- Phase 3: Server-side Prisma Operational Verification ---');
  const testSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  recordCheck(
    'Prisma can read StoreSettings via postgres role (rolbypassrls)',
    Boolean(testSettings && testSettings.id === 'default'),
    `StoreSettings id: ${testSettings?.id}`
  );

  const testOrders = await prisma.order.findMany({ take: 1 });
  recordCheck(
    'Prisma can read Order via postgres role',
    Array.isArray(testOrders),
    `Order count sampled: ${testOrders.length}`
  );

  const testDrafts = await prisma.product.findMany({ where: { isDraft: true }, take: 1 });
  recordCheck(
    'Prisma can read draft Products (bypass RLS for internal logic)',
    testDrafts.length > 0,
    `Draft sampled: ${testDrafts.length} (${testDrafts[0]?.title})`
  );

  console.log('\n============================================================');
  console.log(`FORENSIC AUDIT SUMMARY: Total Checks: ${findings.length}`);
  console.log(`Passed: ${findings.filter(f => f.pass).length} | Failed: ${findings.filter(f => !f.pass).length}`);
  console.log(`Verdict: ${auditPassed ? 'CLEAN' : 'INTEGRITY VIOLATION'}`);
  console.log('============================================================');
}

runForensicAudit()
  .catch(err => {
    console.error('Fatal audit error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
