// Shared runtime state and event bus. The bot writes here, the dashboard reads
// and issues commands back — this is the only thing the two halves share.

import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { stream, packBreakdown } from './stream.js'

const FEED_LIMIT = 200

export const hub = new EventEmitter()
// Many SSE clients can attach; the default cap of 10 is meant for leaks.
hub.setMaxListeners(50)

export const runtime = {
  mc: null,            // live Masterchat for the current broadcast, or null
  videoId: null,
  title: null,
  config: null,
  matcher: null,
  paused: false,
  startedAt: Date.now(),
  stats: { deleted: 0, timeouts: 0, bans: 0, held: 0, wouldDelete: 0, answered: 0, passed: 0, errors: 0 },
  strikes: new Map(),      // channelId -> standing-rule hits this session
  humanHandled: new Set(), // message and author ids a human mod already acted on
  selfChannelId: null,     // learned from our first sent message; see actions.say
  feed: [],            // newest first, capped
  pending: new Map(),  // id -> { chat, text, hit, timer }
}

export function emit (event) {
  const entry = { id: randomUUID(), at: Date.now(), ...event }
  runtime.feed.unshift(entry)
  if (runtime.feed.length > FEED_LIMIT) runtime.feed.length = FEED_LIMIT
  hub.emit('feed', entry)
  return entry
}

export function patch (fields) {
  hub.emit('state', fields)
}

export function snapshot () {
  return {
    videoId: runtime.videoId,
    title: runtime.title,
    attached: Boolean(runtime.mc),
    paused: runtime.paused,
    mode: runtime.config?.moderation?.mode ?? 'dry',
    qaEnabled: runtime.config?.qa?.enabled ?? false,
    bannedWords: runtime.config?.moderation?.bannedWords ?? [],
    allowList: runtime.config?.moderation?.allowList ?? [],
    stats: runtime.stats,
    packs: { total: stream.total, byName: packBreakdown(), context: stream.context },
    strikes: [...runtime.strikes.entries()].map(([id, s]) => ({ id, ...s })),
    pending: [...runtime.pending.entries()].map(([id, p]) => ({
      id, author: p.chat.authorName ?? 'someone', text: p.text, term: p.hit.term, expiresAt: p.expiresAt,
    })),
    feed: runtime.feed,
  }
}
