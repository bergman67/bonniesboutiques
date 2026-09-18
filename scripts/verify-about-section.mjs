import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║       BONNIE\'S BOUTIQUE — ABOUT SECTION & BRAND COPY VERIFICATION        ║');
console.log('║           Verifying Generational Crafting & No "16-bit" Copy             ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

function recordPass(checkName) {
  console.log(`  ✔ [PASS] ${checkName}`);
  passCount++;
}

function recordFail(checkName, error) {
  console.error(`  ✖ [FAIL] ${checkName}: ${error?.message || error}`);
  failCount++;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. VERIFY src/app/page.tsx (About Section)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Verifying src/app/page.tsx (About Section) ---');
try {
  const pagePath = path.join(ROOT_DIR, 'src', 'app', 'page.tsx');
  assert(fs.existsSync(pagePath), 'src/app/page.tsx must exist');
  const pageSrc = fs.readFileSync(pagePath, 'utf8');

  // Locate the About section
  const aboutMatch = pageSrc.match(/<section\s+id="about"[\s\S]*?<\/section>/);
  assert(aboutMatch, '<section id="about"> must exist in src/app/page.tsx');
  const aboutSection = aboutMatch[0];

  // Check 1.1: Eyebrow contains "✦ Generational Crafting ✦"
  assert(
    aboutSection.includes('✦ Generational Crafting ✦'),
    'About section eyebrow must contain "✦ Generational Crafting ✦"'
  );
  recordPass('About section eyebrow contains "✦ Generational Crafting ✦"');

  // Check 1.2: Title contains "Made by Bonnie & Tammy, with generational heart"
  assert(
    aboutSection.includes('Made by Bonnie & Tammy') &&
    aboutSection.includes('with generational heart'),
    'About section title must mention "Made by Bonnie & Tammy" and "with generational heart"'
  );
  recordPass('About section title contains "Made by Bonnie & Tammy, with generational heart"');

  // Check 1.3: Body explicitly contains "generational crafting"
  assert(
    /generational\s+crafting/i.test(aboutSection),
    'About section body must explicitly contain "generational crafting"'
  );
  recordPass('About section body explicitly contains "generational crafting"');

  // Check 1.4: Body explicitly contains "animations"
  assert(
    /animations/i.test(aboutSection),
    'About section body must explicitly contain "animations"'
  );
  recordPass('About section body explicitly contains "animations"');

  // Check 1.5: Body contains "Bonnie & Tammy"
  assert(
    aboutSection.includes('Bonnie & Tammy') || aboutSection.includes('Bonnie &amp; Tammy'),
    'About section body must contain "Bonnie & Tammy"'
  );
  recordPass('About section body contains "Bonnie & Tammy"');

  // Check 1.6: Mention variety of animations bringing the shop to life (waving Bonnie & Tammy, flickering lanterns, floating relics)
  assert(
    aboutSection.includes('variety of animations'),
    'About section must mention a "variety of animations"'
  );
  recordPass('About section body describes the variety of animations');

  // Check 1.7: No "16-bit" in About section rendered copy
  assert(
    !/16-bit/i.test(aboutSection),
    'About section rendered copy must NOT contain "16-bit"'
  );
  recordPass('About section rendered copy contains NO references to "16-bit"');

  // Check 1.8: No "16-bit" in any user-visible JSX copy across page.tsx
  // Strip comments before checking rendered copy
  const pageNoComments = pageSrc.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/.*/g, '');
  assert(
    !/16-bit/i.test(pageNoComments),
    'page.tsx rendered JSX copy must NOT contain "16-bit"'
  );
  recordPass('page.tsx rendered copy contains NO references to "16-bit"');

} catch (err) {
  recordFail('src/app/page.tsx verification', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VERIFY src/components/scrollytelling/ScrollytellingExperience.tsx
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Verifying ScrollytellingExperience.tsx ---');
try {
  const expPath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'ScrollytellingExperience.tsx');
  assert(fs.existsSync(expPath), 'ScrollytellingExperience.tsx must exist');
  const expSrc = fs.readFileSync(expPath, 'utf8');

  // Strip JSX and JS comments to inspect rendered user-facing copy
  const expNoComments = expSrc.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/.*/g, '');

  // Check 2.1: No "16-bit" in rendered copy
  assert(
    !/16-bit/i.test(expNoComments),
    'ScrollytellingExperience.tsx rendered JSX copy must NOT contain "16-bit"'
  );
  recordPass('ScrollytellingExperience.tsx rendered copy contains NO "16-bit"');

  // Check 2.2: Hero copy replaced with elegant phrasing
  assert(
    expSrc.includes('enchanted handcrafted boutique'),
    'Hero copy must feature "enchanted handcrafted boutique"'
  );
  recordPass('Hero copy uses elegant "enchanted handcrafted boutique" phrasing');

  // Check 2.3: Descent copy replaced with elegant phrasing
  assert(
    expSrc.includes('nostalgic handcrafted shop counter'),
    'Descent prompt must feature "nostalgic handcrafted shop counter"'
  );
  recordPass('Descent prompt uses elegant "nostalgic handcrafted shop counter" phrasing');

} catch (err) {
  recordFail('ScrollytellingExperience.tsx verification', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VERIFY src/components/scrollytelling/ProductHUD.tsx
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Verifying ProductHUD.tsx Fallback ---');
try {
  const hudPath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'ProductHUD.tsx');
  assert(fs.existsSync(hudPath), 'ProductHUD.tsx must exist');
  const hudSrc = fs.readFileSync(hudPath, 'utf8');

  // Check 3.1: Fallback description references "Bonnie & Tammy"
  assert(
    hudSrc.includes('Handcrafted with mystical love and care by Bonnie & Tammy'),
    'ProductHUD fallback description must say "by Bonnie & Tammy"'
  );
  recordPass('ProductHUD fallback description references "Bonnie & Tammy"');

} catch (err) {
  recordFail('ProductHUD.tsx verification', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VERIFY src/components/scrollytelling/PixelStorefrontLayer.tsx
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Verifying PixelStorefrontLayer.tsx ---');
try {
  const pixelPath = path.join(ROOT_DIR, 'src', 'components', 'scrollytelling', 'PixelStorefrontLayer.tsx');
  assert(fs.existsSync(pixelPath), 'PixelStorefrontLayer.tsx must exist');
  const pixelSrc = fs.readFileSync(pixelPath, 'utf8');

  // Check 4.1: Banner contains "BOUTIQUE"
  assert(
    pixelSrc.includes('BOUTIQUE'),
    'PixelStorefrontLayer banner text must include "BOUTIQUE"'
  );
  recordPass('PixelStorefrontLayer banner text includes "BOUTIQUE"');

} catch (err) {
  recordFail('PixelStorefrontLayer.tsx verification', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════════');
console.log(`VERIFICATION SUMMARY: ${passCount} PASSED / ${failCount} FAILED`);
console.log('══════════════════════════════════════════════════════════════════════════');

if (failCount > 0) {
  console.error(`\n❌ Verification failed with ${failCount} errors.`);
  process.exit(1);
} else {
  console.log('\n✔ All About section and brand messaging verifications passed successfully!\n');
  process.exit(0);
}
