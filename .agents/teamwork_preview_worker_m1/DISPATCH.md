## 2026-09-18T13:39:32Z
You are Worker M1 responsible for Milestone 1: Fixing the Next.js Server Component production crash.

Authoritative Request:
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\ORIGINAL_REQUEST.md
PROJECT Specification:
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_orchestrator_1\PROJECT.md
Explorer 1 Handoff & Analysis:
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_1\handoff.md
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_1\analysis.md

Working directory:
c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m1
Project root:
c:\Users\eranb\Documents\antigravity\wonderful-hertz

Write Ownership:
You have exclusive write ownership of:
- `prisma/schema.prisma`
- `src/lib/prisma.ts`
- `src/app/page.tsx`
- `src/app/products/[id]/page.tsx`
- `src/app/api/products/route.ts`
- `src/app/api/products/[id]/route.ts`
- `netlify.toml`

Tasks:
1. Update `prisma/schema.prisma` to set:
   `binaryTargets = ["native", "rhel-openssl-3.0.x", "debian-openssl-3.0.x"]`
2. Run `npx prisma generate` to download the Linux query engine binary `libquery_engine-rhel-openssl-3.0.x.so.node` and verify it exists in `node_modules/.prisma/client`.
3. Create `src/lib/prisma.ts` with the standard Next.js singleton pattern.
4. Refactor `src/app/page.tsx`, `src/app/products/[id]/page.tsx`, and `src/app/api/products/route.ts` and `src/app/api/products/[id]/route.ts` to import `prisma` from `@/lib/prisma`. Add try/catch and graceful fallback handling in `src/app/page.tsx` and `src/app/products/[id]/page.tsx`.
5. Create root `netlify.toml` configured with `@netlify/plugin-nextjs`, `publish = ".next"`, and `PRISMA_GENERATE_DATAPROXY = "false"`.
6. Run `npm run build` and verify that the build compiles cleanly with exit code 0.
7. Deploy to Netlify via `npx netlify deploy --prod` and test live URL `https://bonnies-boutique-storefront.netlify.app/` with curl, verifying that HTTP 200 is returned with rendered products and NO error digest or "Server Components render" crash.
8. Document all modified files, commands executed, and verification output in `c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m1\handoff.md`.
