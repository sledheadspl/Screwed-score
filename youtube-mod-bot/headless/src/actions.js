// Every action that touches YouTube or mutates settings, in one place, so the
// bot and the dashboard cannot drift into doing the same thing two ways.

import { randomUUID } from 'node:crypto'
import { runtime, emit, patch } from './hub.js'
import { buildRules } from './rules.js'
import { saveConfig } from './config.js'
import { log } from './log.js'

// Texts we posted ourselves, so the bot does not moderate or answer its own
// messages when they come back down the chat stream.
export const ourMessages = new Set()

function requireLive () {
  if (!runtime.mc) throw new Error('not attached to a live chat right now')
  return runtime.mc
}

export async function say (text, { detail = 'sent by you' } = {}) {
  const trimmed = String(text).trim().slice(0, 200)
  if (!trimmed) throw new Error('empty message')
  const mc = requireLive()

  // Match what the chat stream will hand back: it collapses whitespace, so
  // storing the raw form here would miss our own message and let the bot
  // treat its reply as a viewer's.
  ourMessages.add(trimmed.replace(/\s+/g, ' '))

  const sent = await mc.sendMessage(trimmed)

  // The response carries our own channel id. Learning it once turns
  // self-recognition from fragile text matching into an identity check -
  // which matters because the bot usually runs as a moderator account, where
  // isOwner is false and the owner-only guard does not apply.
  if (sent?.authorExternalChannelId && !runtime.selfChannelId) {
    runtime.selfChannelId = sent.authorExternalChannelId
  }

  emit({ kind: 'said', text: trimmed, detail })
  return trimmed
}

export function isSelf (chat) {
  return Boolean(runtime.selfChannelId) && chat.authorChannelId === runtime.selfChannelId
}

export async function removeMessage (chatId, { author, text, reason } = {}) {
  const mc = requireLive()
  await mc.remove(chatId)
  runtime.stats.deleted += 1
  emit({ kind: 'deleted', author, text, detail: reason ?? 'removed by you' })
}

// Queue a match for a human decision. Resolves itself after holdSeconds using
// holdDefault, which defaults to leaving the message alone — an unnoticed
// deletion is the mistake you cannot take back.
export function holdViolation (chat, text, hit, verdict = null) {
  const id = randomUUID()
  const seconds = runtime.config.moderation.holdSeconds ?? 25
  const expiresAt = Date.now() + seconds * 1000

  const timer = setTimeout(() => {
    resolvePending(id, runtime.config.moderation.holdDefault === 'delete' ? 'delete' : 'keep', 'timed out')
      .catch(err => log('error', String(err?.message ?? err)))
  }, seconds * 1000)
  timer.unref?.()

  runtime.pending.set(id, { chat, text, hit, verdict, expiresAt, timer })
  runtime.stats.held += 1
  emit({
    kind: 'pending',
    pendingId: id,
    author: chat.authorName ?? 'someone',
    text,
    detail: `matched ${hit.source} "${hit.term}"`,
    expiresAt,
  })
  patch({ pending: true })
  return id
}

export async function resolvePending (id, decision, why = 'by you') {
  const item = runtime.pending.get(id)
  if (!item) return false
  clearTimeout(item.timer)
  runtime.pending.delete(id)

  const author = item.chat.authorName ?? 'someone'

  if (decision === 'delete') {
    try {
      if (item.verdict) await enforce(item.chat, item.text, item.verdict)
      else await removeMessage(item.chat.id, { author, text: item.text, reason: `held match, ${why}` })
    } catch (err) {
      runtime.stats.errors += 1
      emit({ kind: 'error', author, text: item.text, detail: String(err?.message ?? err) })
    }
  } else {
    emit({ kind: 'kept', author, text: item.text, detail: `left up, ${why}` })
  }

  patch({ pending: runtime.pending.size > 0 })
  return true
}

function rebuild () {
  runtime.rules = buildRules(runtime.config.moderation, message => log('warn', message))
}

function listRef (list) {
  const mod = runtime.config.moderation
  if (list === 'allowList') return mod.allowList
  if (list === 'bannedWords' || list === 'judgment') return mod.judgment.words
  throw new Error(`unknown list: ${list}`)
}

export async function addTerm (list, term) {
  const clean = String(term).trim().toLowerCase()
  if (!clean) throw new Error('empty term')
  const target = listRef(list)
  if (!target.includes(clean)) target.push(clean)
  rebuild()
  await saveConfig(runtime.config)
  emit({ kind: 'config', detail: `added "${clean}" to ${list}` })
  return clean
}

export async function removeTerm (list, term) {
  const clean = String(term).trim().toLowerCase()
  const target = listRef(list)
  const index = target.indexOf(clean)
  if (index >= 0) target.splice(index, 1)
  rebuild()
  await saveConfig(runtime.config)
  emit({ kind: 'config', detail: `removed "${clean}" from ${list}` })
  return clean
}

export async function setMode (mode) {
  if (!['dry', 'hold', 'auto'].includes(mode)) throw new Error(`unknown mode: ${mode}`)
  runtime.config.moderation.mode = mode
  await saveConfig(runtime.config)
  emit({ kind: 'config', detail: `mode set to ${mode}` })
  patch({ mode })
  return mode
}

export function setPaused (paused) {
  runtime.paused = Boolean(paused)
  emit({ kind: 'config', detail: runtime.paused ? 'paused' : 'resumed' })
  patch({ paused: runtime.paused })
  return runtime.paused
}

// ── enforcement (guide sections 2, 5 and 6) ────────────────────────────────

// Section 5: never contradict a call a human mod already made. If a human has
// already removed this message or swept this author, the bot stands down.
export function markHumanHandled (id) {
  if (!id) return
  runtime.humanHandled.add(id)
  if (runtime.humanHandled.size > 5000) runtime.humanHandled.clear()

  // Anything queued for approval on that message is moot now.
  for (const [pendingId, item] of runtime.pending) {
    if (item.chat.id === id || item.chat.authorChannelId === id) {
      clearTimeout(item.timer)
      runtime.pending.delete(pendingId)
      emit({ kind: 'kept', author: item.chat.authorName, text: item.text, detail: 'a human mod already handled this' })
    }
  }
  patch({ pending: runtime.pending.size > 0 })
}

export function alreadyHandled (chat) {
  return runtime.humanHandled.has(chat.id) || runtime.humanHandled.has(chat.authorChannelId)
}

export async function timeoutUser (channelId, { author, reason } = {}) {
  const mc = requireLive()
  await mc.timeout(channelId)
  runtime.stats.timeouts += 1
  emit({ kind: 'timeout', author, detail: reason ?? 'timed out' })
}

export async function banUser (channelId, { author, reason } = {}) {
  const mc = requireLive()
  await mc.hide(channelId)
  runtime.stats.bans += 1
  emit({ kind: 'ban', author, detail: reason ?? 'hidden from chat' })
}

const ACTION_RANK = { delete: 0, timeout: 1, ban: 2 }

// "Never ban, only mute" as one ceiling rather than an edit to every rule.
// Applied after the rules have decided, so a rule that asks for a ban still
// escalates as far as the ceiling allows and no further. A ban is the action
// you cannot quietly take back, so the ceiling is a timeout unless a caller
// names a higher one - an absent setting must not read as "no ceiling".
function capAction (action, maxAction) {
  const ceiling = ACTION_RANK[maxAction] === undefined ? ACTION_RANK.timeout : ACTION_RANK[maxAction]
  return (ACTION_RANK[action] ?? 0) > ceiling ? maxAction : action
}

// Section 6 escalation: delete, then timeout, then ban on repeat hits.
function nextAction (channelId, baseAction) {
  const cfg = runtime.config.moderation.strikes ?? {}
  if (!cfg.enabled) return baseAction

  const record = runtime.strikes.get(channelId) ?? { count: 0, author: null }
  record.count += 1
  runtime.strikes.set(channelId, record)

  if (record.count >= (cfg.banAt ?? 3)) return 'ban'
  if (record.count >= (cfg.timeoutAt ?? 2)) return 'timeout'
  return baseAction
}

// Carries out one verdict from rules.evaluate(). Deleting always happens first:
// timeouts and bans stop future messages but do not remove the one in hand.
export async function enforce (chat, text, verdict) {
  const author = chat.authorName ?? 'someone'
  const why = `${verdict.tier}/${verdict.category} "${verdict.term}"`

  // Repeats of anything count, not just standing violations: someone swearing
  // in every message is the person causing the problem, and deleting each one
  // for ever is not moderation.
  const escalated = nextAction(chat.authorChannelId, verdict.action)
  const record = runtime.strikes.get(chat.authorChannelId)
  if (record) record.author = author
  const action = capAction(escalated, runtime.config.moderation.maxAction)

  await removeMessage(chat.id, { author, text, reason: why })

  if (action === 'timeout') {
    await timeoutUser(chat.authorChannelId, { author, reason: `repeat ${verdict.category}` })
  } else if (action === 'ban') {
    await banUser(chat.authorChannelId, { author, reason: `repeat ${verdict.category}` })
  }
}
