// Every action that touches YouTube or mutates settings, in one place, so the
// bot and the dashboard cannot drift into doing the same thing two ways.

import { randomUUID } from 'node:crypto'
import { runtime, emit, patch } from './hub.js'
import { buildMatcher } from './moderation.js'
import { saveConfig } from './config.js'
import { log } from './log.js'

// Texts we posted ourselves, so the bot does not moderate or answer its own
// messages when they come back down the chat stream.
export const ourMessages = new Set()

function requireLive () {
  if (!runtime.mc) throw new Error('not attached to a live chat right now')
  return runtime.mc
}

export async function say (text) {
  const trimmed = String(text).trim().slice(0, 200)
  if (!trimmed) throw new Error('empty message')
  const mc = requireLive()

  ourMessages.add(trimmed)
  await mc.sendMessage(trimmed)
  runtime.stats.answered += 1
  emit({ kind: 'said', text: trimmed, detail: 'sent by you' })
  return trimmed
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
export function holdViolation (chat, text, hit) {
  const id = randomUUID()
  const seconds = runtime.config.moderation.holdSeconds ?? 25
  const expiresAt = Date.now() + seconds * 1000

  const timer = setTimeout(() => {
    resolvePending(id, runtime.config.moderation.holdDefault === 'delete' ? 'delete' : 'keep', 'timed out')
      .catch(err => log('error', String(err?.message ?? err)))
  }, seconds * 1000)
  timer.unref?.()

  runtime.pending.set(id, { chat, text, hit, expiresAt, timer })
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
      await removeMessage(item.chat.id, { author, text: item.text, reason: `held match, ${why}` })
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
  runtime.matcher = buildMatcher(runtime.config.moderation, message => log('warn', message))
}

export async function addTerm (list, term) {
  const clean = String(term).trim().toLowerCase()
  if (!clean) throw new Error('empty term')
  const target = runtime.config.moderation[list]
  if (!target) throw new Error(`unknown list: ${list}`)
  if (!target.includes(clean)) target.push(clean)
  rebuild()
  await saveConfig(runtime.config)
  emit({ kind: 'config', detail: `added "${clean}" to ${list}` })
  return clean
}

export async function removeTerm (list, term) {
  const clean = String(term).trim().toLowerCase()
  const target = runtime.config.moderation[list]
  if (!target) throw new Error(`unknown list: ${list}`)
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
