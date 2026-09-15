import { withDefaults } from './src/defaults.js'

const $ = id => document.getElementById(id)

const LABELS = { deleted: 'deleted', wouldDelete: 'would delete', answered: 'answered', error: 'error' }

function timeAgo (at) {
  const seconds = Math.round((Date.now() - at) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  return `${Math.round(seconds / 3600)}h ago`
}

async function render () {
  const stored = await chrome.storage.local.get(null)
  const config = withDefaults(stored)

  $('enabled').checked = config.enabled
  $('dry').hidden = !config.moderation.dryRun
  $('nokey').hidden = Boolean(config.apiKey) || !config.qa.enabled

  for (const key of ['deleted', 'wouldDelete', 'answered', 'errors']) {
    $(`s-${key}`).textContent = config.stats[key] ?? 0
  }

  const log = stored.log ?? []
  $('empty').hidden = log.length > 0
  $('log').replaceChildren(...log.slice(0, 25).map(entry => {
    const li = document.createElement('li')

    const kind = document.createElement('span')
    kind.className = `kind ${entry.kind}`
    kind.textContent = LABELS[entry.kind] ?? entry.kind

    const who = document.createElement('span')
    who.className = 'who'
    who.textContent = ` ${entry.author ?? ''} `

    const when = document.createElement('span')
    when.style.opacity = '.55'
    when.textContent = timeAgo(entry.at)

    const what = document.createElement('div')
    what.className = 'what'
    what.textContent = [entry.text, entry.detail].filter(Boolean).join(' — ')

    li.append(kind, who, when, what)
    return li
  }))
}

$('enabled').addEventListener('change', async () => {
  await chrome.storage.local.set({ enabled: $('enabled').checked })
})

$('options').addEventListener('click', () => chrome.runtime.openOptionsPage())

$('clear').addEventListener('click', async () => {
  await chrome.storage.local.set({ log: [], stats: { deleted: 0, wouldDelete: 0, answered: 0, errors: 0 } })
  render()
})

chrome.storage.onChanged.addListener(render)
render()
