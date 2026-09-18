'use client';

import React, { useEffect, useRef } from 'react';

// --- Audio Context Setup for Text Noise ---
let audioCtx: AudioContext | null = null;
function playTextBlip() {
  if (typeof window === 'undefined') return;
  if (!audioCtx) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (_e) { return; }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  if (audioCtx.state === 'suspended') return;
  
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Animal Crossing style high-pitched blip
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + Math.random() * 400, audioCtx.currentTime); 
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.03, audioCtx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.04);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (_err) {
    // Audio errors should never interrupt the render loop
  }
}

/**
 * Wraps text into lines that do not exceed maxWidth on the given 2D context.
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text || !text.trim()) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
    // Break very long unbroken tokens if they exceed maxWidth on their own
    while (ctx.measureText(currentLine).width > maxWidth && currentLine.length > 3) {
      let cut = currentLine.length - 1;
      while (cut > 1 && ctx.measureText(currentLine.slice(0, cut) + '-').width > maxWidth) {
        cut--;
      }
      lines.push(currentLine.slice(0, cut) + '-');
      currentLine = currentLine.slice(cut);
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

interface PixelStorefrontLayerProps {
  opacity?: number;
  scrollProgress?: number;
  activeProductName?: string;
}

export default function PixelStorefrontLayer({
  opacity = 1,
  scrollProgress = 0,
  activeProductName,
}: PixelStorefrontLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollProgressRef = useRef(scrollProgress);
  const activeProductNameRef = useRef(activeProductName);
  const dialogueProgressRef = useRef(0);
  const lastBlipFrameRef = useRef(0);
  const prevProductNameRef = useRef(activeProductName);

  scrollProgressRef.current = scrollProgress;
  activeProductNameRef.current = activeProductName;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Fixed internal 16-bit resolution
    const isMobile = window.innerWidth < 768; const W = isMobile ? 300 : 480; const H = isMobile ? 400 : 270;
    canvas.width = W;
    canvas.height = H;

    let animId: number;
    let frameCount = 0;

    // Floating sparkle particles in boutique air
    const particles: Array<{ x: number; y: number; speed: number; phase: number; size: number }> = [];
    for (let i = 0; i < 24; i++) {
      particles.push({
        x: Math.random() * W,
        y: 40 + Math.random() * (H - 90),
        speed: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        size: Math.random() > 0.5 ? 2 : 1,
      });
    }

    const render = () => {
      frameCount++;
      ctx.imageSmoothingEnabled = false;

      ctx.save();
      const scaleFactor = 1.4; // 40% larger characters and store!
      ctx.translate(W / 2, 140);
      ctx.scale(scaleFactor, scaleFactor);
      ctx.translate(-W / 2, -140);

      // ── 1. BACKGROUND / SHOP WALL ──────────────────────────────────
      // Dark plum-wood gradient wall
      const wallGrad = ctx.createLinearGradient(0, 0, 0, 160);
      wallGrad.addColorStop(0, '#1a0f24');
      wallGrad.addColorStop(1, '#2d1b3d');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, W, 170);

      // Wooden wall vertical beam lines
      ctx.fillStyle = '#241432';
      for (let x = 0; x < W; x += 32) {
        ctx.fillRect(x, 0, 2, 170);
      }

      // Stone dado baseboard
      ctx.fillStyle = '#3d2552';
      ctx.fillRect(0, 165, W, 8);
      ctx.fillStyle = '#4e3066';
      ctx.fillRect(0, 164, W, 2);

      // ── 2. WALL TAPESTRY / BANNER ─────────────────────────────────
      const bannerW = 160;
      const bannerX = (W - bannerW) / 2;
      const bannerY = 12;
      ctx.fillStyle = '#4a152e';
      ctx.fillRect(bannerX, bannerY, bannerW, 36);
      ctx.fillStyle = '#e8748a';
      ctx.fillRect(bannerX, bannerY, bannerW, 2);
      ctx.fillRect(bannerX, bannerY + 34, bannerW, 2);
      ctx.fillRect(bannerX, bannerY, 2, 36);
      ctx.fillRect(bannerX + bannerW - 2, bannerY, 2, 36);

      // Banner text
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#f5efe6';
      ctx.textAlign = 'center';
      ctx.fillText('✦ B&T TRINKETS & BOUTIQUE ✦', W / 2, bannerY + 22);

      // ── 3. TRINKET & POTION SHELVES ──────────────────────────────
      const shelfY1 = 60;
      const shelfY2 = 105;
      const shelfWidth = 140;

      const drawShelf = (sx: number, sy: number) => {
        // Shelf wood
        ctx.fillStyle = '#43281c';
        ctx.fillRect(sx, sy, shelfWidth, 6);
        ctx.fillStyle = '#6f452a';
        ctx.fillRect(sx, sy, shelfWidth, 2);

        // Bottles & items on shelf
        const items = [
          { color: '#e8748a', h: 14, type: 'vial' },
          { color: '#a855f7', h: 18, type: 'flask' },
          { color: '#38bdf8', h: 12, type: 'crystal' },
          { color: '#fbbf24', h: 16, type: 'jar' },
          { color: '#34d399', h: 15, type: 'vial' },
          { color: '#f43f5e', h: 13, type: 'flask' },
        ];

        let itemX = sx + 10;
        items.forEach((item, idx) => {
          // Bobbing twinkle highlight
          const glow = Math.sin((frameCount + idx * 20) * 0.08) * 0.5 + 0.5;
          ctx.fillStyle = item.color;
          ctx.fillRect(itemX, sy - item.h, 8, item.h);

          // Glass bottle neck
          ctx.fillStyle = '#ede3d4';
          ctx.fillRect(itemX + 2, sy - item.h - 3, 4, 3);

          // Glint pixel
          if (glow > 0.4) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(itemX + 2, sy - item.h + 2, 2, 2);
          }
          itemX += 20;
        });
      };

      // Left and right shelves
      drawShelf(20, shelfY1);
      drawShelf(20, shelfY2);
      drawShelf(W - shelfWidth - 20, shelfY1);
      drawShelf(W - shelfWidth - 20, shelfY2);

      // ── 4. WARM WALL LANTERNS & GLOW ──────────────────────────────
      const drawLantern = (lx: number, ly: number) => {
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(lx, ly, 10, 16);
        // Flame flicker
        const flicker = Math.sin(frameCount * 0.2 + lx) * 2;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(lx + 2, ly + 4 + flicker * 0.5, 6, 8);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(lx + 3, ly + 6 + flicker * 0.5, 4, 5);

        // Soft ambient warm halo
        const halo = ctx.createRadialGradient(lx + 5, ly + 8, 2, lx + 5, ly + 8, 38);
        halo.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
        halo.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(lx + 5, ly + 8, 38, 0, Math.PI * 2);
        ctx.fill();
      };

      drawLantern(185, 75);
      drawLantern(285, 75);

      // ── 5. COBBLESTONE & WOOD FLOOR ───────────────────────────────
      const floorGrad = ctx.createLinearGradient(0, 172, 0, H);
      floorGrad.addColorStop(0, '#24122d');
      floorGrad.addColorStop(1, '#150a1c');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 172, W, H - 172);

      // Checkered / cobblestone floor tiles with perspective
      ctx.fillStyle = 'rgba(78, 48, 102, 0.35)';
      for (let y = 173; y < H; y += 12) {
        ctx.fillRect(0, y, W, 1);
      }
      for (let x = 0; x < W; x += 24) {
        ctx.fillRect(x, 173, 1, H - 173);
      }

      // ── 6. SHOPKEEPER BONNIE (16-BIT CHARACTER) ───────────────────
      const bonnieX = W / 2 - 60;
      const bonnieY = 118;

      // Breathing animation (1px vertical bob every ~60 frames)
      const breathOffset = Math.floor(Math.sin(frameCount * 0.08) * 1.5);
      // Blinking logic (blink every 180 frames for 8 frames)
      const isBlinking = (frameCount % 180) < 10;
      // Waving logic (wave hand every 240 frames for 40 frames)
      const wavePhase = frameCount % 260;
      const isWaving = wavePhase > 180 && wavePhase < 230;

      const by = bonnieY + breathOffset;

      // Hair (Back volume)
      ctx.fillStyle = '#7c2d12'; // Warm auburn hair
      ctx.fillRect(bonnieX - 3, by - 4, 34, 28);
      ctx.fillRect(bonnieX - 5, by + 4, 38, 20);

      // Face / Skin
      ctx.fillStyle = '#fed7aa'; // Fair skin tone
      ctx.fillRect(bonnieX + 2, by, 24, 20);

      // Cheeks (blush)
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(bonnieX + 4, by + 12, 4, 2);
      ctx.fillRect(bonnieX + 20, by + 12, 4, 2);

      // Eyes
      ctx.fillStyle = '#312e81'; // Navy eyes
      if (!isBlinking) {
        ctx.fillRect(bonnieX + 6, by + 7, 3, 5);
        ctx.fillRect(bonnieX + 19, by + 7, 3, 5);
        // Eye glint
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bonnieX + 6, by + 7, 1, 2);
        ctx.fillRect(bonnieX + 19, by + 7, 1, 2);
      } else {
        // Closed eye line
        ctx.fillStyle = '#451a03';
        ctx.fillRect(bonnieX + 5, by + 10, 5, 2);
        ctx.fillRect(bonnieX + 18, by + 10, 5, 2);
      }

      // Smile
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(bonnieX + 11, by + 15, 6, 2);

      // Hair Front Bangs & Flower
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(bonnieX + 1, by - 5, 26, 7);
      ctx.fillRect(bonnieX + 2, by + 2, 4, 6);
      ctx.fillRect(bonnieX + 22, by + 2, 4, 6);

      // Rose Hairclip
      ctx.fillStyle = '#e8748a';
      ctx.fillRect(bonnieX + 21, by - 3, 5, 5);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(bonnieX + 23, by - 1, 2, 2);

      // Bonnie's Dress / Apron
      ctx.fillStyle = '#4c0519'; // Deep rose velvet dress
      ctx.fillRect(bonnieX + 2, by + 20, 24, 24);
      // White lace collar & apron
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(bonnieX + 8, by + 20, 12, 5);
      ctx.fillRect(bonnieX + 7, by + 25, 14, 16);

      // Hand waving
      if (isWaving) {
        const waveAngle = Math.sin(frameCount * 0.3) * 4;
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(bonnieX + 26, by + 14 + waveAngle, 6, 6);
        ctx.fillStyle = '#f5efe6';
        ctx.fillRect(bonnieX + 24, by + 18 + waveAngle, 4, 4);
      }

      // ── 6.5. DAUGHTER TAMMY (16-BIT CHARACTER) ───────────────────
      const tammyX = W / 2 + 40; // Standing to the left of Bonnie
      const tammyY = bonnieY + 6;  // Slightly shorter
      const tby = tammyY + Math.floor(Math.sin(frameCount * 0.08 + Math.PI) * 1.5); // Breathing out of phase

      // Hair (Back volume)
      ctx.fillStyle = '#b45309'; // Lighter brown/caramel hair
      ctx.fillRect(tammyX - 2, tby - 4, 28, 24);
      ctx.fillRect(tammyX - 4, tby + 4, 32, 18);

      // Face / Skin
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(tammyX + 2, tby, 20, 18);

      // Cheeks
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(tammyX + 4, tby + 11, 3, 2);
      ctx.fillRect(tammyX + 17, tby + 11, 3, 2);

      // Eyes
      ctx.fillStyle = '#1e3a8a';
      if ((frameCount % 200) < 10) {
        // Blinking
        ctx.fillStyle = '#451a03';
        ctx.fillRect(tammyX + 5, tby + 9, 4, 2);
        ctx.fillRect(tammyX + 15, tby + 9, 4, 2);
      } else {
        ctx.fillRect(tammyX + 5, tby + 6, 3, 4);
        ctx.fillRect(tammyX + 16, tby + 6, 3, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tammyX + 5, tby + 6, 1, 2);
        ctx.fillRect(tammyX + 16, tby + 6, 1, 2);
      }

      // Smile
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(tammyX + 9, tby + 13, 6, 2);

      // Hair Front Bangs
      ctx.fillStyle = '#d97706';
      ctx.fillRect(tammyX + 1, tby - 5, 22, 6);
      ctx.fillRect(tammyX + 1, tby + 1, 3, 5);

      // Dress
      ctx.fillStyle = '#0d9488'; // Vibrant teal dress so she doesn't blend into the purple wall!
      ctx.fillRect(tammyX + 2, tby + 18, 20, 20);
      // White collar
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(tammyX + 7, tby + 18, 10, 4);

      // ── 7. FRONT COUNTER & RUNNER CLOTH ───────────────────────────
      const counterW = 280;
      const counterX = (W - counterW) / 2;
      const counterY = 158;
      const counterH = 44;

      // Dark polished mahogany counter
      ctx.fillStyle = '#2b1408';
      ctx.fillRect(counterX, counterY, counterW, counterH);
      ctx.fillStyle = '#5c2d12';
      ctx.fillRect(counterX, counterY, counterW, 5);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(counterX, counterY + 1, counterW, 2);

      // Velvet runner cloth over center of counter
      const runnerW = 100;
      const runnerX = (W - runnerW) / 2;
      ctx.fillStyle = '#831843'; // Rose wine cloth
      ctx.fillRect(runnerX, counterY, runnerW, counterH + 6);
      ctx.fillStyle = '#e8748a';
      ctx.fillRect(runnerX, counterY, runnerW, 2);
      ctx.fillRect(runnerX + runnerW - 2, counterY, 2, counterH + 6);
      ctx.fillRect(runnerX, counterY, 2, counterH + 6);
      // Gold fringe at bottom of cloth
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(runnerX, counterY + counterH + 4, runnerW, 2);

      // Counter Trinket Display Bell Jar / Display Pillow
      ctx.fillStyle = '#701a75'; // Velvet pillow
      ctx.fillRect(counterX + 20, counterY - 4, 30, 6);
      ctx.fillStyle = '#f59e0b'; // Gold trim
      ctx.fillRect(counterX + 18, counterY - 1, 34, 2);

      // Small sample charm on pillow
      ctx.fillStyle = '#e8748a';
      ctx.fillRect(counterX + 32, counterY - 9, 6, 6);

      // Ledger book on right
      ctx.fillStyle = '#78350f';
      ctx.fillRect(counterX + counterW - 50, counterY - 4, 28, 6);
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(counterX + counterW - 48, counterY - 5, 24, 2);

      // ── 8. FLOATING STARDUST & SPARKS ────────────────────────────
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < 30) p.y = H - 70;
        const sparkAlpha = (Math.sin(frameCount * 0.05 + p.phase) * 0.5 + 0.5) * 0.7;
        ctx.fillStyle = `rgba(245, 239, 230, ${sparkAlpha.toFixed(2)})`;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      });

      ctx.restore(); // Restore scale so dialogue box is unscaled

      // ── 9. RETRO RPG DIALOGUE BOX ────────────────────────────────
      // Appears when user scrolls down towards the boutique
      const currentScrollProgress = scrollProgressRef.current;
      const currentActiveProductName = activeProductNameRef.current;

      if (currentScrollProgress > 0.4) {
        const boxAlpha = Math.min(1, (currentScrollProgress - 0.4) / 0.2);
        ctx.save();
        ctx.globalAlpha = boxAlpha;

        // Centered responsive speech bubble dimensions
        const boxW = Math.min(360, W - 20); const boxH = isMobile ? 65 : 50;
        // Perfectly centered horizontally on the 480px native canvas
        const boxX = Math.round((W - boxW) / 2);
        // Positioned cleanly above Bonnie & Tammy with breathing room for tail & nametag
        const boxY = bonnieY - boxH - 22;

        // Dialogue background (Classic 16-bit dark indigo)
        ctx.fillStyle = 'rgba(15, 10, 26, 0.92)';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Speech bubble tail pointing directly towards Bonnie & Tammy
        const tailX = bonnieX + 4;
        ctx.beginPath();
        ctx.moveTo(tailX - 8, boxY + boxH);
        ctx.lineTo(tailX, boxY + boxH + 11);
        ctx.lineTo(tailX + 8, boxY + boxH);
        ctx.fill();

        // Double border (Rose Velvet / Gold Accent)
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

        // Shopkeeper Name Tag
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(boxX + 12, boxY - 7, 85, 12);
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('BONNIE & TAMMY', boxX + 16, boxY + 2);

        // Check if product changed to trigger typewriter re-animation
        if (prevProductNameRef.current !== currentActiveProductName) {
          prevProductNameRef.current = currentActiveProductName;
          const greetingLen = 59;
          if (dialogueProgressRef.current > greetingLen) {
            dialogueProgressRef.current = greetingLen;
            lastBlipFrameRef.current = greetingLen;
          }
        }

        // Crisp 8px monospace font fits with ample padding inside the 360px bubble
        ctx.font = '8px monospace';

        // Dialogue copy with responsive text bounds and dynamic text wrapping
        const maxInnerWidth = boxW - 24;
        const text1 = '“Welcome, traveler! Every charm holds a whisper of wonder.”';
        let text2Lines: string[] = ['Scroll or tap arrows to inspect handcrafted relics ✦'];

        if (currentActiveProductName) {
          const rawText2 = `Admiring: “${currentActiveProductName}”`;
          if (ctx.measureText(rawText2).width > maxInnerWidth) {
            const wrapped = wrapCanvasText(ctx, rawText2, maxInnerWidth);
            if (wrapped.length <= 2) {
              text2Lines = wrapped;
            } else {
              let secondLine = wrapped[1] || '';
              while (secondLine.length > 0 && ctx.measureText(secondLine + '…”').width > maxInnerWidth) {
                secondLine = secondLine.slice(0, -1);
              }
              text2Lines = [wrapped[0], secondLine.trim() + '…”'];
            }
          } else {
            text2Lines = [rawText2];
          }
        }
        const text2 = text2Lines.join(' ');
        const totalLen = text1.length + text2.length;

        if (currentScrollProgress > 0.4) {
          if (dialogueProgressRef.current < totalLen) {
            dialogueProgressRef.current += 0.6;
            if (Math.floor(dialogueProgressRef.current) > lastBlipFrameRef.current) {
              lastBlipFrameRef.current = Math.floor(dialogueProgressRef.current);
              if (lastBlipFrameRef.current % 2 === 0) {
                playTextBlip();
              }
            }
          }
        } else {
          dialogueProgressRef.current = 0;
          lastBlipFrameRef.current = 0;
        }

        const len1 = Math.min(text1.length, Math.floor(dialogueProgressRef.current));
        const progressText2 = Math.max(0, Math.floor(dialogueProgressRef.current) - text1.length);

        if (text2Lines.length <= 1) {
          const len2 = Math.min(text2Lines[0].length, progressText2);
          ctx.fillStyle = '#f5efe6';
          ctx.fillText(text1.slice(0, len1), boxX + 12, boxY + 16);

          if (currentActiveProductName) {
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(text2Lines[0].slice(0, len2), boxX + 12, boxY + 32);
          } else {
            ctx.fillStyle = '#e8748a';
            ctx.fillText(text2Lines[0].slice(0, len2), boxX + 12, boxY + 32);
          }
        } else {
          // 2-line wrapped product dialogue inside speech bubble
          const len2A = Math.min(text2Lines[0].length, progressText2);
          const len2B = Math.max(0, Math.min(text2Lines[1].length, progressText2 - text2Lines[0].length - 1));

          ctx.fillStyle = '#f5efe6';
          ctx.fillText(text1.slice(0, len1), boxX + 12, boxY + 16);

          ctx.fillStyle = '#fbbf24';
          ctx.fillText(text2Lines[0].slice(0, len2A), boxX + 12, boxY + 28);
          ctx.fillText(text2Lines[1].slice(0, len2B), boxX + 12, boxY + 40);
        }

        // Blinking indicator cursor
        if (frameCount % 40 < 25) {
          ctx.fillStyle = '#e8748a';
          ctx.fillRect(boxX + boxW - 14, boxY + boxH - 12, 6, 4);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 z-10"
      style={{
        opacity,
        imageRendering: 'pixelated',
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        style={{
          imageRendering: 'pixelated',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}



