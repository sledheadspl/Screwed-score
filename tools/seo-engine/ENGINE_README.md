# Screwedscore Growth Engine

Free, runs from your laptop, no monthly cost beyond pennies of Claude API
usage per article.

This package is **two things**:

1. **`screwedscore_seo.py`** — an automated long-tail SEO content engine.
   Generates 1,500–2,200 word articles targeting consumer-protection search
   intent and writes them to `./articles/` as Next.js-ready markdown.
1. **`distribution_kit.md`** — copy-paste templates for the parts of growth
   that should NOT be automated (Reddit, Facebook, TikTok). Read the “Why
   not auto-post?” section below before asking why.

-----

## Why this and not “auto-post everywhere”?

You asked for a program that does everything. Here’s the honest truth:

|Channel            |Automate?    |Why                                                                                                                                                                                             |
|-------------------|-------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**SEO blog**       |✅ Yes — fully|The single highest-ROI automation. Google rewards depth + breadth at scale, no platform ToS issue, compounding traffic.                                                                         |
|**TikTok / Shorts**|❌ No         |Your unique edge is **you on camera as the mechanic-founder**. Automated content erases the only thing competitors can’t copy. The script side (hooks, scripts) is in the kit.                  |
|**Reddit**         |❌ No         |Auto-posting to Reddit will shadowban your account AND your domain inside a week. Reddit’s anti-spam is aggressive and your site will get blacklisted across subs. Comment templates in the kit.|
|**Facebook Groups**|❌ No         |Same problem. Plus Facebook detects automated activity from new accounts in days. The kit has post templates you can paste manually in 20 minutes.                                              |

The SEO engine is the *compounding* play. The kit is the *fast* play.
You need both, but only one of them belongs in code.

-----

## Setup (5 minutes)

```bash
cd screwedscore-engine
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
copy .env.example .env          # then open .env and paste your API key
```

Get an API key at https://console.anthropic.com/settings/keys. New accounts
get free credits.

-----

## Usage

**See the full topic plan (no API calls, free):**

```bash
python screwedscore_seo.py --plan
```

This prints every keyword the engine is configured to write. You’ll see
~600+ topics out of the box. Skim it. Edit `SERVICES`, `STATES`, or
`PATTERNS` at the top of the script to add your own.

**Generate your first batch:**

```bash
python screwedscore_seo.py --count 5
```

Writes 5 articles to `./articles/`, logs every API call’s token usage, and
saves state so you can resume.

**Scale up:**

```bash
python screwedscore_seo.py --count 50
```

50 articles costs roughly $1–3 in API spend (prompt caching kicks in after
the first call and cuts ~90% off the input cost for every subsequent one).

**Pick up where you left off:**
Just run again. The script reads `.engine_state.json` and skips finished
slugs. Crash, rate limit, or power loss — resume is automatic.

**Start over with a fresh slate:**

```bash
python screwedscore_seo.py --reset --count 10
```

-----

## Wiring articles into your Next.js site

Each article is a self-contained `.md` file with proper YAML frontmatter:

```yaml
---
title: "How to Dispute a Mechanic Bill: 7 Steps That Work"
slug: "how-to-dispute-a-mechanic-bill"
description: "Mechanic overcharged you? Here's the exact 7-step dispute..."
keyword: "how to dispute a mechanic bill"
category: "mechanic"
date: "2026-05-15"
---
```

If your Next.js setup uses a `content/blog/` folder (the most common pattern
for MDX-based blogs), just copy the files over:

```bash
copy articles\*.md ..\screwedscore\content\blog\
```

Then deploy. Your existing dynamic route + sitemap generator will pick them
up. If you don’t have a blog route yet, the simplest version is:

```
app/blog/[slug]/page.tsx   # reads the .md file by slug, renders MDX
app/blog/page.tsx          # lists all posts
app/sitemap.ts             # auto-includes /blog/[slug] entries
```

Submit your sitemap to Google Search Console one time. After that, new
articles get crawled automatically.

-----

## Realistic expectations

- **Week 1–2**: Articles published, Google starts indexing.
- **Week 3–6**: First long-tail queries start ranking on pages 3–5.
- **Month 2–4**: Best articles climb to page 1 for low-competition terms.
  Expect first organic conversions to free scans.
- **Month 4–6**: Compounding starts. The articles you wrote in week 1 are
  now your top traffic sources.

This is the slow play. It works, but it doesn’t pay you next week. Run the
SEO engine AND the distribution kit in parallel — kit for short-term
traffic, engine for the moat.

-----

## Cost guardrails

- Prompt caching is on by default. First call ~$0.05, subsequent calls ~$0.01.
- 100 articles ≈ $1.50–$3 total.
- Run `--plan` first if you want to see what you’re committing to.
- The script prints estimated cost after every run.

-----

## Tuning

Open `screwedscore_seo.py` and look for:

- **`SYSTEM_PROMPT`** — the brand voice spec. Tweak this to nudge tone,
  structure, or required sections. Keep it long (>1024 tokens) so caching
  stays active.
- **`SERVICES`** — add new verticals (e.g. `("pest control", "exterminator", "contractor")`).
- **`STATES`** — add your top conversion geos.
- **`PATTERNS`** / **`LOCAL_PATTERNS`** — add new search-intent templates.
  Each new pattern multiplies your topic count by the number of services
  (or services × states for local).

-----

## What’s NOT here (yet)

If/when you want them, ask:

- Auto-publish to GitHub via the GitHub API (so deploy is one command)
- Google Search Console API integration to track which articles are
  ranking and re-generate the losers
- Internal-linking pass that adds 3–5 contextual links between articles
- Image generation per article (stock-style hero images via a free API)
- A scheduler that drips 2 articles/day instead of dumping them all at once
  (Google prefers steady publishing over big batches)