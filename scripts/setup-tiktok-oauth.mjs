#!/usr/bin/env node
/**
 * scripts/setup-tiktok-oauth.mjs
 * 1-Click TikTok Content Posting API v2 OAuth2 Setup Wizard ($0/month Direct Upload)
 *
 * Uses https://btboutiqe.com/ as the Redirect URI (since TikTok Web Login Kit disallows localhost).
 *
 * Usage:
 *   Step 1: node scripts/setup-tiktok-oauth.mjs
 *           (Opens TikTok authorization link in browser)
 *   Step 2: After clicking "Authorize", TikTok redirects your browser to:
 *           https://btboutiqe.com/?code=...&scopes=...&state=...
 *           Copy that full URL from your browser's address bar and run:
 *           node scripts/setup-tiktok-oauth.mjs --url="https://btboutiqe.com/?code=..."
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import dotenv from 'dotenv';

const ROOT_DIR = process.cwd();
const ENV_PATH = path.join(ROOT_DIR, '.env');
const PKCE_CACHE = path.join(ROOT_DIR, 'node_modules', '.cache', 'tiktok_pkce.json');
dotenv.config({ path: ENV_PATH });

const REDIRECT_URI = 'https://btboutiqe.com/';
const SCOPES = 'user.info.basic,video.publish,video.upload';

function upsertEnvVar(key, value) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}="${value}"`;
  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = content.trimEnd() + `\n${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, content, 'utf8');
}

async function main() {
  const args = process.argv.slice(2);
  const urlArg = args.find((a) => a.startsWith('--url='))?.slice('--url='.length);
  const codeArg = args.find((a) => a.startsWith('--code='))?.slice('--code='.length);

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  console.log(`\n╔══════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║      🎵 BONNIE'S BOUTIQUE — 1-CLICK TIKTOK API OAUTH2 SETUP WIZARD       ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════╝\n`);

  if (!clientKey || !clientSecret) {
    console.log(`⚠️  TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are not yet in .env.\n`);
    process.exit(1);
  }

  // Step 2: If --url or --code was provided, exchange the code for TIKTOK_ACCESS_TOKEN
  if (urlArg || codeArg) {
    let code = codeArg;
    if (urlArg) {
      const parsed = new URL(urlArg);
      code = parsed.searchParams.get('code') || urlArg;
    }
    code = decodeURIComponent(code);

    let codeVerifier = '';
    if (fs.existsSync(PKCE_CACHE)) {
      const cached = JSON.parse(fs.readFileSync(PKCE_CACHE, 'utf8'));
      codeVerifier = cached.codeVerifier;
    }

    console.log(`🔄 Exchanging TikTok authorization code for access token...`);
    const bodyParams = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    });
    if (codeVerifier) {
      bodyParams.set('code_verifier', codeVerifier);
    }

    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams,
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error(`❌ TikTok token exchange failed:`, tokenData);
      process.exit(1);
    }

    upsertEnvVar('TIKTOK_ACCESS_TOKEN', tokenData.access_token);
    if (tokenData.refresh_token) {
      upsertEnvVar('TIKTOK_REFRESH_TOKEN', tokenData.refresh_token);
    }
    if (tokenData.open_id) {
      upsertEnvVar('TIKTOK_OPEN_ID', tokenData.open_id);
    }

    console.log(`   ✅ Saved TIKTOK_ACCESS_TOKEN to .env!`);
    if (tokenData.refresh_token) console.log(`   ✅ Saved TIKTOK_REFRESH_TOKEN to .env!`);
    console.log(`\n🎉 TikTok is officially connected!\n`);
    process.exit(0);
  }

  // Step 1: Generate PKCE & open authorization URL
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const csrfState = crypto.randomBytes(16).toString('hex');

  fs.mkdirSync(path.dirname(PKCE_CACHE), { recursive: true });
  fs.writeFileSync(PKCE_CACHE, JSON.stringify({ codeVerifier, csrfState }, null, 2), 'utf8');

  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.set('client_key', clientKey);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('state', csrfState);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  console.log(`🌐 Opening TikTok OAuth authorization screen...`);
  console.log(`\n👉 Click or paste this link into the browser logged into Bonnie's TikTok:\n   ${authUrl.toString()}\n`);
  console.log(`📌 After you click "Authorize", TikTok will redirect your browser to https://btboutiqe.com/?code=...`);
  console.log(`   Just copy that URL from your browser's address bar and paste it in chat!\n`);

  if (process.platform === 'win32') {
    exec(`start "" "${authUrl.toString()}"`);
  }
}

main();
