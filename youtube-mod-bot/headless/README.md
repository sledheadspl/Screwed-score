# YouTube Live Chat Mod Bot — headless

The same moderation and Q&A bot as the browser extension, with no browser. It
runs as a Node service on a server, a Raspberry Pi, or any machine that stays
awake, so it keeps moderating whether or not your computer is on.

Use this instead of the extension when you stream from a phone, or when you
want moderation running unattended.

## How it talks to YouTube

Through [`@stu43005/masterchat`](https://www.npmjs.com/package/@stu43005/masterchat)
(Apache-2.0), a maintained fork of `sigvt/masterchat`. It uses YouTube's own
internal endpoints with your session cookies — the same calls the web player
makes — so there is **no YouTube Data API quota**. The official
`liveChatMessages.delete` costs 50 quota units against a 10,000/day default,
which caps an official-API bot at about 200 actions per day.

The tradeoff: this is not an official integration. It depends on internal
endpoints that can change, and automating a Google account with session cookies
is outside YouTube's published API terms. That risk lands on the account whose
cookies you use.

## Setup

```bash
cd youtube-mod-bot/headless
npm install
cp config.example.json config.json   # edit: channel, banned words
cp .env.example .env                 # add cookies + Anthropic key
npm start
```

### On Windows

Same steps, PowerShell flavoured:

```powershell
cd youtube-mod-bot\headless
npm install
copy config.example.json config.json
copy .env.example .env
npm start
```

Environment variables for one run go in front as `$env:NAME="value";`. There is
no systemd — keep the window open, or use `pm2` or Task Scheduler to have it
survive a reboot.

### Check it before you go live

```bash
npm run doctor
```

Verifies the config loads, the rules are actually armed, the YouTube cookies
authenticate, the Anthropic key and model work, and whether the channel is live
right now — then tells you the one thing it cannot check: whether the account
really holds moderator powers. Nothing read-only proves that; the first removal
is the test. Exits non-zero if anything is broken, so it drops into a script.

Run the offline checks any time you change a word list or a rule:

```bash
npm run selftest
```

Six suites: the matching engine, the guide's rules section by section,
enforcement and escalation against a stub, the dashboard binding rule, live
stream resolution, and the dashboard's HTTP surface.

### Getting the cookies

Sign in to YouTube as the account that moderates the chat — the broadcast owner
or a moderator — then open DevTools → Application → Cookies → `youtube.com` and
copy `SAPISID`, `APISID`, `HSID`, `SID` and `SSID` into `.env`.

**These are live credentials for that Google account.** Anyone holding them can
act as you. Keep `.env` out of version control (it already is), give the bot its
own moderator account if you can, and sign that account out to revoke them.

Without cookies the bot still starts and logs what it *would* do, but cannot
delete or reply.

## It follows the Pokebank Moderation Guide

`src/rules.js` encodes the guide, and `src/rules.selftest.js` asserts it
section by section. If the guide changes, change those two together.

**Section 2, Standing Rules** — hate speech, harassment/creeping, doxxing, and
spam/scam links. The guide says "act first, explain after… no approval needed",
so these fire immediately for everyone, in every mode except `dry`. They are
checked *before* the allow list: a slur is a slur even in an otherwise fine
message.

**Section 3, Judgment Calls** — mild swearing and the like. These respect the
review mode, and carry Section 3's leniency: a **known member's** slip is held
for a human call, while an **unknown account** is enforced normally, because
there is no history to extend trust on. Channel membership is the closest
signal YouTube gives for "regular" — a proxy, not a perfect one.

**Section 5, Don't undermine a mod.** Staff are never auto-moderated, and when
a human mod deletes a message or sweeps an author, the bot marks that author
handled and stands down — including dropping any hold it had queued on them.
The bot also never posts about its own moderation in chat.

**Section 6, Escalation.** A repeat standing-rule offender goes delete →
timeout → ban across a session (`strikes.timeoutAt` / `banAt`). Judgment calls
never escalate.

### Two deliberate departures

1. **Section 1 ranks Hype above Safety.** For a human that means "don't kill
   the vibe over nothing". For an automatic filter it would mean leaving
   ambiguous messages up. This ships **safety-first** instead, at the
   operator's direction: an ambiguous judgment call is acted on and reviewed
   after. Set `judgment.onMatch` to `"hold"` to restore the guide's ordering.
2. **Hate speech ships with an empty word list.** A public repo is the wrong
   place for a slur list, and Section 6 already points at YouTube's native
   blocked-words list as the first line of defense. Add your terms under
   `standing.categories.hate.words`, or leave that to YouTube and let the bot
   cover the rest.

Sections 4 (escalation path) and the human half of 5 are about people talking
to each other. No bot implements those; they still need the mod chat.

## Three modes, not a boolean

`moderation.mode` decides how much rope the bot gets. You can change it live
from the dashboard mid-stream.

| Mode | What happens on a match |
|---|---|
| `dry` | Logged only. Nothing deleted, no replies sent. **The default.** |
| `hold` | Queued for your approval in the dashboard. Nothing happens until you tap, or `holdSeconds` runs out. |
| `auto` | Deleted immediately. |

`hold` is the one to run your first real stream in: you see every call the bot
wants to make and approve it, so you learn where the filter is wrong without
it having already taken anything down.

If a held match times out, `holdDefault` decides. It ships as `skip` — leaving
a bad message up for 25 seconds is recoverable; deleting a good one because you
looked away is not.

(Older configs used `dryRun: true`/`false`. Those still load and map to `dry`
and `auto`.)

## The dashboard

Open it on your phone and watch the bot work. It shows **every message it
sees**, not just the ones it acted on, so you can tell the difference between
"the filter is working" and "the filter is asleep".

```
DASHBOARD_TOKEN=$(openssl rand -hex 24) npm start
```

The startup log prints the URL with the token in it. Add it to your home
screen and it behaves like an app.

What you can do from it:

- **Approve or reject each held match** — Delete / Keep, with a countdown bar.
- **"Wrong — allow that word"** on anything it deleted or would have deleted.
  One tap, added to the allow list, saved to `config.json`, never flagged again.
- **"Delete this"** on anything that slipped past.
- **Switch modes and pause** without touching the server.
- **The input bar**: type plain text to post it to chat as the bot, or use
  `/ban word`, `/allow word`, `/unban word`, `/mode dry|hold|auto`, `/pause`,
  `/resume`, `/ask <question>`.

Word-list and mode changes are written back to `config.json`, so a correction
you make mid-stream survives a restart.

### Dashboard security

That URL can delete messages and post to your chat as you. Treat it like a
password:

- **With no `DASHBOARD_TOKEN`, the server binds to `127.0.0.1` only.** Setting
  `DASHBOARD_HOST` to anything that is not loopback without also setting a
  token makes the bot **refuse to start**, rather than serving the world
  unauthenticated.
- Setting a token makes it bind `0.0.0.0`; `DASHBOARD_HOST` narrows that to one
  interface. It is plain HTTP, so put it behind Tailscale, an SSH tunnel, or an
  HTTPS reverse proxy rather than on a bare public IP.

### Reaching it from your phone

Running the bot on a PC at home and want the dashboard on the road? Use
[Tailscale](https://tailscale.com) rather than port forwarding — it is free for
personal use, needs no open ports, and never puts the dashboard on the public
internet.

1. Install Tailscale on the PC and on the phone, signed into the same account.
2. Note the PC's tailnet address (`tailscale ip -4`, a `100.x.y.z`).
3. Start the bot bound to just that interface:

   ```bash
   DASHBOARD_TOKEN=$(openssl rand -hex 24) DASHBOARD_HOST=100.x.y.z npm start
   ```

4. Open the printed URL on the phone and add it to the home screen.

Binding to the tailnet address means the dashboard is not reachable from the
café wifi your laptop is on, only from your own devices. On the same LAN you
can skip Tailscale and use the PC's local IP, but the token is still required.
- Tokens are compared in constant time, and the page strips the token out of
  the URL bar after first load.

## Finding your stream

Set `channel` to a handle (`@yourhandle`), a channel id (`UC...`), or a full
channel URL. The bot polls that channel's `/live` page every `pollSeconds`,
attaches when you go live, and returns to polling when the broadcast ends — so
it survives across streams without a restart.

Set `videoId` instead to moderate one specific broadcast and exit when it ends.

## Settings

Everything in `config.json` mirrors the extension's options page:

| Key | Meaning |
|---|---|
| `moderation.mode` | `dry`, `hold`, or `auto` |
| `moderation.holdSeconds` / `holdDefault` | How long a held match waits, and what happens if you miss it |
| `moderation.standing.categories` | Per-category words, patterns and action (`delete`/`timeout`/`ban`) |
| `moderation.judgment.words` | Whole-word matches, leet-tolerant |
| `moderation.judgment.onMatch` | `act` (safety-first) or `hold` (the guide's ordering) |
| `moderation.judgment.lenientForMembers` | Section 3 leniency for known members |
| `moderation.allowList` | Messages containing these are never touched — judgment tier only |
| `moderation.strikes` | Repeat-offender escalation thresholds |
| `moderation.respectHumanMods` | Stand down on anything a human mod handled |
| `qa.trigger` | `prefix`, `questionMark`, or `both` |
| `qa.prefix` | Default `!ask` |
| `qa.cooldownSeconds` / `qa.maxRepliesPerHour` | Reply rate limits |
| `qa.maxReplyChars` | YouTube caps a chat message at 200 |

Environment overrides: `MOD_BOT_CHANNEL`, `MOD_BOT_VIDEO_ID`,
`MOD_BOT_MODE=hold`, `MOD_BOT_PORT`, `MOD_BOT_CONFIG=/path/to/config.json`,
`DASHBOARD_TOKEN`, `DASHBOARD_HOST`.

## Matching

Obfuscation is handled in the pattern rather than by rewriting the message,
because folding symbols to letters cannot work in general: `@` usually stands
for `a`, but in `f@ck` it stands for `u`. Each banned word expands into a
character class per letter, so `fuck` also catches `f@ck`, `f*ck`, `fuuck` and
`fvck`, while letter-adjacency lookarounds keep `Scunthorpe`, `class` and
`shitake` safe. `src/selftest.js` pins all of that down.

`src/moderation.js` shares its matching primitives with the extension's
`src/content.js`. The tiering above is headless-only — the extension still runs
a single flat word list, so the two are no longer feature-equivalent.

## Running it for real

systemd:

```ini
[Unit]
Description=YouTube mod bot
After=network-online.target

[Service]
WorkingDirectory=/opt/youtube-mod-bot/headless
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
User=modbot

[Install]
WantedBy=multi-user.target
```

The bot already retries with backoff and re-attaches between streams; `Restart`
covers the process dying outright.

## Limits

- Deleting is the only moderation action wired up. `masterchat` also exposes
  `timeout()` and `hide()` if you want to extend it.
- One channel per process. Run more instances for more channels.
- **A deletion cannot be undone.** YouTube has no un-delete for chat, so the
  dashboard's correction for a wrong call is "stop doing that" (allow the term),
  not "put it back". That asymmetry is why `hold` exists and why `holdDefault`
  is `skip`.
- Not runtime-tested against a live broadcast — the filter engine and the whole
  dashboard surface are covered by `npm run selftest`, but the YouTube calls
  need a real stream. Start in `dry`, then `hold`.
