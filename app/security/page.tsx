import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

// Renders SECURITY.md from the repo root, so the policy has one source of
// truth. It's read at build time (the page is static); /.well-known/security.txt
// points here.

export const metadata: Metadata = {
  title: 'Security Policy',
  description: 'How to report a security vulnerability in Screwed Score, what is in scope, and what to expect from us.',
  alternates: { canonical: 'https://www.screwedscore.com/security' },
  robots: { index: true, follow: true },
}

async function policyHtml(): Promise<string> {
  const md = readFileSync(path.join(process.cwd(), 'SECURITY.md'), 'utf8')
  const file = await remark().use(remarkGfm).use(remarkHtml).process(md)
  return String(file)
}

export default async function SecurityPage() {
  const html = await policyHtml()
  return (
    <main className="min-h-screen bg-brand-bg overflow-x-hidden">
      <article
        className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-sm sm:text-base leading-relaxed text-brand-sub
          [&_h1]:text-3xl [&_h1]:sm:text-4xl [&_h1]:font-black [&_h1]:text-brand-text [&_h1]:tracking-tight [&_h1]:mb-6
          [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-brand-text [&_h2]:mt-10 [&_h2]:mb-3
          [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1.5
          [&_strong]:text-brand-text [&_a]:text-red-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-words
          [&_code]:text-brand-text [&_code]:text-[0.9em]
          [&_table]:w-full [&_table]:my-4 [&_table]:text-sm [&_th]:text-left [&_th]:text-brand-text [&_th]:py-2 [&_th]:pr-4
          [&_td]:py-2 [&_td]:pr-4 [&_tr]:border-b [&_tr]:border-brand-border/40"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  )
}
