#!/usr/bin/env node
/**
 * scripts/setup-youtube-oauth.mjs
 * 1-Click YouTube Data API v3 OAuth2 Refresh Token Generator
 *
 * Opens a local browser flow on http://localhost:4455/oauth2callback so you can sign in
 * with Bonnie's new Gmail / YouTube account once, automatically exchanges the code for a
 * permanent YOUTUBE_REFRESH_TOKEN, and saves it into .env for 24/7 autonomous uploads.
 *
 * Usage:
 *   npm run setup-youtube
 *   node scripts/setup-youtube-oauth.mjs
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import dotenv from 'dotenv';

const ROOT_DIR = process.cwd();
const ENV_PATH = path.join(ROOT_DIR, '.env');
dotenv.config({ path: ENV_PATH });

const PORT = 4455;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

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
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  console.log(`\n╔══════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║      ▶️  BONNIE'S BOUTIQUE — 1-CLICK YOUTUBE API OAUTH2 SETUP WIZARD      ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════╝\n`);

  if (!clientId || !clientSecret) {
    console.log(`⚠️  GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not yet set in .env.\n`);
    console.log(`Quick 2-Minute Setup with Bonnie's New Gmail:`);
    console.log(`  1. Sign into https://console.cloud.google.com/ with Bonnie's new Gmail.`);
    console.log(`  2. Create a new project ("Bonnies Boutique") & enable "YouTube Data API v3".`);
    console.log(`  3. Go to "APIs & Services -> Credentials -> Create Credentials -> OAuth client ID".`);
    console.log(`  4. Choose "Web application" and add this Authorized Redirect URI:`);
    console.log(`       ${REDIRECT_URI}`);
    console.log(`  5. Paste these two lines into your .env file:`);
    console.log(`       GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"`);
    console.log(`       GOOGLE_CLIENT_SECRET="your-client-secret"`);
    console.log(`  6. Run "npm run setup-youtube" again to open the 1-click browser sign-in!\n`);
    process.exit(0);
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log(`🌐 Opening Google OAuth consent screen for Bonnie's YouTube Channel...`);
  console.log(`\n👉 If the browser doesn't open automatically, click this link:\n   ${authUrl.toString()}\n`);

  if (process.platform === 'win32') {
    exec(`start "" "${authUrl.toString()}"`);
  }

  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
    if (reqUrl.pathname !== '/oauth2callback') {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const code = reqUrl.searchParams.get('code');
    const error = reqUrl.searchParams.get('error');

    if (error || !code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>❌ Authorization failed: ${error || 'No code returned'}</h2>`);
      server.close();
      process.exit(1);
    }

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.refresh_token) {
        throw new Error(JSON.stringify(tokenData));
      }

      upsertEnvVar('YOUTUBE_REFRESH_TOKEN', tokenData.refresh_token);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 60px auto; padding: 32px; border-radius: 16px; background: #1a0f24; color: #f5efe6; text-align: center; border: 2px solid #e8748a;">
          <h1 style="color: #e8748a;">✅ YouTube Channel Connected!</h1>
          <p>Saved <code>YOUTUBE_REFRESH_TOKEN</code> to <code>.env</code>.</p>
          <p>Bonnie's 24/7 Autonomous YouTube Shorts Publisher is now ready to run!</p>
          <p style="opacity: 0.7; font-size: 13px;">You can close this browser tab.</p>
        </div>
      `);

      console.log(`\n✅ Successfully saved YOUTUBE_REFRESH_TOKEN to .env!`);
      console.log(`🚀 Test a live upload anytime with: npm run publish-socials\n`);
      server.close();
      process.exit(0);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Token exchange failed: ${err.message}`);
      console.error(`❌ Token exchange failed:`, err);
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`⏳ Listening for Google OAuth callback on ${REDIRECT_URI}...`);
  });
}

main();
