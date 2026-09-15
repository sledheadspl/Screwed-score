// Per-stream wiring. One instance of this runs for the life of one broadcast;
// index.js supervises and re-attaches for the next one.

import { Masterchat, stringify } from '@stu43005/masterchat'
import { findViolation, isExempt } from './moderation.js'
import { askClaude } from './claude.js'
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

export async function runStream ({ videoId, config, matcher, stats, signal }) {
  const mc = await Masterchat.init(videoId, { credentials: config.credentials ?? undefined })
  info(`attached to ${videoId}${mc.metadata?.title ? ` - ${mc.metadata.title}` : ''}`)

  const seen = new Set()
  const ourMessages = new Set()
  const replyTimes = []
  let lastReplyAt = 0

  // Serialize every write to YouTube: one action at a time, in arrival order.
  let queue = Promise.resolve()
  const enqueue = fn => {
    queue = queue.then(() => fn().catch(err => {
      stats.errors += 1
      log('error', String(err?.message ?? err))
    }))
  }

  const canReply = () => {
    const now = Date.now()
    if (now - lastReplyAt < config.qa.cooldownSeconds * 1000) return false
    while (replyTimes.length && now - replyTimes[0] > 3600_000) replyTimes.shift()
    return replyTimes.length < config.qa.maxRepliesPerHour
  }

  async function deleteMessage (chat, text, hit) {
    const who = chat.authorName ?? 'someone'
    const why = `matched ${hit.source} "${hit.term}"`

    if (config.moderation.dryRun) {
      stats.wouldDelete += 1
      log('wouldDelete', `${who}: ${text}`, why)
      return
    }

    await mc.remove(chat.id)
    stats.deleted += 1
    log('deleted', `${who}: ${text}`, why)
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

    if (config.moderation.dryRun) {
      stats.answered += 1
      log('answered', `[dry run, not sent] ${outgoing}`, `asked by ${author}`)
      return
    }

    ourMessages.add(outgoing.trim())
    await mc.sendMessage(outgoing)
    lastReplyAt = Date.now()
    replyTimes.push(lastReplyAt)
    stats.answered += 1
    log('answered', outgoing, `asked by ${author}`)
  }

  mc.on('chat', chat => {
    const text = (stringify(chat.message) ?? '').replace(/\s+/g, ' ').trim()
    if (!text || seen.has(chat.id)) return
    seen.add(chat.id)
    if (seen.size > 5000) seen.clear()

    // Never react to our own replies.
    if (ourMessages.has(text)) {
      ourMessages.delete(text)
      return
    }

    if (config.moderation.enabled && !isExempt(chat, config.moderation)) {
      const hit = findViolation(matcher, text)
      if (hit) {
        enqueue(() => deleteMessage(chat, text, hit))
        // A message being removed is not a question worth answering.
        return
      }
    }

    if (config.qa.enabled && isQuestion(text, config.qa)) {
      if (config.qa.skipOwnerMessages && chat.isOwner) return
      if (!canReply()) return
      enqueue(() => answerQuestion(chat, text))
    }
  })

  mc.on('error', err => {
    stats.errors += 1
    log('error', `stream: ${err?.message ?? err}`)
  })

  mc.on('end', reason => info(`stream ended${reason ? ` (${reason})` : ''}`))

  const onAbort = () => mc.stop()
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    await mc.listen({ ignoreFirstResponse: true })
    await queue
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
}
