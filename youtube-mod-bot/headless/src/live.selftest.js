// findLiveVideoId has one job that matters: never let a failed request look
// like "the channel is not live". That mistake is silent, and it costs a whole
// broadcast. fetch is stubbed here so the cases are reachable offline.

import assert from 'node:assert/strict'
import { findLiveVideoId, liveUrlFor } from './live.js'

let failures = 0
const check = async (name, fn) => {
  try { await fn(); console.log(`  ok  ${name}`) }
  catch (err) { failures += 1; console.error(`FAIL  ${name}\n      ${err.message}`) }
}

const realFetch = globalThis.fetch
const stub = (status, body = '') => {
  globalThis.fetch = async () => ({ ok: status >= 200 && status < 300, status, text: async () => body })
}
const LIVE_PAGE = '<link rel="canonical" href="https://www.youtube.com/watch?v=abcdefghijk">{"isLiveNow":true}'
const OFFLINE_PAGE = '<link rel="canonical" href="https://www.youtube.com/channel/UC123">'

console.log('url shapes')
check('handle', () => assert.equal(liveUrlFor('@someone'), 'https://www.youtube.com/@someone/live'))
check('bare name becomes a handle', () => assert.equal(liveUrlFor('someone'), 'https://www.youtube.com/@someone/live'))
check('channel id', () => assert.equal(liveUrlFor('UCabcdefghijklmnopqrstuv'), 'https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv/live'))
check('full url', () => assert.equal(liveUrlFor('https://www.youtube.com/@x/'), 'https://www.youtube.com/@x/live'))

console.log('\nresolution')
await check('a live page yields the video id', async () => {
  stub(200, LIVE_PAGE)
  assert.equal(await findLiveVideoId('@x'), 'abcdefghijk')
})
await check('an offline page yields null', async () => {
  stub(200, OFFLINE_PAGE)
  assert.equal(await findLiveVideoId('@x'), null)
})
await check('a canonical watch url without isLive yields null', async () => {
  stub(200, '<link rel="canonical" href="https://www.youtube.com/watch?v=abcdefghijk">')
  assert.equal(await findLiveVideoId('@x'), null)
})

console.log('\nfailures must not read as offline')
await check('403 throws rather than returning null', async () => {
  stub(403, 'denied')
  await assert.rejects(findLiveVideoId('@x'), /returned 403/)
})
await check('500 throws', async () => {
  stub(500, '')
  await assert.rejects(findLiveVideoId('@x'), /returned 500/)
})
await check('404 names the misconfiguration', async () => {
  stub(404, '')
  await assert.rejects(findLiveVideoId('@nope'), /channel not found/)
})

globalThis.fetch = realFetch
console.log(failures ? `\n${failures} failing` : '\nall passing')
process.exit(failures ? 1 : 0)
