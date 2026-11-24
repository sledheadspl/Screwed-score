# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session memory (Notion)

Every session — PC, VPS, cloud or app — shares one memory: **Notion Memory** (the Notion connector, `fetch` with id `"memory"`). Local memory files don't carry between machines or cloud containers, so don't rely on them.

- **At the start:** fetch Notion Memory and run `memory-search` for the topic at hand before asking the owner for anything they may already have provided.
- **Before finishing:** save or update durable facts, decisions, next steps and where things live (`notion-create-pages` with parent `"memory"`; update the existing topic instead of duplicating it).
- **Never** store secrets (keys, tokens, passwords) — note only where a credential lives or that it's missing.

## Project

**screwedscore.com** — AI-powered consumer protection tool. Users upload bills, invoices, or contracts; the app runs two Claude AI passes (contract analysis + overcharge detection) and returns a SCREWED / MAYBE / SAFE rating with specific findings.

### Hosting (since 2026-11-24): Hostinger VPS, shared with Pack Pursuit

Production runs on the Hostinger VPS **82.180.173.218** (`srv2142114.hstgr.cloud`, Debian 13), **behind Pack Pursuit's shared Caddy "front door"**.

- **DNS (Cloudflare zone `screwedscore.com`)** — `@`, `www` and `origin` are A records → 82.180.173.218, **DNS only (grey cloud)**. Cloudflare's proxy is off, so nothing Cloudflare-side (redirects, caching, WAF) applies any more. Caddy holds the Let's Encrypt certificates and renews them itself.
- **Apex** — `screwedscore.com` reaches the app directly and is 308-redirected to the canonical `https://www.screwedscore.com` by `redirects()` in `next.config.ts` (it used to be a Cloudflare redirect). Keep that redirect in the app; don't add it to Caddy.
- **Container** — `/opt/screwedscore/compose.yaml`, project `screwedscore`, service `web` (image `screwedscore-app`, built from `/opt/screwedscore/src` with `next start` on port 3000). It joins the external network `packpursuit-sites` with alias `screwedscore-web`; its own network is `screwedscore_net`. Limits: 512 MB RAM, 1 CPU, 256 PIDs; json-file logs 3×10 MB. Runtime config comes from `/opt/screwedscore/.env` (never commit it). Routing lives in `packpursuit-site.json` (domains, upstream `screwedscore-web:3000`, healthPath `/`, maxBodyMB 12).
- **Deploy** — rebuild and recreate only this project, from `/opt/screwedscore`: `docker compose build web && docker compose up -d web`. Pushing to `main` does **not** update the live site.
- **Netlify** — the old site `getscrewedscore` (id `5e2b2f50-1c96-453d-94e1-55badd24ac09`) still builds on pushes to `main` and still runs `netlify/functions/nurture-cron.ts`, but it no longer serves the domain. `fix-netlify-handler.js` is a legacy no-op kept in the build script.

**VPS hard rules — Pack Pursuit's contract. Never break these:**
- Never touch anything `packpursuit-*` (containers, networks, volumes, files, `/opt/packpursuit`, `/etc/packpursuit`).
- No `docker system/image/volume/network prune`, never restart the Docker daemon, no firewall (nftables) changes, **no host ports** (`ports:`) in our compose — only `expose`.
- Caddy is changed **only** through `python3 -I /usr/local/sbin/packpursuit-front-door` (`--list`, `--add screwedscore`). Never edit its Caddyfile or restart its container.
- Keep our resource limits. Anything that writes to disk must be bounded — the disk is shared (see the upload temp-file cleanup and `images.maximumDiskCacheSize`).
- Client IPs: trust only the rightmost `X-Forwarded-For` entry (set by Caddy) via `clientIp()` in `lib/rate-limit.ts`. Headers like `x-real-ip` / `cf-connecting-ip` pass through Caddy untouched and are forgeable.

## Commands

```bash
npm run dev           # local dev at http://localhost:3000
npm run dev:local     # dev exposed on LAN (for mobile testing)
npm run build         # next build + fix-netlify-handler.js (always run before declaring done)
npm run lint          # ESLint
```

Deploy: on the VPS — see "Hosting" above (`netlify deploy --prod` only updates the retired Netlify site).

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
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Optional AdSense override. The live publisher ID is hardcoded in `lib/adsense.ts`; set this to another `ca-pub-…` ID to override, or to `off` to disable ads and `/ads.txt`. AdSense is off automatically outside production builds. |

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
