# Extension DOM tests

Everything else in this project tests the moderation *engine* — the part that
decides. This tests the part that **clicks**: it loads the real unpacked
extension into Chromium and drives it against a replica of YouTube's live chat
DOM, then asserts on what the extension actually did to the page.

It is the only test that executes the removal path, and it is where the two
worst bugs in the extension were found:

- `findMenuItem` matched icons and labels *per menu item*, so a loose label
  match on an earlier entry beat the exact icon on a later one. Against a menu
  with a `Remove user from this channel` entry above `Remove`, the bot **banned
  a viewer** for a mild word — and logged it as a message removal.
- A removal was reported as successful on the strength of the click alone, so a
  click that landed on the wrong entry, or on nothing, still produced a
  `deleted` log line.

## Running it

```bash
cd youtube-mod-bot/extest
npm install
npx playwright install chromium   # skip if Chromium is already provisioned
npm test
```

An MV3 extension will not load in a headless browser, so the browser is real.
On a machine without a display, wrap it:

```bash
xvfb-run -a npm test
```

Two environment variables override the defaults:

| Variable | Default |
|---|---|
| `EXT_PATH` | the directory above this one (the extension itself) |
| `CHROME_PATH` | `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` |

Set `CHROME_PATH` to whatever `npx playwright install chromium` put on disk, or
to your own Chrome binary.

## What the fixture covers

`fixture.html` mirrors the structure `src/content.js` queries — an `#items`
list, message renderers carrying `author-type`, a per-message menu button, and a
shared `tp-yt-iron-dropdown`. Query parameters select the variants worth testing
apart, because each one is a way this breaks in production and not in a happy
path:

| Parameter | Situation |
|---|---|
| `noMenu=1` | the signed-in account is a plain viewer, so there is no moderation menu at all |
| `confirm=1` | timeout and ban raise a confirmation dialog first |
| `lang=de` | YouTube in another language: no icon attributes, German labels, so only the label fallback can work |
| `ambiguous=1` | a ban entry listed above the remove entry, whose label starts with the same word |
| `noopRemove=1` | the remove entry is clicked but the message never changes |

`window.__acted` records every click the extension makes, which is what the
assertions read. Adding a case means adding a message and checking `__acted`,
not reading the extension's own logs — though a few checks read
`chrome.storage.local` too, to confirm the activity log tells the truth about
what happened.

## A note on timing

Moderation actions are serialized through one queue in the content script, and a
delete-then-escalate pair takes about 1.5s (two menu waits plus two
confirmation-dialog waits, plus the removal check). The harness waits for the
page to go quiet rather than sleeping a fixed amount — a fixed sleep races the
bot and reads results a message behind.
