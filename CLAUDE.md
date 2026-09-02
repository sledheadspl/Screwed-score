# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**screwedscore.com** — AI-powered consumer protection tool. Users upload bills, invoices, or contracts; the app runs two Claude AI passes (contract analysis + overcharge detection) and returns a SCREWED / MAYBE / SAFE rating with specific findings.

Deployed on **Netlify** via `@netlify/plugin-nextjs`. The production Netlify site is **`getscrewedscore`** (id `5e2b2f50-1c96-453d-94e1-55badd24ac09`) — verify `.netlify/state.json` points there before deploying; a second site `resonant-panda-b682ce` exists but serves no domain. Cloudflare fronts the domain: apex `screwedscore.com` 301s to canonical `https://www.screwedscore.com`. Pushing to `main` on GitHub (sledheadspl/Screwed-score) triggers a CI deploy; `netlify deploy --prod` also works. `fix-netlify-handler.js` is a legacy no-op kept in the build script (plugin v5 no longer produces the file it patched).

## Commands

```bash
npm run dev           # local dev at http://localhost:3000
npm run dev:local     # dev exposed on LAN (for mobile testing)
npm run build         # next build + fix-netlify-handler.js (always run before declaring done)
npm run lint          # ESLint
```

Deploy: `netlify deploy --prod`

## Environment Variables

Required in `.env.local` (copy from `getscrewedscore.env` on Desktop):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase key (API routes only) |
| `ANTHROPIC_API_KEY` | Claude API (shared with ContractGuard) |
| `CONTRACTGUARD_FUNCTION_URL` | Supabase edge function URL (optional — falls back to direct Anthropic) |
| `CONTRACTGUARD_FUNCTION_KEY` | Bearer token for edge function |
| `GSS_TOKEN_SECRET` | HMAC secret for `gss_pro` Stripe cookies |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Google AdSense publisher ID, `ca-pub-…` (optional — unset disables the ad script, ad slots, and `/ads.txt`) |

## Architecture

### Routing

Mixed Next.js App Router (`app/`) and Pages Router (`pages/`). API routes are split: newer routes live in `app/api/`, but checkout/payment routes (`checkout`, `kit-checkout`, `product-checkout`, `verify-checkout`, `kit-generate`), `analyze`, and `upload` live in `pages/api/`. Prefer `app/api/` for new routes.

No middleware/proxy file — Next middleware broke Netlify edge bundling on Windows. Security headers, CSP, and `Netlify-CDN-Cache-Control` edge caching all live in `next.config.ts` `headers()`.

Key routes:
- `/` — main upload + analysis UI (`app/page.tsx`)
- `/r/[id]` — public shareable result page (server-rendered, SEO-optimized)
- `/clippilot` — ClipPilot license checkout (`app/clippilot/`)
- `/community`, `/shame` — seeded by Supabase tables `experiences` + `business_scores` (currently empty)

### Analysis Pipeline (two-pass AI)

`POST /api/automation/run` (or the main flow via upload → analyze):

1. **Upload** — file → text extraction (`lib/extract.ts`): PDF via `pdf-parse`, DOCX via `mammoth`, images via Claude vision. Magic-byte validation before parsing.
2. **ContractGuard pass** (`lib/contractguard.ts`) — calls the Supabase edge function if `CONTRACTGUARD_FUNCTION_URL` is set; falls back to a direct `claude-sonnet` call with the same prompt. Returns `ContractGuardOutput`.
3. **Overcharge pass** (`lib/overcharge.ts`) — second direct Anthropic call, receives document text + ContractGuard red flags as context. Returns `OverchargeOutput`.
4. **Score** (`lib/score.ts`) — pure functions, no side effects. `computeScrewedScore()` combines both outputs into a 0–100 point total. `buildFindings()` merges red flags + flagged line items. `assembleResult()` builds the full `AnalysisResult`.
5. Result saved to Supabase `analyses` table; returned to client.

### Supabase Usage

- `lib/supabase.ts` exports two clients: `createServiceClient()` for server/API routes (service role key), `supabase` proxy for browser components (anon key).
- Schema migrations in `supabase/migrations/001_schema.sql`.
- Storage bucket: `documents` (private, 10MB limit).
- Rate limiting: `rate_limits` table, SHA-256 hashed IPs, 2 free analyses per IP per 24h.

### Auth / Paywall

`lib/auth.ts` — HMAC-signed tokens (`gss_pro` cookie) issued by `/api/webhooks/stripe` after successful Stripe checkout. `verifyToken()` used in server components to gate paid features. No Supabase Auth — token-only for now.

### Key Types (`lib/types.ts`)

- `DocumentType` — 12 supported document types detected by keyword rules (`lib/detect.ts`)
- `ContractGuardOutput` — AI analysis result (red flags, grade, missing protections, etc.)
- `OverchargeOutput` — line-item pricing analysis with flagged amounts
- `ScrewedScore` — `'SCREWED' | 'MAYBE' | 'SAFE'`
- `AnalysisResult` — full assembled result stored in DB and returned to client

### ClipPilot (sub-product)

`app/clippilot/` — Stripe checkout for ClipPilot desktop licenses. License validation via `app/api/clippilot-license/`. The ClipPilot desktop app itself lives at `C:/Users/WSC LLC/getscrewedscore/clippilot/` (Tauri + Vite).

## Important Constraints

- `mammoth` is in `serverExternalPackages` — never import it from client components.
- `fix-netlify-handler.js` must run after every build before deploying. It's part of `npm run build` but verify `netlify.toml` still has `command = "npm run build"` after any config changes.
- API routes in `app/api/` have a 26-second Netlify function timeout (`netlify.toml`). Keep AI calls within ~45s with abort controllers.
- Never nest route files inside `pages/api/` — all API routes use App Router.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
