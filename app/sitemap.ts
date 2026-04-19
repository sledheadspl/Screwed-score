import { MetadataRoute } from 'next'

const ANALYZE_TYPES = [
  'mechanic-invoice',
  'medical-bill',
  'contractor-estimate',
  'lease-agreement',
  'phone-bill',
  'brand-deal',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://screwedscore.com'

  const analyzePages: MetadataRoute.Sitemap = ANALYZE_TYPES.map(type => ({
    url: `${base}/analyze/${type}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }))

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${base}/shame`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${base}/community`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${base}/weekly`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${base}/clippilot`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${base}/productivity`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${base}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...analyzePages,
  ]
}
