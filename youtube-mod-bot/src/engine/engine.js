// The moderation engine, as a classic script so a content script can load it
// (MV3 content scripts cannot be ES modules). It attaches to self.ModBot.
//
// This is the same logic as headless/src/{moderation,rules}.js, expressed
// against a plain actor shape so both sides can be run over one corpus of
// cases and compared. engine.parity.selftest.js does exactly that, and is the
// only thing keeping the two copies honest.

;(function (root) {
  const LEET_CLASS = {
    a: 'a@4*', b: 'b8', c: 'c(', e: 'e3@*', g: 'g9', i: 'i1!|@*',
    l: 'l1|', o: 'o0@*', s: 's5$', t: 't7+', u: 'u@*#', z: 'z2',
  }

  // The only endings allowed after a banned word. Anything longer is a
  // different word, not a form of this one.
  const INFLECTIONS = ['s', 'es', 'ed', 'er', 'ers', 'ing', 'ings', 'in', 'ins', 'y', 'ies']
  const SUFFIX = `(?:${INFLECTIONS.join('|')})?`

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

  const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapeClass = s => s.replace(/[\]\\^-]/g, '\\$&')

  function normalize (text) {
    return text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[​-‏⁠﻿]/g, '')
      .toLowerCase()
      .replace(CONFUSABLE_RE, ch => CONFUSABLES[ch])
      .replace(/(.)\1{2,}/g, '$1')
  }

  function normalizeWord (word) {
    return word
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[​-‏⁠﻿]/g, '')
      .toLowerCase()
      .replace(CONFUSABLE_RE, ch => CONFUSABLES[ch])
      .trim()
  }

  function wordToPattern (word) {
    const letters = []
    for (const ch of word) {
      const cls = LEET_CLASS[ch]
      letters.push(cls ? `[${escapeClass(cls)}]+` : `${escapeRegExp(ch)}+`)
    }
    if (letters.length < 2) return letters.join('')
    return `(?:${letters.join('')}|${letters.join(SEPARATOR + '+')})`
  }

  function compile (spec, onWarn) {
    const warn = onWarn || function () {}
    const words = (spec && spec.words ? spec.words : [])
      .map(w => normalizeWord(String(w)))
      .filter(Boolean)
      .map(wordToPattern)

    const patterns = []
    for (const raw of (spec && spec.patterns ? spec.patterns : [])) {
      if (!String(raw).trim()) continue
      try {
        patterns.push(new RegExp(raw, 'i'))
      } catch {
        warn(`ignoring invalid pattern: ${raw}`)
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
      words: words.length ? new RegExp(`(?<![a-z0-9_])(?:${words.join('|')})${SUFFIX}(?![a-z0-9_])`, 'i') : null,
      patterns,
    }
  }

  function matchAgainst (compiled, text, normalized) {
    const norm = normalized === undefined ? normalize(text) : normalized
    const wordHit = compiled.words ? compiled.words.exec(norm) : null
    if (wordHit) return { term: wordHit[0], source: 'word' }
    for (const pattern of compiled.patterns) {
      if (pattern.test(text)) return { term: pattern.source, source: 'pattern' }
    }
    return null
  }

  // Guide Section 2. Hate ships empty on purpose: a repo is the wrong place for
  // a slur list, and Section 6 points at YouTube's own blocked-words list.
  const STANDING_DEFAULTS = {
    hate: { enabled: true, action: 'ban', words: [], patterns: [] },
    harassment: {
      enabled: true,
      action: 'timeout',
      words: [],
      patterns: [
        '\\b(send|post)\\s+(me\\s+)?(nudes|pics)\\b',
        '\\bare\\s+you\\s+(single|horny)\\b',
        '\\b(dm|pm)\\s+me\\s+(your|ur)\\s+(number|snap|insta)\\b',
        '\\bwhat\\s+are\\s+you\\s+wearing\\b',
      ],
    },
    doxxing: {
      enabled: true,
      action: 'ban',
      words: [],
      patterns: [
        '\\b\\d{3}[-.\\s]\\d{3}[-.\\s]\\d{4}\\b',
        '\\b\\d{1,5}\\s+[A-Za-z0-9.\\s]{3,30}\\s+(st|street|ave|avenue|rd|road|blvd|drive|dr|lane|ln)\\b',
        '\\b[\\w.+-]+@[\\w-]+\\.[\\w.]{2,}\\b',
      ],
    },
    spamLinks: {
      enabled: true,
      action: 'timeout',
      words: [],
      patterns: [
        'https?://(?!(www\\.)?youtube\\.com|youtu\\.be)',
        '\\b(t\\.me|wa\\.me|discord\\.gg|bit\\.ly|cash\\.app)\\b',
        '\\bfree\\s+(nitro|robux|v-?bucks|giveaway)\\b',
        '\\b(crypto|bitcoin|forex)\\s+(signal|invest|profit)',
        '\\bdm\\s+(me\\s+)?to\\s+claim\\b',
      ],
    },
  }

  function buildRules (moderation, onWarn) {
    const mod = moderation || {}
    const configured = (mod.standing && mod.standing.categories) || {}
    const standing = []

    for (const category of Object.keys(STANDING_DEFAULTS)) {
      const settings = Object.assign({}, STANDING_DEFAULTS[category], configured[category] || {})
      if (!settings.enabled) continue
      const hasWords = settings.words && settings.words.length
      const hasPatterns = settings.patterns && settings.patterns.length
      if (!hasWords && !hasPatterns) continue
      standing.push({
        category,
        action: settings.action || 'delete',
        compiled: compile({ words: settings.words, patterns: settings.patterns }, onWarn),
      })
    }

    const judgment = mod.judgment || {}
    return {
      standing,
      judgment: compile({ words: judgment.words, patterns: judgment.patterns }, onWarn),
      allow: (mod.allowList || []).map(w => normalize(String(w).trim())).filter(Boolean),
      lenientForMembers: judgment.lenientForMembers !== false,
      judgmentOnMatch: judgment.onMatch || 'act',
    }
  }

  // actor: { isOwner, isModerator, isMember } - the one shape both sides build,
  // so the two engines can be compared directly.
  function trustOf (actor) {
    if (actor.isOwner || actor.isModerator) return 'staff'
    if (actor.isMember) return 'member'
    return 'unknown'
  }

  function evaluate (rules, actor, text) {
    const normalized = normalize(text)
    const trust = trustOf(actor)

    // Section 5: the bot must not be the thing that undermines a mod.
    if (trust === 'staff') return null

    // Standing rules are checked before the allow list: a slur is a slur even
    // in a message that also contains an allowed word.
    for (const rule of rules.standing) {
      const hit = matchAgainst(rule.compiled, text, normalized)
      if (hit) {
        return {
          tier: 'standing',
          category: rule.category,
          action: rule.action,
          term: hit.term,
          source: hit.source,
          trust,
          immediate: true,
        }
      }
    }

    if (rules.allow.some(term => normalized.includes(term))) return null

    const hit = matchAgainst(rules.judgment, text, normalized)
    if (!hit) return null

    const lenient = rules.lenientForMembers && trust === 'member'
    return {
      tier: 'judgment',
      category: 'judgment',
      action: 'delete',
      term: hit.term,
      source: hit.source,
      trust,
      immediate: false,
      hold: lenient || rules.judgmentOnMatch === 'hold',
      reason: lenient ? 'member, held for a human call' : undefined,
    }
  }

  const ACTION_RANK = { delete: 0, timeout: 1, ban: 2 }

  // "Never ban, only mute" as one ceiling rather than an edit to every rule.
  // Applied after the rules have decided, so a rule that asks for a ban still
  // escalates as far as the ceiling allows and no further. A ban is the action
  // you cannot quietly take back, so the ceiling is a timeout unless a caller
  // names a higher one - an absent setting must not read as "no ceiling".
  function capAction (action, maxAction) {
    const ceiling = ACTION_RANK[maxAction] === undefined ? ACTION_RANK.timeout : ACTION_RANK[maxAction]
    return (ACTION_RANK[action] ?? 0) > ceiling ? maxAction : action
  }

  // Section 6: delete, then timeout, then ban on repeat hits.
  function escalate (strikes, key, baseAction, cfg) {
    const settings = cfg || {}
    if (!settings.enabled) return { action: baseAction, count: 0 }

    const count = (strikes.get(key) || 0) + 1
    strikes.set(key, count)

    if (count >= (settings.banAt || 3)) return { action: 'ban', count }
    if (count >= (settings.timeoutAt || 2)) return { action: 'timeout', count }
    return { action: baseAction, count }
  }

  // Waiting for a menu entry to render, hardened for a hidden tab.
  //
  // Chrome clamps timers in a hidden tab to about a second, and after a few
  // minutes hidden it can stretch them to a minute. A pure wall-clock budget
  // then expires after one or two polls, so the attempt count matters as much
  // as the time: a hidden tab gets a longer budget and a floor on how many
  // times it looks before giving up.
  //
  // Dependencies are injected so this is testable against a fake clock.
  async function waitFor (fn, options) {
    const opts = options || {}
    const timeout = opts.timeout === undefined ? 2000 : opts.timeout
    const interval = opts.interval === undefined ? 50 : opts.interval
    const minAttempts = opts.minAttempts === undefined ? 4 : opts.minAttempts
    const maxAttempts = opts.maxAttempts === undefined ? 200 : opts.maxAttempts
    const isHidden = opts.hidden || (() => false)
    const now = opts.now || (() => Date.now())
    const sleep = opts.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)))

    const budget = isHidden() ? timeout * 4 : timeout
    const deadline = now() + budget
    let attempts = 0

    for (;;) {
      const value = fn()
      attempts += 1
      if (value) return value
      if (attempts >= maxAttempts) return null
      // Both must be spent: the clock alone is not a fair test when timers are
      // being throttled, and attempts alone would spin on a fast machine.
      if (attempts >= minAttempts && now() >= deadline) return null
      await sleep(interval)
    }
  }

  root.ModBot = {
    waitFor,
    normalize, compile, matchAgainst, buildRules, evaluate, trustOf, escalate, capAction, STANDING_DEFAULTS,
  }
})(typeof self !== 'undefined' ? self : globalThis)
