'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Briefcase, MapPin, Star } from 'lucide-react'
import { ApplicationForm } from '@/components/ApplicationForm'
import { getAuthClient } from '@/lib/auth-client'

interface Job {
  id:              string
  title:           string
  description:     string
  category:        string
  skills_required: string[]
  pay_description: string | null
  location_type:   string
  city?:           string
  state?:          string
  status:          string
  min_reputation:  number
  max_applicants:  number
  created_at:      string
}

interface WorkerRep {
  reputation_score: number
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }             = use(params)
  const [job, setJob]      = useState<Job | null>(null)
  const [loading, setLoad] = useState(true)
  const [notFound, set404] = useState(false)
  const [authed, setAuthed]        = useState(false)
  const [workerRep, setWorkerRep]  = useState<WorkerRep | null>(null)
  const [userId, setUserId]        = useState<string | null>(null)
  const [hasApplied, setHasApplied] = useState(false)

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setJob(data.job ?? data))
      .catch(code => { if (code === 404) set404(true) })
      .finally(() => setLoad(false))
  }, [id])

  useEffect(() => {
    const supabase = getAuthClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAuthed(true)
        setUserId(data.user.id)
        fetch(`/api/workers/${data.user.id}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.reputation) setWorkerRep(d.reputation) })
          .catch(() => {})
      }
    })
  }, [])

  useEffect(() => {
    if (!userId || !id) return
    fetch(`/api/jobs/${id}/apply?worker_id=${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.applied) setHasApplied(true) })
      .catch(() => {})
  }, [userId, id])

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-12" style={{ background: '#020308' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: i === 0 ? 48 : 80, background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      </main>
    )
  }

  if (notFound || !job) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#020308' }}>
        <div className="text-center space-y-4">
          <p className="text-4xl">📭</p>
          <p className="font-bold text-brand-text">Gig not found</p>
          <Link href="/jobs" className="text-sm underline text-brand-sub">← Back to all gigs</Link>
        </div>
      </main>
    )
  }

  const isOpen   = job.status === 'open'
  const location = job.location_type === 'remote'
    ? '🌐 Remote'
    : job.city ? `📍 ${job.city}, ${job.state}` : job.location_type

  return (
    <main className="min-h-screen px-4 py-12 sm:px-6" style={{ background: '#020308' }}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back */}
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-brand-sub hover:text-brand-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All gigs
        </Link>

        {/* Header card */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize mb-2"
                style={{ background: 'rgba(0,229,255,0.1)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.2)' }}
              >
                {job.category}
              </span>
              <h1 className="text-2xl font-black text-brand-text">{job.title}</h1>
            </div>
            <span
              className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
              style={isOpen
                ? { background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(240,244,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {job.status}
            </span>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-brand-sub">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {location}
            </span>
            {job.pay_description && (
              <span className="font-semibold" style={{ color: '#4ade80' }}>{job.pay_description}</span>
            )}
            {job.min_reputation > 0 && (
              <span className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
                <span style={{ color: '#fbbf24' }}>Rep {job.min_reputation}+ required</span>
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h2 className="text-sm font-bold text-brand-text mb-3">About this gig</h2>
          <p className="text-sm text-brand-sub leading-relaxed whitespace-pre-wrap">{job.description}</p>
        </div>

        {/* Skills */}
        {job.skills_required.length > 0 && (
          <div
            className="rounded-2xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-sm font-bold text-brand-text mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Skills needed
            </h2>
            <div className="flex flex-wrap gap-2">
              {job.skills_required.map(skill => (
                <span
                  key={skill}
                  className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Apply section */}
        {isOpen && (
          <div
            className="rounded-2xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-sm font-bold text-brand-text mb-4">Apply for this gig</h2>
            <ApplicationForm
              jobId={id}
              minReputation={job.min_reputation}
              workerScore={workerRep?.reputation_score}
              isAuthenticated={authed}
              hasApplied={hasApplied}
            />
          </div>
        )}
      </div>
    </main>
  )
}
