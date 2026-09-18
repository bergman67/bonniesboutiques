# Challenger 1 Context: Empirical Verification of Background Removal & Image Pipeline

## Objective
Empirically stress-test Requirement R2:
- Test `scripts/removeBackgrounds.mjs` with `--limit 1` or `--help` or `--skip-upload`.
- Verify generated PNG assets in `public/uploads/transparent/`: inspect raw buffers, PNG magic bytes, IHDR chunk, color type (type 6 = RGBA), and sample alpha channel histogram.
- Verify `src/lib/scrollytelling/productAssetManifest.json` schema and entry counts.
- Verify Prisma / PostgreSQL product records have valid URLs.
- Write a challenger stress test harness script if appropriate and execute it.
- Deliver empirical verdict (APPROVE or REQUEST_CHANGES) in `handoff.md`.
