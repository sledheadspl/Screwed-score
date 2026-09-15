// Live dashboard: a feed of every message and what the bot did with it, plus
// an input bar to correct it. No dependencies — plain http and Server-Sent
// Events, which reconnect on their own when a phone drops off wifi.

import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { timingSafeEqual } from 'node:crypto'
import { runtime, hub, snapshot } from './hub.js'
import * as actions from './actions.js'
import { askClaude } from './claude.js'
import { log, info } from './log.js'

const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
const HEARTBEAT_MS = 25_000

function safeEqual (a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function authorized (req, url, token) {
  // With no token the server is bound to loopback only, so there is nothing
  // to authorize against; any other binding requires one.
  if (!token) return true
  const given = req.headers['x-mod-token'] ?? url.searchParams.get('token') ?? ''
  return given.length > 0 && safeEqual(given, token)
}

function json (res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(payload)
}

async function readBody (req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 64_000) throw new Error('request too large')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function runCommand (body) {
  switch (body.type) {
    case 'say':
      return { said: await actions.say(body.text) }

    case 'delete':
      await actions.removeMessage(body.chatId, { author: body.author, text: body.text })
      return { deleted: body.chatId }

    case 'approve':
      return { resolved: await actions.resolvePending(body.pendingId, 'delete') }

    case 'keep':
      return { resolved: await actions.resolvePending(body.pendingId, 'keep') }

    case 'allow':
      return { term: await actions.addTerm('allowList', body.term) }

    case 'unallow':
      return { term: await actions.removeTerm('allowList', body.term) }

    case 'ban':
      return { term: await actions.addTerm('bannedWords', body.term) }

    case 'unban':
      return { term: await actions.removeTerm('bannedWords', body.term) }

    case 'mode':
      return { mode: await actions.setMode(body.mode) }

    case 'pause':
      return { paused: actions.setPaused(body.paused) }

    case 'ask': {
      const answer = await askClaude({
        apiKey: runtime.config.anthropicApiKey,
        model: runtime.config.model,
        systemPrompt: runtime.config.qa.systemPrompt,
        question: body.question,
        author: 'the host',
        maxReplyChars: runtime.config.qa.maxReplyChars,
      })
      return { said: await actions.say(answer) }
    }

    default:
      throw new Error(`unknown command: ${body.type}`)
  }
}

function streamEvents (res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  send('snapshot', snapshot())

  const onFeed = entry => send('feed', entry)
  const onState = fields => send('state', { ...fields, stats: runtime.stats, pending: snapshot().pending })
  hub.on('feed', onFeed)
  hub.on('state', onState)

  const beat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS)
  beat.unref?.()

  const cleanup = () => {
    clearInterval(beat)
    hub.off('feed', onFeed)
    hub.off('state', onState)
  }
  res.on('close', cleanup)
  res.on('error', cleanup)
}

export function startDashboard (config) {
  const token = config.dashboardToken
  const host = config.dashboardHost
  const port = config.dashboard.port

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)

    try {
      if (!authorized(req, url, token)) return json(res, 401, { error: 'bad or missing token' })

      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        const html = await readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8')
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
        return res.end(html)
      }

      if (req.method === 'GET' && url.pathname === '/events') return streamEvents(res)
      if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, snapshot())

      if (req.method === 'POST' && url.pathname === '/api/command') {
        const body = await readBody(req)
        const result = await runCommand(body)
        return json(res, 200, { ok: true, ...result })
      }

      return json(res, 404, { error: 'not found' })
    } catch (err) {
      const message = String(err?.message ?? err)
      log('error', `dashboard: ${message}`)
      return json(res, 400, { ok: false, error: message })
    }
  })

  server.listen(port, host, () => {
    if (token) {
      info(`dashboard on http://${host}:${port}/?token=${token}`)
      log('warn', 'that link grants full control - it is plain HTTP, so use it over a VPN, a tunnel, or behind an HTTPS proxy')
    } else {
      info(`dashboard on http://127.0.0.1:${port} (loopback only)`)
      log('warn', 'set DASHBOARD_TOKEN to reach it from your phone; without one it refuses to bind publicly')
    }
  })

  return server
}
