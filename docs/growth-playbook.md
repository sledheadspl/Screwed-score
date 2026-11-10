# Growth playbook: getting traffic without Ryan doing the work

The site's problem is traffic, not conversion: about 22 visitors a month, mostly
new, almost none returning. Every item below is ranked by how much traffic it can
bring per hour of Ryan's time. Most of it runs on its own once set up.

## 1. Already built into this PR (runs by itself after merge)

| What | Why it brings visitors |
|---|---|
| 18 "how to dispute a ___" guides at `/analyze/*` (12 new) | Each targets a high-intent search like "security deposit deductions unfair" or "towing company overcharged me". People searching these have the bill in hand: the exact moment to offer a free scan. |
| Guides hub at `/analyze` plus links in every page's footer | Before this, the guides were reachable only from the sitemap. Google ranks pages it can reach by links much better than orphan pages. |
| "More bills people check" links between guides | Keeps a visitor moving through the site and spreads ranking strength between pages. |
| Wall of Shame, Community and Jobs render on the server | Their content is now in the HTML Google reads, instead of an empty shell. As reports come in, every business page becomes a long-tail search result. |
| IndexNow ping after every production deploy | Bing, DuckDuckGo, Yahoo and Yandex learn about new and changed pages within hours instead of weeks. Zero upkeep. |
| GA4 funnel events | `sample_click`, `upload_click`, `file_selected`, `scan_complete`, `scan_error`. For the first time you can see exactly where visitors drop off. |

## 2. One-time setup, about 20 minutes, only Ryan can do it

These need your Google and Microsoft sign-ins.

1. **Google Search Console**: add `https://www.screwedscore.com`, verify through
   Cloudflare DNS, and submit `https://www.screwedscore.com/sitemap.xml`. This is
   the single most important step: it is how Google finds the new guides.
2. **Bing Webmaster Tools**: sign in and use "Import from Google Search Console".
   One click, covers Bing, DuckDuckGo and Yahoo.
3. **GA4 funnel report**: in GA4, Explore → Funnel exploration, with steps
   `page_view` (page = /) → `upload_click` → `file_selected` → `scan_complete`.
   Save it. After two weeks of data it shows the step that loses the most people.

## 3. Things Claude can run on a schedule once you say yes

Each of these needs your yes once, because it publishes or uses an account in
your name.

- **Weekly new guide**: every week Claude writes one new guide or blog post for a
  bill people search about, opens a pull request, and you tap merge. Compounding
  search traffic is the cheapest growth there is; 50 good pages in a year is
  realistic.
- **Monthly SEO check**: once a month Claude checks which guides are getting
  impressions in Search Console (once it's connected) and rewrites the weak ones.
- **Scheduled social posts**: Claude drafts a week of short posts ("3 junk fees
  on your internet bill") from the guides. With a scheduling tool connected to
  your accounts, they post on a schedule with no daily effort from you.

## 4. Free listings worth doing once (needs an account in your name)

AI tool directories send steady, free, relevant traffic and a backlink:
There's An AI For That, Futurepedia, AlternativeTo, Product Hunt (one launch day),
and SaaSHub. Claude can write every listing; each site needs you to create the
account and press submit.

## 5. Later, if you want to spend money

Not recommended until the funnel report shows where people drop off. Then a small
test (for example $5 a day on Google Search ads for "dispute medical bill") tells
you the cost per scan before you put real money in.

## What not to do yet

- Don't buy traffic before the funnel data exists.
- Don't mass-generate thousands of thin pages. Google now demotes sites for that.
  A few dozen genuinely useful guides beat thousands of templated ones.
