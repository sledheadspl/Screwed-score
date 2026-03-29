# GetScrewedScore — Setup Guide

## Stack
- Next.js 14 App Router + TypeScript
- Supabase (DB + Auth + Storage)
- Anthropic Claude API (reuses ContractGuard's API key)
- Tailwind CSS + shadcn-style components

## 1. Install dependencies

```bash
cd getscrewedscore
npm install
```

## 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
  → From your Supabase project settings (can reuse ContractGuard's project or create new)
- `ANTHROPIC_API_KEY` → Same key as ContractGuard
- `CONTRACTGUARD_FUNCTION_URL` → Your deployed analyze-contract edge function URL
  e.g. `https://xxx.supabase.co/functions/v1/analyze-contract`
- `CONTRACTGUARD_FUNCTION_KEY` → Your Supabase service role key (used as Bearer token)

## 3. Set up Supabase

### Option A: Reuse ContractGuard's Supabase project (recommended)
Run only the GetScrewedScore-specific tables — they don't conflict.

### Option B: New Supabase project
Create a new project and run the full migration.

Either way, run in Supabase SQL Editor:
```
supabase/migrations/001_schema.sql
```

### Create Storage bucket
In Supabase Dashboard → Storage → New bucket:
- Name: `documents`
- Public: false
- File size limit: 10MB

## 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

## 5. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add all environment variables in Vercel dashboard → Settings → Environment Variables.

## Architecture

### Analysis Flow
1. User drops file → `POST /api/upload`
   - Extracts text (pdf-parse / mammoth / Claude vision)
   - Rate limits by IP (2 free analyses per 24h)
   - Saves document to DB + Storage
   - Returns `document_id` + `extracted_text`

2. Client calls `POST /api/analyze`
   - Calls ContractGuard edge function (or direct Anthropic fallback)
   - Runs overcharge detection layer
   - Computes Screwed Score
   - Saves full analysis to DB
   - Returns `analysis_id` + full result

3. Share page: `/r/{id}`
   - Server-rendered from DB
   - Public, no auth required
   - SEO-optimized OG tags

### ContractGuard Integration
The `lib/contractguard.ts` wrapper calls your existing `analyze-contract` edge function.
If `CONTRACTGUARD_FUNCTION_URL` is not set, it falls back to a direct Anthropic call
using the same prompt structure as ContractGuard.

### Rate Limiting
Anonymous users: 2 free analyses per IP per 24 hours.
Tracked in the `rate_limits` table (SHA-256 hashed IPs only).

## Next Steps (after MVP validation)
1. Add Supabase Auth (magic link) for saving history
2. Add Stripe for content generation paywall
3. Add content generation (script + caption + hook)
4. Add TikTok/Instagram OAuth + direct post
5. Add video generation (Creatomate/Shotstack)
