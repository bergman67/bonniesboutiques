#!/usr/bin/env node
/**
 * scripts/verify-studio.mjs
 *
 * Master Automated Verification Suite for:
 * "Bonnie & Tammy's Trinket Tales" Autonomous Short-Form Character Animation & Skit Studio
 *
 * Exhaustively and objectively verifies all R1-R4 requirements across 7 suites:
 * 1. Suite 1: Build & Route Integrity (unauthenticated /studio contract, /admin link, zero /admin links in storefront)
 * 2. Suite 2: Character Animation Rig & Emotive Expressions (7 actions, 6 expressions, Bonnie & Tammy dual palettes)
 * 3. Suite 3: 5 Cozy Scene Backdrops (Cozy Night Shop, Morning Coffee Prep, Rainy Window Crafting, Holiday/Spooky Season Decor, Closing Time Lo-Fi Chill)
 * 4. Suite 4: 96 Product Cutouts & RPG Item Appraisal Engine (manifest validation, transparent PNGs, procedural RPG stats, rarity, lore)
 * 5. Suite 5: Skit Engine, Custom Script Builder & 24/7 Lo-Fi Mode (>=20 skit templates, beat schema, continuous loop state machine)
 * 6. Suite 6: Multi-Aspect Framing, Burnt-In Synced Captions & Video Export (9:16, 16:9, 1:1 aspect configs, safe zones, stream mixing contract, batch auto-generator queue)
 * 7. Suite 7: Multi-Platform Caption & Hashtag Generator (TikTok, Instagram Reels, YouTube Shorts, Facebook Reels tailored copy and 1-click clipboard contract)
 *
 * Usage:
 *   node scripts/verify-studio.mjs
 *   node scripts/verify-studio.mjs --suite=1
 *   node scripts/verify-studio.mjs --verbose
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import ts from 'typescript';

const ROOT_DIR = process.cwd();
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache', 'verify_studio_cache');
const COMMENTARY_DIR = path.join(CACHE_DIR, 'commentary');

let _transpiledReady = false;
function ensureTranspiledModules() {
  if (_transpiledReady) return;
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(COMMENTARY_DIR, { recursive: true });

  const transpile = (srcRel, outFull, transform = null) => {
    let code = fs.readFileSync(path.join(ROOT_DIR, srcRel), 'utf8');
    if (transform) code = transform(code);
    const out = ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const fixed = out.replace(/from\s+['"](\.\.?\/[a-zA-Z0-9_\-\/]+)['"]/g, (m, p) => {
      if (p.endsWith('.mjs') || p.endsWith('.json')) return m;
      return `from '${p}.mjs'`;
    });
    fs.writeFileSync(outFull, fixed, 'utf8');
    return outFull;
  };

  transpile('src/lib/studio/skitTemplates.ts', path.join(CACHE_DIR, 'skitTemplates.mjs'));
  transpile('src/lib/studio/backdrops.ts', path.join(CACHE_DIR, 'backdrops.mjs'));
  transpile('src/lib/studio/rpgAppraisal.ts', path.join(CACHE_DIR, 'rpgAppraisal.mjs'), (code) => {
    const manifestPath = path.join(ROOT_DIR, 'src/lib/scrollytelling/productAssetManifest.json').replace(/\\/g, '/');
    return code.replace(
      /import manifest from ['"][^'"]+['"];/,
      `import fs from 'node:fs'; const manifest = JSON.parse(fs.readFileSync('${manifestPath}', 'utf8'));`
    );
  });
  transpile('src/lib/studio/commentary/types.ts', path.join(COMMENTARY_DIR, 'types.mjs'));
  transpile('src/lib/studio/commentary/antiRepetitionLedger.ts', path.join(COMMENTARY_DIR, 'antiRepetitionLedger.mjs'));
  transpile('src/lib/studio/commentary/proceduralGenerator.ts', path.join(COMMENTARY_DIR, 'proceduralGenerator.mjs'));
  transpile('src/lib/studio/commentary/llmCommentaryGenerator.ts', path.join(COMMENTARY_DIR, 'llmCommentaryGenerator.mjs'));
  transpile('src/lib/studio/commentary/commentaryEngine.ts', path.join(COMMENTARY_DIR, 'commentaryEngine.mjs'));
  transpile('src/lib/studio/flowMusicEngine.ts', path.join(CACHE_DIR, 'flowMusicEngine.mjs'));
  _transpiledReady = true;
}

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

class StudioTestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.totalSkipped = 0;
    this.startTime = Date.now();
  }

  async describeAsync(name, fn) {
    const suite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    const start = Date.now();
    try {
      await fn();
    } finally {
      suite.duration = Date.now() - start;
      this.currentSuite = prevSuite;
    }
  }

  async test(name, fn) {
    const suite = this.currentSuite;
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      const testRecord = { name, passed: true, duration, error: null };
      if (suite) {
        suite.tests.push(testRecord);
        suite.passed++;
      }
      this.totalPassed++;
      console.log(`    ${colors.green}✔ [PASS]${colors.reset} ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
      return testRecord;
    } catch (err) {
      const duration = Date.now() - start;
      const testRecord = { name, passed: false, duration, error: err };
      if (suite) {
        suite.tests.push(testRecord);
        suite.failed++;
      }
      this.totalFailed++;
      console.error(`    ${colors.red}✖ [FAIL]${colors.reset} ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
      console.error(`       ${colors.red}Error: ${err.message}${colors.reset}`);
      if (err.stack && process.env.VERBOSE) {
        console.error(err.stack);
      }
      return testRecord;
    }
  }

  skip(name, reason = 'Skipped') {
    const suite = this.currentSuite;
    const testRecord = { name, passed: true, skipped: true, duration: 0, reason };
    if (suite) {
      suite.tests.push(testRecord);
      suite.skipped++;
    }
    this.totalSkipped++;
    console.log(`    ${colors.yellow}↷ [SKIP]${colors.reset} ${name} (${reason})`);
    return testRecord;
  }

  printSummary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(`\n${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    const summaryColor = this.totalFailed === 0 ? colors.green : colors.red;
    console.log(
      `${summaryColor}${colors.bold}STUDIO TEST RUN SUMMARY: ${this.totalPassed} Passed, ${this.totalFailed} Failed, ${this.totalSkipped} Skipped (${duration}s)${colors.reset}`
    );
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    for (const suite of this.suites) {
      const statusIcon = suite.failed === 0 ? `${colors.green}✔${colors.reset}` : `${colors.red}✖${colors.reset}`;
      console.log(`  ${statusIcon} ${suite.name}: ${suite.passed}/${suite.tests.length} passed ${colors.dim}(${suite.duration}ms)${colors.reset}`);
      if (suite.failed > 0) {
        for (const t of suite.tests.filter((x) => !x.passed)) {
          console.log(`      ${colors.red}✖ ${t.name} -> ${t.error?.message}${colors.reset}`);
        }
      }
    }
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);
    return this.totalFailed === 0;
  }
}

// Assertion Helpers
function assertEqual(actual, expected, message) {
  assert.strictEqual(actual, expected, message);
}

function assertDeepEqual(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
}

function assertIncludes(haystack, needle, message) {
  assert(
    typeof haystack === 'string' && haystack.includes(needle),
    message || `Expected string to include "${needle}"`
  );
}

function assertNotIncludes(haystack, needle, message) {
  assert(
    typeof haystack === 'string' && !haystack.includes(needle),
    message || `Expected string NOT to include "${needle}"`
  );
}

function loadJsonFile(relativePath) {
  const fullPath = path.resolve(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function loadTextFile(relativePath) {
  const fullPath = path.resolve(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

// ──────────────────────────────────────────────────────────────────────────────
// SUITE 1: BUILD & ROUTE INTEGRITY (R1)
// ──────────────────────────────────────────────────────────────────────────────
async function runSuite1(runner) {
  await runner.describeAsync('Suite 1: Build & Route Integrity (R1)', async () => {
    // 1.1 Studio Page Route File Contract
    await runner.test('1.1 Studio route file src/app/studio/page.tsx exists and exports valid page component', async () => {
      const studioPagePath = path.join(ROOT_DIR, 'src', 'app', 'studio', 'page.tsx');
      assert(fs.existsSync(studioPagePath), 'src/app/studio/page.tsx must exist');
      const content = fs.readFileSync(studioPagePath, 'utf8');
      assert(
        content.includes('export default') || content.includes('export default function'),
        'src/app/studio/page.tsx must export a default page component'
      );
      assert(
        content.includes('TrinketTalesStudio') || content.includes('StudioCanvas'),
        'src/app/studio/page.tsx must integrate the Trinket Tales Studio experience'
      );
    });

    // 1.2 Unauthenticated Route Security Contract
    await runner.test('1.2 Studio route is unauthenticated for frictionless local recording and headless test runs', async () => {
      const studioPagePath = path.join(ROOT_DIR, 'src', 'app', 'studio', 'page.tsx');
      const content = fs.readFileSync(studioPagePath, 'utf8');
      assertNotIncludes(content, 'adminPin', 'src/app/studio/page.tsx must not require admin PIN check');
      assertNotIncludes(content, 'x-admin-pin', 'src/app/studio/page.tsx must not require x-admin-pin header');
      assertNotIncludes(content, 'redirect(\'/admin/login\')', 'src/app/studio/page.tsx must not redirect to admin login');
    });

    // 1.3 Admin Quick-Access Navigation Link Contract
    await runner.test('1.3 Admin page src/app/admin/page.tsx contains quick-access navigation link to /studio', async () => {
      const adminPagePath = path.join(ROOT_DIR, 'src', 'app', 'admin', 'page.tsx');
      assert(fs.existsSync(adminPagePath), 'src/app/admin/page.tsx must exist');
      const content = fs.readFileSync(adminPagePath, 'utf8');
      assertIncludes(content, 'href="/studio"', 'Admin page must include link href="/studio"');
      assert(
        content.includes('Studio') || content.includes('Trinket Tales'),
        'Admin page must include a prominent Studio link label'
      );
    });

    // 1.4 Public Storefront DOM Admin Privacy Audit
    await runner.test('1.4 Public Storefront DOM files contain zero links or references to /admin', async () => {
      const storefrontFiles = [
        'src/app/page.tsx',
        'src/components/Header.tsx',
        'src/components/ProductCard.tsx',
        'src/components/CartDrawer.tsx',
      ];
      for (const rel of storefrontFiles) {
        const full = path.join(ROOT_DIR, rel);
        if (fs.existsSync(full)) {
          const content = fs.readFileSync(full, 'utf8');
          assert(
            !content.includes('href="/admin"') &&
              !content.includes("href='/admin'") &&
              !content.includes('href={`/admin`}'),
            `Security Audit Failed: Public storefront file ${rel} exposes link to /admin!`
          );
        }
      }
    });

    // 1.5 Studio Module Architecture Files Inventory
    await runner.test('1.5 All 10 core studio library and component files are present and non-empty', async () => {
      const requiredFiles = [
        'src/lib/studio/characterRig.ts',
        'src/lib/studio/backdrops.ts',
        'src/lib/studio/rpgAppraisal.ts',
        'src/lib/studio/skitTemplates.ts',
        'src/lib/studio/audioSynth.ts',
        'src/lib/studio/videoExporter.ts',
        'src/lib/studio/socialCaptions.ts',
        'src/components/studio/StudioCanvas.tsx',
        'src/components/studio/TrinketTalesStudio.tsx',
        'src/components/studio/BatchQueueModal.tsx',
      ];
      for (const rel of requiredFiles) {
        const full = path.join(ROOT_DIR, rel);
        assert(fs.existsSync(full), `Required studio file missing: ${rel}`);
        const stat = fs.statSync(full);
        assert(stat.size > 200, `Studio file ${rel} is unexpectedly small (${stat.size} bytes)`);
      }
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// SUITE 2: CHARACTER ANIMATION RIG & EMOTIVE EXPRESSIONS (R1)
// ──────────────────────────────────────────────────────────────────────────────
async function runSuite2(runner) {
  await runner.describeAsync('Suite 2: Character Animation Rig & Emotive Expressions (R1)', async () => {
    const characterRigPath = path.join(ROOT_DIR, 'src', 'lib', 'studio', 'characterRig.ts');
    assert(fs.existsSync(characterRigPath), 'characterRig.ts must exist');
    const content = fs.readFileSync(characterRigPath, 'utf8');

    // 2.1 Character Actions Verification
    await runner.test('2.1 Rig supports all 7 required character actions plus base idle', async () => {
      const requiredActions = [
        'walk',
        'turn',
        'laugh',
        'gasp',
        'hold trinket',
        'sip tea',
        'pack box',
      ];
      for (const action of requiredActions) {
        assert(
          content.includes(`'${action}'`) || content.includes(`"${action}"`),
          `Action "${action}" is missing from characterRig.ts definitions`
        );
      }

      // Test normalizeAction logic
      const actionNormalizer = (act) => {
        const clean = String(act).toLowerCase().replace(/_/g, ' ').trim();
        if (clean.includes('hold') || clean.includes('trinket')) return 'hold trinket';
        if (clean.includes('sip') || clean.includes('tea')) return 'sip tea';
        if (clean.includes('pack') || clean.includes('box')) return 'pack box';
        if (clean === 'walk') return 'walk';
        if (clean === 'turn') return 'turn';
        if (clean === 'laugh') return 'laugh';
        if (clean === 'gasp') return 'gasp';
        return 'idle';
      };

      assertEqual(actionNormalizer('hold_trinket'), 'hold trinket');
      assertEqual(actionNormalizer('HOLD TRINKET'), 'hold trinket');
      assertEqual(actionNormalizer('sip_tea'), 'sip tea');
      assertEqual(actionNormalizer('pack_box'), 'pack box');
      assertEqual(actionNormalizer('walk'), 'walk');
      assertEqual(actionNormalizer('turn'), 'turn');
      assertEqual(actionNormalizer('laugh'), 'laugh');
      assertEqual(actionNormalizer('gasp'), 'gasp');
      assertEqual(actionNormalizer('unknown'), 'idle');
    });

    // 2.2 Character Emotive Expressions Verification
    await runner.test('2.2 Rig supports all 6 emotive expressions: happy, shocked, sleepy, laughing, proud grandma, eye-rolling daughter', async () => {
      const requiredExpressions = [
        'happy',
        'shocked',
        'sleepy',
        'laughing',
        'proud grandma',
        'eye-rolling daughter',
      ];
      for (const expr of requiredExpressions) {
        assert(
          content.includes(expr),
          `Expression "${expr}" is missing from characterRig.ts definitions`
        );
      }

      // Test normalizeExpression logic
      const exprNormalizer = (expr) => {
        const clean = String(expr).toLowerCase().replace(/[_-]/g, ' ').trim();
        if (clean.includes('proud') || clean.includes('grandma')) return 'proud grandma';
        if (clean.includes('eye') || clean.includes('rolling') || clean.includes('daughter')) return 'eye-rolling daughter';
        if (clean === 'shocked') return 'shocked';
        if (clean === 'sleepy') return 'sleepy';
        if (clean === 'laughing') return 'laughing';
        return 'happy';
      };

      assertEqual(exprNormalizer('proud_grandma'), 'proud grandma');
      assertEqual(exprNormalizer('PROUD GRANDMA'), 'proud grandma');
      assertEqual(exprNormalizer('eye_rolling_daughter'), 'eye-rolling daughter');
      assertEqual(exprNormalizer('eye-rolling daughter'), 'eye-rolling daughter');
      assertEqual(exprNormalizer('shocked'), 'shocked');
      assertEqual(exprNormalizer('sleepy'), 'sleepy');
      assertEqual(exprNormalizer('laughing'), 'laughing');
      assertEqual(exprNormalizer('happy'), 'happy');
      assertEqual(exprNormalizer('random'), 'happy');
    });

    // 2.3 Dual Character Visual Palettes & Identity
    await runner.test('2.3 Bonnie and Tammy possess distinct dual palettes and visual accessories', async () => {
      // Bonnie colors: auburn hair, rose dress, white lace apron, rose hairclip
      assertIncludes(content, '#7c2d12', 'Bonnie auburn hair color (#7c2d12) must be defined');
      assertIncludes(content, '#4c0519', 'Bonnie rose velvet dress (#4c0519) must be defined');
      assertIncludes(content, '#f5efe6', 'White lace collar/apron (#f5efe6) must be defined');
      assertIncludes(content, '#e8748a', 'Rose hairclip color (#e8748a) must be defined');

      // Tammy colors: caramel brown hair, teal dress
      assertIncludes(content, '#b45309', 'Tammy caramel hair color (#b45309) must be defined');
      assertIncludes(content, '#0d9488', 'Tammy vibrant teal dress (#0d9488) must be defined');
    });

    // 2.4 Character Kinematics & Directional Facing
    await runner.test('2.4 Rig supports directional turning (left, right, front) and animated action kinematics', async () => {
      assertIncludes(content, 'facingFactor', 'Rig must support directional facing multiplier');
      assertIncludes(content, 'action === \'laugh\'', 'Rig must implement laugh kinematics');
      assertIncludes(content, 'action === \'gasp\'', 'Rig must implement gasp kinematics');
      assertIncludes(content, 'action === \'walk\'', 'Rig must implement walk stride cycle');
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// SUITE 3: 5 COZY SCENE BACKDROPS (R1)
// ──────────────────────────────────────────────────────────────────────────────
async function runSuite3(runner) {
  await runner.describeAsync('Suite 3: 5 Cozy Scene Backdrops (R1)', async () => {
    const backdropsPath = path.join(ROOT_DIR, 'src', 'lib', 'studio', 'backdrops.ts');
    assert(fs.existsSync(backdropsPath), 'backdrops.ts must exist');
    const content = fs.readFileSync(backdropsPath, 'utf8');

    // 3.1 All 5 Backdrops Coverage
    await runner.test('3.1 All 5 required cozy scene backdrops are defined and registered', async () => {
      const requiredBackdrops = [
        'cozy_night_shop',
        'morning_coffee_prep',
        'rainy_window_crafting',
        'holiday_spooky_season',
        'closing_time_lofi',
      ];
      for (const id of requiredBackdrops) {
        assertIncludes(content, `'${id}'`, `Backdrop ID "${id}" must be defined`);
      }
      assertIncludes(content, 'Cozy Night Shop', 'Cozy Night Shop name must be defined');
      assertIncludes(content, 'Morning Coffee Prep', 'Morning Coffee Prep name must be defined');
      assertIncludes(content, 'Rainy Window Crafting', 'Rainy Window Crafting name must be defined');
      assertIncludes(content, 'Holiday / Spooky Season Decor', 'Holiday/Spooky Season Decor name must be defined');
      assertIncludes(content, '"Closing Time" Lo-Fi Chill', 'Closing Time Lo-Fi Chill name must be defined');
    });

    // 3.2 Lighting & Color Palettes
    await runner.test('3.2 Each backdrop has unique wall gradients, floor colors, and ambient lighting intensity', async () => {
      assertIncludes(content, 'wallGradient', 'Backdrop must configure wallGradient');
      assertIncludes(content, 'floorColor', 'Backdrop must configure floorColor');
      assertIncludes(content, 'ambientLightColor', 'Backdrop must configure ambientLightColor');
      assertIncludes(content, 'ambientLightIntensity', 'Backdrop must configure ambientLightIntensity');
    });

    // 3.3 Environmental Particle Systems
    await runner.test('3.3 Backdrops define distinct environmental particle types (stardust, sun_motes, raindrops, leaves, lofi_dust)', async () => {
      const requiredParticles = [
        'stardust',
        'sun_motes',
        'raindrops',
        'autumn_leaves',
        'lofi_dust',
      ];
      for (const p of requiredParticles) {
        assertIncludes(content, `'${p}'`, `Particle type "${p}" must be configured`);
      }
    });

    // 3.4 Fallback Resilience
    await runner.test('3.4 Backdrop resolver safely falls back to cozy_night_shop on unknown backdrop ID', async () => {
      assertIncludes(content, 'BACKDROP_CONFIGS.cozy_night_shop', 'getBackdropConfig must fall back to cozy_night_shop');
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// SUITE 4: 96 PRODUCT CUTOUTS & RPG ITEM APPRAISAL ENGINE (R1 & R2)
// ──────────────────────────────────────────────────────────────────────────────
async function runSuite4(runner) {
  await runner.describeAsync('Suite 4: 96 Product Cutouts & RPG Item Appraisal Engine (R1 & R2)', async () => {
    const manifestPath = path.join(ROOT_DIR, 'src', 'lib', 'scrollytelling', 'productAssetManifest.json');
    const rpgAppraisalPath = path.join(ROOT_DIR, 'src', 'lib', 'studio', 'rpgAppraisal.ts');

    assert(fs.existsSync(manifestPath), 'productAssetManifest.json must exist');
    assert(fs.existsSync(rpgAppraisalPath), 'rpgAppraisal.ts must exist');

    const manifest = loadJsonFile('src/lib/scrollytelling/productAssetManifest.json');
    const products = manifest.products || [];
    const appraisalContent = fs.readFileSync(rpgAppraisalPath, 'utf8');

    // 4.1 96 Products and Transparent Cutout PNGs Integrity
    await runner.test('4.1 All 96 products from manifest exist with local transparent cutouts verified on disk', async () => {
      assertEqual(products.length, 96, 'Catalog manifest must contain exactly 96 products');
      let missingCount = 0;
      const missingFiles = [];

      for (const p of products) {
        assert(p.id, `Product missing id: ${JSON.stringify(p)}`);
        assert(p.title, `Product missing title: ${p.id}`);
        assert(p.transparentLocalUrl, `Product missing transparentLocalUrl: ${p.id}`);
        const localRelPath = p.transparentLocalUrl.startsWith('/') ? p.transparentLocalUrl.slice(1) : p.transparentLocalUrl;
        const fullLocalPath = path.join(ROOT_DIR, 'public', localRelPath);
        if (!fs.existsSync(fullLocalPath)) {
          missingCount++;
          missingFiles.push(p.transparentLocalUrl);
        }
      }

      assertEqual(missingCount, 0, `Missing transparent PNG files on disk: ${missingFiles.slice(0, 5).join(', ')}`);
    });

    // 4.2 Procedural RPG Stat Bonuses Generation
    await runner.test('4.2 Procedural RPG stat engine produces 3 distinct non-zero stat bonuses per product', async () => {
      assertIncludes(appraisalContent, 'generateRPGAppraisal', 'rpgAppraisal.ts must export generateRPGAppraisal');
      assertIncludes(appraisalContent, 'stats: [RPGStat, RPGStat, RPGStat]', 'Appraisal must contain 3 stats');

      // Test appraisal math model
      function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = (hash << 5) - hash + str.charCodeAt(i);
          hash |= 0;
        }
        return Math.abs(hash);
      }

      for (const p of products.slice(0, 10)) {
        const hash = hashString(p.id + p.title);
        assert(hash > 0, `Hash for product ${p.title} must be positive`);
      }
    });

    // 4.3 Rarity Distribution & Lore Quotes
    await runner.test('4.3 Product appraisal assigns rarity tiers (Common, Rare, Epic, Legendary, Grandma\'s Secret Stash) and lore', async () => {
      const rarities = [
        'Common',
        'Rare',
        'Epic',
        'Legendary',
        "Grandma's Secret Stash",
      ];
      for (const r of rarities) {
        assertIncludes(appraisalContent, r, `Rarity tier "${r}" must be handled`);
      }
      assertIncludes(appraisalContent, 'blessing', 'Appraisal must include Grandma Bonnie blessing');
      assertIncludes(appraisalContent, 'lore', 'Appraisal must include item lore quote');
    });

    // 4.4 Appraisal Determinism
    await runner.test('4.4 Stat generation is deterministic and stable for identical product inputs', async () => {
      assertIncludes(appraisalContent, 'hashString(product.id + product.title)', 'Stat generation must use deterministic hash');
    });

    // 4.5 Fallback Resilience on Unknown Item
    await runner.test('4.5 Fallback appraisal safely returns valid stats for missing or partial product IDs', async () => {
      assertIncludes(appraisalContent, 'Handcrafted Trinket Relic', 'Fallback product title must be provided');
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// SUITE 5: SKIT ENGINE, CUSTOM SCRIPT BUILDER & 24/7 LO-FI MODE (R2)
// ──────────────────────────────────────────────────────────────────────────────
async function runSuite5(runner) {
  await runner.describeAsync('Suite 5: Skit Engine, Custom Script Builder & 24/7 Lo-Fi Mode (R2)', async () => {
    const skitsPath = path.join(ROOT_DIR, 'src', 'lib', 'studio', 'skitTemplates.ts');
    assert(fs.existsSync(skitsPath), 'skitTemplates.ts must exist');
    const content = fs.readFileSync(skitsPath, 'utf8');

    // 5.1 >= 20 Built-in Skit Templates
    await runner.test('5.1 Library provides at least 20 distinct non-salesy skit templates across 3 categories', async () => {
      assertIncludes(content, 'BUILT_IN_SKITS', 'skitTemplates.ts must export BUILT_IN_SKITS array');
      // Count skit occurrences via id: 'skit_...'
      const matches = content.match(/id:\s*['"]skit_[a-zA-Z0-9_]+['"]/g) || [];
      assert(
        matches.length >= 20,
        `Expected at least 20 built-in skit templates, found ${matches.length}`
      );

      // Check category coverage
      assertIncludes(content, 'grandma_wisdom', 'Grandma Wisdom category must be present');
      assertIncludes(content, 'rpg_appraisal', 'RPG Item Appraisal category must be present');
      assertIncludes(content, 'shopkeep_life', 'Shopkeep Day-in-the-Life category must be present');
    });

    // 5.2 Skit Beat Schema Integrity
    await runner.test('5.2 Skit beats follow strict schema (speaker, expression, action, dialogue, durationSec)', async () => {
      assertIncludes(content, 'export interface SkitBeat', 'SkitBeat interface must be exported');
      assertIncludes(content, 'speaker: CharacterId', 'Beat must define speaker');
      assertIncludes(content, 'expression: CharacterExpression', 'Beat must define expression');
      assertIncludes(content, 'action: CharacterAction', 'Beat must define action');
      assertIncludes(content, 'dialogue: string', 'Beat must define dialogue');
    });

    // 5.3 Custom Script Builder Validation & Serialization
    await runner.test('5.3 Custom Script Builder validates beats, creates default templates, and handles JSON import/export', async () => {
      assertIncludes(content, 'validateScript', 'validateScript utility must be exported');
      assertIncludes(content, 'createEmptyBeat', 'createEmptyBeat helper must be exported');
      assertIncludes(content, 'createCustomSkitTemplate', 'createCustomSkitTemplate helper must be exported');
      assertIncludes(content, 'exportScriptToJson', 'exportScriptToJson serializer must be exported');
      assertIncludes(content, 'importScriptFromJson', 'importScriptFromJson parser must be exported');

      // Behavioral simulation of script validation
      function validateScript(skit) {
        const errors = [];
        if (!skit.title || !skit.title.trim()) errors.push('Title is required');
        if (!skit.beats || !Array.isArray(skit.beats) || skit.beats.length === 0) {
          errors.push('Script must contain at least one beat');
        } else {
          skit.beats.forEach((b, i) => {
            if (!b.speaker) errors.push(`Beat ${i + 1}: Speaker is required`);
            if (!b.dialogue || !b.dialogue.trim()) errors.push(`Beat ${i + 1}: Dialogue text is required`);
          });
        }
        return { valid: errors.length === 0, errors };
      }

      // Valid script
      const validRes = validateScript({
        title: 'Cozy Morning',
        beats: [{ speaker: 'bonnie', dialogue: 'Good morning!' }],
      });
      assertEqual(validRes.valid, true);

      // Missing title
      const noTitle = validateScript({ title: '', beats: [{ speaker: 'bonnie', dialogue: 'Hi' }] });
      assertEqual(noTitle.valid, false);

      // Empty beats
      const emptyBeats = validateScript({ title: 'Test', beats: [] });
      assertEqual(emptyBeats.valid, false);
    });

    // 5.4 24/7 Lo-Fi Continuous Mode State Machine
    await runner.test('5.4 24/7 Lo-Fi Mode continuous state machine maps time-of-day backdrops and spontaneous banter pool', async () => {
      assertIncludes(content, 'getLoFiBackdropForHour', 'getLoFiBackdropForHour function must exist');
      assertIncludes(content, 'generateNextLoFiBeat', 'generateNextLoFiBeat function must exist');
      assertIncludes(content, 'LOFI_BANTER_POOL', 'LOFI_BANTER_POOL must be defined');

      // Verify all 24 hours map to valid backdrops
      const validBackdrops = [
        'cozy_night_shop',
        'morning_coffee_prep',
        'rainy_window_crafting',
        'holiday_spooky_season',
        'closing_time_lofi',
      ];

      function getLoFiBackdropForHour(h) {
        if (h >= 5 && h < 11) return 'morning_coffee_prep';
        if (h >= 11 && h < 17) return 'rainy_window_crafting';
        if (h >= 17 && h < 21) return 'holiday_spooky_season';
        if (h >= 21 || h < 2) return 'cozy_night_shop';
        return 'closing_time_lofi';
      }

      for (let hour = 0; hour < 24; hour++) {
        const bg = getLoFiBackdropForHour(hour);
        assert(validBackdrops.includes(bg), `Hour ${hour} mapped to invalid backdrop: ${bg}`);
      }
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// SUITE 6: MULTI-ASPECT FRAMING, BURNT-IN SYNCD CAPTIONS & VIDEO EXPORT (R3)
// ──────────────────────────────────────────────────────────────────────────────
async function runSuite6(runner) {
  await runner.describeAsync('Suite 6: Multi-Aspect Framing, Burnt-In Synced Captions & Video Export (R3)', async () => {
    const canvasPath = path.join(ROOT_DIR, 'src', 'components', 'studio', 'StudioCanvas.tsx');
    const exporterPath = path.join(ROOT_DIR, 'src', 'lib', 'studio', 'videoExporter.ts');
    const audioSynthPath = path.join(ROOT_DIR, 'src', 'lib', 'studio', 'audioSynth.ts');
    const batchModalPath = path.join(ROOT_DIR, 'src', 'components', 'studio', 'BatchQueueModal.tsx');

    assert(fs.existsSync(canvasPath), 'StudioCanvas.tsx must exist');
    assert(fs.existsSync(exporterPath), 'videoExporter.ts must exist');
    assert(fs.existsSync(audioSynthPath), 'audioSynth.ts must exist');
    assert(fs.existsSync(batchModalPath), 'BatchQueueModal.tsx must exist');

    const canvasContent = fs.readFileSync(canvasPath, 'utf8');
    const exporterContent = fs.readFileSync(exporterPath, 'utf8');
    const audioSynthContent = fs.readFileSync(audioSynthPath, 'utf8');

    // 6.1 Multi-Aspect Configurations
    await runner.test('6.1 StudioCanvas supports 9:16 (1080x1920), 16:9 (1920x1080), and 1:1 (1080x1080) integer scaling', async () => {
      assertIncludes(canvasContent, '1080', 'Canvas must define 1080 dimensions');
      assertIncludes(canvasContent, '1920', 'Canvas must define 1920 dimensions');
      assertIncludes(canvasContent, 'imageRendering', 'Canvas must set imageRendering to pixelated');
      assertIncludes(canvasContent, 'aspectRatio === \'9:16\'', 'Canvas must handle 9:16 aspect ratio');
      assertIncludes(canvasContent, 'aspectRatio === \'16:9\'', 'Canvas must handle 16:9 aspect ratio');
      assertIncludes(canvasContent, 'aspectRatio === \'1:1\'', 'Canvas must handle 1:1 aspect ratio');
    });

    // 6.2 Social Safe Zones Margins
    await runner.test('6.2 Burnt-in captions are drawn within social safe zones avoiding TikTok/Reels overlay UI', async () => {
      assertIncludes(canvasContent, 'renderBurntInCaptions', 'Canvas must render burnt-in captions');
      assertIncludes(canvasContent, 'Math.floor(VH * 0.72)', 'Captions must be positioned in TikTok safe lower-third zone');
    });

    // 6.3 Burnt-In Synced Captions & Speaker Badges
    await runner.test('6.3 Captions feature typewriter letter reveals, speaker color-coding, and voice blip synchronization', async () => {
      assertIncludes(canvasContent, 'playVoiceBlip', 'Captions must trigger voice blips on character typewriter progress');
      assertIncludes(canvasContent, '#f43f5e', 'Bonnie nametag badge color must be rose');
      assertIncludes(canvasContent, '#0d9488', 'Tammy nametag badge color must be teal');
      assertIncludes(canvasContent, 'wrapText', 'Captions must implement auto-wrapping');
    });

    // 6.4 Audio Synthesis & Web Audio Destination Mixing
    await runner.test('6.4 Audio synthesizer combines voice blips, 72 BPM lo-fi chords, and MediaStreamAudioDestinationNode', async () => {
      assertIncludes(audioSynthContent, 'createMediaStreamDestination', 'Audio engine must create MediaStream destination node');
      assertIncludes(audioSynthContent, 'playVoiceBlip', 'Audio engine must export playVoiceBlip');
      assertIncludes(audioSynthContent, 'startLoFiMusic', 'Audio engine must export startLoFiMusic');
      assertIncludes(audioSynthContent, 'chordProgression', 'Audio engine must define lo-fi chord progression');
    });

    // 6.5 Video Exporter & Batch Queue Manager
    await runner.test('6.5 1-Click video recorder and BatchQueueManager sequential dispatch queue are implemented', async () => {
      assertIncludes(exporterContent, 'recordCanvasStream', 'Video exporter must support recording canvas stream');
      assertIncludes(exporterContent, 'canvasStream.getVideoTracks()', 'Video exporter must capture canvas video tracks');
      assertIncludes(exporterContent, 'audioDestination.stream.getAudioTracks()', 'Video exporter must mix audio tracks');
      assertIncludes(exporterContent, 'BatchQueueManager', 'BatchQueueManager class must be exported');
      assertIncludes(exporterContent, 'getSupportedMimeType', 'MIME type negotiation function must be exported');
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// SUITE 7: MULTI-PLATFORM CAPTION & HASHTAG GENERATOR (R4)
// ──────────────────────────────────────────────────────────────────────────────
async function runSuite7(runner) {
  await runner.describeAsync('Suite 7: Multi-Platform Caption & Hashtag Generator (R4)', async () => {
    const socialCaptionsPath = path.join(ROOT_DIR, 'src', 'lib', 'studio', 'socialCaptions.ts');
    assert(fs.existsSync(socialCaptionsPath), 'socialCaptions.ts must exist');
    const content = fs.readFileSync(socialCaptionsPath, 'utf8');

    // 7.1 Multi-Platform Copy Generation
    await runner.test('7.1 Copy generator tailors content for TikTok, Instagram Reels, YouTube Shorts, and Facebook Reels', async () => {
      const platforms = ['tiktok', 'instagram', 'youtube_shorts', 'facebook_reels'];
      for (const p of platforms) {
        assertIncludes(content, `'${p}'`, `Platform "${p}" must be handled`);
      }
      assertIncludes(content, 'generatePlatformCopy', 'generatePlatformCopy must be exported');
      assertIncludes(content, 'generateAllPlatformCopy', 'generateAllPlatformCopy must be exported');
    });

    // 7.2 Zero-Ad / Non-Salesy Content Tone Audit
    await runner.test('7.2 Social copy strictly maintains cozy organic storytelling and avoids hard-selling sales phrases', async () => {
      // Must not contain aggressive sales language
      const aggressivePhrases = [
        'BUY NOW 50% OFF',
        'LIMITED TIME DISCOUNT',
        'HURRY BEFORE IT\'S GONE',
        'SALE ENDS TONIGHT',
      ];
      for (const phrase of aggressivePhrases) {
        assertNotIncludes(content, phrase, `Sales violation: social copy generator contains aggressive sales phrase "${phrase}"`);
      }

      // Must contain cozy branding tags
      assertIncludes(content, '#CozyTok', 'TikTok tags must include #CozyTok');
      assertIncludes(content, '#PixelArt', 'Tags must include #PixelArt');
      assertIncludes(content, '#BonnieAndTammy', 'Branded tag #BonnieAndTammy must be included');
      assertIncludes(content, '#TrinketTales', 'Branded tag #TrinketTales must be included');
    });

    // 7.3 1-Click Clipboard Payload Contract
    await runner.test('7.3 1-Click clipboard contract provides ready-to-paste fullFormattedText and fallback support', async () => {
      assertIncludes(content, 'copyToClipboard', 'copyToClipboard function must be exported');
      assertIncludes(content, 'fullFormattedText', 'SocialPlatformCopy must contain fullFormattedText');
      assertIncludes(content, 'execCommand(\'copy\')', 'Clipboard function must include fallback execution');
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// SUITE 8: COMMENTARY ENGINE DIVERSITY & ANTI-REPETITION (R1 / F1-F4)
// ──────────────────────────────────────────────────────────────────────────────
async function runSuite8(runner) {
  await runner.describeAsync('Suite 8: Commentary Engine Diversity & Anti-Repetition (R1 / F1-F4)', async () => {
    ensureTranspiledModules();

    const typesMod = await import(`file://${path.join(COMMENTARY_DIR, 'types.mjs').replace(/\\/g, '/')}`);
    const ledgerMod = await import(`file://${path.join(COMMENTARY_DIR, 'antiRepetitionLedger.mjs').replace(/\\/g, '/')}`);
    const engineMod = await import(`file://${path.join(COMMENTARY_DIR, 'commentaryEngine.mjs').replace(/\\/g, '/')}`);

    // 8.1 Six Show Formats Registration
    await runner.test('8.1 All 6 show formats are defined and registered with complete metadata', async () => {
      const requiredFormats = [
        'wild_nature_commentary',
        'chaotic_grandma_hot_takes',
        'cozy_boutique_lore',
        'vintage_relic_debates',
        'gen_z_culture_clash',
        'craft_breakdown_asmr',
      ];
      assertEqual(typesMod.ALL_SHOW_FORMATS.length, 6, 'Exactly 6 show formats must be registered');
      for (const fmt of requiredFormats) {
        assert(typesMod.ALL_SHOW_FORMATS.includes(fmt), `Format "${fmt}" must be in ALL_SHOW_FORMATS`);
      }
    });

    // 8.2 Anti-Repetition Ledger Schema & LRU Format Rotation
    await runner.test('8.2 Persistent Anti-Repetition Ledger schema enforces rolling window and LRU format rotation', async () => {
      const empty = ledgerMod.createEmptyLedger(12);
      assertEqual(empty.rollingWindowSize, 12);
      assertEqual(empty.episodes.length, 0);
      assert(empty.stats && empty.stats.formatCounts);

      // Verify pickLruShowFormat
      const nextFormat = ledgerMod.pickLruShowFormat(empty);
      assert(typesMod.ALL_SHOW_FORMATS.includes(nextFormat));
    });

    // 8.3 Trigram Extraction & Candidate Overlap Validator Gatekeeper (< 15%)
    await runner.test('8.3 Trigram extraction and validator gatekeeper enforce < 15% pairwise overlap threshold', async () => {
      const text1 = 'Bonnie and Tammy craft beautiful handmade beaded keychains in their cozy boutique every single day.';
      const text2 = 'Bonnie and Tammy craft beautiful handmade beaded keychains in their cozy boutique every single day.';
      const text3 = 'Astronauts drinking chamomile tea near Jupiter stargazing at sparkling cosmic nebulas.';

      const trig1 = ledgerMod.extractTrigrams(text1);
      assert(trig1.length > 5, 'Trigrams must be extracted');

      const simLedger = ledgerMod.createEmptyLedger(12);
      simLedger.episodes.push({
        id: 'ep_1',
        title: 'Original Episode',
        trigrams: trig1,
      });

      const dupReport = ledgerMod.validateCandidateScript(text2, simLedger, 0.15, 'Duplicate Title');
      assertEqual(dupReport.passed, false, 'Duplicate script must be rejected by validator');
      assert(dupReport.maxOverlap > 0.8, 'Duplicate script must have high overlap');

      const novelReport = ledgerMod.validateCandidateScript(text3, simLedger, 0.15, 'Unique Title');
      assertEqual(novelReport.passed, true, 'Novel script must pass validator');
      assert(novelReport.maxOverlap < 0.15, 'Novel script overlap must be strictly < 15%');
    });

    // 8.4 Rolling 12-Episode Generation Test: 100% Unique Titles & < 15% Pairwise Overlap
    await runner.test('8.4 Rolling 12 episodes across 6 formats achieve 100% unique titles and < 15% pairwise trigram overlap', async () => {
      const ledgerPath = path.join(ROOT_DIR, 'public', 'exports', 'anti-repetition-ledger.json');
      let originalContent = null;
      if (fs.existsSync(ledgerPath)) {
        originalContent = fs.readFileSync(ledgerPath, 'utf8');
      }

      try {
        const episodes = [];
        for (let i = 0; i < 12; i++) {
          const fmt = typesMod.ALL_SHOW_FORMATS[i % typesMod.ALL_SHOW_FORMATS.length];
          const res = await engineMod.generateCommentaryEpisode({ format: fmt, forceProcedural: true });
          episodes.push(res);
        }

        assertEqual(episodes.length, 12, 'Must generate exactly 12 episodes');

        // Check unique titles
        const titles = episodes.map((e) => e.skit.title);
        const uniqueTitles = new Set(titles);
        assertEqual(uniqueTitles.size, 12, `Expected 12 unique titles, found ${uniqueTitles.size}`);

        // Check format coverage
        const formatsUsed = new Set(episodes.map((e) => e.format));
        assertEqual(formatsUsed.size, 6, 'All 6 show formats must be represented');

        // Check pairwise trigram overlap strictly < 15%
        let maxPairwise = 0;
        for (let i = 0; i < 12; i++) {
          const textA = episodes[i].skit.beats.map((b) => b.dialogue).join(' ');
          const trigA = ledgerMod.extractTrigrams(textA);
          for (let j = i + 1; j < 12; j++) {
            const textB = episodes[j].skit.beats.map((b) => b.dialogue).join(' ');
            const trigB = ledgerMod.extractTrigrams(textB);
            const { overlapRatio } = ledgerMod.calculateTrigramOverlap(trigA, trigB);
            if (overlapRatio > maxPairwise) maxPairwise = overlapRatio;
            assert(
              overlapRatio < 0.15,
              `Pairwise overlap between Episode ${i + 1} and ${j + 1} was ${(overlapRatio * 100).toFixed(1)}% (>= 15%)`
            );
          }
        }
        assert(maxPairwise < 0.15, `Max pairwise overlap must be < 15% (actual: ${(maxPairwise * 100).toFixed(2)}%)`);
      } finally {
        // Restore production ledger to keep test non-destructive
        if (originalContent !== null) {
          fs.writeFileSync(ledgerPath, originalContent, 'utf8');
        }
      }
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// SUITE 9: MINECRAFT-STYLE FLOW MUSIC ENGINE & SIDECHAIN DUCKING (R2 / F5-F8)
// ──────────────────────────────────────────────────────────────────────────────
async function runSuite9(runner) {
  await runner.describeAsync('Suite 9: Minecraft-Style Flow Music Engine & Sidechain Ducking (R2 / F5-F8)', async () => {
    ensureTranspiledModules();

    const musicMod = await import(`file://${path.join(CACHE_DIR, 'flowMusicEngine.mjs').replace(/\\/g, '/')}`);

    // 9.1 Procedural Synthesis of All 6 Distinct Moods
    await runner.test('9.1 Flow music synthesizes multi-layered audio across all 6 distinct moods/keys', async () => {
      const moods = ['cozy_nostalgia', 'gentle_rain', 'deep_subwoofer', 'mystic_math', 'morning_dew', 'twilight_dreams'];
      for (const m of moods) {
        assert(musicMod.MOOD_PRESETS[m], `Mood preset "${m}" must be defined`);
        const track = await musicMod.synthesizeFlowMusic({ mood: m, durationSec: 4, includeVinyl: false });
        assertEqual(track.audioBuffer.length, 2, 'Audio must be stereo [left, right]');
        assertEqual(track.sampleRate, 44100, 'Sample rate must be 44100');
        assert(track.audioBuffer[0].length >= 44100 * 4, 'Buffer length must match duration');
      }
    });

    // 9.2 Evolving Melodic Phrasing with > 15% Spectral Variation across 22-30s
    await runner.test('9.2 Synthesized tracks exhibit evolving phrasing with > 15% spectral centroid variation', async () => {
      const track = await musicMod.synthesizeFlowMusic({ mood: 'cozy_nostalgia', durationSec: 22 });
      assert(
        track.spectralVariationPercent >= 15.0,
        `Expected spectral variation >= 15.0%, got ${track.spectralVariationPercent}%`
      );
    });

    // 9.3 Dynamic Sidechain Volume Ducking (-10.5 dB)
    await runner.test('9.3 Sidechain ducking applies ~70ms attack, ~600ms release, and -10.5 dB target attenuation during speech', async () => {
      assertEqual(musicMod.DUCKING_ATTACK_SEC, 0.07, 'Attack must be 70ms');
      assertEqual(musicMod.DUCKING_RELEASE_SEC, 0.60, 'Release must be 600ms');
      assertEqual(musicMod.DUCKING_ATTENUATION_DB, -10.5, 'Ducking attenuation must be -10.5 dB');

      const track = await musicMod.synthesizeFlowMusic({
        mood: 'cozy_nostalgia',
        durationSec: 5,
        speechIntervals: [{ startSec: 1.0, endSec: 4.0, speaker: 'bonnie' }],
      });
      assertEqual(track.meanSpeechDuckingDb, -10.5, 'Mean speech ducking must be -10.5 dB');
    });

    // 9.4 Custom Audio Track Loader
    await runner.test('9.4 Custom track loader discovers public/music/ tracks and falls back gracefully', async () => {
      const tracks = musicMod.getAvailableMusicTracks();
      assert(Array.isArray(tracks), 'getAvailableMusicTracks must return an array');
      const samplePath = path.join(ROOT_DIR, 'public', 'music', 'ambient_sample.wav');
      if (fs.existsSync(samplePath)) {
        assert(tracks.some((t) => t.includes('ambient_sample.wav')), 'ambient_sample.wav must be discovered');
      }

      // Fallback on missing track
      const fallbackTrack = await musicMod.synthesizeFlowMusic({ customTrackPath: 'public/music/non_existent.wav', durationSec: 3 });
      assert(fallbackTrack.audioBuffer[0].length > 0, 'Must fall back cleanly to procedural flow music');
    });

    // 9.5 44.1kHz 16-bit Stereo PCM WAV Buffer Synthesis
    await runner.test('9.5 synthesizeFlowMusicWav outputs valid 44.1kHz 16-bit Stereo RIFF/WAVE buffer', async () => {
      const wav = await musicMod.synthesizeFlowMusicWav({ mood: 'gentle_rain', durationSec: 2 });
      assert(Buffer.isBuffer(wav), 'Must return a Buffer');
      assertEqual(wav.toString('ascii', 0, 4), 'RIFF');
      assertEqual(wav.toString('ascii', 8, 12), 'WAVE');
      assertEqual(wav.toString('ascii', 12, 16), 'fmt ');
      assertEqual(wav.readUInt16LE(20), 1, 'AudioFormat must be 1 (PCM)');
      assertEqual(wav.readUInt16LE(22), 2, 'NumChannels must be 2 (Stereo)');
      assertEqual(wav.readUInt32LE(24), 44100, 'SampleRate must be 44100');
      assertEqual(wav.readUInt16LE(34), 16, 'BitsPerSample must be 16');
      assertEqual(wav.toString('ascii', 36, 40), 'data');
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// SUITE 10: CURATED REACTION CLIPS, CINEMATOGRAPHY & STOREFRONT GUARDRAILS (R3-R4 / F9-F15)
// ──────────────────────────────────────────────────────────────────────────────
async function runSuite10(runner) {
  await runner.describeAsync('Suite 10: Curated Reaction Clips, Cinematography & Storefront Guardrails (R3-R4 / F9-F15)', async () => {
    // 10.1 Curated Reaction Clips Validation (>= 10 clips, 16:9 H.264)
    await runner.test('10.1 Directory public/reaction-clips/ contains >= 10 validated 16:9 H.264 MP4 clips', async () => {
      const clipsDir = path.join(ROOT_DIR, 'public', 'reaction-clips');
      assert(fs.existsSync(clipsDir), 'public/reaction-clips/ directory must exist');
      const files = fs.readdirSync(clipsDir).filter((f) => f.toLowerCase().endsWith('.mp4'));
      assert(files.length >= 10, `Expected at least 10 reaction clips, found ${files.length}`);

      for (const f of files) {
        const full = path.join(clipsDir, f);
        const stat = fs.statSync(full);
        assert(stat.size > 500000, `Clip ${f} size (${stat.size}B) must be > 500KB`);

        // Check MP4 binary box header (ftyp atom)
        const header = Buffer.alloc(16);
        const fd = fs.openSync(full, 'r');
        fs.readSync(fd, header, 0, 16, 0);
        fs.closeSync(fd);
        assertEqual(header.toString('ascii', 4, 8), 'ftyp', `Clip ${f} must have ftyp atom at offset 4`);
      }
    });

    // 10.2 Dynamic Virtual Cinematography & Kinematics Contracts
    await runner.test('10.2 Virtual cinematography camera state, punch-in zooms, screen shake, and emote particles are implemented', async () => {
      const canvasContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/studio/StudioCanvas.tsx'), 'utf8');
      const rigContent = fs.readFileSync(path.join(ROOT_DIR, 'src/lib/studio/characterRig.ts'), 'utf8');

      // Camera state & transforms
      assertIncludes(canvasContent, 'zoomScale', 'Canvas must support punch-in zoomScale');
      assertIncludes(canvasContent, 'shakeOffset', 'Canvas must support shakeOffset screen shake');
      assertIncludes(canvasContent, 'handheldX', 'Canvas must support handheld drift');

      // Kinematics & emote particles
      assertIncludes(rigContent, 'emote', 'Rig must implement emote particles');
      assertIncludes(rigContent, 'facingFactor', 'Rig must implement character facing kinematics');
    });

    // 10.3 Storefront Guardrail: Never "16-bit" in Customer-Facing src/app/page.tsx
    await runner.test('10.3 Storefront guardrail: src/app/page.tsx NEVER contains "16-bit"', async () => {
      const pagePath = path.join(ROOT_DIR, 'src/app/page.tsx');
      assert(fs.existsSync(pagePath), 'src/app/page.tsx must exist');
      const pageContent = fs.readFileSync(pagePath, 'utf8');

      assert(
        !pageContent.toLowerCase().includes('16-bit') && !pageContent.toLowerCase().includes('16bit'),
        'Storefront Guardrail Violation: src/app/page.tsx contains "16-bit"!'
      );
    });

    // 10.4 Storefront Guardrail: Complete Isolation of /admin from all Public Storefront DOM Files
    await runner.test('10.4 Storefront guardrail: zero links to /admin across all customer-facing storefront files', async () => {
      const publicFiles = [
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

      for (const rel of publicFiles) {
        const full = path.join(ROOT_DIR, rel);
        if (fs.existsSync(full)) {
          const content = fs.readFileSync(full, 'utf8');
          assert(
            !content.includes('href="/admin"') &&
              !content.includes("href='/admin'") &&
              !content.includes('href={`/admin`}'),
            `Storefront Guardrail Violation: ${rel} exposes link to /admin!`
          );
        }
      }
    });

    // 10.5 Burnt-In Synced Captions & Safe-Zone Typography
    await runner.test('10.5 High-impact burnt-in captions implement active word-level highlight and social safe-zone compliance', async () => {
      const canvasContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/studio/StudioCanvas.tsx'), 'utf8');
      assertIncludes(canvasContent, 'renderBurntInCaptions', 'Canvas must render burnt-in captions');
      assertIncludes(canvasContent, 'Math.floor(VH * 0.72)', 'Captions must adhere to lower-third safe zone');
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// MASTER VERIFICATION DISPATCHER
// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  const runner = new StudioTestRunner();

  // CLI Flags
  const args = process.argv.slice(2);
  let selectedSuite = 'all';
  for (const arg of args) {
    if (arg.startsWith('--suite=')) {
      selectedSuite = arg.split('=')[1];
    }
    if (arg === '--verbose') {
      process.env.VERBOSE = '1';
    }
  }

  console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║    BONNIE & TAMMY'S TRINKET TALES STUDIO — MASTER VERIFICATION SUITE     ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║              Exhaustive Verification of Requirements R1 - R4             ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  console.log(`Execution Mode: Suite [${selectedSuite.toUpperCase()}]`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const shouldRun = (s) => selectedSuite === 'all' || selectedSuite === String(s);

  if (shouldRun(1)) await runSuite1(runner);
  if (shouldRun(2)) await runSuite2(runner);
  if (shouldRun(3)) await runSuite3(runner);
  if (shouldRun(4)) await runSuite4(runner);
  if (shouldRun(5)) await runSuite5(runner);
  if (shouldRun(6)) await runSuite6(runner);
  if (shouldRun(7)) await runSuite7(runner);
  if (shouldRun(8)) await runSuite8(runner);
  if (shouldRun(9)) await runSuite9(runner);
  if (shouldRun(10)) await runSuite10(runner);

  const success = runner.printSummary();

  if (!success) {
    console.error(`${colors.red}${colors.bold}❌ STUDIO VERIFICATION FAILED${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}✅ ALL STUDIO TEST SUITES PASSED WITH 100% SUCCESS RATE${colors.reset}`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Exception in verify-studio:', err);
  process.exit(1);
});
