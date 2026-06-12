const KEY = 'gss_doc_history'
const MAX = 10

export interface DocHistoryEntry {
  id: string
  type: string
  label: string
  html: string
  createdAt: number
  preview: string // first ~120 chars of stripped text
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}

export function saveToHistory(entry: Omit<DocHistoryEntry, 'id' | 'preview'>): DocHistoryEntry {
  const full: DocHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    preview: stripHtml(entry.html),
  }
  const existing = loadHistory()
  const updated = [full, ...existing].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {
    // storage full — drop oldest
    try { localStorage.setItem(KEY, JSON.stringify(updated.slice(0, 5))) } catch { /* ignore */ }
  }
  return full
}

export function loadHistory(): DocHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as DocHistoryEntry[]
  } catch {
    return []
  }
}

export function deleteFromHistory(id: string): void {
  const updated = loadHistory().filter(e => e.id !== id)
  try { localStorage.setItem(KEY, JSON.stringify(updated)) } catch { /* ignore */ }
}

export function clearHistory(): void {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
