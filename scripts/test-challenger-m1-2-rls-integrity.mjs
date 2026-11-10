import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!supabaseUrl || !anonKey || !directUrl) {
  console.error('❌ Missing required environment variables (.env)');
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

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assertCheck(name, condition, detail = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    failedChecks++;
    console.error(`  ❌ [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  }
}

// Helper to test an action under a specific SQL role in an isolated transaction
async function testUnderRole(roleName, actionFn) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE ${roleName};`);
    return actionFn(tx);
  });
}

// =============================================================================
// CHALLENGE SUITE 1: Postgres Catalog, FORCE RLS & Role Attributes
// =============================================================================
async function challengeCatalogAndRoles() {
  console.log('\n============================================================');
  console.log('CHALLENGE SUITE 1: Catalog, FORCE RLS & Role Attributes');
  console.log('============================================================');

  // 1.1 Table RLS & FORCE RLS in pg_class
  const pgClassTables = await prisma.$queryRawUnsafe(`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname ASC;
  `);

  const requiredTables = ['Order', 'Product', 'StoreSettings', '_prisma_migrations'];
  for (const tbl of requiredTables) {
    const entry = pgClassTables.find(t => t.relname === tbl);
    assertCheck(
      `Table "${tbl}" has relrowsecurity = true`,
      Boolean(entry && entry.relrowsecurity === true),
      `relrowsecurity=${entry?.relrowsecurity}`
    );
    assertCheck(
      `Table "${tbl}" has relforcerowsecurity = true (FORCE RLS)`,
      Boolean(entry && entry.relforcerowsecurity === true),
      `relforcerowsecurity=${entry?.relforcerowsecurity}`
    );
  }

  // 1.2 Role bypass flags in pg_roles
  const pgRoles = await prisma.$queryRawUnsafe(`
    SELECT rolname, rolbypassrls, rolsuper
    FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated', 'postgres', 'service_role')
    ORDER BY rolname ASC;
  `);

  const anon = pgRoles.find(r => r.rolname === 'anon');
  const auth = pgRoles.find(r => r.rolname === 'authenticated');
  const postgres = pgRoles.find(r => r.rolname === 'postgres');
  const serviceRole = pgRoles.find(r => r.rolname === 'service_role');

  assertCheck("Role 'anon' rolbypassrls = false", Boolean(anon && anon.rolbypassrls === false), `rolbypassrls=${anon?.rolbypassrls}`);
  assertCheck("Role 'authenticated' rolbypassrls = false", Boolean(auth && auth.rolbypassrls === false), `rolbypassrls=${auth?.rolbypassrls}`);
  assertCheck("Role 'postgres' rolbypassrls = true", Boolean(postgres && postgres.rolbypassrls === true), `rolbypassrls=${postgres?.rolbypassrls}`);
  assertCheck("Role 'service_role' rolbypassrls = true", Boolean(serviceRole && serviceRole.rolbypassrls === true), `rolbypassrls=${serviceRole?.rolbypassrls}`);

  // 1.3 Active Policies on public tables
  const policies = await prisma.$queryRawUnsafe(`
    SELECT tablename, policyname, permissive, roles, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname ASC;
  `);

  const productPublicPolicy = policies.find(p => p.tablename === 'Product' && p.policyname === 'Public can view published products');
  assertCheck(
    'Policy "Public can view published products" exists on Product',
    Boolean(productPublicPolicy && productPublicPolicy.cmd === 'SELECT'),
    `cmd=${productPublicPolicy?.cmd}`
  );

  const productDraftFiltered = productPublicPolicy && productPublicPolicy.qual && productPublicPolicy.qual.includes('"isDraft" = false');
  assertCheck(
    'Product public policy filters isDraft = false',
    Boolean(productDraftFiltered),
    `qual=${productPublicPolicy?.qual}`
  );
}

// =============================================================================
// CHALLENGE SUITE 2: Adversarial SQL Session Roles Stress Test
// =============================================================================
async function challengeSqlSessionRoles() {
  console.log('\n============================================================');
  console.log('CHALLENGE SUITE 2: Adversarial SQL Session Roles Stress Test');
  console.log('============================================================');

  console.log('\nTesting direct SQL execution under SET LOCAL ROLE anon (isolated transactions)...');

  // Verify role switch
  await testUnderRole('anon', async (tx) => {
    const currentRole = await tx.$queryRawUnsafe(`SELECT current_user, session_user;`);
    assertCheck('Active SQL role switched to anon', currentRole[0].current_user === 'anon', `current_user=${currentRole[0].current_user}`);
  });

  // StoreSettings SELECT
  await testUnderRole('anon', async (tx) => {
    let settingsBlocked = false;
    let detail = '';
    try {
      await tx.$queryRawUnsafe(`SELECT * FROM public."StoreSettings" LIMIT 1;`);
    } catch (err) {
      settingsBlocked = err.message.includes('permission denied');
      detail = err.meta?.code || err.message.substring(0, 30);
    }
    assertCheck('Direct SQL SELECT StoreSettings blocked for anon (42501)', settingsBlocked, detail);
  });

  // StoreSettings INSERT
  await testUnderRole('anon', async (tx) => {
    let settingsInsertBlocked = false;
    let detail = '';
    try {
      await tx.$executeRawUnsafe(`INSERT INTO public."StoreSettings" (id) VALUES ('evil_anon');`);
    } catch (err) {
      settingsInsertBlocked = err.message.includes('permission denied');
      detail = err.meta?.code || err.message.substring(0, 30);
    }
    assertCheck('Direct SQL INSERT StoreSettings blocked for anon (42501)', settingsInsertBlocked, detail);
  });

  // Order SELECT
  await testUnderRole('anon', async (tx) => {
    let orderBlocked = false;
    let detail = '';
    try {
      await tx.$queryRawUnsafe(`SELECT * FROM public."Order" LIMIT 1;`);
    } catch (err) {
      orderBlocked = err.message.includes('permission denied');
      detail = err.meta?.code || err.message.substring(0, 30);
    }
    assertCheck('Direct SQL SELECT Order blocked for anon (42501)', orderBlocked, detail);
  });

  // Order INSERT
  await testUnderRole('anon', async (tx) => {
    let orderInsertBlocked = false;
    let detail = '';
    try {
      await tx.$executeRawUnsafe(`INSERT INTO public."Order" (id, "customerName", "customerEmail", "shippingAddress", "paymentMethod", "itemsJson", subtotal, "shippingCost", total) VALUES ('evil', 'evil', 'e@e.com', 'a', 'b', '[]', 0, 0, 0);`);
    } catch (err) {
      orderInsertBlocked = err.message.includes('permission denied');
      detail = err.meta?.code || err.message.substring(0, 30);
    }
    assertCheck('Direct SQL INSERT Order blocked for anon (42501)', orderInsertBlocked, detail);
  });

  // _prisma_migrations SELECT
  await testUnderRole('anon', async (tx) => {
    let migrationsBlocked = false;
    let detail = '';
    try {
      await tx.$queryRawUnsafe(`SELECT * FROM public."_prisma_migrations" LIMIT 1;`);
    } catch (err) {
      migrationsBlocked = err.message.includes('permission denied');
      detail = err.meta?.code || err.message.substring(0, 30);
    }
    assertCheck('Direct SQL SELECT _prisma_migrations blocked for anon (42501)', migrationsBlocked, detail);
  });

  // Product INSERT
  await testUnderRole('anon', async (tx) => {
    let productInsertBlocked = false;
    let detail = '';
    try {
      await tx.$executeRawUnsafe(`INSERT INTO public."Product" (id, title, price, "isDraft") VALUES ('evil_p', 'Hacked', 0.01, false);`);
    } catch (err) {
      productInsertBlocked = err.message.includes('permission denied');
      detail = err.meta?.code || err.message.substring(0, 30);
    }
    assertCheck('Direct SQL INSERT Product blocked for anon (42501)', productInsertBlocked, detail);
  });

  // Product UPDATE
  await testUnderRole('anon', async (tx) => {
    let productUpdateBlocked = false;
    let detail = '';
    try {
      await tx.$executeRawUnsafe(`UPDATE public."Product" SET price = 0.00;`);
    } catch (err) {
      productUpdateBlocked = err.message.includes('permission denied');
      detail = err.meta?.code || err.message.substring(0, 30);
    }
    assertCheck('Direct SQL UPDATE Product blocked for anon (42501)', productUpdateBlocked, detail);
  });

  // Product DELETE
  await testUnderRole('anon', async (tx) => {
    let productDeleteBlocked = false;
    let detail = '';
    try {
      await tx.$executeRawUnsafe(`DELETE FROM public."Product";`);
    } catch (err) {
      productDeleteBlocked = err.message.includes('permission denied');
      detail = err.meta?.code || err.message.substring(0, 30);
    }
    assertCheck('Direct SQL DELETE Product blocked for anon (42501)', productDeleteBlocked, detail);
  });

  // Product READ published
  await testUnderRole('anon', async (tx) => {
    const publishedProducts = await tx.$queryRawUnsafe(`SELECT id, title, "isDraft" FROM public."Product" WHERE "isDraft" = false LIMIT 5;`);
    assertCheck('Direct SQL SELECT published products succeeds for anon', publishedProducts.length > 0, `count=${publishedProducts.length}`);
  });

  // Product READ drafts (RLS filter)
  await testUnderRole('anon', async (tx) => {
    const draftProducts = await tx.$queryRawUnsafe(`SELECT id, title, "isDraft" FROM public."Product" WHERE "isDraft" = true;`);
    assertCheck('Direct SQL SELECT drafts returns 0 rows under anon (RLS filtered)', draftProducts.length === 0, `draftsReturned=${draftProducts.length}`);
  });

  // Product SELECT * - ensure 0 drafts returned
  await testUnderRole('anon', async (tx) => {
    const allProductsUnderAnon = await tx.$queryRawUnsafe(`SELECT id, title, "isDraft" FROM public."Product";`);
    const leakedDraftCount = allProductsUnderAnon.filter(p => p.isDraft === true).length;
    assertCheck('Direct SQL SELECT * has 0 draft leaks under anon', leakedDraftCount === 0, `leakedDrafts=${leakedDraftCount}`);
  });

  console.log('\nTesting direct SQL execution under SET LOCAL ROLE authenticated (isolated transactions)...');

  // StoreSettings under authenticated
  await testUnderRole('authenticated', async (tx) => {
    let settingsBlocked = false;
    let detail = '';
    try {
      await tx.$queryRawUnsafe(`SELECT * FROM public."StoreSettings" LIMIT 1;`);
    } catch (err) {
      settingsBlocked = err.message.includes('permission denied');
      detail = err.meta?.code || err.message.substring(0, 30);
    }
    assertCheck('Direct SQL SELECT StoreSettings blocked for authenticated (42501)', settingsBlocked, detail);
  });

  // Order under authenticated
  await testUnderRole('authenticated', async (tx) => {
    let orderBlocked = false;
    let detail = '';
    try {
      await tx.$queryRawUnsafe(`SELECT * FROM public."Order" LIMIT 1;`);
    } catch (err) {
      orderBlocked = err.message.includes('permission denied');
      detail = err.meta?.code || err.message.substring(0, 30);
    }
    assertCheck('Direct SQL SELECT Order blocked for authenticated (42501)', orderBlocked, detail);
  });

  // Product INSERT under authenticated
  await testUnderRole('authenticated', async (tx) => {
    let productInsertBlocked = false;
    let detail = '';
    try {
      await tx.$executeRawUnsafe(`INSERT INTO public."Product" (id, title, price) VALUES ('evil_auth', 'Evil', 1);`);
    } catch (err) {
      productInsertBlocked = err.message.includes('permission denied');
      detail = err.meta?.code || err.message.substring(0, 30);
    }
    assertCheck('Direct SQL INSERT Product blocked for authenticated (42501)', productInsertBlocked, detail);
  });

  // Product Drafts under authenticated
  await testUnderRole('authenticated', async (tx) => {
    const draftProductsAuth = await tx.$queryRawUnsafe(`SELECT id, title, "isDraft" FROM public."Product" WHERE "isDraft" = true;`);
    assertCheck('Direct SQL SELECT drafts returns 0 rows under authenticated (RLS filtered)', draftProductsAuth.length === 0, `count=${draftProductsAuth.length}`);
  });
}

// =============================================================================
// CHALLENGE SUITE 3: Full Server-Side Prisma CRUD Stress Test
// =============================================================================
async function challengePrismaCrud() {
  console.log('\n============================================================');
  console.log('CHALLENGE SUITE 3: Full Server-Side Prisma CRUD Stress Test');
  console.log('============================================================');

  // --- 3.1 Product CRUD ---
  console.log('\n[3.1] Testing Product CRUD via Prisma (role postgres)...');
  const testProductId = `test_challenger_${Date.now()}`;
  let createdProduct = null;

  try {
    // CREATE (draft product)
    createdProduct = await prisma.product.create({
      data: {
        id: testProductId,
        title: 'Challenger Empirical Test Bead Pen',
        description: 'Temporary item created during M1 adversarial verification',
        price: 18.50,
        isDraft: true,
        imageUrl: '/test-cutout.png'
      }
    });
    assertCheck('Prisma can CREATE draft Product', Boolean(createdProduct && createdProduct.id === testProductId), `id=${createdProduct?.id}`);

    // READ
    const fetchedProduct = await prisma.product.findUnique({
      where: { id: testProductId }
    });
    assertCheck('Prisma can READ newly created draft Product', Boolean(fetchedProduct && fetchedProduct.price === 18.50), `price=${fetchedProduct?.price}`);

    // UPDATE
    const updatedProduct = await prisma.product.update({
      where: { id: testProductId },
      data: {
        title: 'Challenger Bead Pen (Updated Title)',
        price: 21.00,
        isDraft: false // publish it
      }
    });
    assertCheck(
      'Prisma can UPDATE Product (title and published status)',
      Boolean(updatedProduct && updatedProduct.price === 21.00 && updatedProduct.isDraft === false),
      `isDraft=${updatedProduct?.isDraft}, price=${updatedProduct?.price}`
    );

    // VERIFY UPDATE VIA QUERY
    const reFetched = await prisma.product.findUnique({
      where: { id: testProductId }
    });
    assertCheck('Prisma can verify updated Product state', Boolean(reFetched && reFetched.title.includes('Updated Title')));

    // DELETE
    const deletedProduct = await prisma.product.delete({
      where: { id: testProductId }
    });
    assertCheck('Prisma can DELETE Product', Boolean(deletedProduct && deletedProduct.id === testProductId));

    // VERIFY DELETION
    const verifyDeleted = await prisma.product.findUnique({
      where: { id: testProductId }
    });
    assertCheck('Prisma verifies Product deletion (returns null)', verifyDeleted === null);
  } finally {
    // Safety cleanup in case of failure before delete
    try {
      await prisma.product.delete({ where: { id: testProductId } });
    } catch {}
  }

  // --- 3.2 StoreSettings Read and Mutation ---
  console.log('\n[3.2] Testing StoreSettings Operations via Prisma...');
  const currentSettings = await prisma.storeSettings.findUnique({
    where: { id: 'default' }
  });
  assertCheck('Prisma can READ StoreSettings', Boolean(currentSettings && currentSettings.id === 'default'), `id=${currentSettings?.id}`);

  // Test updating a non-destructive field (e.g. updatedAt, or touch returnName and restore)
  const originalReturnName = currentSettings.returnName;
  const tempReturnName = `${originalReturnName} [Verified]`;

  const updatedSettings = await prisma.storeSettings.update({
    where: { id: 'default' },
    data: { returnName: tempReturnName }
  });
  assertCheck('Prisma can UPDATE StoreSettings', updatedSettings.returnName === tempReturnName, `returnName=${updatedSettings.returnName}`);

  // Restore original returnName
  const restoredSettings = await prisma.storeSettings.update({
    where: { id: 'default' },
    data: { returnName: originalReturnName }
  });
  assertCheck('Prisma can restore StoreSettings to original state', restoredSettings.returnName === originalReturnName);

  // --- 3.3 Order CRUD ---
  console.log('\n[3.3] Testing Order CRUD via Prisma...');
  const testOrderId = `test_order_${Date.now()}`;
  let createdOrder = null;

  try {
    // CREATE
    createdOrder = await prisma.order.create({
      data: {
        id: testOrderId,
        customerName: 'Challenger Empirical Customer',
        customerEmail: 'challenger@boutique-test.local',
        customerPhone: '555-0199',
        shippingAddress: '404 Empirical Lane, Stress City, ST 99999',
        paymentMethod: 'stripe',
        paymentStatus: 'pending',
        itemsJson: JSON.stringify([{ id: 'mock-1', title: 'Test Pen', quantity: 1, price: 8.0 }]),
        subtotal: 8.0,
        shippingCost: 3.99,
        total: 11.99
      }
    });
    assertCheck('Prisma can CREATE Order', Boolean(createdOrder && createdOrder.id === testOrderId), `id=${createdOrder?.id}`);

    // READ
    const fetchedOrder = await prisma.order.findUnique({
      where: { id: testOrderId }
    });
    assertCheck('Prisma can READ newly created Order', Boolean(fetchedOrder && fetchedOrder.total === 11.99), `total=${fetchedOrder?.total}`);

    // UPDATE
    const updatedOrder = await prisma.order.update({
      where: { id: testOrderId },
      data: {
        paymentStatus: 'paid',
        stripeSessionId: 'cs_test_empirical_verification_123',
        trackingNumber: '9400100000000000000000',
        labelCarrier: 'USPS',
        labelStatus: 'created'
      }
    });
    assertCheck(
      'Prisma can UPDATE Order (paymentStatus, session, tracking)',
      Boolean(updatedOrder && updatedOrder.paymentStatus === 'paid' && updatedOrder.labelCarrier === 'USPS'),
      `status=${updatedOrder?.paymentStatus}, carrier=${updatedOrder?.labelCarrier}`
    );

    // DELETE
    const deletedOrder = await prisma.order.delete({
      where: { id: testOrderId }
    });
    assertCheck('Prisma can DELETE Order', Boolean(deletedOrder && deletedOrder.id === testOrderId));

    // VERIFY DELETION
    const verifyDeletedOrder = await prisma.order.findUnique({
      where: { id: testOrderId }
    });
    assertCheck('Prisma verifies Order deletion (returns null)', verifyDeletedOrder === null);
  } finally {
    // Safety cleanup
    try {
      await prisma.order.delete({ where: { id: testOrderId } });
    } catch {}
  }
}

// =============================================================================
// CHALLENGE SUITE 4: Live PostgREST Penetration & Data Isolation
// =============================================================================
async function challengePostgrestPenetration() {
  console.log('\n============================================================');
  console.log('CHALLENGE SUITE 4: Live PostgREST Penetration & Data Isolation');
  console.log('============================================================');

  // 4.1 StoreSettings - Blocked from reading secrets
  const resSettings = await fetch(`${restBase}/StoreSettings`, { headers: anonHeaders });
  const settingsBlocked = resSettings.status === 401 || resSettings.status === 403;
  assertCheck('PostgREST GET /StoreSettings rejected with 401/403', settingsBlocked, `status=${resSettings.status}`);

  // 4.2 Order - Blocked from reading PII
  const resOrder = await fetch(`${restBase}/Order`, { headers: anonHeaders });
  const orderBlocked = resOrder.status === 401 || resOrder.status === 403;
  assertCheck('PostgREST GET /Order rejected with 401/403', orderBlocked, `status=${resOrder.status}`);

  // 4.3 _prisma_migrations - Blocked from schema inspection
  const resMigrations = await fetch(`${restBase}/_prisma_migrations`, { headers: anonHeaders });
  const migrationsBlocked = resMigrations.status === 401 || resMigrations.status === 403;
  assertCheck('PostgREST GET /_prisma_migrations rejected with 401/403', migrationsBlocked, `status=${resMigrations.status}`);

  // 4.4 Product - Mutation attempts must be 401/403
  const resPost = await fetch(`${restBase}/Product`, {
    method: 'POST',
    headers: anonHeaders,
    body: JSON.stringify({ title: 'Adversarial Product Injection', price: 0.01 })
  });
  assertCheck('PostgREST POST /Product rejected with 401/403', resPost.status === 401 || resPost.status === 403, `status=${resPost.status}`);

  const resPatch = await fetch(`${restBase}/Product?price=gt.0`, {
    method: 'PATCH',
    headers: anonHeaders,
    body: JSON.stringify({ price: 0.00 })
  });
  assertCheck('PostgREST PATCH /Product rejected with 401/403', resPatch.status === 401 || resPatch.status === 403, `status=${resPatch.status}`);

  const resDelete = await fetch(`${restBase}/Product?price=gt.0`, {
    method: 'DELETE',
    headers: anonHeaders
  });
  assertCheck('PostgREST DELETE /Product rejected with 401/403', resDelete.status === 401 || resDelete.status === 403, `status=${resDelete.status}`);

  // 4.5 Product Draft Protection
  const resDraftAttack = await fetch(`${restBase}/Product?isDraft=eq.true&select=id,title,isDraft`, { headers: anonHeaders });
  let drafts = [];
  try { drafts = await resDraftAttack.json(); } catch {}
  assertCheck(
    'PostgREST draft attack (?isDraft=eq.true) returns 0 records',
    Array.isArray(drafts) && drafts.length === 0,
    `draftsFound=${drafts.length}`
  );

  // 4.6 Public published catalog read
  const resCatalog = await fetch(`${restBase}/Product?select=id,title,price,isDraft`, { headers: anonHeaders });
  let catalog = [];
  try { catalog = await resCatalog.json(); } catch {}
  const hasPublishedItems = Array.isArray(catalog) && catalog.length > 0;
  const zeroDraftsInCatalog = Array.isArray(catalog) && catalog.every(p => p.isDraft === false);
  assertCheck('PostgREST GET /Product returns published catalog', hasPublishedItems, `count=${catalog.length}`);
  assertCheck('PostgREST GET /Product contains zero draft items', zeroDraftsInCatalog, `zeroDrafts=${zeroDraftsInCatalog}`);
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================
async function runAllChallenges() {
  console.log('🚀 Launching Adversarial Challenge Suite for Milestone M1...');
  const startTime = Date.now();

  try {
    await challengeCatalogAndRoles();
    await challengeSqlSessionRoles();
    await challengePrismaCrud();
    await challengePostgrestPenetration();
  } catch (err) {
    console.error('\n❌ Unhandled exception during challenge suite execution:', err);
    failedChecks++;
  } finally {
    await prisma.$disconnect();
  }

  const durationMs = Date.now() - startTime;
  console.log('\n============================================================');
  console.log(`CHALLENGE RESULTS SUMMARY`);
  console.log(`Total Checks: ${totalChecks} | Passed: ${passedChecks} | Failed: ${failedChecks} | Time: ${durationMs}ms`);
  console.log('============================================================');

  if (failedChecks > 0) {
    console.error(`\n❌ VERDICT: REQUEST_CHANGES (${failedChecks} check(s) failed)`);
    process.exit(1);
  } else {
    console.log('\n🎉 VERDICT: APPROVE (100% of empirical challenges passed)');
    process.exit(0);
  }
}

runAllChallenges();
