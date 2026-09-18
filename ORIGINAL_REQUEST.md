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

