# Project: Bonnie's Boutique 3D/16-Bit Scrollytelling & Server Fix

## Architecture
- **Framework**: Next.js 14.2.35 (App Router), React 18.3.1, TypeScript, Tailwind CSS
- **Database / ORM**: Prisma 5.22.0 singleton (`src/lib/prisma.ts`), Supabase PostgreSQL
- **Hosting / Deploy**: Netlify AWS Lambda (`nodejs24.x`, `rhel-openssl-3.0.x`) with `@netlify/plugin-nextjs`
- **3D & Animation**: Three.js (^0.170.0), @react-three/fiber (^8.18.0), @react-three/drei (^9.122.0), GSAP (^3.12.5) with ScrollTrigger
- **2D Canvas Layer**: High-performance HTML5 2D pixel-art canvas (16-bit RPG boutique storefront)
- **State & Integration**: Client-side CartContext (`bonnies-cart` in localStorage), existing `/checkout` and `/api/checkout` backend routes preserved without modification

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Prisma Linux BinaryTargets | Configure `native`, `rhel-openssl-3.0.x`, `debian-openssl-3.0.x` in `schema.prisma` | M1 | Survey Explorer 1 |
| 2 | Prisma Client Singleton | Centralize Prisma instantiation in `src/lib/prisma.ts` to prevent pool exhaustion | M1 | Survey Explorer 1 |
| 3 | Server Component Fallback | Safe error handling and fallback state in `src/app/page.tsx` & `src/app/products/[id]/page.tsx` | M1 | Survey Explorer 1 |
| 4 | Root Netlify Configuration | `netlify.toml` configuring Next.js build and plugin | M1 | Survey Explorer 1 |
| 5 | Dependency Installation & Transpilation | Install pinned Three.js, R3F, Drei, GSAP and configure `next.config.js` | M2 | Survey Explorer 2 |
| 6 | 2D 16-Bit RPG Canvas Layer | Pixel-art RPG storefront canvas (shelves, counter, floor, retro shopkeeper/items) | M2 | Survey Explorer 2 |
| 7 | GSAP ScrollTrigger Hijack | 400vh virtual scroll pinning mapping 0%->100% to 3D camera descent into 16-bit layer | M2 | Survey Explorer 2 |
| 8 | 3D Levitating Product Viewer | R3F interactive viewer with continuous multi-harmonic sine-wave float & turntable rotation | M2 | Survey Explorer 2 |
| 9 | Dynamic Model Swapping | Smooth transitions between products via scroll triggers and interactive nav buttons | M2 | Survey Explorer 2 |
| 10 | Dynamic HTML Typography Sync | Synchronized overlay displaying current product title, price, category | M2 | Survey Explorer 2 |
| 11 | Backend Cart Integration | Wire 3D viewer "Add to Cart" to `CartContext.addItem()` without altering backend APIs | M2 | Survey Explorer 2 |
| 12 | Backend Protection & API Contracts | Enforce zero alterations to `/api/products`, `/api/checkout`, Prisma schema, or checkout flow | M2 | Survey Explorer 3 |
| 13 | Dedicated Asset Manifest | Modular asset abstraction (`src/lib/scrollytelling/assetManifest.ts`) with procedural 3D & 2D geometries swappable for production assets | M2 | Survey Explorer 2 |
| 14 | E2E Acceptance Verification | Comprehensive verification of all 5 acceptance criteria, test suites, and production build | M3 | Original Request |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Next.js Server Component Crash Fix | Fix Prisma binary targets, singleton client, Server Component error handling, root netlify.toml, verify build | none | DONE |
| 2 | 3D / 16-Bit Scrollytelling Storefront & Product Viewer | Install Three/R3F/Drei/GSAP, implement 2D RPG canvas layer, GSAP camera trajectory scroll hijacking, 3D levitating viewer, dynamic HTML sync, asset manifest, and cart integration | M1 | DONE |
| 3 | Final E2E Acceptance Verification & Production Release | Comprehensive test suite covering all 5 acceptance criteria, adversarial coverage, build and production verification | M2 | DONE |

## Interface Contracts
### `src/lib/prisma.ts` ↔ Server Components & API Routes
- Export: `export const prisma: PrismaClient` (cached on `globalThis` in development)
- Error handling: callers must wrap queries in try/catch or use defined fallbacks

### Scrollytelling Stage ↔ R3F Canvas & Camera Controller
- Scroll progress: `progress: number` (0.0 to 1.0) managed via GSAP ScrollTrigger
- Camera trajectory lerp: `camera.position.set(x, y, z)` and `camera.lookAt(tx, ty, tz)` updated each frame
- Stage boundaries:
  - 0.0 - 0.25: Celestial Sky & Title Descent
  - 0.25 - 0.50: Cloud Layer & Storefront Descent
  - 0.50 - 0.75: Arrival at 16-Bit RPG Boutique Layer
  - 0.75 - 1.00: Showcase Pedestal & Product Viewer Focus

### 3D Product Viewer HUD ↔ Cart Context
- Interface: `useCart().addItem({ id: string, title: string, imageUrl: string, price: number })`
- Storage: `localStorage['bonnies-cart']`
- Checkout payload: `POST /api/checkout` `{ items: CartItem[], form: CheckoutForm, total: number }`

### Asset Manifest ↔ Scrollytelling Components
- Interface in `src/lib/scrollytelling/assetManifest.ts`:
  - `getPlaceholderGeometry(productId: string): ThreeGeometryConfig`
  - `getSpriteSheetConfig(): SpriteSheetConfig`
  - Easy drop-in replacement with `.glb` loader when asset files are provided

## Code Layout
- `prisma/schema.prisma`: Prisma data model and generator binary targets
- `src/lib/prisma.ts`: Singleton Prisma Client
- `src/lib/scrollytelling/assetManifest.ts`: Abstracted 3D geometries and 2D sprites
- `src/components/scrollytelling/ScrollyCanvas.tsx`: R3F Canvas and GSAP ScrollTrigger container
- `src/components/scrollytelling/PixelStorefrontLayer.tsx`: 2D HTML5 Canvas 16-bit RPG layer
- `src/components/scrollytelling/LevitatingProductViewer.tsx`: Floating 3D model viewer and controls
- `src/components/scrollytelling/ProductHUD.tsx`: Dynamic HTML text and Add to Cart button
- `src/app/page.tsx`: Refactored homepage integrating the scrollytelling experience
