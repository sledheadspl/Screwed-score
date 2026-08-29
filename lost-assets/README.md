# Lost Assets Module — Phase 1 (GetScrewedScore)

Free search + matching engine that finds money potentially owed **to** a
person, instead of overcharges taken **from** them: direct unclaimed-property
matches (Type A) and matches through a dissolved business the person was an
officer/registered agent of (Type B).

## Scope boundary — read this first

This is **Phase 1 only**: search and matching. There is no outreach, no
contracts, no fee collection, and no paid-filing workflow anywhere in this
code, on purpose — those need separate legal sign-off per state and belong
to a later phase. The API returns candidate matches with a disclaimer; it
does not contact anyone or file anything on a user's behalf.

## Quickstart

```bash
pip install -r requirements.txt --break-system-packages   # or use a venv
python -m app.ingestion.seed        # populate lost_assets.db with mock data
uvicorn app.main:app --reload
```

```bash
curl -X POST http://127.0.0.1:8000/lost-assets/search \
  -H "Content-Type: application/json" \
  -d '{"name": "Sarah Thompson", "state": "ID"}'
```

Run tests: `python -m pytest tests/ -v` (22 tests, all passing as of this
build — fuzzy-scoring unit tests, full pipeline integration tests against
the seeded mock data, and the real Montana bulk-file parser tested against
a synthetic fixture built to the confirmed layout).

## Architecture

```
app/
  db.py                  SQLite connection + schema bootstrap (schema.sql)
  schema.sql              unclaimed_property, business_entities, ingestion_runs
  ingestion/
    base.py               Adapter ABCs (UnclaimedPropertyAdapter, BusinessEntityAdapter),
                           normalize_name(), upsert-on-conflict run() logic
    mock_data.py           Shared name/address pools + deterministic filler generator
    states/
      washington.py, idaho.py, oregon.py, montana.py
                           One adapter pair per state. Each runs in MOCK mode
                           (see "Data sources" below) and ships a hand-authored
                           scenario record alongside randomized filler.
  matching/
    fuzzy.py               person_name_score() (nickname + middle-initial aware)
                           and business_name_score() (rapidfuzz token_sort_ratio)
    engine.py               match_type_a(), match_type_b(), confidence scoring
  main.py                  FastAPI app, POST /lost-assets/search, GET /health
tests/
  test_matching.py         Fuzzy-scoring unit tests + full pipeline integration tests
```

### Why mock data in Phase 1

Every state adapter's `fetch()` returns realistic sample records today
instead of hitting a live site. This was a deliberate scope call for this
build: each of the 8 real sources (4 states × unclaimed property + business
entities) has its own access method, format, and — in most cases —
unconfirmed bulk/API availability (see per-state docstrings), so getting
all 8 live is its own project. What's here is the full pipeline
(ingest → normalize → match → API) proven end-to-end against data shaped
exactly like the real thing, with a clean seam (`_fetch_live()` on each
adapter) to swap in real fetching one state at a time without touching the
matching engine or API at all.

**One adapter now has a real, working parser: Montana business entities.**
`app/ingestion/states/mt_bulk_parser.py` parses the actual MT SOS Corporate
Bulk Download file format — comma-delimited BE-LLC/AGENT/PRINCIPAL records,
column order confirmed verbatim against the published spec PDFs — and
`MTBusinessEntityAdapter(bulk_file_path=...)` switches that adapter from
mock to live mode. It's tested end-to-end against a synthetic fixture built
to the exact confirmed layout (`tests/test_mt_live_parser.py`), including
proving Type B matching still works on the parsed data.

**What it can't do on its own: fetch the file.** The real bulk download is
served through an authenticated MT SOS filing-portal login
(`biz.sosmt.gov/forms/new/1354` is a sign-in page, not a public download
link), with no pricing disclosed on the pages checked. Creating and paying
for a government filing-portal account is a business decision, not
something to automate silently — so this adapter deliberately stops at "parse
a file you already have," not "log in and get one." The intended workflow:
someone with portal access downloads + unzips the bulk file periodically
and drops it at a known path; the adapter takes it from there. No
credentials are stored or handled anywhere in this codebase.

Only `BE-LLC` rows are parsed (dissolved LLCs) — `BE-CORP`/`BE-LP`/`BE-LLP`
appear in the same file but use an unconfirmed column layout, so the parser
skips them by name rather than guess positions and silently mis-map data.
Extending coverage means re-confirming each entity type's exact layout
first.

### Data source research (as of Aug 2026 — re-verify before building live scrapers)

| State | Unclaimed Property | Access | Dissolved Business Entities | Access |
|---|---|---|---|---|
| WA | ucp.dor.wa.gov (WA DOR) | Web search UI only, no confirmed bulk/API | sos.wa.gov Corporations Data Extract | **Official bulk file** (.txt/.xml/.json), includes registered agent + principal names |
| ID | yourmoney.idaho.gov (Treasurer) | Web search UI only | sosbiz.idaho.gov | No official bulk/API — third-party scrapers exist, which itself signals none is sanctioned |
| OR | unclaimed.oregon.gov (OR Treasury; DSL relationship unclear) | Web search UI only | sos.oregon.gov Corporation Division | Web UI + a possibly-relevant `data.oregon.gov` "Active Businesses" Socrata dataset (may exclude dissolved — unverified) |
| MT | revenue.mt.gov/unclaimed-property (via TAP) | Web search/claim UI only | biz.sosmt.gov | **Official Corporate Bulk Download**, documented layout, confirmed AGENT + PRINCIPAL records — best real-data fit of the four |

None of the four states showed a MissingMoney.com/NAUPA-aggregator
relationship in this research — all four run their own state-hosted search
tools. No rate-limit or ToS language was found on the pages checked, which
is an absence of evidence, not permission — read each site's actual terms
before building a live scraper against it. **Montana is the best starting
point for a real adapter**: it's the only state with a documented bulk
download that includes officer/agent names, which is exactly what Type B
needs.

### Matching & confidence scoring

- **Type A** — `match_type_a()` fuzzy-matches the query name against every
  `unclaimed_property` row with `owner_type='individual'`, using
  `person_name_score()`: nickname-aware (Bob/Robert, Bill/William, etc, ~34
  groups), tolerant of a missing middle name/initial on either side,
  case/punctuation-insensitive.
- **Type B** — `match_type_b()` first fuzzy-matches the query name against
  every dissolved/administratively-dissolved/inactive entity's registered
  agent and officer/manager/member list, then — only for entities that
  clear that bar — fuzzy-joins the entity's own name against
  `unclaimed_property` rows with `owner_type='business'`
  (`business_name_score()`). Confidence is discounted by how strong that
  second join is, so a great officer match can't produce a "high" result on
  a shaky business-name join.
- **Confidence** combines the raw name-match score with a **uniqueness
  discount** for common surnames (a `Smith` match means less than a
  `Featherstonhaugh` match) and a **state agreement adjustment** (bonus if
  the user's stated state matches the record's, small penalty — not
  exclusion — on disagreement, since property can be filed where a
  business was registered rather than where someone currently lives).
  Tiers: high ≥ 0.85, medium ≥ 0.65, low ≥ 0.45 (below that floor, a match
  is noise and isn't returned at all — that floor is a data-quality cutoff,
  not the "silently hide low-confidence matches" behavior the spec
  explicitly calls out avoiding). Every match at or above the floor is
  returned with its tier, including "low."

### Known Phase 1 gap: maiden / previous names

Neither scorer has access to marriage records or name-history data, so a
search for a current legal name will not find property filed under a
maiden or otherwise previous name. This is deliberately left unmatched
rather than guessed at — see the Oregon mock fixture
(`Jennifer Park` vs. a query for `Jennifer Lee`) and
`test_type_a_maiden_name_gap_is_documented_non_match` in the test suite,
which pins the gap so it's visible rather than silently "fixed" by loosening
thresholds. Closing this would need a real name-history/marriage-record
source, which is out of scope for Phase 1.

### API

`POST /lost-assets/search`

```json
// request
{ "name": "Sarah Thompson", "state": "ID" }   // state is optional

// response (shape)
{
  "query": { "name": "...", "state": "ID" },
  "type_a_matches": [ { "match_type": "A", "confidence_score": 0.77, "confidence_tier": "medium", "name_score": 73.0, "match_basis": "...", "property": { ... } } ],
  "type_b_matches": [ { "match_type": "B", "confidence_score": 1.0, "confidence_tier": "high", "name_score": 100.0, "match_basis": "...", "property": { ... }, "entity": { ... } } ],
  "disclaimer": "Results are possible matches ... not verified claims and are not legal or financial advice. ..."
}
```

Every response carries a disclaimer stating results are unverified
automated matches, not legal/financial advice — this is search output, not
a claim determination.

## Extending to a real state

1. In the relevant `app/ingestion/states/<state>.py`, implement
   `_fetch_live()` for the real source (bulk download parser or, if legally
   clear to do so, a ToS-reviewed scraper) and have `fetch()` call it when
   `self.live = True`.
2. Everything downstream — `normalize()`, the upsert in `run()`, both
   matchers, and the API — needs no changes; the adapter contract is the
   seam.
3. **Montana business entities is done** (see above) — the remaining
   highest-value target is Washington's business entities, which also has
   a documented official bulk extract (Corporations Data Extract); it just
   needs the same treatment: fetch the real spec, confirm exact column
   order, write a parser module, and build a synthetic fixture to test
   against before trusting it with real data. Unclaimed-property sources
   for all four states, and Idaho/Oregon business entities, have no
   confirmed bulk/API path at all — those need a ToS review before any
   scraper gets built, not just a parser.

## Storage

Local SQLite file (`app/lost_assets.db`) for zero-setup Phase 1 development.
The schema uses no SQLite-specific types, so moving to Postgres later is a
connection-string change plus translating `schema.sql`, not a data-model
rewrite.
