import Link from 'next/link'
import { ShieldCheck, Star, MessageSquare, TrendingUp, CheckCircle, Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'For Businesses — Own Your Reputation on ScrewedScore',
  description: 'Claim your business profile, respond to community reviews, and earn the Verified Honest Business badge. Build trust with customers before they even walk in the door.',
}

const BENEFITS = [
  {
    icon: ShieldCheck,
    color: '#4ade80',
    title: 'Verified Honest Business badge',
    body: 'A green checkmark on your profile and community feed listing that tells customers you stand behind your work.',
  },
  {
    icon: MessageSquare,
    color: '#00e5ff',
    title: 'Respond to community reviews',
    body: 'Leave a public response to any community experience posted about your business. Your side of the story, permanently on the record.',
  },
  {
    icon: TrendingUp,
    color: '#ff3b30',
    title: 'See your reputation score',
    body: 'Track your ScrewedScore over time — total analyses, screwed vs. safe ratings, and flagged dollar amounts. Know what customers are seeing.',
  },
  {
    icon: Star,
    color: '#fbbf24',
    title: 'Build a trust profile',
    body: 'Add your bio, tagline, and business description. Customers who find you through ScrewedScore see a full, professional profile.',
  },
]

const STEPS = [
  { n: '1', title: 'Create your account', body: 'Sign up with your business email. No credit card required.' },
  { n: '2', title: 'Find or create your listing', body: 'Search for your business name. If it exists, claim it. If not, create it in 30 seconds.' },
  { n: '3', title: 'Complete your profile', body: 'Add your bio, tagline, and contact info. Write an official response statement.' },
  { n: '4', title: 'Get verified', body: 'We review your claim and issue your Verified Honest Business badge — typically within 48 hours.' },
]

export default function ForBusinessesPage() {
  return (
    <div className="min-h-screen bg-brand-bg">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-brand-border bg-brand-bg/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="font-black text-base tracking-tight flex items-center gap-0">
            <span className="text-brand-text">Get</span>
            <span style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Screwed</span>
            <span className="text-brand-text">Score</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth?role=business" className="text-xs font-semibold text-brand-sub hover:text-brand-text transition-colors">
              Sign in
            </Link>
            <Link href="/auth?role=business&mode=signup"
              className="text-xs font-black px-4 py-2 rounded-xl transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.1))', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
              Claim your profile →
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-5 py-16 space-y-20">

        {/* Hero */}
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
            <ShieldCheck className="w-3.5 h-3.5" /> For Honest Businesses
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-brand-text leading-tight">
            Own your reputation.<br />
            <span style={{ color: '#4ade80' }}>Prove you&apos;re one of the good ones.</span>
          </h1>
          <p className="text-base text-brand-sub leading-relaxed">
            ScrewedScore is built to expose overcharging businesses — but we also want to make it easy for honest businesses to stand out. Claim your profile, respond to reviews, and earn a badge that tells customers you can be trusted.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/auth?role=business&mode=signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-black transition-all"
              style={{ background: 'linear-gradient(135deg, #4ade80, #16a34a)', color: '#000' }}>
              <ShieldCheck className="w-5 h-5" /> Claim Your Profile — Free
            </Link>
          </div>
          <p className="text-xs text-brand-sub opacity-60">No credit card. No subscription. Always free for basic profiles.</p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: '12,000+', label: 'documents analyzed' },
            { value: '4 of 5',  label: 'businesses rate SAFE or MAYBE' },
            { value: '48hrs',   label: 'average time to verified badge' },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-2xl p-5 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-2xl font-black text-brand-text">{value}</p>
              <p className="text-xs text-brand-sub mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-brand-text text-center">What you get</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS.map(({ icon: Icon, color, title, body }) => (
              <div key={title} className="rounded-2xl p-6 space-y-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="font-black text-brand-text">{title}</h3>
                <p className="text-sm text-brand-sub leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-brand-text text-center">How it works</h2>
          <div className="space-y-4">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="flex gap-5 rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                  style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                  {n}
                </div>
                <div>
                  <p className="font-black text-brand-text">{title}</p>
                  <p className="text-sm text-brand-sub mt-1">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust signal */}
        <div className="rounded-2xl p-8 space-y-4"
          style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)' }}>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5" style={{ color: '#4ade80' }} />
            <h2 className="text-lg font-black text-brand-text">Why honest businesses join</h2>
          </div>
          <p className="text-sm text-brand-sub leading-relaxed">
            When someone is about to pay a large bill, they often search for the business online to verify they&apos;re not getting overcharged. If your business appears on ScrewedScore with a SAFE rating, a verified badge, and a professional profile — that&apos;s a conversion. If you&apos;re not here and your competitor is, that&apos;s a lost customer.
          </p>
          <p className="text-sm text-brand-sub leading-relaxed">
            You can&apos;t remove community reviews — but you can respond to them, correct misinformation, and demonstrate that you take customer concerns seriously. That&apos;s more powerful than a review platform where businesses can pay to suppress negative feedback.
          </p>
        </div>

        {/* FAQ */}
        <div className="space-y-5">
          <h2 className="text-2xl font-black text-brand-text">Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Is this free?', a: 'Yes. Claiming your profile, adding bio/contact info, and responding to reviews is free. Always.' },
              { q: 'Can I remove negative reviews?', a: 'No. Community reviews are permanent. You can respond to them publicly, correct factual errors through our dispute process, and tell your side of the story.' },
              { q: 'What does "verified" mean?', a: 'Verified means we\'ve confirmed you are the actual business owner or an authorized representative. It does not mean your ScrewedScore is good — it means your profile is authentic.' },
              { q: 'What if my business has no reviews yet?', a: 'Great. Get verified now so that when your business does appear, your profile is already complete and professional. A verified badge with a good bio looks far better than an empty unclaimed listing.' },
              { q: 'How do I dispute an inaccurate review?', a: 'Once you\'ve claimed your profile, you can flag specific reviews for factual inaccuracy. We review flagged content and can add a note if something is demonstrably false. We do not remove reviews on request.' },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-2xl p-5 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-sm font-black text-brand-text">{q}</p>
                <p className="text-sm text-brand-sub leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="rounded-2xl p-12 text-center space-y-5"
          style={{ background: '#0d0f18', border: '1px solid rgba(255,255,255,0.08)' }}>
          <CheckCircle className="w-12 h-12 mx-auto" style={{ color: '#4ade80' }} />
          <h2 className="text-3xl font-black text-brand-text">Ready to get verified?</h2>
          <p className="text-sm text-brand-sub max-w-sm mx-auto">Create your account, claim your listing, and get the Verified Honest Business badge — free.</p>
          <Link href="/auth?role=business&mode=signup"
            className="inline-block px-10 py-4 rounded-xl font-black text-base transition-all"
            style={{ background: 'linear-gradient(135deg, #4ade80, #16a34a)', color: '#000' }}>
            Claim My Profile →
          </Link>
        </div>

      </main>
    </div>
  )
}
