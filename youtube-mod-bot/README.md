# YouTube Live Chat Mod Bot

A Manifest V3 browser extension that moderates your YouTube live chat and answers
viewer questions with Claude. It drives the same native controls a human
moderator clicks, using the account you are already signed in with.

No YouTube Data API key. No OAuth. No quota ceiling.

## Why not the YouTube Data API

The official `liveChatMessages.insert` and `.delete` endpoints cost **50 quota
units per call** against a default allowance of **10,000 units per day** — about
**200 total actions per day** before the bot goes dead mid-stream. Driving the
page directly has no such limit.

The tradeoff is the honest one: this is not an official integration, it depends
on YouTube's DOM, and a YouTube redesign can break it. Nothing here touches your
password or exports a credential — it clicks buttons in a tab you are already
signed into.

## Two ways to run it

| | This extension | [`headless/`](headless/README.md) |
|---|---|---|
| Runs in | A browser tab you keep open | Node, on a server or Pi |
| Needs a computer on | Yes | No |
| Credentials | Your signed-in tab | Session cookies in `.env` |
| Good for | Streaming from a desktop | Streaming from a phone, or unattended |

Both now run the **same moderation engine and the same rules**. An MV3 content
script cannot import ES modules and this project has no bundler, so the engine
exists twice: `src/engine/engine.js` (classic script, for the extension) and
`headless/src/{moderation,rules}.js` (ESM). Two copies drift, so
`headless/src/engine.parity.selftest.js` runs one corpus of messages and actors
through both and fails if they ever disagree. Run `npm run selftest` in
`headless/` after touching either.

## What the extension does

Out of the box it does one thing: remove the bad message, and mute whoever
keeps sending them. It posts nothing, so viewers see messages disappear and
nothing else.

- **The guide's two tiers.** Standing rules (hate, harassment, doxxing, spam
  links) act immediately in every mode but dry run; judgment calls respect the
  mode.
- **Three modes** — dry run, ask me, auto — switchable from the popup.
- **Escalation** — a repeat offender goes delete → timeout, through the same
  native menu a moderator uses. Repeats of *anything* count, not just standing
  violations: deleting every message from the same person for ever is a
  treadmill, not moderation.
- **A ceiling on every action**, set in the options page. It ships at
  **timeout**, so nothing bans anyone until you say so — a mute expires on its
  own and a ban does not.
- **Stands down** on anything a human mod already removed, and never moderates
  owner or moderator messages.
- **Held matches** appear in the popup with Delete / Keep, for *ask me* mode.

Two things are **off by default**, because neither is part of moderating
quietly. Both are one switch away:

- **Answering questions** posts messages in the chat under your name, needs an
  API key, and bills a model call per question.
- **Member leniency** holds a member's match for a human decision instead of
  acting on it — which in auto mode means it waits `holdSeconds` and is then
  quietly left up. Useful if someone is watching the popup; a silent free pass
  if not.

**Pack tracking** (a counter and a notes box in the popup) stays available and
feeds Claude's answers, but it only matters if you turn answering on.

Two places it is weaker than the headless bot, and worth knowing:

1. **Self-recognition.** The headless bot learns its own channel id and compares
   on that. A content script cannot read the page's own JS state, so the
   extension matches on message text and additionally never answers owner or
   moderator messages — which is what stops it answering itself.
2. **The chat tab has to stay visible.** Chrome clamps timers in a hidden tab
   to about a second and can stretch them to a minute after a few minutes
   hidden, and finding a menu entry depends on polling. The waiter gives a
   hidden tab a longer budget and a floor on how many times it looks, so a
   briefly-backgrounded tab still works — but a minimised or long-buried one
   will fail. Pop the chat out into its own window (⋮ → Pop out chat) and leave
   it somewhere visible. When an action does fail because the tab is hidden, the
   log says so rather than blaming your menu labels.
3. **Strike keys.** Escalation counts per display name, not per channel id,
   because the DOM does not hand the content script a channel id. Names can
   change or collide, so strikes are session-scoped and conservative.

## Requirements

- Chrome, Edge, or another Chromium browser (Firefox needs a manifest tweak).
- The signed-in account must be the **broadcast owner or a moderator** of the
  chat. Without that, messages have no Remove entry and deletes are logged as
  failures.
- An Anthropic API key, only if you want question answering.

## Setup script

Optional. The extension needs no terminal, but this prints the exact folder to
load and proves the download is intact before you trust it with a live chat.

```bash
node setup.mjs              # check the machine, run the self-tests
node setup.mjs --headless   # also create config.json and .env, then run doctor
node setup.mjs --browser    # also drive the extension in a real Chromium
```

`setup.cmd` and `setup.sh` are one-line wrappers around it. It is Node rather
than a shell script so Windows and Unix run the same code instead of a `.sh` and
a `.ps1` drifting apart. Re-running it never overwrites a `config.json` or
`.env` you have already filled in.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this `youtube-mod-bot/` folder.
3. Click the extension icon → **Settings**, paste your Anthropic API key, and
   edit the banned word list.
4. Open your stream's chat — either the popped-out
   `youtube.com/live_chat?v=...` or the chat pane on the watch page.

The console line `[yt-mod-bot] watching live chat` confirms it attached.

## Dry run comes first

**Dry run is on by default and nothing is deleted until you turn it off.**
Matches are recorded in the popup's activity log instead. Run a stream that way,
read the log, and fix the false positives before letting it delete anything. A
careless regex here removes real viewers' messages.

## How matching works

### Matching

Obfuscation is handled in the pattern rather than by rewriting the message,
because folding symbols to letters cannot work in general: `@` usually stands
for `a`, but in `f@ck` it stands for `u`. Each banned word expands into a
character class per letter, so `fuck` also catches `f@ck`, `f*ck` and `fuuck`,
while accents, zero-width padding and stretched letters (`shiiiit`) are
normalized away. Letter-adjacency lookarounds keep `Scunthorpe`, `class` and
`shitake` safe. Regex patterns run against the raw text, so use those for links,
handles, and anything case-sensitive.

**Inflections follow from the root.** A closed set of endings — `s`, `es`, `ed`,
`er(s)`, `ing(s)`, `in(s)`, `y`, `ies` — is allowed before the closing anchor,
so `fuck` also catches `fucking`, `fucked`, `fucker` and `fucks`, and `shit`
catches `shitty` and `shitting`. This matters more than it sounds: nobody in
chat types the bare infinitive, and a plain whole-word match misses every form
people actually use. The set is closed on purpose — a trailing wildcard would
catch `shitake` and `dickens`.

**Lookalike characters are folded.** Unicode normalization does not help here:
Cyrillic `с` and Latin `c` are different letters, not two forms of one, so
`fuсk` reads as clean text to any filter that stops at NFKD. Substituting one
character is the commonest trick in a live chat, so the confusable set
(Cyrillic, Greek, and dotless/stroked Latin) is folded explicitly.

**A word pulled apart is caught too** — `f u c k`, `f.u.c.k`, `f-u-c-k`. This
needs a separator in *every* gap, not optionally in each: with optional
separators, `he's hit` matches `shit`, because the apostrophe is not a letter so
the opening anchor holds and only one of the three gaps has anything in it.
All-or-nothing keeps the split form an evasion rather than a coincidence, at the
cost of missing half-measures like `fu ck`.

**Compounds do not, and cannot.** `bullshit` does not follow from `shit`,
because matching a root anywhere inside a word is exactly what makes a filter
flag `Scunthorpe` — and `cunt` is on the default list. So common compounds ship
as their own entries (`bullshit`, `dickhead`, `dumbass`, `motherfucker`, and
`asshole`, which always was one). If viewers invent a new one, add it to the
list; there is no anchor setting that would have caught it for you.

Anything in the allow list makes a message immune, which is the escape hatch for
the Scunthorpe problem — and for a real word that happens to be an inflection of
a banned one, such as `dicker`.

## Answering questions

**Off by default** — turn it on in the options page. It posts in your chat under
your name, which is the opposite of moderating quietly, and it is the only part
that needs an API key or costs anything to run.

Once on, the bot only answers messages starting with `!ask`, because replying
to every message ending in `?` gets noisy and bills a model call per message.
Replies are rate limited two ways (a cooldown between replies and an hourly cap)
and truncated to fit YouTube's 200-character limit.

The viewer's message is passed to the model fenced in a `<question>` tag, and the
system prompt tells the model to treat it as data rather than instructions.
That reduces prompt injection from chat; it does not eliminate it. Read the log.

## Where things live

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest; content script scoped to `/live_chat*` |
| `src/defaults.js` | Every default setting, shared by the worker and the UI |
| `src/background.js` | Service worker: settings, activity log, all Anthropic calls |
| `src/content.js` | Runs in the chat frame: observes, deletes, replies |
| `options.html` / `options.js` | Full settings page |
| `popup.html` / `popup.js` | On/off switch, counters, recent activity |
| `headless/` | Browserless Node version of the same bot |
| `src/engine/engine.js` | The moderation engine, shared verbatim with `headless/` |
| `extest/` | Loads this extension into Chromium and tests what it clicks |

The API key lives in `chrome.storage.local` and is used only from the service
worker, so it never enters the YouTube page context.

## Tests

Two suites, because there are two separable things to get wrong.

```bash
cd headless && npm run selftest   # the engine: what it decides
cd extest   && npm test           # the extension: what it clicks
```

`headless/` covers the rules, escalation, the dashboard and the self-reply
guard, and includes a parity suite that runs the same corpus through both copies
of the engine — the only thing keeping them honest, since there is no bundler and
`src/engine/engine.js` is duplicated by design.

`extest/` loads this extension into a real Chromium and drives it against a
replica of the live chat DOM. It needs a headful browser, so on a headless
machine run it under `xvfb-run -a`. See `extest/README.md`; it is the only test
that executes the removal path, and it is worth running before you trust a change
to `src/content.js`.

## Known limits

- **Localization.** Menu entries are matched by icon across the whole menu
  first, then by exact label, then by label prefix. If actions fail on a
  non-English YouTube, add your wording under the menu label settings. The
  ranking matters: a bare prefix pass alone will pick `Remove user from this
  channel` when it was asked for `Remove`.
- **Backlog is ignored.** Only messages arriving after the tab loads are acted
  on, by design.
- **The tab must stay open, and visible.** Chrome throttles timers in background
  tabs, which starves the menu waits; the bot says so in the activity log rather
  than failing quietly. Pop the chat into its own window and leave it on screen.
- **Strikes are keyed on display name.** The DOM gives no channel id, so
  escalation is session-scoped and deliberately conservative. The headless bot
  keys on channel id and does not share this weakness.
- **Actions are serialized.** One menu can be open at a time, so an enforced
  message takes roughly a second and a half. That is ample for violations, but
  it is a queue, not a thread pool.
