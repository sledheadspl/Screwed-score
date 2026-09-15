// Supervisor. Resolves the current broadcast, runs the bot for its lifetime,
// then goes back to waiting for the next one. Designed to be started once by
// systemd, Docker, or pm2 and left alone.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from './config.js'
import { buildMatcher } from './moderation.js'
import { findLiveVideoId } from './live.js'
import { runStream } from './bot.js'
import { log, info } from './log.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MAX_BACKOFF_MS = 5 * 60_000

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const stats = { deleted: 0, wouldDelete: 0, answered: 0, errors: 0 }

async function main () {
  const config = await loadConfig(ROOT)
  const matcher = buildMatcher(config.moderation, message => log('warn', message))

  const controller = new AbortController()
  let stopping = false
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      if (stopping) process.exit(1)
      stopping = true
      info(`${sig} received, finishing current work`)
      controller.abort()
    })
  }

  info(`moderation ${config.moderation.enabled ? 'on' : 'off'}, Q&A ${config.qa.enabled ? `on (${config.qa.trigger})` : 'off'}`)

  if (config.moderation.dryRun) {
    log('warn', 'DRY RUN - matches are logged, nothing is deleted and no replies are sent')
  }
  if (!config.credentials) {
    log('warn', `read-only: missing cookies ${config.missingCredentials.join(', ')} - it will log matches but cannot act`)
  }

  let backoff = 10_000

  while (!controller.signal.aborted) {
    let videoId = config.videoId

    if (!videoId) {
      try {
        videoId = await findLiveVideoId(config.channel)
      } catch (err) {
        log('error', `could not check ${config.channel}: ${err?.message ?? err}`)
      }
    }

    if (!videoId) {
      await sleep(config.pollSeconds * 1000)
      continue
    }

    try {
      await runStream({ videoId, config, matcher, stats, signal: controller.signal })
      backoff = 10_000
    } catch (err) {
      stats.errors += 1
      log('error', `${videoId}: ${err?.message ?? err}`)
      await sleep(backoff)
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
      continue
    }

    info(`session totals - deleted ${stats.deleted}, would-delete ${stats.wouldDelete}, answered ${stats.answered}, errors ${stats.errors}`)

    // A fixed videoId means one broadcast and then we are done.
    if (config.videoId) break
    await sleep(config.pollSeconds * 1000)
  }

  info('stopped')
}

main().catch(err => {
  log('error', err?.message ?? String(err))
  process.exit(1)
})
