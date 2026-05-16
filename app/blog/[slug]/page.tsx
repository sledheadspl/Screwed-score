import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAllPosts, getPostBySlug } from '@/lib/blog'
import { getRelatedPosts } from '@/lib/related-posts'

const SITE = 'https://www.screwedscore.com'
const DEFAULT_OG = `${SITE}/og`

export function generateStaticParams(): Array<{ slug: string }> {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Post not found' }

  const { title, description } = post.frontmatter
  const url = `${SITE}/blog/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [{ url: DEFAULT_OG }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG],
    },
  }
}

function CtaBox() {
  return (
    <div className="my-8 rounded-lg border-2 border-emerald-300 bg-emerald-50 p-5 text-center">
      <p className="text-lg font-bold text-emerald-900">
        🚨 Scan your bill free in 20 seconds — no account needed
      </p>
      <Link
        href="https://screwedscore.com/#upload"
        className="mt-3 inline-block rounded-md bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700"
      >
        Scan my bill →
      </Link>
    </div>
  )
}

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const { title, description, date, category } = post.frontmatter
  const related = getRelatedPosts(slug, category, 3)
  const url = `${SITE}/blog/${slug}`

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: date,
    dateModified: date,
    author: { '@type': 'Organization', name: 'GetScrewedScore' },
    publisher: {
      '@type': 'Organization',
      name: 'Screwedscore',
      url: SITE,
      logo: { '@type': 'ImageObject', url: `${SITE}/og` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: DEFAULT_OG,
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <link rel="canonical" href={url} />

      <nav className="mb-6 text-sm">
        <Link href="/blog" className="text-emerald-700 hover:underline">
          ← All posts
        </Link>
      </nav>

      <header className="mb-6">
        <div className="mb-3 flex items-center gap-3 text-xs">
          {category && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium uppercase tracking-wide text-gray-700">
              {category}
            </span>
          )}
          <time className="text-gray-500" dateTime={date}>
            {new Date(date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-3 text-lg text-gray-600">{description}</p>}
      </header>

      <CtaBox />

      <article
        className="blog-article text-gray-800 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      <CtaBox />

      {related.length > 0 && (
        <section className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Related guides</h2>
          <ul className="space-y-4">
            {related.map(r => (
              <li key={r.slug}>
                <Link
                  href={`/blog/${r.slug}`}
                  className="font-medium text-emerald-700 hover:underline"
                >
                  {r.title}
                </Link>
                {r.description && (
                  <p className="mt-1 text-sm text-gray-600">{r.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
