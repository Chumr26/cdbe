# Coupon / Discount System — Implementation Plan

## 0) Scope (what we will build)

### Goals
- Let customers apply **one coupon code** to their cart.
- Apply discounts consistently across **Cart → Checkout → Order**.
- Provide **Admin CRUD** for coupons.
- Enforce common rules: active window, usage limits, minimum subtotal, eligible products/categories.

### Non-goals (to keep it simple)
- Stacking multiple coupons (not supported).
- Automatic promotions (e.g., “10% off all Science books”) without a code.
- Complex “buy X get Y” rules.

### Assumptions (confirm later)
- Currency is effectively USD in UI today; we treat prices as numbers (existing code does this).
- Discounts apply to **cart items subtotal** (no tax/shipping logic exists yet).
- One coupon per cart; applying a new code replaces the old one.

## 1) Data Model (MongoDB / Mongoose)

### 1.1 Coupon collection (`coupons`)
Create `be/models/Coupon.model.js`:

Recommended fields:
- `code` (String, **unique**, uppercase normalized)
- `name` (String) — human-friendly label
- `description` (String)
- `type` (String enum: `percent` | `fixed`)
- `value` (Number) — percent (e.g., 10) or fixed amount (e.g., 5.00)
- `maxDiscountAmount` (Number, optional) — caps percent discounts
- `minSubtotal` (Number, optional) — minimum cart subtotal required
- `startsAt` / `endsAt` (Date, optional) — validity window
- `isActive` (Boolean, default true)
- `usageLimitTotal` (Number, optional) — maximum redemptions across all users
- `usageLimitPerUser` (Number, optional) — maximum redemptions per user
- Eligibility constraints (optional; can start with none and add later):
  - `eligibleProductIds` (ObjectId[], refs Product)
  - `eligibleCategorySlugs` (String[]) or `eligibleCategoryIds` (ObjectId[])
- Audit:
  - `createdBy` (ObjectId ref User)
  - `updatedBy` (ObjectId ref User)
- `timestamps: true`

Indexes:
- Unique index on `code`.
- Optional compound for admin list filtering: `{ isActive: 1, startsAt: 1, endsAt: 1 }`.

### 1.2 Coupon redemption tracking (`coupon_redemptions`)
Create `be/models/CouponRedemption.model.js` to track usage without unbounded arrays:
- `couponId` (ObjectId, ref Coupon, required)
- `userId` (ObjectId, ref User, required)
- `orderId` (ObjectId, ref Order, optional until order is created)
- `code` (String) — snapshot
- `discountAmount` (Number) — snapshot
- `redeemedAt` (Date)

Indexes:
- `{ couponId: 1, userId: 1 }` (for per-user usage count queries)
- `{ couponId: 1 }` (for total usage count queries)
- `{ orderId: 1 }` (to find redemption by order)

### 1.3 Cart changes (`carts`)
Update `be/models/Cart.model.js` to support discounts.

Recommended fields to add:
- `subtotal` (Number) — computed from items
- `discountTotal` (Number) — computed
- `total` (Number) — computed as `subtotal - discountTotal` (never < 0)
- `coupon` (Object, nullable):
  - `couponId` (ObjectId)
  - `code` (String)
  - `type` (String)
  - `value` (Number)

Important: today `total` is computed by a pre-save hook from items. With coupons, totals must be computed in a shared pricing function (see section 2).

### 1.4 Order changes (`orders`)
Update `be/models/Order.model.js` to persist what happened at purchase time:
- `subtotal` (Number)
- `discountTotal` (Number)
- `coupon` snapshot (same shape as cart)
- `total` remains final charged amount

This prevents later coupon edits from changing historical order totals.

## 2) Pricing & Validation Logic (single source of truth)

Create `be/utils/couponPricing.js` (or similar) that exposes:

- `normalizeCouponCode(code)` → uppercases + trims
- `validateCoupon({ coupon, userId, cart })` → returns `{ valid, reason?, computedDiscount }`
- `recalculateCartTotals(cart, userId)`:
  - computes `subtotal` from items
  - if `cart.coupon` exists:
    - load coupon from DB by `couponId` or `code`
    - validate constraints:
      - `isActive`
      - date window (`startsAt`/`endsAt`)
      - `minSubtotal`
      - `usageLimitTotal` (count `CouponRedemption` for coupon)
      - `usageLimitPerUser` (count `CouponRedemption` for coupon+user)
      - eligibility (product/category constraints if enabled)
    - compute discount:
      - `percent`: `subtotal * (value/100)` with optional cap
      - `fixed`: `min(value, subtotal)`
  - set `discountTotal` and final `total`
  - if coupon invalid, clear `cart.coupon` and set discount to 0

Where to call it:
- After **add/update/remove/clear items**
- After **apply coupon**
- Right before **create order** (to prevent stale totals)

## 3) API Endpoints

### 3.1 Customer endpoints

#### Apply coupon to cart
- `POST /api/cart/coupon`
  - Body: `{ code: string }`
  - Flow:
    1. normalize code
    2. load coupon by code
    3. validate via pricing module
    4. save coupon snapshot onto cart
    5. recalculate totals + return cart

#### Remove coupon
- `DELETE /api/cart/coupon`
  - Clears `cart.coupon`, recalculates totals, returns cart

#### Validate coupon (optional but useful for UI)
- `POST /api/coupons/validate`
  - Body: `{ code: string }`
  - Returns: `{ valid, reason?, preview: { discountTotal, total } }`
  - Uses current cart of logged-in user for preview.

### 3.2 Admin endpoints (CRUD)
Create `be/controllers/coupon.controller.js` and `be/routes/coupon.routes.js` for public/validate route (if used).

Create `be/controllers/admin.coupon.controller.js` and register routes under `be/routes/admin.routes.js`:
- `POST /api/admin/coupons` — create
- `GET /api/admin/coupons` — list (add pagination query: `page`, `limit`, `q`, `active`)
- `GET /api/admin/coupons/:id` — details
- `PUT /api/admin/coupons/:id` — update
- `DELETE /api/admin/coupons/:id` — soft delete recommended (set `isActive=false`) or hard delete (your choice)

Swagger:
- Add schemas for `Coupon` and update `Cart`/`Order` schemas to include `subtotal/discountTotal/total/coupon`.

## 4) Order creation integration (critical)

Update `be/controllers/order.controller.js` `createOrder` flow:
- Load cart
- Recalculate totals server-side **right before** creating the order
- Create order with:
  - items snapshot
  - `subtotal`, `discountTotal`, `total`
  - coupon snapshot (if any)

Coupon usage tracking decision:
- When order is created, create a `CouponRedemption` record with `orderId`.
- If payment can fail later (PayOS), you have two options:
  1. **Redeem on successful payment** (more correct but requires webhook/status update integration)
  2. **Redeem on order creation** (simpler; but coupon could be consumed even if unpaid)

Recommendation for your current system:
- COD: redeem on order creation.
- PayOS: redeem when payment is confirmed (in your payment verification webhook/endpoint). Until then, don’t increment usage.

## 5) Frontend changes (Vite React)

### 5.1 Cart page
Update `fe/src/pages/CartPage.tsx`:
- Add coupon input + Apply button.
- Show pricing breakdown:
  - Subtotal
  - Discount (if coupon applied)
  - Total
- Provide “Remove coupon” action.

### 5.2 Checkout page
Update `fe/src/pages/CheckoutPage.tsx`:
- Display the same pricing breakdown.
- (Optional) allow applying/removing coupon here too, but simplest is to manage on Cart page only.

### 5.3 API client
Create `fe/src/api/coupons.api.ts` (if validate endpoint exists) and extend `fe/src/api/cart.api.ts` with:
- `applyCoupon(code)` → POST `/cart/coupon`
- `removeCoupon()` → DELETE `/cart/coupon`

Update `Cart` type to include `subtotal`, `discountTotal`, `coupon`.

## 6) Seed data & admin UX

### Seed
Update `be/scripts/seedDatabase.js` (optional) to create a few sample coupons:
- `WELCOME10` → 10% off, max $20, minSubtotal $30
- `FIVEOFF` → $5 off, minSubtotal $25

### Admin UX
If you already have an admin UI in FE (you do), add a simple Coupons table + create/edit form later.
For MVP, admin can manage coupons via Postman/Swagger.

## 7) Validation & Security

### Validation rules
Use `express-validator` on:
- coupon code format (trim + length constraints)
- `type/value` sanity (percent 1–100, fixed > 0)
- dates (`startsAt <= endsAt`)

### Concurrency / race conditions
Usage limits can be exceeded under high concurrency.
Mitigation options (choose one):
- Accept low-probability overage (MVP acceptable)
- Use Mongo transactions (requires replica set)
- Use atomic counters + careful redemption creation (more advanced)

Given current scope, MVP can accept small race risk.

## 8) Testing strategy

Current repo doesn’t have a test runner configured. Two options:
1. Add `jest` + `supertest` (recommended) and write tests for:
   - apply/remove coupon
   - invalid/expired coupon
   - minSubtotal enforcement
2. If you want zero tooling changes: create a Postman/ThunderClient collection + test checklist.

## 9) Step-by-step task breakdown

### Backend
1. Add `Coupon` + `CouponRedemption` models
2. Add pricing utility (`couponPricing.js`)
3. Update Cart schema to store `subtotal/discountTotal/total/coupon`
4. Add cart coupon routes + controller methods
5. Add admin coupon CRUD routes + controllers
6. Update order creation to snapshot discount + coupon
7. Update Swagger schemas
8. Add seed coupons (optional)

### Frontend
1. Extend cart API client (apply/remove)
2. Update cart types and cart page UI
3. Update checkout summary UI

### Verification checklist
- Coupon applies and persists across refresh
- Updating cart quantities recomputes discount correctly
- Invalid/expired coupon shows clear error and does not discount
- Orders persist coupon snapshot and total is correct
- Admin can create/update/disable coupons

## 10) Open questions (need product decisions)
1. Should coupons be allowed for PayOS orders before payment completes, or only after payment confirmation?
2. Eligibility: do you want coupons limited by category/product now, or keep global for MVP?
3. Do you want “free shipping” style coupons later (you currently always show FREE shipping)?
