#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

console.log('=== ADVERSARIAL STOREFRONT GUARDRAIL SCAN ===');

// Guardrail 1: 16-bit check on src/app/page.tsx
const pagePath = path.join(ROOT_DIR, 'src/app/page.tsx');
const pageContent = fs.readFileSync(pagePath, 'utf8');
const bit16Regex = /\b16-?bit\b/i;
const bit16Found = bit16Regex.test(pageContent);

console.log(`Guardrail 1: '16-bit' / '16bit' in src/app/page.tsx: ${bit16Found ? 'FOUND (FAIL)' : 'ZERO OCCURRENCES (PASS)'}`);
if (bit16Found) {
  process.exit(1);
}

// Guardrail 2: Zero /admin links or navigations in public storefront files
const publicStorefrontFiles = [
  'src/app/page.tsx',
  'src/app/layout.tsx',
  'src/app/checkout/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx',
  'src/components/Header.tsx',
  'src/components/ProductCard.tsx',
  'src/components/CartDrawer.tsx',
  'src/components/ProductCatalog.tsx',
  'src/components/QuickViewModal.tsx',
  'src/components/scrollytelling/ScrollytellingExperience.tsx',
];

let adminViolations = 0;
for (const rel of publicStorefrontFiles) {
  const full = path.join(ROOT_DIR, rel);
  if (!fs.existsSync(full)) {
    console.error(`Missing file: ${rel}`);
    adminViolations++;
    continue;
  }
  const content = fs.readFileSync(full, 'utf8');

  // Check for any link or navigation to /admin
  const hasAdminHref = /href\s*=\s*["'`]\/admin/i.test(content) || /href\s*=\s*\{["'`]\/admin/i.test(content);
  const hasRouterAdmin = /router\.(push|replace)\(["'`]\/admin/i.test(content);
  const hasWindowAdmin = /window\.location(\.href)?\s*=\s*["'`]\/admin/i.test(content);

  if (hasAdminHref || hasRouterAdmin || hasWindowAdmin) {
    console.error(`VIOLATION: ${rel} contains link or navigation to /admin!`);
    adminViolations++;
  } else {
    console.log(`  ✔ [PASS] ${rel}: zero /admin links or navigations`);
  }
}

console.log(`Guardrail 2 result: ${adminViolations} violations across ${publicStorefrontFiles.length} files.`);
if (adminViolations > 0) {
  process.exit(1);
}

console.log('=== ALL STOREFRONT GUARDRAILS VERIFIED 100% PASS ===');
