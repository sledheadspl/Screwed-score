'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Zap, Menu, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const NAV_LINKS = [
  { label: 'Screwed Score',  href: '/',            exact: true, accent: 'red'  },
  { label: 'Wall of Shame',  href: '/shame',        exact: false, accent: 'red'  },
  { label: 'Community',      href: '/community',    exact: false, accent: 'red'  },
  { label: 'Jobs',           href: '/jobs',         exact: false, accent: 'cyan' },
  { label: 'DPS',            href: '/dps',          exact: false, accent: 'cyan' },
  { label: 'Productivity',   href: '/productivity', exact: false, accent: 'cyan' },
  { label: 'Elite Suite',    href: '/elite-suite',  exact: false, accent: 'gold' },
] as const

type Accent = 'red' | 'cyan' | 'gold'

const ACCENTS: Record<Accent, { active: string; hover: string; dot: string; glow: string }> = {
  red:  { active: 'text-brand-text',  hover: 'hover:text-brand-text hover:bg-brand-muted/50',      dot: 'bg-red-500',    glow: '' },
  cyan: { active: 'text-cyan-400',    hover: 'hover:text-cyan-400 hover:bg-cyan-500/5',            dot: 'bg-cyan-400',   glow: '0 0 20px rgba(0,229,255,0.55)' },
  gold: { active: 'text-yellow-300',  hover: 'hover:text-yellow-300 hover:bg-yellow-400/5',        dot: 'bg-yellow-300', glow: '0 0 20px rgba(255,214,0,0.5)' },
}

const GoogleIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export default function Navbar() {
  const pathname = usePathname()
  const [isPro, setIsPro]         = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [menuOpen, setMenuOpen]   = useState(false)

  useEffect(() => {
    const checkPro = () => setIsPro(
      typeof document !== 'undefined' &&
      document.cookie.split(';').some(c => c.trim().split('=')[0] === 'gss_pro')
    )
    checkPro()
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null)
      checkPro()
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
  }

  const isActive = (href: string, exact: boolean) =>
    !pathname ? false : exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className="sticky top-0 z-50 border-b border-brand-border/60 bg-brand-bg/80 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-0 select-none shrink-0">
          <span className="text-lg font-black text-brand-text tracking-tight">Get</span>
          <span className="text-lg font-black tracking-tight" style={{
            background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Screwed</span>
          <span className="text-lg font-black text-brand-text tracking-tight">Score</span>
        </Link>

        {/* Desktop tabs */}
        <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
          {NAV_LINKS.map(({ label, href, exact, accent }) => {
            const active = isActive(href, exact)
            const a = ACCENTS[accent]
            return (
              <Link
                key={href}
                href={href}
                className={`relative text-sm px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                  active ? a.active : `text-brand-sub ${a.hover}`
                }`}
                style={active && a.glow ? { textShadow: a.glow } : undefined}
              >
                {label}
                {active && (
                  <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${a.dot}`} />
                )}
              </Link>
            )
          })}
        </div>

        {/* Desktop right side */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          {isPro && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 border border-red-500/30 rounded-full px-2.5 py-1 uppercase tracking-wider">
              <Zap className="w-3 h-3" /> Pro
            </span>
          )}
          {userEmail ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-400 font-semibold">✓ {userEmail.split('@')[0]}</span>
              <button
                onClick={() => supabase.auth.signOut().then(() => setUserEmail(null))}
                className="text-xs text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors">
                Sign out
              </button>
            </div>
          ) : (
            <button onClick={handleGoogleLogin}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors">
              <GoogleIcon /> Sign in
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden text-brand-sub hover:text-brand-text p-2 rounded-lg hover:bg-brand-muted transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-brand-border/40 bg-brand-bg/95 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-5 py-4 space-y-1">
            {NAV_LINKS.map(({ label, href, exact, accent }) => {
              const active = isActive(href, exact)
              const a = ACCENTS[accent]
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? `bg-brand-muted ${a.active}` : `text-brand-sub ${a.hover}`
                  }`}
                >
                  {label}
                </Link>
              )
            })}
            <div className="pt-3 border-t border-brand-border/30">
              {userEmail ? (
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs text-green-400">✓ {userEmail.split('@')[0]}</span>
                  <button
                    onClick={() => { supabase.auth.signOut().then(() => setUserEmail(null)); setMenuOpen(false) }}
                    className="text-xs text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors">
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { handleGoogleLogin(); setMenuOpen(false) }}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-brand-sub border border-brand-border rounded-lg px-3 py-2.5 hover:bg-brand-muted transition-colors">
                  <GoogleIcon /> Sign in with Google
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
