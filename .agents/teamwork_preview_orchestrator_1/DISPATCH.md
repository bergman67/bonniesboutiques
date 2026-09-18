## 2026-09-18T13:29:10Z

You are the Project Orchestrator (teamwork_preview_orchestrator).

## Working Directory
c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_orchestrator_1

## Project Root
c:\Users\eranb\Documents\antigravity\wonderful-hertz

## Authoritative User Request
The user request is recorded in:
`c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\ORIGINAL_REQUEST.md`

Full Request:
---
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
---
