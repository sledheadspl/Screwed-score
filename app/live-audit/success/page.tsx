import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { LIVE_AUDIT_AUDITOR } from '@/lib/live-audit'

export const metadata: Metadata = {
  title: 'Live audit booked | ScrewedScore',
  robots: { index: false, follow: false },
}

export default function LiveAuditSuccessPage() {
  return (
    <main className="min-h-screen bg-brand-bg flex items-center justify-center px-5 py-28">
      <div className="max-w-md w-full text-center space-y-6">
        <CheckCircle className="w-16 h-16 mx-auto text-green-400" />
        <h1 className="text-3xl font-black text-brand-text">You&apos;re booked.</h1>
        <p className="text-brand-sub leading-relaxed">
          {LIVE_AUDIT_AUDITOR} will call or email you <strong className="text-brand-text">within 24 hours</strong> to
          set a time. A confirmation is on its way to your inbox.
        </p>
        <div className="rounded-2xl p-5 text-left space-y-2 border border-brand-border bg-brand-surface">
          <p className="text-xs font-bold uppercase tracking-widest text-green-400">Before we meet</p>
          <p className="text-sm text-brand-sub leading-relaxed">
            Gather what you want reviewed: recent bills, bank and credit card statements, insurance or medical
            paperwork, subscriptions, contracts or repair estimates. Paper or screenshots are fine.
          </p>
        </div>
        <Link href="/" className="inline-block text-sm text-brand-sub underline underline-offset-4 hover:text-brand-text">
          Back to ScrewedScore
        </Link>
      </div>
    </main>
  )
}
