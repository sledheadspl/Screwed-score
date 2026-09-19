// waitFor decides whether a moderation action happens or silently fails, and
// the case that breaks it is a hidden tab: Chrome clamps background timers to
// about a second and, after a few minutes, can stretch them to a minute. A
// wall-clock budget alone then expires after one or two polls.
//
// The clock and sleep are injected, so the throttled cases are reachable here
// instead of only on someone's stream.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const sandbox = {}
new Function('self', readFileSync(path.resolve(HERE, '..', '..', 'src', 'engine', 'engine.js'), 'utf8'))(sandbox)
const { waitFor } = sandbox.ModBot

let failures = 0
const check = async (name, fn) => {
  try { await fn(); console.log(`  ok  ${name}`) }
  catch (err) { failures += 1; console.error(`FAIL  ${name}\n      ${err.message}`) }
}

// A fake clock where sleep advances time by whatever the environment actually
// grants, not by what was asked for.
function clock (grantedPerSleep) {
  let t = 0
  return {
    now: () => t,
    sleep: async () => { t += grantedPerSleep },
    at: () => t,
  }
}

console.log('a visible tab')
await check('finds an item that is already there, with one look', async () => {
  const c = clock(50)
  let looks = 0
  const got = await waitFor(() => { looks += 1; return 'item' }, { now: c.now, sleep: c.sleep })
  assert.equal(got, 'item')
  assert.equal(looks, 1, 'should not sleep before the first look')
})
await check('finds an item that appears after a few polls', async () => {
  const c = clock(50)
  let looks = 0
  const got = await waitFor(() => (++looks >= 5 ? 'item' : null), { now: c.now, sleep: c.sleep })
  assert.equal(got, 'item')
  assert.equal(looks, 5)
})
await check('gives up when it is genuinely not there', async () => {
  const c = clock(50)
  const got = await waitFor(() => null, { timeout: 500, interval: 50, now: c.now, sleep: c.sleep })
  assert.equal(got, null)
})

console.log('\na throttled tab - timers clamped to ~1s')
await check('still looks several times, not once', async () => {
  const c = clock(1000)          // asked for 50ms, granted 1000ms
  let looks = 0
  await waitFor(() => { looks += 1; return null },
    { timeout: 2500, interval: 50, hidden: () => true, now: c.now, sleep: c.sleep })
  assert.ok(looks >= 4, `only looked ${looks} times; a clamped tab must still get several`)
})
await check('finds an item that renders slowly while hidden', async () => {
  const c = clock(1000)
  let looks = 0
  const got = await waitFor(() => (++looks >= 4 ? 'item' : null),
    { timeout: 2500, interval: 50, hidden: () => true, now: c.now, sleep: c.sleep })
  assert.equal(got, 'item', 'would have been a failed removal before')
})
await check('the same case fails without the hidden hint - the bug being fixed', async () => {
  const c = clock(1000)
  let looks = 0
  // hidden() false: budget stays 2500ms, so ~3 sleeps of 1000ms exhaust it.
  const got = await waitFor(() => (++looks >= 6 ? 'item' : null),
    { timeout: 2500, interval: 50, minAttempts: 1, hidden: () => false, now: c.now, sleep: c.sleep })
  assert.equal(got, null, 'this is what a throttled tab used to do')
})

console.log('\na frozen tab - timers stretched to a minute')
await check('gives up rather than hanging forever', async () => {
  const c = clock(60_000)
  const got = await waitFor(() => null,
    { timeout: 2500, interval: 50, hidden: () => true, now: c.now, sleep: c.sleep })
  assert.equal(got, null)
})
await check('a runaway is bounded by the attempt cap', async () => {
  // now() never advances, so only maxAttempts can stop it.
  let looks = 0
  const got = await waitFor(() => { looks += 1; return null },
    { timeout: 1000, interval: 1, maxAttempts: 25, now: () => 0, sleep: async () => {} })
  assert.equal(got, null)
  assert.equal(looks, 25, 'must not spin without bound when the clock is stuck')
})

console.log(failures ? `\n${failures} failing` : '\nall passing')
process.exit(failures ? 1 : 0)
