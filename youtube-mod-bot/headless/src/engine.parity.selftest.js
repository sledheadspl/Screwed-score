// The extension and the headless bot each carry a copy of the moderation
// engine, because an MV3 content script cannot import ES modules and this
// project has no bundler. Two copies drift. This runs one corpus of cases
// through both and fails if they ever disagree, so a change to one that is not
// mirrored in the other is caught here rather than on someone's stream.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRules as headlessBuild, evaluate as headlessEval } from './rules.js'
import { normalize as headlessNormalize } from './moderation.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ENGINE = path.resolve(HERE, '..', '..', 'src', 'engine', 'engine.js')

// Load the extension's classic script the way a content script would.
const sandbox = {}
new Function('self', readFileSync(ENGINE, 'utf8'))(sandbox)
const ext = sandbox.ModBot
assert.ok(ext, 'extension engine did not attach to self.ModBot')

const MODERATION = {
  standing: { categories: { hate: { enabled: true, action: 'ban', words: ['slur1'] } } },
  judgment: { words: ['fuck', 'shit'], patterns: [], onMatch: 'act', lenientForMembers: true },
  allowList: ['scunthorpe'],
}

const headlessRules = headlessBuild(MODERATION)
const extRules = ext.buildRules(MODERATION)

// Each actor is expressed both ways: headless reads chat.membership, the
// extension reads a flag off the DOM's author-type.
const ACTORS = [
  ['viewer', {}, { isOwner: false, isModerator: false, isMember: false }],
  ['member', { membership: { status: 'member' } }, { isOwner: false, isModerator: false, isMember: true }],
  ['moderator', { isModerator: true }, { isOwner: false, isModerator: true, isMember: false }],
  ['owner', { isOwner: true }, { isOwner: true, isModerator: false, isMember: false }],
]

const MESSAGES = [
  'lets go pokebank',
  'oh shit',
  'sh1t',
  'what the f@ck',
  'f*ck this',
  '$hit',
  'shiiiiit',
  'fuuck',
  'BiTcH',
  'I live in Scunthorpe',
  'scunthorpe is shit',
  'shitake mushrooms',
  'a class act',
  '@ * $ 1 !',
  'you slur1',
  'scunthorpe slur1',
  'his number is 555-123-4567',
  'email him at bob@example.com',
  'free nitro giveaway click here',
  'check https://spam.example',
  'watch https://www.youtube.com/watch?v=abc',
  'hey are you single',
  'dm me your snap',
  '1600 Pennsylvania Avenue',
  '',
  '   ',
  'pack 3 of 36 opened!',
]

let failures = 0
const check = (name, fn) => {
  try { fn(); console.log(`  ok  ${name}`) }
  catch (err) { failures += 1; console.error(`FAIL  ${name}\n      ${err.message}`) }
}

// A verdict has a couple of fields that exist only for logging; compare the
// parts that decide what happens to a viewer's message.
const shape = v => v && {
  tier: v.tier, category: v.category, action: v.action,
  term: v.term, source: v.source, trust: v.trust,
  immediate: v.immediate, hold: v.hold ?? false,
}

console.log(`comparing ${MESSAGES.length} messages x ${ACTORS.length} actors`)
let compared = 0
for (const [label, chat, actor] of ACTORS) {
  check(`verdicts agree for a ${label}`, () => {
    for (const text of MESSAGES) {
      if (!text.trim()) continue
      const a = shape(headlessEval(headlessRules, chat, text))
      const b = shape(ext.evaluate(extRules, actor, text))
      assert.deepEqual(b, a, `disagreed on ${JSON.stringify(text)} as ${label}:\n        headless ${JSON.stringify(a)}\n        extension ${JSON.stringify(b)}`)
      compared += 1
    }
  })
}

console.log('\nprimitives agree')
check('normalize matches on every case', () => {
  for (const text of MESSAGES) {
    assert.equal(ext.normalize(text), headlessNormalize(text), `normalize differed on ${JSON.stringify(text)}`)
  }
})
check('normalize matches on obfuscation edge cases', () => {
  for (const text of ['shiiiit', 'sh\u200bit', 'shít', 'SHIT', 'cool', 'a  b', 'f@ck']) {
    assert.equal(ext.normalize(text), headlessNormalize(text), `normalize differed on ${JSON.stringify(text)}`)
  }
})

console.log(`\n${compared} verdict comparisons`)
console.log(failures ? `${failures} failing` : 'all passing')
process.exit(failures ? 1 : 0)
