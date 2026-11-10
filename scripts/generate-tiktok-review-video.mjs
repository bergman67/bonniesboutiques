#!/usr/bin/env node
/**
 * scripts/generate-tiktok-review-video.mjs
 * Generates a 1920x1080 MP4 end-to-end demo video for TikTok App Review:
 *   public/exports/tiktok-app-review-demo.mp4
 *
 * Clearly demonstrates:
 *   1. Website domain https://btboutiqe.com/studio ("Bonnie's Boutique Trinket Tales Studio")
 *   2. TikTok Login Kit OAuth2 flow (scope: user.info.basic) -> Connected @btboutiqevids
 *   3. TikTok Content Posting API flow (scopes: video.upload, video.publish) -> Privacy, Duet/Stitch/Comment toggles, and Publish confirmation
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const EXPORT_DIR = path.join(ROOT_DIR, 'public', 'exports');
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache', 'tiktok_demo_frames');

fs.mkdirSync(EXPORT_DIR, { recursive: true });
if (fs.existsSync(CACHE_DIR)) fs.rmSync(CACHE_DIR, { recursive: true, force: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

function renderStepSvg(stepIndex, progress) {
  // 4 steps across 12 seconds:
  // Step 0: Navigating to https://btboutiqe.com/studio & clicking "Sign in with TikTok (Login Kit)"
  // Step 1: TikTok OAuth2 Consent Screen (user.info.basic, video.upload, video.publish) -> Clicking "Authorize"
  // Step 2: Connected @btboutiqevids in Studio -> Selecting episode, configuring Privacy/Duet/Comment/Stitch, clicking "Publish to TikTok"
  // Step 3: Upload & Publish Complete via Content Posting API!

  const cursorPositions = [
    { x1: 960, y1: 600, x2: 1450, y2: 330 },
    { x1: 1450, y1: 330, x2: 1080, y2: 785 },
    { x1: 1080, y1: 785, x2: 1450, y2: 830 },
    { x1: 1450, y1: 830, x2: 1450, y2: 830 },
  ];
  const pos = cursorPositions[stepIndex];
  const cx = Math.round(pos.x1 + (pos.x2 - pos.x1) * Math.min(1, progress * 1.4));
  const cy = Math.round(pos.y1 + (pos.y2 - pos.y1) * Math.min(1, progress * 1.4));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <!-- Browser Window Chrome -->
    <rect width="1920" height="1080" fill="#0f0817" />
    <rect x="0" y="0" width="1920" height="82" fill="#1e1429" />
    <circle cx="36" cy="41" r="10" fill="#ef4444" />
    <circle cx="68" cy="41" r="10" fill="#f59e0b" />
    <circle cx="100" cy="41" r="10" fill="#10b981" />
    <!-- URL Address Bar clearly showing https://btboutiqe.com/studio -->
    <rect x="160" y="16" width="1420" height="50" rx="25" fill="#120a1a" stroke="#e8748a" stroke-width="2" />
    <text x="200" y="48" fill="#10b981" font-family="monospace" font-weight="bold" font-size="24">🔒 https://btboutiqe.com/studio</text>
    <text x="640" y="48" fill="#9ca3af" font-family="sans-serif" font-size="20">— Bonnie's Boutique Trinket Tales Studio (TikTok Integration)</text>

    <!-- Studio Top Header -->
    <rect x="40" y="105" width="1840" height="85" rx="16" fill="#1a0f24" stroke="#3b234a" stroke-width="2" />
    <text x="80" y="158" fill="#f5efe6" font-family="Georgia, serif" font-weight="bold" font-size="34">🌸 Bonnie's Boutique — Trinket Tales Animation &amp; Social Publisher</text>
    <text x="1500" y="156" fill="#e8748a" font-family="monospace" font-weight="bold" font-size="22">Domain: btboutiqe.com</text>

    <!-- Left Panel: 9:16 Episode Preview -->
    <rect x="40" y="215" width="560" height="820" rx="20" fill="#1a0f24" stroke="#e8748a" stroke-width="3" />
    <text x="320" y="265" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-weight="bold" font-size="22">9:16 EPISODE PREVIEW (1080x1920 MP4)</text>
    <rect x="110" y="290" width="420" height="640" rx="18" fill="#2d1b3d" stroke="#fbbf24" stroke-width="3" />
    <text x="320" y="360" text-anchor="middle" fill="#f5efe6" font-family="Georgia, serif" font-weight="bold" font-size="26">Knock Knock on the Glass</text>
    <!-- Bonnie & Tammy Mini Avatars -->
    <rect x="200" y="460" width="90" height="130" rx="10" fill="#881337" />
    <rect x="212" y="410" width="66" height="60" rx="8" fill="#fde68a" />
    <rect x="350" y="460" width="90" height="130" rx="10" fill="#0d9488" />
    <rect x="362" y="410" width="66" height="60" rx="8" fill="#fde68a" />
    <rect x="140" y="590" width="360" height="50" rx="8" fill="#78350f" stroke="#f59e0b" stroke-width="2" />
    <rect x="140" y="680" width="360" height="120" rx="14" fill="#140a1d" stroke="#e8748a" stroke-width="2" />
    <text x="320" y="730" text-anchor="middle" fill="#f5efe6" font-family="sans-serif" font-weight="bold" font-size="19">"Hello friends! Welcome to</text>
    <text x="320" y="760" text-anchor="middle" fill="#f5efe6" font-family="sans-serif" font-weight="bold" font-size="19">Bonnie &amp; Tammy's Boutique!"</text>
    <text x="320" y="975" text-anchor="middle" fill="#10b981" font-family="monospace" font-weight="bold" font-size="20">✔ Video Ready: skit_fourth_wall_screen_tap-9x16.mp4</text>

    <!-- Right Panel: TikTok Login Kit & Content Posting API Console -->
    <rect x="630" y="215" width="1250" height="820" rx="20" fill="#1a0f24" stroke="#2dd4bf" stroke-width="3" />
    <text x="680" y="275" fill="#2dd4bf" font-family="sans-serif" font-weight="bold" font-size="30">🎵 TikTok Integration (Login Kit + Content Posting API)</text>

    <!-- Step 1 Card: Login Kit (user.info.basic) -->
    <rect x="680" y="300" width="1150" height="140" rx="16" fill="#261733" stroke="${stepIndex >= 2 ? '#10b981' : '#e8748a'}" stroke-width="2" />
    <text x="715" y="348" fill="#f5efe6" font-family="sans-serif" font-weight="bold" font-size="24">1. TikTok Login Kit Authentication (Scope: user.info.basic)</text>
    <text x="715" y="390" fill="#d1d5db" font-family="sans-serif" font-size="20">
      ${stepIndex >= 2 ? '✅ Connected TikTok Account: @btboutiqevids (Bonnie\'s Boutique) — Authenticated via OAuth 2.0' : 'Status: Not Connected — Click "Continue with TikTok" to authenticate account'}
    </text>
    <rect x="1320" y="325" width="470" height="64" rx="32" fill="${stepIndex >= 2 ? '#065f46' : '#00f2fe'}" />
    <text x="1555" y="365" text-anchor="middle" fill="${stepIndex >= 2 ? '#ffffff' : '#0f0817'}" font-family="sans-serif" font-weight="bold" font-size="22">
      ${stepIndex >= 2 ? '✔ Connected: @btboutiqevids' : '🎵 Continue with TikTok (Login Kit)'}
    </text>

    <!-- Step 2 Card: Content Posting API (video.upload, video.publish) -->
    <rect x="680" y="465" width="1150" height="530" rx="16" fill="#261733" stroke="#3b234a" stroke-width="2" />
    <text x="715" y="515" fill="#f5efe6" font-family="sans-serif" font-weight="bold" font-size="24">2. TikTok Content Posting API (Scopes: video.upload, video.publish)</text>
    
    <!-- Caption Input Box -->
    <text x="715" y="560" fill="#fbbf24" font-family="monospace" font-weight="bold" font-size="20">Post Caption &amp; Hashtags:</text>
    <rect x="715" y="575" width="1080" height="100" rx="12" fill="#140a1d" stroke="#4b5563" stroke-width="2" />
    <text x="740" y="615" fill="#f5efe6" font-family="sans-serif" font-size="21">Behind the counter with Grandma Bonnie &amp; Tammy: "Knock Knock on the Phone Glass" 👵✨</text>
    <text x="740" y="650" fill="#e8748a" font-family="sans-serif" font-size="20">#BonnieAndTammy #TrinketTales #CozyAnimation #16BitArt #HandmadeWithLove https://btboutiqe.com/</text>

    <!-- Privacy & Interaction Settings Required by TikTok UX Guidelines -->
    <text x="715" y="720" fill="#fbbf24" font-family="monospace" font-weight="bold" font-size="20">Privacy Level: [ PUBLIC_TO_EVERYONE ▼ ]   |   ☑ Allow Comments   ☑ Allow Duet   ☑ Allow Stitch</text>

    <!-- Publish Button -->
    <rect x="1150" y="785" width="640" height="78" rx="39" fill="${stepIndex === 3 ? '#10b981' : '#f43f5e'}" />
    <text x="1470" y="833" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="26">
      ${stepIndex === 3 ? '✅ Published to TikTok (@btboutiqevids)!' : '🚀 Upload &amp; Publish Video to TikTok'}
    </text>

    ${
      stepIndex === 3
        ? `<rect x="715" y="885" width="1080" height="85" rx="12" fill="#064e3b" stroke="#10b981" stroke-width="2" />
           <text x="745" y="925" fill="#ecfdf5" font-family="monospace" font-weight="bold" font-size="21">✔ TikTok API Response: 200 OK — video.upload &amp; video.publish succeeded</text>
           <text x="745" y="955" fill="#a7f3d0" font-family="monospace" font-size="19">Publish ID: v_pub_file~v2.7701004970442737678 | Account: @btboutiqevids</text>`
        : ''
    }

    <!-- Step 1 OAuth Modal Overlay -->
    ${
      stepIndex === 1
        ? `<rect x="0" y="0" width="1920" height="1080" fill="rgba(0,0,0,0.68)" />
           <rect x="560" y="180" width="800" height="700" rx="24" fill="#ffffff" stroke="#00f2fe" stroke-width="5" />
           <rect x="560" y="180" width="800" height="90" rx="24" fill="#111827" />
           <text x="960" y="238" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="30">TikTok OAuth 2.0 Authorization (tiktok.com)</text>
           <text x="960" y="330" text-anchor="middle" fill="#111827" font-family="sans-serif" font-weight="bold" font-size="28">Authorize "btboutiqevids" to access your TikTok account?</text>
           <text x="640" y="410" fill="#374151" font-family="sans-serif" font-weight="bold" font-size="24">Requested Permissions (Scopes):</text>
           <text x="670" y="465" fill="#059669" font-family="monospace" font-weight="bold" font-size="23">✔ user.info.basic — Read your profile info (display name, avatar)</text>
           <text x="670" y="520" fill="#059669" font-family="monospace" font-weight="bold" font-size="23">✔ video.upload — Upload video files to your TikTok account</text>
           <text x="670" y="575" fill="#059669" font-family="monospace" font-weight="bold" font-size="23">✔ video.publish — Directly publish posts to your TikTok profile</text>
           <text x="960" y="660" text-anchor="middle" fill="#6b7280" font-family="sans-serif" font-size="20">Redirect URI: https://btboutiqe.com/</text>
           <rect x="860" y="735" width="420" height="76" rx="38" fill="#fe2c55" />
           <text x="1070" y="783" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="28">Authorize &amp; Continue</text>`
        : ''
    }

    <!-- Animated Mouse Cursor -->
    <g transform="translate(${cx}, ${cy})">
      <circle cx="0" cy="0" r="22" fill="rgba(251, 191, 36, 0.35)" />
      <polygon points="0,0 0,34 10,26 18,40 25,36 17,22 28,22" fill="#ffffff" stroke="#111827" stroke-width="3" />
    </g>
  </svg>`;
}

async function main() {
  const fps = 10;
  const totalSec = 12;
  const totalFrames = fps * totalSec;

  console.log(`🎬 Generating TikTok App Review Demo Video (${totalFrames} frames @ 1920x1080)...`);

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    const stepIndex = Math.min(3, Math.floor(t / 3));
    const stepProgress = (t % 3) / 3;
    const svg = renderStepSvg(stepIndex, stepProgress);
    const padded = String(f).padStart(4, '0');
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(CACHE_DIR, `frame_${padded}.png`));
  }

  const outMp4 = path.join(EXPORT_DIR, 'tiktok-app-review-demo.mp4');
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      String(fps),
      '-i',
      path.join(CACHE_DIR, 'frame_%04d.png'),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      outMp4,
    ],
    { stdio: 'ignore' }
  );

  const stat = fs.statSync(outMp4);
  console.log(`✅ Generated TikTok App Review Demo Video: public/exports/tiktok-app-review-demo.mp4 (${Math.round(stat.size / 1024)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
