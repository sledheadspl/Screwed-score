import Link from 'next/link'

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

interface Props {
  job:            Job
  applicantCount?: number
}

const CATEGORY_COLORS: Record<string, string> = {
  writing:  'rgba(0,229,255,0.15)',
  design:   'rgba(139,92,246,0.15)',
  outreach: 'rgba(34,197,94,0.15)',
  research: 'rgba(251,191,36,0.15)',
  dev:      'rgba(249,115,22,0.15)',
  video:    'rgba(236,72,153,0.15)',
  admin:    'rgba(148,163,184,0.15)',
  other:    'rgba(255,255,255,0.07)',
}

const CATEGORY_TEXT: Record<string, string> = {
  writing:  '#00e5ff',
  design:   '#a78bfa',
  outreach: '#4ade80',
  research: '#fbbf24',
  dev:      '#fb923c',
  video:    '#f472b6',
  admin:    '#94a3b8',
  other:    'rgba(240,244,255,0.5)',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function JobCard({ job, applicantCount }: Props) {
  const catBg   = CATEGORY_COLORS[job.category] ?? CATEGORY_COLORS.other
  const catText = CATEGORY_TEXT[job.category]   ?? CATEGORY_TEXT.other
  const isFilled = job.status !== 'open'

  return (
    <Link href={`/jobs/${job.id}`} className="block group">
      <div
        className="rounded-2xl p-5 transition-all duration-200 group-hover:scale-[1.01]"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border:     '1px solid rgba(255,255,255,0.07)',
          boxShadow:  '0 2px 12px rgba(0,0,0,0.3)',
          opacity:    isFilled ? 0.6 : 1,
        }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-brand-text leading-snug group-hover:text-cyan-400 transition-colors">
              {job.title}
            </h3>
          </div>
          <span
            className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
            style={{ background: catBg, color: catText, border: `1px solid ${catText}30` }}
          >
            {job.category}
          </span>
        </div>

        {/* Description snippet */}
        <p className="text-xs text-brand-sub leading-relaxed mb-3 line-clamp-2">
          {job.description}
        </p>

        {/* Skills */}
        {job.skills_required.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.skills_required.slice(0, 4).map(skill => (
              <span
                key={skill}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(240,244,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between gap-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3 text-xs text-brand-sub">
            {job.pay_description && (
              <span className="font-semibold" style={{ color: '#4ade80' }}>{job.pay_description}</span>
            )}
            <span style={{ color: 'rgba(240,244,255,0.35)' }}>
              {job.location_type === 'remote' ? '🌐 Remote' : job.location_type === 'local' && job.city ? `📍 ${job.city}, ${job.state}` : job.location_type}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-brand-sub">
            {job.min_reputation > 0 && (
              <span style={{ color: 'rgba(251,191,36,0.8)' }}>Rep {job.min_reputation}+</span>
            )}
            {applicantCount !== undefined && (
              <span>{applicantCount} applied</span>
            )}
            <span style={{ color: 'rgba(240,244,255,0.3)' }}>{timeAgo(job.created_at)}</span>
          </div>
        </div>

        {isFilled && (
          <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(240,244,255,0.3)' }}>
            {job.status === 'filled' ? 'Filled' : job.status === 'closed' ? 'Closed' : 'Cancelled'}
          </div>
        )}
      </div>
    </Link>
  )
}
