# cdbe — Bookstore E‑Commerce (Full Stack)

Full-stack bookstore e-commerce app:
- Backend: Node.js + Express + MongoDB/Mongoose (REST API)
- Frontend: React + TypeScript + Vite

This repo is split into two apps:
- Backend in `be/`
- Frontend in `fe/`

## Features

Backend (API):
- Authentication: register/login, JWT, profile, password reset
- Catalog: products + categories, search/filter/pagination
- Cart + orders
- Admin endpoints (users, orders, dashboard)
- Swagger/OpenAPI docs at `/api-docs`
- File uploads served from `/uploads`
- Payments: PayOS payment link + webhook
- Email: Resend (transactional emails)

Frontend (Web):
- Product browsing + detail
- Cart, checkout, orders
- Auth pages (login/register/forgot password)
- Admin area
- i18n support via `react-i18next`

## Tech Stack

- Backend: Express, Mongoose, JWT, Helmet, CORS, express-rate-limit, Swagger UI
- Frontend: React 19, TypeScript, Vite, React Router, React Bootstrap, Axios
- Database: MongoDB (local or Atlas)

## Repository Structure

```
./
  be/                # Backend API (Express)
  fe/                # Frontend web app (React/Vite)
  docs/              # Project docs (deployment plans, etc.)
  init.ps1           # Convenience script: starts BE + FE dev servers
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+ recommended (frontend requires modern Node)
- MongoDB running locally OR a MongoDB Atlas connection string

### 1) Install dependencies

Backend:

```powershell
cd be
npm install
```

Frontend:

```powershell
cd ..\fe
npm install
```

### 2) Configure environment variables

Backend:

- Copy example file: `be/.env.example` → `be/.env`
- Fill in at least the required variables below.

Frontend:

- Copy example file: `fe/.env.example` → `fe/.env`

### 3) (Optional) Seed the database

From `be/`:

```powershell
npm run db:setup
```

This runs database creation + seed scripts.

### 4) Start backend + frontend

Option A — start separately (recommended while debugging):

Backend:

```powershell
cd be
npm run dev
```

Frontend:

```powershell
cd fe
npm run dev
```

Option B — start both using the provided helper:

```powershell
./init.ps1
```

Backend runs on: `http://localhost:5000`
Frontend runs on Vite’s dev URL (printed in the terminal).

## Configuration

### Backend env vars (be/.env)

Minimum required for local usage:

```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=bookstore
PORT=5000

JWT_SECRET=change_me
JWT_EXPIRE=7d

ADMIN_EMAIL=admin@bookstore.com
ADMIN_PASSWORD=admin123

# Optional but used by the app
USD_TO_VND_RATE=25000
```

Payments (PayOS) — required if you use PayOS checkout:

```env
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
YOUR_DOMAIN=http://localhost:5173
```

Email (Resend) — required if you want transactional emails:

```env
RESEND_API_KEY=...
YOUR_DOMAIN=http://localhost:5173
```

Notes:
- Keep secrets server-side only.
- Do not commit real secrets to git; prefer `.env` locally and secret managers in hosting.

### Frontend env vars (fe/.env)

```env
VITE_API_URL=http://localhost:5000/api
```

## API Documentation (Swagger)

- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/api-docs.json`

See backend swagger guide: `be/SWAGGER-SETUP.md`.

## Common Scripts

Backend (run inside `be/`):

```bash
npm run dev        # start with nodemon
npm start          # start with node
npm run db:create  # create collections/indexes
npm run db:seed    # seed sample data
npm run db:setup   # create + seed
```

Frontend (run inside `fe/`):

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Payments (PayOS)

- Create a payment link: `POST /api/payment/create-payment-link` (auth required)
- Webhook endpoint: `POST /api/payment/payos-webhook` (public)

Deployment guide includes PayOS webhook setup steps.

## Testing

- Health check: `GET /api/health`
- Manual API testing guide (PowerShell + Postman tips): `be/TESTING-GUIDE.md`

## Deployment

A full step-by-step guide (Vercel + Render + MongoDB Atlas):
- `docs/DEPLOYMENT-GUIDE.md`

## Additional Docs / Plans

- Backend quick start + endpoint overview: `be/QUICK-START.md`
- Backend API roadmap: `be/API-TODO.md`
- Semantic search implementation plan (MongoDB Atlas Vector Search + Gemini embeddings): `docs/SEMANTIC-SEARCH-IMPLEMENTATION-PLAN.md`

## Troubleshooting

- MongoDB connection errors: verify `MONGODB_URI` and that MongoDB is running.
- Port conflicts: change `PORT` in `be/.env`.
- Auth issues: ensure `JWT_SECRET` is set and you send `Authorization: Bearer <token>`.
- PayOS issues: verify `PAYOS_*` keys and that `YOUR_DOMAIN` matches your deployed frontend.

---

### Sub-project READMEs

- Backend: `be/README.md`
- Frontend: `fe/README.md`
