/**
 * scripts/test-challenger-m1-rls-penetration.mjs
 *
 * Adversarial Empirical Penetration & Verification Harness for Milestone M1
 * Evaluator: Challenger M1_1 (Critic / Specialist)
 *
 * Attacks Tested:
 * 1. PostgreSQL Catalog & Security Metadata Audit:
 *    - All public schema tables have rowsecurity = true
 *    - All public schema tables have relforcerowsecurity = true (FORCE RLS)
 *    - Roles anon and authenticated have rolbypassrls = false
 *    - Table privilege revocations verified in information_schema.table_privileges
 * 2. PostgREST Product Policy Bypass & Draft Extraction:
 *    - Standard published items query (isDraft = false)
 *    - Draft filter bypass: isDraft=eq.true
 *    - Draft filter bypass: isDraft=not.eq.false
 *    - Draft filter bypass: isDraft=neq.false
 *    - Draft filter bypass: isDraft=is.null
 *    - Complex filter bypass: or=(isDraft.eq.true,isDraft.eq.false)
 *    - Set membership filter bypass: isDraft=in.(true,false)
 *    - Targeted draft ID extraction (using known draft IDs retrieved via server-side Prisma)
 * 3. PostgREST Product Tampering / Mutation Attacks:
 *    - Unauthorized single insertion (POST)
 *    - Unauthorized batch insertion (POST)
 *    - Unauthorized price manipulation (PATCH)
 *    - Unauthorized product overwrite (PUT)
 *    - Unauthorized product deletion (DELETE)
 * 4. PostgREST StoreSettings Exfiltration & Tampering Attacks:
 *    - Unauthorized read: GET /StoreSettings?select=*
 *    - Specific secret extraction: GET /StoreSettings?select=stripeSecretKey,adminPin,geminiApiKey
 *    - Unauthorized insertion (POST)
 *    - Unauthorized admin takeover: PATCH /StoreSettings?id=eq.default
 *    - Unauthorized deletion (DELETE)
 *    - Deep content inspection for secret tokens/hashes
 * 5. PostgREST Order Exfiltration & Tampering Attacks:
 *    - Unauthorized read: GET /Order?select=*
 *    - Specific PII extraction: GET /Order?select=customerEmail,shippingAddress,customerName
 *    - Unauthorized order injection (POST)
 *    - Unauthorized status spoofing: PATCH /Order (paymentStatus='paid')
 *    - Unauthorized deletion (DELETE)
 *    - Deep content inspection for customer emails/PII
 * 6. PostgREST _prisma_migrations Attacks:
 *    - Unauthorized read: GET /_prisma_migrations
 *    - Unauthorized migration injection (POST)
 *    - Unauthorized migration tampering (PATCH)
 *    - Unauthorized migration deletion (DELETE)
 * 7. Server-Side Prisma Operational Continuity:
 *    - Prisma reads StoreSettings
 *    - Prisma reads Order
 *    - Prisma reads Product (published and drafts)
 *    - Prisma performs updates on StoreSettings
 */

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
const failures = [];

function recordTest(name, passed, detail = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✅ [PASS] ${name}${detail ? ` -> ${detail}` : ''}`);
  } else {
    failedTests++;
    const errMsg = `❌ [FAIL] ${name}${detail ? ` -> ${detail}` : ''}`;
    console.error(`  ${errMsg}`);
    failures.push(errMsg);
  }
}

async function runAudit() {
  console.log('======================================================================');
  console.log('  CHALLENGER M1: POSTGREST & RLS ADVERSARIAL PENETRATION SUITE');
  console.log('======================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // CATEGORY 1: PostgreSQL Catalog & RLS Metadata Audit
    // -------------------------------------------------------------------------
    console.log('>>> [CATEGORY 1] PostgreSQL Catalog & RLS Security Metadata Audit');

    // 1.1 All public tables must have rowsecurity = true
    const publicTables = await prisma.$queryRawUnsafe(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename ASC
    `);

    console.log(`  Found ${publicTables.length} tables in schema 'public':`);
    for (const t of publicTables) {
      console.log(`    - Table "${t.tablename}": rowsecurity = ${t.rowsecurity}`);
    }

    const allRowSecurityActive = publicTables.length > 0 && publicTables.every(t => t.rowsecurity === true);
    recordTest(
      'All tables in public schema have rowsecurity = true',
      allRowSecurityActive,
      `Verified ${publicTables.length}/${publicTables.length} tables`
    );

    // 1.2 All public tables must have relforcerowsecurity = true
    const forcedTables = await prisma.$queryRawUnsafe(`
      SELECT c.relname, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname ASC
    `);

    const allForced = forcedTables.length > 0 && forcedTables.every(c => c.relforcerowsecurity === true);
    recordTest(
      'All tables in public schema have relforcerowsecurity = true (FORCE RLS)',
      allForced,
      `Verified ${forcedTables.length}/${forcedTables.length} tables`
    );

    // 1.3 Check anon and authenticated roles have rolbypassrls = false
    const roleBypass = await prisma.$queryRawUnsafe(`
      SELECT rolname, rolbypassrls
      FROM pg_roles
      WHERE rolname IN ('anon', 'authenticated', 'postgres', 'service_role')
    `);

    const anonRole = roleBypass.find(r => r.rolname === 'anon');
    const authRole = roleBypass.find(r => r.rolname === 'authenticated');
    const postgresRole = roleBypass.find(r => r.rolname === 'postgres');
    const serviceRole = roleBypass.find(r => r.rolname === 'service_role');

    recordTest("Role 'anon' has rolbypassrls = false", anonRole && anonRole.rolbypassrls === false);
    recordTest("Role 'authenticated' has rolbypassrls = false", authRole && authRole.rolbypassrls === false);
    recordTest("Role 'postgres' retains rolbypassrls = true", postgresRole && postgresRole.rolbypassrls === true);
    recordTest("Role 'service_role' retains rolbypassrls = true", serviceRole && serviceRole.rolbypassrls === true);

    // 1.4 Check information_schema table privileges for anon role
    const anonPrivileges = await prisma.$queryRawUnsafe(`
      SELECT table_name, privilege_type
      FROM information_schema.table_privileges
      WHERE grantee = 'anon' AND table_schema = 'public'
    `);

    const anonPrivsByTable = {};
    for (const row of anonPrivileges) {
      if (!anonPrivsByTable[row.table_name]) anonPrivsByTable[row.table_name] = [];
      anonPrivsByTable[row.table_name].push(row.privilege_type);
    }

    recordTest(
      "Privilege Check: anon has ZERO privileges on 'StoreSettings'",
      !anonPrivsByTable['StoreSettings'] || anonPrivsByTable['StoreSettings'].length === 0,
      `privileges: [${anonPrivsByTable['StoreSettings'] || ''}]`
    );
    recordTest(
      "Privilege Check: anon has ZERO privileges on 'Order'",
      !anonPrivsByTable['Order'] || anonPrivsByTable['Order'].length === 0,
      `privileges: [${anonPrivsByTable['Order'] || ''}]`
    );
    recordTest(
      "Privilege Check: anon has ZERO privileges on '_prisma_migrations'",
      !anonPrivsByTable['_prisma_migrations'] || anonPrivsByTable['_prisma_migrations'].length === 0,
      `privileges: [${anonPrivsByTable['_prisma_migrations'] || ''}]`
    );
    recordTest(
      "Privilege Check: anon has ONLY SELECT privilege on 'Product'",
      anonPrivsByTable['Product'] &&
      anonPrivsByTable['Product'].length === 1 &&
      anonPrivsByTable['Product'][0] === 'SELECT',
      `privileges: [${anonPrivsByTable['Product'] || ''}]`
    );

    // -------------------------------------------------------------------------
    // CATEGORY 2: PostgREST Product Policy Bypass & Draft Extraction Attacks
    // -------------------------------------------------------------------------
    console.log('\n>>> [CATEGORY 2] PostgREST Product Policy Bypass & Draft Extraction');

    // 2.1 Public catalog read: must succeed for published items
    const resGetPublished = await fetch(`${restBase}/Product?select=id,title,price,isDraft`, {
      headers: anonHeaders
    });
    let publishedItems = [];
    try { publishedItems = await resGetPublished.json(); } catch {}
    recordTest(
      'GET /Product returns HTTP 200 with catalog items',
      resGetPublished.status === 200 && Array.isArray(publishedItems) && publishedItems.length > 0,
      `status=${resGetPublished.status}, count=${publishedItems.length}`
    );

    // 2.2 Verify zero drafts in published catalog response
    const draftsInGeneralQuery = publishedItems.filter(p => p.isDraft === true);
    recordTest(
      'General catalog query returns 0 draft products',
      draftsInGeneralQuery.length === 0,
      `leaked drafts: ${draftsInGeneralQuery.length}`
    );

    // 2.3 Adversarial Draft Attack: isDraft=eq.true
    const resDraftEq = await fetch(`${restBase}/Product?isDraft=eq.true&select=id,title,isDraft`, {
      headers: anonHeaders
    });
    let draftEqItems = [];
    try { draftEqItems = await resDraftEq.json(); } catch {}
    recordTest(
      'Draft Bypass Attack (isDraft=eq.true) returns empty set',
      Array.isArray(draftEqItems) && draftEqItems.length === 0,
      `status=${resDraftEq.status}, returned=${draftEqItems.length}`
    );

    // 2.4 Adversarial Draft Attack: isDraft=not.eq.false
    const resDraftNotEq = await fetch(`${restBase}/Product?isDraft=not.eq.false&select=id,title,isDraft`, {
      headers: anonHeaders
    });
    let draftNotEqItems = [];
    try { draftNotEqItems = await resDraftNotEq.json(); } catch {}
    recordTest(
      'Draft Bypass Attack (isDraft=not.eq.false) returns empty set',
      Array.isArray(draftNotEqItems) && draftNotEqItems.length === 0,
      `status=${resDraftNotEq.status}, returned=${draftNotEqItems.length}`
    );

    // 2.5 Adversarial Draft Attack: isDraft=neq.false
    const resDraftNeq = await fetch(`${restBase}/Product?isDraft=neq.false&select=id,title,isDraft`, {
      headers: anonHeaders
    });
    let draftNeqItems = [];
    try { draftNeqItems = await resDraftNeq.json(); } catch {}
    recordTest(
      'Draft Bypass Attack (isDraft=neq.false) returns empty set',
      Array.isArray(draftNeqItems) && draftNeqItems.length === 0,
      `status=${resDraftNeq.status}, returned=${draftNeqItems.length}`
    );

    // 2.6 Adversarial Draft Attack: isDraft=is.null
    const resDraftNull = await fetch(`${restBase}/Product?isDraft=is.null&select=id,title,isDraft`, {
      headers: anonHeaders
    });
    let draftNullItems = [];
    try { draftNullItems = await resDraftNull.json(); } catch {}
    recordTest(
      'Draft Bypass Attack (isDraft=is.null) returns empty set',
      Array.isArray(draftNullItems) && draftNullItems.length === 0,
      `status=${resDraftNull.status}, returned=${draftNullItems.length}`
    );

    // 2.7 Adversarial Draft Attack: or=(isDraft.eq.true,isDraft.eq.false)
    // Even if or includes published, only published must be returned, 0 drafts
    const resDraftOr = await fetch(`${restBase}/Product?or=(isDraft.eq.true,isDraft.eq.false)&select=id,title,isDraft`, {
      headers: anonHeaders
    });
    let draftOrItems = [];
    try { draftOrItems = await resDraftOr.json(); } catch {}
    const leakedDraftsInOr = Array.isArray(draftOrItems) ? draftOrItems.filter(p => p.isDraft === true) : [];
    recordTest(
      'Draft Bypass Attack (or=(isDraft.eq.true,isDraft.eq.false)) leaks 0 drafts',
      leakedDraftsInOr.length === 0,
      `status=${resDraftOr.status}, total=${draftOrItems.length}, leaked drafts=${leakedDraftsInOr.length}`
    );

    // 2.8 Adversarial Draft Attack: isDraft=in.(true,false)
    const resDraftIn = await fetch(`${restBase}/Product?isDraft=in.(true,false)&select=id,title,isDraft`, {
      headers: anonHeaders
    });
    let draftInItems = [];
    try { draftInItems = await resDraftIn.json(); } catch {}
    const leakedDraftsInIn = Array.isArray(draftInItems) ? draftInItems.filter(p => p.isDraft === true) : [];
    recordTest(
      'Draft Bypass Attack (isDraft=in.(true,false)) leaks 0 drafts',
      leakedDraftsInIn.length === 0,
      `status=${resDraftIn.status}, total=${draftInItems.length}, leaked drafts=${leakedDraftsInIn.length}`
    );

    // 2.9 Targeted Draft ID Extraction Attack
    // Retrieve actual draft product IDs directly from PostgreSQL via Prisma to test targeted lookup
    const actualDrafts = await prisma.product.findMany({
      where: { isDraft: true },
      take: 3
    });

    console.log(`  Found ${actualDrafts.length} actual draft items in database via Prisma.`);
    for (const draft of actualDrafts) {
      const resTargetedDraft = await fetch(`${restBase}/Product?id=eq.${draft.id}&select=*`, {
        headers: anonHeaders
      });
      let targetBody = [];
      try { targetBody = await resTargetedDraft.json(); } catch {}
      recordTest(
        `Targeted Draft ID Lookup (id=${draft.id}) is blocked by RLS`,
        Array.isArray(targetBody) && targetBody.length === 0,
        `status=${resTargetedDraft.status}, rows returned=${targetBody.length}`
      );
    }

    // -------------------------------------------------------------------------
    // CATEGORY 3: PostgREST Product Mutation Attacks (Write, Update, Delete)
    // -------------------------------------------------------------------------
    console.log('\n>>> [CATEGORY 3] PostgREST Product Tampering & Mutation Attacks');

    // 3.1 Single Product Injection (POST)
    const resPostProduct = await fetch(`${restBase}/Product`, {
      method: 'POST',
      headers: anonHeaders,
      body: JSON.stringify({
        title: 'Attacker Rogue Product',
        price: 0.01,
        isDraft: false
      })
    });
    recordTest(
      'POST /Product unauthorized single injection is blocked',
      resPostProduct.status === 401 || resPostProduct.status === 403,
      `status=${resPostProduct.status}`
    );

    // 3.2 Batch Product Injection (POST)
    const resBatchPost = await fetch(`${restBase}/Product`, {
      method: 'POST',
      headers: anonHeaders,
      body: JSON.stringify([
        { title: 'Attacker Batch 1', price: 0.01 },
        { title: 'Attacker Batch 2', price: 0.01 }
      ])
    });
    recordTest(
      'POST /Product unauthorized batch injection is blocked',
      resBatchPost.status === 401 || resBatchPost.status === 403,
      `status=${resBatchPost.status}`
    );

    // 3.3 Bulk Price Manipulation (PATCH)
    const resPatchProduct = await fetch(`${restBase}/Product?id=neq.none`, {
      method: 'PATCH',
      headers: anonHeaders,
      body: JSON.stringify({ price: 0.00 })
    });
    recordTest(
      'PATCH /Product unauthorized price manipulation is blocked',
      resPatchProduct.status === 401 || resPatchProduct.status === 403,
      `status=${resPatchProduct.status}`
    );

    // 3.4 Full Product Overwrite (PUT)
    if (publishedItems.length > 0) {
      const sampleId = publishedItems[0].id;
      const resPutProduct = await fetch(`${restBase}/Product?id=eq.${sampleId}`, {
        method: 'PUT',
        headers: anonHeaders,
        body: JSON.stringify({
          id: sampleId,
          title: 'Hacked Replacement',
          price: 0.00
        })
      });
      recordTest(
        `PUT /Product?id=eq.${sampleId} unauthorized overwrite is blocked`,
        resPutProduct.status === 401 || resPutProduct.status === 403,
        `status=${resPutProduct.status}`
      );
    }

    // 3.5 Catalog Deletion Attack (DELETE)
    const resDeleteProduct = await fetch(`${restBase}/Product?id=neq.none`, {
      method: 'DELETE',
      headers: anonHeaders
    });
    recordTest(
      'DELETE /Product unauthorized catalog wipe is blocked',
      resDeleteProduct.status === 401 || resDeleteProduct.status === 403,
      `status=${resDeleteProduct.status}`
    );

    // -------------------------------------------------------------------------
    // CATEGORY 4: PostgREST StoreSettings Exfiltration & Tampering Attacks
    // -------------------------------------------------------------------------
    console.log('\n>>> [CATEGORY 4] PostgREST StoreSettings Exfiltration & Tampering');

    // 4.1 Full read attempt: GET /StoreSettings?select=*
    const resGetSettings = await fetch(`${restBase}/StoreSettings?select=*`, {
      headers: anonHeaders
    });
    let settingsDump = null;
    try { settingsDump = await resGetSettings.json(); } catch {}
    const settingsReadBlocked = (resGetSettings.status === 401 || resGetSettings.status === 403) ||
      (Array.isArray(settingsDump) && settingsDump.length === 0);

    recordTest(
      'GET /StoreSettings?select=* unauthorized read is blocked',
      settingsReadBlocked,
      `status=${resGetSettings.status}`
    );

    // 4.2 Targeted column projection: GET /StoreSettings?select=stripeSecretKey,adminPin...
    const resProjectSettings = await fetch(
      `${restBase}/StoreSettings?select=stripeSecretKey,adminPin,geminiApiKey,shippoApiKey,returnStreet`,
      { headers: anonHeaders }
    );
    let projectedSettings = null;
    try { projectedSettings = await resProjectSettings.json(); } catch {}
    const projectedBlocked = (resProjectSettings.status === 401 || resProjectSettings.status === 403) ||
      (Array.isArray(projectedSettings) && projectedSettings.length === 0);

    recordTest(
      'GET /StoreSettings targeted secret column projection is blocked',
      projectedBlocked,
      `status=${resProjectSettings.status}`
    );

    // 4.3 Deep secret leak scan in response payload
    const rawSettingsText = JSON.stringify(settingsDump || {}) + JSON.stringify(projectedSettings || {});
    const secretsFound = [];
    if (rawSettingsText.includes('shippo_live_')) secretsFound.push('shippo_live_ key');
    if (rawSettingsText.includes('AQ.')) secretsFound.push('GEMINI_API_KEY');
    if (rawSettingsText.includes('sk_live_') || rawSettingsText.includes('sk_test_')) secretsFound.push('Stripe secret');
    recordTest(
      'Deep scan: StoreSettings responses contain ZERO secret tokens',
      secretsFound.length === 0,
      secretsFound.length === 0 ? '0 secrets detected' : `EXPOSED: ${secretsFound.join(', ')}`
    );

    // 4.4 Injection attack: POST /StoreSettings
    const resPostSettings = await fetch(`${restBase}/StoreSettings`, {
      method: 'POST',
      headers: anonHeaders,
      body: JSON.stringify({ id: 'attacker_cfg', adminPin: 'compromised' })
    });
    recordTest(
      'POST /StoreSettings unauthorized insertion is blocked',
      resPostSettings.status === 401 || resPostSettings.status === 403,
      `status=${resPostSettings.status}`
    );

    // 4.5 Admin takeover attack: PATCH /StoreSettings?id=eq.default
    const resPatchSettings = await fetch(`${restBase}/StoreSettings?id=eq.default`, {
      method: 'PATCH',
      headers: anonHeaders,
      body: JSON.stringify({ adminPin: 'attacker_password' })
    });
    recordTest(
      'PATCH /StoreSettings?id=eq.default unauthorized takeover is blocked',
      resPatchSettings.status === 401 || resPatchSettings.status === 403,
      `status=${resPatchSettings.status}`
    );

    // 4.6 Deletion attack: DELETE /StoreSettings?id=eq.default
    const resDeleteSettings = await fetch(`${restBase}/StoreSettings?id=eq.default`, {
      method: 'DELETE',
      headers: anonHeaders
    });
    recordTest(
      'DELETE /StoreSettings?id=eq.default unauthorized deletion is blocked',
      resDeleteSettings.status === 401 || resDeleteSettings.status === 403,
      `status=${resDeleteSettings.status}`
    );

    // -------------------------------------------------------------------------
    // CATEGORY 5: PostgREST Order Exfiltration & Tampering Attacks
    // -------------------------------------------------------------------------
    console.log('\n>>> [CATEGORY 5] PostgREST Order Exfiltration & Tampering');

    // 5.1 Full read attempt: GET /Order?select=*
    const resGetOrder = await fetch(`${restBase}/Order?select=*`, {
      headers: anonHeaders
    });
    let orderDump = null;
    try { orderDump = await resGetOrder.json(); } catch {}
    const orderReadBlocked = (resGetOrder.status === 401 || resGetOrder.status === 403) ||
      (Array.isArray(orderDump) && orderDump.length === 0);

    recordTest(
      'GET /Order?select=* unauthorized read is blocked',
      orderReadBlocked,
      `status=${resGetOrder.status}`
    );

    // 5.2 Targeted PII projection: GET /Order?select=customerEmail,shippingAddress...
    const resProjectOrder = await fetch(
      `${restBase}/Order?select=customerEmail,shippingAddress,customerName,customerPhone`,
      { headers: anonHeaders }
    );
    let projectedOrder = null;
    try { projectedOrder = await resProjectOrder.json(); } catch {}
    const projectedOrderBlocked = (resProjectOrder.status === 401 || resProjectOrder.status === 403) ||
      (Array.isArray(projectedOrder) && projectedOrder.length === 0);

    recordTest(
      'GET /Order targeted customer PII column projection is blocked',
      projectedOrderBlocked,
      `status=${resProjectOrder.status}`
    );

    // 5.3 Deep PII leak scan in response payload
    const rawOrderText = JSON.stringify(orderDump || {}) + JSON.stringify(projectedOrder || {});
    const piiFound = [];
    if (rawOrderText.includes('@') && rawOrderText.includes('.com')) piiFound.push('customer emails');
    if (rawOrderText.toLowerCase().includes('street') || rawOrderText.toLowerCase().includes('avenue')) piiFound.push('street addresses');
    recordTest(
      'Deep scan: Order responses contain ZERO customer PII',
      piiFound.length === 0,
      piiFound.length === 0 ? '0 customer PII records detected' : `EXPOSED: ${piiFound.join(', ')}`
    );

    // 5.4 Injection attack: POST /Order
    const resPostOrder = await fetch(`${restBase}/Order`, {
      method: 'POST',
      headers: anonHeaders,
      body: JSON.stringify({
        customerName: 'Attacker Spoof',
        customerEmail: 'attacker@evil.com',
        shippingAddress: '123 Fake Rd',
        paymentMethod: 'stripe',
        itemsJson: '[]',
        subtotal: 0,
        shippingCost: 0,
        total: 0
      })
    });
    recordTest(
      'POST /Order unauthorized order injection is blocked',
      resPostOrder.status === 401 || resPostOrder.status === 403,
      `status=${resPostOrder.status}`
    );

    // 5.5 Status spoofing attack: PATCH /Order
    const resPatchOrder = await fetch(`${restBase}/Order?id=neq.none`, {
      method: 'PATCH',
      headers: anonHeaders,
      body: JSON.stringify({ paymentStatus: 'paid' })
    });
    recordTest(
      'PATCH /Order unauthorized status spoofing is blocked',
      resPatchOrder.status === 401 || resPatchOrder.status === 403,
      `status=${resPatchOrder.status}`
    );

    // 5.6 Deletion attack: DELETE /Order
    const resDeleteOrder = await fetch(`${restBase}/Order?id=neq.none`, {
      method: 'DELETE',
      headers: anonHeaders
    });
    recordTest(
      'DELETE /Order unauthorized order deletion is blocked',
      resDeleteOrder.status === 401 || resDeleteOrder.status === 403,
      `status=${resDeleteOrder.status}`
    );

    // -------------------------------------------------------------------------
    // CATEGORY 6: PostgREST _prisma_migrations Attacks
    // -------------------------------------------------------------------------
    console.log('\n>>> [CATEGORY 6] PostgREST _prisma_migrations Attacks');

    const resGetMigrations = await fetch(`${restBase}/_prisma_migrations?select=*`, {
      headers: anonHeaders
    });
    recordTest(
      'GET /_prisma_migrations unauthorized read is blocked',
      resGetMigrations.status === 401 || resGetMigrations.status === 403,
      `status=${resGetMigrations.status}`
    );

    const resPostMigrations = await fetch(`${restBase}/_prisma_migrations`, {
      method: 'POST',
      headers: anonHeaders,
      body: JSON.stringify({ id: 'fake_mig', checksum: 'fake', migration_name: 'fake' })
    });
    recordTest(
      'POST /_prisma_migrations unauthorized insertion is blocked',
      resPostMigrations.status === 401 || resPostMigrations.status === 403,
      `status=${resPostMigrations.status}`
    );

    const resPatchMigrations = await fetch(`${restBase}/_prisma_migrations?id=neq.none`, {
      method: 'PATCH',
      headers: anonHeaders,
      body: JSON.stringify({ migration_name: 'tampered' })
    });
    recordTest(
      'PATCH /_prisma_migrations unauthorized modification is blocked',
      resPatchMigrations.status === 401 || resPatchMigrations.status === 403,
      `status=${resPatchMigrations.status}`
    );

    const resDeleteMigrations = await fetch(`${restBase}/_prisma_migrations?id=neq.none`, {
      method: 'DELETE',
      headers: anonHeaders
    });
    recordTest(
      'DELETE /_prisma_migrations unauthorized deletion is blocked',
      resDeleteMigrations.status === 401 || resDeleteMigrations.status === 403,
      `status=${resDeleteMigrations.status}`
    );

    // -------------------------------------------------------------------------
    // CATEGORY 7: Server-Side Prisma Operational Continuity
    // -------------------------------------------------------------------------
    console.log('\n>>> [CATEGORY 7] Server-Side Prisma Operational Continuity');

    const settingsPrisma = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    recordTest(
      'Prisma server-side can read StoreSettings',
      Boolean(settingsPrisma && settingsPrisma.id === 'default'),
      `id=${settingsPrisma?.id}`
    );

    const ordersPrisma = await prisma.order.findMany({ take: 5 });
    recordTest(
      'Prisma server-side can read Orders',
      Array.isArray(ordersPrisma),
      `count=${ordersPrisma.length}`
    );

    const allProductsPrisma = await prisma.product.findMany({ take: 5 });
    const draftProductsPrisma = await prisma.product.findMany({ where: { isDraft: true }, take: 5 });
    recordTest(
      'Prisma server-side can read Products (published & drafts)',
      allProductsPrisma.length > 0 && draftProductsPrisma.length > 0,
      `published sample=${allProductsPrisma.length}, draft sample=${draftProductsPrisma.length}`
    );

    const updatedSettings = await prisma.storeSettings.update({
      where: { id: 'default' },
      data: { updatedAt: new Date() }
    });
    recordTest(
      'Prisma server-side can update StoreSettings',
      Boolean(updatedSettings && updatedSettings.updatedAt),
      `updatedAt=${updatedSettings?.updatedAt?.toISOString()}`
    );

  } catch (err) {
    console.error('\n❌ Unhandled exception during challenger penetration execution:', err);
    recordTest('Penetration suite completed without crashing', false, err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n======================================================================');
  console.log(`SUMMARY: Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('======================================================================');

  if (failedTests > 0) {
    console.log('\n🚨 EMPIRICAL VERDICT: REQUEST_CHANGES');
    for (const f of failures) {
      console.log(`  - ${f}`);
    }
    process.exit(1);
  } else {
    console.log('\n🎉 EMPIRICAL VERDICT: APPROVE');
    console.log('All 43 security challenges, penetration attacks, and continuity tests PASSED!');
    process.exit(0);
  }
}

runAudit();
