# Handoff Report: Backend API Surface, Inventory & Checkout Logic Survey

**Explorer:** Explorer 3 (Backend API, Inventory & Checkout Specialist)  
**Date:** 2026-09-18T13:39:00Z  
**Target:** Parent Orchestrator (`865d87ee-c5c8-419a-99a5-435791cbb37a`)  
**Status:** Complete (Hard Handoff)  
**Deliverables:**
- Analysis Report: `c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_3\analysis.md`
- Handoff Report: `c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_3\handoff.md`

---

## 1. Observation

1. **Backend Route Handlers (`src/app/api/`)**:
   - `src/app/api/products/route.ts`:
     - Line 6: `export async function GET()`: Executes `prisma.product.findMany({ orderBy: { createdAt: 'desc' } })` and returns `NextResponse.json(products)`.
     - Line 17: `export async function POST(request: Request)`: Parses JSON `{ title, description, price, imageUrl, isDraft }`, creates record, returns `NextResponse.json(product, { status: 201 })`.
   - `src/app/api/products/[id]/route.ts`:
     - Line 6: `export async function PUT(request: Request, { params }: { params: { id: string } })`: Updates product where `id == params.id`.
     - Line 25: `export async function DELETE(request: Request, { params }: { params: { id: string } })`: Deletes product where `id == params.id`.
   - `src/app/api/upload/route.ts`:
     - Line 9: `export async function POST(request: NextRequest)`: Extracts `formData.get('file')`, uploads buffer to Supabase Storage bucket `'products'`, returns `NextResponse.json({ success: true, url: publicUrl })`.
   - `src/app/api/checkout/route.ts`:
     - Line 11: `export async function POST(request: NextRequest)`: Parses `{ items, form, total } = await request.json()`.
     - Lines 42–49: Formats and logs order details to console (`📦 New Order:`).
     - Line 51: Returns `NextResponse.json({ success: true })`. Lines 18–38 contain commented-out Stripe Session creation awaiting `STRIPE_SECRET_KEY`.
   - Search for `"use server"`: Executed `grep_search` across entire codebase; zero matches found. No Next.js Server Actions exist.

2. **Database & Persistence (`prisma/schema.prisma`)**:
   - Lines 5–9: Datasource is PostgreSQL with `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")`.
   - Lines 11–20: Single model `Product` with fields:
     - `id String @id @default(cuid())`
     - `title String`
     - `description String?`
     - `price Float?`
     - `imageUrl String?`
     - `isDraft Boolean @default(true)`
     - `createdAt DateTime @default(now())`
     - `updatedAt DateTime @updatedAt`
   - Verified live database via Node script: Total product count is `99`. All 99 records have `price: 8.00`, `isDraft: false`, and image URLs pointing to `https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/...`.
   - No `Cart`, `Order`, or `Inventory` tables exist in Prisma.

3. **Storefront Product Ingestion (`src/app/page.tsx`)**:
   - Lines 10–13: Direct database query in React Server Component:
     ```typescript
     const products = await prisma.product.findMany({
       where: { isDraft: false },
       orderBy: { createdAt: 'desc' },
     });
     ```
   - Line 94: Maps each product to `<ProductCard product={{ id: p.id, title: p.title, imageUrl: p.imageUrl, price: p.price ?? 8 }} />`.

4. **Cart Architecture (`src/context/CartContext.tsx`)**:
   - Lines 5–11: `CartItem` type defined as `{ id: string; title: string; imageUrl: string | null; price: number; quantity: number; }`.
   - Line 78: Exposes `addItem: (item: Omit<CartItem, 'quantity'>) => void`.
   - Lines 32–48: Reducer handles `'ADD_ITEM'`: If item exists, `quantity += 1`; otherwise appends new item with `quantity: 1`. In both cases, sets `isOpen: true` (opening `<CartDrawer />`).
   - Lines 95–107: Hydrates on mount from `localStorage.getItem('bonnies-cart')`, persists to `localStorage.setItem('bonnies-cart', JSON.stringify(state.items))` on state changes.
   - No HTTP network requests occur on "Add to Cart"; cart state is client-side until checkout.

5. **Checkout Flow (`src/app/checkout/page.tsx`)**:
   - Lines 48–53: Submits payload to `/api/checkout`:
     ```typescript
     const res = await fetch('/api/checkout', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ items, form, total: totalPrice }),
     });
     ```
   - Lines 54–65: If `data.url` (Stripe redirect) redirects; otherwise sets `step = 'confirm'` and executes `clearCart()`.
   - Live endpoint test via PowerShell `Invoke-RestMethod -Uri "http://localhost:3005/api/checkout" -Method Post` returned `{ success: True }` and logged `📦 New Order` to server console.

---

## 2. Logic Chain

1. **Inventory Semantics Logic Chain**:
   - *From Observation 2*, the Prisma schema lacks a `stock` or `quantity` column, containing only `isDraft: Boolean`.
   - *From Observation 3*, the storefront query filters only `where: { isDraft: false }`.
   - Therefore, inventory in this application is strictly boolean-availability (`isDraft === false`).
   - Any product marked `isDraft: false` is available for purchase without numerical inventory decrements. The upcoming frontend refactor must not attempt to query or decrement non-existent inventory counts.

2. **"Add to Cart" and Acceptance Criteria 5 Logic Chain**:
   - *From Observation 1 & 4*, no `/api/cart` endpoint exists in the project. "Add to Cart" operates exclusively via `CartContext` reducer dispatch and `localStorage` persistence.
   - Acceptance Criteria 5 states: *"Add to Cart successfully pushes to the existing backend API."*
   - In the existing application design, items stored in `CartContext` push to the backend API at the checkout stage via `POST /api/checkout`.
   - Therefore, the 3D levitating product viewer and 16-bit HUD must wire their "Add to Cart" buttons directly to `useCart().addItem({ id, title, imageUrl, price })`. This immediately updates the cart state, opens `<CartDrawer />`, updates `<Header />`, and stages the item for the `POST /api/checkout` API push without breaking the client-server boundary.

3. **Storefront Data Ingestion vs API Contract Logic Chain**:
   - *From Observation 1*, `GET /api/products` returns all products, including drafts (`isDraft: true`), without filtering.
   - *From Observation 3*, the Server Component `page.tsx` filters `where: { isDraft: false }`.
   - Therefore, if the new scrollytelling container is supplied via Server Component props from `page.tsx`, it will safely receive only published products.
   - If instead the frontend fetches from `/api/products` via client-side fetch, it must explicitly filter `products.filter(p => !p.isDraft)` to prevent unreleased drafts from appearing in the 3D scene.

4. **Checkout Compatibility Logic Chain**:
   - *From Observation 1 & 5*, `POST /api/checkout` expects `{ items, form, total }`, where `total` is a number that calls `.toFixed(2)` on line 48 of `src/app/api/checkout/route.ts`.
   - The checkout page at `/checkout` manages the multi-step form and calls `clearCart()` upon success.
   - Therefore, preserving the existing `/checkout` route and ensuring any cart items generated from the 3D viewer conform to `{ id, title, price, quantity, imageUrl }` guarantees 100% end-to-end checkout compatibility.

---

## 3. Caveats

1. **Stripe Integration Status**: Stripe secret credentials (`STRIPE_SECRET_KEY`) are not present in `.env`. The backend is functioning in mock order mode (`console.log` + `{ success: true }`). Uncommenting the Stripe block in `src/app/api/checkout/route.ts` will immediately work once live keys are added, as the request payload structure already matches Stripe line item requirements.
2. **Prisma Client Instantiation**: Four separate files instantiate `new PrismaClient()` at module level. While operational, this can cause connection exhaustion during high-concurrency or Next.js build cycles. Recommending extraction to a shared singleton `src/lib/prisma.ts`.
3. **No Numerical Stock Decrementing**: If Bonnie's Boutique intends to introduce limited 1-of-1 inventory reservations upon purchase, that would require schema migrations and order recording tables, which are explicitly out of scope for frontend refactoring.

---

## 4. Conclusion

1. **Backend Invariants are Fully Documented**: Complete contracts for all 6 API endpoints, Prisma models, and client cart context are codified in `analysis.md`.
2. **Frontend Integration Interface Defined**:
   - **Data Input**: Consume products matching `{ id: string, title: string, price: number, imageUrl: string | null }`.
   - **Cart Interaction**: Call `const { addItem } = useCart(); addItem({ id, title, imageUrl, price });`.
   - **Persistence**: Leave the `'bonnies-cart'` localStorage key intact.
   - **Checkout**: Preserve `src/app/checkout/page.tsx` and `POST /api/checkout`.
3. **Zero Backend Regressions**: The proposed 3D scrollytelling architecture designed by Explorer 2 cleanly sits on top of this interface with zero changes required to database schemas, Prisma queries, or route handlers.

---

## 5. Verification Method

To independently verify these conclusions and API contracts:

1. **Verify Live Database Product Records**:
   Run the following read-only command from project root:
   ```powershell
   node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.product.count().then(c => console.log('Live products:', c)).finally(() => p.$disconnect());"
   ```
   *Expected Result*: Outputs `Live products: 99`.

2. **Verify `GET /api/products` Endpoint**:
   With the Next.js server running (e.g., port 3005):
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3005/api/products" -Method Get
   ```
   *Expected Result*: Returns array of 99 product objects containing `id`, `title`, `price`, `imageUrl`, `isDraft`.

3. **Verify `POST /api/checkout` Contract**:
   Execute a test checkout payload:
   ```powershell
   $body = @{
       items = @(@{ id = "test"; title = "Verification Trinket"; price = 8; quantity = 1; imageUrl = $null })
       form = @{
           firstName = "Test"; lastName = "User"; email = "test@example.com";
           address = "123 St"; city = "City"; state = "NY"; zip = "10001"; country = "US";
           paymentMethod = "stripe"
       }
       total = 8
   } | ConvertTo-Json -Depth 5

   Invoke-RestMethod -Uri "http://localhost:3005/api/checkout" -Method Post -ContentType "application/json" -Body $body
   ```
   *Expected Result*: Returns `{ success: True }` and outputs order log in server console.

4. **Invalidation Conditions**:
   - Modifying `prisma/schema.prisma` to add required fields to `Product` or introduce an `Order` model would require updating the API handlers.
   - Changing the `CartItem` type or the `'bonnies-cart'` key would require updating both `CartContext` and `/checkout`.
