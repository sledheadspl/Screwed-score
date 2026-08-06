const LOCAL_KEY = 'gss_doc_history'
const SESSION_KEY = 'gss_session_id'
const MAX = 20

export interface DocHistoryEntry {
  id: string
  type: string
  label: string
  html: string
  createdAt: number
  preview: string
  shareSlug?: string
}

export function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 'anon'
  }
}

// ── Remote (Supabase) ──────────────────────────────────────────────────────

export async function saveToRemote(
  entry: { type: string; label: string; html: string }
): Promise<{ id: string; shareSlug: string } | null> {
  try {
    const sessionId = getOrCreateSessionId()
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
      body: JSON.stringify({ doc_type: entry.type, doc_label: entry.label, html: entry.html }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { id: data.id, shareSlug: data.share_slug }
  } catch {
    return null
  }
}

export async function loadFromRemote(): Promise<DocHistoryEntry[]> {
  try {
    const sessionId = getOrCreateSessionId()
    const res = await fetch(`/api/documents?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { 'x-session-id': sessionId },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.documents ?? []).map((d: {
      id: string; doc_type: string; doc_label: string;
      html?: string; preview: string; share_slug?: string; created_at: string
    }) => ({
      id: d.id,
      type: d.doc_type,
      label: d.doc_label,
      html: d.html ?? '',
      preview: d.preview,
      shareSlug: d.share_slug,
      createdAt: new Date(d.created_at).getTime(),
    }))
  } catch {
    return []
  }
}

export async function deleteFromRemote(id: string): Promise<void> {
  try {
    const sessionId = getOrCreateSessionId()
    await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-session-id': sessionId },
    })
  } catch { /* ignore */ }
}

// ── Local fallback ─────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}

export function saveToLocal(entry: Omit<DocHistoryEntry, 'id' | 'preview'>): DocHistoryEntry {
  const full: DocHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    preview: stripHtml(entry.html),
  }
  const existing = loadFromLocal()
  const updated = [full, ...existing].slice(0, MAX)
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
  } catch {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(updated.slice(0, 5))) } catch { /* ignore */ }
  }
  return full
}

export function loadFromLocal(): DocHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw) as DocHistoryEntry[]
  } catch {
    return []
  }
}

export function deleteFromLocal(id: string): void {
  const updated = loadFromLocal().filter(e => e.id !== id)
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(updated)) } catch { /* ignore */ }
}

// ── Legacy aliases (keep old call sites compiling) ─────────────────────────

/** @deprecated use saveToRemote + saveToLocal */
export function saveToHistory(entry: Omit<DocHistoryEntry, 'id' | 'preview'>): DocHistoryEntry {
  return saveToLocal(entry)
}

/** @deprecated use loadFromRemote / loadFromLocal */
export function loadHistory(): DocHistoryEntry[] {
  return loadFromLocal()
}

/** @deprecated use deleteFromRemote + deleteFromLocal */
export function deleteFromHistory(id: string): void {
  deleteFromLocal(id)
}
