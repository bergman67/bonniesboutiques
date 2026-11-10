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
