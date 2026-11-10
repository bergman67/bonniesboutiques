/**
 * tests/categories.test.mjs
 *
 * Unit tests for src/lib/categories.ts
 */

import assert from 'node:assert';
import { getProductCategory, getCategoryCounts, CATEGORIES } from '../src/lib/categories.ts';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Running Category Unit Tests ---');

// 1. Exported CATEGORIES constant
assert.deepStrictEqual(CATEGORIES, ['All', 'Beaded Pens', 'Keychains', 'Charms & Bookmarks']);
console.log('✔ CATEGORIES array contains expected 4 categories');

// 2. Beaded Pens keyword matching
assert.strictEqual(getProductCategory('Purple Butterfly Beaded Pen'), 'Beaded Pens');
assert.strictEqual(getProductCategory('PEN with sparkly beads'), 'Beaded Pens');
assert.strictEqual(getProductCategory('Custom Desk Accessory', 'A beaded pen for writing'), 'Beaded Pens');
console.log('✔ Beaded Pens correctly classified with case insensitivity and title/desc search');

// 3. Keychains keyword matching
assert.strictEqual(getProductCategory('Golden Orange Paw Print Keychain'), 'Keychains');
assert.strictEqual(getProductCategory('Pastel Dreams Beaded Wristlet'), 'Keychains');
assert.strictEqual(getProductCategory('Sparkly Beaded Loop'), 'Keychains');
assert.strictEqual(getProductCategory('Vintage Key Fob'), 'Keychains');
console.log('✔ Keychains classified for keychain, wristlet, loop, fob');

// 4. Charms & Bookmarks keyword matching
assert.strictEqual(getProductCategory('Polar Bear Winter Bookmark'), 'Charms & Bookmarks');
assert.strictEqual(getProductCategory('Sweet Strawberry Donut Charm'), 'Charms & Bookmarks');
assert.strictEqual(getProductCategory('Gold Silk Tassel Keepsake'), 'Charms & Bookmarks');
console.log('✔ Charms & Bookmarks classified for bookmark, charm, tassel');

// 5. Precedence handling (e.g. Keychain with Charm)
assert.strictEqual(getProductCategory('Flower Charm Pen'), 'Beaded Pens');
assert.strictEqual(getProductCategory('Pink Bow Keychain with Charm'), 'Keychains');
console.log('✔ Precedence correctly prioritizes pen > keychain > charm');

// 6. Null / undefined / empty edge cases
assert.strictEqual(getProductCategory('', null), 'Keychains');
assert.strictEqual(getProductCategory('Generic Trinket', undefined), 'Keychains');
console.log('✔ Edge cases handled without crashing, defaulting to Keychains');

// 7. Full Manifest Classification & Count Verification
const manifestPath = path.join(process.cwd(), 'src/lib/scrollytelling/productAssetManifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const counts = getCategoryCounts(manifest.products);

assert.strictEqual(counts['All'], 96, 'All must be 96');
assert.strictEqual(counts['Beaded Pens'], 40, 'Beaded Pens must be 40');
assert.strictEqual(counts['Keychains'], 33, 'Keychains must be 33');
assert.strictEqual(counts['Charms & Bookmarks'], 23, 'Charms & Bookmarks must be 23');
assert.strictEqual(counts['Beaded Pens'] + counts['Keychains'] + counts['Charms & Bookmarks'], 96);

console.log('✔ 96 Catalog Products counted accurately: 40 Pens, 33 Keychains, 23 Charms');
console.log('--- ALL CATEGORY UNIT TESTS PASSED ---');
