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

Run the offline checks on the filter any time you change a word list:

```bash
npm run selftest
```

### Getting the cookies

Sign in to YouTube as the account that moderates the chat — the broadcast owner
or a moderator — then open DevTools → Application → Cookies → `youtube.com` and
copy `SAPISID`, `APISID`, `HSID`, `SID` and `SSID` into `.env`.

**These are live credentials for that Google account.** Anyone holding them can
act as you. Keep `.env` out of version control (it already is), give the bot its
own moderator account if you can, and sign that account out to revoke them.

Without cookies the bot still starts and logs what it *would* do, but cannot
delete or reply.

## Dry run comes first

`dryRun` is `true` in the example config, and nothing is deleted and no replies
are sent until you set it to `false`. Run a stream that way, read the log, fix
the false positives, then go live with it.

This matters more here than in the extension. A server-side bot keeps running
unattended — which also means a bad filter keeps deleting unattended.

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
| `moderation.dryRun` | Log matches without acting |
| `moderation.bannedWords` | Whole-word matches, leet-tolerant |
| `moderation.bannedPatterns` | Regex against the raw message |
| `moderation.allowList` | Messages containing these are never touched |
| `moderation.exempt*` | Skip owner / moderators / members |
| `qa.trigger` | `prefix`, `questionMark`, or `both` |
| `qa.prefix` | Default `!ask` |
| `qa.cooldownSeconds` / `qa.maxRepliesPerHour` | Reply rate limits |
| `qa.maxReplyChars` | YouTube caps a chat message at 200 |

Environment overrides: `MOD_BOT_CHANNEL`, `MOD_BOT_VIDEO_ID`,
`MOD_BOT_DRY_RUN=false`, `MOD_BOT_CONFIG=/path/to/config.json`.

## Matching

Obfuscation is handled in the pattern rather than by rewriting the message,
because folding symbols to letters cannot work in general: `@` usually stands
for `a`, but in `f@ck` it stands for `u`. Each banned word expands into a
character class per letter, so `fuck` also catches `f@ck`, `f*ck`, `fuuck` and
`fvck`, while letter-adjacency lookarounds keep `Scunthorpe`, `class` and
`shitake` safe. `src/selftest.js` pins all of that down.

`src/moderation.js` is kept byte-identical in behaviour to the extension's
`src/content.js`. Change one, change the other, and run the self-test.

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
- Not runtime-tested against a live broadcast — the filter engine is covered by
  the self-test, but the YouTube calls need a real stream. Start in dry run.
