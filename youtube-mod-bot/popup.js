import { DEFAULTS, withDefaults } from './src/defaults.js'

const $ = id => document.getElementById(id)

const LABELS = {
  deleted: 'deleted', wouldDelete: 'would delete', answered: 'answered', error: 'error',
  timeout: 'timeout', ban: 'ban', kept: 'kept', pack: 'pack', pass: 'pass', pending: 'held',
}

const send = msg => chrome.runtime.sendMessage(msg).catch(() => ({ ok: false }))

// Held matches live in the content script, which is where the message element
// is; the popup asks the chat tab for them.
//
// Both URL shapes matter. A popped-out chat is a tab whose own URL is
// /live_chat, but chat left embedded in the watch page is an iframe inside a
// /watch tab - the content script runs there too (all_frames), and querying
// only /live_chat meant the popup could not reach it at all. Delete and Keep
// did nothing, silently, for anyone who had not popped the chat out.
async function chatTabs () {
  return chrome.tabs.query({
    url: ['https://www.youtube.com/live_chat*', 'https://www.youtube.com/watch*'],
  })
}

async function askChat (message) {
  for (const tab of await chatTabs()) {
    try {
      const res = await chrome.tabs.sendMessage(tab.id, message)
      if (res) return res
    } catch { /* no content script in that tab */ }
  }
  return null
}

// Plain words for the three things that actually go wrong, so nobody has to
// open devtools to find out why nothing is happening.
async function renderStatus () {
  const el = $('status')
  const set = (kind, text) => { el.className = `status ${kind}`; el.textContent = text }

  const tabs = await chatTabs()
  if (!tabs.length) {
    set('warn', 'No live chat open. Open your stream\u2019s chat, then pop it out into its own window.')
    return
  }

  const res = await askChat({ type: 'STATUS' })
  if (!res?.ok) {
    set('warn', 'Found a YouTube tab, but the extension is not running in it. Reload that tab.')
    return
  }

  const s = res.status
  if (!s.attached) {
    set('warn', 'Chat tab open, but the chat list has not loaded yet. Give it a moment, or reload the chat.')
    return
  }
  if (s.canModerate === false) {
    set('bad', 'This account cannot moderate this chat \u2014 YouTube shows no moderation menu on messages. Sign in as the channel owner, or have that account made a moderator.')
    return
  }
  if (s.hidden) {
    set('warn', 'Chat window is hidden. Chrome slows hidden windows down and removals can fail \u2014 bring it back on screen.')
    return
  }
  if (!s.messagesSeen) {
    set('ok', 'Watching this chat. No messages yet.')
    return
  }
  const seen = `${s.messagesSeen} message${s.messagesSeen === 1 ? '' : 's'} seen`
  set('ok', s.canModerate
    ? `Watching this chat \u2014 ${seen}.`
    : `Watching this chat \u2014 ${seen}. No moderation menu seen yet.`)
}

function timeAgo (at) {
  const seconds = Math.round((Date.now() - at) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  return `${Math.round(seconds / 3600)}h ago`
}

async function render () {
  const stored = await chrome.storage.local.get(null)
  const config = withDefaults(stored)

  $('enabled').checked = config.enabled
  $('dry').hidden = config.moderation.mode !== 'dry'
  for (const b of document.querySelectorAll('.modes button')) {
    b.setAttribute('aria-pressed', String(b.dataset.mode === config.moderation.mode))
  }
  $('nokey').hidden = Boolean(config.apiKey) || !config.qa.enabled

  for (const key of ['deleted', 'wouldDelete', 'timeouts', 'bans', 'answered', 'errors']) {
    $(`s-${key}`).textContent = config.stats[key] ?? 0
  }

  renderStatus().catch(() => {})

  const packs = { total: 0, byName: {}, context: '', ...(stored.packs ?? {}) }
  $('pack-total').textContent = packs.total
  $('pack-bars').replaceChildren(...Object.entries(packs.byName).sort((a, b) => b[1] - a[1]).map(([name, n]) => {
    const row = document.createElement('div')
    row.className = 'bar'
    const left = document.createElement('span'); left.textContent = name
    const right = document.createElement('b'); right.textContent = n
    row.append(left, right)
    return row
  }))
  // Do not yank text out from under the host mid sentence.
  if (document.activeElement !== $('pack-context')) $('pack-context').value = packs.context

  renderHolds()

  const log = stored.log ?? []
  $('empty').hidden = log.length > 0
  $('log').replaceChildren(...log.slice(0, 25).map(entry => {
    const li = document.createElement('li')

    const kind = document.createElement('span')
    kind.className = `kind ${entry.kind}`
    kind.textContent = LABELS[entry.kind] ?? entry.kind

    const who = document.createElement('span')
    who.className = 'who'
    who.textContent = ` ${entry.author ?? ''} `

    const when = document.createElement('span')
    when.style.opacity = '.55'
    when.textContent = timeAgo(entry.at)

    const what = document.createElement('div')
    what.className = 'what'
    what.textContent = [entry.text, entry.detail].filter(Boolean).join(' — ')

    li.append(kind, who, when, what)
    return li
  }))
}

$('enabled').addEventListener('change', async () => {
  await chrome.storage.local.set({ enabled: $('enabled').checked })
})

$('options').addEventListener('click', () => chrome.runtime.openOptionsPage())

$('clear').addEventListener('click', async () => {
  // Every counter, not a hand-listed subset - a missed key leaves a stale
  // number on screen next to freshly zeroed ones.
  const cleared = Object.fromEntries(Object.keys(DEFAULTS.stats).map(k => [k, 0]))
  await chrome.storage.local.set({ log: [], stats: cleared })
  render()
})

chrome.storage.onChanged.addListener(render)
render()

// ── modes, packs and held matches ─────────────────────────────────────────

for (const b of document.querySelectorAll('.modes button')) {
  b.addEventListener('click', async () => {
    const stored = await chrome.storage.local.get('moderation')
    const moderation = { ...(stored.moderation ?? {}), mode: b.dataset.mode }
    await chrome.storage.local.set({ moderation })
  })
}

async function addPack () {
  const name = $('pack-name').value.trim()
  if (!name) return $('pack-name').focus()
  await send({ type: 'PACK_ADD', name })
  render()
}

$('pack-add').addEventListener('click', addPack)
$('pack-name').addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); addPack() } })
$('pack-undo').addEventListener('click', async () => { await send({ type: 'PACK_UNDO' }); render() })
$('pack-reset').addEventListener('click', async () => {
  if (!confirm('Reset the pack tally to zero? Notes are kept.')) return
  await send({ type: 'PACK_RESET' })
  render()
})

let contextTimer
$('pack-context').addEventListener('input', () => {
  clearTimeout(contextTimer)
  contextTimer = setTimeout(() => send({ type: 'PACK_CONTEXT', text: $('pack-context').value }), 600)
})

async function renderHolds () {
  const res = await askChat({ type: 'LIST_HOLDS' })
  const holds = res?.holds ?? []
  $('holds').replaceChildren(...holds.map(h => {
    const box = document.createElement('div')
    box.className = 'hold'

    const head = document.createElement('div')
    const who = document.createElement('b'); who.textContent = h.author
    const why = document.createElement('span'); why.style.opacity = '.7'; why.textContent = ` — matched "${h.term}"`
    head.append(who, why)

    const msg = document.createElement('div'); msg.className = 'msg'; msg.textContent = h.text

    const acts = document.createElement('div'); acts.className = 'acts'
    const del = document.createElement('button'); del.className = 'del'; del.textContent = 'Delete'
    del.onclick = async () => { await askChat({ type: 'RESOLVE_HOLD', pendingId: h.id, decision: 'delete' }); render() }
    const keep = document.createElement('button'); keep.className = 'keep'; keep.textContent = 'Keep'
    keep.onclick = async () => { await askChat({ type: 'RESOLVE_HOLD', pendingId: h.id, decision: 'keep' }); render() }
    acts.append(del, keep)

    box.append(head, msg, acts)
    return box
  }))
}

// Held matches expire on their own, so keep the panel fresh while it is open.
setInterval(renderHolds, 2000)
