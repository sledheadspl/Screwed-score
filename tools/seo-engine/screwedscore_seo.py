"""
Screwedscore SEO Content Engine
================================
Generates long-tail, SEO-optimized articles at scale for screwedscore.com.

The strategy: Screwedscore competes in consumer-protection / bill-dispute /
overcharge-detection search intent. There are TENS OF THOUSANDS of long-tail
keyword combinations no big publisher targets ("how to dispute a mechanic
overcharge in Texas", "average plumber service call cost in Spokane", etc).
Each article funnels readers to a free scan, which is the top of the
monetization funnel.

This script:
  - Generates a smart keyword/topic plan (not brute-force combinations)
  - Calls Claude Sonnet 4.6 with prompt caching (saves ~80% on input tokens)
  - Writes Next.js / MDX-compatible markdown with proper SEO frontmatter
  - Tracks completed work so you can resume after a crash or rate limit
  - Reports estimated and actual cost per run

Setup:
  pip install -r requirements.txt
  cp .env.example .env  # then fill in ANTHROPIC_API_KEY
  python screwedscore_seo.py --count 20

Output goes to ./articles/ as .md files. Drop these into your Next.js
content/ directory (or wherever your MDX pipeline reads from) and deploy.
"""

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Iterator

try:
    from anthropic import Anthropic, APIError, RateLimitError
except ImportError:
    print("ERROR: Install dependencies first: pip install -r requirements.txt")
    sys.exit(1)

# Optional: load .env if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

MODEL = "claude-sonnet-4-6"  # best price/perf for SEO content gen
MAX_TOKENS = 4000            # ~2,000-word articles
OUTPUT_DIR = Path("../../content/blog")
STATE_FILE = Path("./.engine_state.json")

# Approximate pricing (verify at https://platform.claude.com/docs/en/about-claude/pricing)
# These are used only for the cost estimate; the actual bill is on your invoice.
PRICE_INPUT_PER_MTOK = 3.0      # $ per million input tokens (uncached)
PRICE_CACHE_READ_PER_MTOK = 0.3 # $ per million cached input tokens (~10% of input)
PRICE_OUTPUT_PER_MTOK = 15.0    # $ per million output tokens


# ---------------------------------------------------------------------------
# TOPIC STRATEGY
# ---------------------------------------------------------------------------
# These are real long-tail patterns with consumer-protection search intent.
# Each combination produces a unique, rankable topic.

SERVICES = [
    ("mechanic", "auto repair", "mechanic"),
    ("dentist", "dental", "medical"),
    ("doctor", "medical", "medical"),
    ("hospital", "medical billing", "medical"),
    ("plumber", "plumbing", "contractor"),
    ("electrician", "electrical", "contractor"),
    ("contractor", "home improvement", "contractor"),
    ("HVAC company", "HVAC", "contractor"),
    ("roofer", "roofing", "contractor"),
    ("landlord", "rental housing", "housing"),
    ("phone company", "wireless carrier", "telecom"),
    ("internet provider", "ISP", "telecom"),
    ("cable company", "TV provider", "telecom"),
    ("insurance company", "insurance", "insurance"),
    ("auto insurance", "car insurance", "insurance"),
    ("health insurance", "medical insurance", "insurance"),
    ("lawyer", "attorney", "legal"),
    ("moving company", "movers", "contractor"),
    ("locksmith", "locksmith service", "contractor"),
    ("towing company", "tow service", "auto"),
]

# Top 25 US states by population — covers ~80% of search demand
STATES = [
    "California", "Texas", "Florida", "New York", "Pennsylvania",
    "Illinois", "Ohio", "Georgia", "North Carolina", "Michigan",
    "New Jersey", "Virginia", "Washington", "Arizona", "Massachusetts",
    "Tennessee", "Indiana", "Missouri", "Maryland", "Wisconsin",
    "Colorado", "Minnesota", "South Carolina", "Alabama", "Louisiana",
]

# These templates encode high-intent search patterns. They use {service_name},
# {service_short}, and {state} slots. Generated topics avoid duplicates.
PATTERNS = [
    "how to dispute a {service_name} bill",
    "how to get a refund from a {service_name}",
    "signs your {service_name} is overcharging you",
    "what to do if your {service_name} bill is wrong",
    "{service_name} hidden fees to watch for",
    "average {service_short} cost in {state}",
    "how to negotiate a {service_name} bill",
    "{service_name} overcharge laws in {state}",
    "how to spot a fake {service_name} invoice",
    "{service_name} bill dispute letter template",
    "what to do when a {service_name} refuses to refund",
    "is my {service_name} ripping me off",
    "how to file a complaint against a {service_name}",
    "{service_name} chargeback step by step",
    "{service_name} scam warning signs",
]

# Patterns that pair with a state for local intent (high commercial value)
LOCAL_PATTERNS = [
    "average {service_short} cost in {state}",
    "{service_name} overcharge laws in {state}",
    "best way to dispute a {service_name} bill in {state}",
    "{state} consumer protection for {service_name} overcharges",
]


# ---------------------------------------------------------------------------
# SYSTEM PROMPT (cached — keep this stable across runs to maximize cache hits)
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are the staff writer for screwedscore.com, a free AI-powered consumer protection tool that scans bills, invoices, leases, and contracts for overcharges and red flags.

BRAND VOICE
- Direct, plainspoken, on the consumer's side. Never corporate.
- Written by people who've BEEN screwed and want to help others avoid it.
- No fluff, no hedging, no AI-tells ("In today's fast-paced world", "It is important to note", "delve", "tapestry", "navigate the complexities").
- Use second person ("you", "your bill") to speak directly to the reader.
- Short paragraphs. Specific numbers. Concrete examples. Real dollar figures.

ARTICLE STRUCTURE
1. Hook (1-2 short paragraphs): a relatable scenario or a shocking number. Pull the reader in immediately.
2. Quick-answer box: a 2-3 sentence direct answer to the article's question, before the long explanation.
3. The body: 4-7 H2 sections with H3 subsections where useful. Use numbered lists for step-by-step. Use tables for comparisons or fee breakdowns. Bold the dollar figures.
4. A natural mid-article CTA in its own short paragraph, ONCE: "If you want to know whether your specific bill has overcharges, upload it free at screwedscore.com — the AI flags the line items in about 20 seconds, no account needed."
5. FAQ section: 4-6 questions people actually search for, with tight answers.
6. Final CTA paragraph that's natural, not pushy.
7. Disclaimer at the very end: "This article is for informational purposes only and is not legal or financial advice. Verify with a licensed professional before acting on any specific dispute."

SEO REQUIREMENTS
- Use the target keyword in the H1, the first paragraph, at least one H2, and the meta description.
- Use natural variants of the keyword throughout — don't keyword-stuff.
- 1,500-2,200 words. Quality beats word count, but thin content won't rank.
- Internal-link opportunities: when you mention "bill scanner" or "free AI scan", make it a markdown link to https://screwedscore.com/.
- When you mention specific dispute steps, link to https://screwedscore.com/shame as "see how others have been overcharged".

OUTPUT FORMAT (strict)
Return ONLY a markdown document with YAML frontmatter. No preamble, no closing remarks, nothing outside the markdown.

---
title: "<SEO-optimized title, max 60 chars, includes keyword>"
slug: "<url-slug-with-hyphens>"
description: "<meta description, 140-155 chars, includes keyword, ends with implicit CTA>"
keyword: "<the primary target keyword>"
category: "<one of: mechanic, medical, contractor, housing, telecom, insurance, legal, auto>"
date: "<YYYY-MM-DD>"
---

# <H1 Title>

<article body>

DO NOT include any text before the opening --- or after the article body."""


# ---------------------------------------------------------------------------
# TOPIC GENERATOR
# ---------------------------------------------------------------------------

def slugify(text: str) -> str:
    """Convert a topic string into a URL-safe slug."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")[:80]


def generate_all_topics() -> list[dict]:
    """
    Build the full topic plan. Each topic dict has:
        - topic: human-readable search query (used as the keyword)
        - category: which Screwedscore vertical it falls in
        - is_local: whether this is a state-specific query
        - slug: URL slug
    """
    topics: list[dict] = []
    seen: set[str] = set()

    for service_name, service_short, category in SERVICES:
        # Non-local patterns
        for pattern in PATTERNS:
            if "{state}" in pattern:
                continue  # handled below
            topic = pattern.format(
                service_name=service_name,
                service_short=service_short,
            )
            slug = slugify(topic)
            if slug in seen:
                continue
            seen.add(slug)
            topics.append({
                "topic": topic,
                "category": category,
                "is_local": False,
                "slug": slug,
            })

        # Local (state-specific) patterns
        for pattern in LOCAL_PATTERNS:
            for state in STATES:
                topic = pattern.format(
                    service_name=service_name,
                    service_short=service_short,
                    state=state,
                )
                slug = slugify(topic)
                if slug in seen:
                    continue
                seen.add(slug)
                topics.append({
                    "topic": topic,
                    "category": category,
                    "is_local": True,
                    "slug": slug,
                })

    return topics


# ---------------------------------------------------------------------------
# STATE PERSISTENCE (so the script is resumable)
# ---------------------------------------------------------------------------

@dataclass
class EngineState:
    completed_slugs: list[str]
    total_input_tokens: int = 0
    total_cached_tokens: int = 0
    total_output_tokens: int = 0

    def save(self, path: Path) -> None:
        path.write_text(json.dumps(asdict(self), indent=2))

    @classmethod
    def load(cls, path: Path) -> "EngineState":
        if path.exists():
            data = json.loads(path.read_text())
            return cls(**data)
        return cls(completed_slugs=[])


# ---------------------------------------------------------------------------
# GENERATION
# ---------------------------------------------------------------------------

def build_user_prompt(topic_record: dict) -> str:
    """The dynamic, per-article portion of the prompt."""
    return (
        f"Write the article for this topic.\n\n"
        f"TARGET KEYWORD: {topic_record['topic']}\n"
        f"CATEGORY: {topic_record['category']}\n"
        f"LOCAL TO STATE: {'yes' if topic_record['is_local'] else 'no'}\n"
        f"TODAY'S DATE: {datetime.now().strftime('%Y-%m-%d')}\n\n"
        f"Write the full article now, in the exact frontmatter + markdown "
        f"format specified. Output the markdown only, nothing else."
    )


def generate_article(client: Anthropic, topic_record: dict) -> tuple[str, dict]:
    """
    Generate one article. Returns (markdown_text, usage_dict).
    Uses prompt caching on the SYSTEM_PROMPT to cut input cost ~90% on
    every call after the first.
    """
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {"role": "user", "content": build_user_prompt(topic_record)},
        ],
    )

    text = "".join(block.text for block in response.content if block.type == "text")

    usage = {
        "input_tokens": response.usage.input_tokens,
        "cache_creation_tokens": getattr(response.usage, "cache_creation_input_tokens", 0),
        "cache_read_tokens": getattr(response.usage, "cache_read_input_tokens", 0),
        "output_tokens": response.usage.output_tokens,
    }
    return text, usage


def clean_article(raw: str) -> str:
    """Strip any accidental ```markdown fences or chatter before/after."""
    raw = raw.strip()
    # Remove leading code fence if present
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n", "", raw)
        if raw.endswith("```"):
            raw = raw[:-3].rstrip()
    # Sanity: must start with frontmatter
    if not raw.startswith("---"):
        # Find the frontmatter if the model added preamble
        match = re.search(r"^---\n", raw, re.MULTILINE)
        if match:
            raw = raw[match.start():]
    return raw


def save_article(markdown: str, topic_record: dict, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{topic_record['slug']}.md"
    path.write_text(markdown, encoding="utf-8")
    return path


# ---------------------------------------------------------------------------
# COST REPORTING
# ---------------------------------------------------------------------------

def estimate_cost(state: EngineState) -> dict:
    in_cost = (state.total_input_tokens / 1_000_000) * PRICE_INPUT_PER_MTOK
    cache_cost = (state.total_cached_tokens / 1_000_000) * PRICE_CACHE_READ_PER_MTOK
    out_cost = (state.total_output_tokens / 1_000_000) * PRICE_OUTPUT_PER_MTOK
    return {
        "input_cost": in_cost,
        "cache_read_cost": cache_cost,
        "output_cost": out_cost,
        "total": in_cost + cache_cost + out_cost,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--count", type=int, default=10,
                        help="How many articles to generate this run (default 10)")
    parser.add_argument("--output", type=Path, default=OUTPUT_DIR,
                        help="Output directory for articles")
    parser.add_argument("--plan", action="store_true",
                        help="Print the full topic plan and exit (no API calls)")
    parser.add_argument("--reset", action="store_true",
                        help="Reset the state file (regenerate all topics)")
    args = parser.parse_args()

    all_topics = generate_all_topics()

    if args.plan:
        print(f"Total unique topics in plan: {len(all_topics)}\n")
        for i, t in enumerate(all_topics, 1):
            local = "[local]" if t["is_local"] else "       "
            print(f"{i:5d}. {local} {t['topic']}")
        return

    if args.reset and STATE_FILE.exists():
        STATE_FILE.unlink()
        print("State reset.")

    state = EngineState.load(STATE_FILE)
    done = set(state.completed_slugs)
    queue = [t for t in all_topics if t["slug"] not in done]

    print(f"Topic plan:    {len(all_topics)}")
    print(f"Already done:  {len(done)}")
    print(f"Remaining:     {len(queue)}")
    print(f"This run:      {min(args.count, len(queue))}")
    print()

    if not queue:
        print("Nothing left to generate. Add more patterns to PATTERNS or "
              "SERVICES, or run with --reset.")
        return

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY in your environment or in a .env file.")
        sys.exit(1)

    client = Anthropic(api_key=api_key)
    to_generate = queue[:args.count]

    for i, topic_record in enumerate(to_generate, 1):
        print(f"[{i}/{len(to_generate)}] {topic_record['topic']}")
        attempt = 0
        while True:
            attempt += 1
            try:
                raw, usage = generate_article(client, topic_record)
                break
            except RateLimitError as e:
                wait = min(60, 2 ** attempt)
                print(f"  ! rate limited, sleeping {wait}s...")
                time.sleep(wait)
                if attempt >= 5:
                    print(f"  ✗ giving up after {attempt} attempts")
                    raw = None
                    break
            except APIError as e:
                print(f"  ✗ API error: {e}")
                raw = None
                break

        if raw is None:
            continue

        cleaned = clean_article(raw)
        path = save_article(cleaned, topic_record, args.output)

        state.completed_slugs.append(topic_record["slug"])
        state.total_input_tokens += usage["input_tokens"]
        state.total_cached_tokens += usage["cache_read_tokens"]
        state.total_output_tokens += usage["output_tokens"]
        state.save(STATE_FILE)

        cache_pct = (
            100 * usage["cache_read_tokens"] /
            max(1, usage["input_tokens"] + usage["cache_read_tokens"])
        )
        print(f"  ✓ {path.name}  "
              f"(in:{usage['input_tokens']} cached:{usage['cache_read_tokens']} "
              f"out:{usage['output_tokens']}  cache hit:{cache_pct:.0f}%)")

    costs = estimate_cost(state)
    print()
    print("─" * 60)
    print(f"Total articles generated:   {len(state.completed_slugs)}")
    print(f"Total input tokens:         {state.total_input_tokens:,}")
    print(f"Total cached read tokens:   {state.total_cached_tokens:,}")
    print(f"Total output tokens:        {state.total_output_tokens:,}")
    print(f"Estimated cost to date:     ${costs['total']:.2f}")
    print(f"  └─ uncached input:        ${costs['input_cost']:.2f}")
    print(f"  └─ cached reads (90% off):${costs['cache_read_cost']:.2f}")
    print(f"  └─ output:                ${costs['output_cost']:.2f}")
    print(f"Articles saved to:          {args.output.resolve()}")


if __name__ == "__main__":
    main()
