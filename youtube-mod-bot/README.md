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

Both share one matching engine — `src/content.js` and
`headless/src/moderation.js` are kept behaviourally identical, and
`headless/npm run selftest` covers both.

## Requirements

- Chrome, Edge, or another Chromium browser (Firefox needs a manifest tweak).
- The signed-in account must be the **broadcast owner or a moderator** of the
  chat. Without that, messages have no Remove entry and deletes are logged as
  failures.
- An Anthropic API key, only if you want question answering.

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

Obfuscation is handled in the pattern rather than by rewriting the message,
because folding symbols to letters cannot work in general: `@` usually stands
for `a`, but in `f@ck` it stands for `u`. Each banned word expands into a
character class per letter, so `fuck` also catches `f@ck`, `f*ck` and `fuuck`,
while accents, zero-width padding and stretched letters (`shiiiit`) are
normalized away. Letter-adjacency lookarounds keep `Scunthorpe`, `class` and
`shitake` safe. Regex patterns run against the raw text, so use those for links,
handles, and anything case-sensitive.

Anything in the allow list makes a message immune, which is the escape hatch for
the Scunthorpe problem.

## Answering questions

By default the bot only answers messages starting with `!ask`, because replying
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

The API key lives in `chrome.storage.local` and is used only from the service
worker, so it never enters the YouTube page context.

## Known limits

- **Localization.** The delete entry is found by its trash icon first, falling
  back to a label list. If deletes fail on a non-English YouTube, add your
  wording under *Remove menu labels*.
- **Backlog is ignored.** Only messages arriving after the tab loads are acted
  on, by design.
- **The tab must stay open.** Close the chat and the bot stops.
- **No timeout or ban.** Deleting a message is the only moderation action
  wired up, though `src/content.js` reaches the same menu those live in.
