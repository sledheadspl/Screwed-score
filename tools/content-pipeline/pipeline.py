"""
ScrewedScore Autopilot Content Pipeline
Generates 30 days of TikTok/Reels/Shorts content using Claude Batches API (50% cost).
Run: python pipeline.py
"""

import anthropic
import json
import csv
import os
import time
from pathlib import Path
from datetime import datetime, timedelta

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

OUTPUT_DIR = Path(__file__).parent / "output"
SCRIPTS_DIR = OUTPUT_DIR / "scripts"
SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)

SYSTEM_PROMPT = """You are a viral social media content strategist for ScrewedScore (screwedscore.com) — an AI tool that scans bills, contracts, and invoices in 20 seconds to find overcharges and hidden fees.

Brand voice: empowering, punchy, slightly edgy, consumer-advocacy. Never fear-mongering — always empowering.
Key stats: average American overpays $1,300/year · free to scan · SCREWED / MAYBE / SAFE verdict · Fight Back Kit $14.99

Platform: TikTok, Instagram Reels, YouTube Shorts (30–60 second videos)
The hook must stop the scroll in the first 3 seconds."""

# 30-day content calendar: (day, category, content_type, scenario)
CONTENT_PLAN = [
    (1,  "medical",    "reveal",      "Hospital charged $47 for a single Tylenol pill"),
    (2,  "medical",    "educational", "The average ER bill has 3+ hidden fees most people never catch"),
    (3,  "dental",     "reveal",      "Dentist charged double for a crown — their own estimate said otherwise"),
    (4,  "medical",    "dispute_win", "Got $2,400 off a medical bill in 20 minutes using AI"),
    (5,  "insurance",  "reveal",      "Insurance quote had 4 junk fees buried in the fine print"),
    (6,  "mechanic",   "reveal",      "Mechanic charged $280 for parts that cost $40 at AutoZone"),
    (7,  "mechanic",   "educational", "3 lines on every mechanic invoice that are probably fake"),
    (8,  "mechanic",   "challenge",   "Upload your mechanic invoice — find out if you got screwed"),
    (9,  "car_dealer", "reveal",      "Car dealership added $1,800 in fees nobody mentioned during negotiation"),
    (10, "mechanic",   "wall_shame",  "This auto chain has been flagged 200+ times in our Wall of Shame"),
    (11, "contractor", "reveal",      "Contractor estimate was padded by 40% — AI caught it instantly"),
    (12, "plumber",    "reveal",      "Plumber billed 5 hours on the invoice for a 1-hour job"),
    (13, "contractor", "dispute_win", "Saved $3,200 on a home renovation by scanning the contract first"),
    (14, "hvac",       "educational", "HVAC companies' #1 trick to overcharge you in summer"),
    (15, "contractor", "challenge",   "Before you sign ANY home service contract — do this first"),
    (16, "cable",      "reveal",      "Cable bill had 9 fees. AI found only 2 were real."),
    (17, "phone",      "educational", "Your phone bill is lying to you every single month"),
    (18, "internet",   "reveal",      "ISP charged $150 early termination fee for a contract we never signed"),
    (19, "streaming",  "reveal",      "Streaming bundle had a hidden price hike buried in paragraph 11"),
    (20, "gym",        "dispute_win", "Got out of a 'non-cancellable' gym contract using AI-generated dispute letter"),
    (21, "bank",       "reveal",      "Bank charged 6 different fees in one month — 4 of them were illegal"),
    (22, "lease",      "educational", "3 clauses in almost every lease designed to take your money"),
    (23, "employment", "reveal",      "Job offer had a non-compete clause that would have cost $50K to break"),
    (24, "loan",       "reveal",      "Personal loan had a $400 origination fee they never mentioned on the call"),
    (25, "insurance",  "dispute_win", "Insurance company backed down after we sent their own AI verdict back to them"),
    (26, "restaurant", "reveal",      "Restaurant added a 'service optimization fee' — not a tip — to the bill"),
    (27, "hotel",      "reveal",      "Hotel checkout bill was $200 more than the booking confirmation price"),
    (28, "moving",     "reveal",      "Moving company doubled the quote after everything was already in the truck"),
    (29, "storage",    "educational", "Storage unit contracts are designed so you never stop paying"),
    (30, "general",    "challenge",   "The average American overpays $1,300/year. Scan yours free and find out where."),
]

CONTENT_TYPE_GUIDE = {
    "reveal":      "Dramatic reveal format — build tension, show the overcharge, deliver the verdict. Make it feel like exposing a secret.",
    "educational": "Teach something most people don't know, then position ScrewedScore as the solution. Hook = surprising fact.",
    "dispute_win": "Success story — show before/after, celebrate the win. Make viewers feel like they could do the same.",
    "challenge":   "UGC/participation format — invite viewers to upload their own bills. Create FOMO and community.",
    "wall_shame":  "Callout format — name the pattern (not specific individuals), reference the Wall of Shame feature. Build outrage.",
}


def make_request(day: int, category: str, content_type: str, scenario: str) -> dict:
    prompt = f"""Generate a complete, ready-to-post TikTok/Reels content piece for ScrewedScore.

Day: {day}/30
Bill Category: {category.replace('_', ' ').title()}
Content Format: {content_type.replace('_', ' ').title()} — {CONTENT_TYPE_GUIDE[content_type]}
Core Scenario: {scenario}

Output each section with the exact label shown:

HOOK (3 seconds, max 12 words, scroll-stopping):

SCRIPT (30-60 seconds spoken, include [on-screen text] cues in brackets, conversational):

CAPTION (2-3 short lines with spacing, 150-200 chars, strong CTA):

HASHTAGS (18 hashtags, mix of niche + trending):

THUMBNAIL TEXT (3-5 bold words for cover frame):

CTA (one punchy call-to-action, reference screwedscore.com):

Rules: Use specific dollar amounts. Make it feel real and personal. Viewers should immediately think "this happened to me."
"""
    return {
        "custom_id": f"day-{day:02d}-{category}-{content_type}",
        "params": {
            "model": "claude-opus-4-7",
            "max_tokens": 1400,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": prompt}],
        },
    }


def submit_batch() -> str:
    print(f"Submitting batch of {len(CONTENT_PLAN)} content requests...")
    requests = [make_request(*row) for row in CONTENT_PLAN]
    batch = client.messages.batches.create(requests=requests)
    print(f"Batch ID: {batch.id}")
    print(f"Status: {batch.processing_status}")
    # Save batch ID so we can resume if interrupted
    (OUTPUT_DIR / "batch_id.txt").write_text(batch.id)
    return batch.id


def wait_for_batch(batch_id: str) -> None:
    print("\nWaiting for batch to complete (checking every 60s)...")
    while True:
        batch = client.messages.batches.retrieve(batch_id)
        counts = batch.request_counts
        print(f"  [{datetime.now().strftime('%H:%M:%S')}] "
              f"Processing: {counts.processing} | "
              f"Succeeded: {counts.succeeded} | "
              f"Errored: {counts.errored}")
        if batch.processing_status == "ended":
            print(f"\nBatch complete — {counts.succeeded} succeeded, {counts.errored} errored.")
            break
        time.sleep(60)


def save_results(batch_id: str) -> list[dict]:
    print("\nSaving results...")
    plan_lookup = {f"day-{d:02d}-{cat}-{ct}": (d, cat, ct, sc) for d, cat, ct, sc in CONTENT_PLAN}
    calendar_rows = []

    for result in client.messages.batches.results(batch_id):
        if result.result.type != "succeeded":
            print(f"  SKIPPED {result.custom_id} — {result.result.type}")
            continue

        text = next((b.text for b in result.result.message.content if b.type == "text"), "")
        day, cat, ct, scenario = plan_lookup[result.custom_id]

        # Parse sections
        def extract(label: str) -> str:
            marker = f"{label} ("
            alt_marker = f"{label}:"
            # Try the parenthetical form first
            start = text.find(marker)
            if start == -1:
                start = text.find(alt_marker)
                if start == -1:
                    return ""
                start += len(alt_marker)
            else:
                start = text.find("\n", start) + 1
            # Find next section
            next_section = len(text)
            for other in ["HOOK", "SCRIPT", "CAPTION", "HASHTAGS", "THUMBNAIL TEXT", "CTA"]:
                if other == label:
                    continue
                idx = text.find(f"\n{other}", start)
                if idx != -1 and idx < next_section:
                    next_section = idx
            return text[start:next_section].strip()

        hook      = extract("HOOK")
        script    = extract("SCRIPT")
        caption   = extract("CAPTION")
        hashtags  = extract("HASHTAGS")
        thumbnail = extract("THUMBNAIL TEXT")
        cta       = extract("CTA")

        # Save individual script file
        post_date = (datetime.today() + timedelta(days=day - 1)).strftime("%Y-%m-%d")
        filename  = f"day{day:02d}_{cat}_{ct}.md"
        (SCRIPTS_DIR / filename).write_text(
            f"# Day {day} — {cat.replace('_',' ').title()} · {ct.replace('_',' ').title()}\n"
            f"**Date:** {post_date}\n"
            f"**Scenario:** {scenario}\n\n"
            f"## HOOK\n{hook}\n\n"
            f"## SCRIPT\n{script}\n\n"
            f"## CAPTION\n{caption}\n\n"
            f"## HASHTAGS\n{hashtags}\n\n"
            f"## THUMBNAIL TEXT\n{thumbnail}\n\n"
            f"## CTA\n{cta}\n",
            encoding="utf-8",
        )

        calendar_rows.append({
            "Day":          day,
            "Post Date":    post_date,
            "Category":     cat.replace("_", " ").title(),
            "Format":       ct.replace("_", " ").title(),
            "Hook":         hook.replace("\n", " "),
            "Caption":      caption.replace("\n", " "),
            "Hashtags":     hashtags.replace("\n", " "),
            "Thumbnail":    thumbnail,
            "CTA":          cta,
            "Script File":  filename,
        })
        print(f"  Day {day:02d} saved — {filename}")

    # Save CSV calendar
    calendar_rows.sort(key=lambda r: r["Day"])
    csv_path = OUTPUT_DIR / "30_day_calendar.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(calendar_rows[0].keys()))
        writer.writeheader()
        writer.writerows(calendar_rows)

    print(f"\n✓ Calendar saved: {csv_path}")
    print(f"✓ Scripts saved:  {SCRIPTS_DIR}")
    return calendar_rows


def main():
    # Resume from saved batch ID if exists
    batch_id_file = OUTPUT_DIR / "batch_id.txt"
    if batch_id_file.exists():
        batch_id = batch_id_file.read_text().strip()
        print(f"Resuming batch: {batch_id}")
        batch = client.messages.batches.retrieve(batch_id)
        if batch.processing_status != "ended":
            wait_for_batch(batch_id)
    else:
        batch_id = submit_batch()
        wait_for_batch(batch_id)

    rows = save_results(batch_id)
    batch_id_file.unlink(missing_ok=True)

    print(f"\n{'='*50}")
    print(f"Pipeline complete — {len(rows)} content pieces generated.")
    print(f"Open {OUTPUT_DIR / '30_day_calendar.csv'} to see your full calendar.")
    print(f"Import the CSV to Buffer, Later, or Hootsuite to schedule posts.")


if __name__ == "__main__":
    main()
