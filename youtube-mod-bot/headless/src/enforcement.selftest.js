// Exercises the acting half - escalation on repeat offenders (Section 6) and
// deference to calls a human mod already made (Section 5) - against a stub
// Masterchat, so no live stream or credentials are involved.

import assert from 'node:assert/strict'
import { runtime } from './hub.js'
import { buildRules } from './rules.js'
import { enforce, alreadyHandled, markHumanHandled, holdViolation, resolvePending } from './actions.js'

let failures = 0
const check = async (name, fn) => {
  try { await fn(); console.log(`  ok  ${name}`) }
  catch (err) { failures += 1; console.error(`FAIL  ${name}\n      ${err.message}`) }
}

const calls = []
runtime.mc = {
  remove: id => { calls.push(['remove', id]); return Promise.resolve() },
  timeout: id => { calls.push(['timeout', id]); return Promise.resolve() },
  hide: id => { calls.push(['hide', id]); return Promise.resolve() },
  sendMessage: t => { calls.push(['say', t]); return Promise.resolve() },
}
runtime.config = {
  configPath: '/tmp/mod-bot-enforcement-selftest.json',
  moderation: {
    enabled: true, mode: 'auto', holdSeconds: 25, holdDefault: 'skip',
    standing: { categories: { hate: { enabled: true, action: 'ban', words: ['slur1'] } } },
    judgment: { words: ['shit'], onMatch: 'act', lenientForMembers: true },
    allowList: [],
    strikes: { enabled: true, timeoutAt: 2, banAt: 3 },
    respectHumanMods: true,
  },
}
runtime.rules = buildRules(runtime.config.moderation)

const chatFor = (n, channel = 'cX') => ({ id: `msg-${n}`, authorChannelId: channel, authorName: 'Repeat' })
const standing = { tier: 'standing', category: 'hate', action: 'delete', term: 'slur1', source: 'word' }

console.log('Section 6 - escalation on repeat offenders')
await check('first standing hit only deletes', async () => {
  calls.length = 0
  await enforce(chatFor(1), 'slur1', standing)
  assert.deepEqual(calls.map(c => c[0]), ['remove'])
})
await check('second hit from the same person times them out', async () => {
  calls.length = 0
  await enforce(chatFor(2), 'slur1', standing)
  assert.deepEqual(calls.map(c => c[0]), ['remove', 'timeout'])
})
await check('third hit bans them', async () => {
  calls.length = 0
  await enforce(chatFor(3), 'slur1', standing)
  assert.deepEqual(calls.map(c => c[0]), ['remove', 'hide'])
})
await check('a different person starts clean', async () => {
  calls.length = 0
  await enforce(chatFor(4, 'other-channel'), 'slur1', standing)
  assert.deepEqual(calls.map(c => c[0]), ['remove'])
})
await check('a judgment call never escalates', async () => {
  calls.length = 0
  const judgment = { tier: 'judgment', category: 'judgment', action: 'delete', term: 'shit', source: 'word' }
  for (let i = 0; i < 4; i++) await enforce(chatFor(10 + i, 'chatty'), 'oh shit', judgment)
  assert.deepEqual([...new Set(calls.map(c => c[0]))], ['remove'], 'judgment calls should only ever delete')
})
await check('escalation can be switched off', async () => {
  runtime.config.moderation.strikes.enabled = false
  calls.length = 0
  for (let i = 0; i < 3; i++) await enforce(chatFor(20 + i, 'nostrikes'), 'slur1', standing)
  assert.deepEqual([...new Set(calls.map(c => c[0]))], ['remove'])
  runtime.config.moderation.strikes.enabled = true
})

console.log('\nSection 5 - deferring to a human mod')
await check('a message a human deleted is marked handled', () => {
  markHumanHandled('msg-99')
  assert.equal(alreadyHandled({ id: 'msg-99', authorChannelId: 'someone' }), true)
})
await check('an author a human swept is marked handled', () => {
  markHumanHandled('channel-99')
  assert.equal(alreadyHandled({ id: 'other', authorChannelId: 'channel-99' }), true)
})
await check('an untouched message is not', () => {
  assert.equal(alreadyHandled({ id: 'fresh', authorChannelId: 'fresh-c' }), false)
})
await check('a human call cancels the bot’s pending hold on it', async () => {
  const chat = { id: 'held-1', authorChannelId: 'held-c', authorName: 'Someone' }
  holdViolation(chat, 'oh shit', { term: 'shit', source: 'word' })
  assert.equal(runtime.pending.size, 1)
  markHumanHandled('held-1')
  assert.equal(runtime.pending.size, 0, 'the bot should drop a hold a human already resolved')
})

console.log('\nheld verdicts carry their escalation')
await check('approving a held standing match still escalates', async () => {
  calls.length = 0
  const chat = chatFor(30, 'held-escalate')
  const id = holdViolation(chat, 'slur1', { term: 'slur1', source: 'word' }, standing)
  await resolvePending(id, 'delete')
  assert.deepEqual(calls.map(c => c[0]), ['remove'])
  const chat2 = chatFor(31, 'held-escalate')
  calls.length = 0
  const id2 = holdViolation(chat2, 'slur1', { term: 'slur1', source: 'word' }, standing)
  await resolvePending(id2, 'delete')
  assert.deepEqual(calls.map(c => c[0]), ['remove', 'timeout'])
})

console.log(failures ? `\n${failures} failing` : '\nall passing')
process.exit(failures ? 1 : 0)
