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
const pending = new Map()   // held matches awaiting a decision
let lastReplyAt = 0
const replyTimes = []

// ── utilities ──────────────────────────────────────────────────────────────

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Thin wrapper over the engine's hidden-aware waiter. A buried tab has its
// timers throttled, so the budget and the attempt floor both matter.
function waitFor (fn, timeout = 2000, interval = 50) {
  return ModBot.waitFor(fn, { timeout, interval, hidden: () => document.hidden })
}

// ── rules (shared engine, see src/engine/engine.js) ───────────────────────

let rules = null
const strikes = new Map()        // author channel key -> standing hits this session
const humanHandled = new Set()   // ids a human mod already acted on

function buildRules (moderation) {
  rules = ModBot.buildRules(moderation, message => console.warn(TAG, message))
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

// The DOM gives one author-type string; the engine wants flags, so both halves
// of this project decide trust the same way.
function actorOf (msg) {
  const type = msg.authorType
  return {
    isOwner: type.includes('owner'),
    isModerator: type.includes('moderator'),
    isMember: type.includes('member'),
  }
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

// Three passes over the whole menu, weakest evidence last. Doing this per item
// instead - icon then label, item by item - lets a loose label match on an
// earlier entry beat the exact icon on a later one: YouTube has shipped a
// "Remove user from this channel" entry above "Remove", and matching
// removeLabels by prefix there bans a viewer for a word that deserved a
// deleted message. Ranking is the only thing standing between those two.
function menuItems () {
  const out = []
  for (const dropdown of openDropdowns()) {
    for (const item of dropdown.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item')) {
      out.push({
        item,
        icon: (item.querySelector('yt-icon')?.getAttribute('icon') ?? '').toLowerCase(),
        label: (item.textContent ?? '').trim().toLowerCase(),
      })
    }
  }
  return out
}

function findMenuItem (labels, icons) {
  const entries = menuItems()

  // 1. Icon: language-independent, and the only unambiguous signal.
  for (const entry of entries) {
    if (entry.icon && icons.some(name => entry.icon.includes(name))) return entry.item
  }
  // 2. Exact label: "remove" matches "Remove", never "Remove user...".
  for (const entry of entries) {
    if (entry.label && labels.some(l => entry.label === l)) return entry.item
  }
  // 3. Prefix label: last resort, for wordings we have not seen.
  for (const entry of entries) {
    if (entry.label && labels.some(l => entry.label.startsWith(l))) return entry.item
  }
  return null
}

function closeMenu () {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }))
}

const ACTION_MENU = {
  delete: { icons: ['delete', 'trash'], labels: m => m.removeLabels ?? [] },
  timeout: { icons: ['timer', 'hourglass'], labels: m => m.timeoutLabels ?? [] },
  ban: { icons: ['visibility_off', 'remove_circle'], labels: m => m.banLabels ?? [] },
}

// Every moderation action is the same gesture: open the message's own menu and
// click an entry. Only the entry differs, which is why they share one path.
async function actOnMessage (el, action, moderation) {
  const spec = ACTION_MENU[action]
  if (!spec) return { ok: false, reason: `unknown action: ${action}` }

  const button = el.querySelector('#menu-button button, #menu #menu-button button')
  if (!button) return { ok: false, reason: 'no message menu - is this account a moderator of the chat?' }

  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  button.click()

  const item = await waitFor(() => findMenuItem(spec.labels(moderation), spec.icons), 2500)
  if (!item) {
    closeMenu()
    // Reporting the wrong cause sends someone off to edit their menu labels
    // when the real problem is a tab Chrome has throttled.
    return document.hidden
      ? { ok: false, reason: `could not find the ${action} entry while the chat tab is hidden - Chrome throttles timers in background tabs, so keep the popped-out chat window visible` }
      : { ok: false, reason: `menu opened but had no ${action} entry (check the labels in options)` }
  }

  item.click()
  await sleep(150)

  // Timeout and ban raise a confirmation in some layouts; take it if present.
  const confirm = await waitFor(() => {
    for (const dialog of document.querySelectorAll('tp-yt-paper-dialog, yt-confirm-dialog-renderer')) {
      if (dialog.offsetParent === null) continue
      const yes = dialog.querySelector('#confirm-button button, yt-button-renderer#confirm-button button')
      if (yes) return yes
    }
    return null
  }, 600)
  if (confirm) { confirm.click(); await sleep(120) }

  // A removal is the one action whose outcome is visible, so check it instead
  // of trusting the click: YouTube marks the renderer is-deleted, or drops the
  // node. Reporting success for a menu entry that turned out to be something
  // else is how a wrong click becomes a wrong log entry nobody questions.
  if (action === 'delete') {
    const gone = await waitFor(() => (!el.isConnected || el.hasAttribute('is-deleted')) || null, 1500)
    if (!gone) return { ok: false, reason: 'clicked remove but the message never showed as deleted - the menu entry may not be the remove entry (check the labels in options)' }
  }

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

// Section 6 escalation carries out one verdict: remove the message first, then
// timeout or ban the author if they have been here before.
async function enforce (el, msg, verdict) {
  const moderation = config.moderation

  // Repeats of anything count, not just standing violations: someone swearing
  // in every message is the person causing the problem, and deleting each one
  // for ever is not moderation. Display name is the only author handle the DOM
  // reliably gives us - a weaker key than a channel id, since names can change
  // or collide - so strikes are session-scoped and deliberately conservative.
  const step = ModBot.escalate(strikes, msg.author, verdict.action, moderation.strikes)
  const action = ModBot.capAction(step.action, moderation.maxAction)

  const why = `${verdict.tier}/${verdict.category} "${verdict.term}"`
  const removed = await actOnMessage(el, 'delete', moderation)
  if (!removed.ok) {
    log({ kind: 'error', author: msg.author, text: msg.text, detail: removed.reason })
    return
  }
  log({ kind: 'deleted', author: msg.author, text: msg.text, detail: why })

  if (action === 'timeout' || action === 'ban') {
    const extra = await actOnMessage(el, action, moderation)
    log(extra.ok
      ? { kind: action, author: msg.author, detail: `repeat ${verdict.category}` }
      : { kind: 'error', author: msg.author, detail: extra.reason })
  }
}

// Section 5: a message a human mod already removed shows up struck through, so
// the bot can see the call was made and stay out of it.
function watchForHumanActions (items) {
  new MutationObserver(records => {
    if (!config?.moderation?.respectHumanMods) return
    for (const record of records) {
      const el = record.target
      if (el?.hasAttribute?.('is-deleted')) {
        const id = el.getAttribute('id')
        if (id) humanHandled.add(id)
      }
    }
    if (humanHandled.size > 3000) humanHandled.clear()
  }).observe(items, { attributes: true, attributeFilter: ['is-deleted'], subtree: true })
}

async function handleMessage (el) {
  if (!config?.enabled) return

  const msg = readMessage(el)
  if (!msg.text || (msg.id && seenIds.has(msg.id))) return
  if (msg.id) seenIds.add(msg.id)
  if (seenIds.size > 2000) seenIds.clear()

  // Never react to our own replies. The extension has no channel id to compare
  // (a content script cannot read the page's own JS state), so this is text
  // matching plus the staff rule below - weaker than the headless bot's
  // identity check, and the reason staff are never answered here.
  if (ourOwnMessages.has(msg.text)) {
    ourOwnMessages.delete(msg.text)
    return
  }

  if (config.moderation.respectHumanMods && (humanHandled.has(msg.id) || el.hasAttribute('is-deleted'))) {
    log({ kind: 'pass', author: msg.author, text: msg.text, detail: 'a human mod already handled this' })
    return
  }

  const actor = actorOf(msg)

  if (config.moderation.enabled && rules) {
    const verdict = ModBot.evaluate(rules, actor, msg.text)
    if (verdict) {
      const why = `${verdict.tier}/${verdict.category} "${verdict.term}"`
      const detail = verdict.reason ? `${why} - ${verdict.reason}` : why
      const mode = config.moderation.mode

      if (mode === 'dry') {
        log({ kind: 'wouldDelete', author: msg.author, text: msg.text, detail, term: verdict.term, tier: verdict.tier })
      } else if (verdict.immediate) {
        // Standing rules act first and explain after, in every mode but dry.
        enqueue(() => enforce(el, msg, verdict))
      } else if (mode === 'hold' || verdict.hold) {
        holdForApproval(el, msg, verdict)
      } else {
        enqueue(() => enforce(el, msg, verdict))
      }
      return
    }
  }

  if (config.qa.enabled && isQuestion(msg.text, config.qa)) {
    // Staff are never answered: without an identity check, that is what stops
    // the bot answering its own replies when it runs as owner or moderator.
    if (actor.isOwner || actor.isModerator) return
    if (!canReply(config.qa)) return
    enqueue(() => answerQuestion(msg, config.qa))
  }
}

// A held match waits for a decision in the popup. holdDefault decides if the
// wait runs out - 'skip' by default, because an unnoticed deletion is the
// mistake you cannot take back.
function holdForApproval (el, msg, verdict) {
  const id = `${msg.id || msg.author}-${Date.now()}`
  const seconds = config.moderation.holdSeconds ?? 25
  const expiresAt = Date.now() + seconds * 1000

  pending.set(id, { el, msg, verdict, expiresAt })
  log({ kind: 'pending', pendingId: id, author: msg.author, text: msg.text, detail: `matched ${verdict.term}`, expiresAt })

  setTimeout(() => {
    if (!pending.has(id)) return
    resolveHold(id, config.moderation.holdDefault === 'delete' ? 'delete' : 'keep', 'timed out')
  }, seconds * 1000)
}

function resolveHold (id, decision, why = 'by you') {
  const item = pending.get(id)
  if (!item) return false
  pending.delete(id)

  if (decision === 'delete') enqueue(() => enforce(item.el, item.msg, item.verdict))
  else log({ kind: 'kept', author: item.msg.author, text: item.msg.text, detail: `left up, ${why}` })
  return true
}

async function loadConfig () {
  const res = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' })
  if (!res?.ok) return
  config = res.config
  buildRules(config.moderation)
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

  watchForHumanActions(items)

  console.info(TAG, 'watching live chat')

  // Moderation actions need the tab visible; warn when it is not, once per
  // transition, so the cause is on the record before the failures are.
  let warnedHidden = false
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { warnedHidden = false; return }
    if (warnedHidden || !config?.enabled) return
    if (config.moderation?.mode === 'dry') return
    warnedHidden = true
    log({ kind: 'error', detail: 'chat tab is hidden - Chrome throttles background tabs, so removals may fail until it is visible again' })
  })
}

// The popup resolves held matches through the worker, which relays to here.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'RESOLVE_HOLD') {
    sendResponse({ ok: resolveHold(msg.pendingId, msg.decision) })
    return true
  }
  if (msg?.type === 'LIST_HOLDS') {
    sendResponse({
      ok: true,
      holds: [...pending.entries()].map(([id, p]) => ({
        id, author: p.msg.author, text: p.msg.text, term: p.verdict.term, expiresAt: p.expiresAt,
      })),
    })
    return true
  }
  return false
})

chrome.storage.onChanged.addListener(() => { loadConfig() })

loadConfig().then(attach)
