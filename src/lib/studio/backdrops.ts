/**
 * src/lib/studio/backdrops.ts
 * 5 Distinct Cozy Scene Backdrops & Living Atmospheric Pixel Environment for "Bonnie & Tammy's Trinket Tales"
 * - Multi-Plane Parallax Arched Boutique Window (drifting clouds, flickering town skyline, swaying autumn tree, window-sill cat)
 * - Continuous Ambient Micro-Animations (swinging pendulum wall clock, order corkboard, flickering counter candle, steaming kettle, bubbling resin flask)
 * - Architectural Depth (dithered diamond wallpaper, timber wainscoting, recessed wood-paneled mahogany counter, patterned woven runner rug)
 * - In-Scene Overhead Pixel Speech Bubbles
 */

export type BackdropId =
  | 'cozy_night_shop'
  | 'morning_coffee_prep'
  | 'rainy_window_crafting'
  | 'holiday_spooky_season'
  | 'closing_time_lofi';

export interface BackdropParticleConfig {
  type: 'stardust' | 'sun_motes' | 'raindrops' | 'autumn_leaves' | 'lofi_dust';
  count: number;
  color: string;
  speed: number;
}

export interface BackdropConfig {
  id: BackdropId;
  name: string;
  description: string;
  tagline: string;
  wallGradient: [string, string];
  floorColor: string;
  floorTileColor: string;
  counterWoodColor: string;
  runnerColor: string;
  runnerFringeColor: string;
  ambientLightColor: string;
  ambientLightIntensity: number;
  particles: BackdropParticleConfig;
  windowSky: [string, string];
  themeProps: string[];
}

export const BACKDROP_CONFIGS: Record<BackdropId, BackdropConfig> = {
  cozy_night_shop: {
    id: 'cozy_night_shop',
    name: 'Cozy Night Shop',
    tagline: 'Starlit windows, glowing lanterns, and magical evening crafting vibes',
    description: 'Deep plum & forest-teal walls, twin flickering brass lanterns, stardust particles, and arched starry window.',
    wallGradient: ['#182226', '#233136'],
    floorColor: '#23140d',
    floorTileColor: 'rgba(120, 69, 38, 0.38)',
    counterWoodColor: '#2b1408',
    runnerColor: '#831843',
    runnerFringeColor: '#ffd700',
    ambientLightColor: '#fbbf24',
    ambientLightIntensity: 0.25,
    particles: {
      type: 'stardust',
      count: 26,
      color: 'rgba(251, 191, 36, 0.78)',
      speed: 0.6,
    },
    windowSky: ['#1e1b4b', '#7c2d12'],
    themeProps: ['potion_bottles', 'iron_lanterns', 'starry_window'],
  },
  morning_coffee_prep: {
    id: 'morning_coffee_prep',
    name: 'Morning Coffee Prep',
    tagline: 'Fresh brew, pastel sunrise rays, and peaceful dawn beginnings',
    description: 'Honeyed oak & sage woodwork, warm terracotta tiles, steaming brass kettle, and golden dawn window.',
    wallGradient: ['#28362c', '#3d4f41'],
    floorColor: '#2d160b',
    floorTileColor: 'rgba(254, 215, 170, 0.25)',
    counterWoodColor: '#3b1807',
    runnerColor: '#b45309',
    runnerFringeColor: '#fef08a',
    ambientLightColor: '#fef08a',
    ambientLightIntensity: 0.35,
    particles: {
      type: 'sun_motes',
      count: 22,
      color: 'rgba(254, 240, 138, 0.8)',
      speed: 0.4,
    },
    windowSky: ['#581c87', '#fb923c'],
    themeProps: ['brass_kettle', 'coffee_canisters', 'sunbeams'],
  },
  rainy_window_crafting: {
    id: 'rainy_window_crafting',
    name: 'Rainy Window Crafting',
    tagline: 'Pitter-patter raindrops, warm task lamps, and focused beadwork',
    description: 'Slate teal craft workshop, window rain streaks, focused warm desk lamp cone, and compartmentalized bead trays.',
    wallGradient: ['#13232c', '#1e3542'],
    floorColor: '#1b110c',
    floorTileColor: 'rgba(56, 189, 248, 0.2)',
    counterWoodColor: '#28150b',
    runnerColor: '#0369a1',
    runnerFringeColor: '#38bdf8',
    ambientLightColor: '#38bdf8',
    ambientLightIntensity: 0.22,
    particles: {
      type: 'raindrops',
      count: 36,
      color: 'rgba(125, 211, 252, 0.85)',
      speed: 1.8,
    },
    windowSky: ['#0f172a', '#334155'],
    themeProps: ['rain_streaks', 'craft_lamp', 'bead_trays'],
  },
  holiday_spooky_season: {
    id: 'holiday_spooky_season',
    name: 'Holiday / Spooky Season Decor',
    tagline: 'Autumn harvest charm, glowing carved jack-o\'-lanterns & fairy garland',
    description: 'Festive midnight indigo walls, pine garland with blinking lights, miniature carved pumpkins, and drifting autumn leaves.',
    wallGradient: ['#1e1b38', '#2e2652'],
    floorColor: '#24120b',
    floorTileColor: 'rgba(249, 115, 22, 0.3)',
    counterWoodColor: '#2b1408',
    runnerColor: '#c2410c',
    runnerFringeColor: '#fbbf24',
    ambientLightColor: '#f97316',
    ambientLightIntensity: 0.3,
    particles: {
      type: 'autumn_leaves',
      count: 20,
      color: 'rgba(249, 115, 22, 0.85)',
      speed: 0.8,
    },
    windowSky: ['#1e1b4b', '#9a3412'],
    themeProps: ['fairy_garland', 'mini_pumpkins', 'witchy_herbs'],
  },
  closing_time_lofi: {
    id: 'closing_time_lofi',
    name: '"Closing Time" Lo-Fi Chill',
    tagline: 'Late-night chillhop beats, violet neon sign, and resting shopkeep peace',
    description: 'Deep twilight room, glowing neon "CLOSED / RESTOCKING" sign with cyan/pink rim lighting, sleeping shop cat, and vintage cassette radio.',
    wallGradient: ['#161829', '#242342'],
    floorColor: '#1c100b',
    floorTileColor: 'rgba(168, 85, 247, 0.25)',
    counterWoodColor: '#241209',
    runnerColor: '#4a044e',
    runnerFringeColor: '#ec4899',
    ambientLightColor: '#c084fc',
    ambientLightIntensity: 0.28,
    particles: {
      type: 'lofi_dust',
      count: 24,
      color: 'rgba(216, 180, 254, 0.75)',
      speed: 0.35,
    },
    windowSky: ['#090d16', '#311042'],
    themeProps: ['neon_sign', 'cassette_radio', 'sleeping_cat'],
  },
};

export const BACKDROPS: BackdropConfig[] = Object.values(BACKDROP_CONFIGS);

export function getBackdropConfig(id: BackdropId): BackdropConfig {
  return BACKDROP_CONFIGS[id] || BACKDROP_CONFIGS.cozy_night_shop;
}

/**
 * Render the complete procedural backdrop onto the canvas
 * Includes:
 * - Dithered diamond wallpaper & wainscoting woodwork
 * - Multi-plane parallax arched boutique window (sky, drifting clouds, town skyline, swaying tree, window-sill cat)
 * - Left wall swinging pendulum clock & pinned order corkboard
 * - Right wall two-tiered apothecary/bead shelves, hanging herbs & swaying brass lantern
 * - Hardwood plank floor & volumetric ambient lighting/particles
 */
export function renderBackdrop(
  ctx: CanvasRenderingContext2D,
  backdropId: BackdropId,
  width: number,
  height: number,
  counterY: number,
  frameCount: number = 0
): void {
  const config = getBackdropConfig(backdropId);

  // 1. Rich Wall Background Gradient
  const wallGrad = ctx.createLinearGradient(0, 0, 0, counterY + 20);
  wallGrad.addColorStop(0, config.wallGradient[0]);
  wallGrad.addColorStop(1, config.wallGradient[1]);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Dithered Diamond Wallpaper Texture & Vertical Timber Beams
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let wy = 16; wy < counterY - 24; wy += 12) {
    for (let wx = (wy % 24 === 0 ? 6 : 0); wx < width; wx += 12) {
      ctx.fillRect(wx, wy, 2, 2);
      ctx.fillRect(wx + 2, wy + 2, 1, 1);
    }
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  for (let x = 0; x < width; x += 44) {
    ctx.fillRect(x, 0, 2, counterY);
  }

  // Lower wall wood wainscoting behind counter
  const wainscotY = counterY - 28;
  ctx.fillStyle = '#26130a';
  ctx.fillRect(0, wainscotY, width, 30);
  ctx.fillStyle = '#472414';
  ctx.fillRect(0, wainscotY, width, 2);
  ctx.fillStyle = '#170b05';
  for (let wx = 8; wx < width; wx += 22) {
    ctx.strokeStyle = '#381b0e';
    ctx.lineWidth = 1;
    ctx.strokeRect(wx, wainscotY + 4, 16, 20);
  }

  // Determine vertical layout zone (in 9:16 split-screen, y=28..176 is occupied by the Shop TV monitor)
  const isTallSplit = counterY >= 260;
  const zoneTopY = isTallSplit ? 178 : 14;

  // Decorative garland string & ceiling beam beneath the top monitor
  ctx.fillStyle = '#3b1d0e';
  ctx.fillRect(0, zoneTopY - 4, width, 4);
  ctx.fillStyle = '#166534';
  for (let gx = 6; gx < width - 6; gx += 8) {
    const sag = Math.round(Math.sin((gx / width) * Math.PI * 3) * 2);
    ctx.fillRect(gx, zoneTopY + sag, 5, 2);
    if (gx % 24 === 6) {
      const twinkle = 0.55 + 0.45 * Math.sin(frameCount * 0.12 + gx);
      ctx.fillStyle = `rgba(254, 240, 138, ${twinkle.toFixed(2)})`;
      ctx.fillRect(gx + 1, zoneTopY + sag + 2, 2, 2);
      ctx.fillStyle = '#166534';
    }
  }

  // 3. GRAND ARCHED BOUTIQUE WINDOW (Multi-Plane Living Exterior World)
  const winW = isTallSplit ? 92 : Math.min(130, Math.floor(width * 0.36));
  const winH = isTallSplit ? 88 : Math.min(76, Math.floor(counterY * 0.48));
  const winX = isTallSplit ? 54 : Math.floor((width - winW) / 2) - 20;
  const winY = isTallSplit ? zoneTopY + 6 : 18;

  renderArchedBoutiqueWindow(ctx, config, winX, winY, winW, winH, frameCount);

  // 4. LEFT WALL: Swinging Pendulum Clock & Order Corkboard
  const leftWallX = 10;
  const clockY = winY + 6;
  renderPendulumClockAndCorkboard(ctx, leftWallX, clockY, frameCount);

  // 5. RIGHT WALL: Two-Tiered Apothecary / Craft Shelves & Swaying Brass Lantern
  const shelfX = winX + winW + 12;
  const shelfW = Math.max(72, width - shelfX - 10);
  const shelfY1 = winY + 34;
  const shelfY2 = winY + 68;

  // Hanging brass lanterns (left of window & above right shelf)
  const lanternSway = Math.sin(frameCount * 0.06) * 1.5;
  renderLantern(ctx, winX + winW - 8 + Math.round(lanternSway), winY + 8, frameCount, '#fbbf24');
  renderLantern(ctx, shelfX + Math.floor(shelfW * 0.65) - Math.round(lanternSway), winY + 4, frameCount, '#fbbf24');

  // Hanging dried herbs / lavender bundles under top beam
  for (let hx = shelfX + 6; hx < shelfX + shelfW - 22; hx += 14) {
    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(hx, winY + 10, 2, 7);
    ctx.fillStyle = hx % 28 === 0 ? '#a855f7' : '#f59e0b';
    ctx.fillRect(hx - 1, winY + 17, 4, 4);
  }

  // Shelf 1 (Upper Right)
  ctx.fillStyle = '#3b1d0e';
  ctx.fillRect(shelfX, shelfY1, shelfW, 4);
  ctx.fillStyle = '#6f452a';
  ctx.fillRect(shelfX, shelfY1 - 1, shelfW, 1);
  renderShelfThemedProps(ctx, config.id, shelfX, shelfY1, shelfW, frameCount, 0);

  // Shelf 2 (Lower Right)
  ctx.fillStyle = '#3b1d0e';
  ctx.fillRect(shelfX, shelfY2, shelfW, 4);
  ctx.fillStyle = '#6f452a';
  ctx.fillRect(shelfX, shelfY2 - 1, shelfW, 1);
  renderShelfThemedProps(ctx, config.id, shelfX, shelfY2, shelfW, frameCount, 1);

  // 6. Hardwood Plank Floor
  const floorTopY = counterY + 15;
  ctx.fillStyle = config.floorColor;
  ctx.fillRect(0, floorTopY, width, height - floorTopY);

  // Warm Hardwood Plank Lines & Staggered Joints
  ctx.fillStyle = config.floorTileColor;
  for (let y = floorTopY; y < height; y += 10) {
    ctx.fillRect(0, y, width, 1);
    const offset = ((y - floorTopY) / 10) % 2 === 0 ? 0 : 18;
    for (let x = offset; x < width; x += 36) {
      ctx.fillRect(x, y, 1, 10);
    }
  }

  // 7. Ambient Lighting Overlay & Volumetric Particles
  renderBackdropLightingAndParticles(ctx, config, width, height, counterY, frameCount);
}

/**
 * Multi-Plane Parallax Arched Boutique Window
 * - Dawn/Twilight Sky Gradient + Stars/Moon/Sunrise
 * - Drifting Pixel Clouds
 * - Distant Cozy Town Silhouette with Flickering Warm Windows
 * - Swaying Autumn Tree in Outside Breeze
 * - Barnaby the Shop Cat Sitting on the Window Sill (Swishing Tail & Blinking Eyes)
 */
function renderArchedBoutiqueWindow(
  ctx: CanvasRenderingContext2D,
  config: BackdropConfig,
  winX: number,
  winY: number,
  winW: number,
  winH: number,
  frameCount: number
): void {
  ctx.save();

  const archRadius = Math.floor(winW / 2);
  const archCenterX = winX + archRadius;
  const archCenterY = winY + Math.min(28, Math.floor(winH * 0.32));

  // Outer Mahogany Window Casing
  ctx.fillStyle = '#261107';
  ctx.beginPath();
  ctx.arc(archCenterX, archCenterY, archRadius + 4, Math.PI, 0, false);
  ctx.lineTo(winX + winW + 4, winY + winH + 4);
  ctx.lineTo(winX - 4, winY + winH + 4);
  ctx.closePath();
  ctx.fill();

  // Clip interior to arched window shape
  ctx.beginPath();
  ctx.arc(archCenterX, archCenterY, archRadius, Math.PI, 0, false);
  ctx.lineTo(winX + winW, winY + winH);
  ctx.lineTo(winX, winY + winH);
  ctx.closePath();
  ctx.clip();

  // Layer 1: Dawn / Twilight Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, winY - 10, 0, winY + winH);
  skyGrad.addColorStop(0, config.windowSky[0]);
  skyGrad.addColorStop(0.55, '#4c1d95');
  skyGrad.addColorStop(1, config.windowSky[1]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(winX, winY - 10, winW, winH + 10);

  // Twinkling Stars in upper arch
  ctx.fillStyle = '#ffffff';
  const stars = [
    [winX + 16, winY + 8],
    [winX + 34, winY + 4],
    [winX + 58, winY + 7],
    [winX + 74, winY + 14],
    [winX + 24, winY + 20],
  ];
  stars.forEach(([sx, sy], idx) => {
    const on = (frameCount + idx * 19) % 40 < 28;
    if (on) ctx.fillRect(sx, sy, idx % 2 === 0 ? 2 : 1, idx % 2 === 0 ? 2 : 1);
  });

  // Glowing Crescent Moon / Dawn Sun near right arch
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(winX + winW - 18, winY + 24, 6, 0, Math.PI * 2);
  ctx.fill();
  if (config.id !== 'morning_coffee_prep') {
    ctx.fillStyle = '#3b1764';
    ctx.beginPath();
    ctx.arc(winX + winW - 20, winY + 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Layer 2: Drifting Pixel Clouds (slow parallax motion)
  const cloud1X = winX + ((frameCount * 0.12) % (winW + 30)) - 20;
  const cloud2X = winX + ((frameCount * 0.08 + 48) % (winW + 30)) - 20;
  ctx.fillStyle = 'rgba(46, 26, 71, 0.78)';
  ctx.fillRect(Math.round(cloud1X), winY + 18, 24, 5);
  ctx.fillRect(Math.round(cloud1X) + 4, winY + 15, 16, 3);
  ctx.fillRect(Math.round(cloud2X), winY + 30, 20, 4);
  ctx.fillRect(Math.round(cloud2X) + 3, winY + 28, 12, 2);

  // Layer 3: Cozy Town Buildings Silhouette Across the Street
  const townBaseY = winY + winH;
  // Left town house
  ctx.fillStyle = '#271728';
  ctx.fillRect(winX + 4, townBaseY - 34, 28, 34);
  // Pitched roof
  ctx.beginPath();
  ctx.moveTo(winX + 2, townBaseY - 34);
  ctx.lineTo(winX + 18, townBaseY - 46);
  ctx.lineTo(winX + 34, townBaseY - 34);
  ctx.closePath();
  ctx.fill();

  // Center-right town house
  ctx.fillStyle = '#1f1224';
  ctx.fillRect(winX + 34, townBaseY - 28, 30, 28);
  ctx.fillRect(winX + 64, townBaseY - 36, 26, 36);

  // Warm Lit Town Windows (with gentle life flicker)
  const townWindows = [
    [winX + 10, townBaseY - 28],
    [winX + 20, townBaseY - 28],
    [winX + 10, townBaseY - 16],
    [winX + 20, townBaseY - 16],
    [winX + 40, townBaseY - 22],
    [winX + 50, townBaseY - 22],
    [winX + 40, townBaseY - 12],
    [winX + 50, townBaseY - 12],
    [winX + 70, townBaseY - 26],
  ];
  townWindows.forEach(([wx, wy], i) => {
    const lit = (Math.floor(frameCount / 90) + i * 3) % 7 !== 0;
    ctx.fillStyle = lit ? '#fde047' : '#3b213d';
    ctx.fillRect(wx, wy, 5, 7);
  });

  // Layer 4: Swaying Autumn Tree in Left Window Pane
  const treeSway = Math.round(Math.sin(frameCount * 0.05) * 1.5);
  ctx.fillStyle = '#3b1d0e';
  ctx.fillRect(winX + 16, townBaseY - 38, 3, 38);
  const foliageColors = ['#ea580c', '#d97706', '#f59e0b', '#9a3412'];
  for (let fy = 0; fy < 5; fy++) {
    for (let fx = 0; fx < 6; fx++) {
      if ((fx + fy) % 2 === 0) {
        ctx.fillStyle = foliageColors[(fx + fy) % foliageColors.length];
        ctx.fillRect(winX + 6 + fx * 4 + treeSway, winY + 22 + fy * 4, 3, 3);
      }
    }
  }

  // Optional Rain Streaks inside window for Rainy backdrop
  if (config.id === 'rainy_window_crafting') {
    ctx.fillStyle = 'rgba(125, 211, 252, 0.55)';
    for (let r = 0; r < 10; r++) {
      const rx = winX + ((r * 13 + frameCount * 2) % (winW - 6));
      const ry = winY + ((r * 11 + frameCount * 4) % (winH - 8));
      ctx.fillRect(rx, ry, 1, 6);
    }
  }

  // Wooden Mullion Crossbars
  ctx.fillStyle = '#2b1408';
  ctx.fillRect(winX + Math.floor(winW / 2) - 1, winY - 6, 3, winH + 6);
  ctx.fillRect(winX, winY + Math.floor(winH * 0.42), winW, 3);
  ctx.fillRect(winX, winY + Math.floor(winH * 0.72), winW, 2);

  ctx.restore();

  // Wooden Window Sill Ledge
  ctx.fillStyle = '#472414';
  ctx.fillRect(winX - 6, winY + winH, winW + 12, 5);
  ctx.fillStyle = '#6f3b20';
  ctx.fillRect(winX - 6, winY + winH, winW + 12, 2);

  // Layer 5: BARNABY THE SHOP CAT SITTING ON THE WINDOW SILL!
  const catX = winX + 18;
  const catY = winY + winH - 11;
  // Cat body (charcoal grey/tuxedo silhouette)
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(catX, catY + 4, 8, 7);
  // Cat head & pointed ears
  ctx.fillRect(catX + 1, catY, 7, 5);
  ctx.fillRect(catX + 1, catY - 2, 2, 2);
  ctx.fillRect(catX + 6, catY - 2, 2, 2);
  // White chest tuft
  ctx.fillStyle = '#e4e4e7';
  ctx.fillRect(catX + 3, catY + 5, 3, 3);
  // Glowing golden eyes (blinks every 80 frames)
  const catBlinking = frameCount % 80 >= 75;
  if (!catBlinking) {
    ctx.fillStyle = '#fde047';
    ctx.fillRect(catX + 2, catY + 2, 2, 1);
    ctx.fillRect(catX + 5, catY + 2, 2, 1);
  }
  // Animated swishing tail hanging over the sill
  const tailSwing = Math.round(Math.sin(frameCount * 0.11) * 3);
  ctx.fillStyle = '#27272a';
  ctx.fillRect(catX - 2, catY + 8, 2, 4);
  ctx.fillRect(catX - 2 + tailSwing, catY + 11, 3, 2);
}

/**
 * Left Shop Wall: Swinging Pendulum Clock & Pinned Order Corkboard
 */
function renderPendulumClockAndCorkboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frameCount: number
): void {
  // 1. Vintage Wall Clock with Swinging Brass Pendulum
  const clockX = x + 6;
  const clockY = y;
  // Pendulum housing box
  ctx.fillStyle = '#3b1d0e';
  ctx.fillRect(clockX + 3, clockY + 12, 10, 14);
  ctx.fillStyle = '#1c0d06';
  ctx.fillRect(clockX + 5, clockY + 13, 6, 11);

  // Swinging Brass Pendulum Bob
  const swing = Math.round(Math.sin(frameCount * 0.15) * 3);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(clockX + 8 + Math.trunc(swing * 0.5), clockY + 13, 1, 7);
  ctx.fillRect(clockX + 7 + swing, clockY + 19, 3, 3);

  // Clock Octagonal Wood Bezel & Cream Dial
  ctx.fillStyle = '#472414';
  ctx.fillRect(clockX, clockY, 16, 14);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(clockX + 2, clockY + 2, 12, 10);

  // Clock Hands
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(clockX + 7, clockY + 3, 1, 4); // Hour hand
  const minDx = Math.round(Math.cos(frameCount * 0.02) * 3);
  const minDy = Math.round(Math.sin(frameCount * 0.02) * 3);
  ctx.fillRect(clockX + 7 + minDx, clockY + 6 + minDy, 2, 1);

  // 2. Boutique Order Corkboard Below Clock
  const boardX = x;
  const boardY = clockY + 32;
  const boardW = 32;
  const boardH = 38;
  ctx.fillStyle = '#3b1d0e';
  ctx.fillRect(boardX, boardY, boardW, boardH);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(boardX + 2, boardY + 2, boardW - 4, boardH - 4);

  // Pinned Order Notes (subtle flutter)
  const notes = [
    { nx: boardX + 4, ny: boardY + 4, nw: 10, nh: 12, color: '#fef9c3', pin: '#ef4444' },
    { nx: boardX + 16, ny: boardY + 5, nw: 11, nh: 10, color: '#fce7f3', pin: '#3b82f6' },
    { nx: boardX + 5, ny: boardY + 19, nw: 11, nh: 13, color: '#e0f2fe', pin: '#10b981' },
    { nx: boardX + 18, ny: boardY + 18, nw: 9, nh: 12, color: '#f3e8ff', pin: '#f59e0b' },
  ];
  notes.forEach((n, i) => {
    const flutter = (frameCount + i * 17) % 90 < 8 ? 1 : 0;
    ctx.fillStyle = n.color;
    ctx.fillRect(n.nx, n.ny, n.nw, n.nh - flutter);
    // Tiny scribbles on note
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(n.nx + 2, n.ny + 4, n.nw - 4, 1);
    ctx.fillRect(n.nx + 2, n.ny + 7, n.nw - 5, 1);
    // Pushpin
    ctx.fillStyle = n.pin;
    ctx.fillRect(n.nx + Math.floor(n.nw / 2), n.ny + 1, 2, 2);
  });
}

/**
 * Render Theme-Specific Props on the right boutique shelves
 */
function renderShelfThemedProps(
  ctx: CanvasRenderingContext2D,
  backdropId: BackdropId,
  shelfX: number,
  shelfY: number,
  shelfW: number,
  frameCount: number,
  tierIndex: number = 0
): void {
  const bottleColors =
    tierIndex === 0
      ? ['#f59e0b', '#38bdf8', '#e8748a', '#a855f7', '#34d399']
      : ['#ec4899', '#8b5cf6', '#10b981', '#fbbf24', '#f43f5e'];

  const maxBottles = Math.min(bottleColors.length, Math.floor((shelfW - 10) / 14));
  for (let i = 0; i < maxBottles; i++) {
    const bx = shelfX + 6 + i * 14;
    const by = shelfY - 12;
    const color = bottleColors[i];

    // Bottle body & neck
    ctx.fillStyle = color;
    ctx.fillRect(bx, by + 3, 9, 9);
    ctx.fillRect(bx + 2, by, 5, 3);
    // Cork stopper
    ctx.fillStyle = '#d97706';
    ctx.fillRect(bx + 3, by - 2, 3, 2);
    // Label or animated internal sparkle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    const sparkleOffset = (Math.floor(frameCount / 14) + i) % 3;
    ctx.fillRect(bx + 2, by + 4 + sparkleOffset, 2, 2);
  }

  // Backdrop-specific accent on lower shelf
  if (tierIndex === 1 && backdropId === 'holiday_spooky_season') {
    const px = shelfX + shelfW - 18;
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(px, shelfY - 10, 12, 10);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(px + 2, shelfY - 7, 2, 2);
    ctx.fillRect(px + 7, shelfY - 7, 2, 2);
  } else if (tierIndex === 1 && backdropId === 'closing_time_lofi') {
    const noteY = shelfY - 16 - Math.sin(frameCount * 0.1) * 3;
    ctx.fillStyle = '#c084fc';
    ctx.font = '8px monospace';
    ctx.fillText('♫', shelfX + shelfW - 14, noteY);
  }
}

/**
 * Render the Recessed Wood-Paneled Mahogany Counter, Active Countertop Props
 * (Flickering Wax Candle, Book Stack, Steaming Kettle, Bubbling Glowing Resin Flask),
 * and the Patterned Woven Boutique Runner Rug on the Floor.
 */
export function renderBoutiqueCounterAndForeground(
  ctx: CanvasRenderingContext2D,
  backdropId: BackdropId,
  width: number,
  _height: number,
  counterY: number,
  frameCount: number = 0
): { counterX: number; counterW: number; runnerX: number; runnerW: number } {
  const config = getBackdropConfig(backdropId);
  const counterW = Math.min(width - 20, 320);
  const counterX = Math.floor((width - counterW) / 2);
  const counterH = 36;

  // 1. Main Counter Body & Recessed Wood Paneling
  ctx.fillStyle = config.counterWoodColor || '#2b1408';
  ctx.fillRect(counterX, counterY, counterW, counterH);

  // Top mahogany overhang lip & highlight
  ctx.fillStyle = '#5c2c16';
  ctx.fillRect(counterX - 2, counterY, counterW + 4, 4);
  ctx.fillStyle = '#7c3f23';
  ctx.fillRect(counterX - 2, counterY, counterW + 4, 1);

  // Left & Right Recessed Wood Panels
  const panelY = counterY + 8;
  const panelH = counterH - 14;
  const sidePanelW = Math.floor((counterW - 116) / 2);
  if (sidePanelW > 20) {
    // Left recessed panel
    ctx.fillStyle = '#1e0d05';
    ctx.fillRect(counterX + 6, panelY, sidePanelW, panelH);
    ctx.strokeStyle = '#3d1e10';
    ctx.lineWidth = 1;
    ctx.strokeRect(counterX + 6, panelY, sidePanelW, panelH);

    // Right recessed panel
    const rightPanelX = counterX + counterW - sidePanelW - 6;
    ctx.fillStyle = '#1e0d05';
    ctx.fillRect(rightPanelX, panelY, sidePanelW, panelH);
    ctx.strokeRect(rightPanelX, panelY, sidePanelW, panelH);
  }

  // 2. Center Boutique Velvet Runner
  const runnerW = Math.min(104, Math.floor(counterW * 0.38));
  const runnerX = Math.floor((width - runnerW) / 2);
  ctx.fillStyle = config.runnerColor || '#831843';
  ctx.fillRect(runnerX, counterY, runnerW, counterH);
  ctx.fillStyle = config.runnerFringeColor || '#ffd700';
  ctx.fillRect(runnerX, counterY + counterH - 3, runnerW, 3);
  // Subtle gold stitching along runner edges
  ctx.fillRect(runnerX + 2, counterY + 2, 1, counterH - 5);
  ctx.fillRect(runnerX + runnerW - 3, counterY + 2, 1, counterH - 5);

  // 3. LEFT COUNTER PROPS: Flickering Wax Candle & Stacked Craft Books
  const candleX = counterX + 12;
  const candleY = counterY - 12;
  // Candle wax body
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(candleX, candleY, 6, 12);
  ctx.fillStyle = '#d97706'; // Brass saucer
  ctx.fillRect(candleX - 2, counterY - 2, 10, 2);

  // Dancing 4-frame pixel flame
  const flameFlicker = Math.round(Math.sin(frameCount * 0.28) * 1);
  const flameHeight = 4 + (frameCount % 5 === 0 ? 1 : 0);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(candleX + 1 + flameFlicker, candleY - flameHeight, 4, flameHeight);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(candleX + 2 + flameFlicker, candleY - flameHeight + 1, 2, flameHeight - 1);

  // Rising smoke wisp above candle
  const wispY = candleY - 7 - ((frameCount * 0.25) % 8);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(candleX + 2 + Math.round(Math.sin(frameCount * 0.15)), Math.round(wispY), 1, 2);

  // Warm radial candle glow halo
  ctx.save();
  const candlePulse = 0.28 + 0.08 * Math.sin(frameCount * 0.21);
  const cGrad = ctx.createRadialGradient(candleX + 3, candleY - 2, 2, candleX + 3, candleY - 2, 26);
  cGrad.addColorStop(0, `rgba(251, 191, 36, ${candlePulse.toFixed(2)})`);
  cGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = cGrad;
  ctx.fillRect(candleX - 24, candleY - 28, 54, 46);
  ctx.restore();

  // Stack of 3 colorful boutique pattern books next to candle
  const bookX = candleX + 12;
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(bookX, counterY - 4, 20, 4);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(bookX + 1, counterY - 8, 18, 4);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(bookX + 2, counterY - 11, 16, 3);

  // 4. RIGHT COUNTER PROPS: Steaming Kettle/Teapot, Brass Scale & Glowing Bubbling Flask
  const flaskX = counterX + counterW - 18;
  const flaskY = counterY - 15;
  // Round alchemist / iridescent resin flask
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(flaskX + 3, flaskY, 4, 5); // Neck
  ctx.fillStyle = '#10b981';
  ctx.fillRect(flaskX, flaskY + 5, 10, 10);
  ctx.fillStyle = '#6ee7b7';
  ctx.fillRect(flaskX + 1, flaskY + 6, 8, 7);

  // Animated rising bubbles inside flask
  ctx.fillStyle = '#ffffff';
  const b1Y = flaskY + 12 - ((frameCount * 0.2) % 6);
  const b2Y = flaskY + 12 - (((frameCount + 15) * 0.2) % 6);
  ctx.fillRect(flaskX + 3, Math.round(b1Y), 2, 2);
  ctx.fillRect(flaskX + 6, Math.round(b2Y), 1, 1);

  // Magical emerald radial glow around flask
  ctx.save();
  const fPulse = 0.24 + 0.07 * Math.cos(frameCount * 0.16);
  const fGrad = ctx.createRadialGradient(flaskX + 5, flaskY + 9, 2, flaskX + 5, flaskY + 9, 24);
  fGrad.addColorStop(0, `rgba(52, 211, 153, ${fPulse.toFixed(2)})`);
  fGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
  ctx.fillStyle = fGrad;
  ctx.fillRect(flaskX - 20, flaskY - 14, 50, 40);
  ctx.restore();

  // Steaming Brass Kettle / Teapot next to flask
  const potX = flaskX - 24;
  const potY = counterY - 11;
  ctx.fillStyle = '#b45309';
  ctx.fillRect(potX, potY + 2, 12, 9);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(potX + 3, potY, 6, 2); // Lid
  ctx.fillRect(potX + 12, potY + 4, 3, 2); // Spout
  // Animated rising steam puffs from teapot spout
  for (let s = 0; s < 2; s++) {
    const prog = ((frameCount * 0.08 + s * 0.5) % 1);
    const sx = potX + 13 + Math.round(Math.sin(frameCount * 0.12 + s) * 2);
    const sy = potY + 2 - Math.round(prog * 12);
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.55 * (1 - prog)).toFixed(2)})`;
    ctx.fillRect(sx, sy, 2, 2);
  }

  // 5. PATTERNED WOVEN BOUTIQUE RUNNER RUG ON THE FLOOR (Inkwell & Alembic diamond motif)
  const rugW = Math.min(counterW + 16, width - 16);
  const rugX = Math.floor((width - rugW) / 2);
  const rugY = counterY + counterH + 3;
  const rugH = 16;

  // Rug outer crimson border & dark inner field
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(rugX, rugY, rugW, rugH);
  ctx.fillStyle = '#450a0a';
  ctx.fillRect(rugX + 2, rugY + 2, rugW - 4, rugH - 4);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1;
  ctx.strokeRect(rugX + 2, rugY + 2, rugW - 4, rugH - 4);

  // Left & Right Fringe Tassels
  ctx.fillStyle = '#d6d3d1';
  for (let fy = rugY + 2; fy < rugY + rugH - 2; fy += 3) {
    ctx.fillRect(rugX - 2, fy, 2, 1);
    ctx.fillRect(rugX + rugW, fy, 2, 1);
  }

  // Repeating Woven Diamond Motifs (◇ ◇ ◇ ◇ ◇ ◇)
  ctx.fillStyle = '#fbbf24';
  const motifSpacing = 26;
  for (let mx = rugX + 16; mx < rugX + rugW - 14; mx += motifSpacing) {
    const my = rugY + Math.floor(rugH / 2);
    ctx.fillRect(mx, my - 3, 2, 1);
    ctx.fillRect(mx - 2, my - 1, 1, 2);
    ctx.fillRect(mx + 3, my - 1, 1, 2);
    ctx.fillRect(mx, my + 2, 2, 1);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(mx, my - 1, 2, 2);
    ctx.fillStyle = '#fbbf24';
  }

  return { counterX, counterW, runnerX, runnerW };
}

/**
 * In-Scene Overhead Pixel Speech Bubble (Inkwell & Alembic style)
 * Pops up above the active speaker with a colored character name tag and pointer tail.
 */
export function renderOverheadSpeechBubble(
  ctx: CanvasRenderingContext2D,
  speaker: 'bonnie' | 'tammy',
  dialogue: string,
  charX: number,
  charY: number,
  beatProgress: number,
  canvasWidth: number
): void {
  if (!dialogue) return;

  ctx.save();

  // Extract a punchy 2-line whole-word snippet for the in-scene overhead bubble
  const clean = dialogue.replace(/^[—\-]+|[—\-]+$/g, '').trim();
  const words = clean.split(/\s+/);
  const totalWords = Math.max(1, words.length);
  const currentWordIdx = Math.min(totalWords - 1, Math.floor(beatProgress * totalWords * 1.15));

  // Group words into 2 whole-word lines (max 19 chars per line) starting near currentWordIdx
  const startWord = Math.max(0, Math.min(currentWordIdx - (currentWordIdx % 4), totalWords - 1));
  let line1 = '';
  let line2 = '';
  for (let i = startWord; i < totalWords; i++) {
    const w = words[i];
    if (!line1) {
      line1 = w.slice(0, 19);
    } else if (!line2 && (line1.length + 1 + w.length) <= 19) {
      line1 += ' ' + w;
    } else if (!line2) {
      line2 = w.slice(0, 19);
    } else if ((line2.length + 1 + w.length) <= 19) {
      line2 += ' ' + w;
    } else {
      break;
    }
  }

  const bubbleW = 104;
  const bubbleH = line2 ? 28 : 20;
  const rawX = charX + 14 - Math.floor(bubbleW / 2);
  const bx = Math.max(8, Math.min(canvasWidth - bubbleW - 8, rawX));
  const by = Math.max(182, charY - bubbleH - 12);

  // Name badge pill at top-left of bubble
  const isBonnie = speaker === 'bonnie';
  const badgeColor = isBonnie ? '#be185d' : '#047857';
  const badgeText = isBonnie ? 'Bonnie' : 'Tammy';

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(bx + 2, by + 2, bubbleW, bubbleH);

  // Cream parchment bubble body & dark pixel border
  ctx.fillStyle = '#fefce8';
  ctx.fillRect(bx, by, bubbleW, bubbleH);
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx, by, bubbleW, bubbleH);

  // Pointer tail pointing down to character's head
  const tailX = Math.max(bx + 10, Math.min(bx + bubbleW - 14, charX + 14));
  ctx.fillStyle = '#fefce8';
  ctx.beginPath();
  ctx.moveTo(tailX - 4, by + bubbleH - 1);
  ctx.lineTo(tailX + 4, by + bubbleH - 1);
  ctx.lineTo(tailX, by + bubbleH + 5);
  ctx.closePath();
  ctx.fill();

  // Name tag pill
  ctx.fillStyle = badgeColor;
  ctx.fillRect(bx + 4, by - 7, 38, 8);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 6px monospace';
  ctx.fillText(badgeText, bx + 7, by - 1);

  // Crisp pixel dialogue text inside bubble
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 7px monospace';
  ctx.fillText(line1, bx + 6, by + 11);
  if (line2) {
    ctx.fillText(line2, bx + 6, by + 21);
  }

  ctx.restore();
}

/**
 * Procedural Iron Lantern with multi-frequency flame flicker and radial halo
 */
function renderLantern(
  ctx: CanvasRenderingContext2D,
  lx: number,
  ly: number,
  frameCount: number,
  amberColor: string
): void {
  // Chain
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(lx + 4, ly - 8, 2, 8);
  // Lantern frame
  ctx.fillRect(lx, ly, 10, 14);
  // Glass chamber
  ctx.fillStyle = amberColor;
  ctx.fillRect(lx + 2, ly + 2, 6, 10);

  // Multi-frequency organic lantern flame flicker
  const flicker =
    Math.sin(frameCount * 0.19) * 1.2 +
    Math.sin(frameCount * 0.43) * 0.8 +
    Math.cos(frameCount * 0.87) * 0.5;
  const glowPulse = 0.25 + 0.08 * (Math.sin(frameCount * 0.17) + Math.cos(frameCount * 0.38) * 0.5);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(lx + 4, ly + 5 + Math.floor(flicker * 0.7), 2, 4);

  // Dynamic ambient radial glow with multi-frequency pulse
  ctx.save();
  const glowRadius = 28 + Math.floor(flicker * 3);
  const rad = ctx.createRadialGradient(lx + 5, ly + 7, 2, lx + 5, ly + 7, glowRadius);
  rad.addColorStop(0, `rgba(251, 191, 36, ${Math.min(0.45, Math.max(0.15, glowPulse))})`);
  rad.addColorStop(0.6, `rgba(245, 158, 11, ${Math.min(0.2, glowPulse * 0.5)})`);
  rad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = rad;
  ctx.fillRect(lx - glowRadius, ly - glowRadius + 5, glowRadius * 2, glowRadius * 2);
  ctx.restore();
}

/**
 * Dynamic CRT Screen Glow & Environmental Reflection
 * Projects scene-colored light cone and phosphor wash onto shop wall, counter, and character shoulders.
 */
export function renderCrtScreenGlow(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  screenWidth: number,
  screenHeight: number,
  counterY: number,
  sceneId: string,
  frameCount: number
): void {
  ctx.save();

  // Chromaticity palette based on nature clip scene
  let glowColor = 'rgba(6, 182, 212, '; // Default deep-sea cyan
  if (sceneId.includes('meerkat') || sceneId.includes('honey_badger') || sceneId.includes('capybara')) {
    glowColor = 'rgba(245, 158, 11, '; // Golden amber / savannah
  } else if (sceneId.includes('penguin')) {
    glowColor = 'rgba(147, 197, 253, '; // Antarctic ice blue
  } else if (sceneId.includes('crab') || sceneId.includes('mantis_shrimp')) {
    glowColor = 'rgba(20, 184, 166, '; // Coastal teal
  } else if (sceneId.includes('chameleon')) {
    const hue = (frameCount * 2) % 360;
    glowColor = `hsla(${hue}, 85%, 65%, `; // Shifting iridescent hue
  } else if (sceneId.includes('red_panda') || sceneId.includes('lava') || sceneId.includes('campfire')) {
    glowColor = 'rgba(249, 115, 22, '; // Warm fire / autumn orange
  } else if (sceneId.includes('owl') || sceneId.includes('fireworks')) {
    glowColor = 'rgba(139, 92, 246, '; // Twilight violet
  }

  const pulse = 0.16 + 0.04 * Math.sin(frameCount * 0.12);
  const centerX = screenX + Math.floor(screenWidth / 2);
  const bottomY = screenY + screenHeight;

  // Downward projected radial light cone onto wall and counter
  const glowGrad = ctx.createRadialGradient(
    centerX,
    bottomY,
    15,
    centerX,
    counterY + 10,
    Math.max(60, counterY - bottomY + 40)
  );
  glowGrad.addColorStop(0, `${glowColor}${pulse * 1.5})`);
  glowGrad.addColorStop(0.5, `${glowColor}${pulse * 0.8})`);
  glowGrad.addColorStop(1, `${glowColor}0)`);

  ctx.fillStyle = glowGrad;
  ctx.fillRect(centerX - 160, bottomY - 10, 320, counterY - bottomY + 40);

  // Subtle counter top specular highlight from CRT
  ctx.fillStyle = `${glowColor}${pulse * 1.2})`;
  ctx.fillRect(centerX - 80, counterY, 160, 2);

  ctx.restore();
}

/**
 * Lighting Overlay & Ambient Particles
 */
function renderBackdropLightingAndParticles(
  ctx: CanvasRenderingContext2D,
  config: BackdropConfig,
  width: number,
  height: number,
  _counterY: number,
  frameCount: number
): void {
  // Ambient mood tint
  ctx.save();
  ctx.fillStyle = config.ambientLightColor;
  ctx.globalAlpha = config.ambientLightIntensity * 0.18;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Floating Particles (Stardust, Sun Motes, Raindrops, Leaves, Lo-Fi Dust)
  const p = config.particles;
  ctx.fillStyle = p.color;

  for (let i = 0; i < p.count; i++) {
    // Deterministic pseudo-random positions based on particle index
    const seedX = (i * 73 + 17) % width;
    const seedSpeed = (0.5 + (i % 5) * 0.2) * p.speed;

    if (p.type === 'raindrops') {
      // Diagonal fast rain
      const px = (seedX + frameCount * 1.5) % width;
      const py = (i * 37 + frameCount * 4 * seedSpeed) % height;
      ctx.fillRect(px, py, 1, 5);
    } else if (p.type === 'autumn_leaves') {
      // Swirling drift
      const px = (seedX + Math.sin(frameCount * 0.05 + i) * 15) % width;
      const py = (i * 45 + frameCount * seedSpeed) % height;
      ctx.fillRect(px, py, 3, 2);
    } else {
      // Upward drifting stardust / motes / lofi dust
      const px = (seedX + Math.sin(frameCount * 0.03 + i) * 8) % width;
      const py = (height - ((frameCount * seedSpeed + i * 40) % height)) % height;
      const size = (i % 3 === 0) ? 2 : 1;
      ctx.fillRect(px, py, size, size);
    }
  }
}
