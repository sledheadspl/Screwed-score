// Matching engine. Deliberately kept identical to the extension's content.js so
// both halves of this project agree on what counts as a hit — if you change a
// rule here, change it there too, and run `npm run selftest`.

// Obfuscation is handled in the pattern, not by rewriting the message. Folding
// symbols to letters up front cannot work: "@" usually stands for "a", but in
// "f@ck" it stands for "u". Expanding each letter into the set of characters
// that can spell it catches both without guessing.
const LEET_CLASS = {
  a: 'a@4*', b: 'b8', c: 'c(', e: 'e3@*', g: 'g9', i: 'i1!|@*',
  l: 'l1|', o: 'o0@*', s: 's5$', t: 't7+', u: 'u@*#', z: 'z2',
}

function escapeRegExp (s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeClass (s) {
  return s.replace(/[\]\\^-]/g, '\\$&')
}

// Strip accents and zero-width padding, lowercase, and collapse runs of 3+ so
// "shiiiit" reads as "shit". Symbols are left alone for the pattern to handle.
// Letters that render as a Latin letter but are a different codepoint.
// Unicode normalization does not touch these - Cyrillic "с" and Latin "c" are
// genuinely different letters, not two forms of one - so "fuсk" reads as clean
// text to any filter that stops at NFKD. Substituting one lookalike character
// is the most common evasion in a live chat, so the fold is explicit.
const CONFUSABLES = {
  // Cyrillic
  а: 'a', в: 'b', е: 'e', ѕ: 's', і: 'i', ј: 'j', к: 'k',
  м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x',
  // Greek
  α: 'a', β: 'b', ε: 'e', ι: 'i', κ: 'k', ν: 'v', ο: 'o',
  ρ: 'p', τ: 't', υ: 'u', χ: 'x',
  // Latin letters stripped of a dot or stroke
  ı: 'i', ȷ: 'j', ł: 'l', ø: 'o', đ: 'd',
}
const CONFUSABLE_RE = new RegExp(`[${Object.keys(CONFUSABLES).join('')}]`, 'g')
const defuse = s => s.replace(CONFUSABLE_RE, ch => CONFUSABLES[ch])

// Evasion by pulling a word apart: "f u c k", "f.u.c.k", "f-u-c-k". Compiled as
// a second alternative that requires a separator in EVERY gap rather than an
// optional one in each. An optional separator would flag "he's hit" as "shit":
// the apostrophe is not a letter, so the opening anchor holds, and only one of
// the three gaps has anything in it. All-or-nothing keeps the spaced form an
// evasion rather than a coincidence.
const SEPARATOR = '[\\s._\\-*+~,|]'

export function normalize (text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[​-‏⁠﻿]/g, '')
    .toLowerCase()
    .replace(CONFUSABLE_RE, ch => CONFUSABLES[ch])
    .replace(/(.)\1{2,}/g, '$1')
}

// Accents off and lowercased, but no repeat-collapsing: a banned word is a
// literal to expand, not a message to clean up.
function normalizeWord (word) {
  return word
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[​-‏⁠﻿]/g, '')
    .toLowerCase()
    .replace(CONFUSABLE_RE, ch => CONFUSABLES[ch])
    .trim()
}

// "fuck" becomes [f]+[u@*#]+[c(]+[k]+ — tolerant of leetspeak and of doubled
// letters that survived collapsing ("fuuck"), while word boundaries keep it
// from firing inside an innocent longer word.
function wordToPattern (word) {
  const letters = []
  for (const ch of word) {
    const cls = LEET_CLASS[ch]
    letters.push(cls ? `[${escapeClass(cls)}]+` : `${escapeRegExp(ch)}+`)
  }
  if (letters.length < 2) return letters.join('')
  return `(?:${letters.join('')}|${letters.join(SEPARATOR + '+')})`
}

// The only endings allowed after a banned word. Anything longer is a
// different word, not a form of this one.
const INFLECTIONS = ['s', 'es', 'ed', 'er', 'ers', 'ing', 'ings', 'in', 'ins', 'y', 'ies']
const SUFFIX = `(?:${INFLECTIONS.join('|')})?`

// Compiles one {words, patterns} rule set. Used for the judgment tier and for
// each standing-rule category separately, so a hit knows which list it came
// from and therefore how urgent it is.
export function compile ({ words = [], patterns = [] } = {}, onWarn = () => {}) {
  const expanded = words
    .map(w => normalizeWord(String(w)))
    .filter(Boolean)
    .map(wordToPattern)

  const compiledPatterns = []
  for (const raw of patterns) {
    if (!String(raw).trim()) continue
    try {
      compiledPatterns.push(new RegExp(raw, 'i'))
    } catch {
      onWarn(`ignoring invalid pattern: ${raw}`)
    }
  }

  return {
    // Anchors are letter-adjacency lookarounds rather than \b: a word spelled
    // with a leading symbol ("$hit", "@ss") has no word boundary in front of
    // it, so \b lets exactly the obfuscated cases through.
    //
    // A closed set of inflections is allowed before the closing anchor,
    // because nobody in chat types the bare infinitive - "fucking", "fucked",
    // "bitches" and "shitty" are the forms that actually show up, and a bare
    // whole-word anchor misses every one of them. Doubled final consonants
    // ("shitty", "shitting") need no special case: wordToPattern already
    // quantifies each letter.
    //
    // Closed, not open-ended: a trailing wildcard would catch "shitake" and
    // "dickens". Compounds like "dickhead" are not inflections and still need
    // their own entry in the list.
    words: expanded.length ? new RegExp(`(?<![a-z0-9_])(?:${expanded.join('|')})${SUFFIX}(?![a-z0-9_])`, 'i') : null,
    patterns: compiledPatterns,
  }
}

export function matchAgainst (compiled, text, normalized = normalize(text)) {
  const wordHit = compiled.words?.exec(normalized)
  if (wordHit) return { term: wordHit[0], source: 'word' }

  for (const pattern of compiled.patterns) {
    if (pattern.test(text)) return { term: pattern.source, source: 'pattern' }
  }
  return null
}

export function compileAllowList (terms = []) {
  return terms.map(w => normalize(String(w).trim())).filter(Boolean)
}

export function isAllowed (allowTerms, normalized) {
  return allowTerms.some(term => normalized.includes(term))
}

// Section 3 of the guide turns on whether an account is known to the community.
// Membership is the closest signal YouTube actually gives us; it is a proxy for
// "regular", not a perfect one.
export function trustOf (chat) {
  if (chat.isOwner || chat.isModerator) return 'staff'
  if (chat.membership) return 'member'
  return 'unknown'
}

// Back-compat wrappers over the flat single-list shape, kept so the extension's
// copy of this engine and the word-level self-tests stay comparable.
export function buildMatcher (moderation, onWarn = () => {}) {
  const compiled = compile(
    { words: moderation.bannedWords ?? [], patterns: moderation.bannedPatterns ?? [] },
    onWarn
  )
  return { ...compiled, allow: compileAllowList(moderation.allowList ?? []) }
}

export function findViolation (matcher, text) {
  const normalized = normalize(text)
  if (isAllowed(matcher.allow, normalized)) return null
  return matchAgainst(matcher, text, normalized)
}

export function isExempt (chat, moderation) {
  if (moderation.exemptOwner && chat.isOwner) return true
  if (moderation.exemptModerators && chat.isModerator) return true
  if (moderation.exemptMembers && chat.membership) return true
  return false
}
