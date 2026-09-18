# Backend API Surface, Inventory, and Cart Checkout Logic Survey

**Explorer:** Explorer 3 (Backend API, Inventory & Checkout Specialist)  
**Date:** 2026-09-18T13:38:00Z  
**Target:** Parent Orchestrator (`865d87ee-c5c8-419a-99a5-435791cbb37a`)  
**Project Root:** `c:\Users\eranb\Documents\antigravity\wonderful-hertz`

---

## 1. Executive Summary

This report delivers a complete analysis of the existing backend architecture, data models, API endpoints, inventory mechanics, cart state management, and checkout pipelines for **Bonnie's Boutique**. 

Key findings:
1. **No Next.js Server Actions or Custom Express/Node backends exist**: All backend logic is housed within Next.js App Router Route Handlers (`src/app/api/*`) and direct Prisma Client queries within App Router React Server Components (`src/app/page.tsx`, `src/app/products/[id]/page.tsx`).
2. **Database & Persistence**: PostgreSQL hosted on Supabase, queried via Prisma Client v5.22.0. The schema defines a single model: `Product`. There are currently **99 active products** in the live database, all published (`isDraft: false`) with price `$8.00` and image assets hosted on Supabase Cloud Storage (`fvhjotdrsqlgitlkouwz.supabase.co`).
3. **Inventory Management**: Inventory is **implicit**. There is no discrete `stock` or `quantity` column in the database. Product availability is controlled entirely through the `isDraft` boolean flag (`isDraft: false` indicates published and ready for purchase).
4. **Cart Architecture**: Cart state is managed entirely on the client via React Context (`CartContext.tsx`) and synchronized to `window.localStorage` under the key `'bonnies-cart'`. No dedicated `/api/cart` endpoint exists.
5. **Checkout Pipeline**: Submitting the checkout form calls `POST /api/checkout` with `{ items, form, total }`. The backend logs the order and responds with `{ success: true }` (mock mode, as Stripe live integration is commented out pending `STRIPE_SECRET_KEY`).
6. **Strict Refactor Invariants**: To maintain 100% compatibility, the upcoming 3D/16-bit scrollytelling frontend must consume product objects with the exact existing shape, invoke `CartContext.addItem()` with `{ id, title, imageUrl, price }`, preserve the `'bonnies-cart'` localStorage key, and ensure the `/checkout` page and `POST /api/checkout` payloads remain intact.

---

## 2. Complete Backend Architecture & Data Store Inventory

### 2.1 Database & ORM
- **Database Engine**: PostgreSQL 15+ hosted on Supabase (connection pooled via AWS us-east-2 port 6543, direct connection port 5432).
- **ORM**: Prisma Client v5.22.0 (`@prisma/client` and `prisma` CLI).
- **Prisma Schema Location**: `prisma/schema.prisma`.

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Product {
  id          String   @id @default(cuid())
  title       String
  description String?
  price       Float?
  imageUrl    String?
  isDraft     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 2.2 Model Attribute Specifications
| Field | Type | Modifiers | Description & Behavior |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Unique CUID string (e.g., `cmu1mpip90000fsjllmsu8n4q`). Used as key across all API endpoints, cart items, and route parameters. |
| `title` | `String` | Required | Product display name (e.g., `Trinket #1`). |
| `description` | `String?` | Nullable | Product copy text. If null, UI falls back to default boutique copy. |
| `price` | `Float?` | Nullable | Unit price in USD (e.g., `8.0`). If null or undefined, frontend defaults to `$8.00` (`product.price ?? 8`). |
| `imageUrl` | `String?` | Nullable | Full HTTPS URL pointing to Supabase Storage bucket (`products`) or relative upload path (`/uploads/...`). If null, UI renders fallback emoji 🔑. |
| `isDraft` | `Boolean` | `@default(true)` | Availability flag. `false` = published on storefront; `true` = draft / hidden from public storefront. |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp. Storefront orders by `createdAt: 'desc'`. |
| `updatedAt` | `DateTime` | `@updatedAt` | Last modification timestamp. |

### 2.3 Live Database Inspection Results
Direct inspection of the live PostgreSQL database via Prisma confirmed:
- **Total Record Count**: `99` products.
- **Published Products (`isDraft: false`)**: `99` products.
- **Draft Products (`isDraft: true`)**: `0` products.
- **Uniform Pricing**: All 99 records have `price: 8.00`.
- **Image URLs**: All 99 records reference public Supabase Storage CDN URLs in the format:
  `https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/<timestamp>-<id>-IMG_<num>.JPEG`.

### 2.4 Cloud Storage (Supabase Storage)
- **Bucket**: `products` (public bucket).
- **Public URL Pattern**: `https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/${filename}`.
- **Upload Route**: Handled server-side in `src/app/api/upload/route.ts` via `@supabase/supabase-js` using `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. Comprehensive API Contract Catalog

All existing endpoints reside in `src/app/api/`. Below is the complete contract specification for every endpoint in the repository.

```
                  ┌───────────────────────┐
                  │   Next.js API Surface │
                  └──────────┬────────────┘
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
 ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
 │ /api/products │   │  /api/upload  │   │ /api/checkout │
 └───────┬───────┘   └───────────────┘   └───────────────┘
         │
    ┌────┴────┐
    ▼         ▼
  [GET]     [POST]
(All items) (Create)
    │
    ▼
 [/api/products/[id]]
  ├─ [PUT]    (Update)
  └─ [DELETE] (Delete)
```

---

### Endpoint 1: `GET /api/products`
- **File**: `src/app/api/products/route.ts` (lines 6–15)
- **Description**: Retrieves all products from the database ordered by `createdAt: 'desc'`.
- **HTTP Method**: `GET`
- **Headers**:
  - `Accept: application/json`
- **Query Parameters**: None.
- **Request Body**: None.
- **Success Response (200 OK)**:
  - `Content-Type: application/json`
  - Body: Array of `Product` objects:
    ```json
    [
      {
        "id": "cmu1mpip90000fsjllmsu8n4q",
        "title": "Trinket #1",
        "description": "Handmade trinket from Bonnie's Boutique.",
        "price": 8,
        "imageUrl": "https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/1789413687897-1-IMG_8918.JPEG",
        "isDraft": false,
        "createdAt": "2026-09-14T19:21:28.558Z",
        "updatedAt": "2026-09-14T19:21:28.558Z"
      }
    ]
    ```
- **Error Response (500 Internal Server Error)**:
  ```json
  {
    "error": "Failed to fetch products"
  }
  ```
- **CRITICAL IMPLEMENTATION NOTE**: `GET /api/products` does **not** filter by `isDraft: false`. It returns all products, including drafts (used by `/admin`). If the new client-side scrollytelling frontend fetches from this endpoint rather than receiving Server Component props, it **must** filter `products.filter(p => !p.isDraft)`.

---

### Endpoint 2: `POST /api/products`
- **File**: `src/app/api/products/route.ts` (lines 17–33)
- **Description**: Creates a new product record. Primarily used by the Admin portal.
- **HTTP Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
- **Request Body Schema**:
  ```typescript
  {
    title: string;          // Required
    description?: string;   // Optional
    price?: number | string;// Optional (parsed with parseFloat(json.price))
    imageUrl?: string;      // Optional
    isDraft?: boolean;      // Optional (defaults to false)
  }
  ```
- **Success Response (201 Created)**:
  - `Content-Type: application/json`
  - Body: Created `Product` object.
- **Error Response (500 Internal Server Error)**:
  ```json
  {
    "error": "Failed to create product"
  }
  ```

---

### Endpoint 3: `PUT /api/products/[id]`
- **File**: `src/app/api/products/[id]/route.ts` (lines 6–23)
- **Description**: Updates an existing product identified by CUID. Used by `/admin` for editing details and toggling publish/draft status.
- **HTTP Method**: `PUT`
- **URL Parameters**:
  - `id`: `string` (CUID of the target product)
- **Headers**:
  - `Content-Type: application/json`
- **Request Body Schema**:
  ```typescript
  {
    title?: string;
    description?: string | null;
    price?: number | string | null;
    imageUrl?: string | null;
    isDraft?: boolean;
  }
  ```
- **Success Response (200 OK)**:
  - Body: Updated `Product` object.
- **Error Response (500 Internal Server Error)**:
  ```json
  {
    "error": "Failed to update product"
  }
  ```

---

### Endpoint 4: `DELETE /api/products/[id]`
- **File**: `src/app/api/products/[id]/route.ts` (lines 25–34)
- **Description**: Deletes a product by ID.
- **HTTP Method**: `DELETE`
- **URL Parameters**:
  - `id`: `string` (CUID)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```
- **Error Response (500 Internal Server Error)**:
  ```json
  {
    "error": "Failed to delete product"
  }
  ```

---

### Endpoint 5: `POST /api/upload`
- **File**: `src/app/api/upload/route.ts` (lines 9–43)
- **Description**: Receives a multipart file upload, sanitizes the filename with timestamp prefix, uploads to Supabase Storage bucket `products`, and returns the public CDN URL.
- **HTTP Method**: `POST`
- **Headers**:
  - `Content-Type: multipart/form-data`
- **Request Body**:
  - `file`: Binary file (`File` object)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "url": "https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/1789413687897-file_name.jpg"
  }
  ```
- **Error Responses**:
  - **400 Bad Request**:
    ```json
    { "success": false, "error": "No file uploaded" }
    ```
  - **500 Internal Server Error**:
    ```json
    { "success": false, "error": "Failed to upload to cloud storage" }
    ```

---

### Endpoint 6: `POST /api/checkout`
- **File**: `src/app/api/checkout/route.ts` (lines 11–52)
- **Description**: Receives cart items, customer contact & shipping details, and order total. Currently operates in mock mode (logging order details to console) while retaining ready-to-uncomment Stripe Checkout Session integration.
- **HTTP Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
- **Request Body Schema**:
  ```typescript
  type CartItem = {
    id: string;             // Product CUID
    title: string;          // Product Title
    price: number;          // Float price (e.g. 8.0)
    quantity: number;       // Integer >= 1
    imageUrl: string | null;// Storage URL or null
  };

  type CheckoutForm = {
    firstName: string;      // Customer first name
    lastName: string;       // Customer last name
    email: string;          // Customer email address
    phone?: string;         // Customer phone number (optional)
    address: string;        // Street address
    city: string;           // City
    state: string;          // State/Province
    zip: string;            // Postal code
    country: string;        // Country code (e.g., "US", "CA", "GB", "AU")
    paymentMethod: 'stripe' | 'paypal' | 'venmo';
  };

  type CheckoutPayload = {
    items: CartItem[];      // Array of items in cart
    form: CheckoutForm;     // User submission form
    total: number;          // Total price (must support total.toFixed(2))
  };
  ```
- **Backend Processing Logic**:
  1. Parses JSON body: `{ items, form, total }`.
  2. If Stripe integration is enabled (with `STRIPE_SECRET_KEY`): creates a Stripe Checkout session, maps line items with `unit_amount: Math.round(item.price * 100)`, and returns `{ url: session.url }`.
  3. Default fallback: logs formatted order to server console:
     ```javascript
     console.log('📦 New Order:', {
       customer: `${form.firstName} ${form.lastName}`,
       email: form.email,
       address: `${form.address}, ${form.city}, ${form.state} ${form.zip}`,
       payment: form.paymentMethod,
       items: items.map(i => `${i.quantity}x ${i.title}`),
       total: `$${total.toFixed(2)}`,
     });
     ```
  4. Returns `{ success: true }`.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```
  *(Or `{ "url": "https://checkout.stripe.com/..." }` if Stripe session active)*
- **Client Handling (`src/app/checkout/page.tsx:54–65`)**:
  - If `data.url`: redirects browser via `window.location.href = data.url`.
  - Else: transitions UI step to `'confirm'` and executes `clearCart()`.

---

## 4. Current Storefront Product Data Flow & Inventory Lifecycle

### 4.1 Data Retrieval Flow
Currently, product data reaches the user via two Server Component routes:
1. **Home Storefront (`src/app/page.tsx`)**:
   - Executes directly on server:
     ```typescript
     const products = await prisma.product.findMany({
       where: { isDraft: false },
       orderBy: { createdAt: 'desc' },
     });
     ```
   - Passes each product to `<ProductCard product={{ id: p.id, title: p.title, imageUrl: p.imageUrl, price: p.price ?? 8 }} />`.
2. **Product Detail (`src/app/products/[id]/page.tsx`)**:
   - Executes `prisma.product.findUnique({ where: { id: params.id } })`.
   - If missing or `product.isDraft`, calls `notFound()`.
   - Fetches 4 related items via `prisma.product.findMany({ where: { isDraft: false, id: { not: product.id } }, take: 4 })`.
   - Renders `<AddToCartButton product={{ id: product.id, title: product.title, imageUrl: product.imageUrl, price: product.price ?? 8 }} />`.

### 4.2 Price & Fallback Logic
- Database allows `price` to be null (`Float?`).
- All storefront components strictly enforce a fallback:
  ```typescript
  price: p.price ?? 8
  ```
- Price formatting is always rendered as `${price.toFixed(2)}`.
- Free shipping threshold is set at `$20.00` in `src/app/checkout/page.tsx`:
  - `totalPrice >= 20 ? 'Free' : '$3.99'`
  - Final total calculated as `totalPrice >= 20 ? totalPrice : (totalPrice + 3.99)`.

### 4.3 Inventory & Stock Model
- **No Stock Column**: The database does **not** maintain numerical stock levels.
- **Availability Contract**: A product is in-stock and purchasable if and only if `isDraft === false`.
- **Unlimited/Unique Semantics**: Each piece in Bonnie's Boutique is designated as "Handcrafted Original" / "One-of-a-kind", but the checkout system permits `quantity >= 1` per cart line item without server-side stock decrementing.
- **Rule for Refactor**: The frontend refactor must **not** attempt to check or decrement stock via non-existent API routes.

---

## 5. Cart Architecture & "Add to Cart" Logic

### 5.1 Client-Side State Machine (`CartContext.tsx`)
The cart is managed via React Context and a standard reducer:

```
[User Action: Add to Cart]
          │
          ▼
   CartContext dispatch({ type: 'ADD_ITEM', payload })
          │
    ┌─────┴────────────────────────┐
    ▼                              ▼
(Item exists)                (New item)
quantity += 1                quantity = 1
    │                              │
    └──────────────┬───────────────┘
                   ▼
       1. Set state.isOpen = true (Opens CartDrawer)
       2. Recalculate totalItems & totalPrice
       3. Persist to localStorage['bonnies-cart']
```

### 5.2 Complete `CartContext` Interface Specification
```typescript
export type CartItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number;
  quantity: number;
};

export type CartContextType = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  totalItems: number;
  totalPrice: number;
};
```

### 5.3 LocalStorage Persistence Contract
- **Storage Key**: `'bonnies-cart'` (exact literal string).
- **Format**: JSON serialized array of `CartItem[]`:
  ```json
  [
    {
      "id": "cmu1mpip90000fsjllmsu8n4q",
      "title": "Trinket #1",
      "imageUrl": "https://...",
      "price": 8,
      "quantity": 2
    }
  ]
  ```
- **Hydration**: On initial mount (`useEffect`), `CartProvider` reads `localStorage.getItem('bonnies-cart')` and dispatches `HYDRATE`.
- **Synchronization**: Any change to `state.items` writes immediately back to `localStorage`.

### 5.4 Clarification on Acceptance Criterion 5
> *"Acceptance Criteria 5: 'Add to Cart' successfully pushes to the existing backend API."*

- **Audit Finding**: In the existing codebase, clicking "Add to Cart" does **not** send an immediate HTTP POST request to an endpoint like `/api/cart`. There is **no** `/api/cart` route in the repository.
- **Actual Architecture**: Clicking "Add to Cart" adds the product to `CartContext`, opens `<CartDrawer />`, and stores it in `localStorage`. The cart items are transmitted to the backend API when the user proceeds to checkout via `POST /api/checkout`.
- **Refactor Guidance**:
  - The new 3D Levitating Product Viewer and 16-bit HUD must invoke `addItem({ id: product.id, title: product.title, imageUrl: product.imageUrl, price: product.price })` from `useCart()`.
  - When invoked, `<CartDrawer />` slides open, the item count updates in `<Header />`, and the product is ready for `POST /api/checkout`.
  - If the orchestrator desires an explicit network push upon "Add to Cart", a non-breaking telemetry/log route could be added, but adhering to the established `CartContext` → `POST /api/checkout` pipeline satisfies 100% backend compatibility.

---

## 6. Checkout Logic & Payment Integration

### 6.1 User Journey
```
1. CartDrawer: User clicks "Proceed to Checkout →" (Navigates to /checkout)
   │
   ▼
2. /checkout (Step: 'info'):
   Inputs: firstName, lastName, email, phone, address, city, state, zip, country
   Validation: HTML5 'required' on firstName, lastName, email, address, city, state, zip
   Action: User clicks "Continue to Payment →" -> sets step to 'payment'
   │
   ▼
3. /checkout (Step: 'payment'):
   Inputs: paymentMethod ('stripe' | 'paypal' | 'venmo')
   Action: User clicks "Place Order →"
   │
   ▼
4. Network Call:
   fetch('/api/checkout', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ items, form, total: totalPrice })
   })
   │
   ▼
5. Resolution:
   - If data.url present: window.location.href = data.url (Stripe redirect)
   - Else: setStep('confirm'), clearCart() (Order Confirmed screen)
```

### 6.2 Stripe Integration Status
- The Stripe Node library (`stripe: ^22.6.2`) and React Stripe packages are installed in `package.json`.
- In `src/app/api/checkout/route.ts` (lines 18–38), the Stripe checkout session creation code is fully written but commented out awaiting `process.env.STRIPE_SECRET_KEY`.
- In `.env`, `STRIPE_SECRET_KEY` is not currently set.
- Mock fallback logs the order to the server console and returns `{ success: true }`, ensuring uninterrupted testing and end-to-end checkout flow without payment credentials.

---

## 7. Frontend Refactor Compatibility Boundaries & Strict Invariants

To guarantee that the 3D/16-bit scrollytelling refactor maintains **100% compatibility** without breaking or altering existing backend logic, the frontend team must adhere to the following rules:

### Rule 1: Product Data Shape Invariance
Any component rendering products (whether in the 3D canvas, 2D pixel layer, or standard DOM HUD) must expect the `Product` contract:
```typescript
interface StorefrontProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
}
```
If `price` is null from the database, apply the canonical fallback: `product.price ?? 8.00`.

### Rule 2: 3D Model to Product Mapping
As established in Explorer 2's `assetManifest.ts`, placeholder procedural Three.js geometries or future `.glb` models must be mapped to products using their `id` or ordered array index. The active 3D model in the scene must always correspond to an active `Product` data record so that when the user clicks "Add to Cart", the payload sent to `addItem()` has a valid CUID, title, price, and image.

### Rule 3: Maintain `CartProvider` and `CartContext`
Do **not** replace or discard `src/context/CartContext.tsx`. The 3D UI, levitating viewer HUD, and 16-bit interactive shopkeeper must simply consume `useCart()`:
```typescript
import { useCart } from '@/context/CartContext';

// In 3D Viewer or Scrollytelling HUD:
const { addItem, openCart } = useCart();

const handleAddToCart = () => {
  addItem({
    id: activeProduct.id,
    title: activeProduct.title,
    imageUrl: activeProduct.imageUrl,
    price: activeProduct.price,
  });
};
```

### Rule 4: Preserve `bonnies-cart` LocalStorage Key
Any external cart synchronizers or third-party persistence utilities must **not** change the localStorage key name `'bonnies-cart'`, as `/checkout` and `<CartDrawer />` directly read from this storage key.

### Rule 5: Keep Checkout Route and API Payload Untouched
The `/checkout` page route (`src/app/checkout/page.tsx`) and the `/api/checkout` route handler (`src/app/api/checkout/route.ts`) must remain untouched or structurally identical. The payload submitted to `/api/checkout` must strictly match `{ items, form, total }`, where `total` is a number that supports `.toFixed(2)`.

### Rule 6: Draft Filtering Requirement
If the scrollytelling container is rendered inside a Server Component (`src/app/page.tsx`), products should be passed down as server-rendered props from:
```typescript
const products = await prisma.product.findMany({
  where: { isDraft: false },
  orderBy: { createdAt: 'desc' },
});
```
If instead products are fetched on the client side via `/api/products`, the client component **must** filter:
```typescript
const publishedProducts = products.filter((p) => !p.isDraft);
```
because `GET /api/products` returns both published products and admin drafts.

### Rule 7: Backend Reliability Recommendation (Prisma Singleton)
Currently, `new PrismaClient()` is instantiated at module scope across four separate files (`src/app/page.tsx`, `src/app/products/[id]/page.tsx`, `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`). During Next.js hot-reloading and parallel builds, this causes database connection saturation. It is strongly recommended to extract a global Prisma singleton in `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```
This change is 100% backward-compatible with all existing queries while protecting backend connection limits.
