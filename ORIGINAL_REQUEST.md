# Original User Request

## 2026-09-18T13:28:27Z

Fix the Next.js Server Component production crash in the existing repository, then completely refactor the storefront frontend into an immersive 3D/16-bit scrollytelling experience using React Three Fiber and GSAP.

Working directory: C:\Users\eranb\Documents\antigravity\wonderful-hertz

STEP 1: PRODUCTION FIX (PRIORITY 1)
- Diagnose and fix the Next.js site error: "An error occurred in the Server Components render." Ensure the production build compiles and loads successfully before moving to frontend feature work.

STEP 2: 3D / 16-BIT SCROLLYTELLING ARCHITECTURE
- Install required dependencies: Three.js, React Three Fiber, GSAP (with ScrollTrigger), and PixiJS (or equivalent 2D canvas handler).
- Implement a 2D canvas/sprite layer for a 16-bit RPG-style storefront.
- Implement GSAP ScrollTrigger to hijack the vertical scroll. Map the 0% to 100% scroll progress to a 3D camera trajectory that descends down into the 16-bit storefront layer.

STEP 3: 3D LEVITATING PRODUCT VIEWER
- Build a component where products are rendered as interactive, 3D GLTF models floating with a continuous "levitation" sine-wave animation.
- Tie the user's scroll or navigation buttons to smoothly swap the active 3D model.
- Ensure the React state dynamically updates the standard HTML text (product title, price) to match the currently viewed 3D model.

STEP 4: BACKEND PROTECTION
- Ensure all new UI elements map cleanly to the existing storefront API endpoints. Do not alter or break the existing backend inventory or checkout logic.

STEP 5: PLACEHOLDER ASSET GENERATION
- Generate lightweight placeholders (Three.js primitive geometries, basic Canvas blocks).
- Abstract all placeholders into a dedicated file so they can be easily swapped for production `.glb` and sprite sheet files later.

ACCEPTANCE CRITERIA:
1. The Next.js production build loads without the "Server Components render" crash.
2. GSAP ScrollTrigger successfully drives the React Three Fiber camera movement on scroll.
3. 2D 16-bit pixel art elements render alongside or right after the 3D descent.
4. Products load as levitating 3D placeholder models with smooth swapping transitions.
5. "Add to Cart" successfully pushes to the existing backend API.

## 2026-09-18T15:55:34Z

Update the storefront's 'About' section to focus on generational crafting, and replace the placeholder 3D geometries with actual isolated product images levitating as 2D paper cutouts in the 3D space.

Working directory: C:\Users\eranb\Documents\antigravity\wonderful-hertz
Integrity mode: development

## Requirements

### R1. About Section Update
Remove references to the "16-bit" style in the About section copy (in `page.tsx` or `PixelStorefrontLayer.tsx` as applicable). Rewrite the text to emphasize "generational crafting" (Bonnie & Tammy) and mention a "variety of animations."

### R2. Background Removal Script
Write a backend script (e.g., using `@imgly/background-removal-node` or similar) to automatically strip the background from the product photos. Save the processed images (transparent PNGs) back to Supabase Storage or the public directory, and update the database or asset manifest to point to these new transparent assets.

### R3. 3D Billboard Rendering
Update the React Three Fiber `LevitatingProductViewer` component. Instead of rendering placeholder geometries (like spheres or boxes), render the transparent product images as 2D planes/billboards (e.g., using Drei's `<Image>` or `<Billboard>`) that float and levitate.

## Acceptance Criteria

### Verification
- [ ] The About section text no longer contains "16-bit" and explicitly mentions "generational crafting" and "animations".
- [ ] A script exists and successfully removes backgrounds from the product images to create transparent PNGs.
- [ ] The 3D viewer renders the transparent images as levitating planes instead of primitive geometries.

## 2026-09-18T19:59:05Z

Fix the responsive design of the 16-bit PixelStorefrontLayer and 3D LevitatingProductViewer so that elements (especially the dialogue speech bubble, characters, and 3D product) are sized and positioned cleanly on both mobile and desktop screens.

Working directory: C:\Users\eranb\Documents\antigravity\wonderful-hertz
Integrity mode: development
Requested team: small focused team

## Requirements

### R1. CSS-Based Responsive Pixel Art Canvas
Draw the PixelStorefrontLayer canvas at a fixed "native" resolution (e.g., 800x600 or similar fixed aspect ratio) and use CSS scaling (e.g., object-fit: contain or transform) to fit it perfectly within the browser window on both mobile and desktop. This will preserve the exact layout and pixel proportions of the characters and speech bubble across all devices.

### R2. Responsive Speech Bubble
Adjust the dimensions, font size, and text wrapping of the speech bubble within the fixed native canvas resolution so that the text perfectly fits inside the bubble and doesn't spill out or get clipped. 

### R3. Responsive 3D Product Placement
Ensure the 3D LevitatingProductViewer dynamically adjusts its camera FOV or scale based on the user's viewport aspect ratio so that the 3D product aligns correctly over the 2D pixel desk on both narrow mobile screens and wide desktop screens.

## Acceptance Criteria

### Verification
- [ ] On a narrow mobile viewport (e.g., iPhone screen width), the entire 2D canvas is scaled down visibly, the speech bubble is fully on-screen, and the text is legible and contained within the bubble.
- [ ] On a narrow mobile viewport, the 3D product stays visually anchored over the 2D pixel desk without drifting completely off it.
- [ ] On a wide desktop viewport, the pixel art remains proportional and crisp without cutting off the characters' heads or losing the speech bubble.



## 2026-10-21T18:21:51Z

Production feature and UX overhaul for **Bonnie's Boutique (B&T Trinkets)** (`https://btboutiqe.com/`), a Next.js + Prisma + Tailwind e-commerce storefront selling handmade beaded pens, keychains, and charms run by the user's elderly grandmother (Bonnie). Upgrade the customer storefront shopping experience, enhance the elderly-friendly `/admin` dashboard with a 1-click "Orders Needing Labels / Print Queue" workflow and quick inventory controls, and ensure strict privacy and automatic Shippo address-book fallback for shipping label generation.

Working directory: c:/Users/eranb/Documents/antigravity/wonderful-hertz
Integrity mode: development

## Requirements

### R1. Storefront Shopping & Discovery UX Overhaul
Upgrade the customer-facing storefront (`src/app/page.tsx` and storefront components) with intuitive product discovery and shopping tools while preserving the existing scrollytelling hero and brand aesthetic:
- Category filter pills (`All`, `Beaded Pens`, `Keychains`, `Charms & Bookmarks`) with live item counts and instant client-side filtering.
- An instant search input allowing customers to search products by keyword (e.g., "Christmas", "Puppy", "Butterfly", "Halloween") and sort by price or featured/newest.
- A Product Quick-View Modal when clicking a product card image/title so shoppers can inspect a larger high-resolution image, full description, category badge, and add to cart without losing their scroll position.
- An enhanced Cart Drawer showing a Free Shipping Progress Bar (e.g., "Add $X more for FREE shipping!") based on `freeShippingThreshold` from `/api/settings`.

### R2. Grandma-Friendly Admin Portal (`/admin`) UX Overhaul
Make `/admin` (`src/app/admin/page.tsx`) ultra-accessible, high-contrast, and effortless for an elderly store owner (Bonnie):
- Add a prominent top-of-page **"👵 Bonnie's Daily Action Center"** banner visible across `/admin` whenever there are unprinted or unshipped orders, featuring a single huge 1-click **"🖨️ Print All Waiting Shipping Labels & Packing Slips (N)"** button and a 1-click jump to Customer Orders.
- In the **Manage Products** tab, add a search bar, category filter, and 1-click inline price editing and 1-click Publish/Hide toggle with large, clearly labeled buttons (no tiny icons).
- Keep `/admin` password-protected (first-visit setup + login screen + change password in Settings) and hidden from public storefront navigation.

### R3. Private Return Address & Plug-and-Play Shippo Fallback
Ensure Bonnie's return address is 100% private and never exposed on the public storefront or unauthenticated API responses:
- Public `GET /api/settings` must never return `returnStreet`, `returnCity`, `returnState`, `returnZip`, `shippoApiKey`, or `stripeSecretKey` unless `?admin=true` AND a valid `x-admin-pin` header is provided.
- In `src/lib/shipping.ts` and `src/app/api/settings/test-shippo/route.ts`, if `returnStreet` is not populated in `StoreSettings`, automatically query Shippo's saved address book (`GET https://api.goshippo.com/addresses/`) and use any valid sender address found there, displaying clearly in Admin Settings whether a return address is active via Admin Settings or Shippo's Address Book.

### R4. Clean Catalog Integrity (96 Verified Products)
Preserve the deduplicated 96-product catalog in PostgreSQL and `src/lib/scrollytelling/productAssetManifest.json` with zero duplicate photos or leftover framed art, ensuring all 96 products have accurate titles and descriptions matching their images.

## Acceptance Criteria

### Storefront UX
- [ ] Storefront renders category filter pills (`All`, `Beaded Pens`, `Keychains`, `Charms & Bookmarks`), a search input, and sort selector that filter the 96 products accurately.
- [ ] Clicking a product opens a Quick-View Modal with large image, description, price, and "Add to Cart" button.
- [ ] Cart drawer displays a dynamic Free Shipping Progress Bar using `freeShippingThreshold`.
- [ ] No link to `/admin` appears anywhere in the public storefront DOM.

### Admin UX & Shipping Privacy
- [ ] `/admin` displays the high-contrast "Bonnie's Daily Action Center" / Print Queue banner and large, readable controls across Orders, Products, and Settings tabs.
- [ ] Unauthenticated `GET /api/settings` returns `200` with public store configuration only and omits `returnStreet`, `returnCity`, `returnState`, `returnZip`, `shippoApiKey`, and `stripeSecretKey`.
- [ ] `src/lib/shipping.ts` falls back to `https://api.goshippo.com/addresses/` when `StoreSettings.returnStreet` is empty.

### Build & Verification
- [ ] `src/lib/scrollytelling/productAssetManifest.json` and the database remain in sync with the 96 clean, deduplicated products.
- [ ] `npm run build` completes with exit code `0` and zero TypeScript or Next.js build errors.


## 2026-10-21T21:22:20Z

Build an **Autonomous Short-Form Character Animation & Skit Studio ("Bonnie & Tammy's Trinket Tales")** inside `c:\Users\eranb\Documents\antigravity\wonderful-hertz` to generate organic, non-salesy 9:16 vertical 16-bit animations and 24/7 episodic loops for TikTok, Instagram Reels, YouTube Shorts, and Facebook Reels.

Working directory: c:\Users\eranb\Documents\antigravity\wonderful-hertz
Integrity mode: development

## Context & Reference Resources
- **Characters & Set**: `src/components/scrollytelling/PixelStorefrontLayer.tsx` contains Shopkeeper Bonnie (warm auburn hair, rose hairclip, rose velvet dress with white lace apron), Daughter Tammy (caramel hair, vibrant teal dress), the 16-bit cozy potion/trinket shop set (flickering lanterns, floating stardust, mahogany counter, RPG dialogue boxes), and synthesized Animal Crossing-style voice blips (`playTextBlip`).
- **Product Props**: `src/lib/scrollytelling/productAssetManifest.json` and `public/uploads/transparent/` provide 96 transparent PNG cutouts of Bonnie's real handmade beaded pens, keychains, and charms to appear organically as magical items or props.
- **Verification Reference**: `scripts/run-e2e-tests.mjs` shows how existing verification scripts run against the Next.js app.

## Requirements

### R1. Studio Route (`/studio` + `/admin` Link), Expanded Character Rig, Emotive Expressions & Cozy Backdrops
Build a dedicated studio route at `/studio` (unauthenticated for frictionless local recording and automated verification) with a quick-access navigation link inside `/admin`. Upgrade the 16-bit canvas renderer for Bonnie and Tammy so they can walk around the shop, turn toward each other, laugh, gasp, hold up a trinket/pen on the counter, sip tea, pack a tiny box, and display emotive pixel expressions (`happy`, `shocked`, `sleepy`, `laughing`, `proud grandma`, `eye-rolling daughter`). Support 5 selectable cozy scene backdrops/moods: **Cozy Night Shop**, **Morning Coffee Prep**, **Rainy Window Crafting**, **Holiday/Spooky Season Decor**, and **"Closing Time" Lo-Fi Chill**.

### R2. Organic "Zero-Ad" Skit & Storyline Engine (20+ Built-in Templates, Custom Script Builder & 24/7 Mode)
Create an episodic skit and storyline engine featuring at least **20 built-in 15–30 second non-salesy skit templates** across:
- *Cozy Grandma Wisdom & Humor* (wholesome/funny banter between Bonnie and Tammy—mishearing modern slang, rating weird customer requests like an RPG merchant, debating whether a fuzzy monster keychain is "cursed or cute", wholesome grandma life advice).
- *RPG Item Appraisal Skits* (a random trinket from the 96-product catalog floats above the counter with RPG stats like `+15 Cozy Vibes, +10 Handwriting Speed` while Bonnie & Tammy banter about its lore).
- *Custom Script Builder* (allowing users to write/edit custom dialogue lines, speaker, expression, action, and prop per beat and play/export them).
- *24/7 "Lo-Fi Cozy Shopkeep" Mode* (a continuous, self-running 24/7 loop where Bonnie and Tammy craft, organize shelves, chat with visitors, and react to the time of day with ambient cozy synth audio + Animal Crossing voice blips).

### R3. Vertical 9:16 Social Video Framing, Synced Animated Captions & 1-Click/Batch Video Export
Render in crisp, integer-scaled **1080×1920 (9:16 vertical)** resolution for Reels/TikTok/Shorts with a **16:9** and **1:1** aspect-ratio toggle. Render burnt-in, TikTok/Reels-safe animated captions synced to the characters' Animal Crossing speech blips. Include a **1-Click "Record & Download Video (.webm / .mp4)"** exporter using `canvas.captureStream(60)` combined with Web Audio API stream mixing (`MediaStreamAudioDestinationNode`) so voice blips, cozy background synth music, and 60fps canvas animation export together into a downloadable video file, plus a **Batch Auto-Generator** to queue and sequentially export multiple skits.

### R4. Multi-Platform Caption & Hashtag Generator
For every generated or selected animation, automatically generate platform-ready, one-click copyable captions and hashtag sets for **TikTok**, **Instagram Reels**, **YouTube Shorts**, and **Facebook Reels** that lean into cozy storytelling and curiosity rather than direct sales.

## Acceptance Criteria

### Build & Route Integrity
- [ ] `npm run build` succeeds with zero TypeScript, Next.js, or ESLint errors.
- [ ] `/studio` renders with HTTP 200 and `/admin` includes a working link to `/studio`.

### Character Animation Rig, Backdrops & Props
- [ ] All 6 emotive expressions (`happy`, `shocked`, `sleepy`, `laughing`, `proud grandma`, `eye-rolling daughter`) and character actions (`walk`, `turn`, `laugh`, `gasp`, `hold trinket`, `sip tea`, `pack box`) are implemented and triggerable in the studio canvas.
- [ ] All 5 scene backdrops (**Cozy Night Shop**, **Morning Coffee Prep**, **Rainy Window Crafting**, **Holiday/Spooky Season Decor**, **"Closing Time" Lo-Fi Chill**) are selectable and render distinct visual moods/lighting on the canvas.
- [ ] Product props from `src/lib/scrollytelling/productAssetManifest.json` (all 96 cutouts) load into RPG Item Appraisal skits and prop actions with generated RPG stats.

### Skit Engine, Video/Audio Exporter & Social Copy
- [ ] At least 20 distinct built-in non-salesy skit templates, the Custom Script Builder, and the continuous 24/7 "Lo-Fi Cozy Shopkeep" mode are present and executable.
- [ ] Aspect-ratio switcher supports `9:16` (1080×1920), `16:9` (1920×1080), and `1:1` (1080×1080) with burnt-in synced captions rendered directly on the canvas so they appear in exported video files.
- [ ] 1-Click Video Export (`canvas.captureStream(60)` + `MediaStreamAudioDestinationNode` via `MediaRecorder`) and the Batch Auto-Generator queue are wired up and verified.
- [ ] Multi-platform caption and hashtag cards for TikTok, Instagram Reels, YouTube Shorts, and Facebook Reels dynamically update per skit and support one-click clipboard copy.
- [ ] An automated verification script (`scripts/verify-studio.mjs` or extension of `scripts/run-e2e-tests.mjs`) objectively verifies all requirements above and passes 100%.


## 2026-10-24T01:04:48Z

Refine the **Scrollytelling Product Stage & Smart Cutout Extraction Pipeline** for **Bonnie's Boutique (B&T Trinkets)** (`https://btboutiqe.com/`) so that newly uploaded products match the exact visual scale and framing of the original catalog, remove the 3D pedestal base that overlaps and obscures dangling charms, and upgrade cutout post-processing (edge de-fringing, concavity pocket cleanup, and re-normalizing the recently uploaded *Citrus Glow Letter W* and *Bright Candy Initial Y* keychains) for crisp, halo-free product images.

Working directory: c:/Users/eranb/Documents/antigravity/wonderful-hertz
Integrity mode: development

## Requirements

### R1. Remove the Occluding 3D Pedestal Base from the Scrollytelling Stage
Update the 3D scrollytelling product viewer (`src/components/scrollytelling/LevitatingProductViewer.tsx` and related stage components) to completely remove the 3D stepped cylinder pedestal base (`MAGICAL SHOWCASE PEDESTAL` cylinders, trim rings, pillow, and contact shadow rings) that sits in front of the bottom of the product cutout and visually blocks dangling charms (`"W"`, `"Y"`, etc.). Ensure the levitating product cutout floats cleanly and unobstructed inside the storefront display window on both mobile and desktop viewports.

### R2. Normalize Cutout Canvas Scale & Framing to Match the Original Catalog
Fix the size mismatch where newly uploaded products fill ~91% of the PNG canvas (`paddingPercent: 0.05`) and appear ~2x oversized compared to the original catalog items (which occupy ~47%–50% of a `3:4` canvas):
- Update both the browser cutout processor (`src/app/admin/utils/autoMagicPipeline.ts`) and the server-side isolation/trimming pipeline (`src/lib/image/isolation.ts` and `/api/upload`) so that after trimming transparent margins around the isolated trinket, the cutout is centered onto a standardized `3:4` transparent canvas (e.g., `1200×1600`) where the trinket's bounding box occupies **~48%–52% of the canvas height** (and at most **~52% of the canvas width**), matching the exact visual scale of the original catalog items (*Snowman Winter Bookmark Charm*, *Harvest Gnome Bookmark Charm*, etc.).
- Also ensure `ProductCutoutTexturePlane` in `src/components/scrollytelling/LevitatingProductViewer.tsx` normalizes any tightly cropped texture gracefully so no product ever overflows the pink showcase frame or overlaps the Bonnie & Tammy characters above it.

### R3. Refine Image Extraction: Edge De-Fringing, Concavity Pocket Cleanup & Existing Upload Repair
Upgrade cutout extraction quality so dark/textured tabletop backgrounds leave zero gray halo or trapped pockets:
- Add **Edge Alpha Tightening & Color Decontamination (De-Fringing)** plus **Concavity Background Pocket Removal** to both the browser neural cutout pass (`autoMagicPipeline.ts`) and server-side `isolation.ts`:
  - Strip semi-transparent gray/tabletop edge halos (`alpha < 140` or low-saturation pixels matching the background chromaticity along the 2px–3px outer boundary).
  - Clear trapped background pockets inside tight concavities (such as the gray triangle inside the fork of the `"Y"` charm or between adjacent translucent beads) using background chromaticity matching.
- Re-process the already-uploaded raw photos for **"Citrus Glow Letter W Keychain"** (`https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/raw/raw-1792797228459-w.jpg`) and **"Bright Candy Initial Y Keychain"** (`https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/raw/raw-1792799262887-IMG_1035.jpg`) in Supabase Storage and PostgreSQL using this refined extraction + normalized `3:4` canvas framing so both live products immediately look crisp, properly scaled, and halo-free on `https://btboutiqe.com/`.

## Acceptance Criteria

### Visual Stage & Scale Consistency
- [ ] `LevitatingProductViewer.tsx` contains zero 3D pedestal cylinder/ring meshes (`cylinderGeometry` / `ringGeometry` base elements removed), and dangling charms at the bottom of products are 100% unobstructed.
- [ ] Newly processed cutouts from `/api/upload` and `autoMagicPipeline.ts` output a `3:4` transparent PNG canvas where the opaque product bounding box occupies `45%–55%` of the canvas height (matching the original catalog's `~47.3%` fill ratio instead of `91%`).
- [ ] The live database records and Supabase Storage transparent PNGs for `"Citrus Glow Letter W Keychain"` and `"Bright Candy Initial Y Keychain"` are updated to the normalized `3:4` canvas scale with clean, de-fringed edges and clear concavity pockets (including inside the `"Y"` charm fork).

### Build & End-to-End Verification
- [ ] Automated verification script confirms: (a) pedestal meshes are absent from `LevitatingProductViewer.tsx`, (b) `/api/upload` produces a normalized `3:4` PNG with `45%–55%` vertical bounding-box fill ratio and zero edge/concavity halo, and (c) both `"Citrus Glow Letter W Keychain"` and `"Bright Candy Initial Y Keychain"` pass the fill-ratio and transparency checks.
- [ ] Existing E2E test suite (`node scripts/run-e2e-tests.mjs`), `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass with exit code `0`.


## 2026-10-27T20:59:07Z

Comprehensive security audit and end-to-end hardening of **Bonnie's Boutique (B&T Trinkets)** (`https://btboutiqe.com/`) to resolve the Supabase `rls_disabled_in_public` critical vulnerability, lock down all database tables against unauthorized PostgREST/anon access, enforce admin authentication across all privileged API routes, prevent unverified order/label spoofing, and verify that all storefront and `/admin` workflows remain 100% functional for Grandma Bonnie and her customers.

Working directory: `c:\Users\eranb\Documents\antigravity\wonderful-hertz`
Integrity mode: `development`

## Requirements

### R1. Supabase PostgreSQL Row-Level Security (RLS) & PostgREST Lockdown (`rls_disabled_in_public`)
- Enable PostgreSQL Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` where appropriate) on **every** table in the `public` schema of the live Supabase database (`fvhjotdrsqlgitlkouwz`), including `"Product"`, `"Order"`, `"StoreSettings"`, `"_prisma_migrations"`, and any studio/metrics tables.
- Revoke direct `anon` and `authenticated` PostgREST table/sequence privileges on sensitive tables (`"StoreSettings"`, `"Order"`, `"_prisma_migrations"`, and write privileges on `"Product"`) and define explicit restrictive RLS policies so that any external actor using the public project URL (`https://fvhjotdrsqlgitlkouwz.supabase.co/rest/v1/...`) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` cannot read, insert, update, or delete any rows in `"StoreSettings"`, `"Order"`, or `"_prisma_migrations"`, nor insert/update/delete rows in `"Product"`.
- Ensure server-side Prisma queries (`DATABASE_URL`) continue to read and write all tables with zero regressions.
- Persist the RLS migration SQL in `prisma/migrations/` (and/or a repeatable security hardening script in `scripts/`) so it is documented and reproducible.

### R2. Full API Route Authentication, Admin Session Propagation & Anti-Spoofing Hardening
- Audit every Next.js API route in `src/app/api/**` and enforce strict authentication (`x-admin-pin` verified via constant-time comparison against the configured admin password) on all administrative reads and mutations:
  - `GET /api/orders`, `PATCH /api/orders`, `DELETE /api/orders`, and `POST /api/orders/label` (must require valid `x-admin-pin` so external actors cannot list customer PII, delete orders, or trigger paid Shippo USPS label purchases).
  - `POST /api/products`, `PUT /api/products/[id]`, `PATCH /api/products/[id]`, and `DELETE /api/products/[id]` (must require valid `x-admin-pin` so unauthorized actors cannot create, modify prices, hide, or delete store products).
  - `POST /api/upload` and `POST /api/upload/analyze` (must require valid `x-admin-pin` so external bots cannot abuse Supabase Storage or Gemini Vision API credits).
  - `GET /api/settings?admin=true`, `POST /api/settings`, `PUT /api/settings`, `/api/settings/test-stripe`, and `/api/settings/test-shippo` (must require valid `x-admin-pin`).
  - `/api/studio/autopilot` and `/api/studio/metrics` mutations (must require valid `x-admin-pin` or studio auth).
- Update all frontend admin callers (`src/app/admin/page.tsx`, `src/app/admin/components/AutoMagicProductUploader.tsx`, `src/app/admin/utils/autoMagicPipeline.ts`, and `/studio`) so that the unlocked `adminPin` is consistently sent in the `x-admin-pin` header on every product upload, AI analyze, product create/edit/delete, and order management/label request—ensuring Bonnie's 1-click workflows continue to work effortlessly once unlocked.
- Harden `PATCH /api/checkout` so an order is only marked `paid` (and only triggers automatic shipping label logic) after verifying the `sessionId` directly with the Stripe API (`stripe.checkout.sessions.retrieve(sessionId)`) and confirming `payment_status === 'paid'`.

### R3. Secret Exposure Audit, Storage Bucket Policies & HTTP Security Headers
- Audit all client-side code, `next.config.mjs`, and environment usage to ensure zero secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `SHIPPO_API_KEY`, `GEMINI_API_KEY`, `ADMIN_PASSWORD`) or private return address fields (`returnStreet`, `returnCity`, `returnState`, `returnZip`) are ever exposed in client bundles or public API responses (`GET /api/settings` without `x-admin-pin`).
- Audit Supabase Storage (`products` bucket) RLS policies so public users can only `SELECT` (view) product images via public URLs, while `INSERT`/`UPDATE`/`DELETE` require the server-side service role or authenticated admin route.
- Add standard defensive HTTP security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`) in `next.config.mjs`.

## Acceptance Criteria

### Gate A: Supabase PostgREST & RLS Penetration Test (`rls_disabled_in_public` Resolved)
- [ ] Querying `pg_tables` / `pg_class` on the live Supabase database confirms `rowsecurity = true` (`relrowsecurity = true`) for **100% of tables** in the `public` schema (`Product`, `Order`, `StoreSettings`, `_prisma_migrations`, and any other public tables).
- [ ] Simulated attacker requests using `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` against PostgREST (`/rest/v1/StoreSettings`, `/rest/v1/Order`, `/rest/v1/_prisma_migrations`) for `GET`, `POST`, `PATCH`, and `DELETE` are completely blocked (returning `401`/`403` or `0` rows with zero leaked secrets or customer PII).
- [ ] Simulated attacker `POST`, `PATCH`, and `DELETE` requests using `NEXT_PUBLIC_SUPABASE_ANON_KEY` against `/rest/v1/Product` are blocked (`401`/`403` or `0` rows affected).

### Gate B: Unauthenticated API Attack Suite (100% Blocked)
- [ ] Simulated unauthenticated attacker requests (missing or wrong `x-admin-pin`) to:
  - `GET /api/orders`, `PATCH /api/orders`, `DELETE /api/orders`
  - `POST /api/orders/label`
  - `POST /api/products`, `PUT /api/products/[id]`, `DELETE /api/products/[id]`
  - `POST /api/upload`, `POST /api/upload/analyze`
  - `POST /api/settings`, `GET /api/settings?admin=true`
  all return HTTP `401 Unauthorized` without executing any mutation or leaking any data.
- [ ] Simulated spoofed `PATCH /api/checkout` with a fake `sessionId` is rejected (`400`/`401`) and does not mark any order `paid`.
- [ ] `GET /api/settings` (public) returns HTTP `200` with `stripeSecretKey === undefined`, `shippoApiKey === undefined`, `geminiApiKey === undefined`, `adminPin === undefined`, and `returnStreet === undefined`.

### Gate C: End-to-End Storefront, Admin & Build Regression Verification
- [ ] Public storefront (`GET /`, `GET /api/products`, `GET /api/settings`, `POST /api/checkout`) works 100% normally for customers.
- [ ] Authenticated admin operations (with valid `x-admin-pin` header: `GET /api/orders`, `GET /api/settings?admin=true`, `POST /api/upload`, `POST /api/upload/analyze`, `POST /api/products`, `PUT /api/products/[id]`, `DELETE /api/products/[id]`) succeed with HTTP `200`.
- [ ] `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass with exit code `0`.
