#!/usr/bin/env node
/**
 * scripts/compile-episodes.mjs
 * Production 30fps Episode Compiler for "Bonnie & Tammy's Trinket Tales Studio"
 *
 * Compiles multiple 9:16 (1080x1920) vertical episodes into ready-to-post .mp4 files
 * with true 30fps capture, Minecraft-style flow music soundtrack (-10.5 dB sidechain ducking),
 * StudioCanvas virtual cinematography, active gold karaoke captions,
 * and generates a multi-platform caption & hashtag pack in public/exports/episode-pack-captions.md.
 *
 * Usage:
 *   node scripts/compile-episodes.mjs                       # Compiles default 3-episode starter pack
 *   node scripts/compile-episodes.mjs --category=fourth_wall # Compiles all 4th-Wall Break episodes
 *   node scripts/compile-episodes.mjs --count=5             # Compiles first 5 episodes
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { compileSkitStandalone } from './generate-ai-episode.mjs';

const ROOT_DIR = process.cwd();
const EXPORT_DIR = path.join(ROOT_DIR, 'public', 'exports');
const VIDEOS_DIR = path.join(ROOT_DIR, 'public', 'exports', 'videos');
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache', 'episode_compiler');

fs.mkdirSync(EXPORT_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

function transpileModule(srcRel, outName, transform = null) {
  let code = fs.readFileSync(path.join(ROOT_DIR, srcRel), 'utf8');
  if (transform) code = transform(code);
  const out = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fullOut = path.join(CACHE_DIR, outName);
  fs.writeFileSync(fullOut, out, 'utf8');
  return fullOut;
}

transpileModule('src/lib/studio/skitTemplates.ts', 'skitTemplates.mjs');
transpileModule('src/lib/studio/rpgAppraisal.ts', 'rpgAppraisal.mjs', (code) => {
  const manifestPath = path.join(ROOT_DIR, 'src/lib/scrollytelling/productAssetManifest.json').replace(/\\/g, '/');
  return code.replace(
    /import manifest from ['"][^'"]+['"];/,
    `import fs from 'node:fs'; const manifest = JSON.parse(fs.readFileSync('${manifestPath}', 'utf8'));`
  );
});
transpileModule('src/lib/studio/socialCaptions.ts', 'socialCaptions.mjs');

const { BUILT_IN_SKITS } = await import(`file://${path.join(CACHE_DIR, 'skitTemplates.mjs').replace(/\\/g, '/')}`);
const { generateRPGAppraisal } = await import(`file://${path.join(CACHE_DIR, 'rpgAppraisal.mjs').replace(/\\/g, '/')}`);
const { generateAllPlatformCopy } = await import(`file://${path.join(CACHE_DIR, 'socialCaptions.mjs').replace(/\\/g, '/')}`);

async function main() {
  const args = process.argv.slice(2);
  const categoryArg = args.find((a) => a.startsWith('--category='))?.split('=')[1];
  const countArg = parseInt(args.find((a) => a.startsWith('--count='))?.split('=')[1] || '0', 10);

  let selectedSkits = [...BUILT_IN_SKITS];
  if (categoryArg) {
    selectedSkits = selectedSkits.filter((s) => s.category === categoryArg);
  } else if (!countArg) {
    // Default starter pack: 1 4th-wall, 1 chaotic grandma, 1 rpg appraisal
    const s1 = BUILT_IN_SKITS.find((s) => s.category === 'fourth_wall_comedy') || BUILT_IN_SKITS[0];
    const s2 = BUILT_IN_SKITS.find((s) => s.category === 'grandma_lore' && s.id !== s1.id) || BUILT_IN_SKITS[1];
    const s3 = BUILT_IN_SKITS.find((s) => s.category === 'product_spotlight' && s.id !== s1.id && s.id !== s2.id) || BUILT_IN_SKITS[2];
    selectedSkits = [s1, s2, s3];
  }

  if (countArg > 0) {
    selectedSkits = selectedSkits.slice(0, countArg);
  }

  console.log(`\n╔════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║   🎬 BONNIE & TAMMY'S TRINKET TALES — PRODUCTION 30FPS EPISODE COMPILER   ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════════════╝`);
  console.log(`  Selected ${selectedSkits.length} skits to compile at true 30fps (1080x1920) + Flow Music:\n`);

  const compiledOutputs = [];

  for (let sIdx = 0; sIdx < selectedSkits.length; sIdx++) {
    const skit = selectedSkits[sIdx];
    console.log(`  [${sIdx + 1}/${selectedSkits.length}] Compiling "${skit.title}" (${skit.category})...`);

    const outMp4Path = await compileSkitStandalone(skit);
    const outFilename = path.basename(outMp4Path);
    const stat = fs.statSync(outMp4Path);
    const appraisal = skit.defaultPropId ? generateRPGAppraisal(skit.defaultPropId) : undefined;
    const socialCopy = generateAllPlatformCopy(skit, appraisal);

    compiledOutputs.push({
      skit,
      filename: outFilename,
      fullPath: outMp4Path,
      sizeKb: Math.round(stat.size / 1024),
      socialCopy,
    });
    console.log(`      ✔ Exported public/exports/videos/${outFilename} & public/exports/${outFilename} (${Math.round(stat.size / 1024)} KB, 30fps 1080x1920 + Stereo AAC)`);
  }

  // Write Multi-Platform Social Copy & Hashtag Pack Markdown
  const mdLines = [
    `# Bonnie & Tammy's Trinket Tales — Compiled Episode Pack (${compiledOutputs.length} Videos)`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
  ];

  for (const item of compiledOutputs) {
    mdLines.push(`## 🎬 ${item.skit.title} (\`${item.filename}\` — ${item.sizeKb} KB)`);
    mdLines.push(`- **Category**: \`${item.skit.category}\``);
    mdLines.push(`- **Video File**: \`public/exports/videos/${item.filename}\``);
    mdLines.push(``);
    for (const p of ['tiktok', 'instagram', 'youtube_shorts', 'facebook_reels']) {
      const copy = item.socialCopy[p];
      if (!copy) continue;
      mdLines.push(`### ${copy.icon} ${copy.platformLabel}`);
      mdLines.push('```text');
      mdLines.push(copy.fullFormattedText);
      mdLines.push('```');
      mdLines.push(``);
    }
    mdLines.push(`---`);
    mdLines.push(``);
  }

  const manifestPath = path.join(EXPORT_DIR, 'episode-pack-captions.md');
  fs.writeFileSync(manifestPath, mdLines.join('\n'), 'utf8');
  console.log(`\n✅ Compiled ${compiledOutputs.length} episodes + social copy manifest at public/exports/episode-pack-captions.md\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
