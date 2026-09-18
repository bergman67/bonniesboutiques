# BRIEFING — 2026-09-18T14:02:00Z

## Mission
Refactor Bonnie's Boutique storefront into an immersive 3D/16-bit scrollytelling experience using React Three Fiber, HTML5 2D Canvas, and GSAP, building a 3D levitating product viewer, asset abstraction manifest, and seamless backend cart integration.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m2
- Original parent: 865d87ee-c5c8-419a-99a5-435791cbb37a
- Milestone: Milestone 2: 3D / 16-Bit Scrollytelling Storefront & Product Viewer

## 🔒 Key Constraints
- Pinned dependencies: three@^0.170.0, @react-three/fiber@^8.18.0, @react-three/drei@^9.122.0, gsap@^3.12.5, @types/three@^0.170.0 (Do NOT install unpinned v9/v10 R3F which breaks React 18).
- Update next.config.mjs (or next.config.js) with transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'].
- HTML5 2D canvas with pixelated rendering for 16-bit RPG layer (no PixiJS to avoid WebGL context loss).
- GSAP ScrollTrigger virtual scroll pinning (e.g. 400vh) mapping 0%-100% scroll progress to a 4-phase 3D camera trajectory.
- Dynamically import R3F Canvas with ssr: false to avoid SSR WebGL conflicts.
- Continuous multi-harmonic sine-wave levitation animation, turntable rotation, and dynamic contact shadow scaling.
- Smooth model-swapping transition when active product changes (via scroll or HUD nav buttons).
- Dynamic HTML text & HUD synchronized with React state and wired to useCart().addItem() from CartContext.
- Do not alter or break existing backend inventory, database schema, or checkout logic (/api/checkout, /checkout, Prisma models).
- Integrity mandate: No cheating, no dummy/facade implementations, maintain real state and behavior.
- All changes must pass build (npm run build) and lint (npm run lint) with 0 errors.

## Current Parent
- Conversation ID: 865d87ee-c5c8-419a-99a5-435791cbb37a
- Updated: 2026-09-18T14:02:00Z

## Task Summary
- **What to build**: Full scrollytelling frontend experience with R3F 3D camera descent, 16-bit 2D canvas boutique shop, 3D levitating product showcase pedestal with model swapper, dynamic typography HUD, and cart integration.
- **Success criteria**:
  1. Production build passes (`npm run build`, `npm run lint`).
  2. GSAP ScrollTrigger drives R3F camera movement on scroll.
  3. 2D 16-bit pixel art boutique elements render alongside/after 3D descent.
  4. Products load as levitating 3D placeholder models with smooth swapping transitions.
  5. "Add to Cart" successfully populates cart state and pushes to existing checkout backend.
- **Interface contracts**: See `PROJECT.md` and Explorer 2 & 3 handoffs.
- **Code layout**:
  - `src/lib/scrollytelling/assetManifest.ts`
  - `src/lib/scrollytelling/proceduralPrimitives.tsx`
  - `src/components/scrollytelling/PixelStorefrontLayer.tsx`
  - `src/components/scrollytelling/ScrollyCanvas.tsx`
  - `src/components/scrollytelling/LevitatingProductViewer.tsx`
  - `src/components/scrollytelling/ProductHUD.tsx`
  - `src/components/scrollytelling/ScrollytellingExperience.tsx`
  - `src/app/page.tsx`
  - `src/app/globals.css`
  - `next.config.mjs`
  - `package.json`

## Key Decisions Made
- Selected HTML5 2D Canvas over PixiJS to avoid WebGL context limits and heavy package payload.
- Pinned R3F v8 and Drei v9 for React 18 compatibility.
- Decoupled GSAP scroll progress using refs and useFrame lerp for smooth 60fps/120fps.
- Abstracted 3D geometries and 2D sprites in assetManifest.ts with drop-in GLTF support.

## Change Tracker
- **Files modified**:
  - `package.json`: Added pinned dependencies (three, @react-three/fiber, @react-three/drei, gsap, @types/three).
  - `next.config.mjs`: Added transpilePackages for three, @react-three/fiber, @react-three/drei.
  - `src/lib/scrollytelling/assetManifest.ts`: Created asset abstraction manifest for 3D models and 2D sprites.
  - `src/lib/scrollytelling/proceduralPrimitives.tsx`: Created procedural Three.js geometries and materials.
  - `src/components/scrollytelling/PixelStorefrontLayer.tsx`: Created 2D HTML5 Canvas 16-bit RPG boutique layer.
  - `src/components/scrollytelling/ScrollyCanvas.tsx`: Created R3F Canvas with 4-phase descent camera rig and starfield.
  - `src/components/scrollytelling/LevitatingProductViewer.tsx`: Created 3D levitating model viewer and showcase pedestal.
  - `src/components/scrollytelling/ProductHUD.tsx`: Created dynamic typography HUD and CartContext integration.
  - `src/components/scrollytelling/ScrollytellingExperience.tsx`: Created client master container with GSAP ScrollTrigger pinning.
  - `src/app/globals.css`: Added pixelated utility classes.
  - `src/app/page.tsx`: Integrated ScrollytellingExperience at top of homepage.
  - `scripts/verify-milestone2.mjs`: Automated verification suite for Milestone 2.
- **Build status**: PASS (npm run build exit code 0, static/dynamic pages compiled)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (exit code 0 on both `npm run build` and `scripts/verify-milestone2.mjs`)
- **Lint status**: 0 warnings, 0 errors (`npm run lint` exit code 0)
- **Tests added/modified**: `scripts/verify-milestone2.mjs`

## Loaded Skills
- None specified by orchestrator

## Artifact Index
- `.agents/teamwork_preview_worker_m2/DISPATCH.md` — Assignment instructions
- `.agents/teamwork_preview_worker_m2/BRIEFING.md` — Situational awareness memory
- `.agents/teamwork_preview_worker_m2/progress.md` — Liveness and progress heartbeat
- `.agents/teamwork_preview_worker_m2/handoff.md` — Final deliverable report
- `scripts/verify-milestone2.mjs` — Verification test suite
