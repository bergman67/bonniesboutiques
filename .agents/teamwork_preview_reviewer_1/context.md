# Reviewer 1 Context: Reviewing M1 (About Section) & M2 (Background Removal Pipeline)

## Scope
1. Review Milestone 1:
   - `src/app/page.tsx` (#about section)
   - `src/components/scrollytelling/ScrollytellingExperience.tsx`
   - `src/components/scrollytelling/ProductHUD.tsx`
   - `src/components/scrollytelling/PixelStorefrontLayer.tsx`
   - Verify no "16-bit" in copy, verify "generational crafting", "Bonnie & Tammy", "animations" are properly featured.
   - Run `node scripts/verify-about-section.mjs`
2. Review Milestone 2:
   - `scripts/removeBackgrounds.mjs`
   - `package.json`
   - `public/uploads/transparent/`
   - `src/lib/scrollytelling/productAssetManifest.json`
   - Verify `@imgly/background-removal-node` usage, transparency RGBA generation, CLI flags, caching, Supabase & DB sync.
   - Run `node scripts/verify-background-removal.mjs`
3. Run `npm run lint`.
4. Provide structured verdict (APPROVE or REQUEST_CHANGES) in `handoff.md`.
