// Per-stream wiring. One instance runs for the life of one broadcast;
// index.js supervises and re-attaches for the next one. Every message that
// passes through here produces a feed entry, so the dashboard shows what the
// bot saw, not just what it acted on.

import { Masterchat, stringify } from '@stu43005/masterchat'
import { findViolation, isExempt } from './moderation.js'
import { askClaude } from './claude.js'
import { runtime, emit, patch } from './hub.js'
import { ourMessages, holdViolation, removeMessage, say } from './actions.js'
import { log, info } from './log.js'

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

export async function runStream ({ videoId, signal }) {
  const config = runtime.config
  const mc = await Masterchat.init(videoId, { credentials: config.credentials ?? undefined })

  runtime.mc = mc
  runtime.videoId = videoId
  runtime.title = mc.metadata?.title ?? null
  patch({ attached: true, videoId, title: runtime.title })
  info(`attached to ${videoId}${runtime.title ? ` - ${runtime.title}` : ''}`)
  emit({ kind: 'system', detail: `attached to ${videoId}` })

  const seen = new Set()
  const replyTimes = []
  let lastReplyAt = 0

  // Serialize every write to YouTube: one action at a time, in arrival order.
  let queue = Promise.resolve()
  const enqueue = fn => {
    queue = queue.then(() => fn().catch(err => {
      runtime.stats.errors += 1
      log('error', String(err?.message ?? err))
      emit({ kind: 'error', detail: String(err?.message ?? err) })
    }))
  }

  const canReply = () => {
    const now = Date.now()
    if (now - lastReplyAt < config.qa.cooldownSeconds * 1000) return false
    while (replyTimes.length && now - replyTimes[0] > 3600_000) replyTimes.shift()
    return replyTimes.length < config.qa.maxRepliesPerHour
  }

  async function answerQuestion (chat, text) {
    const question = stripPrefix(text, config.qa)
    if (!question) return

    const author = chat.authorName ?? 'someone'
    const answer = await askClaude({
      apiKey: config.anthropicApiKey,
      model: config.model,
      systemPrompt: config.qa.systemPrompt,
      question,
      author,
      maxReplyChars: config.qa.maxReplyChars,
    })

    const mention = config.qa.mentionAsker ? `@${author} ` : ''
    const body = answer.slice(0, Math.max(20, config.qa.maxReplyChars - mention.length))
    const outgoing = `${mention}${body}`

    if (config.moderation.mode === 'dry') {
      emit({ kind: 'answered', author, text, detail: `[dry run, not sent] ${outgoing}` })
      return
    }

    await say(outgoing)
    lastReplyAt = Date.now()
    replyTimes.push(lastReplyAt)
    emit({ kind: 'answered', author, text, detail: outgoing })
  }

  mc.on('chat', chat => {
    const text = (stringify(chat.message) ?? '').replace(/\s+/g, ' ').trim()
    if (!text || seen.has(chat.id)) return
    seen.add(chat.id)
    if (seen.size > 5000) seen.clear()

    if (ourMessages.has(text)) {
      ourMessages.delete(text)
      return
    }

    const author = chat.authorName ?? 'someone'
    const base = { author, text, chatId: chat.id }

    if (runtime.paused) {
      runtime.stats.passed += 1
      emit({ ...base, kind: 'pass', detail: 'paused' })
      return
    }

    if (config.moderation.enabled && !isExempt(chat, config.moderation)) {
      const hit = runtime.matcher ? findViolation(runtime.matcher, text) : null
      if (hit) {
        const why = `matched ${hit.source} "${hit.term}"`
        const mode = config.moderation.mode

        if (mode === 'dry') {
          runtime.stats.wouldDelete += 1
          emit({ ...base, kind: 'wouldDelete', detail: why, term: hit.term })
        } else if (mode === 'hold') {
          holdViolation(chat, text, hit)
        } else {
          enqueue(() => removeMessage(chat.id, { author, text, reason: why }))
        }
        // A message being removed is not a question worth answering.
        return
      }
    }

    if (config.qa.enabled && isQuestion(text, config.qa)) {
      if (config.qa.skipOwnerMessages && chat.isOwner) return
      if (!canReply()) {
        runtime.stats.passed += 1
        emit({ ...base, kind: 'pass', detail: 'question, but rate limited' })
        return
      }
      enqueue(() => answerQuestion(chat, text))
      return
    }

    runtime.stats.passed += 1
    emit({ ...base, kind: 'pass' })
  })

  mc.on('error', err => {
    runtime.stats.errors += 1
    log('error', `stream: ${err?.message ?? err}`)
    emit({ kind: 'error', detail: String(err?.message ?? err) })
  })

  mc.on('end', reason => {
    info(`stream ended${reason ? ` (${reason})` : ''}`)
    emit({ kind: 'system', detail: `stream ended${reason ? ` (${reason})` : ''}` })
  })

  const onAbort = () => mc.stop()
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    await mc.listen({ ignoreFirstResponse: true })
    await queue
  } finally {
    signal?.removeEventListener('abort', onAbort)
    runtime.mc = null
    runtime.videoId = null
    patch({ attached: false })
  }
}
