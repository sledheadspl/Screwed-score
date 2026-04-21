export default function AuditSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#020308' }}>
      <div className="max-w-md w-full text-center space-y-5">
        <div className="text-5xl">🔍</div>
        <h1 className="text-2xl font-black text-brand-text">Audit confirmed.</h1>
        <p className="text-brand-sub text-sm leading-relaxed">
          A real auditor is reviewing your bill now. You will receive a plain-English
          breakdown — every overcharge, every error, and your action plan — within
          <strong className="text-brand-text"> 48 hours</strong> to the email you provided.
        </p>
        <div
          className="rounded-2xl p-5 text-left space-y-3"
          style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)' }}
        >
          <p className="text-xs font-bold text-brand-text uppercase tracking-widest" style={{ color: '#00e5ff' }}>What happens next</p>
          {[
            'Your bill is assigned to an auditor from our vetted community',
            'They review every line item against industry benchmarks',
            'You get a report with exact dispute language for each issue',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center mt-0.5"
                style={{ background: 'rgba(0,229,255,0.15)', color: '#00e5ff' }}>
                {i + 1}
              </span>
              <p className="text-sm text-brand-sub">{step}</p>
            </div>
          ))}
        </div>
        <a
          href="/"
          className="inline-block text-sm text-brand-sub underline underline-offset-2 opacity-60 hover:opacity-100 transition-opacity"
        >
          ← Back to ScrewedScore
        </a>
      </div>
    </main>
  )
}
