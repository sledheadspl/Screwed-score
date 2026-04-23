'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthClient } from '@/lib/auth-client'
import { ShieldCheck, Search, Plus, CheckCircle, AlertTriangle, Edit3, Save, X } from 'lucide-react'
import Link from 'next/link'

interface Vendor {
  id: string
  name: string
  category: string
  city: string | null
  state: string | null
  website: string | null
  phone: string | null
  claimed_by: string | null
  verified: boolean
  bio: string | null
  tagline: string | null
  logo_url: string | null
  response_statement: string | null
}

interface Reputation {
  total_analyses: number
  screwed_count: number
  maybe_count: number
  safe_count: number
  avg_screwed_percent: number
  total_flagged_amount: number
}

const CATEGORIES = [
  'mechanic', 'contractor', 'medical', 'dental',
  'insurance', 'telecom', 'legal', 'financial', 'other',
]

function ScoreBar({ rep }: { rep: Reputation }) {
  const total = rep.total_analyses
  if (total === 0) return <p className="text-sm text-brand-sub">No analyses yet — your reputation is unscored.</p>
  const safePercent    = Math.round((rep.safe_count / total) * 100)
  const maybePercent   = Math.round((rep.maybe_count / total) * 100)
  const screwedPercent = 100 - safePercent - maybePercent

  return (
    <div className="space-y-3">
      <div className="flex gap-0.5 rounded-full overflow-hidden h-3">
        {safePercent > 0    && <div style={{ width: `${safePercent}%`,    background: '#4ade80' }} />}
        {maybePercent > 0   && <div style={{ width: `${maybePercent}%`,   background: '#fbbf24' }} />}
        {screwedPercent > 0 && <div style={{ width: `${screwedPercent}%`, background: '#ff3b30' }} />}
      </div>
      <div className="flex gap-4 text-xs text-brand-sub">
        <span><span className="font-bold" style={{ color: '#4ade80' }}>{rep.safe_count}</span> SAFE</span>
        <span><span className="font-bold" style={{ color: '#fbbf24' }}>{rep.maybe_count}</span> MAYBE</span>
        <span><span className="font-bold" style={{ color: '#ff3b30' }}>{rep.screwed_count}</span> SCREWED</span>
        <span className="ml-auto">{total} total {total === 1 ? 'analysis' : 'analyses'}</span>
      </div>
    </div>
  )
}

export default function BusinessPortalPage() {
  const router = useRouter()
  const [userId, setUserId]         = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  // Claimed vendor state
  const [claimedVendor, setClaimedVendor]   = useState<Vendor | null>(null)
  const [reputation, setReputation]         = useState<Reputation | null>(null)
  const [loadingVendor, setLoadingVendor]   = useState(false)

  // Search state
  const [searchQ, setSearchQ]     = useState('')
  const [searchResults, setSearchResults] = useState<Vendor[]>([])
  const [searching, setSearching] = useState(false)

  // Create new vendor state
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createCat, setCreateCat]   = useState('mechanic')
  const [createCity, setCreateCity] = useState('')
  const [createState, setCreateState] = useState('')
  const [creating, setCreating]     = useState(false)

  // Edit profile state
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState<Partial<Vendor>>({})
  const [saving, setSaving]   = useState(false)
  const [saveOk, setSaveOk]   = useState(false)

  const [error, setError] = useState<string | null>(null)

  // Check auth
  useEffect(() => {
    getAuthClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/auth?role=business')
      } else {
        setUserId(user.id)
      }
      setLoadingAuth(false)
    })
  }, [router])

  // Load claimed vendor for this user
  const loadClaimedVendor = useCallback(async () => {
    if (!userId) return
    setLoadingVendor(true)
    try {
      const res  = await fetch(`/api/vendors/search?claimed_by=${userId}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const v = data[0] as Vendor
        setClaimedVendor(v)
        setDraft(v)
        // Load reputation
        const repRes = await fetch(`/api/vendors/${v.id}/profile`)
        const repData = await repRes.json()
        if (repData.reputation) setReputation(repData.reputation)
      }
    } finally {
      setLoadingVendor(false)
    }
  }, [userId])

  useEffect(() => { if (userId) loadClaimedVendor() }, [userId, loadClaimedVendor])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQ.trim()) return
    setSearching(true)
    try {
      const res  = await fetch(`/api/vendors/search?q=${encodeURIComponent(searchQ.trim())}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
    } finally {
      setSearching(false)
    }
  }

  async function handleClaim(vendorId: string) {
    setError(null)
    try {
      const res  = await fetch(`/api/vendors/${vendorId}/claim`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to claim')
      await loadClaimedVendor()
      setSearchResults([])
      setSearchQ('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res  = await fetch('/api/vendors/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: createName.trim(), category: createCat, city: createCity, state: createState.toUpperCase().slice(0,2) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create')
      await handleClaim(data.vendor.id)
      setShowCreate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  async function handleSave() {
    if (!claimedVendor) return
    setSaving(true)
    setError(null)
    try {
      const res  = await fetch(`/api/vendors/${claimedVendor.id}/profile`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setClaimedVendor(data.vendor)
      setDraft(data.vendor)
      setEditing(false)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-8 h-8 border-2 border-brand-border border-t-green-400 rounded-full animate-spin" />
      </div>
    )
  }

  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div className="min-h-screen bg-brand-bg">
      <nav className="sticky top-0 z-50 border-b border-brand-border bg-brand-bg/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: '#4ade80' }} />
            <span className="font-black text-brand-text">Business Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/community" className="text-xs text-brand-sub hover:text-brand-text transition-colors">Community</Link>
            <button
              onClick={() => { getAuthClient().auth.signOut(); router.push('/') }}
              className="text-xs text-brand-sub hover:text-brand-text transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-5 py-10 space-y-8">

        {loadingVendor ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-border border-t-green-400 rounded-full animate-spin" />
          </div>
        ) : claimedVendor ? (
          <>
            {/* Profile header */}
            <div className="rounded-2xl p-6 space-y-4"
              style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-brand-text">{claimedVendor.name}</h1>
                    {claimedVendor.verified && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {!claimedVendor.verified && (
                      <span className="text-xs text-brand-sub px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Verification pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brand-sub capitalize">{claimedVendor.category} · {[claimedVendor.city, claimedVendor.state].filter(Boolean).join(', ') || 'Location not set'}</p>
                  {claimedVendor.tagline && <p className="text-sm text-brand-sub italic">&ldquo;{claimedVendor.tagline}&rdquo;</p>}
                </div>
                <button
                  onClick={() => { setEditing(!editing); setDraft(claimedVendor) }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f2f2f2' }}>
                  <Edit3 className="w-3.5 h-3.5" /> {editing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {reputation && <ScoreBar rep={reputation} />}
            </div>

            {/* Edit form */}
            {editing && (
              <div className="rounded-2xl p-6 space-y-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="font-black text-brand-text">Edit your profile</h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { key: 'tagline',     label: 'Tagline',     placeholder: 'Your one-line pitch to customers',              maxLen: 120 },
                    { key: 'website',     label: 'Website',     placeholder: 'https://yourbusiness.com',                      maxLen: 500 },
                    { key: 'phone',       label: 'Phone',       placeholder: '(555) 123-4567',                                maxLen: 30  },
                    { key: 'logo_url',    label: 'Logo URL',    placeholder: 'https://yoursite.com/logo.png',                  maxLen: 500 },
                    { key: 'city',        label: 'City',        placeholder: 'Chicago',                                       maxLen: 100 },
                    { key: 'state',       label: 'State',       placeholder: 'IL',                                            maxLen: 2   },
                  ].map(({ key, label, placeholder, maxLen }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-brand-sub mb-1.5">{label}</label>
                      <input
                        type="text"
                        value={(draft[key as keyof Vendor] as string) ?? ''}
                        onChange={e => setDraft(d => ({ ...d, [key]: e.target.value.slice(0, maxLen) }))}
                        placeholder={placeholder}
                        className="w-full rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-sub/40 outline-none"
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-sub mb-1.5">
                    Bio <span className="text-brand-sub/50">— who you are, what you do, why you can be trusted</span>
                  </label>
                  <textarea
                    value={(draft.bio as string) ?? ''}
                    onChange={e => setDraft(d => ({ ...d, bio: e.target.value.slice(0, 800) }))}
                    rows={4}
                    placeholder="Tell customers about your business. What makes you honest? What do you stand behind?"
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-sub/40 outline-none resize-none"
                    style={inputStyle}
                  />
                  <p className="text-xs text-brand-sub/40 mt-1">{(draft.bio as string ?? '').length}/800</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-sub mb-1.5">
                    Official Response Statement <span className="text-brand-sub/50">— shown publicly on your profile</span>
                  </label>
                  <textarea
                    value={(draft.response_statement as string) ?? ''}
                    onChange={e => setDraft(d => ({ ...d, response_statement: e.target.value.slice(0, 1000) }))}
                    rows={4}
                    placeholder="A general statement to community members who have submitted documents related to your business. E.g., 'We take every billing concern seriously. If you believe there's been an error on your bill, please contact us directly at...'"
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-sub/40 outline-none resize-none"
                    style={inputStyle}
                  />
                  <p className="text-xs text-brand-sub/40 mt-1">{(draft.response_statement as string ?? '').length}/1000</p>
                </div>

                {error && <p className="text-xs font-semibold" style={{ color: '#ff6b60' }}>{error}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #4ade80, #16a34a)', color: '#000' }}>
                    <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setDraft(claimedVendor) }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f2f2f2' }}>
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              </div>
            )}

            {saveOk && (
              <div className="flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl"
                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
                <CheckCircle className="w-4 h-4" /> Profile saved successfully.
              </div>
            )}

            {/* Profile preview */}
            {!editing && (
              <div className="space-y-4">
                <h2 className="font-black text-brand-text">Your public profile</h2>
                <div className="rounded-2xl p-6 space-y-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {claimedVendor.bio ? (
                    <div>
                      <p className="text-xs font-bold text-brand-sub uppercase tracking-wider mb-2">About</p>
                      <p className="text-sm text-brand-sub leading-relaxed">{claimedVendor.bio}</p>
                    </div>
                  ) : (
                    <button onClick={() => setEditing(true)} className="text-sm text-brand-sub opacity-60 hover:opacity-100 underline underline-offset-2">
                      + Add a bio to tell customers who you are
                    </button>
                  )}
                  {claimedVendor.response_statement && (
                    <div>
                      <p className="text-xs font-bold text-brand-sub uppercase tracking-wider mb-2">Official Response</p>
                      <p className="text-sm text-brand-sub leading-relaxed italic">&ldquo;{claimedVendor.response_statement}&rdquo;</p>
                    </div>
                  )}
                  {claimedVendor.website && (
                    <p className="text-xs text-brand-sub">
                      <span className="opacity-50">Website: </span>
                      <a href={claimedVendor.website} target="_blank" rel="noopener noreferrer"
                        className="underline hover:text-brand-text transition-colors">
                        {claimedVendor.website}
                      </a>
                    </p>
                  )}
                </div>

                {!claimedVendor.verified && (
                  <div className="rounded-2xl p-5 flex gap-4"
                    style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#fbbf24' }} />
                    <div className="space-y-1">
                      <p className="text-sm font-black text-brand-text">Verification pending</p>
                      <p className="text-xs text-brand-sub">We review business claims within 48 hours. Once verified, your profile displays the green Verified Honest Business badge on the community page and your profile.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link href="/community"
                className="text-xs font-semibold text-brand-sub hover:text-brand-text transition-colors underline underline-offset-2">
                View community page →
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* No claimed vendor — search or create */}
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-brand-text">Find your business</h1>
              <p className="text-brand-sub text-sm">Search for your business. If it exists, claim it. If not, create it.</p>
            </div>

            {error && (
              <div className="text-sm font-semibold px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)', color: '#ff6b60' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3" style={inputStyle}>
                <Search className="w-4 h-4 flex-shrink-0 text-brand-sub" />
                <input
                  type="text"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search by business name…"
                  className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-sub/40 outline-none"
                />
              </div>
              <button type="submit" disabled={searching}
                className="px-5 py-3 rounded-xl text-sm font-black disabled:opacity-50 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.1))', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                {searching ? '…' : 'Search'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-brand-sub uppercase tracking-wider">{searchResults.length} result{searchResults.length !== 1 && 's'}</p>
                {searchResults.map(v => (
                  <div key={v.id} className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                      <p className="font-bold text-brand-text">{v.name}</p>
                      <p className="text-xs text-brand-sub capitalize">{v.category} · {[v.city, v.state].filter(Boolean).join(', ') || 'No location'}</p>
                    </div>
                    {v.claimed_by ? (
                      <span className="text-xs text-brand-sub opacity-50 flex-shrink-0">Already claimed</span>
                    ) : (
                      <button onClick={() => handleClaim(v.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black flex-shrink-0 transition-all"
                        style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
                        <ShieldCheck className="w-3.5 h-3.5" /> Claim this business
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQ && !searching && (
              <p className="text-sm text-brand-sub">No businesses found matching &ldquo;{searchQ}&rdquo;.</p>
            )}

            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-2 text-sm font-bold text-brand-sub hover:text-brand-text transition-colors">
                <Plus className="w-4 h-4" /> My business isn&apos;t listed — create it
              </button>

              {showCreate && (
                <form onSubmit={handleCreate} className="space-y-4 pt-2">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-brand-sub mb-1.5">Business Name *</label>
                      <input
                        type="text"
                        value={createName}
                        onChange={e => setCreateName(e.target.value)}
                        placeholder="Your business name"
                        required
                        className="w-full rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-sub/40 outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-brand-sub mb-1.5">Category *</label>
                      <select
                        value={createCat}
                        onChange={e => setCreateCat(e.target.value)}
                        className="w-full rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none capitalize"
                        style={inputStyle}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-brand-sub mb-1.5">State</label>
                      <input
                        type="text"
                        value={createState}
                        onChange={e => setCreateState(e.target.value.toUpperCase().slice(0,2))}
                        placeholder="IL"
                        maxLength={2}
                        className="w-full rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-sub/40 outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-brand-sub mb-1.5">City</label>
                      <input
                        type="text"
                        value={createCity}
                        onChange={e => setCreateCity(e.target.value)}
                        placeholder="Chicago"
                        className="w-full rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-sub/40 outline-none"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={creating}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black disabled:opacity-50 transition-all"
                    style={{ background: 'linear-gradient(135deg, #4ade80, #16a34a)', color: '#000' }}>
                    <Plus className="w-4 h-4" /> {creating ? 'Creating…' : 'Create & Claim'}
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
