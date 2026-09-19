// The dashboard can delete messages and post as you, so the rule that it never
// listens beyond this machine without a token is worth pinning down. This is
// the case that used to slip past: DASHBOARD_HOST set by hand, no token.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadConfig } from './config.js'

const root = mkdtempSync(path.join(tmpdir(), 'modbot-'))
writeFileSync(path.join(root, 'config.json'), JSON.stringify({ channel: '@test' }))

let failures = 0
const check = async (name, fn) => {
  try { await fn(); console.log(`  ok  ${name}`) }
  catch (err) { failures += 1; console.error(`FAIL  ${name}\n      ${err.message}`) }
}

const CLEARED = ['DASHBOARD_TOKEN', 'DASHBOARD_HOST', 'MOD_BOT_CONFIG', 'MOD_BOT_CHANNEL']
// Must await before restoring: returning the promise and restoring in finally
// puts the env back before loadConfig ever reads it.
async function withEnv (vars, fn) {
  const saved = {}
  for (const key of CLEARED) { saved[key] = process.env[key]; delete process.env[key] }
  Object.assign(process.env, vars)
  try { return await fn() } finally {
    for (const key of CLEARED) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  }
}

// qa needs a key or loadConfig rejects for an unrelated reason.
const base = { ANTHROPIC_API_KEY: 'test' }

await check('no token stays on loopback', async () => {
  const config = await withEnv(base, () => loadConfig(root))
  assert.equal(config.dashboardHost, '127.0.0.1')
})

await check('a token opens it to the network', async () => {
  const config = await withEnv({ ...base, DASHBOARD_TOKEN: 'secret-token-value' }, () => loadConfig(root))
  assert.equal(config.dashboardHost, '0.0.0.0')
})

await check('explicit 0.0.0.0 without a token is refused', async () => {
  await assert.rejects(
    withEnv({ ...base, DASHBOARD_HOST: '0.0.0.0' }, () => loadConfig(root)),
    /Refusing to serve the dashboard/
  )
})

await check('a LAN address without a token is refused', async () => {
  await assert.rejects(
    withEnv({ ...base, DASHBOARD_HOST: '192.168.1.50' }, () => loadConfig(root)),
    /Refusing to serve the dashboard/
  )
})

await check('a tailnet address without a token is refused', async () => {
  await assert.rejects(
    withEnv({ ...base, DASHBOARD_HOST: '100.101.102.103' }, () => loadConfig(root)),
    /Refusing to serve the dashboard/
  )
})

await check('a tailnet address WITH a token is allowed', async () => {
  const config = await withEnv(
    { ...base, DASHBOARD_HOST: '100.101.102.103', DASHBOARD_TOKEN: 'secret-token-value' },
    () => loadConfig(root)
  )
  assert.equal(config.dashboardHost, '100.101.102.103')
})

await check('explicit loopback without a token is fine', async () => {
  const config = await withEnv({ ...base, DASHBOARD_HOST: '127.0.0.1' }, () => loadConfig(root))
  assert.equal(config.dashboardHost, '127.0.0.1')
})

await check('localhost and ::1 count as loopback', async () => {
  for (const host of ['localhost', '::1', 'LOCALHOST']) {
    const config = await withEnv({ ...base, DASHBOARD_HOST: host }, () => loadConfig(root))
    assert.equal(config.dashboardHost, host)
  }
})

await check('a disabled dashboard is not policed', async () => {
  writeFileSync(path.join(root, 'off.json'), JSON.stringify({ channel: '@test', dashboard: { enabled: false } }))
  const config = await withEnv(
    { ...base, DASHBOARD_HOST: '0.0.0.0', MOD_BOT_CONFIG: path.join(root, 'off.json') },
    () => loadConfig(root)
  )
  assert.equal(config.dashboard.enabled, false)
})

// The shipped defaults are the whole product for anyone who never opens the
// config. Nothing asserted them, so flipping maxAction to 'ban' in config.js
// passed every test - the one value the ceiling exists to protect.
console.log('\nshipped defaults')

await check('never bans unless asked', async () => {
  const config = await withEnv(base, () => loadConfig(root))
  assert.equal(config.moderation.maxAction, 'timeout')
})

await check('starts in dry run', async () => {
  const config = await withEnv(base, () => loadConfig(root))
  assert.equal(config.moderation.mode, 'dry')
})

await check('does not post in chat', async () => {
  const config = await withEnv(base, () => loadConfig(root))
  assert.equal(config.qa.enabled, false)
})

await check('does not silently pass members', async () => {
  const config = await withEnv(base, () => loadConfig(root))
  assert.equal(config.moderation.judgment.lenientForMembers, false)
})

await check('both halves ship the same word list', async () => {
  // The engines are compared by the parity suite; their default lists are not,
  // and they had drifted to four words here against fourteen in the extension.
  const config = await withEnv(base, () => loadConfig(root))
  const source = readFileSync(new URL('../../src/defaults.js', import.meta.url), 'utf8')
  const block = source.match(/DEFAULT_BANNED_WORDS = \[([\s\S]*?)\]/)[1]
  const extension = [...block.matchAll(/'([^']+)'/g)].map(m => m[1])
  assert.deepEqual([...config.moderation.judgment.words].sort(), [...extension].sort())
})

await check('an unrecognised ceiling falls back rather than opening up', async () => {
  writeFileSync(path.join(root, 'bogus.json'), JSON.stringify({ channel: '@test', moderation: { maxAction: 'obliterate' } }))
  const config = await withEnv(
    { ...base, MOD_BOT_CONFIG: path.join(root, 'bogus.json') },
    () => loadConfig(root)
  )
  assert.equal(config.moderation.maxAction, 'timeout')
})

console.log(failures ? `\n${failures} failing` : '\nall passing')
process.exit(failures ? 1 : 0)
