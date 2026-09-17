// Per-stream wiring. One instance runs for the life of one broadcast;
// index.js supervises and re-attaches for the next one. Every message that
// passes through here produces a feed entry, so the dashboard shows what the
// bot saw, not just what it acted on.

import { Masterchat, stringify } from '@stu43005/masterchat'
import { evaluate } from './rules.js'
import { askClaude } from './claude.js'
import { runtime, emit, patch } from './hub.js'
import { ourMessages, holdViolation, enforce, alreadyHandled, markHumanHandled, say, isSelf } from './actions.js'
import { streamFacts } from './stream.js'
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
      facts: streamFacts(),
    })

    const mention = config.qa.mentionAsker ? `@${author} ` : ''
    const body = answer.slice(0, Math.max(20, config.qa.maxReplyChars - mention.length))
    const outgoing = `${mention}${body}`

    if (config.moderation.mode === 'dry') {
      emit({ kind: 'answered', author, text, detail: `[dry run, not sent] ${outgoing}` })
      return
    }

    await say(outgoing, { detail: `answering ${author}` })
    lastReplyAt = Date.now()
    replyTimes.push(lastReplyAt)
    runtime.stats.answered += 1
    emit({ kind: 'answered', author, text, detail: outgoing })
  }

  mc.on('chat', chat => {
    const text = (stringify(chat.message) ?? '').replace(/\s+/g, ' ').trim()
    if (!text || seen.has(chat.id)) return
    seen.add(chat.id)
    if (seen.size > 5000) seen.clear()

    // Never act on our own messages. The channel-id check is the reliable one;
    // the text match covers the first reply, before we have learned our id.
    if (isSelf(chat)) return
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

    // Section 5: if a human mod already acted on this message or this author,
    // the bot stays out of it.
    if (config.moderation.respectHumanMods && alreadyHandled(chat)) {
      runtime.stats.passed += 1
      emit({ ...base, kind: 'pass', detail: 'a human mod already handled this author' })
      return
    }

    if (config.moderation.enabled && runtime.rules) {
      const verdict = evaluate(runtime.rules, chat, text)
      if (verdict) {
        const why = `${verdict.tier}/${verdict.category} "${verdict.term}"`
        const mode = config.moderation.mode
        const detail = verdict.reason ? `${why} - ${verdict.reason}` : why

        if (mode === 'dry') {
          runtime.stats.wouldDelete += 1
          emit({ ...base, kind: 'wouldDelete', detail, term: verdict.term, tier: verdict.tier, category: verdict.category })
        } else if (verdict.immediate) {
          // Section 2/4: standing rules act first and explain after, in every
          // mode but dry. No approval, no waiting.
          enqueue(() => enforce(chat, text, verdict))
        } else if (mode === 'hold' || verdict.hold) {
          holdViolation(chat, text, { term: verdict.term, source: verdict.source }, verdict)
        } else {
          enqueue(() => enforce(chat, text, verdict))
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

  // Human mod activity arrives as deletion actions; record it so the bot can
  // defer to calls that have already been made.
  mc.on('actions', list => {
    if (!config.moderation.respectHumanMods) return
    for (const action of list) {
      if (action.type === 'markChatItemAsDeletedAction' && action.targetId) {
        markHumanHandled(action.targetId)
      } else if (action.type === 'markChatItemsByAuthorAsDeletedAction' && action.channelId) {
        markHumanHandled(action.channelId)
      }
    }
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
