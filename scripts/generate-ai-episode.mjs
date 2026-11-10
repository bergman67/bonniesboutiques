#!/usr/bin/env node
/**
 * scripts/generate-ai-episode.mjs
 * Production-Quality Autonomous 30fps Video Factory for "Bonnie & Tammy's Trinket Tales"
 *
 * Integrated Subsystems:
 * - Milestone 1 Commentary Engine: 6 distinct show formats, persistent anti-repetition ledger,
 *   < 15% trigram overlap guarantee, LLM + Deep Procedural fallback.
 * - Milestone 2 Minecraft Flow Music Engine: Felt piano, warm pads, marimba plucks, shimmer reverb,
 *   tape warmth, 6 mood presets, custom audio track support, -10.5 dB speech interval ducking.
 * - Milestone 3 Virtual Cinematography & Captions: Handheld drift, comedic punchline zooms (1.16x),
 *   impact screen shake, CRT glow, word-level active karaoke highlight, 3-line sliding teleprompter.
 * - Milestone 4 Headless True 30fps Capture & FFmpeg Muxing: 1080x1920 (9:16), 30fps, libx264 high,
 *   yuv420p, aac 192kbps 44.1kHz, faststart MP4.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import ts from 'typescript';
import dotenv from 'dotenv';

const ROOT_DIR = process.cwd();
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const EXPORT_DIR = path.join(ROOT_DIR, 'public', 'exports');
const VIDEOS_DIR = path.join(ROOT_DIR, 'public', 'exports', 'videos');
const REACTION_CLIPS_DIR = path.join(ROOT_DIR, 'public', 'reaction-clips');
const MUSIC_DIR = path.join(ROOT_DIR, 'public', 'music');
const AI_SKITS_PATH = path.join(EXPORT_DIR, 'ai-generated-skits.json');
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache', 'ai_episode_factory');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

fs.mkdirSync(EXPORT_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_DIR, { recursive: true });
fs.mkdirSync(REACTION_CLIPS_DIR, { recursive: true });
fs.mkdirSync(MUSIC_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

export const BUILTIN_REACTION_TOPICS = [
  { scene: 'studio_makeover_spruce', videoFile: 'studio_makeover_spruce.mp4', label: 'The Big Boutique Spruce-Up & Studio Makeover Reel (HD Upgrade Special!)' },
  { scene: 'cake_decorating_icing', videoFile: 'cake_decorating_icing.mp4', label: 'Master pastry chef piping buttercream rosettes on a spinning cake turntable' },
  { scene: 'blacksmith_sparks', videoFile: 'blacksmith_sparks.mp4', label: 'Blacksmith hammering white-hot iron on an anvil with a shower of golden sparks' },
  { scene: 'woodturning_lathe', videoFile: 'woodturning_lathe.mp4', label: 'High-speed woodturning chisel carving a walnut bowl with flying wood ribbons' },
  { scene: 'northern_lights_aurora', videoFile: 'northern_lights_aurora.mp4', label: 'Time-lapse of emerald and violet Aurora Borealis curtains dancing across the Arctic sky' },
  { scene: 'domino_chain_fall', videoFile: 'domino_chain_fall.mp4', label: 'Thousands of colorful dominoes toppling in a hypnotic spiral chain reaction' },
  { scene: 'neon_tokyo_rain', videoFile: 'neon_tokyo_rain.mp4', label: 'Glowing neon signs reflecting across rain-slicked Tokyo crosswalks at midnight' },
  { scene: 'hummingbird_hover', videoFile: 'hummingbird_hover.mp4', label: 'Iridescent emerald hummingbird hovering in mid-air at 60 wingbeats per second' },
  { scene: 'pottery_wheel_spin', videoFile: 'pottery_wheel_spin.mp4', label: 'Master potter centering stoneware clay on a spinning wheel at 200 RPM' },
  { scene: 'glassblowing_lava', videoFile: 'glassblowing_lava.mp4', label: 'Artisan glassblower shaping 2,000-degree molten crystal from a glowing furnace' },
  { scene: 'skateboarding_tricks', videoFile: 'skateboarding_tricks.mp4', label: 'Tokyo Street Skateboarding Championship pro landing a high-speed rail kickflip' },
  { scene: 'roller_coaster_pov', videoFile: 'roller_coaster_pov.mp4', label: 'Front-row POV plunging down a 90-degree vertical drop steel roller coaster' },
  { scene: 'espresso_latte_art', videoFile: 'espresso_latte_art.mp4', label: 'Barista pouring silky micro-foam milk into a 16-leaf espresso rosette' },
  { scene: 'lava_flow_volcano', videoFile: 'lava_flow_volcano.mp4', label: 'Drone footage of glowing Icelandic volcanic magma rivers at twilight' },
  { scene: 'fireworks_finale', videoFile: 'fireworks_finale.mp4', label: 'Grand finale chrysanthemum fireworks exploding in gold and magenta across the night sky' },
  { scene: 'campfire_marshmallows', videoFile: 'campfire_marshmallows.mp4', label: 'Cozy crackling woodland campfire with glowing birch logs and floating embers' },
  { scene: 'cat_playing_box', videoFile: 'cat_playing_box.mp4', label: 'Chaotic tabby cat diving headfirst into a cardboard shipping box with zoomie eyes' },
  { scene: 'octopus_architect', videoFile: 'octopus_observatory.mp4', label: 'Deep-sea Octopus inspecting an underwater camera at 2,000m like a landlord' },
  { scene: 'capybara_spa', videoFile: 'baby_capybaras.mp4', label: 'Unbothered Baby Capybaras chilling together with +10,000 peaceful aura' },
  { scene: 'penguin_heist', videoFile: 'penguins_slowmo.mp4', label: 'Antarctic Penguins waddling & diving in dramatic slow motion' },
  { scene: 'anglerfish', videoFile: 'phantom_jellyfish.mp4', label: 'Giant Phantom Jellyfish floating through the midnight zone like a silk scarf' },
  { scene: 'mantis_shrimp', videoFile: 'hermit_crab.mp4', label: 'Hermit Crab flexing its custom shell armor on the beach' },
  { scene: 'honey_badger', videoFile: 'savanna_meerkat.mp4', label: 'Savanna Meerkats standing on their tiptoes being nosy neighbors' },
  { scene: 'chameleon_glow', videoFile: 'chameleon_glow.mp4', label: 'Iridescent Chameleon shifting vibrant colors under rainforest canopy' },
  { scene: 'red_panda_snack', videoFile: 'red_panda_snack.mp4', label: 'Cozy Red Panda enjoying sweet snacks in autumn golden leaves' },
  { scene: 'sea_otter_drift', videoFile: 'sea_otter_drift.mp4', label: 'Playful Sea Otter drifting on coastal kelp swells without a care in the world' },
  { scene: 'curious_owl', videoFile: 'curious_owl.mp4', label: 'Curious Saw-Whet Owl head-tilting with wide innocent anime eyes' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. DYNAMIC TS MODULE TRANSPILER & LOADER
// ─────────────────────────────────────────────────────────────────────────────
function transpileModuleToCache(srcRel, outSubPath) {
  const fullSrc = path.join(ROOT_DIR, srcRel);
  let code = fs.readFileSync(fullSrc, 'utf8');

  // Handle JSON imports if needed
  if (srcRel.includes('rpgAppraisal')) {
    const manifestPath = path.join(ROOT_DIR, 'src/lib/scrollytelling/productAssetManifest.json').replace(/\\/g, '/');
    code = code.replace(
      /import manifest from ['"][^'"]+['"];/,
      `import fs from 'node:fs'; const manifest = JSON.parse(fs.readFileSync('${manifestPath}', 'utf8'));`
    );
  }

  let out = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  // Rewrite relative and alias import specifiers to point to transpiled .mjs files
  out = out.replace(/from\s+['"]\.\/([a-zA-Z0-9_-]+)['"]/g, "from './$1.mjs'");
  out = out.replace(/from\s+['"]\.\.\/([a-zA-Z0-9_-]+)['"]/g, "from '../$1.mjs'");
  out = out.replace(/from\s+['"]@\/lib\/studio\/([a-zA-Z0-9_-]+)['"]/g, "from '../$1.mjs'");

  const fullOut = path.join(CACHE_DIR, outSubPath);
  fs.mkdirSync(path.dirname(fullOut), { recursive: true });
  fs.writeFileSync(fullOut, out, 'utf8');
  return fullOut;
}

// Transpile required studio engines into cache
transpileModuleToCache('src/lib/studio/rpgAppraisal.ts', 'rpgAppraisal.mjs');
transpileModuleToCache('src/lib/studio/skitTemplates.ts', 'skitTemplates.mjs');
transpileModuleToCache('src/lib/studio/commentary/types.ts', 'commentary/types.mjs');
transpileModuleToCache('src/lib/studio/commentary/antiRepetitionLedger.ts', 'commentary/antiRepetitionLedger.mjs');
transpileModuleToCache('src/lib/studio/commentary/proceduralGenerator.ts', 'commentary/proceduralGenerator.mjs');
transpileModuleToCache('src/lib/studio/commentary/llmCommentaryGenerator.ts', 'commentary/llmCommentaryGenerator.mjs');
transpileModuleToCache('src/lib/studio/commentary/commentaryEngine.ts', 'commentary/commentaryEngine.mjs');
transpileModuleToCache('src/lib/studio/flowMusicEngine.ts', 'flowMusicEngine.mjs');

const { generateCommentaryEpisode } = await import(
  `file://${path.join(CACHE_DIR, 'commentary', 'commentaryEngine.mjs').replace(/\\/g, '/')}`
);
const { synthesizeFlowMusic } = await import(
  `file://${path.join(CACHE_DIR, 'flowMusicEngine.mjs').replace(/\\/g, '/')}`
);
const { ensureFreshTvClipPool } = await import('./fetch-fresh-tv-clips.mjs');

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUDIO SYNTHESIS & SPEECH INTERVAL DUCKING
// ─────────────────────────────────────────────────────────────────────────────
function addTone(left, right, sampleRate, startSec, durSec, fStart, fEnd, gain) {
  const startIdx = Math.max(0, Math.floor(startSec * sampleRate));
  const len = Math.floor(durSec * sampleRate);
  for (let i = 0; i < len && startIdx + i < left.length; i++) {
    const p = i / len;
    const env = Math.sin(Math.PI * p);
    const freq = fStart + (fEnd - fStart) * p;
    const t = i / sampleRate;
    const sig = Math.sin(2 * Math.PI * freq * t) * gain * env;
    left[startIdx + i] += sig;
    right[startIdx + i] += sig;
  }
}

export async function synthesizeEpisodeAudio(skit, outWavPath, musicOptions = {}) {
  const sampleRate = 44100;
  const totalSec = skit.beats.reduce((acc, b) => acc + (b.durationSec || 4.2), 0);

  // Build speech intervals for sidechain volume ducking
  let curSec = 0;
  const speechIntervals = [];
  for (const b of skit.beats) {
    const dur = b.durationSec || 4.2;
    speechIntervals.push({
      startSec: curSec,
      endSec: curSec + dur * 0.85,
      speaker: b.speaker || 'bonnie',
    });
    curSec += dur;
  }

  // Synthesize multi-layered Minecraft ambient flow music or custom track
  const soundtrack = await synthesizeFlowMusic({
    mood: musicOptions.mood || 'cozy_nostalgia',
    durationSec: totalSec,
    sampleRate,
    speechIntervals,
    customTrackPath: musicOptions.customTrackPath,
  });

  const left = soundtrack.audioBuffer[0];
  const right = soundtrack.audioBuffer[1];

  // Overlay beat SFX & Animal Crossing voice blips
  let beatStart = 0;
  for (const beat of skit.beats) {
    const dur = beat.durationSec || 4.2;
    if (beat.soundEffect === 'box_tap') {
      addTone(left, right, sampleRate, beatStart + 0.05, 0.06, 220, 140, 0.18);
      addTone(left, right, sampleRate, beatStart + 0.18, 0.06, 240, 150, 0.18);
    } else if (beat.soundEffect === 'gasp') {
      addTone(left, right, sampleRate, beatStart + 0.03, 0.18, 340, 620, 0.15);
    } else if (beat.soundEffect === 'tea_sip') {
      addTone(left, right, sampleRate, beatStart + 0.05, 0.16, 280, 420, 0.12);
    } else if (beat.soundEffect === 'laugh') {
      addTone(left, right, sampleRate, beatStart + 0.04, 0.08, 480, 560, 0.13);
      addTone(left, right, sampleRate, beatStart + 0.15, 0.08, 520, 600, 0.13);
    } else {
      addTone(left, right, sampleRate, beatStart + 0.04, 0.22, 659.25, 880, 0.14);
    }

    const text = beat.dialogue || '';
    const typingDur = dur * 0.8;
    const baseFreq = beat.speaker === 'bonnie' ? 395 : 545;
    for (let c = 0; c < text.length; c += 2) {
      if (text[c] === ' ') continue;
      const charTime = beatStart + (c / Math.max(1, text.length)) * typingDur;
      const f0 = baseFreq + (((c * 37) % 90) - 30);
      addTone(left, right, sampleRate, charTime, 0.048, f0, f0 * 1.14, 0.14);
    }
    beatStart += dur;
  }

  // Write standard 44.1kHz 16-bit Stereo PCM WAV file
  const numSamples = left.length;
  const dataBytes = numSamples * 4;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    buf.writeInt16LE(Math.floor(l * 32767), offset);
    buf.writeInt16LE(Math.floor(r * 32767), offset + 2);
    offset += 4;
  }
  fs.writeFileSync(outWavPath, buf);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPLETE STUDIO CANVAS RENDERER HTML BUILDER (CAMERA KINEMATICS & CAPTIONS)
// ─────────────────────────────────────────────────────────────────────────────
function buildStudioCanvasRendererHtml(skit, productDataUrl, hasExternalVideo) {
  const stripExports = (tsPath) => {
    const raw = fs.readFileSync(path.join(ROOT_DIR, tsPath), 'utf8');
    const js = ts.transpileModule(raw, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    return js.replace(/^export\s+/gm, '');
  };

  const characterRigJs = stripExports('src/lib/studio/characterRig.ts');
  const backdropsJs = stripExports('src/lib/studio/backdrops.ts');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{margin:0;background:transparent;overflow:hidden;}</style></head>
<body>
<canvas id="studio" width="1080" height="1920"></canvas>
<script>
${characterRigJs}
${backdropsJs}

const SKIT = ${JSON.stringify(skit)};
const HAS_EXTERNAL_VIDEO = ${JSON.stringify(Boolean(hasExternalVideo))};
const PROP_ID = ${JSON.stringify(skit.defaultPropId)};
const PROP_DATA_URL = ${JSON.stringify(productDataUrl)};

const propImagesCache = new Map();
if (PROP_DATA_URL) {
  const img = new Image();
  img.src = PROP_DATA_URL;
  propImagesCache.set(PROP_ID, img);
}

function computeCameraCinematography(frameCount, beatProgress, currentBeat, fourthWall, VW, counterY) {
  const safeProgress = typeof beatProgress === 'number' && Number.isFinite(beatProgress)
    ? Math.max(0.0, Math.min(1.0, beatProgress))
    : 0.0;
  const approachBase = Math.max(0.0, Math.min(1.0, safeProgress * 3.4));
  const approachT = fourthWall ? Math.min(1.0, Math.pow(approachBase, 0.75)) : 0.0;
  const tapImpact = fourthWall === 'screen_tap' && approachT > 0.65 && frameCount % 26 < 5
    ? Math.sin(((frameCount % 26) / 5) * Math.PI)
    : 0.0;

  const handheldX = Math.sin(frameCount * 0.031) * 1.8 + Math.cos(frameCount * 0.017) * 0.9;
  const handheldY = Math.cos(frameCount * 0.027) * 1.4 + Math.sin(frameCount * 0.019) * 0.7;
  const reactionDutchTilt = currentBeat && (currentBeat.expression === 'shocked' || currentBeat.action === 'gasp')
    ? (currentBeat.speaker === 'bonnie' ? -0.011 : 0.011) * Math.sin(safeProgress * Math.PI)
    : 0.0;
  const handheldAngle = Math.sin(frameCount * 0.023) * 0.0035 + reactionDutchTilt;

  const isPunchlineBeat = Boolean(
    currentBeat && (currentBeat.action === 'laugh' || currentBeat.action === 'gasp' || currentBeat.expression === 'shocked' || currentBeat.expression === 'laughing')
  );
  const isActionFocusBeat = Boolean(
    currentBeat && (currentBeat.action === 'hold trinket' || currentBeat.action === 'sip tea' || currentBeat.expression === 'proud grandma')
  );
  const punchlineZoomTarget = isPunchlineBeat ? 1.18 : isActionFocusBeat ? 1.07 : 1.03;
  const zoomProgress = Math.max(0.0, Math.min(1.0, safeProgress * 2.8));
  const punchlineZoom = 1.0 + (punchlineZoomTarget - 1.0) * zoomProgress;
  const fourthWallZoom = fourthWall === 'camera_zoom' ? 1.0 + 0.14 * approachT : 1.0;
  const totalCameraZoom = Math.max(1.0, Math.min(1.35, punchlineZoom * fourthWallZoom));

  const isImpactReaction = Boolean(
    currentBeat && (currentBeat.expression === 'shocked' || currentBeat.expression === 'laughing' || currentBeat.action === 'gasp' || currentBeat.action === 'laugh')
  );
  const impactDecay = isImpactReaction ? Math.max(0.0, Math.min(1.0, 1.0 - safeProgress * 3.8)) : 0.0;
  const impactShakeX = impactDecay > 0 ? Math.sin(frameCount * 1.8) * 3.4 * impactDecay : 0.0;
  const impactShakeY = impactDecay > 0 ? Math.cos(frameCount * 2.2) * 2.6 * impactDecay : 0.0;
  const tapShakeX = tapImpact > 0 ? (frameCount % 2 === 0 ? 1 : -1) * tapImpact * 2.2 : 0.0;
  const tapShakeY = tapImpact > 0 ? tapImpact * 1.6 : 0.0;

  // Dynamic Speaker-Tracking Horizontal Pan & Vertical Framing
  const speakerPanEase = Math.sin(Math.min(1.0, safeProgress * 1.8) * (Math.PI / 2));
  const speakerPanX = currentBeat && currentBeat.speaker === 'bonnie'
    ? -13 * speakerPanEase
    : currentBeat && currentBeat.speaker === 'tammy'
    ? 13 * speakerPanEase
    : 0;

  return {
    handheldAngle,
    totalCameraZoom,
    totalShakeX: tapShakeX + impactShakeX + handheldX,
    totalShakeY: tapShakeY + impactShakeY + handheldY,
    focusX: VW / 2 + speakerPanX,
    focusY: counterY - 18 - (totalCameraZoom > 1.08 ? 4 * zoomProgress : 0),
    approachT,
    tapImpact,
  };
}

function getSurrogateSafeLength(str, targetCount) {
  if (targetCount <= 0) return 0;
  if (targetCount >= str.length) return str.length;
  const lastCode = str.charCodeAt(targetCount - 1);
  return (lastCode >= 0xd800 && lastCode <= 0xdbff) ? targetCount + 1 : targetCount;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function renderBurntInCaptions(ctx, beat, progress, VW, VH, frameCount) {
  const safeProgress = typeof progress === 'number' && Number.isFinite(progress)
    ? Math.max(0.0, Math.min(1.0, progress))
    : 0.0;
  const fullText = beat.dialogue || '';
  const rawCharCount = Math.floor(fullText.length * Math.min(1.0, safeProgress * 1.25));
  const charCount = getSurrogateSafeLength(fullText, rawCharCount);

  const boxW = Math.min(VW - 24, 340);
  const boxH = 72;
  const boxX = Math.floor((VW - boxW) / 2);
  const boxY = Math.floor(VH * 0.72);

  const entryProgress = Math.min(1.0, safeProgress * 4.0);
  const entryPopScale = 1.0 + 0.08 * Math.sin(entryProgress * Math.PI) * (1.0 - entryProgress);

  ctx.save();
  const boxCenterX = boxX + Math.floor(boxW / 2);
  const boxCenterY = boxY + Math.floor(boxH / 2);
  ctx.translate(boxCenterX, boxCenterY);
  ctx.scale(entryPopScale, entryPopScale);
  ctx.translate(-boxCenterX, -boxCenterY);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(boxX + 2, boxY + 2, boxW, boxH);
  ctx.fillStyle = 'rgba(15, 10, 26, 0.94)';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#e8748a';
  ctx.fillRect(boxX, boxY, boxW, 2);
  ctx.fillRect(boxX, boxY + boxH - 2, boxW, 2);
  ctx.fillRect(boxX, boxY, 2, boxH);
  ctx.fillRect(boxX + boxW - 2, boxY, 2, boxH);

  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(boxX + 3, boxY + 3, boxW - 6, 1);
  ctx.fillRect(boxX + 3, boxY + boxH - 4, boxW - 6, 1);
  ctx.fillRect(boxX + 3, boxY + 3, 1, boxH - 6);
  ctx.fillRect(boxX + boxW - 4, boxY + 3, 1, boxH - 6);

  const speakerName = beat.speaker === 'bonnie' ? '👵 BONNIE' : beat.speaker === 'tammy' ? '✨ TAMMY' : '✦ NARRATOR';
  const speakerColor = beat.speaker === 'bonnie' ? '#f43f5e' : beat.speaker === 'tammy' ? '#0d9488' : '#7c3aed';

  ctx.fillStyle = speakerColor;
  ctx.fillRect(boxX + 12, boxY - 8, 80, 13);
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(speakerName, boxX + 16, boxY + 1);

  ctx.font = 'bold 8px monospace';
  const maxTextWidth = boxW - 24;
  const wrappedLines = wrapText(ctx, fullText, maxTextWidth);

  const allWords = fullText.split(/\\s+/).filter(Boolean);
  const totalWords = allWords.length;
  const activeWordIndex = totalWords > 0 ? Math.min(totalWords - 1, Math.floor(safeProgress * 1.25 * totalWords)) : -1;

  let globalCharOffset = 0;
  let globalWordCount = 0;
  const parsedLines = wrappedLines.map((line, lineIdx) => {
    const lineWords = line.split(/\\s+/).filter(Boolean);
    const words = lineWords.map((word) => {
      const charStart = fullText.indexOf(word, globalCharOffset);
      const effectiveCharStart = charStart !== -1 ? charStart : globalCharOffset;
      globalCharOffset = effectiveCharStart + word.length;
      return { word, globalWordIndex: globalWordCount++, charStart: effectiveCharStart };
    });
    return { lineIndex: lineIdx, words };
  });

  let activeLineIndex = 0;
  for (const pl of parsedLines) {
    if (pl.words.some((w) => w.globalWordIndex === activeWordIndex)) {
      activeLineIndex = pl.lineIndex;
      break;
    }
  }

  const MAX_VISIBLE_LINES = 3;
  const startLineIndex = Math.max(0, Math.min(Math.max(0, parsedLines.length - MAX_VISIBLE_LINES), activeLineIndex - 1));
  const visibleLines = parsedLines.slice(startLineIndex, startLineIndex + MAX_VISIBLE_LINES);

  let cursorX = boxX + 12;
  let cursorY = boxY + 17;

  visibleLines.forEach((pl, rowIdx) => {
    const lineY = boxY + 17 + rowIdx * 13;
    let currentX = boxX + 12;

    for (const w of pl.words) {
      if (w.charStart >= charCount) continue;
      const isPartial = w.charStart + w.word.length > charCount;
      let displayWord = w.word;
      if (isPartial) {
        const targetSlice = Math.max(0, charCount - w.charStart);
        displayWord = w.word.slice(0, getSurrogateSafeLength(w.word, targetSlice));
      }
      const wordW = ctx.measureText(displayWord).width;
      const spaceW = ctx.measureText(' ').width;
      const isActive = w.globalWordIndex === activeWordIndex;

      if (isActive) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.fillRect(currentX - 1, lineY - 8, wordW + 2, 10);
        ctx.fillStyle = '#000000';
        ctx.fillText(displayWord, currentX + 1, lineY + 1);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(displayWord, currentX, lineY);
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillText(displayWord, currentX + 1, lineY + 1);
        ctx.fillStyle = w.globalWordIndex < activeWordIndex ? '#f5efe6' : 'rgba(245, 239, 230, 0.7)';
        ctx.fillText(displayWord, currentX, lineY);
      }
      currentX += wordW + spaceW;
      if (pl.lineIndex === activeLineIndex) {
        cursorX = currentX - spaceW + 2;
        cursorY = lineY;
      }
    }
  });

  if (charCount < fullText.length && frameCount % 30 < 15) {
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cursorX, cursorY - 6, 4, 8);
  }
  ctx.restore();
}

function renderCounterPropShowcase(ctx, propId, centerX, baseY, frameCount, propCache) {
  const floatOffset = Math.sin(frameCount * 0.08) * 3;
  const py = baseY + floatOffset;
  const propImg = propCache.get(propId);

  ctx.save();
  const rad = ctx.createRadialGradient(centerX, py, 2, centerX, py, 26);
  rad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
  rad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = rad;
  ctx.fillRect(centerX - 30, py - 30, 60, 60);
  ctx.restore();

  if (propImg && propImg.complete && propImg.naturalWidth > 0) {
    const size = 38;
    ctx.drawImage(propImg, centerX - Math.floor(size / 2), py - Math.floor(size / 2), size, size);
  } else {
    ctx.fillStyle = '#e8748a';
    ctx.fillRect(centerX - 8, py - 8, 16, 16);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(centerX - 4, py - 4, 8, 8);
  }

  ctx.fillStyle = '#fef08a';
  const sparkY = py - 16 + Math.sin(frameCount * 0.15) * 4;
  ctx.fillRect(centerX - 16, sparkY, 2, 2);
  ctx.fillRect(centerX + 14, sparkY + 4, 2, 2);
}

function renderNatGeoMonitorCutout(ctx, scene, x, y, w, h, frameCount) {
  ctx.save();
  const glowCenterX = x + Math.floor(w / 2);
  const glowBottomY = y + h;
  let crtColor = 'rgba(6, 182, 212, ';
  if (scene.includes('meerkat') || scene.includes('honey_badger') || scene.includes('capybara') || scene.includes('woodturning')) {
    crtColor = 'rgba(245, 158, 11, ';
  } else if (scene.includes('penguin') || scene.includes('coaster')) {
    crtColor = 'rgba(147, 197, 253, ';
  } else if (scene.includes('crab') || scene.includes('mantis_shrimp') || scene.includes('aurora') || scene.includes('hummingbird')) {
    crtColor = 'rgba(20, 184, 166, ';
  } else if (scene.includes('spruce') || scene.includes('cake')) {
    crtColor = 'rgba(236, 72, 153, ';
  } else if (scene.includes('red_panda') || scene.includes('lava') || scene.includes('blacksmith') || scene.includes('campfire')) {
    crtColor = 'rgba(249, 115, 22, ';
  } else if (scene.includes('owl') || scene.includes('neon') || scene.includes('fireworks')) {
    crtColor = 'rgba(139, 92, 246, ';
  }
  const crtPulse = 0.18 + 0.05 * Math.sin(frameCount * 0.14);
  const glowGrad = ctx.createRadialGradient(glowCenterX, glowBottomY, 10, glowCenterX, glowBottomY + 90, 140);
  glowGrad.addColorStop(0, crtColor + (crtPulse * 1.6) + ')');
  glowGrad.addColorStop(0.5, crtColor + (crtPulse * 0.7) + ')');
  glowGrad.addColorStop(1, crtColor + '0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(glowCenterX - 140, glowBottomY, 280, 110);

  // Diagonal Volumetric Studio Light Beams from TV Bottom Edge
  ctx.fillStyle = crtColor + (crtPulse * 0.35).toFixed(3) + ')';
  ctx.beginPath();
  ctx.moveTo(x + 8, glowBottomY);
  ctx.lineTo(x + w - 8, glowBottomY);
  ctx.lineTo(x + w + 24, glowBottomY + 76);
  ctx.lineTo(x - 24, glowBottomY + 76);
  ctx.closePath();
  ctx.fill();

  // Ceiling mount cables & brass brackets
  ctx.fillStyle = '#27272a';
  ctx.fillRect(x + 26, 0, 4, y);
  ctx.fillRect(x + w - 30, 0, 4, y);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(x + 24, y - 6, 8, 4);
  ctx.fillRect(x + w - 32, y - 6, 8, 4);

  // Outer Casing
  ctx.fillStyle = '#3f2314';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);

  const sx = x + 6;
  const sy = y + 6;
  const sw = w - 12;
  const sh = h - 24;

  if (HAS_EXTERNAL_VIDEO) {
    ctx.clearRect(sx, sy, sw, sh);
  } else {
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(sx, sy, sw, sh);
  }

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.strokeRect(sx + 4, sy + 4, 12, 16);

  const isNonAnimalClip = /spruce|cake|blacksmith|woodturning|aurora|domino|neon|pottery|glassblowing|skateboard|coaster|latte|lava|fireworks|campfire|cat_playing/i.test(scene);
  const FORMAT_TV_HEADERS = {
    wild_nature_commentary: isNonAnimalClip ? 'BOUTIQUE TV • CH 42' : 'NAT GEO WILD • CH 42',
    chaotic_grandma_hot_takes: 'GRANDMA HOT TAKES • CH 99',
    cozy_boutique_lore: 'BOUTIQUE LORE • CH 51',
    vintage_relic_debates: 'RELIC DEBATES • CH 07',
    gen_z_culture_clash: 'GEN-Z VS GRANDMA • CH 24',
    craft_breakdown_asmr: 'TACTILE ASMR LAB • CH 12',
  };
  const headerLabel = FORMAT_TV_HEADERS[SKIT.format] || 'BOUTIQUE TV • CH 42';

  // Top-Left Header Badge + Pulsing Red Recording Dot
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(sx + 20, sy + 4, 138, 13);
  if (frameCount % 24 < 16) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(sx + 24, sy + 8, 4, 4);
  }
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 7px monospace';
  ctx.fillText(headerLabel, sx + 31, sy + 13);

  // Top-Right Animated 6-Bar VU Audio Equalizer HUD
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  ctx.fillRect(sx + sw - 34, sy + 4, 30, 13);
  const vuColors = ['#22c55e', '#22c55e', '#eab308', '#eab308', '#f97316', '#ef4444'];
  for (let b = 0; b < 6; b++) {
    const wave = Math.abs(Math.sin(frameCount * 0.24 + b * 0.95) * Math.cos(frameCount * 0.11 + b));
    const barH = Math.max(2, Math.min(9, Math.round(2 + wave * 8)));
    ctx.fillStyle = vuColors[b];
    ctx.fillRect(sx + sw - 31 + b * 4, sy + 15 - barH, 3, barH);
  }

  // Bottom Animated Ticker Bar
  ctx.fillStyle = '#18181b';
  ctx.fillRect(sx, y + h - 17, sw, 13);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(sx + 2, y + h - 15, 22, 9);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 6px monospace';
  ctx.fillText('LIVE', sx + 5, y + h - 8);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('▶ ' + scene.replace(/_/g, ' ').toUpperCase(), sx + 28, y + h - 8);
  ctx.restore();
}

function renderFourthWallOverlay(ctx, effect, speaker, bonnieX, tammyX, counterY, VW, VH, frameCount, approachT, tapImpact) {
  ctx.save();
  const isBonnie = speaker !== 'tammy';
  const startX = isBonnie ? bonnieX + 14 : tammyX + 12;
  const endX = Math.floor(VW / 2) + (isBonnie ? -10 : 10);
  const actorCenterX = startX + (endX - startX) * approachT;
  const actorCenterY = counterY - 12;

  if (effect === 'screen_tap') {
    const knockX = actorCenterX + (isBonnie ? 18 : -18);
    const knockY = actorCenterY + 6;
    if (approachT > 0.5) {
      const fogAlpha = 0.14 * approachT * (0.75 + 0.25 * Math.sin(frameCount * 0.1));
      ctx.fillStyle = 'rgba(255, 255, 255, ' + fogAlpha + ')';
      ctx.beginPath();
      ctx.ellipse(actorCenterX, actorCenterY - 4, 28 * approachT, 18 * approachT, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (approachT > 0.45) {
      const tapCycle = Math.sin(frameCount * 0.48);
      const handScale = 1 + Math.max(0, tapCycle) * 0.35;
      const hx = knockX - Math.floor(6 * handScale);
      const hy = knockY - Math.floor(6 * handScale) - Math.floor(tapCycle * 3);
      ctx.fillStyle = isBonnie ? '#7a1c3a' : '#0d9488';
      ctx.fillRect(hx + 1, hy + 8, Math.floor(10 * handScale), Math.floor(6 * handScale));
      ctx.fillStyle = '#fde2c4';
      ctx.fillRect(hx, hy, Math.floor(12 * handScale), Math.floor(10 * handScale));
      ctx.strokeStyle = '#4c0519';
      ctx.lineWidth = 1;
      ctx.strokeRect(hx, hy, Math.floor(12 * handScale), Math.floor(10 * handScale));
    }
    const phase = (frameCount % 32) / 32;
    const r1 = 6 + phase * 36;
    const r2 = 6 + ((phase + 0.5) % 1) * 36;
    ctx.strokeStyle = 'rgba(251, 191, 36, ' + ((1 - phase) * 0.95) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(knockX, knockY, r1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(244, 114, 182, ' + ((1 - ((phase + 0.5) % 1)) * 0.9) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(knockX, knockY, r2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#0f0a1a';
    ctx.fillText('*TAP* *TAP*', knockX - 27, knockY - 21 - Math.sin(frameCount * 0.25) * 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillText('*TAP* *TAP*', knockX - 28, knockY - 22 - Math.sin(frameCount * 0.25) * 3);
  }
  ctx.restore();
}

window.renderEpisodeFrame = function(frameIndex, fps) {
  const canvas = document.getElementById('studio');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const VW = 270;
  const VH = 480;
  const S = 4;
  const counterY = 290;
  const frameCount = frameIndex * 2; // Exact 30fps capture to 60Hz animation mapping

  const globalSec = frameIndex / fps;
  let acc = 0;
  let currentBeatIndex = 0;
  let beatLocalSec = 0;
  for (let i = 0; i < SKIT.beats.length; i++) {
    const d = SKIT.beats[i].durationSec || 4.2;
    if (globalSec < acc + d || i === SKIT.beats.length - 1) {
      currentBeatIndex = i;
      beatLocalSec = Math.max(0, globalSec - acc);
      break;
    }
    acc += d;
  }

  const currentBeat = SKIT.beats[currentBeatIndex];
  const rawBeatProgress = beatLocalSec / (currentBeat.durationSec || 4.2);
  const beatProgress = Number.isFinite(rawBeatProgress) ? Math.max(0, Math.min(1, rawBeatProgress)) : 0;

  ctx.clearRect(0, 0, 1080, 1920);
  ctx.save();
  ctx.scale(S, S);

  const speaker = currentBeat.speaker || 'bonnie';
  const isSpeakingBonnie = speaker === 'bonnie';
  const isSpeakingTammy = speaker === 'tammy';
  const fourthWall = currentBeat.fourthWallEffect;

  const cameraState = computeCameraCinematography(frameCount, beatProgress, currentBeat, fourthWall, VW, counterY);
  const { approachT, tapImpact, handheldAngle, totalCameraZoom, totalShakeX, totalShakeY, focusX, focusY } = cameraState;

  ctx.save();
  ctx.translate(focusX + totalShakeX, focusY + totalShakeY);
  ctx.rotate(handheldAngle);
  if (totalCameraZoom !== 1.0) {
    ctx.scale(totalCameraZoom, totalCameraZoom);
  }
  ctx.translate(-focusX, -focusY);

  // 1. Backdrop (Arched Window, Drifting Clouds, Town Skyline, Swaying Tree, Window Cat, Pendulum Clock, Corkboard, Shelves & Lanterns)
  const activeBackdropId = SKIT.defaultBackdrop || 'cozy_night_shop';
  renderBackdrop(ctx, activeBackdropId, VW, VH, counterY, frameCount);

  // 3. Characters (with organic behind-the-counter strolling & active speaking movement)
  const bonnieAction = isSpeakingBonnie ? normalizeAction(currentBeat.action) : 'idle';
  const bonnieExpr = isSpeakingBonnie ? normalizeExpression(currentBeat.expression) : 'happy';
  const tammyAction = isSpeakingTammy ? normalizeAction(currentBeat.action) : 'idle';
  const tammyExpr = isSpeakingTammy ? normalizeExpression(currentBeat.expression) : 'happy';

  const bonnieStroll = isSpeakingBonnie
    ? Math.sin(beatProgress * Math.PI) * 8
    : Math.sin(frameCount * 0.032) * 11;
  const tammyStroll = isSpeakingTammy
    ? -Math.sin(beatProgress * Math.PI) * 8
    : Math.cos(frameCount * 0.028) * 11;

  const bonnieWalkDrift = bonnieAction === 'walk' ? Math.sin(beatProgress * Math.PI * 2) * 14 : bonnieStroll;
  const tammyWalkDrift = tammyAction === 'walk' ? Math.sin(beatProgress * Math.PI * 2) * 14 : tammyStroll;
  const bonnieTalkHop = isSpeakingBonnie ? -Math.abs(Math.sin(frameCount * 0.26)) * 2.2 : Math.sin(frameCount * 0.08) * 0.8;
  const tammyTalkHop = isSpeakingTammy ? -Math.abs(Math.sin(frameCount * 0.26)) * 2.2 : Math.cos(frameCount * 0.08) * 0.8;

  const bonnieX = Math.floor(VW / 2) - 62 + Math.round(bonnieWalkDrift);
  const bonnieY = counterY - 40 + Math.round(bonnieTalkHop);
  const tammyX = Math.floor(VW / 2) + 38 + Math.round(tammyWalkDrift);
  const tammyY = counterY - 34 + Math.round(tammyTalkHop);

  const bonnieInForeground = Boolean(fourthWall && isSpeakingBonnie);
  const tammyInForeground = Boolean(fourthWall && isSpeakingTammy);

  const bonnieState = {
    id: 'bonnie',
    x: bonnieX,
    y: bonnieY,
    facing: fourthWall ? 'front' : 'right',
    action: bonnieInForeground && approachT < 0.65 ? 'walk' : bonnieAction,
    expression: bonnieExpr,
    animFrame: frameCount,
    isSpeaking: isSpeakingBonnie,
    activePropId: PROP_ID,
  };

  const tammyState = {
    id: 'tammy',
    x: tammyX,
    y: tammyY,
    facing: fourthWall ? 'front' : 'left',
    action: tammyInForeground && approachT < 0.65 ? 'walk' : tammyAction,
    expression: tammyExpr,
    animFrame: frameCount,
    isSpeaking: isSpeakingTammy,
    activePropId: PROP_ID,
  };

  if (!bonnieInForeground) renderCharacter(ctx, bonnieState, undefined, frameCount, propImagesCache);
  if (!tammyInForeground) renderCharacter(ctx, tammyState, undefined, frameCount, propImagesCache);

  // 4. Recessed Wood-Paneled Mahogany Counter, Flickering Candle, Steaming Kettle, Bubbling Flask & Woven Floor Rug
  const { runnerX, runnerW } = renderBoutiqueCounterAndForeground(
    ctx,
    activeBackdropId,
    VW,
    VH,
    counterY,
    frameCount
  );

  // 5. Product Prop Showcase
  renderCounterPropShowcase(ctx, PROP_ID, runnerX + Math.floor(runnerW / 2), counterY - 10, frameCount, propImagesCache);

  // 5a. In-Scene Overhead Pixel Speech Bubble (Inkwell & Alembic style)
  if (currentBeat && currentBeat.dialogue && !bonnieInForeground && !tammyInForeground) {
    const spk = isSpeakingBonnie ? 'bonnie' : 'tammy';
    const spkX = isSpeakingBonnie ? bonnieX : tammyX;
    const spkY = isSpeakingBonnie ? bonnieY : tammyY;
    renderOverheadSpeechBubble(ctx, spk, currentBeat.dialogue, spkX, spkY, beatProgress, VW);
  }

  // 5b. Close-up 4th-wall character
  if (bonnieInForeground || tammyInForeground) {
    const fgState = bonnieInForeground ? bonnieState : tammyState;
    const targetScale = fourthWall === 'screen_tap' ? 2.35 : 2.0;
    const curScale = 1 + (targetScale - 1) * approachT;
    const startCenterX = fgState.x + 14;
    const startTopY = fgState.y;
    const endCenterX = Math.floor(VW / 2) + (bonnieInForeground ? -10 : 10);
    const endTopY = counterY - 26;
    const walkBob = approachT < 0.75 ? Math.abs(Math.sin(frameCount * 0.45)) * 4 : Math.sin(frameCount * 0.18) * 1.5;
    const curCenterX = startCenterX + (endCenterX - startCenterX) * approachT;
    const curTopY = startTopY + (endTopY - startTopY) * approachT - walkBob;

    ctx.save();
    ctx.translate(curCenterX, curTopY + 20);
    ctx.scale(curScale, curScale);
    ctx.translate(-14, -20);
    renderCharacter(ctx, { ...fgState, x: 0, y: 0 }, undefined, frameCount, propImagesCache);
    ctx.restore();
  }

  ctx.restore(); // Restore camera kinematics transform

  // 2. Top Split-Screen CRT Monitor (rendered in fixed screen space so the 864x496 cutout matches FFmpeg's video overlay during camera zooms)
  const activeMonitorScene = currentBeat.natGeoScene || SKIT.defaultMonitorScene || 'octopus_architect';
  if (activeMonitorScene || HAS_EXTERNAL_VIDEO) {
    const tvW = Math.min(228, VW - 26);
    const tvH = 148;
    const tvX = Math.floor((VW - tvW) / 2);
    const tvY = 28;
    renderNatGeoMonitorCutout(ctx, activeMonitorScene, tvX, tvY, tvW, tvH, frameCount);
  }

  if (fourthWall) {
    renderFourthWallOverlay(ctx, fourthWall, speaker, bonnieX, tammyX, counterY, VW, VH, frameCount, approachT, tapImpact);
  }

  // 6a. Subtle Vertical Safe-Zone Boutique Watermark (y=181, clear of top UI & right-rail icons)
  ctx.save();
  ctx.fillStyle = 'rgba(26, 15, 36, 0.72)';
  ctx.strokeStyle = 'rgba(232, 116, 138, 0.48)';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.roundRect(14, 180, 128, 13, 4);
  ctx.fill();
  ctx.stroke();
  ctx.font = '600 6.2px sans-serif';
  ctx.fillStyle = '#fde68a';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦ btboutiqe.com · Handmade in VA', 19, 186.8);
  ctx.restore();

  // 6b. Dynamic Mid-Episode Lower-Third Offer Pill (8.0s–14.5s, 0s static outro for seamless loop)
  if (globalSec >= 8.0 && globalSec <= 14.5) {
    const fadeIn = Math.min(1, (globalSec - 8.0) / 0.6);
    const fadeOut = Math.min(1, (14.5 - globalSec) / 0.6);
    const pillAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
    ctx.save();
    ctx.globalAlpha = pillAlpha;
    ctx.fillStyle = 'rgba(26, 15, 36, 0.88)';
    ctx.strokeStyle = 'rgba(249, 199, 79, 0.65)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.roundRect(16, 321, 198, 15, 5);
    ctx.fill();
    ctx.stroke();
    ctx.font = '700 6.4px sans-serif';
    ctx.fillStyle = '#fef3c7';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎁 Code BONNIE10 (10% Off) · Free Ship $25+', 22, 328.8);
    ctx.restore();
  }

  // 7. Synchronized Word-Level Karaoke Captions
  renderBurntInCaptions(ctx, currentBeat, beatProgress, VW, VH, frameCount);

  ctx.restore();
  return canvas.toDataURL('image/png');
};
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HEADLESS COMPILATION & FFMPEG MUXING ENGINE
// ─────────────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function compileSkitStandalone(skit, customVideoPath = null, musicOptions = {}) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'src/lib/scrollytelling/productAssetManifest.json'), 'utf8')
  );
  const products = manifest.products || [];
  const propId = skit.defaultPropId || products[0]?.id;
  const product = products.find((p) => p.id === propId) || products[0] || {};

  let productDataUrl = null;
  if (product && product.transparentLocalUrl) {
    const localPngPath = path.join(ROOT_DIR, 'public', product.transparentLocalUrl.replace(/^\//, ''));
    if (fs.existsSync(localPngPath)) {
      const b64 = fs.readFileSync(localPngPath).toString('base64');
      productDataUrl = `data:image/png;base64,${b64}`;
    }
  }

  let videoPath = customVideoPath;
  if (!videoPath && skit.reactionVideoFile) {
    const candidate = path.join(REACTION_CLIPS_DIR, skit.reactionVideoFile);
    if (fs.existsSync(candidate)) videoPath = candidate;
  }
  if (!videoPath && skit.beats?.some((b) => b.natGeoScene)) {
    const firstScene = skit.beats.find((b) => b.natGeoScene)?.natGeoScene;
    const matchedTopic = BUILTIN_REACTION_TOPICS.find((t) => t.scene === firstScene);
    const candidate = path.join(REACTION_CLIPS_DIR, matchedTopic ? matchedTopic.videoFile : `${firstScene}.mp4`);
    if (fs.existsSync(candidate)) videoPath = candidate;
  }
  if (!videoPath) {
    // Always pair every episode with a curated top-screen video clip so split-screen is active on 100% of episodes
    const hashSeed = String(skit.id || Date.now()).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const chosenTopic = BUILTIN_REACTION_TOPICS[hashSeed % BUILTIN_REACTION_TOPICS.length];
    const candidate = path.join(REACTION_CLIPS_DIR, chosenTopic.videoFile);
    if (fs.existsSync(candidate)) {
      videoPath = candidate;
      skit.defaultMonitorScene = chosenTopic.scene;
      for (const b of skit.beats || []) {
        if (!b.natGeoScene) b.natGeoScene = chosenTopic.scene;
      }
    }
  }

  // Ensure episode duration is strictly within [22.0, 30.0] seconds
  const totalSecRaw = skit.beats.reduce((acc, b) => acc + (b.durationSec || 4.2), 0);
  if (totalSecRaw < 22.0 && skit.beats.length > 0) {
    const deficit = 22.4 - totalSecRaw; // Target ~22.4s for safe margin >= 22.0s
    skit.beats[skit.beats.length - 1].durationSec =
      (skit.beats[skit.beats.length - 1].durationSec || 4.2) + deficit;
  }

  const framesDir = path.join(CACHE_DIR, `frames_${skit.id}`);
  fs.mkdirSync(framesDir, { recursive: true });

  const htmlPath = path.join(CACHE_DIR, `renderer_${skit.id}.html`);
  fs.writeFileSync(htmlPath, buildStudioCanvasRendererHtml(skit, productDataUrl, Boolean(videoPath)), 'utf8');

  // True 30fps capture
  const fps = 30;
  const totalSec = skit.beats.reduce((acc, b) => acc + (b.durationSec || 4.2), 0);
  const totalFrames = Math.round(totalSec * fps);

  const port = 9260 + Math.floor(Math.random() * 50);
  const userDataDir = path.join(CACHE_DIR, `chrome-profile-${port}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=1080,1920',
      `file://${htmlPath.replace(/\\/g, '/')}`,
    ],
    { stdio: 'ignore' }
  );

  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      await sleep(250);
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        const pages = await res.json();
        const page = pages.find((p) => p.type === 'page' && p.webSocketDebuggerUrl);
        if (page) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }
    if (!wsUrl) throw new Error('Could not connect to Headless Chrome');

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = msgId++;
        const listener = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener('message', listener);
            if (data.error) reject(new Error(data.error.message));
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', listener);
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Runtime.enable');
    await sleep(300);

    for (let f = 0; f < totalFrames; f++) {
      const res = await send('Runtime.evaluate', {
        expression: `window.renderEpisodeFrame(${f}, ${fps})`,
        returnByValue: true,
      });
      const dataUrl = res?.result?.value;
      if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
        const padded = String(f).padStart(4, '0');
        fs.writeFileSync(
          path.join(framesDir, `frame_${padded}.png`),
          Buffer.from(dataUrl.replace('data:image/png;base64,', ''), 'base64')
        );
      }
    }
    ws.close();
  } finally {
    try {
      chrome.kill();
    } catch {}
    try {
      fs.rmSync(htmlPath, { force: true });
    } catch {}
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {}
  }

  // Synthesize 44.1kHz Stereo WAV with flow music and ducking
  const wavPath = path.join(CACHE_DIR, `${skit.id}.wav`);
  await synthesizeEpisodeAudio(skit, wavPath, musicOptions);

  const outFilename = `${skit.id}-9x16.mp4`;
  const outMp4Path = path.join(VIDEOS_DIR, outFilename);
  const mirrorMp4Path = path.join(EXPORT_DIR, outFilename);
  const tmpMp4Path = path.join(CACHE_DIR, `${skit.id}-9x16.tmp.mp4`);

  if (videoPath && fs.existsSync(videoPath)) {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-stream_loop', '-1',
        '-i', videoPath,
        '-framerate', String(fps), // -framerate 30
        '-i', path.join(framesDir, 'frame_%04d.png'),
        '-i', wavPath,
        '-filter_complex',
        'color=c=black:s=1080x1920:r=30[bg];' +
          "[0:v]scale=924:532:force_original_aspect_ratio=increase,crop=864:496:x='30+22*sin(t*0.75)':y='18+12*cos(t*0.6)',fps=30[vid];" +
          '[bg][vid]overlay=108:136:shortest=1[withvid];' +
          '[withvid][1:v]overlay=0:0:shortest=1,fps=30[outv]',
        '-map', '[outv]',
        '-map', '2:a',
        '-r', '30',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'high',
        '-level', '4.1',
        '-b:v', '2500k',
        '-maxrate', '3500k',
        '-bufsize', '5000k',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-movflags', '+faststart',
        '-shortest',
        tmpMp4Path,
      ],
      { stdio: 'ignore' }
    );
  } else {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-framerate', String(fps), // -framerate 30
        '-i', path.join(framesDir, 'frame_%04d.png'),
        '-i', wavPath,
        '-r', '30',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'high',
        '-level', '4.1',
        '-b:v', '2500k',
        '-maxrate', '3500k',
        '-bufsize', '5000k',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-movflags', '+faststart',
        '-shortest',
        tmpMp4Path,
      ],
      { stdio: 'ignore' }
    );
  }

  fs.copyFileSync(tmpMp4Path, outMp4Path);
  fs.copyFileSync(tmpMp4Path, mirrorMp4Path);
  try { fs.rmSync(tmpMp4Path, { force: true }); } catch {}
  try { fs.rmSync(framesDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
  try { fs.rmSync(wavPath, { force: true }); } catch {}
  return outMp4Path;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PUBLIC EPISODE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export async function generateFreshAiEpisode(options = {}) {
  const args = process.argv.slice(2);
  const formatArg = options.format || args.find((a) => a.startsWith('--format='))?.split('=')[1];
  const productArg = options.productId || args.find((a) => a.startsWith('--product='))?.split('=')[1];
  const customVideoArg = options.video || args.find((a) => a.startsWith('--video='))?.split('=')[1];
  const customTopicArg = options.topic || args.find((a) => a.startsWith('--topic='))?.split('=')[1];
  const moodArg = options.mood || args.find((a) => a.startsWith('--mood='))?.split('=')[1];
  const musicArg = options.music || args.find((a) => a.startsWith('--music='))?.split('=')[1];
  const forceProcedural = options.forceProcedural ?? (args.includes('--procedural') || !process.env.GEMINI_API_KEY);

  // Ensure the dynamic Shop TV clip pool is populated and harvest on-demand topic clips if requested
  try {
    await ensureFreshTvClipPool(customTopicArg);
  } catch (err) {
    console.warn(`   ⚠️ Shop TV clip harvester note: ${err.message}`);
  }

  // Invoke Commentary Engine (handles format selection, product cooldown, ledger sync)
  const commentaryResult = await generateCommentaryEpisode({
    format: formatArg,
    productId: productArg,
    videoClipPath: customVideoArg,
    customTopic: customTopicArg,
    forceProcedural,
  });

  const { skit, format, source, ledgerEntry } = commentaryResult;
  skit.format = format;

  const FORMAT_TO_MOOD = {
    wild_nature_commentary: 'morning_dew',
    chaotic_grandma_hot_takes: 'mystic_math',
    cozy_boutique_lore: 'deep_subwoofer',
    vintage_relic_debates: 'cozy_nostalgia',
    gen_z_culture_clash: 'twilight_dreams',
    craft_breakdown_asmr: 'gentle_rain',
  };
  const selectedMood = moodArg || FORMAT_TO_MOOD[format] || 'cozy_nostalgia';

  let reactionVideoPath = null;
  if (ledgerEntry.clipFile) {
    const candidate = path.join(REACTION_CLIPS_DIR, ledgerEntry.clipFile);
    if (fs.existsSync(candidate)) reactionVideoPath = candidate;
  } else if (customVideoArg && fs.existsSync(path.resolve(ROOT_DIR, customVideoArg))) {
    reactionVideoPath = path.resolve(ROOT_DIR, customVideoArg);
  } else {
    const existingCount = fs.existsSync(AI_SKITS_PATH)
      ? JSON.parse(fs.readFileSync(AI_SKITS_PATH, 'utf8')).length
      : 0;
    const topicObj = BUILTIN_REACTION_TOPICS[existingCount % BUILTIN_REACTION_TOPICS.length];
    const candidate = path.join(REACTION_CLIPS_DIR, topicObj.videoFile);
    if (fs.existsSync(candidate)) {
      reactionVideoPath = candidate;
      skit.reactionVideoFile = topicObj.videoFile;
      skit.defaultMonitorScene = topicObj.scene;
      for (const b of skit.beats || []) {
        if (!b.natGeoScene) b.natGeoScene = topicObj.scene;
      }
    }
  }

  console.log(`🎬 Generated Episode: "${skit.title}"`);
  console.log(`   📚 Format: [${format}] | Source: ${source} | Beats: ${skit.beats.length} | Mood: [${selectedMood}]`);
  console.log(`   🎁 Featured Trinket: "${ledgerEntry.productTitle}"`);
  if (reactionVideoPath) {
    console.log(`   📺 Top Reaction Clip: ${path.basename(reactionVideoPath)}`);
  }

  const outMp4Path = await compileSkitStandalone(skit, reactionVideoPath, {
    mood: selectedMood,
    customTrackPath: musicArg,
  });

  const outFilename = path.basename(outMp4Path);
  const stat = fs.statSync(outMp4Path);
  console.log(`   ✅ Compiled 1080x1920 30fps Master MP4: public/exports/videos/${outFilename} (${Math.round(stat.size / 1024)} KB)`);

  const existing = fs.existsSync(AI_SKITS_PATH)
    ? JSON.parse(fs.readFileSync(AI_SKITS_PATH, 'utf8'))
    : [];
  existing.unshift({
    ...skit,
    format,
    videoFilename: outFilename,
    reactionVideoFile: reactionVideoPath ? path.basename(reactionVideoPath) : undefined,
    createdAt: new Date().toISOString(),
  });
  fs.writeFileSync(AI_SKITS_PATH, JSON.stringify(existing.slice(0, 100), null, 2), 'utf8');

  return { skit, videoFilename: outFilename, fullPath: outMp4Path };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  generateFreshAiEpisode().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
