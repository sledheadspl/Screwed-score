const KEY = 'gss_biz_profile'

export interface BizProfile {
  name: string
  address: string
  phone: string
  email: string
  license: string
}

const EMPTY: BizProfile = { name: '', address: '', phone: '', email: '', license: '' }

export function loadProfile(): BizProfile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    return { ...EMPTY }
  }
}

export function saveProfile(profile: BizProfile): void {
  try { localStorage.setItem(KEY, JSON.stringify(profile)) } catch { /* ignore */ }
}
