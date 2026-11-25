"""Build Screwed Score Academy Quick-Fix lessons (Series 2+) from data.

    python3 scripts/academy/build_lessons.py

Reads every SERIES list in scripts/academy/series_*.py, writes one HTML file
per lesson to private/downloads/academy-qf-NN-<slug>.html (served only to
buyers by /api/download), and writes lib/academy-series.generated.ts for the
site (catalog, Stripe price IDs from prices.json, files).

Same look as Quick-Fix Series 1 (lesson.css comes from its generator).
"""
import glob, html, importlib.util, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'private', 'downloads')
CSS = open(os.path.join(HERE, 'lesson.css')).read()
PRICES = json.load(open(os.path.join(HERE, 'prices.json'))) if os.path.exists(os.path.join(HERE, 'prices.json')) else {}

DISCLAIMERS = {
    'repair': ("This guide is general educational information from REMbyDesign LLC, based on hands-on repair experience. "
               "Every vehicle and home is different. Follow your owner's manual and manufacturer specifications, follow local codes and "
               "permit rules, and use proper safety equipment. You are responsible for your own safety and work. If you are unsure at any "
               "step, stop and consult a qualified professional. REMbyDesign LLC is not liable for injury, damage or loss resulting from "
               "the use of this information."),
    'money': ("This guide is general educational information from REMbyDesign LLC, not legal, tax or financial advice. Laws and "
              "company policies differ by state and change over time, so check the current rules for your situation. For a serious or "
              "high-dollar matter, talk to a licensed attorney, your state attorney general's office, or a nonprofit counselor. "
              "REMbyDesign LLC is not liable for any loss resulting from the use of this information."),
    'collector': ("This guide is general educational information from REMbyDesign LLC for hobby collectors. It is not investment "
                  "advice: card values go down as well as up, and no grade or price is guaranteed. Fees, policies and market prices "
                  "change often, so check current figures before you buy, sell or submit. Pokémon is a trademark of Nintendo, "
                  "Creatures Inc. and GAME FREAK inc.; this guide is independent and not affiliated with or endorsed by them."),
}
SAFETY_TITLE = {'repair': 'Safety first, read before you start', 'money': 'Read this first', 'collector': 'Read this first'}


def li(items):
    return ''.join(f'<li>{i}</li>' for i in items)


def lesson_html(x, series):
    kind = series['kind']
    mods = ''
    for i, m in enumerate(x['modules'], 1):
        intro = f'<p>{m["intro"]}</p>' if m.get('intro') else ''
        tip = f'<div class="box tip"><b>Pro tip:</b> {m["tip"]}</div>' if m.get('tip') else ''
        warn = f'<div class="box warn"><b>Caution:</b> {m["warn"]}</div>' if m.get('warn') else ''
        mods += (f'<section><h3><span class="mod-num">Step {i}</span>{m["title"]}</h3>{intro}'
                 f'<ol class="steps">{li(m["steps"])}</ol>{tip}{warn}</section>')
    trouble = ''.join(f'<tr><td>{p}</td><td>{f}</td></tr>' for p, f in x['trouble'])
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(x['title'])} | Screwed Score Academy</title><style>{CSS}</style></head><body>
<header><div class="wrap"><div class="brand">Screwed Score Academy · Quick-Fix #{x['num']:02d} · {series['label']}</div>
<h1>{x['title']}</h1><p class="sub">{x['subtitle']}</p>
<div class="meta"><span class="pill">Time: <b>{x['time']}</b></span><span class="pill">Level: <b>{x['level']}</b></span><span class="pill">Steps: <b>{len(x['modules'])}</b></span></div></div></header>
<main class="wrap">
<section><p>{x['intro']}</p><div class="save"><div><div class="k">{x['cost_label']}</div><div class="v">{x['cost']}</div></div><div><div class="k">You'll spend</div><div class="v">{x['spend']}</div></div></div></section>
<section class="safety"><h2>{SAFETY_TITLE[kind]}</h2><ul>{li(x['safety'])}</ul><p class="disclaimer">{DISCLAIMERS[kind]}</p></section>
<section><h2>What you'll learn</h2><ul>{li(x['learn'])}</ul></section>
<section><h2>What you need</h2><ul>{li(x['need'])}</ul></section>
{mods}
<section><h2>Troubleshooting</h2><table><tr><th>If this happens</th><th>Do this</th></tr>{trouble}</table></section>
<section class="warn box" style="border-left-width:4px"><h2>{x.get('pro_title', 'When to stop and call a pro')}</h2><ul>{li(x['pro'])}</ul></section>
<section><button class="printbtn" onclick="window.print()">Print checklist</button><h2>Printable checklist</h2><ul class="check">{li(x['checklist'])}</ul></section>
</main><footer>© 2026 REMbyDesign LLC · Screwed Score Academy · screwedscore.com/academy<br>For personal use by the purchaser. Please don't share or resell.</footer></body></html>"""


def load_series():
    out = []
    for path in sorted(glob.glob(os.path.join(HERE, 'series_*.py'))):
        spec = importlib.util.spec_from_file_location(os.path.basename(path)[:-3], path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        out.append(mod.SERIES)
    return out


REQUIRED = ['slug', 'num', 'title', 'subtitle', 'time', 'level', 'cost_label', 'cost', 'spend', 'intro', 'safety',
            'learn', 'need', 'modules', 'trouble', 'pro', 'checklist', 'teaser']


def main():
    os.makedirs(OUT, exist_ok=True)
    all_series = load_series()
    lessons_ts, packs_ts, seen = [], [], set()
    for s in all_series:
        for x in s['lessons']:
            missing = [k for k in REQUIRED if k not in x]
            assert not missing, (x.get('slug'), missing)
            assert x['num'] not in seen, ('duplicate lesson number', x['num'])
            seen.add(x['num'])
            fname = f"academy-qf-{x['num']:02d}-{x['slug']}.html"
            with open(os.path.join(OUT, fname), 'w') as f:
                f.write(lesson_html(x, s))
            pid = f"qf-{x['slug']}"
            lessons_ts.append({
                'id': pid, 'num': f"{x['num']:02d}", 'title': x['title'], 'teaser': x['teaser'],
                'series': s['id'], 'category': s['category'], 'priceId': PRICES.get(pid, ''), 'price': s['price'],
                'shopPrice': x['cost'], 'shopLabel': x['cost_label'], 'file': fname,
            })
        pack_id = f"qf-pack-{s['id']}"
        packs_ts.append({
            'id': pack_id, 'series': s['id'], 'title': s['pack_title'], 'subtitle': s['blurb'],
            'priceId': PRICES.get(pack_id, ''), 'price': s['pack_price'],
            'includes': [f"qf-{x['slug']}" for x in s['lessons']],
        })
    series_ts = [{'id': s['id'], 'label': s['label'], 'title': s['title'], 'blurb': s['blurb'], 'category': s['category']}
                 for s in all_series]
    everything = {'id': 'qf-everything', 'title': 'Every Quick-Fix Guide',
                  'priceId': PRICES.get('qf-everything', ''), 'price': 49,
                  'includes': [l['id'] for l in lessons_ts]}
    ts = ("// GENERATED by scripts/academy/build_lessons.py — edit the series_*.py data and re-run, don't edit by hand.\n"
          "import type { AcademySeries, SeriesLesson, SeriesPack } from './academy-series'\n\n"
          f"export const GEN_SERIES: AcademySeries[] = {json.dumps(series_ts, indent=2, ensure_ascii=False)}\n\n"
          f"export const GEN_LESSONS: SeriesLesson[] = {json.dumps(lessons_ts, indent=2, ensure_ascii=False)}\n\n"
          f"export const GEN_PACKS: SeriesPack[] = {json.dumps(packs_ts, indent=2, ensure_ascii=False)}\n\n"
          f"export const GEN_EVERYTHING: SeriesPack = {json.dumps(everything, indent=2, ensure_ascii=False)}\n")
    with open(os.path.join(ROOT, 'lib', 'academy-series.generated.ts'), 'w') as f:
        f.write(ts)
    print(f"built {len(lessons_ts)} lessons in {len(all_series)} series; prices known for "
          f"{sum(1 for l in lessons_ts if l['priceId'])} lessons")


if __name__ == '__main__':
    main()
