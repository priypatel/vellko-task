# DocSign — Deployment Guide

This guide deploys the backend to **Render**, the frontend to **Vercel**, with
**Supabase** (Postgres + Storage), **Upstash** (Redis), and **Resend** (email).

---

## 1. Supabase (Database + File Storage)

1. Create a project at https://supabase.com.
2. **Storage → New bucket** → name it **`docsign`** → keep **Public OFF** (private).
3. Get credentials:
   - **Project Settings → Data API / API** → copy **Project URL** and the
     **`service_role`** key.
   - **Project Settings → Database → Connection string (URI)** → copy the
     pooled connection string for `DATABASE_URL`.
4. Run migrations and seed against the Supabase database (from `apps/server`):
   ```bash
   DATABASE_URL="<supabase-connection-string>" npm run migrate
   DATABASE_URL="<supabase-connection-string>" npm run seed
   ```
   The `originals/`, `signed/`, and `signatures/` folders are created
   automatically on first upload.

## 2. Upstash (Redis — refresh-token blocklist)

1. Create a Redis database at https://upstash.com.
2. Copy the **REST URL** and **REST TOKEN** →
   `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
   (Optional locally — logout still works without it; revoked tokens just
   aren't blocked until natural expiry.)

## 3. Resend (Transactional email — password reset)

1. Create an account at https://resend.com and an API key → `RESEND_API_KEY`.
2. **Domains → Add domain** you own → add the DNS records → verify.
   Then set `RESEND_FROM_EMAIL=noreply@yourdomain.com`.
   - Without a verified domain you may use `onboarding@resend.dev`, but Resend
     test mode only delivers to your own Resend account email.

## 4. Backend → Render

1. Push the repo to GitHub.
2. Render → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `apps/server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/app.js`
   - **Health Check Path:** `/api/health`
4. Add environment variables (from `.env.example`):
   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=...
   JWT_ACCESS_SECRET=...           # long random string (32+ chars)
   JWT_REFRESH_SECRET=...          # different long random string
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   SUPABASE_STORAGE_BUCKET=docsign
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   RESEND_API_KEY=...
   RESEND_FROM_EMAIL=...
   FRONTEND_URL=https://<your-vercel-app>.vercel.app
   ```
5. Deploy. Verify: `curl https://<service>.onrender.com/api/health`
   → `{"success":true,"message":"OK","timestamp":"..."}`.

> Render free tier sleeps after inactivity — the first request may take
> 20–30s (cold start), then responds normally.

## 5. Frontend → Vercel

1. Vercel → **Add New → Project** → import the repo.
2. Settings:
   - **Root Directory:** `apps/web`
   - **Environment Variable:**
     `NEXT_PUBLIC_API_URL=https://<service>.onrender.com/api`
3. Deploy. Open the Vercel URL and log in with the seeded demo accounts.

## 6. Final wiring

- Set Render's `FRONTEND_URL` to the deployed Vercel URL (CORS + reset links).
- Redeploy the backend if you changed `FRONTEND_URL`.

## Demo credentials (from the seed)

```
User:   demo@docsign.app  / Demo@12345
Admin:  admin@docsign.app / Admin@12345
```
