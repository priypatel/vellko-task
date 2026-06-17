# DocSign — Digital Signature & Document Management Platform

A full-stack web application to upload PDF documents, electronically sign them, manage them, and verify their authenticity through a public verification mechanism.

|                 | URL                                      |
| --------------- | ---------------------------------------- |
| **Frontend**    | https://vellko-task-web.vercel.app       |
| **Backend API** | https://vellko-task.onrender.com         |
| **Repository**  | https://github.com/priypatel/vellko-task |

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features Implemented](#features-implemented)
3. [Technology Stack](#technology-stack)
4. [Architecture Overview](#architecture-overview)
5. [Database Design](#database-design)
6. [API Overview](#api-overview)
7. [Setup Instructions](#setup-instructions)
8. [Environment Variables](#environment-variables)
9. [Deployment Information](#deployment-information)
10. [Demo Credentials](#demo-credentials)
11. [Assumptions Made](#assumptions-made)
12. [Known Limitations](#known-limitations)
13. [Future Improvements](#future-improvements)

---

## Project Overview

DocSign manages the full PDF signing lifecycle — upload, preview, electronic signing, download, and third-party verification. It is an npm-workspaces **monorepo** with a Next.js 14 frontend and an Express.js + TypeScript backend, backed by PostgreSQL and file storage on Supabase.

The verification system is fully public: any third party can confirm a signed document's authenticity without logging in, using a unique verification token in the document's public URL.

---

## Features Implemented

**Public**

- Landing page, registration, login, password recovery (email)
- Public document verification page — no login required

**Documents**

- Upload PDFs (max 20 MB, MIME + magic-byte validated)
- In-browser PDF preview (`pdfjs-dist`)
- Add signatures (draw / type / upload) and place them on any page with a draggable, resizable overlay
- Server-side signed-PDF generation (`pdf-lib`)
- Download signed documents via 1-hour presigned URLs
- Manage and revisit all documents from the dashboard

**Dashboard**

- Status tracking (uploaded / signing / signed), summary stats, reusable saved signatures, personal audit log

**Verification**

- `/verify/[token]` shows signer name, document title, signed timestamp, and original SHA-256 hash

**Audit & Admin**

- Every key action logged (user, document, action, IP, metadata)
- Admin panel: user list + role management, all documents, platform-wide audit logs with filters and CSV export

---

## Technology Stack

**Frontend** — Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui-style components (Radix + class-variance-authority), pdfjs-dist, react-signature-canvas, Axios.

**Backend** — Node.js + Express.js, TypeScript, pg (raw parameterized SQL, no ORM), zod, multer, pdf-lib, bcryptjs, jsonwebtoken, express-rate-limit, helmet, cors.

**Infrastructure** — Supabase (PostgreSQL + Storage), Upstash Redis (refresh-token blocklist), Resend (email), Vercel (frontend), Render (backend).

---

## Architecture Overview

```
Browser (Next.js 14 on Vercel)
   │  HTTPS — Bearer access token
   ▼
Express.js API (Render)
   middleware: helmet → cors → authenticate → authorize → rateLimit → validate
   modules: auth · documents · signatures · verification · audit · admin
   │                                   │
   ▼                                   ▼
PostgreSQL (Supabase)            Supabase Storage (private bucket)
                                  originals/ · signed/ · signatures/
```

**Auth flow:** the access token (15 min) lives in memory; the refresh token (7 days) is an httpOnly cookie. On a 401, the client transparently calls `/auth/refresh` and retries. Logout revokes the refresh token (Redis blocklist + DB).

**Signing flow:** upload → validate + SHA-256 + store original → render pages on canvas → user places signature (percentage coordinates) → server embeds the signature with `pdf-lib` → store signed PDF → status `signed` → download via presigned URL.

---

## Database Design

Seven tables (PostgreSQL), UUID primary keys, migrations in `apps/server/migrations/` (`001`–`006`).

| Table                   | Purpose                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| `users`                 | Accounts (name, email, bcrypt hash, role)                                         |
| `documents`             | Uploaded PDFs (file keys, SHA-256 hash, status, `verification_token`, page count) |
| `signatures`            | Reusable saved signatures (type, storage key)                                     |
| `document_signatures`   | Signature placements on a document (page, x/y/width/height as %)                  |
| `audit_logs`            | Append-only action trail (action, JSONB metadata, IP)                             |
| `password_reset_tokens` | Single-use, time-limited reset tokens (hashed)                                    |
| `refresh_tokens`        | Durable refresh-token records for revocation/audit                                |

**Key decisions**

- **UUID PKs** + a separate public `verification_token` so public routes never expose internal IDs.
- **SHA-256 at upload** for tamper detection (shown on the verification page).
- **Original and signed files kept separately** — the original is never overwritten.
- **Percentage coordinates** make signature placement resolution-independent.
- **`document_signatures` join table** supports multiple placements/signers without schema change.
- **Raw parameterized `pg` queries** — explicit, injection-safe, no ORM overhead.

---

## API Overview

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`; admin routes require `role = 'admin'`. Responses follow `{ success, data }` or `{ success: false, message, errors }`.

**Auth** — `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/forgot-password`, `POST /auth/reset-password`

**Documents** — `GET /documents`, `POST /documents`, `GET /documents/:id`, `DELETE /documents/:id`, `GET /documents/:id/download`, `GET /documents/:id/preview`, `POST /documents/:id/sign`

**Signatures** — `GET /signatures`, `POST /signatures`, `DELETE /signatures/:id`

**Verification (public)** — `GET /verify/:token`

**Audit** — `GET /audit-logs`

**Admin** — `GET /admin/users`, `PATCH /admin/users/:id/role`, `GET /admin/documents`, `GET /admin/audit-logs`

**Health** — `GET /health`

> Download/preview return the presigned URL as JSON (`{ url }`) rather than a 302, because the SPA holds its token in memory and a direct browser navigation can't authenticate.

---

## Setup Instructions

**Prerequisites:** Node.js ≥ 18, Docker, and a Supabase account (for storage). Upstash and Resend are optional.

```bash
# 1. Clone & install
git clone https://github.com/priypatel/vellko-task.git
cd vellko-task
npm install

# 2. Start local Postgres + Redis (host ports 5433 / 6380)
docker compose up -d

# 3. Configure env
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
# fill in values (see below)

# 4. Migrate + seed demo users
cd apps/server
npm run migrate
npm run seed

# 5. Start both apps (from repo root)
cd ..
npm run dev
```

Frontend runs on **http://localhost:3010**, backend on **http://localhost:4000**.

---

## Environment Variables

**Backend — `apps/server/.env`**

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/docsign
JWT_ACCESS_SECRET=<random 32+ chars>
JWT_REFRESH_SECRET=<different random 32+ chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_STORAGE_BUCKET=docsign
UPSTASH_REDIS_REST_URL=        # optional
UPSTASH_REDIS_REST_TOKEN=      # optional
RESEND_API_KEY=                # optional
RESEND_FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=http://localhost:3010
```

**Frontend — `apps/web/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## Deployment Information

| Component | Platform            | Notes                                                                                                        |
| --------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Frontend  | Vercel              | Root dir `apps/web`, env `NEXT_PUBLIC_API_URL`                                                               |
| Backend   | Render              | Root dir `apps/server`, build `npm install && npm run build`, start `node dist/app.js`, health `/api/health` |
| Database  | Supabase PostgreSQL | Run `npm run migrate` + `npm run seed` against the connection string                                         |
| Storage   | Supabase Storage    | Private bucket `docsign`                                                                                     |

A full step-by-step guide is in [`apps/server/DEPLOY.md`](apps/server/DEPLOY.md). After both are live, set the backend's `FRONTEND_URL` to the Vercel URL (for CORS and reset links).

> **Note:** Render's free tier sleeps after inactivity — the first request may take 20–30 s (cold start), then responds normally.

---

## Demo Credentials

```
User    →  demo@test.com   /  Demo@12345
Admin   →  admin@test.com  /  Admin@12345
```
