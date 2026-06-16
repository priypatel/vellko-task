# DocSign — Digital Signature & Document Management Platform

A production-oriented full-stack web application that allows users to upload PDF documents, electronically sign them, manage their documents, and verify document authenticity through a public verification mechanism.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features Implemented](#features-implemented)
3. [Technology Stack](#technology-stack)
4. [Architecture Overview](#architecture-overview)
5. [Database Design](#database-design)
6. [API Overview](#api-overview)
7. [Folder Structure](#folder-structure)
8. [Setup Instructions](#setup-instructions)
9. [Environment Variables](#environment-variables)
10. [Deployment Information](#deployment-information)
11. [Demo Credentials](#demo-credentials)
12. [Security Practices](#security-practices)
13. [Assumptions Made](#assumptions-made)
14. [Known Limitations](#known-limitations)
15. [Future Improvements](#future-improvements)

---

## Project Overview

DocSign is a platform that enables organizations to manage the complete PDF document signing lifecycle — from upload and preview, to electronic signing, download, and third-party verification. The system is built with a clean separation of concerns between the frontend (Next.js) and backend (Express.js), backed by PostgreSQL on Supabase and file storage on Supabase Storage.

The verification system is fully public — any third party can verify the authenticity of a signed document without logging in, using a unique verification token embedded in the document's public URL.

---

## Features Implemented

### Public Features
- Landing page with platform overview
- User registration with password hashing (bcrypt, cost factor 12)
- User login with JWT-based authentication
- Password recovery via email (Resend)
- Public document verification page — no login required

### Document Workflow
- Upload PDF documents (max 20MB, MIME + magic byte validated)
- Preview uploaded PDFs in-browser using `pdfjs-dist`
- Add electronic signatures to documents (drawn, typed, or image upload)
- Place signatures at specific positions on any page (drag-and-drop overlay)
- Complete the signing process — signed PDF generated server-side via `pdf-lib`
- Download signed documents via presigned Supabase Storage URLs (1-hour expiry)
- Revisit and manage all uploaded documents from the dashboard

### User Dashboard
- View all documents with status tracking (uploaded / signing / signed)
- Access and re-download signed documents
- Continue incomplete signing workflows
- Manage reusable saved signatures (drawn, typed, uploaded)

### Verification System
- Public verification endpoint: `/verify/[token]`
- Displays signer name, document title, signed timestamp, and SHA-256 hash of the original document
- No authentication required — accessible by any third party

### Audit System
- All key actions are recorded with user ID, document ID, action type, IP address, and metadata
- Users can view their own audit trail
- Admins can view platform-wide audit logs with filtering

### Administration
- Admin panel with user listing and role management
- Platform-wide document visibility
- Full audit log access with filtering by user, action type, and date

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Framework — SSR for public pages, CSR for dashboard |
| TypeScript | Type safety across the entire frontend |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Accessible component primitives |
| pdfjs-dist | In-browser PDF rendering |
| react-signature-canvas | Drawn signature capture |
| Axios | HTTP client with interceptors for token refresh |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express.js | HTTP server and API framework |
| TypeScript | Type safety across the entire backend |
| pg (node-postgres) | PostgreSQL client — raw parameterized queries, no ORM |
| multer | Multipart file upload handling |
| pdf-lib | Server-side PDF signing — embedding signature images |
| bcryptjs | Password hashing (cost factor 12) |
| jsonwebtoken | JWT access tokens (15min) + refresh tokens (7 days) |
| zod | Runtime request validation and schema enforcement |
| express-rate-limit | Rate limiting on auth and upload routes |

### Infrastructure & Services
| Service | Purpose | Free Tier |
|---|---|---|
| Supabase | PostgreSQL database + file storage | 500MB DB, 1GB storage |
| Upstash Redis | Refresh token blocklist + rate limit backing | 10,000 req/day |
| Resend | Transactional email (password recovery) | 100 emails/day |
| Vercel | Frontend deployment | Unlimited hobby |
| Render | Backend deployment | 750 hr/month |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  Next.js 14 App Router — Vercel                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Public Pages │  │  Dashboard   │  │    Admin Panel       │  │
│  │ /verify/:tok │  │  /documents  │  │    /admin/*          │  │
│  │ /login       │  │  /sign/:id   │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS (REST API)
┌───────────────────────────▼─────────────────────────────────────┐
│                    API SERVER (Express.js)                       │
│  Render — Node.js + TypeScript                                   │
│  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌────────────────────┐ │
│  │  Auth   │ │ Documents │ │ Signatures│ │  Verification /    │ │
│  │ Module  │ │  Module   │ │  Module  │ │  Admin / Audit     │ │
│  └─────────┘ └─────┬─────┘ └──────────┘ └────────────────────┘ │
│                    │                                             │
│  Middleware: authenticate → authorize → rateLimiter → validate  │
└────────┬───────────┴──────────────────────────────┬─────────────┘
         │                                          │
┌────────▼───────────┐                  ┌───────────▼─────────────┐
│  PostgreSQL         │                  │  Supabase Storage        │
│  (Supabase)         │                  │  Private bucket          │
│  users              │                  │  /documents/originals/   │
│  documents          │                  │  /documents/signed/      │
│  signatures         │                  │  /signatures/            │
│  document_signatures│                  └─────────────────────────┘
│  audit_logs         │
│  password_reset_    │                  ┌─────────────────────────┐
│    tokens           │                  │  Upstash Redis           │
│  refresh_tokens     │                  │  Refresh token blocklist │
└─────────────────────┘                  └─────────────────────────┘
```

### Request Lifecycle

1. Next.js middleware checks for a valid access token (JWT) on protected routes
2. If access token is expired, the API client calls `POST /api/auth/refresh` with the httpOnly cookie
3. A new access token is returned; the original request is retried transparently
4. On logout, the refresh token is added to the Redis blocklist (invalidated before natural expiry)

### PDF Signing Lifecycle

```
1. User uploads PDF
        ↓
2. Backend validates MIME type + magic bytes (%PDF header)
        ↓
3. Original PDF stored in Supabase Storage (originals/)
   SHA-256 of original computed and stored in DB
        ↓
4. Frontend renders PDF pages on <canvas> using pdfjs-dist
        ↓
5. User selects saved signature, drags it onto the page
   Frontend captures: { signatureId, page, x%, y%, width%, height% }
   (percentage-based coordinates — resolution-independent)
        ↓
6. POST /api/documents/:id/sign
        ↓
7. Backend fetches original PDF from Supabase Storage
   Fetches signature image (PNG) from Supabase Storage
   Uses pdf-lib to embed signature at computed absolute coordinates
   Saves signed PDF back to Supabase Storage (signed/)
        ↓
8. Document status updated to 'signed'
   verification_token already exists (UUID, generated at upload)
   Audit log written: DOCUMENT_SIGNED
        ↓
9. User downloads signed PDF via presigned URL (1hr expiry)
```

---

## Database Design

### Schema

```sql
-- Users
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens (for blocklist on logout)
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);

-- Documents
CREATE TABLE documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               VARCHAR(255) NOT NULL,
  original_file_key   TEXT NOT NULL,      -- Supabase Storage path
  signed_file_key     TEXT,               -- NULL until signed
  file_hash           TEXT NOT NULL,      -- SHA-256 of original
  status              VARCHAR(20) NOT NULL DEFAULT 'uploaded',  -- uploaded | signing | signed
  verification_token  UUID UNIQUE DEFAULT gen_random_uuid(),
  page_count          INT,
  file_size_bytes     BIGINT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Saved reusable signatures
CREATE TABLE signatures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       VARCHAR(100),              -- e.g. "My Primary Signature"
  type        VARCHAR(20) NOT NULL,      -- 'drawn' | 'typed' | 'uploaded'
  image_key   TEXT NOT NULL,            -- Supabase Storage path (PNG)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Applied signatures on documents (supports multi-signer in future)
CREATE TABLE document_signatures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  signature_id  UUID NOT NULL REFERENCES signatures(id),
  page          INT NOT NULL,
  x             FLOAT NOT NULL,         -- percentage of page width
  y             FLOAT NOT NULL,         -- percentage of page height
  width         FLOAT NOT NULL,
  height        FLOAT NOT NULL,
  signed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trail
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
  action       VARCHAR(50) NOT NULL,
  metadata     JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Password recovery
CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ
);
```

### Design Decisions

- **UUID primary keys** — avoids sequential ID enumeration attacks on public routes
- **`verification_token` is a separate UUID on `documents`** — decoupled from `id`, safe to expose publicly; a third party knowing the verification token learns nothing about other documents
- **`file_hash` (SHA-256) stored at upload time** — enables tamper detection; if the original file is ever modified in storage, the hash will not match
- **`signed_file_key` is a separate storage path** — the original PDF is never overwritten; both original and signed versions are preserved independently
- **Coordinates stored as percentages** in `document_signatures` — page-size-independent; signature placement is correct regardless of the PDF's actual pixel dimensions at render time
- **`document_signatures` as a join table** — designed to support multiple signers per document in the future without schema changes
- **`audit_logs.metadata` as JSONB** — flexible per-action context (e.g., stores `{ from: 'uploaded', to: 'signed' }` for status changes) without needing separate columns per action type
- **`refresh_tokens` table vs. Redis-only** — Redis stores the blocklist for fast lookup on every request; the DB table provides a durable record for audit purposes
- **Raw `pg` queries, no ORM** — full control over query structure, explicit parameterization, no hidden N+1 issues

### Tracked Audit Actions

```
USER_REGISTERED
USER_LOGIN
USER_LOGOUT
DOCUMENT_UPLOADED
DOCUMENT_VIEWED
DOCUMENT_SIGNED
DOCUMENT_DOWNLOADED
DOCUMENT_DELETED
SIGNATURE_CREATED
SIGNATURE_DELETED
VERIFICATION_CHECKED
PASSWORD_RESET_REQUESTED
PASSWORD_RESET_COMPLETED
```

---

## API Overview

All API routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <access_token>` header. Admin routes additionally require `role = 'admin'`.

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login, returns access token + sets refresh cookie |
| POST | `/auth/logout` | Protected | Revoke refresh token |
| POST | `/auth/refresh` | Cookie | Issue new access token |
| POST | `/auth/forgot-password` | Public | Send password reset email |
| POST | `/auth/reset-password` | Public | Reset password using token |

### Documents

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/documents` | Protected | Paginated list of own documents |
| POST | `/documents` | Protected | Upload a PDF (multipart/form-data) |
| GET | `/documents/:id` | Protected | Get document details |
| DELETE | `/documents/:id` | Protected | Delete document and its storage files |
| GET | `/documents/:id/download` | Protected | Redirect to presigned download URL |
| POST | `/documents/:id/sign` | Protected | Apply signature to document |

### Signatures

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/signatures` | Protected | List own saved signatures |
| POST | `/signatures` | Protected | Save a new signature (multipart PNG) |
| DELETE | `/signatures/:id` | Protected | Delete a saved signature |

### Verification (Public)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/verify/:token` | Public | Verify document by verification token |

### Audit

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/audit-logs` | Protected | Own audit logs (paginated) |

### Admin

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/admin/users` | Admin | All users (paginated) |
| PATCH | `/admin/users/:id/role` | Admin | Update user role |
| GET | `/admin/documents` | Admin | All documents (paginated) |
| GET | `/admin/audit-logs` | Admin | All audit logs with filters |

### Request / Response Format

All endpoints accept and return `application/json`. File upload endpoints use `multipart/form-data`.

Error responses follow a consistent structure:
```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [ ]
}
```

Success responses:
```json
{
  "success": true,
  "data": { }
}
```

---

## Folder Structure

```
docsign/
├── apps/
│   ├── web/                              # Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── (public)/
│   │   │   │   ├── page.tsx             # Landing page
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   ├── forgot-password/page.tsx
│   │   │   │   ├── reset-password/page.tsx
│   │   │   │   └── verify/[token]/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx           # Auth guard
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── documents/page.tsx
│   │   │   │   ├── documents/[id]/page.tsx
│   │   │   │   ├── documents/[id]/sign/page.tsx
│   │   │   │   └── signatures/page.tsx
│   │   │   └── (admin)/
│   │   │       ├── layout.tsx           # Role guard
│   │   │       ├── admin/page.tsx
│   │   │       ├── admin/users/page.tsx
│   │   │       ├── admin/documents/page.tsx
│   │   │       └── admin/audit-logs/page.tsx
│   │   ├── components/
│   │   │   ├── ui/                      # shadcn/ui primitives
│   │   │   ├── signature/
│   │   │   │   ├── SignaturePad.tsx     # Canvas draw
│   │   │   │   ├── SignatureUpload.tsx  # Upload PNG
│   │   │   │   └── SignatureTyped.tsx   # Typed text → image
│   │   │   ├── document/
│   │   │   │   ├── PDFViewer.tsx       # pdfjs-dist renderer
│   │   │   │   ├── SigningOverlay.tsx  # Draggable signature placement
│   │   │   │   └── DocumentCard.tsx
│   │   │   └── layout/
│   │   │       ├── Navbar.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts           # Axios instance with interceptors
│   │   │   ├── auth.ts                 # Token helpers
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useDocument.ts
│   │   ├── types/index.ts
│   │   └── middleware.ts               # Next.js route protection
│   │
│   └── server/                          # Express + TypeScript backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.routes.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   └── auth.schema.ts   # Zod schemas
│       │   │   ├── documents/
│       │   │   │   ├── documents.routes.ts
│       │   │   │   ├── documents.controller.ts
│       │   │   │   ├── documents.service.ts
│       │   │   │   └── documents.schema.ts
│       │   │   ├── signatures/
│       │   │   ├── verification/
│       │   │   ├── audit/
│       │   │   └── admin/
│       │   ├── middleware/
│       │   │   ├── authenticate.ts      # Verify JWT, attach user to req
│       │   │   ├── authorize.ts         # Role guard factory
│       │   │   ├── rateLimiter.ts       # express-rate-limit configs
│       │   │   ├── upload.ts            # Multer: MIME + size validation
│       │   │   └── errorHandler.ts      # Global error boundary
│       │   ├── lib/
│       │   │   ├── db.ts               # pg Pool instance
│       │   │   ├── supabase.ts         # Supabase storage client
│       │   │   ├── redis.ts            # Upstash Redis client
│       │   │   └── mailer.ts           # Resend email client
│       │   ├── utils/
│       │   │   ├── hash.ts             # bcrypt + SHA-256 helpers
│       │   │   ├── token.ts            # JWT sign/verify helpers
│       │   │   └── pdf.ts              # pdf-lib signing logic
│       │   ├── types/index.ts
│       │   └── app.ts
│       ├── migrations/
│       │   ├── 001_users.sql
│       │   ├── 002_documents.sql
│       │   ├── 003_signatures.sql
│       │   ├── 004_audit_logs.sql
│       │   └── 005_password_reset_tokens.sql
│       └── tsconfig.json
├── docker-compose.yml                   # Local dev (Postgres + Redis)
├── package.json                         # Workspace root
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Node.js >= 18
- Docker + Docker Compose (for local dev)
- Supabase account (free)
- Upstash account (free)
- Resend account (free)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/docsign.git
cd docsign
npm install
```

### 2. Local Development (Docker)

Start a local PostgreSQL and Redis instance:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 3. Run Database Migrations

```bash
cd apps/server
npm run migrate
```

This runs all SQL files in `migrations/` in order against your configured `DATABASE_URL`.

### 4. Configure Environment Variables

Copy the example files and fill in your values:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

See [Environment Variables](#environment-variables) section below.

### 5. Start Development Servers

```bash
# From root
npm run dev
```

This runs both frontend (port 3000) and backend (port 4000) concurrently.

---

## Environment Variables

### Backend — `apps/server/.env`

```env
# Server
PORT=4000
NODE_ENV=development

# Database (Supabase PostgreSQL connection string)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# JWT
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Supabase Storage
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=docsign

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://[endpoint].upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Resend (Email)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App
FRONTEND_URL=http://localhost:3000
```

### Frontend — `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## Deployment Information

| Component | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://docsign.vercel.app |
| Backend API | Render | https://docsign-api.onrender.com |
| Database | Supabase | Managed |
| File Storage | Supabase Storage | Managed |

### Deployment Notes

- **Render cold start:** The backend on Render's free tier may take 20–30 seconds to respond to the first request after a period of inactivity. This is a platform constraint; subsequent requests respond normally.
- **Vercel:** Frontend is deployed automatically on every push to `main`.
- **Render:** Backend is deployed automatically on every push to `main` via the Render GitHub integration.
- **Supabase Storage bucket** must be set to **private** — all file access is through server-side presigned URLs only. Never expose the public bucket URL.

### Docker (Local Dev Only)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: docsign
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

## Demo Credentials

### User Account
```
Email:    demo@docsign.app
Password: Demo@12345
```

### Admin Account
```
Email:    admin@docsign.app
Password: Admin@12345
```

---

## Security Practices

- **Passwords** hashed with `bcrypt` at cost factor 12
- **JWT access tokens** expire in 15 minutes; stored in memory (not localStorage)
- **JWT refresh tokens** expire in 7 days; stored in httpOnly, Secure, SameSite=Strict cookie
- **Refresh token invalidation** via Redis blocklist on logout — tokens cannot be reused after logout
- **File upload validation** — MIME type check + magic byte check (`%PDF` header); extension alone is not trusted
- **File size limit** — 20MB enforced at Multer middleware level
- **Supabase Storage** — private bucket; all access via presigned URLs with 1-hour expiry
- **Parameterized SQL queries** — no string interpolation; raw `pg` queries only
- **Input validation** — all request bodies validated with `zod` schemas before reaching controllers
- **Rate limiting** — auth routes (login, register, forgot-password) limited to 10 requests per 15 minutes per IP
- **CORS** — explicit origin whitelist (frontend URL only)
- **Role-based authorization** — admin routes protected by `authorize('admin')` middleware factory
- **Document ownership** — service layer checks `user_id` match before any document operation

---

## Assumptions Made

- A user signs a document with a single signature placement per signing session (multiple placements on different pages would require additional UI work; the schema supports it)
- Password recovery sends an email link; the reset token is valid for 1 hour and single-use
- The admin role is assigned manually via the admin panel's role update endpoint; there is no self-serve admin registration
- Verification is read-only — it confirms whether a document was signed through this platform; it does not validate the PDF's contents against legal standards
- Free-tier infrastructure is acceptable for the MVP (Render cold start is a known trade-off)
- Email verification on registration is not implemented; users can log in immediately after registering

---

## Known Limitations

- Render free tier causes a ~30-second cold start after inactivity — not suitable for SLA-bound production workloads
- Supabase free tier limits storage to 1GB and the database to 500MB
- Upstash free tier limits Redis to 10,000 requests/day — sufficient for demo use, not for high-traffic production
- Multi-signer workflows (multiple users signing the same document in sequence) are not implemented in the UI; the schema (`document_signatures`) is designed to support them
- No real-time notifications — users must manually refresh to see document status updates
- Typed signatures are rendered as a styled text image on the client side; font choice is limited to the bundled web fonts

---

## Future Improvements

- **Multi-signer workflows** — invite additional signers, enforce signing order, notify each signer by email
- **Signing request links** — generate a one-time link to send a document to an external party for signing without requiring them to register
- **WebSocket / SSE notifications** — real-time status updates when a document is signed or a signing request is completed
- **Two-factor authentication** — TOTP or SMS-based 2FA for account security
- **Audit log export** — download audit logs as CSV for compliance purposes
- **Document templates** — reusable document templates with predefined signature placement fields
- **Bulk operations** — upload and send multiple documents for signing in a single workflow
- **Advanced admin analytics** — document volume, signing completion rates, user activity charts
- **Rate limit upgrade** — migrate to Upstash paid tier or self-hosted Redis for production-scale traffic
- **Legal compliance** — explore eIDAS (EU) or ESIGN Act (US) compliance for legally binding electronic signatures
