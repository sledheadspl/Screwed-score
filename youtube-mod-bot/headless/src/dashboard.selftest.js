// Boots the dashboard against a fake config - no YouTube, no Anthropic - and
// exercises the HTTP surface the phone actually uses: token auth, the command
// endpoint, the hold/override path, and the SSE feed.

import assert from 'node:assert/strict'
import { runtime, emit } from './hub.js'
import { buildRules } from './rules.js'
import { startDashboard } from './dashboard.js'
import { holdViolation } from './actions.js'

const TOKEN = 'test-token-123'
const PORT = 8899
const BASE = `http://127.0.0.1:${PORT}`

// Minimal config; configPath points at a temp file so saveConfig is harmless.
runtime.config = {
  channel: '@test', model: 'claude-sonnet-5', pollSeconds: 60,
  configPath: '/tmp/mod-bot-selftest-config.json',
  moderation: {
    enabled: true, mode: 'hold', holdSeconds: 25, holdDefault: 'skip',
    standing: { categories: {} },
    judgment: { words: ['shit'], patterns: [], onMatch: 'act', lenientForMembers: true },
    allowList: [],
    strikes: { enabled: true, timeoutAt: 2, banAt: 3 },
    respectHumanMods: true,
  },
  qa: { enabled: true, trigger: 'prefix', prefix: '!ask', systemPrompt: 'x', cooldownSeconds: 20, maxRepliesPerHour: 60, mentionAsker: true, skipOwnerMessages: true, maxReplyChars: 190 },
  dashboard: { enabled: true, port: PORT },
  dashboardToken: TOKEN,
  dashboardHost: '127.0.0.1',
}
runtime.rules = buildRules(runtime.config.moderation)

const server = startDashboard(runtime.config)
await new Promise(r => setTimeout(r, 250))

let failures = 0
const check = async (name, fn) => {
  try { await fn(); console.log(`  ok  ${name}`) }
  catch (e) { failures++; console.error(`FAIL  ${name}\n      ${e.message}`) }
}

const post = (body, tok = TOKEN) => fetch(`${BASE}/api/command`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-mod-token': tok },
  body: JSON.stringify(body),
})

console.log('auth')
await check('rejects a missing token', async () => {
  const res = await fetch(`${BASE}/api/state`)
  assert.equal(res.status, 401)
})
await check('rejects a wrong token', async () => {
  const res = await fetch(`${BASE}/api/state?token=nope`)
  assert.equal(res.status, 401)
})
await check('rejects a wrong-length token without throwing', async () => {
  const res = await fetch(`${BASE}/api/state?token=short`)
  assert.equal(res.status, 401)
})
await check('accepts the token in the query', async () => {
  const res = await fetch(`${BASE}/api/state?token=${TOKEN}`)
  assert.equal(res.status, 200)
})
await check('accepts the token in a header', async () => {
  const res = await fetch(`${BASE}/api/state`, { headers: { 'x-mod-token': TOKEN } })
  assert.equal(res.status, 200)
})

console.log('\npage')
await check('serves the dashboard html', async () => {
  const res = await fetch(`${BASE}/?token=${TOKEN}`)
  const html = await res.text()
  assert.equal(res.status, 200)
  assert.ok(html.includes('<title>Mod Bot</title>'), 'missing title')
  assert.ok(html.includes('/api/command'), 'missing command wiring')
})

console.log('\nlist edits')
await check('/allow adds a term and rebuilds the matcher', async () => {
  const res = await post({ type: 'allow', term: 'Scunthorpe' })
  const data = await res.json()
  assert.ok(data.ok, data.error)
  assert.ok(runtime.config.moderation.allowList.includes('scunthorpe'))
})
await check('/ban adds a banned word', async () => {
  const res = await post({ type: 'ban', term: 'BadWord' })
  assert.ok((await res.json()).ok)
  assert.ok(runtime.config.moderation.judgment.words.includes('badword'))
})
await check('/unban removes it again', async () => {
  const res = await post({ type: 'unban', term: 'badword' })
  assert.ok((await res.json()).ok)
  assert.ok(!runtime.config.moderation.judgment.words.includes('badword'))
})
await check('mode change sticks', async () => {
  const res = await post({ type: 'mode', mode: 'auto' })
  assert.equal((await res.json()).mode, 'auto')
  assert.equal(runtime.config.moderation.mode, 'auto')
  await post({ type: 'mode', mode: 'hold' })
})
await check('an unknown mode is refused', async () => {
  const res = await post({ type: 'mode', mode: 'nonsense' })
  assert.equal(res.status, 400)
  assert.equal(runtime.config.moderation.mode, 'hold')
})
await check('pause toggles', async () => {
  assert.equal((await (await post({ type: 'pause', paused: true })).json()).paused, true)
  assert.equal(runtime.paused, true)
  await post({ type: 'pause', paused: false })
})
await check('an unknown command is refused', async () => {
  const res = await post({ type: 'launch_missiles' })
  assert.equal(res.status, 400)
})

console.log('\nacting with no live stream')
await check('say fails cleanly, not with a crash', async () => {
  const res = await post({ type: 'say', text: 'hello' })
  const data = await res.json()
  assert.equal(res.status, 400)
  assert.match(data.error, /not attached/)
})

console.log('\nhold and override')
await check('a held match can be kept', async () => {
  const chat = { id: 'chat-1', authorName: 'Viewer' }
  const id = holdViolation(chat, 'oh shit', { term: 'shit', source: 'word' })
  assert.equal(runtime.pending.size, 1)
  const res = await post({ type: 'keep', pendingId: id })
  assert.ok((await res.json()).ok)
  assert.equal(runtime.pending.size, 0, 'pending should be cleared')
  assert.ok(runtime.feed.some(f => f.kind === 'kept'), 'no kept event recorded')
})
await check('resolving a stale id is a no-op, not an error', async () => {
  const res = await post({ type: 'keep', pendingId: 'does-not-exist' })
  assert.equal((await res.json()).resolved, false)
})
await check('state exposes pending items', async () => {
  const chat = { id: 'chat-2', authorName: 'Viewer2' }
  holdViolation(chat, 'more shit', { term: 'shit', source: 'word' })
  const state = await (await fetch(`${BASE}/api/state?token=${TOKEN}`)).json()
  assert.equal(state.pending.length, 1)
  assert.equal(state.pending[0].author, 'Viewer2')
})

console.log('\npack tracking')
await check('a pack can be added over HTTP', async () => {
  const res = await post({ type: 'pack', name: 'Prismatic Evolutions' })
  const data = await res.json()
  assert.ok(data.ok, data.error)
  assert.equal(data.total, 1)
})
await check('the tally shows up in state', async () => {
  const state = await (await fetch(`${BASE}/api/state?token=${TOKEN}`)).json()
  assert.equal(state.packs.total, 1)
  assert.deepEqual(state.packs.byName, [['Prismatic Evolutions', 1]])
})
await check('undo works over HTTP', async () => {
  await post({ type: 'unpack' })
  const state = await (await fetch(`${BASE}/api/state?token=${TOKEN}`)).json()
  assert.equal(state.packs.total, 0)
})
await check('host notes round-trip', async () => {
  await post({ type: 'context', text: 'Going for the Umbreon alt art.' })
  const state = await (await fetch(`${BASE}/api/state?token=${TOKEN}`)).json()
  assert.match(state.packs.context, /Umbreon/)
})
await check('pack commands need the token too', async () => {
  const res = await post({ type: 'pack', name: 'sneaky' }, 'wrong-token-value')
  assert.equal(res.status, 401)
})

console.log('\nlive feed (SSE)')
await check('streams a snapshot then live events', async () => {
  const res = await fetch(`${BASE}/events?token=${TOKEN}`)
  assert.equal(res.headers.get('content-type'), 'text/event-stream')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  const first = decoder.decode((await reader.read()).value)
  assert.ok(first.includes('event: snapshot'), 'no snapshot frame')

  emit({ kind: 'pass', author: 'Someone', text: 'hi there' })
  let seen = ''
  for (let i = 0; i < 3 && !seen.includes('event: feed'); i++) {
    seen += decoder.decode((await reader.read()).value)
  }
  assert.ok(seen.includes('event: feed'), 'no feed frame')
  assert.ok(seen.includes('hi there'), 'feed frame missing payload')
  await reader.cancel()
})

server.close()
console.log(failures ? `\n${failures} failing` : '\nall passing')
process.exit(failures ? 1 : 0)
