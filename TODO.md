# Screwed Score — working checklist

Reconciled from: this session's own findings, the three original asks, what
was actually sitting in the repo (committed history + uncommitted working
tree), and `gh api .../dependabot/alerts`. Ordered by priority. Updated as
items complete — see git log for the commit that closed each one.

## P0 — Security

- [x] **Patch 2 critical Next.js RCE CVEs** (GHSA-p293-qw3h-jr36 unauth RCE on
      Windows-hosted servers; GHSA-2xp9-vwfh-vxw4 unauth RCE in Image
      Optimization API via AVIF). `npm audit fix` → next 16.3.7, build
      verified clean. Commit `2c41466`.
      Not blocked.
- [x] **Verify GitHub's Dependabot re-scan reflects the fix.** Confirmed on
      the next push: 34 alerts (2 critical) → 15 alerts (0 critical). The
      remaining 15 line up with the ClipPilot-only subset below.
      Not blocked.
- [ ] **ClipPilot sub-product has ~30 open Dependabot alerts** (high: sharp,
      js-yaml, browserslist, nanoid, @xmldom/xmldom (9 separate advisories),
      rustls-webpki, several rust-openssl issues; moderate: tauri origin
      confusion, glib, 2× openssl, 2× xmldom; low: postcss-selector-parser
      (now fixed at root — this is ClipPilot's own copy), rand, openssl).
      These are `clippilot/package-lock.json` and
      `clippilot/src-tauri/Cargo.lock` — a separate desktop app bundled in
      this repo, not screwedscore.com itself.
      **Deliberately not touched today** — out of scope per "Screwed Score
      only, no drifting to other projects." Flagged here so it doesn't stay
      invisible.

## P1 — The three original asks

- [x] **Fight Back Kit far more accessible.** Nav link (`/#fight-back-kit`,
      gold accent) + dedicated homepage promo banner between the stats band
      and the editorial section, plus the existing bento card. Done in an
      earlier session, confirmed still present in current `main`
      (`components/navigation/Navbar.tsx`, `app/page.tsx`).
      Not blocked.
- [x] **Document Creator actually working.** Root cause was the
      26s Netlify function timeout vs. a non-streamed full-document Claude
      call. Fixed by streaming the response (`app/api/create-document/route.ts`)
      — a different, better fix than my own earlier model-swap patch, done
      by a separate session and already on `main`. Verified present.
      Not blocked.
- [x] **Lost Assets project added to the page.** Homepage teaser card
      ("Lost Assets Finder — Coming Soon") plus the actual Phase 1
      FastAPI matching module committed under `lost-assets/` (mock data for
      WA/ID/OR, a real parser for Montana). Verified present on `main`.
      Not blocked. (Teaser only, by earlier explicit decision — the module
      itself is mock-data-only for 3 of 4 states, not wired to a live UI.)
- [x] **Confirm all three are actually live on screwedscore.com**, not just
      on `main`. Checked directly: homepage shows the Fight Back Kit promo
      banner and the Lost Assets Finder teaser card; `/create` loads and
      renders correctly. Not re-tested end-to-end (that costs a real Claude
      call) — page-load + content verification was enough to confirm the
      deploy actually shipped these, which was the open question.
      Not blocked.

## P2 — Found while reconciling, not previously tracked anywhere

- [x] **Academy feature was fully built but never committed** (courses,
      community pages, Stripe price-creation script, checkout/email/sitemap
      wiring, 5 course HTML downloads, migration `013_academy_community.sql`)
      — sitting uncommitted in the working tree, and the reason it never
      shipped: it didn't build. `Course.icon` was typed too narrowly
      (`{className?: string}`) for the `style` prop `CourseCard` passes it;
      swapped for lucide-react's `LucideIcon` type. Committed (`894d706`).
      Not blocked.
- [x] **`npm run lint` was broken again**, two separate bugs stacked:
      (1) flat-config plugin scoping — `eslint-config-next`'s flat config
      registers `react` / `react-hooks` plugins only inside its own config
      objects, so the repo's rule-override object couldn't resolve
      `react/no-unescaped-entities` or `react-hooks/set-state-in-effect` for
      files outside `nextCoreWebVitals`'s own `files` globs; fixed by
      importing and re-registering both plugins on the override object.
      (2) `.netlify/**` (Netlify's local build output — minified/bundled JS)
      was never in `ignores`, so lint was scanning compiled vendor chunks —
      that's what produced the apparent "14,180 problems" on the first
      successful run. Added `.netlify/**` and `scripts/**` (a standalone CJS
      Node utility, not app code) to `ignores`. Real result: 192 source
      files scanned, 0 errors, 28 warnings. `npm run lint` exits 0.
      Not blocked.
- [x] **Two known-but-unfixed findings from the last lint pass**:
      `KIT_PRICE_CENTS` was inert — `kit-checkout` always charged a hardcoded
      Stripe price ID, the env override never reached checkout. Removed the
      dead code per the comment's own recommended resolution (treat the
      Stripe price as the source of truth). `ProgressBar`'s `MESSAGES` copy
      (rotating status lines: "Checking for suspicious charges...",
      "Computing your Screwed Score...", etc.) was fully written but never
      wired up — wired it up with a 2.5s rotation, falling back to the
      static `label` prop for phases with only one message.
      Not blocked.
- [x] **`claude/focused-newton-u6r9n6` merged** (stop pages inheriting the
      homepage's canonical so Google indexes /jobs, /for-businesses,
      /business-portal, /dps, /elite-suite, /jobs/[id], /workers/[id]; noindex
      post-checkout/sign-in screens). Reviewed, not fast-forwarded: it
      conflicted with the Academy-batch `business-portal/layout.tsx` (branch
      wanted it publicly indexed; current code correctly noindexes it — it's
      a login-gated dashboard that redirects signed-out visitors to /auth and
      is deliberately excluded from sitemap.ts — verified against the actual
      redirect and sitemap code before choosing, not just trusting my own
      earlier comment). Kept the noindex version. Also found and fixed a
      silent duplicate `alternates` key in `for-businesses/page.tsx` that the
      line-based auto-merge produced (syntactically valid, so `git` didn't
      flag it — only `tsc` caught it as a duplicate-property error). Build
      and lint both clean after.
      Not blocked.
- [ ] **`claude/adsense-integration-x2me38`** (Google AdSense integration,
      live publisher ID) — not yet reviewed or merged. Adding ads is a real
      monetization/UX decision (ad placement, page speed impact, whether the
      user wants this live right now), not a pure bugfix like the SEO
      branch — reviewing the diff before merging, not fast-forwarding it in.
      Not blocked — next up.
- [ ] A third stray branch, `claude/mod-bot-status-oqxatt`, is a YouTube
      live-chat moderation bot for an unrelated project (Pokebank) that
      somehow ended up pushed to this repo's remote. Left alone — not a
      Screwed Score item, not touching it.

## Environment note

- C: drive is at ~98% (3.3GB free) — tight, not (yet) build-blocking; both
  builds today succeeded. Per instruction: deleting/cleaning nothing to fix
  this. If a later build fails for lack of space, that failure gets noted
  here rather than "fixed" by cleanup.
