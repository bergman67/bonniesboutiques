#!/usr/bin/env node
/**
 * scripts/setup-meta-tokens.mjs
 * 1-Command Instagram Reels & Facebook Page ID Auto-Discovery + Token Saver
 *
 * Give this script a User Access Token from https://developers.facebook.com/tools/explorer/
 * and it will automatically:
 *   1. Exchange it for a 60-day Long-Lived Token (if META_APP_ID & META_APP_SECRET are provided)
 *   2. Query /me/accounts to find Bonnie's Facebook Page ID & Page Access Token
 *   3. Query the linked Instagram Professional Account ID (instagram_business_account)
 *   4. Save FACEBOOK_PAGE_ID, INSTAGRAM_BUSINESS_ACCOUNT_ID, and META_PAGE_ACCESS_TOKEN to .env!
 *
 * Usage:
 *   node scripts/setup-meta-tokens.mjs --token="EAA..."
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const ROOT_DIR = process.cwd();
const ENV_PATH = path.join(ROOT_DIR, '.env');
dotenv.config({ path: ENV_PATH });

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
  const tokenArg = args.find((a) => a.startsWith('--token='))?.split('=')[1] || process.env.META_USER_TOKEN;

  console.log(`\n╔══════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║   📸 BONNIE'S BOUTIQUE — INSTAGRAM & FACEBOOK AUTO-DISCOVERY WIZARD      ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════╝\n`);

  if (!tokenArg) {
    console.log(`Usage:`);
    console.log(`  node scripts/setup-meta-tokens.mjs --token="YOUR_GRAPH_EXPLORER_TOKEN"\n`);
    console.log(`How to get your token in 2 minutes:`);
    console.log(`  1. In the Instagram app, switch Bonnie's account to a Professional (Creator/Business) account`);
    console.log(`     and link it to Bonnie's Facebook Page.`);
    console.log(`  2. Go to https://developers.facebook.com/tools/explorer/`);
    console.log(`  3. Add permissions: pages_show_list, pages_read_engagement, pages_manage_posts,`);
    console.log(`     instagram_basic, instagram_content_publish`);
    console.log(`  4. Click "Generate Access Token" and run:`);
    console.log(`     node scripts/setup-meta-tokens.mjs --token="PASTE_TOKEN_HERE"\n`);
    process.exit(0);
  }

  let activeToken = tokenArg;

  // Check if this is an "Instagram API with Instagram Login" token (starts with IGAA)
  if (activeToken.startsWith('IGAA')) {
    console.log(`🔍 Detected Instagram Login Token (IGAA...). Querying graph.instagram.com/v21.0/me ...`);
    const meRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,user_id,username,name,account_type&access_token=${encodeURIComponent(activeToken)}`
    );
    if (!meRes.ok) {
      console.error(`❌ Instagram Graph API error:`, await meRes.text());
      process.exit(1);
    }
    const meData = await meRes.json();
    console.log(`   ✔ Connected Instagram Account:`, meData);
    // For publishing via graph.instagram.com, user_id (or id) is used
    const igId = meData.user_id || meData.id;
    upsertEnvVar('INSTAGRAM_BUSINESS_ACCOUNT_ID', igId);
    upsertEnvVar('INSTAGRAM_APP_SCOPED_ID', meData.id);
    upsertEnvVar('META_PAGE_ACCESS_TOKEN', activeToken);
    console.log(`   ✅ Saved INSTAGRAM_BUSINESS_ACCOUNT_ID="${igId}" (@${meData.username})`);
    console.log(`   ✅ Saved META_PAGE_ACCESS_TOKEN to .env`);
    console.log(`\n🎉 Done! Instagram (@${meData.username}) is now connected!\n`);
    process.exit(0);
  }

  // Optional: Exchange for long-lived user token if App ID + Secret exist in .env
  if (process.env.META_APP_ID && process.env.META_APP_SECRET) {
    console.log(`🔄 Exchanging token for 60-day long-lived token...`);
    const exUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    exUrl.searchParams.set('grant_type', 'fb_exchange_token');
    exUrl.searchParams.set('client_id', process.env.META_APP_ID);
    exUrl.searchParams.set('client_secret', process.env.META_APP_SECRET);
    exUrl.searchParams.set('fb_exchange_token', activeToken);

    const exRes = await fetch(exUrl.toString());
    if (exRes.ok) {
      const exData = await exRes.json();
      if (exData.access_token) {
        activeToken = exData.access_token;
        console.log(`   ✔ Obtained long-lived user token!`);
      }
    }
  }

  console.log(`🔍 Looking up linked Facebook Pages and Instagram Professional Accounts...`);
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(activeToken)}`
  );

  if (!pagesRes.ok) {
    console.error(`❌ Graph API error:`, await pagesRes.text());
    process.exit(1);
  }

  const pagesData = await pagesRes.json();
  const pages = pagesData.data || [];

  if (pages.length === 0) {
    console.error(`❌ No Facebook Pages found for this token. Make sure you granted "pages_show_list" and selected Bonnie's Page during login.`);
    process.exit(1);
  }

  // Pick the first page that has an instagram_business_account, or the Bonnie Boutiqe page, or the first page overall
  const targetPage =
    pages.find((p) => p.id === '61595735078717' || /bonnie/i.test(p.name)) ||
    pages.find((p) => p.instagram_business_account?.id) ||
    pages[0];
  upsertEnvVar('FACEBOOK_PAGE_ID', targetPage.id);
  upsertEnvVar('FACEBOOK_PAGE_ACCESS_TOKEN', targetPage.access_token);
  if (!process.env.META_PAGE_ACCESS_TOKEN || !process.env.META_PAGE_ACCESS_TOKEN.startsWith('IGAA')) {
    upsertEnvVar('META_PAGE_ACCESS_TOKEN', targetPage.access_token);
  }
  console.log(`   ✅ Saved FACEBOOK_PAGE_ID="${targetPage.id}" (${targetPage.name})`);
  console.log(`   ✅ Saved FACEBOOK_PAGE_ACCESS_TOKEN to .env (Direct Facebook Reels Auto-Publish ready!)`);

  if (targetPage.instagram_business_account?.id) {
    const ig = targetPage.instagram_business_account;
    upsertEnvVar('INSTAGRAM_BUSINESS_ACCOUNT_ID', ig.id);
    console.log(`   ✅ Saved INSTAGRAM_BUSINESS_ACCOUNT_ID="${ig.id}" (@${ig.username || 'connected'})`);
  } else {
    console.log(`   ⚠️ Found Facebook Page "${targetPage.name}", but no Instagram Professional Account is linked to it yet.`);
    console.log(`      In the Instagram app -> Edit Profile -> Page -> Connect to "${targetPage.name}", then re-run this script.`);
  }

  console.log(`\n🎉 Done! Run "npm run publish-socials -- --status" to verify your connection.\n`);
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
