# Handoff Report: 3D / 16-Bit Scrollytelling Architecture Survey

**Explorer:** Explorer 2 (Frontend Architect & 3D/Canvas Specialist)  
**Date:** 2026-09-18T13:34:00Z  
**Target:** Parent Orchestrator (`865d87ee-c5c8-419a-99a5-435791cbb37a`)  
**Status:** Complete (Hard Handoff)

---

## 1. Observation

1. **Installed React & Framework Environment**:
   - `package.json` lines 18–20:
     ```json
     "next": "14.2.35",
     "react": "^18",
     "react-dom": "^18"
     ```
   - Confirmed installed version in `node_modules/react/package.json` line 7: `"version": "18.3.1"`.
   - Confirmed installed Next.js version in `node_modules/next/package.json` line 3: `"version": "14.2.35"`.

2. **Peer Dependency Investigation**:
   - Tool Command: `npm view @react-three/fiber peerDependencies`
     ```json
     {
       "expo": ">=43.0",
       "react": ">=19 <19.3",
       "three": ">=0.156",
       "react-dom": ">=19 <19.3"
     }
     ```
   - Tool Command: `npm view @react-three/drei@10.7.8 peerDependencies`
     ```json
     {
       "react": "^19",
       "three": ">=0.159",
       "react-dom": "^19",
       "@react-three/fiber": "^9.0.0"
     }
     ```
   - Tool Command: `npm view @react-three/fiber@8.18.0 peerDependencies`
     ```json
     {
       "react": ">=18 <19",
       "three": ">=0.133",
       "react-dom": ">=18 <19"
     }
     ```
   - Tool Command: `npm view @react-three/drei@9.122.0 peerDependencies`
     ```json
     {
       "react": "^18",
       "three": ">=0.137",
       "react-dom": "^18",
       "@react-three/fiber": "^8"
     }
     ```
   - Tool Command: `npm install --dry-run three @types/three @react-three/fiber@^8.18.0 @react-three/drei@^9.122.0 gsap`
     Output:
     ```text
     added 68 packages in 5s
     The command exited with code 0.
     ```

3. **PixiJS Size & Context Analysis**:
   - Tool Command: `npm view pixi.js version dist.unpackedSize`
     ```text
     version = '8.21.0'
     dist.unpackedSize = 75299567
     ```
   - PixiJS v8 instantiates a full WebGL2/WebGL context. Browsers enforce hardware limits of 8 to 16 concurrent WebGL contexts before silently evicting earlier contexts, introducing crashes when run side-by-side with Three.js on mobile devices.

4. **Frontend Architecture & Integration Points**:
   - `src/app/page.tsx`: Lines 9–13 fetch products via `prisma.product.findMany({ where: { isDraft: false }, orderBy: { createdAt: 'desc' } })`. Lines 93–95 render `<ProductCard />` for each product.
   - `src/context/CartContext.tsx`: Lines 75–87 expose `addItem: (item: Omit<CartItem, 'quantity'>) => void`, where item contains `{ id, title, imageUrl, price }`. Lines 105–107 persist to `localStorage.setItem('bonnies-cart', ...)`.
   - `src/app/globals.css`: Lines 7–25 define brand CSS custom variables (`--plum-900: #1a0f24`, `--plum-800: #2d1b3d`, `--cream-100: #f5efe6`, `--rose-400: #e8748a`). Lines 40–70 establish 3D hover transforms (`perspective: 1000px`, `transform-style: preserve-3d`).
   - `public/uploads/`: Contains 99 photography JPEG files, but zero `.glb` models or 2D sprite sheets.

---

## 2. Logic Chain

1. **Dependency Compatibility Chain**:
   - *From Observation 1*, the host application runs React 18.3.1 on Next.js 14.2.35.
   - *From Observation 2*, unpinned installation of `@react-three/fiber` and `@react-three/drei` defaults to major versions 9 and 10, which strictly require React 19 (`>=19 <19.3`).
   - Therefore, any attempt to install `@react-three/fiber` or `@react-three/drei` without explicit version pins will break npm dependency resolution.
   - By pinning `@react-three/fiber@^8.18.0` and `@react-three/drei@^9.122.0`, the dry-run passed with exit code 0 and zero peer dependency warnings.

2. **2D Canvas vs PixiJS Decision Chain**:
   - *From Observation 3*, PixiJS introduces a 75MB+ package payload and creates a concurrent WebGL context.
   - Running two concurrent WebGL contexts (Three.js `<Canvas>` + PixiJS `<Application>`) on the same page competes for GPU resources and risks WebGL context loss errors, especially on mobile browsers.
   - HTML5 2D Canvas (`canvas.getContext('2d')`) runs on a dedicated 2D graphics pipeline with zero WebGL conflicts, zero bundle weight, and native support for `imageSmoothingEnabled = false` and CSS `image-rendering: pixelated`.
   - Therefore, HTML5 2D Canvas is the superior, zero-risk engine for the 16-bit storefront layer.

3. **Scrollytelling & 3D Camera Trajectory Chain**:
   - *From Observation 4*, `page.tsx` is an App Router Server Component. WebGL / Canvas / GSAP requires browser DOM objects (`window`, `document`, WebGL context).
   - Therefore, the scrollytelling experience must be encapsulated in a client component (`'use client';`) and dynamically imported on `page.tsx` with `ssr: false`.
   - To achieve smooth 60fps/120fps performance without triggering React re-renders on every scroll pixel, GSAP ScrollTrigger updates a shared mutable ref (`scrollProgressRef.current = self.progress`), and R3F's `useFrame` interpolates camera position and look-at coordinates along a 4-phase descent trajectory (Sky → Descent → 16-bit shop arrival → 3D pedestal showcase).

4. **Product Viewer & Backend Protection Chain**:
   - *From Observation 4*, `CartContext` exposes `addItem({ id, title, imageUrl, price })` and synchronizes with localStorage and `CartDrawer.tsx`.
   - By wiring the 3D viewer's interactive HUD buttons to `addItem` with the currently active product's metadata, "Add to Cart" functions immediately through the existing backend and client state without modifying database schemas or cart logic.

5. **Placeholder Abstraction Chain**:
   - *From Observation 4*, no 3D `.glb` or sprite files exist in `public/`.
   - By creating `src/lib/scrollytelling/assetManifest.ts` with a discriminated union (`type: 'primitive' | 'gltf'`), procedural Three.js geometries (resin gems, gold heart charms, crystal rings) and procedural 2D pixel sprites render immediately.
   - When production assets are added, updating the manifest entries to `type: 'gltf'` instantly switches to production models with zero modifications to scene, camera, or cart code.

---

## 3. Caveats

1. **Server Component Crash Diagnosis**: This survey focused on the 3D/canvas architecture and dependency matrix (Objectives 2 & 3). Root cause analysis and fixes for the Next.js Server Component production crash are being handled by Explorer 1.
2. **Backend Cart/Stripe Contracts**: Detailed API schema auditing is being conducted by Explorer 3. Our design adheres strictly to the existing `CartContext` interface and does not alter backend routes.
3. **Hardware Acceleration Variability**: While HTML5 2D Canvas + Three.js runs smoothly on standard hardware, devices with disabled WebGL will display the fallback loading state (`StorefrontLoadingFallback.tsx`).

---

## 4. Conclusion

1. **Dependency Strategy**: Install dependencies using explicit version pins:
   ```bash
   npm install three@^0.170.0 @types/three@^0.170.0 @react-three/fiber@^8.18.0 @react-three/drei@^9.122.0 gsap@^3.12.5
   ```
2. **Next.js Config**: Add `transpilePackages: ['three', '@react-three/fiber', '@react-three/drei']` to `next.config.mjs`.
3. **Engine Choice**: Use HTML5 2D Canvas for the 16-bit RPG layer rather than PixiJS.
4. **Architecture Delivery**: Full design documented in `analysis.md`, detailing the 4-phase GSAP camera trajectory, continuous sine-wave levitation, dynamic HTML text synchronization, and `assetManifest.ts` drop-in abstraction.

---

## 5. Verification Method

1. **Dry-Run Dependency Compatibility Check**:
   Run the following command from project root:
   ```powershell
   npm install --dry-run three @types/three @react-three/fiber@^8.18.0 @react-three/drei@^9.122.0 gsap
   ```
   *Expected Result*: Exit code 0, no `ERESOLVE` errors.

2. **Transpile Packages Verification**:
   Inspect `next.config.mjs` to ensure `transpilePackages` includes `'three'`.

3. **Dynamic Import Verification**:
   Ensure `src/app/page.tsx` imports the scrollytelling container via `dynamic(() => import(...), { ssr: false })`.

4. **Invalidation Conditions**:
   - Upgrading project to React 19 would invalidate the R3F v8 / Drei v9 pin requirement.
   - Introducing external WebGL shaders for the 2D layer that strictly require PixiJS would reopen the 2D engine trade-off.
