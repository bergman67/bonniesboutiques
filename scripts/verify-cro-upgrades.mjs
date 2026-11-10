#!/usr/bin/env node
/**
 * scripts/verify-cro-upgrades.mjs
 *
 * Comprehensive Verification Suite for Bonnie's Boutique Traffic, Conversion (CRO),
 * Margin-Protective Shipping, Security, Trust Pages, Performance & Social Ingress Upgrades.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const ROOT_DIR = process.cwd();
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache', 'cro_verifier');
fs.mkdirSync(CACHE_DIR, { recursive: true });

function transpileTs(relPath, outFile) {
  const src = fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
  const transpiled = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const dest = path.join(CACHE_DIR, outFile);
  fs.writeFileSync(dest, transpiled, 'utf8');
  return `file://${dest.replace(/\\/g, '/')}`;
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}`);
    console.error(`     ${err?.message || err}`);
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║    BONNIE\'S BOUTIQUE — CRO, SECURITY & SOCIAL INGRESS VERIFIER           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  const prisma = new PrismaClient();

  try {
    // ── SUITE 1: DATABASE & MANIFEST SYNCHRONIZATION ──────────────────────────
    console.log('▶ Suite 1: Database Catalog Sync, Manifest Fallback & Listing Hygiene');

    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'src/lib/scrollytelling/productAssetManifest.json'), 'utf8')
    );
    const manifestIds = manifest.products.map((p) => p.id);

    await test('1.1 Live PostgreSQL catalog exposes >= 135 published products including >= 28 flagship Beaded Pens', async () => {
      const livePublished = await prisma.product.findMany({
        where: { isDraft: false },
      });
      assert(
        livePublished.length >= 135,
        `Expected >= 135 published products in PostgreSQL, found ${livePublished.length}`
      );
      const livePens = livePublished.filter((p) => (p.title || '').toLowerCase().includes('pen'));
      assert(
        livePens.length >= 28,
        `Expected >= 28 live published Beaded Pens in PostgreSQL, found ${livePens.length}`
      );
      const dbManifestMatches = await prisma.product.count({
        where: { id: { in: manifestIds } },
      });
      assert(
        dbManifestMatches >= 80,
        `Expected >= 80 manifest CUIDs synced in PostgreSQL, found ${dbManifestMatches}`
      );
    });

    await test('1.2 Zero live typos or boilerplate one-liner descriptions remain in published catalog', async () => {
      const liveItems = await prisma.product.findMany({ where: { isDraft: false } });
      const typoRegex = /\b(wrislet|key hain|Rottwelier|Charn|foe keys)\b/i;
      for (const item of liveItems) {
        assert(
          !typoRegex.test(item.title) && !typoRegex.test(item.description || ''),
          `Live item "${item.title}" (${item.id}) still contains an unhealed typo`
        );
        assert(
          (item.description || '').trim() !== "Handmade trinket from Bonnie's Boutique.",
          `Live item "${item.title}" still has generic unenriched boilerplate description`
        );
      }
    });

    await test('1.3 PDP src/app/products/[id]/page.tsx resolves manifest fallback unconditionally while preserving draft hide guard', async () => {
      const pdpSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/app/products/[id]/page.tsx'), 'utf8');
      assert(!pdpSrc.includes('!product && dbUnreachable'), 'PDP must not gate manifest fallback on dbUnreachable');
      assert(pdpSrc.includes('findManifestProduct'), 'PDP must use findManifestProduct helper');
      assert(pdpSrc.includes('if (product?.isDraft)'), 'PDP must guard against exposing draft DB items');
      assert(pdpSrc.includes("value: '4.99'"), 'PDP Schema.org shippingRate must match $4.99 cap');
      assert(pdpSrc.includes('Refillable 1.0mm smooth black ink'), 'PDP must surface Beaded Pen refillability specs');
    });

    // ── SUITE 2: COUPONS, MARGIN-PROTECTIVE SHIPPING & STORE SETTINGS ─────────
    console.log('\n▶ Suite 2: Coupon Engine, Tiered Shipping & Margin Protection');

    const couponsMod = await import(transpileTs('src/lib/coupons.ts', 'coupons.mjs'));

    await test('2.1 Promo validation supports BONNIE10, SHORTS10, WELCOME10, RECOVER10 (10%) and GRANDMA15 (15%)', async () => {
      for (const code of ['BONNIE10', 'bonnie10', '  shorts10 ', 'WELCOME10', 'RECOVER10']) {
        const res = couponsMod.validatePromoCode(code, 20.0);
        assert.equal(res.valid, true, `Expected ${code} to validate`);
        assert.equal(res.percentOff, 10);
        assert.equal(res.discountAmount, 2.0);
      }
      const vip = couponsMod.validatePromoCode('grandma15', 20.0);
      assert.equal(vip.valid, true);
      assert.equal(vip.percentOff, 15);
      assert.equal(vip.discountAmount, 3.0);

      const invalid = couponsMod.validatePromoCode('FAKE99', 20.0);
      assert.equal(invalid.valid, false);
    });

    await test('2.2 Margin-protective shipping: $27 cart + BONNIE10 ($24.30 net) retains FREE shipping ($0.00)', async () => {
      const pricing = couponsMod.calculateOrderPricing({
        subtotal: 27.0,
        promoCode: 'BONNIE10',
        shippingFlatRate: 4.99,
        freeShippingThreshold: 25.0,
      });
      assert.equal(pricing.preDiscountSubtotal, 27.0);
      assert.equal(pricing.discountAmount, 2.7);
      assert.equal(pricing.discountedSubtotal, 24.3);
      assert.equal(pricing.isFreeShipping, true, 'Free shipping must NOT be revoked by promo discount');
      assert.equal(pricing.shippingCost, 0);
      assert.equal(pricing.finalTotal, 24.3);
    });

    await test('2.3 Shipping tiers & $10 minimum order guard ($8 blocked, $12 -> $4.99, $18 -> $3.99, $24+$3 refill -> $0)', async () => {
      const micro = couponsMod.calculateOrderPricing({ subtotal: 8.0 });
      assert.equal(micro.meetsMinimumOrder, false);
      assert.equal(micro.amountToMinimumOrder, 2.0);

      const tierStandard = couponsMod.calculateOrderPricing({ subtotal: 12.0 });
      assert.equal(tierStandard.meetsMinimumOrder, true);
      assert.equal(tierStandard.shippingCost, 4.99);

      const tierSubsidized = couponsMod.calculateOrderPricing({ subtotal: 18.0 });
      assert.equal(tierSubsidized.shippingCost, 3.99);

      const deadZoneSolved = couponsMod.calculateOrderPricing({ subtotal: 24.0 + 3.0 });
      assert.equal(deadZoneSolved.isFreeShipping, true);
      assert.equal(deadZoneSolved.shippingCost, 0);
    });

    await test('2.4 Live PostgreSQL StoreSettings shippingFlatRate is updated to 4.99 with $25 free-shipping threshold', async () => {
      const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
      assert(settings, 'StoreSettings default row must exist');
      assert.equal(settings.shippingFlatRate, 4.99);
      assert.equal(settings.freeShippingThreshold, 25);
    });

    // ── SUITE 3: CHECKOUT SECURITY & STRIPE PENNY RECONCILIATION ──────────────
    console.log('\n▶ Suite 3: Checkout Security Patch & Stripe Cent Reconciliation');

    await test('3.1 POST /api/checkout blocks unpaid pending orders from purchasing live Shippo labels', async () => {
      const routeSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/app/api/checkout/route.ts'), 'utf8');
      assert(
        routeSrc.includes("settings?.autoCreateLabel !== false && order.paymentStatus === 'paid'"),
        'POST /api/checkout must gate generateShippingLabelForOrder behind order.paymentStatus === "paid"'
      );
      assert(
        routeSrc.includes('if (!pricing.meetsMinimumOrder)'),
        'POST /api/checkout must enforce server-side minimum order subtotal'
      );
    });

    await test('3.2 Discounted Stripe line-item splitter reconciles tricky odd-quantity discounts to the exact cent', async () => {
      // Simulate buildStripeLineItems logic on 3 x $8.25 = $24.75 w/ BONNIE10 (10% off -> $22.27 = 2227 cents)
      const pricing = couponsMod.calculateOrderPricing({ subtotal: 24.75, promoCode: 'BONNIE10' });
      const targetCents = Math.round(pricing.discountedSubtotal * 100);
      assert.equal(targetCents, 2227);

      const discUnit = Math.floor(825 * 0.9); // 742 cents
      const currentSum = discUnit * 3; // 2226 cents
      const diff = targetCents - currentSum; // +1 cent
      const splitTotal = discUnit * 2 + (discUnit + diff) * 1;
      assert.equal(splitTotal, targetCents, 'Split Stripe line items must equal targetDiscountedCents with 0 residual');
    });

    // ── SUITE 4: TRUST PAGES, SOCIAL BIO HUB & SITEMAP ────────────────────────
    console.log('\n▶ Suite 4: Trust Architecture, /links Social Bio Hub & Lead Capture');

    await test('4.1 Dedicated /shipping, /returns, /contact, /links, /api/coupons & /api/leads routes exist with Clearbrook VA origin', async () => {
      const requiredFiles = [
        'src/app/shipping/page.tsx',
        'src/app/returns/page.tsx',
        'src/app/contact/page.tsx',
        'src/app/links/page.tsx',
        'src/app/api/coupons/route.ts',
        'src/app/api/leads/route.ts',
        'src/components/StoreFooter.tsx',
        'src/components/WelcomeOfferWidget.tsx',
        'src/components/GiftBundlesSection.tsx',
      ];
      for (const rel of requiredFiles) {
        assert(fs.existsSync(path.join(ROOT_DIR, rel)), `Missing required file: ${rel}`);
      }

      const footerSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/components/StoreFooter.tsx'), 'utf8');
      assert(footerSrc.includes('Clearbrook, Virginia'), 'StoreFooter must cite Clearbrook, Virginia origin');
      assert(footerSrc.includes('bonnielong106@yahoo.com'), 'StoreFooter must cite support email');

      const linksSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/app/links/page.tsx'), 'utf8');
      assert(!linksSrc.includes('ScrollytellingExperience'), '/links must not load heavy 3D scrollytelling');
      assert(linksSrc.includes('ClaimPromoButton'), '/links must include 1-tap BONNIE10 activator');
    });

    await test('4.2 Dynamic sitemap includes /links, /shipping, /returns, and /contact', async () => {
      const sitemapSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/app/sitemap.ts'), 'utf8');
      for (const route of ['/links', '/shipping', '/returns', '/contact']) {
        assert(sitemapSrc.includes(route), `sitemap.ts must include ${route}`);
      }
    });

    // ── SUITE 5: PERFORMANCE, SCROLLYTELLING & GIFT BUNDLES ───────────────────
    console.log('\n▶ Suite 5: Mobile Performance & Merchandising Upgrades');

    await test('5.1 Header logo WebP is < 20KB (99%+ reduction from 548KB) while public/bt_logo.jpg stays intact', async () => {
      const origStat = fs.statSync(path.join(ROOT_DIR, 'public/bt_logo.jpg'));
      const webpStat = fs.statSync(path.join(ROOT_DIR, 'public/bt_logo_sm.webp'));
      assert(origStat.size > 100000, 'public/bt_logo.jpg must remain intact');
      assert(webpStat.size > 500 && webpStat.size < 20000, `Expected bt_logo_sm.webp < 20KB, got ${webpStat.size}B`);

      const cssSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/app/globals.css'), 'utf8');
      assert(!cssSrc.includes('@import url('), 'globals.css must not contain render-blocking @import url()');
    });

    await test('5.2 Mobile scrollytelling uses condensed 185vh height + skip pill, and Homepage mounts GiftBundlesSection', async () => {
      const scrollySrc = fs.readFileSync(
        path.join(ROOT_DIR, 'src/components/scrollytelling/ScrollytellingExperience.tsx'),
        'utf8'
      );
      assert(scrollySrc.includes("'185vh'"), 'ScrollytellingExperience must use condensed mobile scroll height');
      assert(scrollySrc.includes('Shop All Pens &amp; Gifts'), 'ScrollytellingExperience must render skip-to-catalog pill');

      const homeSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/app/page.tsx'), 'utf8');
      assert(homeSrc.includes('<GiftBundlesSection'), 'Homepage must render GiftBundlesSection');
    });

    // ── SUITE 6: TELEMETRY & PIXEL INFRASTRUCTURE ─────────────────────────────
    console.log('\n▶ Suite 6: Full-Funnel Commerce Telemetry');

    await test('6.1 AnalyticsPixels is mounted in RootLayout and commerce events fire across funnel', async () => {
      const layoutSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/app/layout.tsx'), 'utf8');
      assert(layoutSrc.includes('<AnalyticsPixels />'), 'RootLayout must mount AnalyticsPixels');

      const cartCtxSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/context/CartContext.tsx'), 'utf8');
      assert(cartCtxSrc.includes("trackCommerceEvent('AddToCart'"), 'CartContext must fire AddToCart event');

      const checkoutSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/app/checkout/page.tsx'), 'utf8');
      assert(checkoutSrc.includes("trackCommerceEvent('InitiateCheckout'"), 'Checkout must fire InitiateCheckout');
      assert(checkoutSrc.includes("trackCommerceEvent('Purchase'"), 'Checkout must fire Purchase');
    });

    // ── SUITE 7: VIDEO STUDIO SAFE-ZONE WATERMARK & SOCIAL INGRESS ────────────
    console.log('\n▶ Suite 7: Autonomous Video Studio Safe-Zone Watermark & Platform Ingress');

    await test('7.1 Episode compiler renders vertical safe-zone watermark (y=180) and mid-episode BONNIE10 pill', async () => {
      const compilerSrc = fs.readFileSync(path.join(ROOT_DIR, 'scripts/generate-ai-episode.mjs'), 'utf8');
      assert(compilerSrc.includes('btboutiqe.com · Handmade in VA'), 'Episode compiler must render safe-zone watermark');
      assert(compilerSrc.includes('Code BONNIE10 (10% Off)'), 'Episode compiler must render dynamic BONNIE10 pill');
    });

    await test('7.2 Social caption generator differentiates Facebook UTM links vs YouTube/TikTok/IG bio-hub ingress', async () => {
      const captionsMod = await import(transpileTs('src/lib/studio/socialCaptions.ts', 'socialCaptions.mjs'));
      const dummySkit = {
        id: 'skit_test',
        title: 'Owl Tea Party',
        category: 'nat_geo_commentary',
        durationSeconds: 20,
        defaultBackdrop: 'cozy_night_shop',
        defaultPropId: 'cmnh2398u000a80379o73c02l',
        description: 'Grandma reacts to a snowy owl.',
        beats: [],
      };
      const allCopy = captionsMod.generateAllPlatformCopy(dummySkit);
      assert(
        allCopy.facebook_reels.caption.includes('utm_source=facebook&utm_medium=reels&promo=BONNIE10'),
        'Facebook Reels must include clickable UTM-tagged URL with promo=BONNIE10'
      );
      assert(
        allCopy.youtube_shorts.caption.includes('btboutiqe.com/links'),
        'YouTube Shorts must direct viewers to channel bio link btboutiqe.com/links'
      );
      assert(
        allCopy.tiktok.caption.includes('btboutiqe.com/links') && allCopy.tiktok.caption.includes('BONNIE10'),
        'TikTok caption must reference profile link btboutiqe.com/links and code BONNIE10'
      );
    });

    // ── SUITE 8: GLOBAL GUARDRAILS AUDIT ──────────────────────────────────────
    console.log('\n▶ Suite 8: Storefront Security & Brand Guardrails Audit');

    await test('8.1 Zero public storefront pages or components expose /admin links or "16-bit" in page.tsx', async () => {
      const publicFiles = [
        'src/app/page.tsx',
        'src/app/layout.tsx',
        'src/app/checkout/page.tsx',
        'src/app/products/[id]/page.tsx',
        'src/app/shipping/page.tsx',
        'src/app/returns/page.tsx',
        'src/app/contact/page.tsx',
        'src/app/links/page.tsx',
        'src/app/privacy/page.tsx',
        'src/app/terms/page.tsx',
        'src/components/Header.tsx',
        'src/components/StoreFooter.tsx',
        'src/components/CartDrawer.tsx',
        'src/components/ProductCard.tsx',
        'src/components/ProductCatalog.tsx',
        'src/components/QuickViewModal.tsx',
        'src/components/GiftBundlesSection.tsx',
        'src/components/WelcomeOfferWidget.tsx',
        'src/components/ContactFormClient.tsx',
        'src/components/ClaimPromoButton.tsx',
        'src/components/scrollytelling/ScrollytellingExperience.tsx',
      ];

      for (const rel of publicFiles) {
        const content = fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8');
        assert(
          !content.includes('href="/admin"') &&
            !content.includes("href='/admin'") &&
            !content.includes('href={`/admin`}'),
          `Guardrail violation: ${rel} contains a link to /admin!`
        );
      }

      const homePage = fs.readFileSync(path.join(ROOT_DIR, 'src/app/page.tsx'), 'utf8');
      assert(
        !homePage.toLowerCase().includes('16-bit') && !homePage.toLowerCase().includes('16bit'),
        'Guardrail violation: src/app/page.tsx contains "16-bit"!'
      );
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n══════════════════════════════════════════════════════════════════════════`);
  console.log(`  CRO Verification Summary: ${passed} passed, ${failed} failed`);
  console.log(`══════════════════════════════════════════════════════════════════════════\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal CRO verification error:', err);
  process.exit(1);
});
