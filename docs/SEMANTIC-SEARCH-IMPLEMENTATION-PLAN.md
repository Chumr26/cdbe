# Semantic Search Implementation Plan (MongoDB Atlas + Google Gemini)

**Project:** cdbe (Node/Express + MongoDB/Mongoose backend, React/Vite frontend)

## 0) Goal
Add semantic (meaning-based) search for products using:
- **Google Gemini Embeddings** to generate vectors for product text and user queries
- **MongoDB Atlas Vector Search** (`$vectorSearch`) to retrieve nearest products

Target outcome:
- Backend endpoint: `GET /api/products/semantic-search?q=...&limit=...&category=...`
- Product documents store an `embedding: number[]` field
- Atlas Search vector index created and active
- Backfill script to generate embeddings for existing products

## 1) Scope
**In scope**
- Semantic search for products (includes EN + VI product text)
- Backfill embeddings for all existing active products
- Minimal operational protections (rate-limit friendly backfill, no embedding leakage in API)

**Out of scope (for later)**
- Hybrid ranking (keyword + vector blend)
- Personalization
- Semantic search for categories/orders/reviews

## 2) Architecture Summary
1. **Indexing phase (offline / admin script)**
   - Build a text representation for each product (title/author/category + EN/VI description)
   - Call Gemini embeddings API to obtain a vector
   - Store vector in MongoDB as `Product.embedding`
   - Create / update Atlas vector index on `embedding`

2. **Query phase (online request)**
   - Embed user query `q` via Gemini embeddings API
   - Use MongoDB aggregation with `$vectorSearch` against `Product.embedding`
   - Optionally filter (`isActive`, `category`)
   - Return results with a `vectorSearchScore`-based `score`

## 3) Prerequisites
### 3.1 MongoDB Atlas
- Cluster must be **MongoDB Atlas**
- Atlas Search enabled (Vector Search is part of Atlas Search)

### 3.2 Gemini
- Create API key in Google AI Studio
- Store as backend env var: `GEMINI_API_KEY`

## 4) Backend Implementation Plan
### 4.1 Add dependencies
Backend (`be/package.json`):
- Ensure `axios` exists (it likely does). If not, add it.

### 4.2 Environment variables
Backend `.env` (or hosting environment):
- `GEMINI_API_KEY=...`
- `GEMINI_EMBED_MODEL=text-embedding-004`
- `ATLAS_VECTOR_INDEX=product_embedding` (index name used by `$vectorSearch`)
- `ATLAS_VECTOR_PATH=embedding`

### 4.3 Data model change (Mongoose)
Update `be/models/Product.model.js`:
- Add `embedding: { type: [Number], default: undefined, select: false }`

Notes:
- `select: false` prevents large vectors from being returned by default.
- No schema migration needed; MongoDB is schema-less.

### 4.4 Gemini embedding utility
Create `be/utils/geminiEmbeddings.js`:
- `embedText(text): Promise<number[]>`
- `buildProductEmbeddingText(product): string` (includes both EN + VI)

Implementation details:
- Call Gemini REST endpoint `models/<model>:embedContent`
- Normalize whitespace; avoid sending empty strings
- Throw a clear error if `GEMINI_API_KEY` is missing

### 4.5 Add semantic search controller
Update `be/controllers/product.controller.js`:
- Add `semanticSearchProducts` handler
- Compute query vector via `embedText(q)`
- Run aggregation:
  - `$vectorSearch` with `index`, `path`, `queryVector`, `numCandidates`, `limit`
  - `$match` for `isActive: true` and optional `category`
  - `$addFields` `score: { $meta: 'vectorSearchScore' }`
  - `$project` to exclude `embedding`

### 4.6 Add route
Update `be/routes/product.routes.js`:
- Add `router.get('/semantic-search', semanticSearchProducts)`

Important:
- Register this route **before** `router.get('/:id', ...)`.

## 5) Atlas Vector Search Index Setup
### 5.1 Determine embedding dimensions
Add script `be/scripts/printEmbeddingDims.js`:
- Calls `embedText('dimension check')`
- Prints `Embedding dimensions: <N>`

Run:
- `node scripts/printEmbeddingDims.js`

### 5.2 Create the Atlas Search index
In Atlas UI:
- Cluster → **Search** → **Create Search Index**
- Select DB + collection: the products collection
- JSON editor config (replace `numDimensions` with the printed number):

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

- Name the index: `product_embedding` (or match `ATLAS_VECTOR_INDEX`)
- Wait for status: **Active**

## 6) Backfill Embeddings for Existing Products
Create script `be/scripts/backfillProductEmbeddings.js`:
- Streams products using a cursor
- For each active product:
  - Build embedding input text
  - Call Gemini embed endpoint
  - Update product with `embedding`

Operational recommendations:
- Start with low throughput to avoid free-tier rate limits.
- Add optional delays / batching if you hit `429` or timeouts.

Run:
- `node scripts/backfillProductEmbeddings.js`

## 7) Keeping embeddings up to date
**Phase 1 (simple):**
- Re-run backfill script whenever you change the embedding text template.

**Phase 2 (recommended):**
- On product create/update:
  - Recompute embedding
  - Save `embedding`

(Implement Phase 2 after MVP if you want to keep code changes minimal at first.)

## 8) Testing / Verification Checklist
### 8.1 Local smoke tests
- Start backend server
- Ensure `.env` contains `GEMINI_API_KEY`
- Run `node scripts/printEmbeddingDims.js`
- Run `node scripts/backfillProductEmbeddings.js` until completion

### 8.2 Endpoint test
Call:
- `GET /api/products/semantic-search?q=clean architecture&limit=12`

Verify:
- Returns `success: true`
- Returns products even if query doesn’t match exact keywords
- Response does **not** include `embedding` field
- Results include a `score` field

### 8.3 EN + VI validation
Try queries in both languages:
- English query describing a Vietnamese product topic
- Vietnamese query describing an English product topic

## 9) Security / Cost / Reliability Notes
- Keep `GEMINI_API_KEY` server-side only (never expose to frontend).
- Consider basic rate limiting on the semantic search endpoint if needed.
- Cache query embeddings (optional) to reduce repeated embedding calls.
- Backfill scripts should handle:
  - network failures
  - Gemini rate limits (retry with backoff)

## 10) Minimal Frontend Integration (Optional)
If you want the UI to use semantic search:
- Add a new API function in `fe/src/api/products.api.ts`:
  - `semanticSearchProducts(q, limit, category)`
- Add a UI toggle (keyword vs semantic) in `fe/src/pages/ProductsPage.tsx`

Keep it minimal to avoid changing UX beyond what’s needed.

## 11) Rollout Plan
1. Implement backend changes behind the new endpoint.
2. Backfill embeddings.
3. Create and activate Atlas vector index.
4. Smoke test endpoint.
5. (Optional) Wire frontend toggle and deploy.

---

## Appendix: Suggested defaults
- `limit`: 12 (cap at 50)
- `numCandidates`: `max(limit * 20, 200)`
- Similarity: `cosine`
- Index name: `product_embedding`
- Embedding model: `text-embedding-004`
