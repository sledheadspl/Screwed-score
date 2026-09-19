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

  const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapeClass = s => s.replace(/[\]\\^-]/g, '\\$&')

  function normalize (text) {
    return text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[​-‏⁠﻿]/g, '')
      .toLowerCase()
      .replace(/(.)\1{2,}/g, '$1')
  }

  function normalizeWord (word) {
    return word
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[​-‏⁠﻿]/g, '')
      .toLowerCase()
      .trim()
  }

  function wordToPattern (word) {
    let out = ''
    for (const ch of word) {
      const cls = LEET_CLASS[ch]
      out += cls ? `[${escapeClass(cls)}]+` : `${escapeRegExp(ch)}+`
    }
    return out
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
      // Letter-adjacency lookarounds rather than \b: a word spelled with a
      // leading symbol ("$hit", "@ss") has no word boundary in front of it.
      words: words.length ? new RegExp(`(?<![a-z0-9_])(?:${words.join('|')})(?![a-z0-9_])`, 'i') : null,
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

  // Section 6: delete, then timeout, then ban on repeat standing hits.
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
    normalize, compile, matchAgainst, buildRules, evaluate, trustOf, escalate, STANDING_DEFAULTS,
  }
})(typeof self !== 'undefined' ? self : globalThis)
