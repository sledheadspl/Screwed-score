import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — GetScrewedScore',
  description: 'How GetScrewedScore collects, uses, and protects your data.',
  robots: { index: true, follow: true },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-brand-text">{title}</h2>
      <div className="text-sm text-brand-sub leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  const updated = 'March 29, 2026'

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Nav */}
      <nav className="border-b border-brand-border/60 bg-brand-bg/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 select-none">
            <span className="text-base font-black text-brand-text">Get</span>
            <span className="text-base font-black" style={{
              background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Screwed</span>
            <span className="text-base font-black text-brand-text">Score</span>
          </Link>
          <Link href="/" className="text-xs text-brand-sub hover:text-brand-text transition-colors">
            ← Back to app
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-16 space-y-10">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-brand-text tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-brand-sub">Last updated: {updated}</p>
          <p className="text-sm text-brand-sub leading-relaxed">
            This Privacy Policy explains how <strong className="text-brand-text">GetScrewedScore</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), operated by REMbyDesign, collects, uses, and protects information when you use our service at{' '}
            <a href="https://screwedscore.com" className="text-red-400 hover:underline">screwedscore.com</a>.
          </p>
        </div>

        <div className="w-full h-px bg-brand-border" />

        <Section title="1. What We Collect">
          <p><strong className="text-brand-text">Documents you upload.</strong> When you upload a file for analysis, we extract the text content and store it temporarily to run the AI analysis. The extracted text is stored in our database linked to an anonymized IP hash — never to your name or email unless you create an account.</p>
          <p><strong className="text-brand-text">Usage data.</strong> We track how many analyses have been run from a given IP address (stored as a one-way SHA-256 hash) to enforce our free tier limits. Raw IP addresses are not stored.</p>
          <p><strong className="text-brand-text">Account data (optional).</strong> If you sign in with Google, we receive your email address and Google profile ID from Google OAuth. We use this to identify your account and allow you to revisit past analyses.</p>
          <p><strong className="text-brand-text">Payment data.</strong> If you subscribe to GetScrewedScore Pro, payment is processed by Stripe. We do not store your full card number, CVV, or billing address — Stripe handles all payment data. We store your Stripe customer ID and subscription ID to manage your Pro status.</p>
          <p><strong className="text-brand-text">Analytics.</strong> We use Google Analytics (GA4) to understand how the site is used — page views, session duration, and general behavior. This data is anonymized and does not include document content.</p>
        </Section>

        <Section title="2. How We Use Your Data">
          <ul className="list-disc list-inside space-y-2">
            <li>To analyze your uploaded documents and return results to you</li>
            <li>To enforce free tier usage limits (via anonymized IP hash)</li>
            <li>To provide Pro features to paying subscribers</li>
            <li>To show you your past analyses if you have an account</li>
            <li>To improve the accuracy and performance of our AI analysis</li>
            <li>To send transactional emails (subscription confirmation, receipts) if you subscribe</li>
          </ul>
          <p><strong className="text-brand-text">We do not sell your data.</strong> We do not sell, rent, or trade your personal information or document content to any third party, ever.</p>
        </Section>

        <Section title="3. Document Retention">
          <p>Uploaded documents and their extracted text are stored in our database to power the shareable results page at <code className="text-xs bg-brand-muted px-1.5 py-0.5 rounded">/r/[id]</code>. If you did not explicitly share your result, your document data is not publicly accessible.</p>
          <p>We do not use your document content to train AI models. Your documents are passed to Anthropic&apos;s Claude API for analysis and are subject to{' '}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">Anthropic&apos;s Privacy Policy</a>.
            Anthropic does not train models on API inputs.
          </p>
          <p>You may request deletion of your data at any time by emailing us (see Section 7).</p>
        </Section>

        <Section title="4. Third-Party Services">
          <p>We use the following third-party services to operate GetScrewedScore:</p>
          <div className="rounded-xl border border-brand-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-brand-border bg-brand-muted">
                  <th className="text-left px-4 py-3 text-brand-sub font-semibold">Service</th>
                  <th className="text-left px-4 py-3 text-brand-sub font-semibold">Purpose</th>
                  <th className="text-left px-4 py-3 text-brand-sub font-semibold">Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {[
                  ['Supabase', 'Database, authentication, file storage', 'supabase.com/privacy'],
                  ['Anthropic Claude', 'AI document analysis', 'anthropic.com/legal/privacy'],
                  ['Stripe', 'Payment processing', 'stripe.com/privacy'],
                  ['Google OAuth', 'Sign-in (optional)', 'policies.google.com/privacy'],
                  ['Google Analytics', 'Usage analytics (anonymized)', 'policies.google.com/privacy'],
                  ['Netlify', 'Website hosting', 'netlify.com/privacy'],
                ].map(([svc, purpose, url]) => (
                  <tr key={svc} className="text-brand-sub">
                    <td className="px-4 py-3 font-semibold text-brand-text">{svc}</td>
                    <td className="px-4 py-3">{purpose}</td>
                    <td className="px-4 py-3">
                      <a href={`https://${url}`} target="_blank" rel="noopener noreferrer"
                        className="text-red-400 hover:underline truncate">{url}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="5. Cookies">
          <p>We use the following cookies:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong className="text-brand-text">gss_pro</strong> — an HTTP-only, secure, signed token that identifies you as a Pro subscriber. Set when you complete checkout. Expires after 7 days (renewed automatically for active subscribers).</li>
            <li><strong className="text-brand-text">Supabase auth cookies</strong> — set when you sign in with Google. Used to maintain your session.</li>
            <li><strong className="text-brand-text">Google Analytics cookies</strong> — used by GA4 for anonymized usage tracking. You can opt out via your browser&apos;s cookie settings or a GA opt-out browser add-on.</li>
          </ul>
        </Section>

        <Section title="6. Children's Privacy">
          <p>GetScrewedScore is not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it.</p>
        </Section>

        <Section title="7. Your Rights">
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Access the personal data we hold about you</li>
            <li>Request deletion of your data</li>
            <li>Request a copy of your data (data portability)</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p>To exercise any of these rights, email us at <a href="mailto:privacy@rembydesign.com" className="text-red-400 hover:underline">privacy@rembydesign.com</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="8. Security">
          <p>We take security seriously. All data is transmitted over HTTPS. Sensitive tokens are signed with HMAC-SHA256. Database access requires server-side authentication via service role keys that are never exposed to the client. IP addresses are stored only as one-way SHA-256 hashes.</p>
          <p>No method of transmission or storage is 100% secure. If you discover a security vulnerability, please disclose it responsibly to <a href="mailto:security@rembydesign.com" className="text-red-400 hover:underline">security@rembydesign.com</a>.</p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. When we do, we will update the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of the service after changes constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="10. Contact">
          <p>Questions about this Privacy Policy? Contact us:</p>
          <div className="rounded-xl border border-brand-border bg-brand-surface p-4 space-y-1">
            <p><strong className="text-brand-text">REMbyDesign</strong></p>
            <p>Email: <a href="mailto:privacy@rembydesign.com" className="text-red-400 hover:underline">privacy@rembydesign.com</a></p>
            <p>Website: <a href="https://screwedscore.com" className="text-red-400 hover:underline">screwedscore.com</a></p>
          </div>
        </Section>

        <div className="pt-4 border-t border-brand-border flex items-center justify-between text-xs text-brand-sub/50">
          <span>© {new Date().getFullYear()} REMbyDesign. All rights reserved.</span>
          <Link href="/terms" className="hover:text-brand-text transition-colors">Terms of Service →</Link>
        </div>
      </main>
    </div>
  )
}
