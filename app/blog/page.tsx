import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog'

const SITE = 'https://www.screwedscore.com'
const TITLE = 'Bill Disputes, Overcharge Guides, Consumer Protection — Screwedscore Blog'
const DESCRIPTION =
  'Plain-English guides to spotting bill overcharges, disputing junk fees, and protecting yourself from common consumer rip-offs. Updated weekly.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}/blog` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE}/blog`,
    type: 'website',
    images: [{ url: `${SITE}/og` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE}/og`],
  },
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function BlogIndex() {
  const posts = getAllPosts()

  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Screwedscore Blog',
    description: DESCRIPTION,
    url: `${SITE}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'Screwedscore',
      url: SITE,
    },
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />

      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Screwedscore Blog
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Plain-English guides to spotting overcharges and disputing junk fees.
        </p>
      </header>

      <div className="mb-10 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-semibold text-emerald-900">
          🚨 Scan your bill free in 20 seconds — no account needed
        </p>
        <Link
          href="/#upload"
          className="mt-2 inline-block text-sm font-medium text-emerald-700 underline"
        >
          Open the free scanner →
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-500">No posts yet. Check back soon.</p>
      ) : (
        <ul className="space-y-8">
          {posts.map(post => (
            <li key={post.slug} className="border-b border-gray-100 pb-8">
              <div className="mb-2 flex items-center gap-3 text-xs">
                {post.category && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium uppercase tracking-wide text-gray-700">
                    {post.category}
                  </span>
                )}
                <time className="text-gray-500" dateTime={post.date}>
                  {formatDate(post.date)}
                </time>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 hover:text-emerald-700">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              {post.description && (
                <p className="mt-2 text-gray-600">{post.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
