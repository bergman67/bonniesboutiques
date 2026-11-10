/**
 * src/lib/studio/characterRig.ts
 * "Bonnie & Tammy's Trinket Tales" High-Craft 16-Bit Character Rig Engine
 * Features:
 * - Sculpted pixel-art sprites with 1px dark espresso sel-out outlines (#1c110a)
 * - 3-tone shaded hair with crown highlights & secondary motion physics lag
 * - Bonnie's signature Rose Hairclip (#e8748a), vintage gold reading spectacles, pearl necklace & scalloped lace apron
 * - Tammy's layered caramel-gold waves, star hairpin, cream collar, gold pendant & cuffed teal sleeves
 * - 4-phase vowel phoneme lip-sync & dynamic pupil eye-tracking saccades (glancing at TV & partner)
 * - All 7 actions + idle and all 6 emotive expressions with floating reaction emote particles
 */

export type CharacterId = 'bonnie' | 'tammy' | 'narrator';

export type CharacterAction =
  | 'idle'
  | 'walk'
  | 'turn'
  | 'laugh'
  | 'gasp'
  | 'hold trinket'
  | 'sip tea'
  | 'pack box';

export type CharacterExpression =
  | 'happy'
  | 'shocked'
  | 'sleepy'
  | 'laughing'
  | 'proud grandma'
  | 'eye-rolling daughter';

export type FacingDirection = 'left' | 'right' | 'front';

export interface CharacterPalette {
  outline: string;
  hairBack: string;
  hairFront: string;
  hairHighlight: string;
  skin: string;
  skinShadow: string;
  blush: string;
  eyes: string;
  eyesClosed: string;
  mouth: string;
  dress: string;
  dressShadow: string;
  collar: string;
  apron?: string;
  hairAccessory?: { primary: string; secondary: string };
}

export interface CharacterState {
  id: CharacterId;
  x: number;
  y: number;
  facing: FacingDirection;
  action: CharacterAction;
  expression: CharacterExpression;
  animFrame: number;
  isSpeaking: boolean;
  activePropId?: string;
  heldPropUrl?: string;
}

export interface CanvasLayout {
  width: number;
  height: number;
  scale: number;
  counterY: number;
  baselineY: number;
}

export interface EmoteParticle {
  id: string;
  type: 'heart' | 'joy_tear' | 'sweat_drop' | 'laugh_sparkle' | 'steam_wisp';
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  scale: number;
  rotation: number;
  lifetimeSec: number;
  maxLifetimeSec: number;
}

export const CHARACTER_ACTIONS: CharacterAction[] = [
  'walk',
  'turn',
  'laugh',
  'gasp',
  'hold trinket',
  'sip tea',
  'pack box',
];

export const CHARACTER_EXPRESSIONS: CharacterExpression[] = [
  'happy',
  'shocked',
  'sleepy',
  'laughing',
  'proud grandma',
  'eye-rolling daughter',
];

// Normalized action resolver (handles snake_case vs space)
export function normalizeAction(action: string): CharacterAction {
  const clean = (action || '').toLowerCase().replace(/_/g, ' ').trim();
  if (clean.includes('hold') || clean.includes('trinket')) return 'hold trinket';
  if (clean.includes('sip') || clean.includes('tea')) return 'sip tea';
  if (clean.includes('pack') || clean.includes('box')) return 'pack box';
  if (clean === 'walk') return 'walk';
  if (clean === 'turn') return 'turn';
  if (clean === 'laugh') return 'laugh';
  if (clean === 'gasp') return 'gasp';
  return 'idle' as unknown as CharacterAction;
}

// Normalized expression resolver (handles hyphens, underscores, spaces)
export function normalizeExpression(expr: string): CharacterExpression {
  const clean = (expr || '').toLowerCase().replace(/[_-]/g, ' ').trim();
  if (clean.includes('proud') || clean.includes('grandma')) return 'proud grandma';
  if (clean.includes('eye') || clean.includes('rolling') || clean.includes('daughter')) return 'eye-rolling daughter';
  if (clean === 'shocked') return 'shocked';
  if (clean === 'sleepy') return 'sleepy';
  if (clean === 'laughing') return 'laughing';
  return 'happy';
}

export const BONNIE_PALETTE: CharacterPalette = {
  outline: '#1c0f0a',
  hairBack: '#7c2d12', // Deep warm auburn shadow
  hairFront: '#9a3412', // Rich auburn midtone
  hairHighlight: '#c2410c', // Copper crown highlight
  skin: '#fed7aa', // Fair warm peach
  skinShadow: '#f5b882', // Sculpted chin/brow warm shadow
  blush: '#fb7185', // Cozy rose cheek glow
  eyes: '#312e81', // Deep navy
  eyesClosed: '#451a03',
  mouth: '#b91c1c',
  dress: '#6b112c', // Rich rose-burgundy velvet cardigan
  dressShadow: '#4c0519',
  collar: '#f5efe6', // White vintage lace
  apron: '#f5efe6', // White lace apron
  hairAccessory: { primary: '#e8748a', secondary: '#fbbf24' }, // Rose hairclip with gold center
};

export const TAMMY_PALETTE: CharacterPalette = {
  outline: '#17120e',
  hairBack: '#b45309', // Deep caramel shadow
  hairFront: '#d97706', // Golden caramel midtone
  hairHighlight: '#fbbf24', // Honey blonde highlight
  skin: '#fed7aa',
  skinShadow: '#f5b882',
  blush: '#f472b6',
  eyes: '#1e3a8a', // Deep sapphire
  eyesClosed: '#451a03',
  mouth: '#b91c1c',
  dress: '#0d9488', // Vibrant boutique teal
  dressShadow: '#0f766e',
  collar: '#f5efe6',
  hairAccessory: { primary: '#38bdf8', secondary: '#fef08a' }, // Teal & gold star clip
};

export function getCharacterPalette(id: CharacterId): CharacterPalette {
  return id === 'tammy' ? TAMMY_PALETTE : BONNIE_PALETTE;
}

/**
 * High-Craft 16-Bit Character Rendering with Sculpted Outlines, 3-Tone Hair,
 * Accessories, Articulated Head/Arm Kinematics & 4-Phase Lip Sync
 */
export function renderCharacter(
  ctx: CanvasRenderingContext2D,
  state: CharacterState,
  _layout?: Partial<CanvasLayout>,
  frameCount: number = 0,
  propImages?: Map<string, HTMLImageElement>
): void {
  const isBonnie = state.id === 'bonnie';
  const palette = getCharacterPalette(state.id);
  const action = normalizeAction(state.action);
  const expression = normalizeExpression(state.expression);
  const facing = state.facing || (isBonnie ? 'right' : 'left');

  ctx.save();

  // Natural breathing & active speaking bounce
  const breathOffset = Math.floor(Math.sin((frameCount + (isBonnie ? 0 : 19)) * 0.09) * 1.5);
  let actionBobY = 0;
  let actionOffsetX = 0;

  if (action === 'laugh') {
    actionBobY = -Math.abs(Math.floor(Math.sin(frameCount * 0.38) * 3.5));
  } else if (action === 'gasp') {
    actionBobY = -4;
  } else if (action === 'walk') {
    actionBobY = Math.floor(Math.abs(Math.sin(frameCount * 0.28)) * -2.5);
    actionOffsetX = Math.floor(Math.sin(frameCount * 0.14) * 3);
  } else if (state.isSpeaking) {
    actionBobY = Math.floor(Math.sin(frameCount * 0.24) * 1.2);
  }

  const posX = state.x + actionOffsetX;
  const posY = state.y + breathOffset + actionBobY;

  const facingFactor = facing === 'left' ? -1 : 1;
  const isProfile = facing !== 'front';

  // Secondary motion physics: delayed lag on hair curls and apron/dress hem
  const hairLag = Math.sin((frameCount - 5) * 0.18) * 1.8 * facingFactor;
  const apronInertia =
    action === 'walk'
      ? Math.sin((frameCount - 6) * 0.26) * 2.2
      : action === 'laugh' || state.isSpeaking
      ? Math.sin((frameCount - 4) * 0.3) * 1.5
      : Math.sin((frameCount - 8) * 0.08) * 0.6;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. SCULPTED BACK HAIR VOLUME (with 1px dark outline & wavy side locks)
  // ───────────────────────────────────────────────────────────────────────────
  const lagPx = Math.round(hairLag * 0.7);
  if (isBonnie) {
    // Dark sprite outline for back hair & top bun
    ctx.fillStyle = palette.outline;
    ctx.fillRect(posX + 5, posY - 10, 18, 5); // Top bun outline
    ctx.fillRect(posX - 5, posY - 5, 38, 28);
    ctx.fillRect(posX - 7 + lagPx, posY + 6, 42, 18);

    // Warm auburn back hair fill
    ctx.fillStyle = palette.hairBack;
    ctx.fillRect(posX + 6, posY - 9, 16, 4); // Top bun
    ctx.fillRect(posX - 4, posY - 4, 36, 26);
    ctx.fillRect(posX - 6 + lagPx, posY + 7, 40, 16);

    // Midtone curls on sides
    ctx.fillStyle = palette.hairFront;
    ctx.fillRect(posX - 5 + lagPx, posY + 8, 4, 12);
    ctx.fillRect(posX + 29 + lagPx, posY + 8, 4, 12);
  } else {
    // Tammy's sleek layered shoulder-length silhouette with dark outline
    ctx.fillStyle = palette.outline;
    ctx.fillRect(posX - 4, posY - 6, 32, 26);
    ctx.fillRect(posX - 6 + lagPx, posY + 6, 36, 17);

    ctx.fillStyle = palette.hairBack;
    ctx.fillRect(posX - 3, posY - 5, 30, 24);
    ctx.fillRect(posX - 5 + lagPx, posY + 7, 34, 15);

    ctx.fillStyle = palette.hairFront;
    ctx.fillRect(posX - 4 + lagPx, posY + 8, 3, 11);
    ctx.fillRect(posX + 25 + lagPx, posY + 8, 3, 11);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. NECK, TORSO, CARDIGAN/BLOUSE & LACE APRON (with 1px dark outline)
  // ───────────────────────────────────────────────────────────────────────────
  const bodyW = isBonnie ? 24 : 20;
  const bodyH = isBonnie ? 24 : 20;
  const bodyX = posX + 2;
  const bodyY = posY + (isBonnie ? 20 : 18);

  // Neck with subtle shadow
  ctx.fillStyle = palette.skinShadow;
  ctx.fillRect(posX + (isBonnie ? 10 : 8), bodyY - 3, isBonnie ? 8 : 6, 4);

  // Outer 1px dark outline around torso
  ctx.fillStyle = palette.outline;
  ctx.fillRect(bodyX - 1, bodyY, bodyW + 2, bodyH + 1);
  // Tapered shoulders (1px step at top corners)
  ctx.fillStyle = palette.dressShadow;
  ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

  // Main dress/cardigan fill
  ctx.fillStyle = palette.dress;
  ctx.fillRect(bodyX + 1, bodyY + 1, bodyW - 2, bodyH - 2);

  if (isBonnie) {
    // Bonnie's Scalloped White Lace Apron & Cardigan Lapels
    if (palette.apron) {
      ctx.fillStyle = palette.apron;
      ctx.fillRect(posX + 7, bodyY + 4, 14, 18);
      // Apron straps
      ctx.fillRect(posX + 7, bodyY + 1, 2, 4);
      ctx.fillRect(posX + 19, bodyY + 1, 2, 4);
      // Scalloped lace hem with secondary motion inertia
      ctx.fillStyle = '#e5ded5';
      const hemX = posX + 6 + Math.round(apronInertia);
      ctx.fillRect(hemX, bodyY + 20, 16, 2);
      ctx.fillStyle = '#ffffff';
      for (let lx = 0; lx < 14; lx += 3) {
        ctx.fillRect(hemX + 1 + lx, bodyY + 22, 2, 1);
      }
      // Pocket with tiny rose embroidery on apron
      ctx.fillStyle = '#e5ded5';
      ctx.fillRect(posX + 10, bodyY + 12, 8, 5);
      ctx.fillStyle = '#e8748a';
      ctx.fillRect(posX + 13, bodyY + 14, 2, 2);
    }
    // Vintage Collar & Pearl Necklace
    ctx.fillStyle = palette.collar;
    ctx.fillRect(posX + 8, bodyY, 12, 3);
    ctx.fillStyle = '#fef9c3'; // Pearl beads
    for (let px = 9; px <= 17; px += 2) {
      ctx.fillRect(posX + px, bodyY + 3 + (px === 13 ? 1 : 0), 1, 1);
    }
  } else {
    // Tammy's Boutique Teal Blouse with Pleats, Cream Collar & Gold Pendant
    ctx.fillStyle = '#0f766e';
    ctx.fillRect(posX + 5, bodyY + 5, 1, bodyH - 6);
    ctx.fillRect(posX + 18, bodyY + 5, 1, bodyH - 6);
    ctx.fillRect(posX + 4 + Math.round(apronInertia * 0.5), bodyY + 16, 16, 3);

    // Crisp V-Collar
    ctx.fillStyle = palette.collar;
    ctx.fillRect(posX + 7, bodyY, 3, 3);
    ctx.fillRect(posX + 14, bodyY, 3, 3);
    ctx.fillRect(posX + 9, bodyY + 2, 6, 2);

    // Gold charm pendant necklace
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(posX + 11, bodyY + 4, 2, 2);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ARTICULATED HEAD & SCULPTED FACE (Rounded Chin, Ears, 3-Tone Bangs)
  // ───────────────────────────────────────────────────────────────────────────
  const headPivotX = posX + (isBonnie ? 14 : 12);
  const headPivotY = posY + (isBonnie ? 20 : 18);
  const headTilt = state.isSpeaking
    ? Math.sin(frameCount * 0.22) * 0.055 * facingFactor
    : action === 'laugh'
    ? Math.sin(frameCount * 0.35) * 0.045
    : Math.sin(frameCount * 0.05) * 0.015;
  const headPitch = state.isSpeaking
    ? Math.sin(frameCount * 0.3) * 1.3
    : action === 'gasp'
    ? -2
    : 0;

  ctx.save();
  ctx.translate(headPivotX, headPivotY);
  ctx.rotate(headTilt);
  ctx.translate(-headPivotX, -headPivotY + Math.round(headPitch));

  const faceW = isBonnie ? 24 : 20;
  const faceH = isBonnie ? 20 : 18;
  const faceX = posX + 2;
  const faceY = posY;

  // Cute Side Ears with dark outline
  ctx.fillStyle = palette.outline;
  ctx.fillRect(faceX - 3, faceY + 8, 3, 6);
  ctx.fillRect(faceX + faceW, faceY + 8, 3, 6);
  ctx.fillStyle = palette.skinShadow;
  ctx.fillRect(faceX - 2, faceY + 9, 2, 4);
  ctx.fillRect(faceX + faceW, faceY + 9, 2, 4);
  if (!isBonnie) {
    // Tammy's tiny gold stud earrings
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(faceX - 2, faceY + 12, 1, 1);
    ctx.fillRect(faceX + faceW + 1, faceY + 12, 1, 1);
  }

  // Head 1px Dark Outline (with tapered rounded chin corners)
  ctx.fillStyle = palette.outline;
  ctx.fillRect(faceX - 1, faceY - 1, faceW + 2, faceH);
  ctx.fillRect(faceX + 1, faceY + faceH - 1, faceW - 2, 2); // Rounded chin bottom outline

  // Main Face Skin Fill (sculpted jaw)
  ctx.fillStyle = palette.skin;
  ctx.fillRect(faceX, faceY, faceW, faceH - 2);
  ctx.fillRect(faceX + 1, faceY + faceH - 2, faceW - 2, 2);

  // Subtle warm chin & temple shading
  ctx.fillStyle = palette.skinShadow;
  ctx.fillRect(faceX + 2, faceY + faceH - 2, faceW - 4, 1);
  ctx.fillRect(faceX, faceY + 4, 1, faceH - 7);
  ctx.fillRect(faceX + faceW - 1, faceY + 4, 1, faceH - 7);

  // Cozy Rosy Cheeks
  ctx.fillStyle = palette.blush;
  if (isBonnie) {
    ctx.fillRect(faceX + 2, faceY + 12, 4, 2);
    ctx.fillRect(faceX + 18, faceY + 12, 4, 2);
  } else {
    ctx.fillRect(faceX + 2, faceY + 11, 3, 2);
    ctx.fillRect(faceX + 15, faceY + 11, 3, 2);
  }

  //Cute Pixel Nose Highlight/Shadow
  ctx.fillStyle = palette.skinShadow;
  ctx.fillRect(faceX + Math.floor(faceW / 2), faceY + 10, 2, 2);

  // 4. Sculpted 3-Tone Front Hair Bangs & Signature Accessories
  if (isBonnie) {
    // Dark top hair outline
    ctx.fillStyle = palette.outline;
    ctx.fillRect(posX, posY - 6, 28, 2);
    // Main auburn bangs
    ctx.fillStyle = palette.hairFront;
    ctx.fillRect(posX + 1, posY - 5, 26, 7);
    ctx.fillRect(posX + 1, posY + 2, 4, 6);
    ctx.fillRect(posX + 23, posY + 2, 4, 6);
    // Swept parted wave across forehead
    ctx.fillRect(posX + 5, posY + 2, 6, 2);
    ctx.fillRect(posX + 16, posY + 2, 7, 2);
    // Copper crown highlights
    ctx.fillStyle = palette.hairHighlight;
    ctx.fillRect(posX + 4, posY - 4, 7, 2);
    ctx.fillRect(posX + 15, posY - 4, 6, 2);

    // Signature Rose Hairclip (#e8748a with #fbbf24 center)
    if (palette.hairAccessory) {
      ctx.fillStyle = palette.outline;
      ctx.fillRect(posX + 20, posY - 4, 7, 7);
      ctx.fillStyle = palette.hairAccessory.primary;
      ctx.fillRect(posX + 21, posY - 3, 5, 5);
      ctx.fillStyle = palette.hairAccessory.secondary;
      ctx.fillRect(posX + 23, posY - 1, 2, 2);
    }
  } else {
    // Tammy's layered caramel-gold bangs with honey highlights
    ctx.fillStyle = palette.outline;
    ctx.fillRect(posX, posY - 6, 24, 2);
    ctx.fillStyle = palette.hairFront;
    ctx.fillRect(posX + 1, posY - 5, 22, 6);
    ctx.fillRect(posX + 1, posY + 1, 4, 6);
    ctx.fillRect(posX + 19, posY + 1, 4, 5);
    ctx.fillRect(posX + 5, posY + 1, 5, 2);
    // Honey blonde highlight streaks
    ctx.fillStyle = palette.hairHighlight;
    ctx.fillRect(posX + 3, posY - 4, 6, 2);
    ctx.fillRect(posX + 13, posY - 4, 6, 2);

    // Tammy's cute teal & gold hairpin
    if (palette.hairAccessory) {
      ctx.fillStyle = palette.hairAccessory.primary;
      ctx.fillRect(posX + 18, posY - 2, 4, 3);
      ctx.fillStyle = palette.hairAccessory.secondary;
      ctx.fillRect(posX + 19, posY - 1, 2, 1);
    }
  }

  // 5. Facial Expressions, Eye-Tracking Saccades, 4-Phase Lip Sync & Bonnie's Spectacles
  renderExpressionFace(ctx, expression, isBonnie, faceX, faceY, palette, frameCount, state.isSpeaking, facingFactor);

  // Bonnie's Vintage Gold Half-Rim Reading Glasses (glinting softly!)
  if (isBonnie) {
    ctx.fillStyle = '#d97706'; // Gold bridge & side temples
    ctx.fillRect(faceX + 10, faceY + 8, 4, 1); // Nose bridge
    ctx.fillRect(faceX + 2, faceY + 8, 2, 1);
    ctx.fillRect(faceX + 20, faceY + 8, 2, 1);
    // Delicate lower gold rims under eyes
    ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.fillRect(faceX + 4, faceY + 11, 6, 1);
    ctx.fillRect(faceX + 14, faceY + 11, 6, 1);
    // Subtle lens glint
    if (frameCount % 90 < 18) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(faceX + 4, faceY + 7, 1, 2);
      ctx.fillRect(faceX + 14, faceY + 7, 1, 2);
    }
  }

  ctx.restore(); // Restore articulated head transform

  // ───────────────────────────────────────────────────────────────────────────
  // 6. ACTIONS, SLEEVES, ARTICULATED ARMS / HANDS & PROPS
  // ───────────────────────────────────────────────────────────────────────────
  renderActionPoses(ctx, state, action, isBonnie, posX, posY, bodyY, palette, frameCount, facingFactor, isProfile, propImages);

  ctx.restore();
}

/**
 * Render the 6 Emotive Expressions with Eye-Tracking Saccades & 4-Phase Lip Sync
 */
function renderExpressionFace(
  ctx: CanvasRenderingContext2D,
  expression: CharacterExpression,
  isBonnie: boolean,
  faceX: number,
  faceY: number,
  palette: CharacterPalette,
  frameCount: number,
  isSpeaking: boolean,
  facingFactor: number = 1
): void {
  const isBlinking = (frameCount % 150) < 7;
  const eyeColor = palette.eyes;
  const closedColor = palette.eyesClosed;

  // Dynamic eye saccade: occasionally glance up at the Shop TV (-1px Y) or toward speaking partner
  const lookAtTv = !isSpeaking && (frameCount % 140 > 95);
  const pupilShiftX = facingFactor > 0 ? 1 : 0;
  const pupilShiftY = lookAtTv ? -1 : 0;

  // Helper for 4-phase vowel lip-sync mouth
  const renderLipSyncMouth = (mx: number, my: number, defaultSmile: boolean = true) => {
    if (!isSpeaking) {
      ctx.fillStyle = palette.mouth;
      if (defaultSmile) {
        ctx.fillRect(mx, my + 1, 6, 2);
        ctx.fillRect(mx - 1, my, 1, 1);
        ctx.fillRect(mx + 6, my, 1, 1);
      } else {
        ctx.fillRect(mx + 1, my + 1, 4, 1);
      }
      return;
    }

    const vowelPhase = Math.floor(frameCount / 4) % 4;
    if (vowelPhase === 0) {
      // Wide 'AH' open vowel with upper teeth & pink tongue
      ctx.fillStyle = palette.mouth;
      ctx.fillRect(mx, my, 6, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx + 1, my, 4, 1);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(mx + 2, my + 2, 2, 2);
    } else if (vowelPhase === 1) {
      // Medium 'EH' smile vowel
      ctx.fillStyle = palette.mouth;
      ctx.fillRect(mx, my + 1, 6, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx + 1, my + 1, 4, 1);
    } else if (vowelPhase === 2) {
      // Round 'OH' vowel
      ctx.fillStyle = palette.mouth;
      ctx.fillRect(mx + 1, my, 4, 4);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(mx + 2, my + 2, 2, 1);
    } else {
      // Closed consonant beat with warm smile corners
      ctx.fillStyle = palette.mouth;
      ctx.fillRect(mx, my + 1, 6, 1);
      ctx.fillRect(mx - 1, my, 1, 1);
      ctx.fillRect(mx + 6, my, 1, 1);
    }
  };

  switch (expression) {
    case 'happy': {
      // Expressive eyebrows
      ctx.fillStyle = closedColor;
      ctx.fillRect(faceX + (isBonnie ? 4 : 3), faceY + 4, 5, 1);
      ctx.fillRect(faceX + (isBonnie ? 15 : 12), faceY + 4, 5, 1);

      if (isBlinking) {
        ctx.fillStyle = closedColor;
        ctx.fillRect(faceX + (isBonnie ? 4 : 3), faceY + 9, 5, 1);
        ctx.fillRect(faceX + (isBonnie ? 15 : 12), faceY + 9, 5, 1);
      } else {
        // White sclera + deep iris + specular eye glint
        const lx = faceX + (isBonnie ? 4 : 3);
        const rx = faceX + (isBonnie ? 15 : 12);
        const ey = faceY + 6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(lx, ey, 5, 5);
        ctx.fillRect(rx, ey, 5, 5);
        ctx.fillStyle = eyeColor;
        ctx.fillRect(lx + 1 + pupilShiftX, ey + 1 + pupilShiftY, 3, 4);
        ctx.fillRect(rx + 1 + pupilShiftX, ey + 1 + pupilShiftY, 3, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(lx + 1, ey + 1, 1, 2);
        ctx.fillRect(rx + 1, ey + 1, 1, 2);
      }
      renderLipSyncMouth(faceX + (isBonnie ? 9 : 7), faceY + (isBonnie ? 14 : 13), true);
      break;
    }

    case 'shocked': {
      // Wide white sclera with tiny pupils, high arched brows, 'O' mouth
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(faceX + (isBonnie ? 4 : 3), faceY + 5, 5, 6);
      ctx.fillRect(faceX + (isBonnie ? 15 : 12), faceY + 5, 5, 6);
      ctx.fillStyle = eyeColor;
      ctx.fillRect(faceX + (isBonnie ? 6 : 5), faceY + 7 + pupilShiftY, 2, 2);
      ctx.fillRect(faceX + (isBonnie ? 17 : 14), faceY + 7 + pupilShiftY, 2, 2);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(faceX + (isBonnie ? 4 : 3), faceY + 3, 5, 1);
      ctx.fillRect(faceX + (isBonnie ? 15 : 12), faceY + 3, 5, 1);
      if (isSpeaking) {
        renderLipSyncMouth(faceX + (isBonnie ? 9 : 7), faceY + (isBonnie ? 14 : 13), false);
      } else {
        ctx.fillStyle = palette.mouth;
        ctx.fillRect(faceX + (isBonnie ? 10 : 8), faceY + (isBonnie ? 14 : 13), 4, 4);
      }
      // Floating reaction emote particles: animated comic sweat drops with spray
      ctx.fillStyle = '#38bdf8';
      const sweatDropY = faceY + 4 + Math.floor((frameCount % 24) * 0.4);
      ctx.fillRect(faceX + (isBonnie ? 22 : 18), sweatDropY, 2, 3);
      ctx.fillRect(faceX + (isBonnie ? 23 : 19), sweatDropY - 1, 1, 1);
      if (frameCount % 16 < 8) {
        ctx.fillRect(faceX + (isBonnie ? 25 : 21), faceY + 2, 1, 2);
        ctx.fillRect(faceX - 2, faceY + 5, 2, 2);
      }
      break;
    }

    case 'sleepy': {
      ctx.fillStyle = closedColor;
      ctx.fillRect(faceX + (isBonnie ? 5 : 4), faceY + 8, 5, 2);
      ctx.fillRect(faceX + (isBonnie ? 15 : 12), faceY + 8, 5, 2);
      ctx.fillStyle = eyeColor;
      ctx.fillRect(faceX + (isBonnie ? 6 : 5), faceY + 10, 3, 1);
      ctx.fillRect(faceX + (isBonnie ? 16 : 13), faceY + 10, 3, 1);
      renderLipSyncMouth(faceX + (isBonnie ? 9 : 7), faceY + (isBonnie ? 14 : 13), false);
      const zPhase = (frameCount * 0.05) % 1;
      ctx.fillStyle = 'rgba(216, 180, 254, 0.9)';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('z', faceX + (isBonnie ? 23 : 19), faceY - 2 - zPhase * 8);
      ctx.font = 'bold 10px monospace';
      ctx.fillText('Z', faceX + (isBonnie ? 26 : 22), faceY - 8 - zPhase * 8);
      break;
    }

    case 'laughing': {
      // Joyful >< curved eyes, wide laughing mouth with teeth & tongue
      ctx.fillStyle = closedColor;
      ctx.fillRect(faceX + (isBonnie ? 5 : 4), faceY + 7, 2, 1);
      ctx.fillRect(faceX + (isBonnie ? 7 : 6), faceY + 8, 2, 1);
      ctx.fillRect(faceX + (isBonnie ? 5 : 4), faceY + 9, 2, 1);

      ctx.fillRect(faceX + (isBonnie ? 15 : 12), faceY + 7, 2, 1);
      ctx.fillRect(faceX + (isBonnie ? 17 : 14), faceY + 8, 2, 1);
      ctx.fillRect(faceX + (isBonnie ? 15 : 12), faceY + 9, 2, 1);

      ctx.fillStyle = palette.mouth;
      ctx.fillRect(faceX + (isBonnie ? 8 : 6), faceY + (isBonnie ? 13 : 12), 8, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(faceX + (isBonnie ? 9 : 7), faceY + (isBonnie ? 13 : 12), 6, 1);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(faceX + (isBonnie ? 10 : 8), faceY + (isBonnie ? 15 : 14), 4, 2);

      // Floating reaction emote particles: streaming joy tears and laugh sparkles
      ctx.fillStyle = '#67e8f9';
      const tearY = faceY + 8 + Math.floor((frameCount % 18) * 0.4);
      ctx.fillRect(faceX + (isBonnie ? 21 : 17), tearY, 2, 2);
      ctx.fillRect(faceX + (isBonnie ? 3 : 2), tearY, 2, 2);
      ctx.fillStyle = '#fbbf24';
      const sparkPhase = frameCount * 0.15;
      ctx.fillRect(faceX + (isBonnie ? 24 : 20) + Math.sin(sparkPhase) * 3, faceY - 2, 2, 2);
      ctx.fillRect(faceX - 3 - Math.cos(sparkPhase) * 3, faceY - 1, 2, 2);
      break;
    }

    case 'proud grandma': {
      ctx.fillStyle = closedColor;
      ctx.fillRect(faceX + 5, faceY + 8, 2, 1);
      ctx.fillRect(faceX + 7, faceY + 7, 2, 1);
      ctx.fillRect(faceX + 9, faceY + 8, 2, 1);

      ctx.fillRect(faceX + 15, faceY + 8, 2, 1);
      ctx.fillRect(faceX + 17, faceY + 7, 2, 1);
      ctx.fillRect(faceX + 19, faceY + 8, 2, 1);

      renderLipSyncMouth(faceX + (isBonnie ? 9 : 7), faceY + (isBonnie ? 14 : 13), true);

      // Floating reaction emote particles: animated floating hearts
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 9px monospace';
      const heart1Y = faceY - 4 - Math.sin(frameCount * 0.1) * 4;
      ctx.fillText('♥', faceX + 22, heart1Y);
      const heart2Y = faceY - 10 - Math.sin((frameCount + 20) * 0.1) * 3;
      ctx.font = 'bold 7px monospace';
      ctx.fillStyle = '#fb7185';
      ctx.fillText('♥', faceX + 26, heart2Y);
      const heart3Y = faceY - 2 - Math.sin((frameCount + 40) * 0.08) * 3;
      ctx.font = 'bold 6px monospace';
      ctx.fillStyle = '#fda4af';
      ctx.fillText('♥', faceX - 5, heart3Y);
      break;
    }

    case 'eye-rolling daughter': {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(faceX + (isBonnie ? 4 : 3), faceY + 6, 5, 5);
      ctx.fillRect(faceX + (isBonnie ? 15 : 12), faceY + 6, 5, 5);
      // Pupils rolled to top corner
      ctx.fillStyle = eyeColor;
      ctx.fillRect(faceX + (isBonnie ? 6 : 5), faceY + 6, 3, 2);
      ctx.fillRect(faceX + (isBonnie ? 17 : 14), faceY + 6, 3, 2);
      // Asymmetric sassy eyebrow
      ctx.fillStyle = '#451a03';
      ctx.fillRect(faceX + (isBonnie ? 4 : 3), faceY + 4, 5, 1);
      ctx.fillRect(faceX + (isBonnie ? 15 : 12), faceY + 3, 5, 1);

      renderLipSyncMouth(faceX + (isBonnie ? 9 : 7), faceY + (isBonnie ? 14 : 13), false);

      // Floating reaction emote particles: sigh puff and steam wisps
      const sighOffset = (frameCount % 60) * 0.2;
      ctx.fillStyle = 'rgba(245, 239, 230, 0.6)';
      ctx.fillRect(faceX + (isBonnie ? 21 : 17) + sighOffset, faceY + 12, 2, 2);
      ctx.fillRect(faceX + (isBonnie ? 23 : 19) + sighOffset, faceY + 11, 3, 2);
      const steamLag = (frameCount * 0.1) % 1;
      ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.fillRect(faceX - 4 + Math.sin(frameCount * 0.15) * 2, faceY + 2 - steamLag * 10, 2, 3);
      ctx.fillRect(faceX + (isBonnie ? 24 : 20) + 2 - Math.sin(frameCount * 0.15) * 2, faceY + 2 - steamLag * 10, 2, 3);
      break;
    }
  }
}

/**
 * Articulated Arm Kinematics & Prop Interaction
 */
export function drawArm(
  ctx: CanvasRenderingContext2D,
  skinColor: string,
  shoulderX: number,
  shoulderY: number,
  angleRad: number,
  length: number = 7,
  thickness: number = 4
): void {
  ctx.save();
  ctx.translate(shoulderX, shoulderY);
  ctx.rotate(angleRad);
  ctx.fillStyle = '#1c110a';
  ctx.fillRect(-Math.floor(thickness / 2) - 1, -1, thickness + 2, length + 2);
  ctx.fillStyle = skinColor;
  ctx.fillRect(-Math.floor(thickness / 2), 0, thickness, length);
  ctx.restore();
}

/**
 * Helper to draw a sleeved arm + hand with 1px dark outline
 */
function drawSleevedArmAndHand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sleeveColor: string,
  skinColor: string,
  outlineColor: string
): void {
  ctx.fillStyle = outlineColor;
  ctx.fillRect(x - 1, y - 1, 6, 9);
  ctx.fillStyle = sleeveColor;
  ctx.fillRect(x, y, 4, 4);
  ctx.fillStyle = skinColor;
  ctx.fillRect(x, y + 4, 4, 3);
}

/**
 * Render Character Actions (All 7 Supported + Idle + Active Speech Gestures)
 */
function renderActionPoses(
  ctx: CanvasRenderingContext2D,
  state: CharacterState,
  action: CharacterAction,
  isBonnie: boolean,
  posX: number,
  posY: number,
  bodyY: number,
  palette: CharacterPalette,
  frameCount: number,
  facingFactor: number,
  _isProfile: boolean,
  propImages?: Map<string, HTMLImageElement>
): void {
  const armY = bodyY + 2;
  const talkWave = state.isSpeaking ? Math.round(Math.sin(frameCount * 0.28) * 3) : 0;

  switch (action) {
    case 'walk': {
      const stride = Math.sin(frameCount * 0.28);
      ctx.fillStyle = '#1c1917';
      const footY = bodyY + (isBonnie ? 24 : 20);
      ctx.fillRect(posX + (isBonnie ? 6 : 5) + Math.floor(stride * 3), footY, 4, 3);
      ctx.fillRect(posX + (isBonnie ? 16 : 13) - Math.floor(stride * 3), footY, 4, 3);

      drawSleevedArmAndHand(
        ctx,
        posX - 2 - Math.floor(stride * 2),
        armY + 2,
        palette.dress,
        palette.skin,
        palette.outline
      );
      drawSleevedArmAndHand(
        ctx,
        posX + (isBonnie ? 26 : 22) + Math.floor(stride * 2),
        armY + 2,
        palette.dress,
        palette.skin,
        palette.outline
      );
      break;
    }

    case 'turn': {
      const lArmY = armY + 3 + (facingFactor < 0 ? talkWave : 0);
      const rArmY = armY + 3 + (facingFactor > 0 ? talkWave : 0);
      drawSleevedArmAndHand(ctx, posX - 2, lArmY, palette.dress, palette.skin, palette.outline);
      drawSleevedArmAndHand(
        ctx,
        posX + (isBonnie ? 26 : 22),
        rArmY,
        palette.dress,
        palette.skin,
        palette.outline
      );
      break;
    }

    case 'laugh': {
      const bounce = Math.round(Math.sin(frameCount * 0.4) * 2);
      drawSleevedArmAndHand(ctx, posX + 1, armY + 5 + bounce, palette.dress, palette.skin, palette.outline);
      drawSleevedArmAndHand(
        ctx,
        posX + (isBonnie ? 23 : 19),
        armY + 5 - bounce,
        palette.dress,
        palette.skin,
        palette.outline
      );
      const sparkX = posX + (frameCount % 4 === 0 ? 28 : -4);
      const sparkY = posY - 4 + Math.sin(frameCount * 0.2) * 4;
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(sparkX, sparkY, 2, 2);
      ctx.fillRect(sparkX - 1, sparkY + 1, 4, 1);
      break;
    }

    case 'gasp': {
      // Hands raised toward cheeks with dark outline
      ctx.fillStyle = palette.outline;
      ctx.fillRect(posX, posY + 9, 7, 7);
      ctx.fillRect(posX + (isBonnie ? 21 : 17), posY + 9, 7, 7);
      ctx.fillStyle = palette.skin;
      ctx.fillRect(posX + 1, posY + 10, 5, 5);
      ctx.fillRect(posX + (isBonnie ? 22 : 18), posY + 10, 5, 5);
      // Gold exclamation mark above head
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(posX + 12, posY - 14, 3, 7);
      ctx.fillRect(posX + 12, posY - 5, 3, 2);
      break;
    }

    case 'hold trinket': {
      const handY = bodyY + 3 + Math.round(talkWave * 0.5);
      const innerHandX = isBonnie ? posX + 26 : posX - 6;
      const outerArmX = isBonnie ? posX - 2 : posX + 22;

      drawSleevedArmAndHand(ctx, outerArmX, bodyY + 5, palette.dress, palette.skin, palette.outline);
      drawSleevedArmAndHand(ctx, innerHandX, handY, palette.dress, palette.skin, palette.outline);

      // Product cutout floating cleanly above the extended hand
      const propFloatY = handY - 12 + Math.sin(frameCount * 0.12) * 2;
      const propCenterX = innerHandX + 2;

      let drewImage = false;
      const propKey = state.activePropId || state.heldPropUrl;
      if (propKey && propImages && propImages.has(propKey)) {
        const img = propImages.get(propKey);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, propCenterX - 9, propFloatY - 9, 18, 18);
          drewImage = true;
        }
      }

      if (!drewImage) {
        ctx.fillStyle = '#e8748a';
        ctx.fillRect(propCenterX - 4, propFloatY - 4, 8, 8);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(propCenterX - 2, propFloatY - 2, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(propCenterX - 1, propFloatY - 3, 2, 2);
      }

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(propCenterX - 7, propFloatY - 7, 2, 2);
      ctx.fillRect(propCenterX + 6, propFloatY - 6, 2, 2);
      break;
    }

    case 'sip tea': {
      const cupX = posX + (isBonnie ? 12 : 10);
      const cupY = posY + (isBonnie ? 14 : 13) + Math.round(Math.sin(frameCount * 0.15) * 1);
      ctx.fillStyle = palette.outline;
      ctx.fillRect(cupX - 4, cupY - 1, 12, 8);
      ctx.fillStyle = palette.skin;
      ctx.fillRect(cupX - 6, cupY + 2, 4, 4);

      // Vintage ceramic teacup
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(cupX - 3, cupY, 8, 6);
      ctx.fillStyle = '#e8748a';
      ctx.fillRect(cupX - 3, cupY + 2, 8, 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cupX + 5, cupY + 1, 2, 4);

      const steamPhase = (frameCount * 0.08) % 1;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.fillRect(cupX - 1 + Math.sin(frameCount * 0.1) * 2, cupY - 4 - steamPhase * 6, 2, 2);
      ctx.fillRect(cupX + 2 - Math.sin(frameCount * 0.1) * 2, cupY - 7 - steamPhase * 6, 2, 2);
      break;
    }

    case 'pack box': {
      const boxBaseX = posX + (isBonnie ? 5 : 3);
      const boxBaseY = bodyY + 9;
      drawSleevedArmAndHand(ctx, boxBaseX - 4, boxBaseY + 1, palette.dress, palette.skin, palette.outline);
      drawSleevedArmAndHand(ctx, boxBaseX + 18, boxBaseY + 1, palette.dress, palette.skin, palette.outline);

      ctx.fillStyle = palette.outline;
      ctx.fillRect(boxBaseX - 1, boxBaseY - 1, 20, 16);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(boxBaseX, boxBaseY, 18, 14);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(boxBaseX, boxBaseY + 6, 18, 2);
      ctx.fillStyle = '#e8748a';
      ctx.fillRect(boxBaseX + 7, boxBaseY, 4, 14);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(boxBaseX + 8, boxBaseY + 5, 2, 4);
      break;
    }

    case 'idle':
    default: {
      drawSleevedArmAndHand(ctx, posX - 2, armY + 4 + talkWave, palette.dress, palette.skin, palette.outline);
      drawSleevedArmAndHand(
        ctx,
        posX + (isBonnie ? 26 : 22),
        armY + 4 - talkWave,
        palette.dress,
        palette.skin,
        palette.outline
      );
      break;
    }
  }
}
