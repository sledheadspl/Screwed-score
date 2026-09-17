// Pre-flight check. Run this before a stream so setup problems surface here
// rather than while chat is scrolling past.
//
// It verifies what can be verified without side effects. What it cannot verify
// is called out at the end rather than glossed over - notably whether the
// account actually holds moderator powers, which only an real removal proves.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from './config.js'
import { buildRules } from './rules.js'
import { findLiveVideoId, liveUrlFor } from './live.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const COOKIE_KEYS = ['SAPISID', 'APISID', 'HSID', 'SID', 'SSID']

let failed = 0
let warned = 0

const ok = (label, detail = '') => console.log(`  ok    ${label}${detail ? ` - ${detail}` : ''}`)
const warn = (label, detail = '') => { warned += 1; console.log(`  warn  ${label}${detail ? ` - ${detail}` : ''}`) }
const bad = (label, detail = '') => { failed += 1; console.log(`  FAIL  ${label}${detail ? ` - ${detail}` : ''}`) }

async function checkAnthropic (config) {
  if (!config.qa.enabled) return warn('Claude', 'Q&A is disabled, key not checked')
  if (!config.anthropicApiKey) return bad('Claude', 'ANTHROPIC_API_KEY is not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    // One token is enough to prove the key and the model id are both good.
    body: JSON.stringify({ model: config.model, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
  })

  if (res.ok) return ok('Claude', `key works, model ${config.model} accepted`)

  const detail = await res.text().catch(() => '')
  if (res.status === 401) return bad('Claude', 'key rejected (401) - check ANTHROPIC_API_KEY')
  if (res.status === 404) return bad('Claude', `model "${config.model}" not found for this key`)
  bad('Claude', `API returned ${res.status}: ${detail.slice(0, 120)}`)
}

// Side-effect-free auth probe: YouTube's own page config reports whether the
// request arrived signed in. Beats guessing from cookie shape.
async function checkYouTubeSession (config) {
  const missing = COOKIE_KEYS.filter(key => !process.env[key])
  if (missing.length === COOKIE_KEYS.length) {
    return bad('YouTube session', 'no cookies set - the bot can watch chat but not act')
  }
  if (missing.length) {
    return bad('YouTube session', `missing ${missing.join(', ')}`)
  }

  const cookie = COOKIE_KEYS.map(key => `${key}=${process.env[key]}`).join('; ')
  const res = await fetch('https://www.youtube.com/', {
    headers: {
      cookie,
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
    },
  })

  if (!res.ok) return warn('YouTube session', `could not reach youtube.com (${res.status})`)

  const html = await res.text()
  if (/"LOGGED_IN":\s*true/.test(html)) {
    const name = /"text":"([^"]{1,40})","accessibility":\{"accessibilityData":\{"label":"Account menu/.exec(html)
    return ok('YouTube session', name ? `signed in as ${name[1]}` : 'cookies authenticate')
  }
  bad('YouTube session', 'cookies did not authenticate - re-copy them from a signed-in tab')
}

async function checkStream (config) {
  if (config.videoId) return ok('Target', `fixed video ${config.videoId}`)

  let videoId
  try {
    videoId = await findLiveVideoId(config.channel)
  } catch (err) {
    // A lookup that failed is not the same as a channel that is offline, and
    // reporting both would bury the one that needs fixing.
    return bad('Target', `could not check ${config.channel}: ${err?.message ?? err}`)
  }

  if (videoId) return ok('Target', `${config.channel} is live now (${videoId})`)
  warn('Target', `${config.channel} is not live right now - resolved ${liveUrlFor(config.channel)}`)
}

function checkRules (config) {
  const rules = buildRules(config.moderation, message => warn('Rules', message))

  const armed = rules.standing.map(r => r.category)
  const inert = ['hate', 'harassment', 'doxxing', 'spamLinks'].filter(c => !armed.includes(c))

  if (armed.length) ok('Standing rules', `${armed.join(', ')} armed`)
  else bad('Standing rules', 'none armed - every category is empty or disabled')

  if (inert.includes('hate')) {
    warn('Standing rules', 'hate has no words configured; add them or rely on YouTube’s blocked-words list')
  }

  const words = config.moderation.judgment.words?.length ?? 0
  if (words) ok('Judgment rules', `${words} word(s), onMatch=${config.moderation.judgment.onMatch}`)
  else warn('Judgment rules', 'no words configured')

  const strikes = config.moderation.strikes
  ok('Escalation', strikes.enabled ? `timeout at ${strikes.timeoutAt}, ban at ${strikes.banAt}` : 'disabled')
}

function checkMode (config) {
  const mode = config.moderation.mode
  if (mode === 'dry') ok('Mode', 'dry - nothing will be deleted or sent')
  else if (mode === 'hold') ok('Mode', `hold - matches wait ${config.moderation.holdSeconds}s for you, then ${config.moderation.holdDefault}`)
  else warn('Mode', 'auto - matches are deleted immediately, with no chance to veto')
}

function checkDashboard (config) {
  if (!config.dashboard.enabled) return warn('Dashboard', 'disabled')
  const host = config.dashboardHost
  if (host === '127.0.0.1' || host === '::1' || host === 'localhost') {
    ok('Dashboard', `http://${host}:${config.dashboard.port} (this machine only)`)
  } else {
    ok('Dashboard', `http://${host}:${config.dashboard.port} with token - keep it behind a VPN or TLS proxy`)
  }
}

async function main () {
  console.log('youtube-mod-bot doctor\n')

  let config
  try {
    config = await loadConfig(ROOT)
    ok('Config', config.configPath)
  } catch (err) {
    bad('Config', String(err?.message ?? err))
    console.log('\nCannot continue without a loadable config.')
    process.exit(1)
  }

  checkMode(config)
  checkRules(config)
  checkDashboard(config)
  await checkYouTubeSession(config)
  await checkAnthropic(config)
  await checkStream(config)

  console.log('\nNot checked here, because nothing can check it without acting:')
  console.log('  - whether this account actually holds moderator powers on the chat.')
  console.log('    YouTube exposes no read-only probe for that; the first real removal')
  console.log('    is the test. Run a stream in dry or hold mode and watch the log.')

  const verdict = failed ? `${failed} failing` : warned ? `ready, ${warned} warning(s)` : 'ready'
  console.log(`\n${verdict}`)
  process.exit(failed ? 1 : 0)
}

main().catch(err => {
  console.error(`doctor crashed: ${err?.message ?? err}`)
  process.exit(1)
})
