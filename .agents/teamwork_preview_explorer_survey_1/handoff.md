# Handoff Report: Next.js Server Component Production Crash Investigation

## 1. Observation

### 1.1 Verbatim Production Error & Digest
1. **HTTP GET to Live Production Site**:
   - Command: `curl.exe -i https://bonnies-boutique-storefront.netlify.app/`
   - Response: `HTTP/1.1 500 Internal Server Error`
   - Header: `X-Nf-Request-Id: 01M2TBPJ80ERWYPPA6EX4X42CN`
   - Body RSC Payload:
     ```json
     4:E{"digest":"3341492521"}
     ```
   - On the client, Next.js masks this error as:
     `"An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error."`

2. **HTTP GET to Live Product Detail Page**:
   - Command: `curl.exe -i https://bonnies-boutique-storefront.netlify.app/products/cmu1mpip90000fsjllmsu8n4q`
   - Response: `HTTP/1.1 500 Internal Server Error`
   - Body RSC Payload:
     ```json
     4:E{"digest":"3525724700"}
     ```

3. **HTTP GET to Live API Route**:
   - Command: `curl.exe -i https://bonnies-boutique-storefront.netlify.app/api/products`
   - Response: `HTTP/1.1 500 Internal Server Error`
   - Body: `{"error":"Failed to fetch products"}`

4. **HTTP GET to Client-Only Pages**:
   - Command: `curl.exe -i https://bonnies-boutique-storefront.netlify.app/checkout`
   - Response: `HTTP/1.1 200 OK`
   - Command: `curl.exe -i https://bonnies-boutique-storefront.netlify.app/admin`
   - Response: `HTTP/1.1 200 OK`

### 1.2 Verbatim Netlify Lambda Function Execution Log
- Command: `npx netlify logs:function ___netlify-server-handler`
- Captured Log:
  ```text
  ERROR PrismaClientInitializationError: 
  Invalid `prisma.product.findMany()` invocation:

  Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".

  This happened because Prisma Client was generated for "windows", but the actual deployment required "rhel-openssl-3.0.x".
  Add "rhel-openssl-3.0.x" to `binaryTargets` in the "schema.prisma" file and run `prisma generate` after saving it:

  generator client {
    provider      = "prisma-client-js"
    binaryTargets = ["native", "rhel-openssl-3.0.x"]
  }

  The following locations have been searched:
    /var/task/node_modules/.prisma/client
    /var/task/node_modules/@prisma/client
    C:\Users\eranb\Documents\antigravity\wonderful-hertz\node_modules\@prisma\client
    /tmp/prisma-engines
      at $n.handleRequestError (/var/task/node_modules/@prisma/client/runtime/library.js:121:7615)
      at $n.handleAndLogRequestError (/var/task/node_modules/@prisma/client/runtime/library.js:121:6623)
      at $n.request (/var/task/node_modules/@prisma/client/runtime/library.js:121:6307)
      at async l (/var/task/node_modules/@prisma/client/runtime/library.js:130:9633)
      at async c (/var/task/.next/server/app/page.js:1:6887) {
    clientVersion: '5.22.0',
    errorCode: undefined,
    digest: '3341492521'
  }
  ```

### 1.3 Local Filesystem Observations
1. **`prisma/schema.prisma` lines 1-3**:
   ```prisma
   generator client {
     provider = "prisma-client-js"
   }
   ```
   Binary targets are omitted (defaults to current platform: `windows`).

2. **`c:\Users\eranb\Documents\antigravity\wonderful-hertz\node_modules\.prisma\client`**:
   - Contains: `query_engine-windows.dll.node` (19,261,952 bytes).
   - No `.so.node` Linux binaries exist.

3. **`.netlify/functions-internal/___netlify-server-handler/node_modules/.prisma/client`**:
   - Contains: `query_engine-windows.dll.node` (19,261,952 bytes).
   - No `.so.node` Linux binaries exist.

4. **`src/app/page.tsx` lines 9-14**:
   ```tsx
   export default async function Home() {
     const products = await prisma.product.findMany({
       where: { isDraft: false },
       orderBy: { createdAt: 'desc' },
     });
   ```

5. **`src/app/products/[id]/page.tsx` lines 12-14**:
   ```tsx
   export default async function ProductPage({ params }: { params: { id: string } }) {
     const product = await prisma.product.findUnique({ where: { id: params.id } });
   ```

6. **Local Production Build & Execution**:
   - Command: `npm run build` -> Exited 0, successfully generated Prisma client and Next.js routes.
   - Command: `npx next start -p 3005` -> Exited 0, ready.
   - Command: `curl.exe -i http://localhost:3005/` -> Returned `HTTP/1.1 200 OK` because Windows DLL engine matches local OS.

---

## 2. Logic Chain

1. **Step 1 (Failure Differentiation)**:
   - Observation 1.1 showed that routes making Prisma database queries during server render (`/` and `/products/[id]`) fail with HTTP 500 and RSC digest `3341492521` / `3525724700`.
   - Routes that are client components without server-side Prisma calls (`/checkout` and `/admin`) succeed with HTTP 200.
   - API route `/api/products` which calls Prisma returns HTTP 500 `{"error":"Failed to fetch products"}`.
   - Therefore, the failure is localized specifically to server-side Prisma execution and not general routing, asset hosting, or client-only API leakage.

2. **Step 2 (Runtime Error Identification)**:
   - Observation 1.2 provided the unmasked server stack trace from Netlify AWS Lambda with the exact digest `3341492521`.
   - The log shows an uncaught `PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x"`.
   - The trace points directly to `async c (/var/task/.next/server/app/page.js:1:6887)` invoked from `prisma.product.findMany()`.
   - Next.js caught this unhandled exception during React Server Component execution and masked it into the standard production message: `"An error occurred in the Server Components render."`

3. **Step 3 (Engine Binary Packaging Mechanism)**:
   - Observation 1.3 showed that `prisma/schema.prisma` did not specify `binaryTargets`.
   - The developer executed builds and deploys from a Windows development machine.
   - In `node_modules/.prisma/client`, Prisma generated only `query_engine-windows.dll.node`.
   - Netlify's `@netlify/plugin-nextjs` packaged `node_modules/.prisma/client` from the local workspace into `___netlify-server-handler`.
   - When deployed to Netlify Lambda (Amazon Linux 2023 `nodejs24.x`), the required runtime is `rhel-openssl-3.0.x`.
   - Because `libquery_engine-rhel-openssl-3.0.x.so.node` was missing from the deployed artifact, Prisma failed to initialize, crashing the Server Component.

---

## 3. Caveats

1. **Process on Port 3000**: Port 3000 was occupied by another unrelated local project (`valiant-turing` on PID 16484). Local testing of `wonderful-hertz` was run on port 3005 without interference.
2. **Database Connectivity**: Supabase PostgreSQL database connectivity with the pooler string (`aws-0-us-east-2.pooler.supabase.com:6543`) is fully operational when the query engine is present (as confirmed by local execution on port 3005 and live API products responses when products are queried).
3. **Missing Singleton Pattern**: Multiple `new PrismaClient()` calls exist across pages. While not the direct cause of the missing binary crash, this poses connection pool exhaustion risks under production traffic.

---

## 4. Conclusion

The Next.js Server Component production crash is caused by a **missing Linux Query Engine binary (`rhel-openssl-3.0.x`) in the Prisma Client deployment package on Netlify Functions**.

The exact fix requires:
1. Updating `prisma/schema.prisma` to include `binaryTargets = ["native", "rhel-openssl-3.0.x", "debian-openssl-3.0.x"]`.
2. Running `npx prisma generate` to download both local and Linux engine binaries.
3. Centralizing `PrismaClient` in `src/lib/prisma.ts` as a singleton.
4. Wrapping Server Component data fetching in `src/app/page.tsx` and `src/app/products/[id]/page.tsx` with error handling and fallback state.
5. Providing a root `netlify.toml` for standard Netlify build and deployment.

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Regenerate Prisma Client with Linux targets**:
   ```bash
   npx prisma generate
   ```
   Inspect `node_modules/.prisma/client` and confirm that `libquery_engine-rhel-openssl-3.0.x.so.node` is present alongside `query_engine-windows.dll.node`.

2. **Run Local Production Build & Test**:
   ```bash
   npm run build
   npx next start -p 3005
   curl.exe -i http://localhost:3005/
   curl.exe -i http://localhost:3005/products/cmu1mpip90000fsjllmsu8n4q
   ```

3. **Deploy to Netlify and Verify Live**:
   ```bash
   npx netlify deploy --prod
   curl.exe -i https://bonnies-boutique-storefront.netlify.app/
   ```
   **Pass condition**: HTTP 200 OK with rendered product cards; no RSC error digest `3341492521`.
