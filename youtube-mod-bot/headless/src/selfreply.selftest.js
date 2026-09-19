// The bot usually runs as a dedicated moderator account, not as the channel
// owner. That makes isOwner false, so an owner-only guard does not protect it,
// and the only thing standing between it and answering its own replies is
// recognising them. Text matching alone is not enough: the chat stream hands
// messages back with whitespace collapsed, so a display name containing a
// double space is all it takes to miss.

import assert from 'node:assert/strict'
import { runtime } from './hub.js'
import { say, isSelf, ourMessages } from './actions.js'

let failures = 0
const check = async (name, fn) => {
  try { await fn(); console.log(`  ok  ${name}`) }
  catch (err) { failures += 1; console.error(`FAIL  ${name}\n      ${err.message}`) }
}

const sent = []
runtime.mc = {
  sendMessage: async text => {
    sent.push(text)
    return { id: `m${sent.length}`, authorExternalChannelId: 'bot-channel-id' }
  },
}
runtime.config = { configPath: '/tmp/mod-bot-selfreply.json', moderation: {}, qa: {} }
runtime.selfChannelId = null
runtime.stats.answered = 0

const BOT = { authorChannelId: 'bot-channel-id', authorName: 'ModBot', isOwner: false, isModerator: true }
const VIEWER = { authorChannelId: 'viewer-id', authorName: 'Viewer', isOwner: false, isModerator: false }

console.log('learning our own identity')
await check('before sending anything, nothing is recognised as self', () => {
  assert.equal(runtime.selfChannelId, null)
  assert.equal(isSelf(BOT), false, 'must not guess before it knows')
})
await check('sending a message records our channel id', async () => {
  await say('hello chat')
  assert.equal(runtime.selfChannelId, 'bot-channel-id')
})
await check('our own messages are now recognised by identity', () => {
  assert.equal(isSelf(BOT), true)
})
await check('a viewer is not', () => {
  assert.equal(isSelf(VIEWER), false)
})

console.log('\nthe case text matching misses')
await check('a reply to a double-spaced name is still recognised', async () => {
  // "@John  Doe ..." goes out with the double space; the chat stream collapses
  // it. Identity catches what the text comparison would not.
  const outgoing = '@John  Doe the stream ends at nine?'
  await say(outgoing)
  const asChatReturnsIt = outgoing.replace(/\s+/g, ' ').trim()
  assert.equal(isSelf(BOT), true, 'identity check must hold regardless of text')
  assert.ok(
    ourMessages.has(asChatReturnsIt),
    'the stored form should match the collapsed text the stream returns'
  )
})

console.log('\ncounters')
await check('a manual message does not inflate the answered count', async () => {
  const before = runtime.stats.answered
  await say('just talking, not answering')
  assert.equal(runtime.stats.answered, before, 'only the Q&A path counts an answer')
})

console.log(failures ? `\n${failures} failing` : '\nall passing')
process.exit(failures ? 1 : 0)
