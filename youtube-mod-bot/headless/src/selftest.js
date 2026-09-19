// Offline checks for the matching engine. The YouTube half needs a live
// broadcast to exercise, but the part that decides whether a real viewer's
// message gets deleted can and should be proven here.

import assert from 'node:assert/strict'
import { buildMatcher, findViolation, normalize, isExempt } from './moderation.js'

let failures = 0
function check (name, fn) {
  try {
    fn()
    console.log(`  ok  ${name}`)
  } catch (err) {
    failures += 1
    console.error(`FAIL  ${name}\n      ${err.message}`)
  }
}

const matcher = buildMatcher({
  bannedWords: ['fuck', 'shit', 'bitch'],
  bannedPatterns: ['https?://(?!(www\\.)?youtube\\.com)'],
  allowList: ['scunthorpe'],
})

const hits = text => findViolation(matcher, text)

console.log('normalization')
check('leaves symbols for the pattern', () => assert.equal(normalize('sh1t'), 'sh1t'))
check('folds stretched letters', () => assert.equal(normalize('shiiiit'), 'shit'))
check('folds accents', () => assert.equal(normalize('shít'), 'shit'))
check('strips zero-width padding', () => assert.equal(normalize('sh​it'), 'shit'))
check('lowercases', () => assert.equal(normalize('SHIT'), 'shit'))

console.log('\nbanned words')
check('catches a plain hit', () => assert.equal(hits('oh shit')?.term, 'shit'))
check('catches digit leetspeak', () => assert.ok(hits('sh1t')))
check('catches symbol-for-vowel', () => assert.ok(hits('what the f@ck')))
check('catches asterisk censor', () => assert.ok(hits('f*ck this')))
check('catches dollar-sign s', () => assert.ok(hits('$hit')))
check('catches leading-symbol word', () => assert.ok(hits('sh1t and $h1t')))
check('catches stretched', () => assert.ok(hits('shiiiiit')))
check('catches doubled letters', () => assert.ok(hits('fuuck')))
check('catches mixed case', () => assert.ok(hits('BiTcH')))

console.log('\nfalse positives (the ones that matter)')
check('substring is not a hit', () => assert.equal(hits('I live in Scunthorpe'), null))
check('allow list wins', () => assert.equal(hits('scunthorpe is shit'), null))
check('clean message passes', () => assert.equal(hits('great stream today'), null))
check('word boundary holds', () => assert.equal(hits('shitake mushrooms'), null))
check('leet class does not leak across words', () => assert.equal(hits('a class act'), null))
check('bare punctuation is not a hit', () => assert.equal(hits('@ * $ 1 !'), null))
check('two repeats are left alone', () => assert.equal(normalize('cool'), 'cool'))

console.log('\npatterns')
check('flags an outside link', () => assert.ok(hits('check out https://spam.example')))
check('allows a youtube link', () => assert.equal(hits('see https://www.youtube.com/watch?v=x'), null))
check('invalid pattern is skipped, not fatal', () => {
  const warnings = []
  const m = buildMatcher({ bannedWords: ['bad'], bannedPatterns: ['('] }, w => warnings.push(w))
  assert.equal(warnings.length, 1)
  assert.ok(findViolation(m, 'bad'))
})

console.log('\nexemptions')
const mod = { exemptOwner: true, exemptModerators: true, exemptMembers: false }
check('owner exempt', () => assert.equal(isExempt({ isOwner: true }, mod), true))
check('moderator exempt', () => assert.equal(isExempt({ isModerator: true }, mod), true))
check('member not exempt by default', () => assert.equal(isExempt({ membership: {} }, mod), false))
check('plain viewer not exempt', () => assert.equal(isExempt({}, mod), false))

console.log('\nempty config deletes nothing')
check('no words means no hits', () => {
  const m = buildMatcher({})
  assert.equal(findViolation(m, 'anything at all'), null)
})

console.log(failures ? `\n${failures} failing` : '\nall passing')
process.exit(failures ? 1 : 0)
