import Link from 'next/link'
import { ReputationBadge } from './ReputationBadge'

interface WorkerProfile {
  display_name: string
  skills:       string[]
  city?:        string
  state?:       string
  is_verified:  boolean
  is_banned:    boolean
  availability: string
}

interface WorkerReputation {
  reputation_score: number
  jobs_completed:   number
  avg_rating:       number
}

interface Props {
  id:          string
  profile:     WorkerProfile
  reputation?: WorkerReputation
}

const AVAILABILITY_LABEL: Record<string, string> = {
  available: 'Available',
  busy:      'Busy',
  paused:    'Paused',
}

const AVAILABILITY_COLOR: Record<string, string> = {
  available: '#22c55e',
  busy:      '#f59e0b',
  paused:    'rgba(240,244,255,0.35)',
}

export function WorkerCard({ id, profile, reputation }: Props) {
  const initials    = profile.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const avail       = profile.availability ?? 'available'
  const availColor  = AVAILABILITY_COLOR[avail] ?? AVAILABILITY_COLOR.paused
  const availLabel  = AVAILABILITY_LABEL[avail] ?? avail
  const score       = reputation?.reputation_score ?? 50
  const completed   = reputation?.jobs_completed   ?? 0
  const avgRating   = reputation?.avg_rating        ?? 0

  return (
    <Link href={`/workers/${id}`} className="block group">
      <div
        className="rounded-2xl p-5 transition-all duration-200 group-hover:scale-[1.01]"
        style={{
          background:   'rgba(255,255,255,0.03)',
          border:       '1px solid rgba(255,255,255,0.07)',
          boxShadow:    '0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          {/* Avatar */}
          <div
            className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-black"
            style={{ background: 'rgba(0,229,255,0.12)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.2)' }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-brand-text truncate">{profile.display_name}</span>
              {profile.is_verified && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,229,255,0.12)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.2)' }}>
                  ✓ Verified
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-brand-sub">
              <span style={{ color: availColor }}>● {availLabel}</span>
              {profile.city && profile.state && (
                <>
                  <span className="opacity-30">·</span>
                  <span>{profile.city}, {profile.state}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reputation */}
        <div className="mb-4">
          <ReputationBadge score={score} isBanned={profile.is_banned} size="sm" />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4 text-xs text-brand-sub">
          <span><span className="text-brand-text font-bold">{completed}</span> jobs done</span>
          {avgRating > 0 && (
            <span><span className="text-brand-text font-bold">{avgRating.toFixed(1)}</span> ★ avg</span>
          )}
        </div>

        {/* Skills */}
        {profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.slice(0, 4).map(skill => (
              <span
                key={skill}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(240,244,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {skill}
              </span>
            ))}
            {profile.skills.length > 4 && (
              <span className="text-[10px] text-brand-sub/60 self-center">+{profile.skills.length - 4} more</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
