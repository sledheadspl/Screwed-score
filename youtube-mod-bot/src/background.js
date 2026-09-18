// Service worker: owns settings, the activity log, and every call to the
// Anthropic API. The API key never reaches the YouTube page context — the
// content script asks for an answer and gets back text.

import { DEFAULTS, withDefaults } from './defaults.js'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const LOG_LIMIT = 100

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(null)
  await chrome.storage.local.set(withDefaults(stored))
})

async function getConfig () {
  return withDefaults(await chrome.storage.local.get(null))
}

async function bumpStat (key, by = 1) {
  const { stats } = await getConfig()
  const next = { ...stats, [key]: (stats[key] ?? 0) + by }
  await chrome.storage.local.set({ stats: next })
  return next
}

async function appendLog (entry) {
  const { log = [] } = await chrome.storage.local.get('log')
  const next = [{ at: Date.now(), ...entry }, ...log].slice(0, LOG_LIMIT)
  await chrome.storage.local.set({ log: next })
}

// Packs opened and the host's notes. Stored alongside settings but edited from
// the popup, never the options form - it is a running tally, not a setting.
async function getPacks () {
  const { packs } = await chrome.storage.local.get('packs')
  return { total: 0, byName: {}, log: [], context: '', ...(packs ?? {}) }
}

async function addPack (name, qty = 1) {
  const packs = await getPacks()
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ') || 'unnamed'
  const count = Math.max(1, Math.min(100, Number(qty) || 1))

  packs.byName[clean] = (packs.byName[clean] ?? 0) + count
  packs.total += count
  packs.log = [{ at: Date.now(), name: clean, qty: count }, ...packs.log].slice(0, 500)

  await chrome.storage.local.set({ packs })
  return { name: clean, qty: count, total: packs.total }
}

async function undoPack () {
  const packs = await getPacks()
  const last = packs.log.shift()
  if (!last) return null

  packs.total = Math.max(0, packs.total - last.qty)
  packs.byName[last.name] = Math.max(0, (packs.byName[last.name] ?? 0) - last.qty)
  if (!packs.byName[last.name]) delete packs.byName[last.name]

  await chrome.storage.local.set({ packs })
  return last
}

// What Claude is told. "How many packs so far?" is the most asked question in a
// pack-opening stream, and a model with no tally will produce a confident
// number rather than admit it has none.
async function streamFacts () {
  const packs = await getPacks()
  const parts = []
  if (packs.context) parts.push(`Stream notes from the host: ${packs.context}`)

  const breakdown = Object.entries(packs.byName).sort((a, b) => b[1] - a[1])
  if (packs.total > 0) {
    parts.push(`Packs opened so far this stream: ${packs.total} (${breakdown.map(([n, c]) => `${n} x${c}`).join(', ')}).`)
  } else {
    parts.push('No packs have been opened yet this stream.')
  }
  return parts.join(' ')
}

async function askClaude (question, author) {
  const config = await getConfig()
  if (!config.apiKey) throw new Error('No API key set — open the extension options.')

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      // Required for calls made from a browser/extension context.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model || DEFAULTS.model,
      max_tokens: 150,
      // Live facts ride along with every question.
      system: `${config.qa.systemPrompt || DEFAULTS.qa.systemPrompt}\n\n${await streamFacts()}`,
      messages: [{
        role: 'user',
        // Fenced and labelled so the model treats it as a quoted question
        // rather than as part of its own instructions.
        content: `A viewer named "${author}" asked in live chat:\n<question>\n${question}\n</question>`,
      }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = (data.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) throw new Error('Empty response from Claude')
  return text.slice(0, config.qa.maxReplyChars || DEFAULTS.qa.maxReplyChars)
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg?.type) {
    case 'GET_CONFIG':
      getConfig().then(config => sendResponse({ ok: true, config }))
      return true

    case 'ASK_CLAUDE':
      askClaude(msg.question, msg.author)
        .then(async answer => {
          await bumpStat('answered')
          await appendLog({ kind: 'answered', author: msg.author, text: msg.question, detail: answer })
          sendResponse({ ok: true, answer })
        })
        .catch(async err => {
          await bumpStat('errors')
          await appendLog({ kind: 'error', author: msg.author, detail: String(err.message ?? err) })
          sendResponse({ ok: false, error: String(err.message ?? err) })
        })
      return true

    case 'PACK_ADD':
      addPack(msg.name, msg.qty).then(added => sendResponse({ ok: true, ...added }))
        .catch(err => sendResponse({ ok: false, error: String(err?.message ?? err) }))
      return true

    case 'PACK_UNDO':
      undoPack().then(undone => sendResponse({ ok: true, undone }))
        .catch(err => sendResponse({ ok: false, error: String(err?.message ?? err) }))
      return true

    case 'PACK_RESET':
      // Resetting the tally between streams should not wipe the notes.
      getPacks()
        .then(packs => chrome.storage.local.set({ packs: { ...packs, total: 0, byName: {}, log: [] } }))
        .then(() => sendResponse({ ok: true }))
      return true

    case 'PACK_CONTEXT':
      getPacks().then(packs => chrome.storage.local.set({
        packs: { ...packs, context: String(msg.text ?? '').trim().slice(0, 2000) },
      })).then(() => sendResponse({ ok: true }))
      return true

    case 'LOG_ACTION':
      // Moderation outcomes are decided in the page; the worker only records them.
      bumpStat(msg.entry.kind === 'deleted' ? 'deleted' : msg.entry.kind === 'wouldDelete' ? 'wouldDelete' : 'errors')
        .then(() => appendLog(msg.entry))
        .then(() => sendResponse({ ok: true }))
      return true

    default:
      return false
  }
})
