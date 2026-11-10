#!/usr/bin/env node
/**
 * scripts/verify-schema-seo.mjs
 * 
 * Automated verification test suite for Bonnie's Boutique Storefront CRO & Schema.org SEO.
 * Asserts Google Merchant Listings compliance, structured data integrity, and CRO enhancements.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

const ROOT = process.cwd();
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${description}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n======================================================');
console.log('🚀 BONNIE\'S BOUTIQUE: CRO & SCHEMA.ORG SEO VERIFICATION');
console.log('======================================================\n');

// ── 1. AddToCartButton Verification ──────────────────────────────────────────
console.log('[1/10] Verifying AddToCartButton.tsx...');
const addToCartSrc = fs.readFileSync(path.join(ROOT, 'src/components/AddToCartButton.tsx'), 'utf8');

test('AddToCartButton does not hardcode $8.00 in button label', () => {
  assert(!addToCartSrc.includes('Add to Cart — $8.00'), 'Found hardcoded "Add to Cart — $8.00"');
});

test('AddToCartButton dynamically displays product.price.toFixed(2)', () => {
  assert(
    addToCartSrc.includes('product.price.toFixed(2)') || addToCartSrc.includes('price.toFixed(2)'),
    'Missing dynamic price interpolation in AddToCartButton'
  );
});

// ── 2. ProductCard Verification ──────────────────────────────────────────────
console.log('\n[2/10] Verifying ProductCard.tsx...');
const productCardSrc = fs.readFileSync(path.join(ROOT, 'src/components/ProductCard.tsx'), 'utf8');

test('ProductCard title link allows direct navigation without e.preventDefault() trap', () => {
  assert(
    !productCardSrc.includes('onClick={handleCardClick}\n            className="hover:text-[#e8748a]'),
    'Title link must not intercept click with handleCardClick'
  );
  assert(productCardSrc.includes('stopPropagation'), 'Title click should stop propagation to allow direct navigation');
});

test('ProductCard contains "✦ 1 of 1 Unique" scarcity badge', () => {
  assert(productCardSrc.includes('✦ 1 of 1 Unique'), 'Missing "✦ 1 of 1 Unique" badge');
});

test('ProductCard strips incomplete microdata attributes', () => {
  assert(!productCardSrc.includes('itemScope'), 'itemScope microdata must be removed to avoid GSC warnings');
  assert(!productCardSrc.includes('itemType='), 'itemType microdata must be removed to avoid GSC warnings');
  assert(!productCardSrc.includes('itemProp='), 'itemProp microdata must be removed to avoid GSC warnings');
});

// ── 3. QuickViewModal & CartDrawer Layering Verification ──────────────────────
console.log('\n[3/10] Verifying QuickViewModal.tsx & CartDrawer.tsx Layering...');
const quickViewSrc = fs.readFileSync(path.join(ROOT, 'src/components/QuickViewModal.tsx'), 'utf8');
const cartDrawerSrc = fs.readFileSync(path.join(ROOT, 'src/components/CartDrawer.tsx'), 'utf8');

test('QuickViewModal container uses z-40 and closes smoothly on add to cart', () => {
  assert(quickViewSrc.includes('fixed inset-0 z-40'), 'QuickView container should be z-40');
  assert(quickViewSrc.includes('onClose()') && quickViewSrc.includes('handleAddToCart'), 'QuickView should close when added to cart');
});

test('CartDrawer uses z-[60] for drawer and z-[55] for backdrop', () => {
  assert(cartDrawerSrc.includes('z-[60]'), 'CartDrawer must use z-[60]');
  assert(cartDrawerSrc.includes('z-[55]'), 'CartDrawer backdrop must use z-[55]');
});

test('CartDrawer strictly standardizes free shipping threshold to 25.0', () => {
  assert(cartDrawerSrc.includes('freeShippingThreshold : 25.0'), 'Threshold fallback must be 25.0');
});

test('CartDrawer contains 1-click upsell booster module', () => {
  assert(cartDrawerSrc.includes('Free Shipping Booster') || cartDrawerSrc.includes('1-Click Add'), 'Missing 1-click upsell module');
  assert(cartDrawerSrc.includes('UPSELL_CANDIDATES'), 'Missing UPSELL_CANDIDATES in CartDrawer');
});

// ── 4. Header Top Announcement Bar Verification ─────────────────────────────
console.log('\n[4/10] Verifying Header.tsx Announcement Bar...');
const headerSrc = fs.readFileSync(path.join(ROOT, 'src/components/Header.tsx'), 'utf8');

test('Header renders Top Announcement Bar with $25 free shipping and handmade by Bonnie & Tammy', () => {
  assert(
    headerSrc.includes('Free US Shipping on orders over $25') &&
    headerSrc.includes('Handcrafted by Bonnie'),
    'Header must render top announcement bar with $25 shipping and Bonnie & Tammy credit'
  );
});

// ── 5. Homepage CRO, Trust Bar & Review Showcase ─────────────────────────────
console.log('\n[5/10] Verifying Homepage (src/app/page.tsx)...');
const homeSrc = fs.readFileSync(path.join(ROOT, 'src/app/page.tsx'), 'utf8');

test('Homepage contains expanded 4-badge Trust Bar', () => {
  assert(homeSrc.includes('Handcrafted in Virginia'), 'Missing Handcrafted in Virginia badge');
  assert(homeSrc.includes('1-of-1 Unique Keepsakes'), 'Missing 1-of-1 Unique Keepsakes badge');
  assert(homeSrc.includes('Free US Shipping Over $25'), 'Missing Free US Shipping Over $25 badge');
  assert(homeSrc.includes('Secure 256-Bit SSL Checkout'), 'Missing Secure 256-Bit SSL Checkout badge');
});

test('Homepage includes Customer Praise / Reviews Showcase section', () => {
  assert(homeSrc.includes('Loved by Gift-Givers'), 'Missing Customer Reviews showcase');
  assert(homeSrc.includes('Verified Buyer'), 'Missing Verified Buyer badge in reviews');
});

test('Homepage complies with Guardrails: no "16-bit" and no "/admin" links', () => {
  assert(!homeSrc.includes('16-bit'), 'GUARDRAIL VIOLATION: "16-bit" found in page.tsx');
  assert(!homeSrc.includes('href="/admin"'), 'GUARDRAIL VIOLATION: link to /admin found in page.tsx');
});

// ── 6. Homepage Schema.org JSON-LD Verification ──────────────────────────────
console.log('\n[6/10] Verifying Homepage Schema.org JSON-LD...');

test('homeJsonLd contains OnlineStore with founder, paymentAccepted, currenciesAccepted', () => {
  assert(homeSrc.includes("founder: ["), 'Missing founder in OnlineStore schema');
  assert(homeSrc.includes("name: 'Bonnie'"), 'Missing Bonnie in founder schema');
  assert(homeSrc.includes("name: 'Tammy'"), 'Missing Tammy in founder schema');
  assert(homeSrc.includes("paymentAccepted: 'Credit Card, Stripe, PayPal, Venmo'"), 'Missing paymentAccepted in OnlineStore');
  assert(homeSrc.includes("currenciesAccepted: 'USD'"), 'Missing currenciesAccepted in OnlineStore');
});

test('homeJsonLd WebSite SearchAction target has no #collections fragment', () => {
  assert(
    homeSrc.includes("target: 'https://btboutiqe.com/?q={search_term_string}'"),
    'SearchAction target must not contain URL fragment'
  );
});

test('homeJsonLd ItemList products include Google Merchant properties', () => {
  assert(homeSrc.includes("shippingDetails: ["), 'ItemList products missing shippingDetails');
  assert(homeSrc.includes("hasMerchantReturnPolicy: {"), 'ItemList products missing hasMerchantReturnPolicy');
  assert(homeSrc.includes("priceValidUntil"), 'ItemList products missing priceValidUntil');
  assert(homeSrc.includes("sku: p.id"), 'ItemList products missing sku');
});

// ── 7. Product Detail Page Verification ──────────────────────────────────────
console.log('\n[7/10] Verifying Product Page (src/app/products/[id]/page.tsx)...');
const productPageSrc = fs.readFileSync(path.join(ROOT, 'src/app/products/[id]/page.tsx'), 'utf8');

test('Product page copy standardizes on $25 free shipping (not $20)', () => {
  assert(!productPageSrc.includes('Free shipping on orders over $20'), 'Found obsolete "$20" shipping copy');
  assert(productPageSrc.includes('Free shipping on orders over $25'), 'Missing "$25" free shipping copy');
});

test('Product page BreadcrumbList item 2 does not have #collections fragment', () => {
  assert(
    !productPageSrc.includes("encodeURIComponent(category)}#collections'"),
    'BreadcrumbList position 2 must not include #collections fragment'
  );
});

test('Product page exports generateStaticParams for SSG', () => {
  assert(productPageSrc.includes('export async function generateStaticParams()'), 'Missing generateStaticParams export');
});

test('Product page renders Mobile Sticky Add to Cart bar', () => {
  assert(productPageSrc.includes('md:hidden fixed bottom-0'), 'Missing mobile sticky Add to Cart bar');
});

test('Product page productJsonLd complies with Google Merchant Listings', () => {
  assert(productPageSrc.includes("'@type': 'OfferShippingDetails'"), 'Missing OfferShippingDetails in product JSON-LD');
  assert(productPageSrc.includes("'@type': 'MerchantReturnPolicy'"), 'Missing MerchantReturnPolicy in product JSON-LD');
  assert(productPageSrc.includes("priceValidUntil"), 'Missing priceValidUntil in product JSON-LD');
  assert(productPageSrc.includes("'@id': 'https://btboutiqe.com/#store'"), 'Missing canonical seller @id in product JSON-LD');
});

// ── 8. Checkout Form & Autocomplete Verification ─────────────────────────────
console.log('\n[8/10] Verifying Checkout Page (src/app/checkout/page.tsx)...');
const checkoutSrc = fs.readFileSync(path.join(ROOT, 'src/app/checkout/page.tsx'), 'utf8');

test('Checkout inputs have HTML5 autoComplete attributes', () => {
  assert(checkoutSrc.includes('autoComplete="given-name"'), 'Missing autoComplete="given-name"');
  assert(checkoutSrc.includes('autoComplete="family-name"'), 'Missing autoComplete="family-name"');
  assert(checkoutSrc.includes('autoComplete="email"'), 'Missing autoComplete="email"');
  assert(checkoutSrc.includes('autoComplete="tel"'), 'Missing autoComplete="tel"');
  assert(checkoutSrc.includes('autoComplete="street-address"'), 'Missing autoComplete="street-address"');
  assert(checkoutSrc.includes('autoComplete="address-level2"'), 'Missing autoComplete="address-level2"');
  assert(checkoutSrc.includes('autoComplete="address-level1"'), 'Missing autoComplete="address-level1"');
  assert(checkoutSrc.includes('autoComplete="postal-code"'), 'Missing autoComplete="postal-code"');
});

test('Checkout page includes collapsible mobile order summary accordion', () => {
  assert(checkoutSrc.includes('mobileSummaryOpen'), 'Missing mobileSummaryOpen state');
  assert(checkoutSrc.includes('Show order summary') || checkoutSrc.includes('Hide order summary'), 'Missing mobile order summary accordion');
});

// ── 9. Layout & Sitemap Technical SEO Verification ───────────────────────────
console.log('\n[9/10] Verifying Layout & Sitemap Metadata...');
const layoutSrc = fs.readFileSync(path.join(ROOT, 'src/app/layout.tsx'), 'utf8');
const sitemapSrc = fs.readFileSync(path.join(ROOT, 'src/app/sitemap.ts'), 'utf8');

test('layout.tsx metadata has refined high-CTR title and 1200x630 OG image', () => {
  assert(layoutSrc.includes("Bonnie's Boutique | Handmade Beaded Pens, Keychains & Gifts"), 'Title not updated to high-CTR version');
  assert(layoutSrc.includes("width: 1200"), 'OG image width 1200 missing');
  assert(layoutSrc.includes("height: 630"), 'OG image height 630 missing');
  assert(layoutSrc.includes("site: \"@btboutiqe\"") || layoutSrc.includes("site: '@btboutiqe'"), 'Twitter site handle missing');
});

test('sitemap.ts adds product image metadata to product routes', () => {
  assert(sitemapSrc.includes('images: product.imageUrl ? [product.imageUrl] : undefined'), 'Missing images array in sitemap productRoutes');
});

// ── 10. Build Script Reliability Verification ────────────────────────────────
console.log('\n[10/10] Verifying package.json build script...');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('package.json scripts.build pre-creates .next/server/pages directory', () => {
  assert(
    pkg.scripts?.build?.includes("fs.mkdirSync('.next/server/pages', {recursive: true})"),
    'package.json build script must pre-create .next/server/pages for Windows reliability'
  );
});

// ── Final Test Summary ───────────────────────────────────────────────────────
console.log('\n======================================================');
console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL CRO & SCHEMA.ORG SEO VERIFICATION CHECKS PASSED!\n');
  process.exit(0);
}
