'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Users, CheckCircle } from 'lucide-react'
import { JobCard } from '@/components/JobCard'

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
  created_at:      string
}

const CATEGORIES = ['all', 'writing', 'design', 'outreach', 'research', 'dev', 'video', 'admin', 'other']
const LOCATION_TYPES = [
  { value: 'all',    label: 'All' },
  { value: 'remote', label: 'Remote' },
  { value: 'local',  label: 'Local' },
]

export default function JobsPage() {
  const [jobs,     setJobs]     = useState<Job[]>([])
  const [loading,  setLoading]  = useState(true)
  const [category, setCat]      = useState('all')
  const [locType,  setLocType]  = useState('all')
  const [stats,    setStats]    = useState({ open: 0, filled: 0, categories: 0 })

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category !== 'all')  params.set('category', category)
    if (locType  !== 'all')  params.set('location_type', locType)
    fetch(`/api/jobs?${params}`)
      .then(r => r.json())
      .then(data => {
        const list: Job[] = Array.isArray(data) ? data : []
        setJobs(list)
        const open  = list.filter(j => j.status === 'open').length
        const cats  = new Set(list.map(j => j.category)).size
        setStats({ open, filled: list.length - open, categories: cats })
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [category, locType])

  return (
    <main className="min-h-screen px-4 py-12 sm:px-6" style={{ background: '#020308' }}>
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6" style={{ color: '#00e5ff' }} />
            <h1 className="text-3xl font-black text-brand-text tracking-tight">Available Gigs</h1>
          </div>
          <p className="text-brand-sub text-sm max-w-lg">
            Curated work opportunities for community members. Build your reputation with every completed job.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="w-4 h-4" style={{ color: '#00e5ff' }} />
              <span className="font-bold text-brand-text">{stats.open}</span>
              <span className="text-brand-sub">open gigs</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" style={{ color: '#4ade80' }} />
              <span className="font-bold text-brand-text">{stats.filled}</span>
              <span className="text-brand-sub">filled</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" style={{ color: '#a78bfa' }} />
              <span className="font-bold text-brand-text">{stats.categories}</span>
              <span className="text-brand-sub">categories</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCat(cat)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-all"
                style={category === cat
                  ? { background: 'rgba(0,229,255,0.15)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(240,244,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }
                }
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          {/* Location toggle */}
          <div className="flex items-center gap-2">
            {LOCATION_TYPES.map(lt => (
              <button
                key={lt.value}
                onClick={() => setLocType(lt.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                style={locType === lt.value
                  ? { background: 'rgba(255,255,255,0.1)', color: 'rgba(240,244,255,0.9)', border: '1px solid rgba(255,255,255,0.15)' }
                  : { background: 'transparent', color: 'rgba(240,244,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }
                }
              >
                {lt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Job list */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl h-36 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-4xl">🔍</p>
            <p className="font-bold text-brand-text">No open gigs right now</p>
            <p className="text-sm text-brand-sub">Check back soon — new opportunities post regularly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
