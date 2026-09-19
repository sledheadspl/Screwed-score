// Checks the bot against the Pokebank Moderation Guide, section by section.
// These are the assertions that say "the bot reads the guide the way a mod
// would" - if one fails, the bot and the humans are enforcing different rules.

import assert from 'node:assert/strict'
import { buildRules, evaluate } from './rules.js'

let failures = 0
function check (name, fn) {
  try { fn(); console.log(`  ok  ${name}`) }
  catch (err) { failures += 1; console.error(`FAIL  ${name}\n      ${err.message}`) }
}

const rules = buildRules({
  standing: {
    categories: {
      hate: { enabled: true, action: 'ban', words: ['slur1'], patterns: [] },
    },
  },
  judgment: { words: ['fuck', 'shit'], patterns: [], onMatch: 'act', lenientForMembers: true },
  allowList: ['scunthorpe'],
})

const viewer   = { id: 'm1', authorChannelId: 'c1', authorName: 'Viewer', isOwner: false, isModerator: false }
const member   = { ...viewer, id: 'm2', authorChannelId: 'c2', authorName: 'Regular', membership: { status: 'member' } }
const mod      = { ...viewer, id: 'm3', authorChannelId: 'c3', authorName: 'Mod', isModerator: true }
const owner    = { ...viewer, id: 'm4', authorChannelId: 'c4', authorName: 'Host', isOwner: true }

const v = (chat, text) => evaluate(rules, chat, text)

console.log('Section 2 - standing rules act immediately')
check('hate speech is a standing violation', () => {
  const out = v(viewer, 'you slur1')
  assert.equal(out.tier, 'standing')
  assert.equal(out.category, 'hate')
  assert.equal(out.action, 'ban')
  assert.equal(out.immediate, true)
})
check('doxxing a phone number is standing', () => {
  const out = v(viewer, 'his number is 555-123-4567')
  assert.equal(out.category, 'doxxing')
  assert.equal(out.immediate, true)
})
check('an email address counts as doxxing', () => {
  assert.equal(v(viewer, 'email him at bob@example.com').category, 'doxxing')
})
check('scam links are standing', () => {
  const out = v(viewer, 'free nitro giveaway click here')
  assert.equal(out.category, 'spamLinks')
})
check('an off-site link is standing', () => {
  assert.equal(v(viewer, 'check https://spam.example').category, 'spamLinks')
})
check('a youtube link is not', () => {
  assert.equal(v(viewer, 'watch https://www.youtube.com/watch?v=abc'), null)
})
check('creeping is harassment, and only times out', () => {
  const out = v(viewer, 'hey are you single')
  assert.equal(out.category, 'harassment')
  assert.equal(out.action, 'timeout')
})
check('standing rules beat the allow list', () => {
  assert.equal(v(viewer, 'scunthorpe slur1').tier, 'standing')
})
check('standing rules apply to members too', () => {
  const out = v(member, 'slur1')
  assert.equal(out.tier, 'standing')
  assert.equal(out.hold, undefined, 'a member should not get a hold on a standing rule')
})

console.log('\nSection 3 - judgment calls and member leniency')
check('a stranger swearing is acted on', () => {
  const out = v(viewer, 'oh shit')
  assert.equal(out.tier, 'judgment')
  assert.equal(out.hold, false)
  assert.equal(out.trust, 'unknown')
})
check('a known member swearing goes to a human', () => {
  const out = v(member, 'oh shit')
  assert.equal(out.tier, 'judgment')
  assert.equal(out.hold, true, 'members get a case-by-case call, not an auto-delete')
  assert.equal(out.trust, 'member')
})
check('leniency can be switched off', () => {
  const strict = buildRules({
    judgment: { words: ['shit'], onMatch: 'act', lenientForMembers: false },
  })
  assert.equal(evaluate(strict, member, 'oh shit').hold, false)
})
check("the guide's own hype-first ordering is available", () => {
  const hypeFirst = buildRules({ judgment: { words: ['shit'], onMatch: 'hold' } })
  assert.equal(evaluate(hypeFirst, viewer, 'oh shit').hold, true)
})
check('the allow list still covers judgment calls', () => {
  assert.equal(v(viewer, 'I live in Scunthorpe'), null)
})
check('clean chat passes', () => {
  assert.equal(v(viewer, 'lets go pokebank'), null)
})

console.log('\nSection 5 - staff are never auto-moderated')
check('a moderator is left alone', () => assert.equal(v(mod, 'oh shit'), null))
check('the owner is left alone', () => assert.equal(v(owner, 'oh shit'), null))
check('not even on a standing rule', () => assert.equal(v(mod, 'slur1'), null))

console.log('\nempty categories stay inert')
check('hate with no words configured never fires', () => {
  const bare = buildRules({ judgment: { words: [] } })
  assert.equal(bare.standing.find(r => r.category === 'hate'), undefined)
})
check('a bare config deletes nothing', () => {
  const bare = buildRules({})
  assert.equal(evaluate(bare, viewer, 'anything at all'), null)
})

console.log('\ninflected forms')
// A bare whole-word anchor matched only the infinitive, which is the one form
// nobody types. This was found by watching the bot leave "f@cking garbage"
// standing in a browser while it removed "$hit" from the same author.
const inflected = buildRules({
  judgment: { words: ['fuck', 'shit', 'bitch', 'dick', 'ass'], patterns: [] },
  allowList: ['dicker'],
})
const hits = t => evaluate(inflected, viewer, t)

for (const form of ['fucking', 'fucked', 'fucks', 'fucker', 'fuckers', 'shits', 'shitting', 'shitty', 'bitches', 'bitchy', 'asses']) {
  check(`"${form}" is caught`, () => assert.notEqual(hits(form), null))
}
check('obfuscation survives an ending', () => assert.notEqual(hits('this stream is f@cking garbage'), null))
check('doubled consonants need no special case', () => assert.notEqual(hits('quit shitting on it'), null))

// The endings are a closed set precisely so these stay safe.
for (const safe of ['shitake mushrooms', 'shiitake', 'assume', 'assassin', 'massive', 'bass guitar', 'passing', 'glass', 'classic', 'Scunthorpe', 'dickens']) {
  check(`"${safe}" is not a match`, () => assert.equal(hits(safe), null))
}
check('a compound is not an inflection and needs its own entry', () =>
  assert.equal(hits('dickhead'), null))
check('"dicker" is a real word, and the allow list is the escape hatch', () =>
  assert.equal(hits('lets dicker on the price'), null))
check('but the word it came from still fires', () =>
  assert.notEqual(hits('dont be a dick'), null))

console.log(failures ? `\n${failures} failing` : '\nall passing')
process.exit(failures ? 1 : 0)
