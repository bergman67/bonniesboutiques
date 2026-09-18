# Worker 2 Context: Milestone 2 (Background Removal Script & Transparent Assets)

## Objective
Implement Requirement R2:
1. Install `@imgly/background-removal-node` (e.g. `npm install @imgly/background-removal-node`).
2. Write a robust backend script `scripts/removeBackgrounds.mjs` that:
   - Reads the product photos (from `public/uploads/` where 99 JPEGs live, with fallback to fetch from Supabase `products` bucket if needed).
   - Runs background removal using `@imgly/background-removal-node` to cleanly segment each product (keychain/trinket) from the dark-grey glitter cardstock background.
   - Saves processed transparent PNGs locally to `public/uploads/transparent/<image_name>.png`.
   - Optionally uploads transparent PNGs to Supabase storage bucket `products/transparent/` if credentials are valid/writable.
   - Updates `Product.imageUrl` in Prisma / PostgreSQL to point to the transparent assets (or creates/updates `src/lib/scrollytelling/productAssetManifest.json` and updates the DB).
   - Includes progress logging, batching/concurrency control (e.g. 2 at a time), error handling, and a test/sample mode (`--limit <n>`) as well as full run mode.
   - Add npm script `"remove-bg": "node scripts/removeBackgrounds.mjs"` to `package.json`.
3. Process at least a substantial representative set of products (or all 99 products) to ensure transparent PNG assets are generated and available for Milestone 3 (3D viewer).
4. Verify that generated transparent PNGs have alpha channels (32-bit RGBA) with transparent pixels around the cutout.
5. Create a verification script `scripts/verify-background-removal.mjs` verifying that the script exists, transparent PNGs are generated with valid alpha channels, and manifest/DB are updated.
6. Run lint and verification checks, document all in `handoff.md`.
