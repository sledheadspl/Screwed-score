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
export function normalize (text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[​-‏⁠﻿]/g, '')
    .toLowerCase()
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
    .trim()
}

// "fuck" becomes [f]+[u@*#]+[c(]+[k]+ — tolerant of leetspeak and of doubled
// letters that survived collapsing ("fuuck"), while word boundaries keep it
// from firing inside an innocent longer word.
function wordToPattern (word) {
  let out = ''
  for (const ch of word) {
    const cls = LEET_CLASS[ch]
    out += cls ? `[${escapeClass(cls)}]+` : `${escapeRegExp(ch)}+`
  }
  return out
}

export function buildMatcher (moderation, onWarn = () => {}) {
  const words = (moderation.bannedWords ?? [])
    .map(w => normalizeWord(String(w)))
    .filter(Boolean)
    .map(wordToPattern)

  const patterns = []
  for (const raw of moderation.bannedPatterns ?? []) {
    if (!String(raw).trim()) continue
    try {
      patterns.push(new RegExp(raw, 'i'))
    } catch {
      onWarn(`ignoring invalid pattern: ${raw}`)
    }
  }

  return {
    // Letter-adjacency lookarounds rather than \b: a word spelled with a
    // leading symbol ("$hit", "@ss") has no word boundary in front of it, so
    // \b would let exactly the obfuscated cases through.
    words: words.length ? new RegExp(`(?<![a-z0-9_])(?:${words.join('|')})(?![a-z0-9_])`, 'i') : null,
    patterns,
    allow: (moderation.allowList ?? []).map(w => normalize(String(w).trim())).filter(Boolean),
  }
}

export function findViolation (matcher, text) {
  const normalized = normalize(text)
  if (matcher.allow.some(term => normalized.includes(term))) return null

  const wordHit = matcher.words?.exec(normalized)
  if (wordHit) return { term: wordHit[0], source: 'word' }

  for (const pattern of matcher.patterns) {
    if (pattern.test(text)) return { term: pattern.source, source: 'pattern' }
  }
  return null
}

export function isExempt (chat, moderation) {
  if (moderation.exemptOwner && chat.isOwner) return true
  if (moderation.exemptModerators && chat.isModerator) return true
  if (moderation.exemptMembers && chat.membership) return true
  return false
}
