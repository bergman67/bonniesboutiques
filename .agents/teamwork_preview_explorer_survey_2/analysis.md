# Technical Analysis & Architecture Design: 3D / 16-Bit Scrollytelling Storefront

**Author:** Explorer 2 (Frontend & 3D/Canvas Architect)  
**Date:** 2026-09-18  
**Project:** Bonnie's Boutique (`wonderful-hertz`)  
**Scope:** 3D / 16-bit Scrollytelling Architecture, Dependency Compatibility, Canvas Engine, Levitating Product Viewer, and Asset Abstraction.

---

## 1. Executive Summary

This investigation surveys the frontend codebase of Bonnie's Boutique and formulates the technical architecture to transform the storefront into an immersive **3D / 16-bit RPG scrollytelling experience**. 

Key strategic outcomes:
1. **Critical Dependency Resolution**: The repository runs **Next.js 14.2.35** with **React 18.3.1**. Unpinned installation of `@react-three/fiber` pulls v9 and `@react-three/drei` pulls v10, both of which require **React 19** and fail under npm resolution. To maintain 100% stability, dependencies must be strictly pinned to:
   - `@react-three/fiber@^8.18.0`
   - `@react-three/drei@^9.122.0`
   - `three@^0.170.0` and `@types/three@^0.170.0`
   - `gsap@^3.12.5`
2. **2D Engine Decision (HTML5 2D Canvas vs PixiJS)**: **HTML5 2D Canvas is selected over PixiJS**. PixiJS introduces a 75MB+ package overhead and instantiates a second WebGL context that competes directly with Three.js for browser GPU context limits (8–16 max). HTML5 2D Canvas provides zero bundle weight, native pixel-art rendering (`image-rendering: pixelated`, `imageSmoothingEnabled = false`), and full procedural sprite rendering for the 16-bit boutique shopkeeper and interior.
3. **Scroll Hijacking Architecture**: GSAP ScrollTrigger pins a virtual scroll container (`height: 400vh–500vh`) and scrubs normalized scroll progress (`0.0 → 1.0`). A decoupled R3F camera controller calculates cubic-bezier camera coordinates and target look-ats, descending from an ethereal 3D sky down into the nostalgic 16-bit RPG boutique.
4. **Levitating Product Viewer**: Implements a continuous multi-harmonic sine wave floating motion (`y(t) = A·sin(ωt)`), subtle turntable rotation, dynamic contact shadow modulation, and spring-eased transitions between models, synchronizing live React state with HTML typography (Title, Price, Badges) and `CartContext.addItem()`.
5. **Asset Abstraction & Clean Drop-in Contract**: A central `assetManifest.ts` abstracts all 3D geometries and 2D sprites. It generates rich procedural placeholders (gemstones, resin keychains, heart charms, pixel shopkeeper) that can be seamlessly upgraded to production `.glb` and PNG sprite sheets without touching animation or cart logic.

---

## 2. Existing Frontend Architecture & Codebase Inspection

### 2.1 Technology Stack & Configuration
- **Framework**: Next.js 14.2.35 (App Router under `src/app`).
- **Runtime**: React 18.3.1, React DOM 18.3.1.
- **TypeScript**: 5.x (`tsconfig.json` configured with `@/*` mapping to `./src/*`, `moduleResolution: "bundler"`, `skipLibCheck: true`).
- **Styling**: Tailwind CSS 3.4.1 + `src/app/globals.css`.
- **Database / ORM**: Prisma 5.22.0 connecting to Supabase PostgreSQL (`Product` model with `id`, `title`, `description`, `price`, `imageUrl`, `isDraft`).

### 2.2 Design System & Visual Identity (`globals.css`)
The existing aesthetic blends deep, mystical colors with warm ivory and rose accents:
- **60% Dominant Base**: Plum tones (`--plum-900: #1a0f24`, `--plum-800: #2d1b3d`, `--plum-700: #3d2552`).
- **30% Secondary**: Warm Cream / Ivory (`--cream-100: #f5efe6`, `--cream-200: #ede3d4`).
- **10% Accents**: Rose Gold & Pink (`--rose-400: #e8748a`, `--rose-gold: #c48b7a`).
- **Typography**: `Playfair Display` for high-end serif titles; `Lato` for crisp sans-serif text.
- **Card Styling**: Existing `.product-card` uses CSS 3D transforms (`perspective: 1000px`, `transform-style: preserve-3d`), establishing an established visual precedent for depth and physical charm.

### 2.3 Existing Component Tree
- `src/app/page.tsx`: Server Component fetching published products (`prisma.product.findMany({ where: { isDraft: false } })`). Renders `<Header />`, Hero section, Trust bar, Product grid (`<ProductCard />`), About section, and Footer.
- `src/context/CartContext.tsx`: Client-side React context using `useReducer` and `localStorage` synchronization (`'bonnies-cart'`). Manages cart items, opening/closing cart drawer, and cart calculations.
- `src/components/CartDrawer.tsx`: Slide-over drawer presenting cart items with quantity adjustments and checkout button.
- `src/components/ProductCard.tsx`: Client component rendering image, title, price, and "Add to Cart" button.
- `src/components/AddToCartButton.tsx`: Interactive button with temporary "✓ Added to Cart!" confirmation feedback.
- `src/app/products/[id]/page.tsx`: Individual product detail page.

### 2.4 Asset Directory (`public/`)
- `public/uploads/`: 99 photographic assets of handmade keychains (e.g. `1789147836207-1-IMG_8918.JPEG`).
- `public/logo.jpg`: Storefront brand asset.
- **Finding**: Currently no `.glb` / `.gltf` 3D files or 2D sprite sheets exist in `public/`. Therefore, procedural placeholder generation is an absolute requirement for initial execution.

---

## 3. Dependency Installation & Peer Compatibility Analysis

### 3.1 The React 18 vs React 19 Pitfall (Critical)
A standard command like `npm install @react-three/fiber @react-three/drei` will fail or cause severe dependency breakage:
- **`@react-three/fiber@latest` (v9.x)**: Requires `react: '>=19 <19.3'` and `react-dom: '>=19 <19.3'`.
- **`@react-three/drei@latest` (v10.x)**: Requires `react: '^19'`, `@react-three/fiber: '^9.0.0'`.
- **Current Project Environment**: Contains `react: 18.3.1` and `react-dom: 18.3.1`.

**Resolution Verification via Dry-Run**:
Executing a dry run with pinned versions:
```bash
npm install --dry-run three @types/three @react-three/fiber@^8.18.0 @react-three/drei@^9.122.0 gsap
```
Results in exit code 0 (`added 68 packages in 5s`) with **zero** peer dependency conflicts.

| Package | Version Pin | Peer Dependency Contract | Compatibility Status |
|---|---|---|---|
| `three` | `^0.170.0` (or `^0.160.0`) | None | Verified |
| `@types/three` | `^0.170.0` | None | Verified |
| `@react-three/fiber` | `^8.18.0` | `react: '>=18 <19'`, `three: '>=0.133'` | Verified Clean |
| `@react-three/drei` | `^9.122.0` | `react: '^18'`, `@react-three/fiber: '^8'` | Verified Clean |
| `gsap` | `^3.12.5` | None (ScrollTrigger included in core) | Verified Clean |

### 3.2 2D Engine Evaluation: PixiJS vs Native HTML5 2D Canvas
The user specification allows PixiJS or equivalent 2D canvas handler. A comprehensive architectural comparison was conducted:

| Evaluation Dimension | PixiJS (`pixi.js` v8) | HTML5 2D Canvas (`CanvasRenderingContext2D`) |
|---|---|---|
| **Package Weight** | ~75MB unpacked in `node_modules`, ~400KB bundle | **0 KB** (Built directly into HTML5 standard) |
| **WebGL Contexts** | Creates a 2nd WebGL context alongside R3F. Browsers limit active contexts to 8–16; multiple WebGL canvases risk context loss crashes on mobile/safari. | **0 WebGL contexts**. Runs on dedicated 2D graphics pipeline with zero contention. |
| **Pixel Art Precision** | Requires configuring scale modes (`nearest`), container render textures. | Trivial: `ctx.imageSmoothingEnabled = false;` combined with CSS `image-rendering: pixelated;`. |
| **Next.js SSR Safety** | Heavy DOM/WebGL global dependencies during SSR module evaluation; requires strict dynamic wrappers. | Standard `useEffect` / `useRef<HTMLCanvasElement>` client lifecycle; zero SSR compilation hazards. |
| **Suitability for RPG Storefront** | Overkill for 16-bit tiles, shop counters, and animated sprites. | **Ideal**. Procedural generation of 16-bit sprites and tiles is effortless in native 2D canvas. |

**Verdict**: **HTML5 2D Canvas is strongly recommended**. It avoids WebGL context exhaustion, adds zero bundle bloat, guarantees 60fps retro rendering, and enables procedural sprite sheet creation directly in code without external asset dependencies.

---

## 4. Next.js 14 Configuration & SSR Safety

### 4.1 `next.config.mjs` Enhancements
Three.js and associated helper packages export modern ES modules that benefit from Next.js webpack transpilation.
Recommended configuration update for `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

export default nextConfig;
```

### 4.2 Dynamic Import & SSR Boundary (`ssr: false`)
Three.js and canvas elements instantiate WebGL contexts and query browser globals (`window`, `document`, `navigator`, `HTMLCanvasElement`). In Next.js App Router:
1. All 3D and 2D canvas components must declare `'use client';`.
2. The scrollytelling container must be dynamically imported on the server-rendered page (`src/app/page.tsx`):
```tsx
import dynamic from 'next/dynamic';

const ScrollytellingExperience = dynamic(
  () => import('@/components/scrollytelling/ScrollytellingExperience'),
  {
    ssr: false,
    loading: () => <StorefrontLoadingFallback />,
  }
);
```
3. This guarantees zero server-side rendering crashes and prevents hydration mismatch errors.

### 4.3 React 18 StrictMode & GSAP Cleanup
React 18 in development mounts, unmounts, and remounts components. Without explicit teardown, GSAP ScrollTrigger creates orphaned listeners and duplicate pinned spacers.
- **Pattern**: Wrap all GSAP animations in `gsap.context()` inside `useEffect`:
```tsx
useEffect(() => {
  const ctx = gsap.context(() => {
    // ScrollTrigger timelines here
  }, containerRef);

  return () => ctx.revert(); // Complete cleanup on unmount
}, []);
```

---

## 5. Architecture Design: 2D Canvas 16-Bit RPG Storefront

### 5.1 Visual Concept & Scene Composition
The 2D layer portrays the nostalgic interior of **"Bonnie's Boutique"** reminiscent of classic 16-bit SNES / GBA RPG shop scenes (e.g. *Secret of Mana*, *Chrono Trigger*):
1. **Background & Architecture**:
   - Polished dark oak floorboards with plum-tinted grain.
   - Stone brick or wooden back wall adorned with hanging fairy lights and glowing torches with animated ember particles.
   - Wooden boutique counter draped in a royal purple/rose-accented runner cloth.
2. **Shopkeeper NPC ("Bonnie")**:
   - A charming 16-bit character sprite positioned behind the counter.
   - Multi-frame procedural animation: idle breathing (2-pixel rhythmic chest rise), occasional eye blink (every ~3.5s), and friendly welcoming hand gesture.
3. **Storefront Shelves & Trinket Displays**:
   - Ornate shelving behind Bonnie holding tiny pixelated potion jars, glowing crystal keychains, and velvet display pillows.
4. **Retro RPG Dialog UI Box**:
   - High-contrast 16-bit dialogue frame with double-line gold border and deep navy background.
   - Retro pixel typography: *"Welcome to Bonnie's Boutique! Travel-weary soul, gaze upon our handcrafted charms..."*
   - Flashing 16-bit arrow cursor prompt.

### 5.2 Technical Implementation Details (`RetroStorefrontCanvas.tsx`)
- **Internal Resolution**: Native low-resolution rendering at `480 × 270` pixels (standard 16:9 16-bit resolution).
- **CSS Upscaling**: Scaled to fill its container via:
  ```css
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated; /* Chrome, Edge */
  image-rendering: crisp-edges; /* Firefox */
  ```
- **Context Configuration**:
  ```ts
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }
  ```
- **Procedural Sprite Renderer**: To ensure immediate functionality without waiting for external graphic files, a procedural drawing utility (`drawShopkeeper`, `drawCounter`, `drawTiles`, `drawTorchParticles`) generates clean pixel art directly on the canvas buffer.

---

## 6. Architecture Design: GSAP ScrollTrigger Scrollytelling Pipeline

### 6.1 Scroll Hijacking & Pinning Structure
To ensure a smooth, cinematic transition without disorienting the user:
- A wrapper container `#scrollytelling-section` is created with a virtual scroll height (e.g., `400vh` to `500vh`).
- GSAP pins the viewport container (`pin: true, scrub: 1.2`) so the user's standard scroll wheel or touch gestures drive the animation timeline smoothly.

### 6.2 Trajectory Milestones (0% to 100%)

```
Scroll Progress:
0.00 ───────────── 0.25 ───────────── 0.60 ───────────── 0.85 ───────────── 1.00
[ Celestial Void ]   [ Sky Descent ]   [ 16-Bit Portal ]   [ Shop Arrival ]  [ Product Showcase ]
Floating Crystals    Camera Plunges    Pixelation Grid     Bonnie Welcomes   Interactive 3D Pedestal
Title & Hero Text    Downwards         Fades In            Shop Interior     Active Model Swapper
```

1. **Phase 1 (0% – 25%): The Mystical Sky**:
   - 3D camera is elevated at `[0, 6, 14]`, angled downward at `[0, 1.5, 0]`.
   - Ethereal floating gems and sparkle dust drift gently in the dark plum atmosphere.
   - Storefront Hero headlines (*"Every Piece Tells a Story"*) are prominently visible.
2. **Phase 2 (25% – 60%): The Dimensional Descent**:
   - 3D camera accelerates downwards along a smooth spline toward `[0, 2, 6]`.
   - Floating charms part outward to reveal an enchanted dimensional threshold below.
   - Atmospheric fog shifts from deep plum to warm ambient shop illumination.
3. **Phase 3 (60% – 85%): Entering the 16-Bit Realm**:
   - The 2D 16-bit canvas fades from 0 to 1 with an optional retro pixel-dissolve / scanline vignette.
   - The camera enters Bonnie's cozy boutique shop; Bonnie gives a welcoming wave.
   - The retro RPG dialogue box types out a friendly greeting.
4. **Phase 4 (85% – 100%): Product Inspection & Levitating Showcase**:
   - Camera stabilizes at close-range showcase coordinates `[0, 1.2, 3.8]`, centered directly over an enchanted carved pedestal.
   - The active 3D product model floats into position above the pedestal in full interactive fidelity.
   - The interactive product viewer controls (swap arrows, title, price, "Add to Cart") become fully active.

### 6.3 Decoupled Frame Synchronization
Rather than forcing React state updates on every scroll pixel (which causes lag and re-renders), a shared mutable ref (`scrollProgressRef`) is updated in GSAP's `onUpdate`:
```ts
ScrollTrigger.create({
  trigger: pinContainerRef.current,
  start: 'top top',
  end: '+=400%',
  pin: true,
  scrub: 1.2,
  onUpdate: (self) => {
    scrollProgressRef.current = self.progress;
  },
});
```
Inside React Three Fiber, `useFrame` reads `scrollProgressRef.current` and interpolates camera position via `THREE.MathUtils.lerp`, maintaining smooth 60fps/120fps display performance.

---

## 7. Architecture Design: 3D Levitating Product Viewer

### 7.1 Continuous Harmonic Levitating Animation
The active 3D model is wrapped in a dedicated R3F floating group. In `useFrame`:
```ts
useFrame(({ clock }) => {
  const t = clock.getElapsedTime();
  
  // Dual-sine vertical levitation (gentle organic floating)
  const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.03;
  modelGroupRef.current.position.y = baseHeight + floatOffset;
  
  // Subtle rocking and turntable spin
  modelGroupRef.current.rotation.y = t * 0.4;
  modelGroupRef.current.rotation.z = Math.sin(t * 1.2) * 0.04;
  
  // Responsive shadow scaling
  if (shadowRef.current) {
    const shadowScale = 1 - floatOffset * 1.5;
    shadowRef.current.scale.set(shadowScale, shadowScale, 1);
    shadowRef.current.material.opacity = 0.5 - floatOffset * 0.8;
  }
});
```

### 7.2 Smooth Model Swapping Transition
When the user clicks `< Previous` or `Next >` (or taps a thumbnail):
1. **Transition Timeline**:
   - Current model scales down (`1.0 → 0.0`) with an accelerated spin (`rotation.y += π`).
   - State advances `currentIndex = (currentIndex + 1) % products.length`.
   - New model spawns at scale `0.0` and animates to `1.0` with an elastic spring bounce (`scale: 1.05 → 1.0`).
2. **User Interaction**:
   - Pointer drag enables 360° inspection of the active charm.
   - When the user releases pointer drag, turntable auto-rotation resumes smoothly.

### 7.3 Dynamic HTML State Synchronization
The 3D viewer is flanked by an elegant floating HUD:
- **Product Title**: Displayed in `'Playfair Display', serif` with smooth CSS cross-fade.
- **Price Tag**: Highlighted in `#e8748a` with rose gold badge styling.
- **Navigation Buttons**: Sleek circular buttons (`‹` and `›`) with tactile hover animations.
- **"Add to Cart" Button**: Connected directly to `CartContext`:
  ```tsx
  const { addItem } = useCart();
  
  const handleAddToCart = () => {
    addItem({
      id: currentProduct.id,
      title: currentProduct.title,
      imageUrl: currentProduct.imageUrl,
      price: currentProduct.price ?? 8.0,
    });
  };
  ```
- Instant sync ensures cart drawer counter increments, drawer opens, and localStorage persists the item without altering existing checkout logic.

---

## 8. Architecture Design: Placeholder Asset Generation & Production Abstraction Layer

### 8.1 Dedicated Abstraction File (`assetManifest.ts`)
To isolate placeholder generation from core application logic, all asset metadata is defined in `src/lib/scrollytelling/assetManifest.ts`:

```typescript
export type AssetType = 'primitive' | 'gltf';

export interface ModelDescriptor {
  id: string;
  name: string;
  type: AssetType;
  gltfUrl?: string; // Production path e.g. '/models/rose_crystal_keychain.glb'
  primitiveConfig: {
    shape: 'crystal' | 'heart' | 'ringKeychain' | 'dodecahedron' | 'starPendant';
    color: string;
    roughness: number;
    metalness: number;
    transmission?: number; // Glass/resin translucency
    ior?: number; // Index of refraction
  };
  scale: [number, number, number];
}
```

### 8.2 Rich Procedural Three.js Geometries
Rather than generic gray cubes, the placeholder generator builds stylized 3D trinkets matching Bonnie's boutique inventory:
1. **Crystal Gem Keychain**: `OctahedronGeometry` / `ConeGeometry` with a metallic gold loop ring (`TorusGeometry`) on top.
2. **Rose Gold Heart Charm**: Extruded 2D bezier heart shape with beveled edges and glossy metallic material.
3. **Resin Pendant**: `CylinderGeometry` with `MeshPhysicalMaterial` (`transmission: 0.9`, `roughness: 0.1`, `thickness: 0.5`) holding an embedded decorative star.
4. **Magical Dodecahedron**: Faceted charm with iridescence and glowing edge wireframes.

### 8.3 2D Sprite Abstraction Contract
```typescript
export interface SpriteAssetDescriptor {
  id: string;
  type: 'procedural' | 'spritesheet';
  sheetUrl?: string; // Production path e.g. '/sprites/bonnie_shopkeeper.png'
  frameWidth: number;
  frameHeight: number;
  animations: Record<string, number[]>; // e.g. { idle: [0, 1, 2, 1], wave: [3, 4, 5, 4] }
}
```
**Replacement Contract**:
When 3D artists or pixel artists deliver production `.glb` models and `.png` sprite sheets:
1. Place files into `public/models/` and `public/sprites/`.
2. Update the corresponding entries in `assetManifest.ts` (`type: 'gltf'`, `gltfUrl: '/models/...'`).
3. **Zero lines of code** in the scene, camera controller, canvas renderer, or cart integration need to be modified.

---

## 9. Proposed File Structure & Implementation Roadmap

### 9.1 New & Modified File Map
```
src/
├── app/
│   ├── page.tsx                             # Integrate ScrollytellingExperience at top
│   └── globals.css                          # Add pixelated rendering & scrollytelling utility classes
├── components/
│   └── scrollytelling/
│       ├── ScrollytellingExperience.tsx     # Client master container (dynamic import target)
│       ├── ScrollyCameraRig.tsx             # GSAP ScrollTrigger + R3F camera interpolation
│       ├── Scene3D.tsx                      # R3F Canvas, lighting, pedestal, floating void
│       ├── LevitatingProductViewer.tsx      # Levitating active 3D model & swap transition
│       ├── RetroStorefrontCanvas.tsx        # 2D 16-bit RPG canvas engine & shopkeeper
│       ├── StorefrontHUD.tsx                # HTML product title, price, swap buttons, Add to Cart
│       └── StorefrontLoadingFallback.tsx   # Elegant loading skeleton during WebGL init
├── lib/
│   └── scrollytelling/
│       ├── assetManifest.ts                 # Central asset abstraction & registry
│       ├── proceduralPrimitives.tsx         # Procedural Three.js geometries for placeholders
│       └── proceduralSprites.ts             # 16-bit canvas procedural drawing helpers
next.config.mjs                              # Add transpilePackages: ['three', ...]
```

### 9.2 Milestone Execution Sequence
1. **Milestone 1**: Resolve the Next.js Server Component build/render crash (led by Explorer 1 & Worker).
2. **Milestone 2**: Install pinned dependencies (`three`, `@types/three`, `@react-three/fiber@^8.18.0`, `@react-three/drei@^9.122.0`, `gsap@^3.12.5`). Update `next.config.mjs`. Implement `assetManifest.ts` and `proceduralPrimitives.tsx`.
3. **Milestone 3**: Build `RetroStorefrontCanvas.tsx` (16-bit RPG layer) and `ScrollyCameraRig.tsx` with GSAP ScrollTrigger pinning and trajectory interpolation.
4. **Milestone 4**: Build `LevitatingProductViewer.tsx` with sine-wave animation, swap carousel, and HUD dynamic sync wired to `CartContext.addItem()`.
5. **Milestone 5**: Full end-to-end acceptance testing across desktop and mobile viewports.

---

## 10. Summary of Architectural Recommendations
- **Always pin R3F to v8 (`^8.18.0`) and Drei to v9 (`^9.122.0`)** to prevent React 19 incompatibility.
- **Choose HTML5 2D Canvas over PixiJS** for zero bundle overhead, zero WebGL context conflict, and authentic 16-bit pixel scaling.
- **Decouple GSAP scroll progress from React state** using refs and `useFrame` lerping for 60fps/120fps performance.
- **Abstract all placeholder assets in `assetManifest.ts`** to enable instant swap-in of production `.glb` and sprite sheets later.
