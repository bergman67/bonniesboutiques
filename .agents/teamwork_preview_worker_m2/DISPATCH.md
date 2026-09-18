## 2026-09-18T13:57:09Z

You are Worker M2 responsible for Milestone 2: Refactoring the storefront into an immersive 3D/16-bit scrollytelling experience using React Three Fiber and GSAP, building the 3D levitating product viewer, abstracting placeholder assets, and integrating cleanly with the existing backend cart.

Authoritative Request:
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\ORIGINAL_REQUEST.md
PROJECT Specification:
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_orchestrator_1\PROJECT.md
Explorer 2 Survey Findings:
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_2\handoff.md
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_2\analysis.md
Explorer 3 Backend Contracts:
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_3\handoff.md

Working directory:
c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m2
Project root:
c:\Users\eranb\Documents\antigravity\wonderful-hertz

Write Ownership:
You have exclusive write ownership of:
- `package.json`
- `next.config.js`
- `src/lib/scrollytelling/**`
- `src/components/scrollytelling/**`
- `src/app/page.tsx`
- `src/app/globals.css`

Tasks:
1. **Dependencies Installation & Configuration**:
   - Install pinned dependencies: `three@^0.170.0`, `@react-three/fiber@^8.18.0`, `@react-three/drei@^9.122.0`, `gsap@^3.12.5`, and dev dependency `@types/three@^0.170.0`. (Do NOT install unpinned v9/v10 R3F which breaks React 18).
   - Update `next.config.js` with `transpilePackages: ['three', '@react-three/fiber', '@react-three/drei']`.
2. **Asset Abstraction (`src/lib/scrollytelling/assetManifest.ts`)**:
   - Create a dedicated file abstracting lightweight placeholders:
     - 3D procedural/primitive models (e.g. faceted gemstone, enchanted ring, potion vial, resin charm, celestial orb) rendered with Three.js geometries and shaders/materials.
     - 2D pixel-art sprite configurations (shopkeeper, wooden counter, potion shelves, cobblestone floor, boutique banner).
     - Provide clean export interfaces so they can be easily swapped for production `.glb` and sprite sheet files later.
3. **2D Canvas / Sprite Layer (`src/components/scrollytelling/PixelStorefrontLayer.tsx`)**:
   - Implement high-performance HTML5 2D canvas for a 16-bit RPG-style storefront.
   - Render pixel-art boutique interior: wooden/cobblestone floor, shopkeeper counter, shelves with colorful trinkets/potions, 16-bit shopkeeper character, and warm boutique lighting.
   - Use `image-rendering: pixelated` and responsive scaling.
4. **GSAP ScrollTrigger & 3D Camera Trajectory (`src/components/scrollytelling/ScrollyCanvas.tsx` & `ScrollytellingExperience.tsx`)**:
   - Implement a virtual scroll container (e.g. 400vh) pinned by GSAP ScrollTrigger.
   - Hijack vertical scroll: map 0% to 100% scroll progress to a 3D camera trajectory:
     - 0% - 25%: Celestial Sky viewpoint looking down.
     - 25% - 50%: Cloud / village descent.
     - 50% - 75%: Descending down into the 16-bit storefront layer.
     - 75% - 100%: Aligning with the 3D product showcase pedestal.
   - Dynamically import R3F Canvas with `ssr: false` to avoid SSR WebGL conflicts. Lerp camera smoothly via `useFrame` based on scroll progress.
5. **3D Levitating Product Viewer (`src/components/scrollytelling/LevitatingProductViewer.tsx`)**:
   - Interactive 3D product models floating above a display pedestal.
   - Continuous "levitation" sine-wave animation (e.g. `Math.sin(time * 1.5) * 0.12`).
   - Continuous turntable rotation and dynamic contact shadow scaling.
   - Smooth model-swapping transition when active product changes.
6. **Dynamic HTML Text & HUD (`src/components/scrollytelling/ProductHUD.tsx`)**:
   - HTML text overlay dynamically synchronized with React state to display the currently viewed product's title, price, and description.
   - Provide Next/Previous navigation buttons that smoothly swap the active 3D model (in addition to scroll progression).
   - "Add to Cart" button: seamlessly call `useCart().addItem({ id, title, imageUrl, price })` from `@/context/CartContext`. Open cart drawer or show feedback.
7. **Backend Protection**:
   - Do not alter or break existing backend inventory, database schema, or checkout logic (`/api/checkout`, `/checkout`, Prisma models).
8. **Homepage Integration (`src/app/page.tsx`)**:
   - Mount `<ScrollytellingExperience products={products} />` on the homepage, passing products fetched from Prisma. Keep the existing `<Header />` and `<CartDrawer />`.
9. **Verification**:
   - Run `npm run build` and `npm run lint`. Ensure exit code 0 with 0 errors.
   - Verify that camera responds to scroll, 2D 16-bit elements render, 3D models float and swap smoothly, and "Add to Cart" successfully populates the cart.
   - Write comprehensive report to `c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m2\handoff.md`.
