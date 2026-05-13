import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Audit confirmed — ScrewedScore Business Audit',
  robots: { index: false, follow: false },
}

export default function BusinessAuditSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#020308' }}>
      <div className="max-w-md w-full text-center space-y-6">
        <CheckCircle className="w-16 h-16 mx-auto" style={{ color: '#4ade80' }} />
        <h1 className="text-3xl font-black text-brand-text">Payment received.</h1>
        <p className="text-brand-sub text-sm leading-relaxed">
          Your business bill audit is in the queue. We&apos;ll review your bills against industry benchmarks
          and send a full PDF report — overcharges, dollar leak, and renegotiation scripts — within
          <strong className="text-brand-text"> 48 hours</strong> to the email you used at checkout.
        </p>
        <div
          className="rounded-2xl p-5 text-left space-y-3"
          style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: '#4ade80' }}
          >
            What happens next
          </p>
          {[
            'You\'ll get an email within 1 hour with secure upload instructions',
            'Send us last 3 months of any 5 recurring bills (PDF or photo is fine)',
            'We deliver the report + scripts within 48 hours',
            'Money-back guarantee if identified savings < $1,500/yr',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center mt-0.5"
                style={{ background: 'rgba(74,222,128,0.18)', color: '#4ade80' }}
              >
                {i + 1}
              </span>
              <p className="text-sm text-brand-sub">{step}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-brand-sub opacity-70">
          Questions? Reply to your receipt email or write to{' '}
          <a href="mailto:sledheadspl@gmail.com" className="underline">sledheadspl@gmail.com</a>.
        </p>
        <Link
          href="/"
          className="inline-block text-sm text-brand-sub underline underline-offset-2 opacity-60 hover:opacity-100 transition-opacity"
        >
          ← Back to ScrewedScore
        </Link>
      </div>
    </main>
  )
}
