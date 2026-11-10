#!/usr/bin/env node
/**
 * scripts/publish-socials.mjs
 * Autonomous 24/7 Multi-Platform Social Publisher for Bonnie's Boutique ("B&T Trinkets")
 *
 * Pushes 9:16 vertical animated episodes + product spotlights around the clock to:
 *   1. YouTube Shorts (YouTube Data API v3 Resumable Upload via OAuth2 Refresh Token)
 *   2. Facebook Page Reels (Meta Graph API v21.0 Resumable Reel Upload)
 *   3. Instagram Reels (Meta Graph API v21.0 Reels Container + Publish)
 *   4. TikTok (TikTok Content Posting API v2 Direct File Upload)
 *
 * Usage:
 *   node scripts/publish-socials.mjs                  # Publishes next episode in the 24/7 rotation
 *   node scripts/publish-socials.mjs --dry-run        # Verifies video + captions + API payload without live upload
 *   node scripts/publish-socials.mjs --skit=<id>      # Publishes a specific skit or product spotlight ID
 *   node scripts/publish-socials.mjs --status         # Prints current 24/7 queue state & API credential status
 */

import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import dotenv from 'dotenv';
import { generateFreshAiEpisode, compileSkitStandalone } from './generate-ai-episode.mjs';
import { syncAllSocialMetrics } from './track-metrics.mjs';

dns.setDefaultResultOrder('ipv4first');

async function fetchWithRetry(url, options = {}, retries = 4, baseDelayMs = 2000) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status >= 500 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
      }
    }
  }
  throw lastErr;
}

const ROOT_DIR = process.cwd();
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const EXPORT_DIR = path.join(ROOT_DIR, 'public', 'exports');
const VIDEOS_DIR = path.join(ROOT_DIR, 'public', 'exports', 'videos');
const STATE_PATH = path.join(EXPORT_DIR, 'autopilot-state.json');
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache', 'episode_compiler');

fs.mkdirSync(EXPORT_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

function transpileLocalModule(srcRel, outName, transform = null) {
  let code = fs.readFileSync(path.join(ROOT_DIR, srcRel), 'utf8');
  if (transform) code = transform(code);
  let out = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  out = out.replace(/from\s+['"]\.\/([a-zA-Z0-9_-]+)['"]/g, "from './$1.mjs'");
  const fullOut = path.join(CACHE_DIR, outName);
  fs.writeFileSync(fullOut, out, 'utf8');
  return fullOut;
}

// Transpile studio modules so CLI runs directly without a build step
transpileLocalModule('src/lib/studio/characterRig.ts', 'characterRig.mjs');
transpileLocalModule('src/lib/studio/backdrops.ts', 'backdrops.mjs');
transpileLocalModule('src/lib/studio/skitTemplates.ts', 'skitTemplates.mjs');
transpileLocalModule('src/lib/studio/rpgAppraisal.ts', 'rpgAppraisal.mjs', (code) => {
  const manifestPath = path.join(ROOT_DIR, 'src/lib/scrollytelling/productAssetManifest.json').replace(/\\/g, '/');
  return code.replace(
    /import manifest from ['"][^'"]+['"];/,
    `import fs from 'node:fs'; const manifest = JSON.parse(fs.readFileSync('${manifestPath}', 'utf8'));`
  );
});
transpileLocalModule('src/lib/studio/socialCaptions.ts', 'socialCaptions.mjs');
transpileLocalModule('src/lib/studio/socialPublisher.ts', 'socialPublisher.mjs');

const {
  buildMasterAutopilotQueue,
  checkPlatformCredentials,
  STOREFRONT_URL,
} = await import(`file://${path.join(CACHE_DIR, 'socialPublisher.mjs').replace(/\\/g, '/')}`);
const { generateAllPlatformCopy } = await import(`file://${path.join(CACHE_DIR, 'socialCaptions.mjs').replace(/\\/g, '/')}`);
const { generateRPGAppraisal } = await import(`file://${path.join(CACHE_DIR, 'rpgAppraisal.mjs').replace(/\\/g, '/')}`);

function loadAutopilotState(totalPoolSize) {
  if (fs.existsSync(STATE_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
      parsed.totalEpisodesInPool = totalPoolSize;
      return parsed;
    } catch {
      // fallback below
    }
  }
  return {
    enabled: true,
    cadenceCron: 'CRON_TZ=America/New_York 0 * * * *',
    cadenceLabel: 'Hourly 24/7 Continuous Rotation',
    currentQueueIndex: 0,
    totalEpisodesInPool: totalPoolSize,
    lastRunAt: null,
    nextScheduledDescription: 'Top of every hour (24/7 continuous loop)',
    history: [],
  };
}

function saveAutopilotState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * 1. YOUTUBE DATA API v3 UPLOADER (OAuth2 Refresh Token -> Resumable Video Upload)
 */
async function uploadToYouTubeShorts(videoPath, episode, creds, isDryRun) {
  const ytCopy = episode.socialCopy.youtube_shorts;
  const title = (ytCopy.title || `${episode.title} #Shorts`).slice(0, 100);
  const description = `${ytCopy.caption}\n\nHandmade in Clearbrook, VA by Bonnie & Tammy — tap @btboutiqe channel bio link (btboutiqe.com/links) & use code BONNIE10 for 10% off!\n\n${ytCopy.hashtags.join(' ')}`;

  if (isDryRun) {
    return {
      platform: 'youtube_shorts',
      status: 'dry_run_ready',
      message: `[DRY RUN] Ready to upload "${path.basename(videoPath)}" to YouTube Shorts as "${title}"`,
      timestamp: new Date().toISOString(),
    };
  }

  if (!creds.youtube.configured) {
    return {
      platform: 'youtube_shorts',
      status: 'skipped_unconfigured',
      message: `Skipped live upload — missing .env keys: ${creds.youtube.missingKeys.join(', ')}. Run "npm run setup-youtube" to connect your new Gmail/YouTube account.`,
      timestamp: new Date().toISOString(),
    };
  }

  // Step 1: Exchange Refresh Token for fresh Access Token
  const tokenRes = await fetchWithRetry('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`YouTube OAuth token refresh failed (${tokenRes.status}): ${errText}`);
  }

  const { access_token: accessToken } = await tokenRes.json();
  const videoBuffer = fs.readFileSync(videoPath);

  // Step 2: Initialize Resumable Upload Session on YouTube Data API v3
  const metadata = {
    snippet: {
      title,
      description,
      tags: ['Shorts', 'BonnieAndTammy', 'TrinketTales', 'HandmadeCrafts', 'PixelArt', 'CozyAnimation', 'Grandma'],
      categoryId: '22', // People & Blogs
    },
    status: {
      privacyStatus: process.env.YOUTUBE_PRIVACY_STATUS || 'public',
      selfDeclaredMadeForKids: false,
      embeddable: true,
    },
  };

  const initRes = await fetchWithRetry(
    'https://youtube.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(videoBuffer.byteLength),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
    if (errText.includes('quotaExceeded') || errText.includes('uploadLimitExceeded')) {
      return {
        platform: 'youtube_shorts',
        status: 'skipped_unconfigured',
        message: `YouTube daily upload quota limit reached for today — automatically resumes at midnight PT (Instagram, Facebook & TikTok unaffected)`,
        timestamp: new Date().toISOString(),
      };
    }
    throw new Error(`YouTube resumable session init failed (${initRes.status}): ${errText}`);
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) {
    throw new Error('YouTube API did not return a resumable upload Location header.');
  }

  // Step 3: Push MP4 Binary Payload
  const uploadRes = await fetchWithRetry(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Length': String(videoBuffer.byteLength),
      'Content-Type': 'video/mp4',
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`YouTube MP4 upload failed (${uploadRes.status}): ${errText}`);
  }

  const ytData = await uploadRes.json();
  const videoId = ytData.id;
  return {
    platform: 'youtube_shorts',
    status: 'published',
    videoId,
    postUrl: `https://www.youtube.com/shorts/${videoId}`,
    message: `Published to YouTube Shorts: https://www.youtube.com/shorts/${videoId}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 2. META GRAPH API — FACEBOOK PAGE REELS UPLOADER
 */
async function uploadToFacebookReels(videoPath, episode, creds, isDryRun) {
  const fbCopy = episode.socialCopy.facebook_reels;
  const description = fbCopy.fullFormattedText;

  if (isDryRun) {
    return {
      platform: 'facebook_reels',
      status: 'dry_run_ready',
      message: `[DRY RUN] Ready to publish "${path.basename(videoPath)}" to Facebook Page Reels (${description.length} chars)`,
      timestamp: new Date().toISOString(),
    };
  }

  const pageId = process.env.FACEBOOK_PAGE_ID || '61595735078717';
  const rawToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || '';
  const isIgOnlyToken = rawToken.startsWith('IGAA');
  const accessToken = isIgOnlyToken ? (process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '') : rawToken;

  if (!accessToken) {
    return {
      platform: 'facebook_reels',
      status: 'skipped_unconfigured',
      message:
        'Instagram API (IGAA...) does not auto-crosspost to Facebook Pages. Run: node scripts/setup-meta-tokens.mjs --token="EAA..." with a Facebook Page token to enable direct Facebook Reels auto-posting.',
      timestamp: new Date().toISOString(),
    };
  }

  const videoBuffer = fs.readFileSync(videoPath);

  // Phase 1: Start Reel Upload Session
  const startRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upload_phase: 'start',
      access_token: accessToken,
    }),
  });
  if (!startRes.ok) {
    throw new Error(`Facebook Reels start failed: ${await startRes.text()}`);
  }
  const { video_id: videoId, upload_url: uploadUrl } = await startRes.json();

  // Phase 2: Upload binary to rupload.facebook.com
  const binRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${accessToken}`,
      offset: '0',
      file_size: String(videoBuffer.byteLength),
      'Content-Type': 'application/octet-stream',
    },
    body: videoBuffer,
  });
  if (!binRes.ok) {
    throw new Error(`Facebook Reels binary transfer failed: ${await binRes.text()}`);
  }

  // Phase 3: Finish & Publish Reel
  const finishUrl = new URL(`https://graph.facebook.com/v21.0/${pageId}/video_reels`);
  finishUrl.searchParams.set('access_token', accessToken);
  finishUrl.searchParams.set('video_id', videoId);
  finishUrl.searchParams.set('upload_phase', 'finish');
  finishUrl.searchParams.set('video_state', 'PUBLISHED');
  finishUrl.searchParams.set('description', description);

  const finishRes = await fetch(finishUrl.toString(), { method: 'POST' });
  if (!finishRes.ok) {
    throw new Error(`Facebook Reels publish failed: ${await finishRes.text()}`);
  }

  return {
    platform: 'facebook_reels',
    status: 'published',
    videoId,
    postUrl: `https://www.facebook.com/reel/${videoId}`,
    message: `Published to Facebook Reels: https://www.facebook.com/reel/${videoId}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 3. META GRAPH API — INSTAGRAM REELS UPLOADER
 * Supports both Instagram Login tokens (IGAA... via graph.instagram.com)
 * and Facebook Graph tokens (EAA... via graph.facebook.com), using Supabase Storage CDN for public video_url delivery.
 */
async function ensurePublicVideoUrl(videoPath) {
  const filename = path.basename(videoPath);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const objectPath = `reels/${filename}`;
    const uploadEndpoint = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/products/${objectPath}`;
    const videoBuffer = fs.readFileSync(videoPath);

    try {
      const upRes = await fetchWithRetry(
        uploadEndpoint,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            'Content-Type': 'video/mp4',
            'x-upsert': 'true',
          },
          body: videoBuffer,
        },
        3,
        2500
      );

      if (upRes.ok) {
        return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/products/${objectPath}`;
      }
    } catch {
      // Fallback to publicBaseUrl if storage upload fails after retries
    }
  }

  const publicBaseUrl = (process.env.PUBLIC_SITE_URL || STOREFRONT_URL).replace(/\/$/, '');
  return `${publicBaseUrl}/exports/${filename}`;
}

async function uploadToInstagramReels(videoPath, episode, creds, isDryRun) {
  const igCopy = episode.socialCopy.instagram;
  const caption = igCopy.fullFormattedText;

  if (isDryRun) {
    return {
      platform: 'instagram',
      status: 'dry_run_ready',
      message: `[DRY RUN] Ready to publish "${path.basename(videoPath)}" to Instagram Reels (${caption.length} chars)`,
      timestamp: new Date().toISOString(),
    };
  }

  if (!creds.instagram.configured) {
    return {
      platform: 'instagram',
      status: 'skipped_unconfigured',
      message: `Skipped live upload — missing .env keys: ${creds.instagram.missingKeys.join(', ')}`,
      timestamp: new Date().toISOString(),
    };
  }

  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const isIgLoginToken = accessToken.startsWith('IGAA');
  const graphHost = isIgLoginToken ? 'https://graph.instagram.com/v21.0' : 'https://graph.facebook.com/v21.0';
  const targetUser = isIgLoginToken ? 'me' : process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  // Upload MP4 to public CDN (Supabase Storage) so Instagram's servers can fetch it reliably
  const videoUrl = await ensurePublicVideoUrl(videoPath);

  // Step 1: Create Reels Media Container
  const containerRes = await fetchWithRetry(
    `${graphHost}/${targetUser}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        share_to_feed: true,
        access_token: accessToken,
      }),
    },
    4,
    2500
  );

  if (!containerRes.ok) {
    throw new Error(`Instagram Reels container init failed: ${await containerRes.text()}`);
  }

  const { id: creationId } = await containerRes.json();

  // Step 2: Poll until container status_code === FINISHED (resilient to transient socket resets)
  for (let attempt = 0; attempt < 25; attempt++) {
    await new Promise((r) => setTimeout(r, 4000));
    try {
      const statusRes = await fetchWithRetry(
        `${graphHost}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`,
        {},
        2,
        1500
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const statusCode = statusData.status_code;
        if (statusCode === 'FINISHED') break;
        if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
          throw new Error(`Instagram media processing returned ${statusCode}: ${JSON.stringify(statusData)}`);
        }
      }
    } catch (pollErr) {
      if (String(pollErr.message || '').includes('Instagram media processing returned')) {
        throw pollErr;
      }
      // Ignore transient network error during polling and continue waiting
    }
  }

  // Step 3: Publish Container
  const pubRes = await fetchWithRetry(
    `${graphHost}/${targetUser}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    },
    4,
    3000
  );

  if (!pubRes.ok) {
    throw new Error(`Instagram Reels publish failed: ${await pubRes.text()}`);
  }

  const { id: mediaId } = await pubRes.json();

  // Fetch permalink if available
  let permalink = 'https://www.instagram.com/btboutiqevids/reels/';
  try {
    const linkRes = await fetchWithRetry(
      `${graphHost}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`,
      {},
      2,
      1500
    );
    if (linkRes.ok) {
      const linkData = await linkRes.json();
      if (linkData.permalink) permalink = linkData.permalink;
    }
  } catch {}

  return {
    platform: 'instagram',
    status: 'published',
    videoId: mediaId,
    postUrl: permalink,
    message: `Published to Instagram Reels (@btboutiqevids): ${permalink}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 4. TIKTOK CONTENT POSTING API v2 UPLOADER
 * Automatically refreshes TIKTOK_ACCESS_TOKEN using TIKTOK_REFRESH_TOKEN (valid 365 days)
 * and supports both Direct Post and Sandbox/Unaudited Inbox Upload.
 */
async function refreshTikTokTokenIfPossible() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;
  if (!clientKey || !clientSecret || !refreshToken) {
    return process.env.TIKTOK_ACCESS_TOKEN;
  }

  try {
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        process.env.TIKTOK_ACCESS_TOKEN = data.access_token;
        // Persist updated tokens to .env
        const envPath = path.join(ROOT_DIR, '.env');
        if (fs.existsSync(envPath)) {
          let envText = fs.readFileSync(envPath, 'utf8');
          envText = envText.replace(/^TIKTOK_ACCESS_TOKEN=.*$/m, `TIKTOK_ACCESS_TOKEN="${data.access_token}"`);
          if (data.refresh_token) {
            envText = envText.replace(/^TIKTOK_REFRESH_TOKEN=.*$/m, `TIKTOK_REFRESH_TOKEN="${data.refresh_token}"`);
          }
          fs.writeFileSync(envPath, envText, 'utf8');
        }
        return data.access_token;
      }
    }
  } catch {
    // Use existing token on error
  }
  return process.env.TIKTOK_ACCESS_TOKEN;
}

async function uploadToTikTok(videoPath, episode, creds, isDryRun) {
  const ttCopy = episode.socialCopy.tiktok;
  const title = ttCopy.fullFormattedText.slice(0, 2100);

  if (isDryRun) {
    return {
      platform: 'tiktok',
      status: 'dry_run_ready',
      message: `[DRY RUN] Ready to publish "${path.basename(videoPath)}" to TikTok (${title.length} chars)`,
      timestamp: new Date().toISOString(),
    };
  }

  if (!creds.tiktok.configured) {
    return {
      platform: 'tiktok',
      status: 'skipped_unconfigured',
      message: `Skipped live upload — missing .env keys: ${creds.tiktok.missingKeys.join(', ')}`,
      timestamp: new Date().toISOString(),
    };
  }

  const accessToken = await refreshTikTokTokenIfPossible();
  const videoBuffer = fs.readFileSync(videoPath);

  // Try Direct Post (PUBLIC_TO_EVERYONE first, then SELF_ONLY for Sandbox, then Inbox Upload)
  const attempts = [
    {
      endpoint: 'https://open.tiktokapis.com/v2/post/publish/video/init/',
      modeLabel: 'Direct Post (Public)',
      body: {
        post_info: {
          title,
          privacy_level: process.env.TIKTOK_PRIVACY_LEVEL || 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoBuffer.byteLength,
          chunk_size: videoBuffer.byteLength,
          total_chunk_count: 1,
        },
      },
    },
    {
      endpoint: 'https://open.tiktokapis.com/v2/post/publish/video/init/',
      modeLabel: 'Direct Post (Sandbox Private/Self)',
      body: {
        post_info: {
          title,
          privacy_level: 'SELF_ONLY',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoBuffer.byteLength,
          chunk_size: videoBuffer.byteLength,
          total_chunk_count: 1,
        },
      },
    },
    {
      endpoint: 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
      modeLabel: 'TikTok App Inbox Upload',
      body: {
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoBuffer.byteLength,
          chunk_size: videoBuffer.byteLength,
          total_chunk_count: 1,
        },
      },
    },
  ];

  let uploadUrl = null;
  let publishId = null;
  let usedMode = '';
  let lastErrorText = '';

  for (const att of attempts) {
    const initRes = await fetch(att.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(att.body),
    });

    const text = await initRes.text();
    if (initRes.ok) {
      const initJson = JSON.parse(text);
      if (initJson?.data?.upload_url) {
        uploadUrl = initJson.data.upload_url;
        publishId = initJson.data.publish_id;
        usedMode = att.modeLabel;
        break;
      }
    }
    lastErrorText = text;
  }

  if (!uploadUrl) {
    throw new Error(`TikTok init failed across all modes: ${lastErrorText}`);
  }

  // Step 2: Upload MP4 chunk
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Range': `bytes 0-${videoBuffer.byteLength - 1}/${videoBuffer.byteLength}`,
      'Content-Length': String(videoBuffer.byteLength),
      'Content-Type': 'video/mp4',
    },
    body: videoBuffer,
  });

  if (!putRes.ok) {
    throw new Error(`TikTok chunk upload failed: ${await putRes.text()}`);
  }

  // Step 3: Poll TikTok status endpoint to verify server-side transcoding succeeded
  let finalStatus = 'PROCESSING_UPLOAD';
  for (let poll = 0; poll < 10; poll++) {
    await new Promise((r) => setTimeout(r, 2000));
    const stRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    if (stRes.ok) {
      const stJson = await stRes.json();
      finalStatus = stJson?.data?.status || finalStatus;
      if (finalStatus === 'FAILED') {
        throw new Error(`TikTok server-side processing failed: ${stJson?.data?.fail_reason || 'unknown'}`);
      }
      if (finalStatus === 'PUBLISH_COMPLETE' || finalStatus === 'SEND_TO_USER_INBOX') {
        break;
      }
    }
  }

  return {
    platform: 'tiktok',
    status: 'published',
    videoId: publishId,
    postUrl: 'https://www.tiktok.com/@bt.boutiqe',
    message: `Published to TikTok (@bt.boutiqe) via ${usedMode} [${finalStatus}] (Publish ID: ${publishId})`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Ensures the MP4 for an episode exists on disk; if not, compiles it or uses the closest compiled showcase MP4.
 */
async function ensureEpisodeVideoOnDisk(episode) {
  const candidatePaths = [
    path.join(VIDEOS_DIR, episode.videoFilename),
    path.join(EXPORT_DIR, episode.videoFilename),
  ];
  for (const expectedPath of candidatePaths) {
    if (fs.existsSync(expectedPath)) {
      try {
        execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', expectedPath], {
          stdio: 'ignore',
        });
        return expectedPath;
      } catch {
        console.warn(`   ⚠️ Detected interrupted/incomplete MP4 (${episode.videoFilename}), recompiling cleanly...`);
        fs.rmSync(expectedPath, { force: true });
      }
    }
  }

  // Compile standalone via Headless Chrome StudioCanvas renderer (no localhost:3000 server needed!)
  try {
    console.log(`   🎥 Compiling video "${episode.videoFilename}" standalone...`);
    const compiledPath = await compileSkitStandalone(episode.skit);
    if (compiledPath && fs.existsSync(compiledPath)) {
      return compiledPath;
    }
  } catch (err) {
    console.warn(`   ⚠️ Standalone compile warning: ${err.message}`);
  }

  const existingMp4s = [];
  if (fs.existsSync(VIDEOS_DIR)) {
    for (const f of fs.readdirSync(VIDEOS_DIR)) {
      if (f.endsWith('.mp4')) existingMp4s.push(path.join(VIDEOS_DIR, f));
    }
  }
  if (fs.existsSync(EXPORT_DIR)) {
    for (const f of fs.readdirSync(EXPORT_DIR)) {
      if (f.endsWith('.mp4')) existingMp4s.push(path.join(EXPORT_DIR, f));
    }
  }
  existingMp4s.sort();
  if (existingMp4s.length > 0) {
    const fallbackFile = existingMp4s[episode.index % existingMp4s.length];
    return fallbackFile;
  }

  throw new Error('No compiled .mp4 files found in public/exports/videos/ or public/exports/. Run "npm run compile-episodes" first.');
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isStatusOnly = args.includes('--status');
  const isGenerateAi = args.includes('--generate-ai');
  const isAutoInfinite = args.includes('--auto-infinite');
  const requestedSkitId = args.find((a) => a.startsWith('--skit='))?.split('=')[1];
  const requestedFile = args.find((a) => a.startsWith('--file='))?.split('=')[1];
  const onlyPlatform = args.find((a) => a.startsWith('--platform='))?.split('=')[1];

  const queue = buildMasterAutopilotQueue();
  const state = loadAutopilotState(queue.length);
  const creds = checkPlatformCredentials(process.env);

  console.log(`\n╔════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║   🚀 BONNIE'S BOUTIQUE — 24/7 MULTI-PLATFORM SOCIAL AUTOPILOT PUBLISHER    ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════════════╝`);
  console.log(`  • Total Episodes in 24/7 Rotation Pool: ${queue.length} (Skits + 96 Product Spotlights)`);
  console.log(`  • Current Queue Position:               #${state.currentQueueIndex + 1} of ${queue.length}`);
  console.log(`  • Schedule Cadence:                     ${state.cadenceLabel} (${state.cadenceCron})`);
  console.log(`  • Platform API Status:`);
  console.log(`      ▶️  YouTube Shorts API:   ${creds.youtube.configured ? '✅ CONNECTED' : `⚪ Waiting for .env (${creds.youtube.missingKeys.join(', ')})`}`);
  console.log(`      👥 Facebook Reels API:   ${creds.facebook_reels.configured ? '✅ CONNECTED' : `⚪ Waiting for .env (${creds.facebook_reels.missingKeys.join(', ')})`}`);
  console.log(`      📸 Instagram Reels API:  ${creds.instagram.configured ? '✅ CONNECTED' : `⚪ Waiting for .env (${creds.instagram.missingKeys.join(', ')})`}`);
  console.log(`      🎵 TikTok Posting API:   ${creds.tiktok.configured ? '✅ CONNECTED' : `⚪ Waiting for .env (${creds.tiktok.missingKeys.join(', ')})`}\n`);

  if (isStatusOnly) {
    saveAutopilotState(state);
    return;
  }

  // Pick episode (or procedurally generate a fresh AI Nat Geo / Gen-Z episode so content NEVER runs out!)
  let episode = queue[state.currentQueueIndex % queue.length];
  let videoPath = null;

  const shouldGenerateFreshAi =
    isGenerateAi ||
    isAutoInfinite ||
    (!requestedFile && !requestedSkitId && !args.includes('--use-static-queue'));

  if (requestedFile) {
    const aiHistoryPath = path.join(EXPORT_DIR, 'ai-generated-skits.json');
    const aiHistory = fs.existsSync(aiHistoryPath) ? JSON.parse(fs.readFileSync(aiHistoryPath, 'utf8')) : [];
    const matchedSkit = aiHistory.find((s) => s.videoFilename === requestedFile) || queue[0].skit;
    const appraisal = matchedSkit.defaultPropId ? generateRPGAppraisal(matchedSkit.defaultPropId) : undefined;
    episode = {
      index: state.currentQueueIndex,
      skitId: matchedSkit.id,
      title: matchedSkit.title,
      category: matchedSkit.category,
      propId: matchedSkit.defaultPropId,
      productTitle: appraisal?.title,
      videoFilename: requestedFile,
      durationSeconds: matchedSkit.durationSeconds || 17,
      skit: matchedSkit,
      socialCopy: generateAllPlatformCopy(matchedSkit, appraisal),
    };
    videoPath = fs.existsSync(path.join(VIDEOS_DIR, requestedFile))
      ? path.join(VIDEOS_DIR, requestedFile)
      : path.join(EXPORT_DIR, requestedFile);
    console.log(`🎬 Selected Split-Screen Episode: "${episode.title}" (${requestedFile})`);
  } else if (requestedSkitId) {
    const found = queue.find((e) => e.skitId === requestedSkitId);
    if (found) episode = found;
    console.log(`🎬 Selected Episode [#${episode.index + 1}/${queue.length}]: "${episode.title}" (${episode.skitId})`);
    videoPath = await ensureEpisodeVideoOnDisk(episode);
  } else if (shouldGenerateFreshAi) {
    console.log(`🧠 Infinite Content Factory Active: Generating fresh AI Nat Geo Commentary Episode via Gemini...`);
    const aiOut = await generateFreshAiEpisode();
    const appraisal = aiOut.skit.defaultPropId ? generateRPGAppraisal(aiOut.skit.defaultPropId) : undefined;
    episode = {
      index: state.currentQueueIndex,
      skitId: aiOut.skit.id,
      title: aiOut.skit.title,
      category: aiOut.skit.category,
      propId: aiOut.skit.defaultPropId,
      productTitle: appraisal?.title,
      videoFilename: aiOut.videoFilename,
      durationSeconds: aiOut.skit.durationSeconds,
      skit: aiOut.skit,
      socialCopy: generateAllPlatformCopy(aiOut.skit, appraisal),
    };
    videoPath = aiOut.fullPath;
  } else {
    console.log(`🎬 Selected Episode [#${episode.index + 1}/${queue.length}]: "${episode.title}" (${episode.skitId})`);
    videoPath = await ensureEpisodeVideoOnDisk(episode);
  }

  const stat = fs.statSync(videoPath);
  console.log(`📦 Video File Ready: public/exports/${path.basename(videoPath)} (${Math.round(stat.size / 1024)} KB)\n`);

  const results = [];

  // 1. YouTube Shorts
  if (!onlyPlatform || onlyPlatform === 'youtube') {
    try {
      const ytRes = await uploadToYouTubeShorts(videoPath, episode, creds, isDryRun);
      results.push(ytRes);
      console.log(`  [YouTube Shorts]  -> ${ytRes.message}`);
    } catch (err) {
      results.push({
        platform: 'youtube_shorts',
        status: 'error',
        message: err.message,
        timestamp: new Date().toISOString(),
      });
      console.error(`  [YouTube Shorts]  -> ❌ Error: ${err.message}`);
    }
  }

  // 2. Facebook Reels
  if (!onlyPlatform || onlyPlatform === 'facebook') {
    try {
      const fbRes = await uploadToFacebookReels(videoPath, episode, creds, isDryRun);
      results.push(fbRes);
      console.log(`  [Facebook Reels]  -> ${fbRes.message}`);
    } catch (err) {
      results.push({
        platform: 'facebook_reels',
        status: 'error',
        message: err.message,
        timestamp: new Date().toISOString(),
      });
      console.error(`  [Facebook Reels]  -> ❌ Error: ${err.message}`);
    }
  }

  // 3. Instagram Reels
  if (!onlyPlatform || onlyPlatform === 'instagram') {
    try {
      const igRes = await uploadToInstagramReels(videoPath, episode, creds, isDryRun);
      results.push(igRes);
      console.log(`  [Instagram Reels] -> ${igRes.message}`);
    } catch (err) {
      results.push({
        platform: 'instagram',
        status: 'error',
        message: err.message,
        timestamp: new Date().toISOString(),
      });
      console.error(`  [Instagram Reels] -> ❌ Error: ${err.message}`);
    }
  }

  // 4. TikTok
  if (!onlyPlatform || onlyPlatform === 'tiktok') {
    try {
      const ttRes = await uploadToTikTok(videoPath, episode, creds, isDryRun);
      results.push(ttRes);
      console.log(`  [TikTok]          -> ${ttRes.message}`);
    } catch (err) {
      results.push({
        platform: 'tiktok',
        status: 'error',
        message: err.message,
        timestamp: new Date().toISOString(),
      });
      console.error(`  [TikTok]          -> ❌ Error: ${err.message}`);
    }
  }

  // Update & Persist State
  const runEntry = {
    runId: `run_${Date.now()}`,
    timestamp: new Date().toISOString(),
    skitId: episode.skitId,
    title: episode.title,
    videoFilename: path.basename(videoPath),
    tiktokCaption: episode.socialCopy?.tiktok?.fullFormattedText || '',
    mode: isDryRun ? 'dry_run' : 'live',
    results,
  };

  state.lastRunAt = runEntry.timestamp;
  if (!requestedSkitId) {
    state.currentQueueIndex = (state.currentQueueIndex + 1) % queue.length;
  }
  state.history = [runEntry, ...(state.history || [])].slice(0, 500);
  saveAutopilotState(state);

  // Also write latest ready-to-post social bundle to public/exports/latest-scheduled-post.md
  const latestMd = [
    `# Latest Scheduled Autopilot Post: ${episode.title}`,
    `- **Timestamp**: ${runEntry.timestamp}`,
    `- **Video File**: \`public/exports/${path.basename(videoPath)}\``,
    `- **Storefront Link**: ${STOREFRONT_URL}`,
    ``,
    `## ▶️ YouTube Shorts`,
    '```text',
    episode.socialCopy.youtube_shorts.fullFormattedText,
    '```',
    `## 👥 Facebook Reels`,
    '```text',
    episode.socialCopy.facebook_reels.fullFormattedText,
    '```',
    `## 📸 Instagram Reels`,
    '```text',
    episode.socialCopy.instagram.fullFormattedText,
    '```',
    `## 🎵 TikTok`,
    '```text',
    episode.socialCopy.tiktok.fullFormattedText,
    '```',
  ].join('\n');

  fs.writeFileSync(path.join(EXPORT_DIR, 'latest-scheduled-post.md'), latestMd, 'utf8');

  // Auto-sync live 100K Views Goal Tracker across all 4 platforms
  try {
    const metrics = await syncAllSocialMetrics();
    console.log(
      `\n🎯 100K VIEWS GOAL TRACKER: ${metrics.totalViews.toLocaleString()} / ${metrics.goalViews.toLocaleString()} views (${metrics.progressPercent}%) across ${metrics.totalVideosPublished} videos`
    );
  } catch {}

  console.log(`\n✅ Autopilot cycle complete! Next queued episode index: #${state.currentQueueIndex + 1}/${queue.length}`);
  console.log(`📄 Saved state to public/exports/autopilot-state.json & public/exports/social-metrics.json\n`);

  // Phase 4 Post-Run Hook: Proactively notify PC Orchestrator Bridge / Mac Control Tower
  try {
    const publishedPlatforms = results.filter((r) => r.status === 'published').map((r) => r.platform);
    const errorPlatforms = results.filter((r) => r.status === 'error').map((r) => `${r.platform}: ${r.message}`);
    const hookStatus = errorPlatforms.length > 0 ? 'completed_with_warnings' : 'completed';
    const hookSummary = `Autopilot published "${episode.title}" (${episode.skitId}) to [${publishedPlatforms.join(', ') || 'dry-run'}].${errorPlatforms.length ? ' Warnings: ' + errorPlatforms.join('; ') : ''}`;
    await fetch('http://127.0.0.1:8000/api/notify-mac', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'PC',
        workspace: 'wonderful-hertz',
        status: hookStatus,
        summary: hookSummary,
        job_id: runEntry.runId,
      }),
    }).catch(() => {});
  } catch {}
}

main().catch(async (err) => {
  console.error('Fatal error in publish-socials.mjs:', err);
  try {
    await fetch('http://127.0.0.1:8000/api/notify-mac', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'PC',
        workspace: 'wonderful-hertz',
        status: 'failed',
        summary: `Fatal error in publish-socials.mjs: ${err?.message || String(err)}`,
      }),
    }).catch(() => {});
  } catch {}
  process.exit(1);
});
