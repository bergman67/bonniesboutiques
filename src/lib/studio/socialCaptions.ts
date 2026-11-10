/**
 * src/lib/studio/socialCaptions.ts
 * Multi-Platform Gen-Z Social Caption, Hook & Product Link Generator (R4)
 * Generates platform-tailored Gen-Z captions, hooks, hashtags, and direct product links for
 * TikTok, Instagram Reels, YouTube Shorts, and Facebook Reels.
 */

import type { SkitTemplate } from './skitTemplates';
import type { RPGProductAppraisal } from './rpgAppraisal';

export type PlatformId = 'tiktok' | 'instagram' | 'youtube_shorts' | 'facebook_reels';

export interface SocialPlatformCopy {
  platform: PlatformId;
  platformLabel: string;
  icon: string;
  title?: string;
  caption: string;
  hashtags: string[];
  fullFormattedText: string;
  charCount: number;
}

export interface SkitSocialMetadata {
  skitId: string;
  tiktok: SocialPlatformCopy;
  instagram: SocialPlatformCopy;
  youtube_shorts: SocialPlatformCopy;
  facebook_reels: SocialPlatformCopy;
}

export const STOREFRONT_BASE_URL = 'https://btboutiqe.com';
const COMMON_TAGS = ['#BonnieAndTammy', '#TrinketTales', '#CozyAnimation', '#16BitArt', '#HandmadeWithLove'];

function buildProductLinksBlock(
  platform: PlatformId,
  skit: SkitTemplate,
  appraisal?: RPGProductAppraisal
): string {
  const propId = appraisal?.productId || skit.defaultPropId;
  const itemTitle = appraisal?.title || 'handmade boutique charm';

  if (platform === 'facebook_reels') {
    const fbUtm = 'utm_source=facebook&utm_medium=reels&promo=BONNIE10';
    if (propId) {
      return `🛍️ Peep this exact handmade piece (${itemTitle}): ${STOREFRONT_BASE_URL}/products/${propId}?${fbUtm}\n🎁 3-Pen Free Shipping Bundles & 10% Welcome Gift (code BONNIE10): ${STOREFRONT_BASE_URL}/links?${fbUtm}`;
    }
    return `🎁 Explore our Virginia-made keepsakes & 10% gift (code BONNIE10): ${STOREFRONT_BASE_URL}/links?${fbUtm}`;
  }

  if (platform === 'youtube_shorts') {
    return `✨ Tap @btboutiqe above → visit btboutiqe.com/links in our channel bio to adopt "${itemTitle}" (use code BONNIE10 for a 10% thank-you gift + free US shipping over $25)!`;
  }

  if (platform === 'instagram') {
    return `✨ Peep "${itemTitle}" via the link in our @btboutiqevids bio (btboutiqe.com/links) — code BONNIE10 takes 10% off + free US shipping $25+!`;
  }

  // TikTok bio-hub ingress (clean, zero unclickable raw URL clutter)
  return `✨ Tap our profile link (btboutiqe.com/links) to peep "${itemTitle}" — use code BONNIE10 for a cozy 10% thank-you gift + free US shipping $25+!`;
}

export function generatePlatformCopy(
  skit: SkitTemplate,
  platform: PlatformId,
  appraisal?: RPGProductAppraisal
): SocialPlatformCopy {
  const isAppraisal = skit.category === 'rpg_appraisal';
  const isNatGeo = skit.category === 'nat_geo_commentary';
  const isFourthWall = skit.category === 'fourth_wall';
  const itemTitle = appraisal?.title || 'handcrafted boutique relic';
  const rarity = appraisal?.rarity || 'Legendary';
  const statLine = appraisal?.stats.map((s) => s.formatted).join(' | ') || '+10,000 Aura Points';
  const linksBlock = buildProductLinksBlock(platform, skit, appraisal);

  switch (platform) {
    case 'tiktok': {
      const hook = isNatGeo
        ? `who let grandma watch nat geo behind the craft counter 😭💀 "${skit.title}"`
        : isFourthWall
        ? `pov: grandma gained sentience inside your fyp and is knocking on your screen 😭👵✨`
        : isAppraisal
        ? `my 74yo grandma appraising handmade charms like mythic RPG loot (+10,000 aura no cap) 🔮💀`
        : `grandma really cooked with this one behind the counter 😭✨ "${skit.title}"`;

      const body = isAppraisal
        ? `item: ${itemTitle} (${rarity} tier)\nstats: ${statLine}\n\ngrandma said triple-knotting gives +100% delulu defense fr. are you equipping this or nah? 👇\n\n${linksBlock}`
        : isNatGeo
        ? `${skit.description}\n\ngrandma really thinks she can knit a sweater for every apex predator on earth 😭 wait for the ending 💀\n\n${linksBlock}`
        : `just another unhinged day in our cozy 16-bit craft shop! wait for grandma's reaction at the end 😂✨\n\n${linksBlock}`;

      const tags = [
        ...COMMON_TAGS,
        '#CozyTok',
        '#GrandmaTok',
        '#PixelArt',
        '#BeadedPens',
        '#TeacherGifts',
        '#NurseTok',
        '#IndieAnimation',
        '#WholesomeMemes',
      ];

      const fullFormatted = `${hook}\n\n${body}\n\n${tags.join(' ')}`;

      return {
        platform: 'tiktok',
        platformLabel: 'TikTok',
        icon: '🎵',
        caption: body,
        hashtags: tags,
        fullFormattedText: fullFormatted,
        charCount: fullFormatted.length,
      };
    }

    case 'instagram': {
      const hook = isNatGeo
        ? `pov: grandma discovered Nat Geo Wild on the shop TV 😭📺 (${skit.title})`
        : isFourthWall
        ? `wait why did grandma just walk up to my phone glass like that 😭👵✨`
        : `✦ ${skit.title} ✦ — grandma & tammy are at it again 💀🕯️`;

      const body = isAppraisal
        ? `grandma rating our handmade pieces like legendary RPG drops will never not be funny 😭✨\n\n✨ Relic: ${itemTitle} (${rarity})\n⚔️ Stats: ${statLine}\n💬 Grandma's verdict: “${appraisal?.lore || 'Triple-knotted for maximum aura.'}”\n\n${linksBlock}`
        : `${skit.description}\n\ngenerational crafting, unhinged mother-daughter banter, and +10,000 cozy aura points. drop a "👵" in the comments if grandma cooked here 💬❤️\n\n${linksBlock}`;

      const tags = [
        ...COMMON_TAGS,
        '#CottagecoreAesthetic',
        '#PixelArtCommunity',
        '#CozyVibes',
        '#BeadedJewelry',
        '#SmallShopLove',
        '#GenerationalCrafting',
        '#LoFiCozy',
      ];

      const fullFormatted = `${hook}\n\n${body}\n\n.\n.\n.\n${tags.join(' ')}`;

      return {
        platform: 'instagram',
        platformLabel: 'Instagram Reels',
        icon: '📸',
        caption: body,
        hashtags: tags,
        fullFormattedText: fullFormatted,
        charCount: fullFormatted.length,
      };
    }

    case 'youtube_shorts': {
      const title = isNatGeo
        ? `Grandma Reacts to Nat Geo: ${skit.title} 😭💀 #Shorts`
        : isAppraisal
        ? `Grandma Rates Handmade Charm Like Mythic RPG Loot! (+10,000 Aura) 🔮 #Shorts`
        : `POV: Grandma Inside Your Phone (${skit.title}) 😭👵 #Shorts`;

      const body = isAppraisal
        ? `Bonnie & Tammy's Trinket Tales — ${skit.title}\nAppraising "${itemTitle}" (${rarity} Tier) | Stats: ${statLine}\n\n${linksBlock}\n\nSubscribe for daily unhinged grandma & daughter 16-bit skits!`
        : `Bonnie & Tammy's Trinket Tales — ${skit.title}\n${skit.description}\n\n${linksBlock}\n\nSubscribe for daily wholesome & chaotic 16-bit boutique episodes! What should Bonnie & Tammy react to next?`;

      const tags = ['#Shorts', '#PixelArt', '#Animation', '#CozyGaming', '#IndieDev', '#Wholesome', '#Grandma'];
      const fullFormatted = `${title}\n\n${body}\n\n${tags.join(' ')}`;

      return {
        platform: 'youtube_shorts',
        platformLabel: 'YouTube Shorts',
        icon: '▶️',
        title,
        caption: body,
        hashtags: tags,
        fullFormattedText: fullFormatted,
        charCount: fullFormatted.length,
      };
    }

    case 'facebook_reels': {
      const hook = `Grandma Bonnie & Tammy back at the craft counter! 🌸😭 (${skit.title})`;

      const body = isAppraisal
        ? `Tammy convinced Grandma Bonnie to rate our handmade "${itemTitle}" like a magical video game item—and Bonnie gave it "${appraisal?.blessing || '+100% Grandma Love!'}" 😂\n\n${linksBlock}\n\nDrop a comment to say hello to Bonnie! ❤️`
        : `${skit.description}\n\nNever a dull moment running a mother-and-daughter handmade boutique! 😂\n\n${linksBlock}\n\nShare with someone who needs a laugh today! 💐`;

      const tags = ['#HandmadeCrafts', '#BeadedPens', '#TeacherAppreciation', '#FamilyBusiness', '#GrandmotherAndDaughter', '#HandmadeInVirginia'];
      const fullFormatted = `${hook}\n\n${body}\n\n${tags.join(' ')}`;

      return {
        platform: 'facebook_reels',
        platformLabel: 'Facebook Reels',
        icon: '👥',
        caption: body,
        hashtags: tags,
        fullFormattedText: fullFormatted,
        charCount: fullFormatted.length,
      };
    }
  }
}

export function generateAllPlatformCopy(
  skit: SkitTemplate,
  appraisal?: RPGProductAppraisal
): SkitSocialMetadata {
  return {
    skitId: skit.id,
    tiktok: generatePlatformCopy(skit, 'tiktok', appraisal),
    instagram: generatePlatformCopy(skit, 'instagram', appraisal),
    youtube_shorts: generatePlatformCopy(skit, 'youtube_shorts', appraisal),
    facebook_reels: generatePlatformCopy(skit, 'facebook_reels', appraisal),
  };
}

/**
 * 1-Click Clipboard Copy with browser fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to document.execCommand
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
