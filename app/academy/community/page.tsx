'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Users, ThumbsUp, Filter, MessageCircle, HelpCircle, Trophy, Lightbulb, Plus, Send, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Post {
  id: string
  course_id: string
  post_type: 'question' | 'win' | 'tip'
  author_name: string
  body: string
  upvotes: number
  reply_count: number
  created_at: string
}

interface Reply {
  id: string
  post_id: string
  author_name: string
  body: string
  created_at: string
}

const COURSES = [
  { value: 'all', label: 'All Courses' },
  { value: 'general', label: 'General' },
  { value: 'academy-estimate-mastery', label: 'Estimate Mastery' },
  { value: 'academy-check-engine', label: 'Check Engine Light' },
  { value: 'academy-noise-diagnosis', label: 'Noise Diagnosis' },
  { value: 'academy-fight-back', label: 'Fight Back' },
]

const TYPE_STYLE = {
  question: { icon: HelpCircle, color: '#00E5FF', label: 'Question' },
  win:      { icon: Trophy,     color: '#30d158', label: 'Win' },
  tip:      { icon: Lightbulb,  color: '#ffd60a', label: 'Tip' },
} as const

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

function courseLabel(id: string) {
  return COURSES.find(c => c.value === id)?.label ?? id
}

function Composer({ onPosted }: { onPosted: () => void }) {
  const [open, setOpen] = useState(false)
  const [courseId, setCourseId] = useState('general')
  const [postType, setPostType] = useState<'question' | 'win' | 'tip'>('question')
  const [authorName, setAuthorName] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!body.trim()) { setError('Write something first.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/academy-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId, post_type: postType, author_name: authorName, body }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setLoading(false); return }
      setBody('')
      setAuthorName('')
      setOpen(false)
      setLoading(false)
      onPosted()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, rgba(255,214,10,0.15), rgba(255,214,10,0.05))',
          border: '1px solid rgba(255,214,10,0.3)',
          color: '#ffd60a',
        }}>
        <Plus className="w-4 h-4" /> Ask a question, share a win, or drop a tip
      </button>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['question', 'win', 'tip'] as const).map(t => {
          const style = TYPE_STYLE[t]
          const Icon = style.icon
          return (
            <button key={t} onClick={() => setPostType(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
              style={postType === t
                ? { background: `${style.color}18`, borderColor: `${style.color}50`, color: style.color }
                : { background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(242,242,242,0.5)' }}>
              <Icon className="w-3.5 h-3.5" /> {style.label}
            </button>
          )
        })}
      </div>

      <select value={courseId} onChange={e => setCourseId(e.target.value)}
        className="w-full bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text">
        {COURSES.filter(c => c.value !== 'all').map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="What's on your mind? Be specific — the more detail, the better the answers."
        rows={4}
        maxLength={2000}
        className="w-full bg-brand-muted border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-sub/40 resize-none"
      />

      <input
        value={authorName}
        onChange={e => setAuthorName(e.target.value)}
        placeholder="Your name (optional — defaults to Anonymous)"
        maxLength={60}
        className="w-full bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-sub/40"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={() => setOpen(false)} disabled={loading}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-brand-sub hover:text-brand-text transition-colors">
          Cancel
        </button>
        <button onClick={submit} disabled={loading}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #ffe066, #ffd60a)', color: '#0a0a0a' }}>
          {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Posting…</> : <><Send className="w-3.5 h-3.5" /> Post</>}
        </button>
      </div>
    </div>
  )
}

function ReplyThread({ postId }: { postId: string }) {
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [replyBody, setReplyBody] = useState('')
  const [replyName, setReplyName] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/academy-posts/${postId}/replies`)
      const data = await res.json()
      if (Array.isArray(data)) setReplies(data)
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => { load() }, [load])

  const submitReply = async () => {
    if (!replyBody.trim()) return
    setSending(true)
    try {
      await fetch(`/api/academy-posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_name: replyName, body: replyBody }),
      })
      setReplyBody('')
      setReplyName('')
      await load()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-brand-border/20 space-y-3">
      {loading ? (
        <div className="flex justify-center py-3">
          <div className="w-4 h-4 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
        </div>
      ) : replies.length === 0 ? (
        <p className="text-xs text-brand-sub/50">No replies yet — be the first to help.</p>
      ) : (
        <div className="space-y-2.5 pl-4 border-l border-brand-border/30">
          {replies.map(r => (
            <div key={r.id}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-brand-text">{r.author_name}</span>
                <span className="text-[11px] text-brand-sub/50">{timeAgo(r.created_at)}</span>
              </div>
              <p className="text-sm text-brand-sub leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={replyName}
          onChange={e => setReplyName(e.target.value)}
          placeholder="Name"
          maxLength={60}
          className="w-28 shrink-0 bg-brand-muted border border-brand-border rounded-lg px-2.5 py-2 text-xs text-brand-text placeholder:text-brand-sub/40"
        />
        <input
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitReply() }}
          placeholder="Write a reply…"
          maxLength={1000}
          className="flex-1 bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text placeholder:text-brand-sub/40"
        />
        <button onClick={submitReply} disabled={sending || !replyBody.trim()}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg disabled:opacity-40"
          style={{ background: 'rgba(255,214,10,0.12)', border: '1px solid rgba(255,214,10,0.25)', color: '#ffd60a' }}>
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

function AcademyCommunityInner() {
  const params = useSearchParams()
  const initialCourse = params?.get('course')
  const [posts, setPosts] = useState<Post[]>([])
  const [courseFilter, setCourseFilter] = useState(
    initialCourse && COURSES.some(c => c.value === initialCourse) ? initialCourse : 'all'
  )
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '30' })
      if (courseFilter !== 'all') params.set('course_id', courseFilter)
      if (typeFilter !== 'all') params.set('post_type', typeFilter)
      const res = await fetch(`/api/academy-posts?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setPosts(data)
    } finally {
      setLoading(false)
    }
  }, [courseFilter, typeFilter])

  useEffect(() => { load() }, [load])

  const handleUpvote = async (id: string) => {
    if (upvoted.has(id)) return
    setUpvoted(prev => new Set([...prev, id]))
    setPosts(prev => prev.map(p => p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p))
    await fetch(`/api/academy-posts?id=${id}`, { method: 'PATCH' }).catch(() => {})
  }

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const questionCount = posts.filter(p => p.post_type === 'question').length
  const winCount = posts.filter(p => p.post_type === 'win').length

  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(255,214,10,0.07) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: '#ffd60a' }} />
            <h1 className="text-3xl font-black text-brand-text">Academy Community</h1>
          </div>
          <p className="text-brand-sub">
            Ask questions, share wins, trade tips — with people working through the same courses.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-bold" style={{ color: '#00E5FF' }}>{questionCount} open questions</span>
            <span className="text-brand-sub">·</span>
            <span className="font-bold" style={{ color: '#30d158' }}>{winCount} wins shared</span>
          </div>
          <Link href="/academy" className="inline-block text-xs text-brand-sub hover:text-brand-text transition-colors underline underline-offset-2">
            &larr; Back to the Academy
          </Link>
        </div>

        <Composer onPosted={load} />

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1 text-xs text-brand-sub mr-1">
              <Filter className="w-3.5 h-3.5" /> Type:
            </div>
            {(['all', 'question', 'win', 'tip'] as const).map(t => (
              <button key={t}
                onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                style={typeFilter === t
                  ? { background: 'rgba(255,214,10,0.15)', borderColor: 'rgba(255,214,10,0.4)', color: '#ffd60a' }
                  : { background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(242,242,242,0.5)' }}>
                {t === 'all' ? 'All Posts' : TYPE_STYLE[t].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {COURSES.map(c => (
              <button key={c.value}
                onClick={() => setCourseFilter(c.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  courseFilter === c.value
                    ? 'bg-brand-surface border-brand-border text-brand-text'
                    : 'bg-brand-muted border-brand-border/50 text-brand-sub hover:text-brand-text'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <MessageCircle className="w-12 h-12 text-brand-sub/30 mx-auto" />
            <p className="text-brand-sub">No posts yet in this view.</p>
            <p className="text-xs text-brand-sub/60">Be the first to ask a question or share a win.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => {
              const style = TYPE_STYLE[post.post_type]
              const Icon = style.icon
              const isExpanded = expanded.has(post.id)
              return (
                <div key={post.id} className="glass-card rounded-2xl p-5 space-y-3"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black rounded-full px-2.5 py-0.5 flex items-center gap-1"
                          style={{ color: style.color, background: `${style.color}15`, border: `1px solid ${style.color}30` }}>
                          <Icon className="w-3 h-3" /> {style.label}
                        </span>
                        <span className="font-bold text-brand-text text-sm">{post.author_name}</span>
                        <span className="text-[11px] text-brand-sub/50">in {courseLabel(post.course_id)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-brand-sub/60 shrink-0">{timeAgo(post.created_at)}</span>
                  </div>

                  <p className="text-sm text-brand-text/85 leading-relaxed whitespace-pre-wrap">{post.body}</p>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => toggleExpanded(post.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-brand-sub hover:text-brand-text transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {post.reply_count > 0 ? `${post.reply_count} ${post.reply_count === 1 ? 'reply' : 'replies'}` : 'Reply'}
                    </button>
                    <button
                      onClick={() => handleUpvote(post.id)}
                      disabled={upvoted.has(post.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      style={{ color: upvoted.has(post.id) ? '#ffd60a' : 'rgba(242,242,242,0.5)' }}>
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {post.upvotes > 0 && post.upvotes} Helpful
                    </button>
                  </div>

                  {isExpanded && <ReplyThread postId={post.id} />}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}

export default function AcademyCommunityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
      </div>
    }>
      <AcademyCommunityInner />
    </Suspense>
  )
}
