// Runs inside the live chat frame (www.youtube.com/live_chat). Everything here
// drives the same native controls a human moderator clicks, using the session
// you are already signed in with — no API key, no YouTube Data API quota.
//
// Deleting requires the signed-in account to be the broadcast owner or a
// moderator of that chat. Without that, the per-message menu has no Remove item
// and the bot reports the failure instead of silently doing nothing.

const TAG = '[yt-mod-bot]'
const MESSAGE_TAG = 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER'

let config = null
const seenIds = new Set()
const ourOwnMessages = new Set()
let lastReplyAt = 0
const replyTimes = []

// ── utilities ──────────────────────────────────────────────────────────────

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function waitFor (fn, timeout = 2000, interval = 50) {
  const deadline = Date.now() + timeout
  for (;;) {
    const value = fn()
    if (value) return value
    if (Date.now() > deadline) return null
    await sleep(interval)
  }
}

function escapeRegExp (s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const LEET = { 4: 'a', '@': 'a', 3: 'e', 1: 'i', '!': 'i', '|': 'i', 0: 'o', 5: 's', $: 's', 7: 't', '+': 't' }

// Fold the usual filter-dodging tricks: accents, zero-width padding, leetspeak,
// and stretched letters ("shiiiit").
function normalize (text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[​-‏⁠﻿]/g, '')
    .toLowerCase()
    .replace(/[4@31!|05$7+]/g, ch => LEET[ch] ?? ch)
    .replace(/(.)\1{2,}/g, '$1')
}

// ── matching ───────────────────────────────────────────────────────────────

let matcher = { words: null, patterns: [], allow: [] }

function buildMatcher (moderation) {
  const words = (moderation.bannedWords ?? [])
    .map(w => normalize(String(w).trim()))
    .filter(Boolean)
    .map(escapeRegExp)

  const patterns = []
  for (const raw of moderation.bannedPatterns ?? []) {
    if (!String(raw).trim()) continue
    try {
      patterns.push(new RegExp(raw, 'i'))
    } catch {
      console.warn(TAG, 'ignoring invalid pattern:', raw)
    }
  }

  matcher = {
    words: words.length ? new RegExp(`\\b(${words.join('|')})\\b`, 'i') : null,
    patterns,
    allow: (moderation.allowList ?? []).map(w => normalize(String(w).trim())).filter(Boolean),
  }
}

function findViolation (text) {
  const normalized = normalize(text)
  if (matcher.allow.some(term => normalized.includes(term))) return null

  const wordHit = matcher.words?.exec(normalized)
  if (wordHit) return { term: wordHit[1], source: 'word' }

  for (const pattern of matcher.patterns) {
    if (pattern.test(text)) return { term: pattern.source, source: 'pattern' }
  }
  return null
}

// ── reading messages ───────────────────────────────────────────────────────

// Emoji arrive as <img alt=":smile:">; fold the alt text in so filters can see
// emoji-only spam.
function extractText (node) {
  let out = ''
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) out += child.textContent
    else if (child.tagName === 'IMG') out += child.getAttribute('alt') ?? ''
    else out += extractText(child)
  }
  return out
}

function readMessage (el) {
  const messageEl = el.querySelector('#message')
  return {
    id: el.getAttribute('id') ?? '',
    author: el.querySelector('#author-name')?.textContent?.trim() ?? 'someone',
    authorType: el.getAttribute('author-type') ?? '',
    text: messageEl ? extractText(messageEl).replace(/\s+/g, ' ').trim() : '',
  }
}

function isExempt (msg, moderation) {
  const type = msg.authorType
  if (moderation.exemptOwner && type.includes('owner')) return true
  if (moderation.exemptModerators && type.includes('moderator')) return true
  if (moderation.exemptMembers && type.includes('member')) return true
  return false
}

// ── native menu actions (serialized: only one menu can be open at a time) ───

let queue = Promise.resolve()

function enqueue (fn) {
  const run = () => fn().catch(err => console.warn(TAG, err))
  queue = queue.then(run)
  return queue
}

function openDropdowns () {
  return [...document.querySelectorAll('tp-yt-iron-dropdown')]
    .filter(d => d.getAttribute('aria-hidden') !== 'true' && d.offsetParent !== null)
}

function findRemoveItem (labels) {
  for (const dropdown of openDropdowns()) {
    const items = dropdown.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item')
    for (const item of items) {
      // Icon first — it survives YouTube being in any language.
      const icon = (item.querySelector('yt-icon')?.getAttribute('icon') ?? '').toLowerCase()
      if (icon.includes('delete') || icon.includes('trash')) return item

      const label = (item.textContent ?? '').trim().toLowerCase()
      if (label && labels.some(l => label === l || label.startsWith(l))) return item
    }
  }
  return null
}

function closeMenu () {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }))
}

async function deleteMessage (el, labels) {
  const button = el.querySelector('#menu-button button, #menu #menu-button button')
  if (!button) return { ok: false, reason: 'no message menu — is this account a moderator of the chat?' }

  // The menu button is only painted on hover; the click lands either way, but
  // hovering first matches what YouTube expects.
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  button.click()

  const item = await waitFor(() => findRemoveItem(labels), 2500)
  if (!item) {
    closeMenu()
    return { ok: false, reason: 'menu opened but had no Remove entry (check Remove labels in options)' }
  }

  item.click()
  await sleep(150)
  return { ok: true }
}

async function sendChatMessage (text) {
  const input = document.querySelector('div#input.yt-live-chat-text-input-field-renderer, yt-live-chat-text-input-field-renderer div#input')
  if (!input) return { ok: false, reason: 'chat input not found — signed out, or chat is in view-only mode' }

  input.focus()
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(input)
  selection.removeAllRanges()
  selection.addRange(range)

  // execCommand produces the same event sequence as real typing, which is what
  // Polymer watches to enable the send button.
  if (!document.execCommand('insertText', false, text)) {
    input.textContent = text
    input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }))
  }

  const send = await waitFor(() => {
    const button = document.querySelector('#send-button button, yt-live-chat-message-input-renderer #send-button button')
    if (!button) return null
    const disabled = button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true'
    return disabled ? null : button
  }, 2000)

  if (!send) return { ok: false, reason: 'send button never enabled' }
  send.click()
  ourOwnMessages.add(text.trim())
  return { ok: true }
}

// ── question answering ─────────────────────────────────────────────────────

function isQuestion (text, qa) {
  const trimmed = text.trim()
  const byPrefix = Boolean(qa.prefix) && trimmed.toLowerCase().startsWith(qa.prefix.toLowerCase())
  const byMark = trimmed.endsWith('?')
  if (qa.trigger === 'prefix') return byPrefix
  if (qa.trigger === 'questionMark') return byMark
  return byPrefix || byMark
}

function stripPrefix (text, qa) {
  const trimmed = text.trim()
  if (qa.prefix && trimmed.toLowerCase().startsWith(qa.prefix.toLowerCase())) {
    return trimmed.slice(qa.prefix.length).trim()
  }
  return trimmed
}

function canReply (qa) {
  const now = Date.now()
  if (now - lastReplyAt < (qa.cooldownSeconds ?? 0) * 1000) return false
  while (replyTimes.length && now - replyTimes[0] > 3600_000) replyTimes.shift()
  return replyTimes.length < (qa.maxRepliesPerHour ?? 60)
}

function log (entry) {
  chrome.runtime.sendMessage({ type: 'LOG_ACTION', entry }).catch(() => {})
}

async function answerQuestion (msg, qa) {
  const question = stripPrefix(msg.text, qa)
  if (!question) return

  const res = await chrome.runtime.sendMessage({ type: 'ASK_CLAUDE', question, author: msg.author })
  if (!res?.ok) {
    console.warn(TAG, 'ask failed:', res?.error)
    return
  }

  const mention = qa.mentionAsker ? `@${msg.author} ` : ''
  const body = res.answer.slice(0, Math.max(20, (qa.maxReplyChars ?? 190) - mention.length))
  const sent = await sendChatMessage(`${mention}${body}`)

  if (sent.ok) {
    lastReplyAt = Date.now()
    replyTimes.push(lastReplyAt)
  } else {
    log({ kind: 'error', author: msg.author, detail: `reply not sent: ${sent.reason}` })
  }
}

// ── main ───────────────────────────────────────────────────────────────────

async function handleMessage (el) {
  if (!config?.enabled) return

  const msg = readMessage(el)
  if (!msg.text || (msg.id && seenIds.has(msg.id))) return
  if (msg.id) seenIds.add(msg.id)
  if (seenIds.size > 2000) seenIds.clear()

  // Never react to our own replies.
  if (ourOwnMessages.has(msg.text)) {
    ourOwnMessages.delete(msg.text)
    return
  }

  if (config.moderation.enabled && !isExempt(msg, config.moderation)) {
    const hit = findViolation(msg.text)
    if (hit) {
      if (config.moderation.dryRun) {
        log({ kind: 'wouldDelete', author: msg.author, text: msg.text, detail: `matched ${hit.source} "${hit.term}"` })
      } else {
        enqueue(async () => {
          const res = await deleteMessage(el, config.moderation.removeLabels ?? [])
          log(res.ok
            ? { kind: 'deleted', author: msg.author, text: msg.text, detail: `matched ${hit.source} "${hit.term}"` }
            : { kind: 'error', author: msg.author, text: msg.text, detail: res.reason })
        })
      }
      // A message being removed is not a question worth answering.
      return
    }
  }

  if (config.qa.enabled && isQuestion(msg.text, config.qa)) {
    if (config.qa.skipOwnerMessages && msg.authorType.includes('owner')) return
    if (!canReply(config.qa)) return
    enqueue(() => answerQuestion(msg, config.qa))
  }
}

async function loadConfig () {
  const res = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' })
  if (!res?.ok) return
  config = res.config
  buildMatcher(config.moderation)
}

async function attach () {
  const items = await waitFor(
    () => document.querySelector('#items.yt-live-chat-item-list-renderer, yt-live-chat-item-list-renderer #items'),
    30_000,
    250
  )
  if (!items) {
    console.warn(TAG, 'chat item list never appeared; not attaching')
    return
  }

  // Treat everything already on screen as history — the bot only acts on
  // messages that arrive from now on.
  for (const child of items.children) {
    const id = child.getAttribute?.('id')
    if (id) seenIds.add(id)
  }

  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === MESSAGE_TAG) {
          handleMessage(node)
        }
      }
    }
  }).observe(items, { childList: true })

  console.info(TAG, 'watching live chat')
}

chrome.storage.onChanged.addListener(() => { loadConfig() })

loadConfig().then(attach)
