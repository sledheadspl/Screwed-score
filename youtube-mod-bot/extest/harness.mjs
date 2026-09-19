// Loads the real unpacked extension into Chromium and drives it against a
// replica of YouTube's live chat DOM. This is the only test that executes the
// removal path - everything else in the project tests the engine, not the
// clicking.
//
//   xvfb-run -a node harness.mjs
//
// Chromium is at /opt/pw-browsers (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 in this
// image), and MV3 extensions need a headful browser, hence xvfb.

import { chromium } from 'playwright'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
// The extension is the directory above this one; the browser has to be pointed
// at, because an MV3 extension will not load in a headless one and Playwright's
// bundled path differs per machine. See README.md.
const EXT = process.env.EXT_PATH || join(HERE, '..')
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const chatUrl = (variant = '') => `https://www.youtube.com/live_chat?v=harness${variant ? `&${variant}` : ''}`

let passed = 0
const failures = []

function check (name, ok, detail = '') {
  if (ok) { passed += 1; console.log(`  ok   ${name}`) }
  else { failures.push(`${name}${detail ? ` - ${detail}` : ''}`); console.log(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`) }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── plumbing ───────────────────────────────────────────────────────────────

async function extensionId (context) {
  for (let i = 0; i < 60; i++) {
    const worker = context.serviceWorkers()[0]
    if (worker) return new URL(worker.url()).host
    await sleep(250)
  }
  throw new Error('extension service worker never registered - did the manifest fail to parse?')
}

// Settings are written through the options page: it is an extension page, so
// chrome.storage.local is reachable from page.evaluate.
async function writeConfig (context, id, config) {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${id}/options.html`)
  await page.evaluate(async cfg => {
    await chrome.storage.local.clear()
    await chrome.storage.local.set(cfg)
  }, config)
  await page.close()
}

async function readStorage (context, id, key) {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${id}/options.html`)
  const value = await page.evaluate(k => chrome.storage.local.get(k).then(r => r[k]), key)
  await page.close()
  return value
}

// The log is written by the service worker after the action finishes, and the
// removal check adds a wait of its own, so a single snapshot can read an empty
// log for work that is about to be recorded.
async function logUntil (context, id, predicate, limit = 6000) {
  const started = Date.now()
  for (;;) {
    const log = (await readStorage(context, id, 'log')) ?? []
    if (predicate(log) || Date.now() - started > limit) return log
    await sleep(200)
  }
}

async function openChat (context, fixture, variant = '') {
  const page = await context.newPage()
  const logs = []
  page.on('console', m => logs.push(`${m.type()}: ${m.text()}`))
  page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))

  await page.route('https://www.youtube.com/**', route =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fixture }))

  await page.goto(chatUrl(variant))
  // The content script announces itself once it has found the item list.
  for (let i = 0; i < 80; i++) {
    if (logs.some(l => l.includes('watching live chat'))) break
    await sleep(250)
  }
  return { page, logs }
}

// Push a message, then wait for the extension to go quiet. Actions are
// serialized through one queue and a delete+timeout pair takes ~1.5s (two menu
// waits plus two confirm-dialog waits), so a fixed sleep races the bot.
async function settle (page, { quietFor = 1200, limit = 20_000 } = {}) {
  const started = Date.now()
  let last = -1
  let lastChange = Date.now()
  for (;;) {
    const count = await page.evaluate(() => window.__acted.length)
    if (count !== last) { last = count; lastChange = Date.now() }
    else if (Date.now() - lastChange >= quietFor) break
    if (Date.now() - started > limit) break
    await sleep(150)
  }
  return page.evaluate(() => window.__acted)
}

async function send (page, id, author, text, authorType = '') {
  await page.evaluate(([i, a, t, ty]) => window.__addMessage(i, a, t, ty), [id, author, text, authorType])
  return settle(page)
}

const actsFor = (acted, id) => acted.filter(a => a.id === id).map(a => a.act)

// ── the run ────────────────────────────────────────────────────────────────

const base = {
  enabled: true,
  moderation: {
    enabled: true,
    mode: 'auto',
    judgment: { words: ['fuck', 'shit'], patterns: [], onMatch: 'act', lenientForMembers: true },
    standing: { categories: {} },
    allowList: [],
    strikes: { enabled: true, timeoutAt: 2, banAt: 3 },
    respectHumanMods: true,
  },
  qa: { enabled: false },
}

const fixture = await readFile(join(HERE, 'fixture.html'), 'utf8')
const userDataDir = await mkdtemp(join(tmpdir(), 'modbot-profile-'))

const context = await chromium.launchPersistentContext(userDataDir, {
  executablePath: CHROME,
  headless: false,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox'],
})

try {
  const id = await extensionId(context)
  console.log(`extension loaded: ${id}\n`)

  // 1. auto mode removes a judgment match ------------------------------------
  console.log('auto mode, judgment word')
  await writeConfig(context, id, base)
  {
    const { page, logs } = await openChat(context, fixture)
    check('content script attached', logs.some(l => l.includes('watching live chat')), logs.slice(-3).join(' | '))

    let acted = await send(page, 'm1', 'Troll', 'you are a f@ck idiot')
    check('removed the obfuscated match', actsFor(acted, 'm1').includes('delete'), JSON.stringify(acted))
    check('stopped at remove, no escalation', actsFor(acted, 'm1').length === 1, JSON.stringify(actsFor(acted, 'm1')))
    check('message shows as deleted', await page.$eval('#m1', el => el.hasAttribute('is-deleted')))

    acted = await send(page, 'm2', 'Fan', 'these pulls are insane')
    check('left a clean message alone', actsFor(acted, 'm2').length === 0, JSON.stringify(acted))

    acted = await send(page, 'm3', 'TheHost', 'this shit is wild', 'owner')
    check('left the owner alone', actsFor(acted, 'm3').length === 0, JSON.stringify(acted))

    acted = await send(page, 'm4', 'ModFriend', 'holy shit', 'moderator')
    check('left a moderator alone', actsFor(acted, 'm4').length === 0, JSON.stringify(acted))

    acted = await send(page, 'm5', 'Supporter', 'that is some shit luck', 'member')
    check('held a member instead of removing', actsFor(acted, 'm5').length === 0, JSON.stringify(acted))
    const holds = await logUntil(context, id, l => l.some(e => e.kind === 'pending' && e.author === 'Supporter'))
    check('logged the member hold as pending', holds.some(e => e.kind === 'pending' && e.author === 'Supporter'),
      JSON.stringify(holds.slice(0, 3)))

    const log = await logUntil(context, id, l => l.some(e => e.kind === 'deleted'))
    check('logged the removal with its reason',
      log.some(e => e.kind === 'deleted' && e.author === 'Troll' && /judgment/.test(e.detail ?? '')),
      JSON.stringify(log.find(e => e.kind === 'deleted')))
    await page.close()
  }

  // 2. dry mode touches nothing ----------------------------------------------
  console.log('\ndry mode')
  await writeConfig(context, id, { ...base, moderation: { ...base.moderation, mode: 'dry' } })
  {
    const { page } = await openChat(context, fixture)
    const acted = await send(page, 'd1', 'Troll', 'what the fuck')
    check('dry mode clicked nothing', acted.length === 0, JSON.stringify(acted))
    const log = await logUntil(context, id, l => l.some(e => e.kind === 'wouldDelete'))
    check('dry mode logged wouldDelete', log.some(e => e.kind === 'wouldDelete' && e.author === 'Troll'),
      JSON.stringify(log.slice(0, 2)))
    await page.close()
  }

  // 3. standing rule: delete then escalate ----------------------------------
  console.log('\nstanding rule escalation')
  await writeConfig(context, id, base)
  {
    const { page } = await openChat(context, fixture)
    let acted = await send(page, 's1', 'Spammer', 'free robux at bit.ly/x')
    check('first spam link: remove + timeout', String(actsFor(acted, 's1')) === 'delete,timeout', JSON.stringify(actsFor(acted, 's1')))

    acted = await send(page, 's2', 'Spammer', 'discord.gg/join me')
    check('second: still remove + timeout', String(actsFor(acted, 's2')) === 'delete,timeout', JSON.stringify(actsFor(acted, 's2')))

    acted = await send(page, 's3', 'Spammer', 'cash.app me for cards')
    check('third: remove + ban', String(actsFor(acted, 's3')) === 'delete,ban', JSON.stringify(actsFor(acted, 's3')))

    acted = await send(page, 's4', 'Newcomer', 'bit.ly/whatever')
    check('strikes are per author', String(actsFor(acted, 's4')) === 'delete,timeout', JSON.stringify(actsFor(acted, 's4')))

    acted = await send(page, 's5', 'Supporter', 'discord.gg/pokebank', 'member')
    check('standing rules apply to members too', String(actsFor(acted, 's5')) === 'delete,timeout', JSON.stringify(actsFor(acted, 's5')))

    // The counters are the one thing a host actually looks at. Every outcome
    // above succeeded, so an error here means the popup is calling success a
    // failure - which it did, counting timeouts and bans as errors and leaving
    // the timeout tile it displays at zero.
    await logUntil(context, id, l => l.filter(e => e.kind === 'deleted').length >= 5)
    const stats = (await readStorage(context, id, 'stats')) ?? {}
    check('counted five removals', stats.deleted === 5, JSON.stringify(stats))
    check('counted the timeouts separately', stats.timeouts === 4, JSON.stringify(stats))
    check('counted the ban separately', stats.bans === 1, JSON.stringify(stats))
    check('counted no errors, because there were none', (stats.errors ?? 0) === 0, JSON.stringify(stats))
    await page.close()
  }

  // 4. history and human mods ------------------------------------------------
  console.log('\nhistory and human mods')
  await writeConfig(context, id, base)
  {
    const page = await context.newPage()
    await page.route('https://www.youtube.com/**', route =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fixture }))
    const logs = []
    page.on('console', m => logs.push(m.text()))
    // Seed the list before the content script attaches, so it counts as backlog.
    await page.addInitScript(() => {
      window.addEventListener('DOMContentLoaded', () => window.__addMessage('h1', 'Troll', 'old fuck message', ''))
    })
    await page.goto(chatUrl())
    for (let i = 0; i < 80; i++) {
      if (logs.some(l => l.includes('watching live chat'))) break
      await sleep(250)
    }
    let acted = await settle(page)
    check('ignored the backlog already on screen', acted.length === 0, JSON.stringify(acted))

    // A human mod removes it first: the bot must not touch it.
    await page.evaluate(() => {
      const el = window.__addMessage('h2', 'Troll', 'another fuck message', '')
      document.getElementById(el).setAttribute('is-deleted', '')
    })
    acted = await settle(page)
    check('stayed out of a message a human already removed', actsFor(acted, 'h2').length === 0, JSON.stringify(acted))
    await page.close()
  }

  // 5. allow list and moderation off -----------------------------------------
  console.log('\nallow list and kill switch')
  await writeConfig(context, id, { ...base, moderation: { ...base.moderation, allowList: ['holy shit'] } })
  {
    const { page } = await openChat(context, fixture)
    let acted = await send(page, 'a1', 'Fan', 'holy shit that is a good pull')
    check('allow list spared the phrase', actsFor(acted, 'a1').length === 0, JSON.stringify(acted))
    acted = await send(page, 'a2', 'Fan', 'holy shit and also bit.ly/x')
    check('allow list does not shield a standing rule', actsFor(acted, 'a2').includes('delete'), JSON.stringify(acted))
    await page.close()
  }

  await writeConfig(context, id, { ...base, enabled: false })
  {
    const { page } = await openChat(context, fixture)
    const acted = await send(page, 'k1', 'Troll', 'what the fuck')
    check('master switch off stops everything', acted.length === 0, JSON.stringify(acted))
    await page.close()
  }

  // 6. the account is not a moderator --------------------------------------
  // The likeliest real failure: the extension is loaded on an account with no
  // moderation powers, so the per-message menu simply is not there. It has to
  // say so rather than look like it worked.
  console.log('\nviewer account, no moderation menu')
  await writeConfig(context, id, base)
  {
    const { page } = await openChat(context, fixture, 'noMenu=1')
    const acted = await send(page, 'v1', 'Troll', 'what the fuck')
    check('clicked nothing when there is no menu', acted.length === 0, JSON.stringify(acted))
    const log = await logUntil(context, id, l => l.some(e => e.kind === 'error' && e.author === 'Troll'))
    const err = log.find(e => e.kind === 'error' && e.author === 'Troll')
    check('reported the missing menu as an error', Boolean(err), JSON.stringify(log.slice(0, 2)))
    check('the error names the moderator cause', /moderator/i.test(err?.detail ?? ''), err?.detail)
    await page.close()
  }

  // 7. confirmation dialog on timeout and ban -------------------------------
  console.log('\nconfirmation dialog')
  await writeConfig(context, id, base)
  {
    const { page } = await openChat(context, fixture, 'confirm=1')
    let acted = await send(page, 'c1', 'Spammer', 'bit.ly/x free robux')
    check('took the confirmation and completed the timeout',
      String(actsFor(acted, 'c1')) === 'delete,timeout', JSON.stringify(actsFor(acted, 'c1')))
    check('dialog was dismissed afterwards', await page.$eval('#confirm-dialog', el => !el.hasAttribute('open')))

    acted = await send(page, 'c2', 'Spammer', 'discord.gg/x')
    acted = await send(page, 'c3', 'Spammer', 'cash.app me')
    check('confirmed ban on the third strike',
      String(actsFor(acted, 'c3')) === 'delete,ban', JSON.stringify(actsFor(acted, 'c3')))
    const log = await logUntil(context, id, l => l.some(e => e.kind === 'ban'))
    check('logged the escalations, not errors',
      log.some(e => e.kind === 'ban') && !log.some(e => e.kind === 'error'),
      JSON.stringify(log.slice(0, 4)))
    await page.close()
  }

  // 8. YouTube in another language, no icons -------------------------------
  // Icon matching is what normally carries this; with the icons gone only the
  // label list can find the entries, which is the half users have to edit.
  console.log('\nlocalized menu, label fallback only')
  await writeConfig(context, id, base)
  {
    const { page } = await openChat(context, fixture, 'lang=de')
    const acted = await send(page, 'g1', 'Spammer', 'bit.ly/x')
    check('matched the German labels', String(actsFor(acted, 'g1')) === 'delete,timeout', JSON.stringify(actsFor(acted, 'g1')))
    await page.close()
  }

  // 8b. a menu whose entries can be confused --------------------------------
  console.log('\nambiguous menu labels')
  await writeConfig(context, id, base)
  {
    const { page } = await openChat(context, fixture, 'ambiguous=1')
    const acted = await send(page, 'x1', 'Fan', 'this is shit')
    check('removed the message and did not ban anyone',
      String(actsFor(acted, 'x1')) === 'delete', JSON.stringify(actsFor(acted, 'x1')))
    await page.close()
  }

  // 8c. a remove click that does not remove anything ------------------------
  console.log('\nremove click with no effect')
  await writeConfig(context, id, base)
  {
    const { page } = await openChat(context, fixture, 'noopRemove=1&confirm=0')
    const acted = await send(page, 'n1', 'Spammer', 'bit.ly/x')
    check('did not escalate on an unconfirmed removal',
      String(actsFor(acted, 'n1')) === 'delete', JSON.stringify(actsFor(acted, 'n1')))
    const log = await logUntil(context, id, l => l.some(e => e.kind === 'error'))
    check('reported it as an error, not a deletion',
      log.some(e => e.kind === 'error' && /never showed as deleted/.test(e.detail ?? '')) &&
      !log.some(e => e.kind === 'deleted'),
      JSON.stringify(log.slice(0, 3)))
    await page.close()
  }

  // 8d. the list that actually ships ----------------------------------------
  // Everything above sets its own word list, so none of it tests what a host
  // gets out of the box. Compounds are the gap: the leading anchor that keeps
  // "Scunthorpe" safe also means "bullshit" does not follow from "shit".
  console.log('\nshipped default word list')
  await writeConfig(context, id, {
    enabled: true,
    moderation: { enabled: true, mode: 'auto', standing: { categories: {} }, strikes: { enabled: false } },
    qa: { enabled: false },
  })
  {
    const { page } = await openChat(context, fixture, '')
    let acted = await send(page, 'w1', 'Troll', 'this stream is bullshit')
    check('a compound on the default list is removed', actsFor(acted, 'w1').includes('delete'), JSON.stringify(acted))
    acted = await send(page, 'w2', 'Troll', 'what a dickhead')
    check('and so is the other common one', actsFor(acted, 'w2').includes('delete'), JSON.stringify(acted))
    acted = await send(page, 'w3', 'Chef', 'these shitake mushrooms are great')
    check('but Scunthorpe cases stay safe', actsFor(acted, 'w3').length === 0, JSON.stringify(acted))
    acted = await send(page, 'w4', 'Fan', 'that pull is amazing')
    check('and clean messages stay up', actsFor(acted, 'w4').length === 0, JSON.stringify(acted))
    await page.close()
  }

  // 9. hold mode and the override round trip -------------------------------
  // What the popup does, through the same messages the popup sends.
  console.log('\nhold mode and the override')
  await writeConfig(context, id, { ...base, moderation: { ...base.moderation, mode: 'hold', holdSeconds: 600 } })
  {
    const { page } = await openChat(context, fixture, '')
    let acted = await send(page, 'p1', 'Troll', 'this is shit')
    check('hold mode did not act on its own', acted.length === 0, JSON.stringify(acted))

    const popup = await context.newPage()
    await popup.goto(`chrome-extension://${id}/popup.html`)
    const relay = message => popup.evaluate(async msg => {
      for (const tab of await chrome.tabs.query({ url: 'https://www.youtube.com/live_chat*' })) {
        try { const res = await chrome.tabs.sendMessage(tab.id, msg); if (res) return res } catch {}
      }
      return null
    }, message)

    const holds = await relay({ type: 'LIST_HOLDS' })
    check('the popup can see the held match', holds?.holds?.length === 1, JSON.stringify(holds))
    check('the hold carries the author and the term',
      holds?.holds?.[0]?.author === 'Troll' && Boolean(holds?.holds?.[0]?.term), JSON.stringify(holds?.holds?.[0]))

    const keep = await relay({ type: 'RESOLVE_HOLD', pendingId: holds.holds[0].id, decision: 'keep' })
    check('keeping it resolves the hold', keep?.ok === true, JSON.stringify(keep))
    acted = await settle(page)
    check('keeping it clicked nothing', acted.length === 0, JSON.stringify(acted))
    check('the hold is gone', (await relay({ type: 'LIST_HOLDS' }))?.holds?.length === 0)

    await send(page, 'p2', 'Troll', 'more shit')
    const again = await relay({ type: 'LIST_HOLDS' })
    const deleted = await relay({ type: 'RESOLVE_HOLD', pendingId: again.holds[0].id, decision: 'delete' })
    check('approving it resolves the hold', deleted?.ok === true, JSON.stringify(deleted))
    acted = await settle(page)
    check('approving it removed the message', actsFor(acted, 'p2').includes('delete'), JSON.stringify(acted))

    const stale = await relay({ type: 'RESOLVE_HOLD', pendingId: again.holds[0].id, decision: 'delete' })
    check('a second decision on the same hold is refused', stale?.ok === false, JSON.stringify(stale))
    await popup.close()
    await page.close()
  }
} finally {
  await context.close()
  await rm(userDataDir, { recursive: true, force: true })
}

console.log(`\n${passed} passed, ${failures.length} failed`)
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
