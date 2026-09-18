import { DEFAULTS, withDefaults } from './src/defaults.js'

const $ = id => document.getElementById(id)

const LINES = ['allowList', 'removeLabels', 'timeoutLabels', 'banLabels']
const JUDGMENT_LINES = ['words', 'patterns']
const MOD_CHECKS = ['enabled', 'respectHumanMods']
const QA_CHECKS = ['enabled', 'mentionAsker', 'skipOwnerMessages']
const QA_NUMBERS = ['cooldownSeconds', 'maxRepliesPerHour', 'maxReplyChars']

const toLines = value => (value ?? []).join('\n')
const fromLines = value => value.split('\n').map(s => s.trim()).filter(Boolean)

function render (config) {
  $('apiKey').value = config.apiKey
  $('model').value = config.model

  for (const key of MOD_CHECKS) $(`mod-${key}`).checked = Boolean(config.moderation[key])
  for (const key of LINES) $(key).value = toLines(config.moderation[key])
  for (const key of JUDGMENT_LINES) $(`judgment-${key}`).value = toLines(config.moderation.judgment[key])
  $('mod-mode').value = config.moderation.mode
  $('mod-lenient').checked = config.moderation.judgment.lenientForMembers !== false
  $('strikes-enabled').checked = Boolean(config.moderation.strikes.enabled)
  $('strikes-timeoutAt').value = config.moderation.strikes.timeoutAt
  $('strikes-banAt').value = config.moderation.strikes.banAt
  $('hate-words').value = toLines(config.moderation.standing?.categories?.hate?.words ?? [])

  for (const key of QA_CHECKS) $(`qa-${key}`).checked = Boolean(config.qa[key])
  for (const key of QA_NUMBERS) $(`qa-${key}`).value = config.qa[key]
  $('qa-trigger').value = config.qa.trigger
  $('qa-prefix').value = config.qa.prefix
  $('qa-systemPrompt').value = config.qa.systemPrompt

  $('dry-warning').hidden = config.moderation.mode !== 'dry'
}

function collect (current) {
  const moderation = { ...current.moderation }
  for (const key of MOD_CHECKS) moderation[key] = $(`mod-${key}`).checked
  for (const key of LINES) moderation[key] = fromLines($(key).value)
  moderation.mode = $('mod-mode').value
  moderation.judgment = { ...current.moderation.judgment, lenientForMembers: $('mod-lenient').checked }
  for (const key of JUDGMENT_LINES) moderation.judgment[key] = fromLines($(`judgment-${key}`).value)
  moderation.strikes = {
    enabled: $('strikes-enabled').checked,
    timeoutAt: Number($('strikes-timeoutAt').value) || 2,
    banAt: Number($('strikes-banAt').value) || 3,
  }
  const hate = fromLines($('hate-words').value)
  moderation.standing = {
    categories: {
      ...(current.moderation.standing?.categories ?? {}),
      hate: { ...(current.moderation.standing?.categories?.hate ?? {}), enabled: true, action: 'ban', words: hate },
    },
  }

  const qa = { ...current.qa }
  for (const key of QA_CHECKS) qa[key] = $(`qa-${key}`).checked
  for (const key of QA_NUMBERS) qa[key] = Number($(`qa-${key}`).value) || DEFAULTS.qa[key]
  qa.trigger = $('qa-trigger').value
  qa.prefix = $('qa-prefix').value.trim()
  qa.systemPrompt = $('qa-systemPrompt').value.trim() || DEFAULTS.qa.systemPrompt

  return { apiKey: $('apiKey').value.trim(), model: $('model').value, moderation, qa }
}

function flash (text) {
  $('status').textContent = text
  setTimeout(() => { $('status').textContent = '' }, 2500)
}

let config = withDefaults(await chrome.storage.local.get(null))
render(config)

$('mod-mode').addEventListener('change', () => { $('dry-warning').hidden = $('mod-mode').value !== 'dry' })

$('save').addEventListener('click', async () => {
  const update = collect(config)
  await chrome.storage.local.set(update)
  config = withDefaults(await chrome.storage.local.get(null))
  flash('Saved. Reload any open live chat tab to apply.')
})

$('reset').addEventListener('click', async () => {
  if (!confirm('Reset every setting to its default? Your API key will be cleared too.')) return
  await chrome.storage.local.set({ ...DEFAULTS, log: [] })
  config = withDefaults(await chrome.storage.local.get(null))
  render(config)
  flash('Reset to defaults.')
})
