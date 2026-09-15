// Encodes the Pokebank YouTube Moderation Guide.
//
// The guide splits enforcement in two, and so does this:
//
//   Section 2, Standing Rules - harassment, doxxing, spam/scam links, hate
//   speech. "Act first, explain after. No approval needed." These fire
//   immediately, for everyone, whatever review mode the bot is in.
//
//   Section 3, Judgment Calls - mild swearing and the like, where "tone and
//   context matter". These respect the review mode, and Section 3's leniency
//   for known members applies.
//
// One deliberate departure, chosen by the operator: Section 1 ranks Hype above
// Safety, which for an automatic filter would mean leaving ambiguous messages
// up. This bot is configured safety-first instead - an ambiguous judgment call
// is acted on and reviewed after. Set judgment.onMatch to 'hold' to restore the
// guide's original ordering.

import { compile, compileAllowList, isAllowed, matchAgainst, normalize, trustOf } from './moderation.js'

// Section 2 categories. Each carries the action the guide implies for it.
// Hate speech ships with an EMPTY word list on purpose: a public repo is the
// wrong place for a slur list, and Section 6 already points at YouTube's own
// blocked-words list as the first line of defense. Add yours in config.json.
export const STANDING_DEFAULTS = {
  hate: {
    enabled: true,
    action: 'ban',
    words: [],
    patterns: [],
  },
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
      // Phone numbers and street addresses posted in chat.
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
      // Links away from YouTube, plus the usual giveaway/crypto bait.
      'https?://(?!(www\\.)?youtube\\.com|youtu\\.be)',
      '\\b(t\\.me|wa\\.me|discord\\.gg|bit\\.ly|cash\\.app)\\b',
      '\\bfree\\s+(nitro|robux|v-?bucks|giveaway)\\b',
      '\\b(crypto|bitcoin|forex)\\s+(signal|invest|profit)',
      '\\bdm\\s+(me\\s+)?to\\s+claim\\b',
    ],
  },
}

export function buildRules (moderation, onWarn = () => {}) {
  const standing = []
  const configured = moderation.standing?.categories ?? {}

  for (const [category, defaults] of Object.entries(STANDING_DEFAULTS)) {
    const settings = { ...defaults, ...(configured[category] ?? {}) }
    if (!settings.enabled) continue
    if (!settings.words?.length && !settings.patterns?.length) continue
    standing.push({
      category,
      action: settings.action ?? 'delete',
      compiled: compile({ words: settings.words, patterns: settings.patterns }, onWarn),
    })
  }

  return {
    standing,
    judgment: compile(
      { words: moderation.judgment?.words ?? [], patterns: moderation.judgment?.patterns ?? [] },
      onWarn
    ),
    allow: compileAllowList(moderation.allowList ?? []),
    lenientForMembers: moderation.judgment?.lenientForMembers !== false,
    judgmentOnMatch: moderation.judgment?.onMatch ?? 'act',
  }
}

// Returns null for "leave it alone", or a verdict describing what to do.
export function evaluate (rules, chat, text) {
  const normalized = normalize(text)
  const trust = trustOf(chat)

  // Staff are never auto-moderated. Section 5: the bot must not be the thing
  // that undermines a mod in front of chat.
  if (trust === 'staff') return null

  // Standing rules are checked BEFORE the allow list. A slur is a slur even if
  // the message also contains an allowed word.
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
        // Section 4: any mod can act immediately, no approval needed.
        immediate: true,
      }
    }
  }

  if (isAllowed(rules.allow, normalized)) return null

  const hit = matchAgainst(rules.judgment, text, normalized)
  if (!hit) return null

  // Section 3: "Case-by-case leniency is fine for known, trusted members" -
  // so a member's minor slip goes to a human instead of being auto-removed.
  // An unknown account has no history to extend trust on: enforce normally.
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
