## 2026-09-18T16:08:37Z
You are Worker 2 (Background Removal & Image Pipeline Implementer).
Your working directory is C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m2

Read ORIGINAL_REQUEST.md at:
C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\ORIGINAL_REQUEST.md

Read Explorer 2 findings at:
C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_2\handoff.md
C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_2\analysis.md

Read PROJECT.md at:
C:\Users\eranb\Documents\antigravity\wonderful-hertz\PROJECT.md

Exclusive Write Ownership:
You own:
- scripts/removeBackgrounds.mjs
- package.json (for dependencies / npm scripts)
- public/uploads/transparent/
- src/lib/scrollytelling/productAssetManifest.json
- scripts/verify-background-removal.mjs

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Install `@imgly/background-removal-node` using `npm install @imgly/background-removal-node`.
2. Add npm script `"remove-bg": "node scripts/removeBackgrounds.mjs"` to `package.json`.
3. Implement `scripts/removeBackgrounds.mjs`:
   - It must read source photos from `public/uploads/` (with fallback to fetch from Supabase if needed).
   - Use `@imgly/background-removal-node` (specifically `removeBackground`) to strip the background from the product photos.
   - Save the processed images as transparent PNGs into `public/uploads/transparent/`.
   - If Supabase Storage credentials are present and operational, upload the transparent assets to Supabase Storage or ensure local access in public directory.
   - Update `Product.imageUrl` in Prisma / PostgreSQL to point to these new transparent assets, and/or generate `src/lib/scrollytelling/productAssetManifest.json` mapping each product id/filename to its transparent asset URL/path.
   - Support a `--limit <n>` CLI argument for targeted runs, as well as full processing.
   - Include clear logging and error handling.
4. Run `scripts/removeBackgrounds.mjs` to generate transparent PNGs. Ensure products have transparent PNGs created.
5. Create `scripts/verify-background-removal.mjs` to verify:
   - `scripts/removeBackgrounds.mjs` exists.
   - Transparent PNG files exist in `public/uploads/transparent/` and have valid PNG headers with alpha channel (RGBA/transparent pixels).
   - Database and/or `productAssetManifest.json` properly reference the transparent assets.
6. Run `npm run lint` and `node scripts/verify-background-removal.mjs` to confirm all checks pass.
7. Write your handoff report to C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m2\handoff.md and notify your parent via send_message.
