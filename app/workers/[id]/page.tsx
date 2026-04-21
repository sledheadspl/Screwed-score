'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, CheckCircle, AlertTriangle } from 'lucide-react'
import { ReputationBadge } from '@/components/ReputationBadge'

interface WorkerProfile {
  display_name: string
  bio?:         string
  skills:       string[]
  city?:        string
  state?:       string
  website?:     string
  is_verified:  boolean
  is_banned:    boolean
  ban_reason?:  string
  availability: string
  created_at:   string
}

interface WorkerReputation {
  reputation_score: number
  jobs_completed:   number
  jobs_abandoned:   number
  avg_rating:       number
  disputes_filed:   number
  disputes_lost:    number
}

interface JobHistory {
  id:          string
  title:       string
  rating?:     number
  rating_note?: string
  completed_at?: string
  was_on_time?: boolean
}

interface WorkerData {
  id:         string
  profile:    WorkerProfile
  reputation: WorkerReputation
  history?:   JobHistory[]
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className="w-3 h-3"
          fill={i <= rating ? '#fbbf24' : 'none'}
          style={{ color: i <= rating ? '#fbbf24' : 'rgba(240,244,255,0.2)' }}
        />
      ))}
    </span>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default function WorkerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id }                 = use(params)
  const [data,    setData]     = useState<WorkerData | null>(null)
  const [loading, setLoading]  = useState(true)
  const [notFound, set404]     = useState(false)

  useEffect(() => {
    fetch(`/api/workers/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(code => { if (code === 404) set404(true) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-12" style={{ background: '#020308' }}>
        <div className="max-w-xl mx-auto space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 96, background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      </main>
    )
  }

  if (notFound || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#020308' }}>
        <div className="text-center space-y-4">
          <p className="text-4xl">👻</p>
          <p className="font-bold text-brand-text">Worker not found</p>
          <Link href="/jobs" className="text-sm underline text-brand-sub">← Back to gigs</Link>
        </div>
      </main>
    )
  }

  const { profile, reputation, history } = data
  const initials = profile.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const memberSince = profile.created_at ? timeAgo(profile.created_at) : ''

  return (
    <main className="min-h-screen px-4 py-12 sm:px-6" style={{ background: '#020308' }}>
      <div className="max-w-xl mx-auto space-y-5">

        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-brand-sub hover:text-brand-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to gigs
        </Link>

        {/* Banned warning */}
        {profile.is_banned && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(255,59,48,0.07)', border: '1px solid rgba(255,59,48,0.2)' }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ff3b30' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: '#ff3b30' }}>Wall of Shame</p>
              <p className="text-xs text-brand-sub mt-0.5">{profile.ban_reason ?? 'This worker has been banned for misconduct.'}</p>
            </div>
          </div>
        )}

        {/* Profile card */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Avatar + name */}
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-lg font-black"
              style={{ background: 'rgba(0,229,255,0.12)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.2)' }}
            >
              {initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-brand-text">{profile.display_name}</h1>
                {profile.is_verified && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,229,255,0.1)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.2)' }}>
                    <CheckCircle className="w-2.5 h-2.5" />
                    Verified
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-brand-sub">
                {profile.city && profile.state && <span>📍 {profile.city}, {profile.state}</span>}
                {memberSince && <span>Member {memberSince}</span>}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-text transition-colors">
                    Website ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Reputation bar */}
          <ReputationBadge score={reputation.reputation_score} isBanned={profile.is_banned} size="lg" />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Jobs Done',  value: reputation.jobs_completed },
              { label: 'Avg Rating', value: reputation.avg_rating > 0 ? `${reputation.avg_rating.toFixed(1)} ★` : '—' },
              { label: 'Abandoned',  value: reputation.jobs_abandoned },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-base font-black text-brand-text">{value}</p>
                <p className="text-[10px] text-brand-sub mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div>
              <p className="text-xs font-semibold text-brand-sub mb-1.5">About</p>
              <p className="text-sm text-brand-sub leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Skills */}
          {profile.skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-brand-sub mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map(skill => (
                  <span
                    key={skill}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(240,244,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Job history */}
        {history && history.length > 0 && (
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-sm font-bold text-brand-text">Job History</h2>
            <div className="space-y-3">
              {history.map(job => (
                <div
                  key={job.id}
                  className="flex items-start justify-between gap-3 py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-text truncate">{job.title}</p>
                    {job.rating_note && (
                      <p className="text-xs text-brand-sub mt-0.5 line-clamp-1">"{job.rating_note}"</p>
                    )}
                    {job.completed_at && (
                      <p className="text-[10px] text-brand-sub/50 mt-0.5">{timeAgo(job.completed_at)}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    {job.rating && <StarRating rating={job.rating} />}
                    {job.was_on_time === false && (
                      <span className="text-[9px] font-bold" style={{ color: '#f59e0b' }}>Late</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
