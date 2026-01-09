## Plan: Review & Rating System

Add a dedicated Review collection linked to Product and User, expose CRUD endpoints with purchase-verification, and render/submit reviews on the product detail page. This matches your current Express (routes → controllers → Mongoose models) structure and your FE API client pattern, while keeping product-level aggregates (`rating`, `numReviews`) up to date for fast listing.

### Steps 1–6
1. Define a `Review` Mongoose model in be/models (new file) and add indexes (unique user+product, query product+date).
2. Add review controller handlers in be/controllers (new file) to create/update/delete reviews and recompute Product aggregates in [be/models/Product.model.js](be/models/Product.model.js).
3. Wire routes: add product-scoped list/create routes under [be/routes/product.routes.js](be/routes/product.routes.js) and review-scoped update/delete routes under a new routes file (or extend an existing pattern), using [be/middleware/auth.middleware.js](be/middleware/auth.middleware.js).
4. Implement “verified purchase” check by querying [be/models/Order.model.js](be/models/Order.model.js) for `userId`, `status: completed`, and `items.productId === productId`.
5. Add FE API methods in [fe/src/api/products.api.ts](fe/src/api/products.api.ts) (or a new `reviews.api.ts`) consistent with existing axios wrapper in [fe/src/api/axios.ts](fe/src/api/axios.ts).
6. Update the reviews tab UI in [fe/src/pages/ProductDetailPage.tsx](fe/src/pages/ProductDetailPage.tsx) to fetch/display reviews and show an auth-gated create/edit/delete form using [fe/src/context/AuthContext.tsx](fe/src/context/AuthContext.tsx).

### Further Considerations 1–3
1. Who can review? Option A: only “completed” purchasers; Option B: any logged-in user; Option C: allow but label “unverified”.
2. Review rules: allow only one review per user per product (recommended) vs multiple reviews over time.
3. Moderation: hard delete vs soft delete (`isDeleted`) and whether admins can remove/restore.

Reply with your choices for the 3 items above (A/B/C + one-review yes/no + delete style), and I’ll refine the plan into exact endpoint shapes and UI behavior.
