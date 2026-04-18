import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ClipPilot — AI Auto-Clip Desktop App for Streamers',
  description: 'ClipPilot automatically detects viral moments from your live streams, generates vertical short-form clips with AI captions, and publishes to TikTok, YouTube Shorts & Twitter/X. Ships as a Windows .exe.',
  openGraph: {
    title: 'ClipPilot — AI Auto-Clip App for Streamers',
    description: 'Auto-detect viral stream moments, generate vertical clips with AI captions, publish everywhere. Windows desktop app.',
    type: 'website',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ClipPilot',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Windows',
  url: 'https://screwedscore.com/clippilot',
  description: 'AI-powered desktop app that detects viral moments from live streams, crops them vertical, adds AI captions, and auto-publishes to TikTok, YouTube Shorts, and Twitter/X.',
  offers: [
    { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' },
    { '@type': 'Offer', price: '19', priceCurrency: 'USD', name: 'Pro', billingIncrement: 'MONTH' },
    { '@type': 'Offer', price: '49', priceCurrency: 'USD', name: 'Unlimited', billingIncrement: 'MONTH' },
  ],
  featureList: [
    'Live stream moment detection',
    'Auto vertical crop (9:16)',
    'On-device AI captions via Whisper.cpp',
    'One-click publish to TikTok, YouTube Shorts, Twitter/X',
    'Real-time audio spike detection',
    'Chat velocity analysis',
    'Local processing — no cloud required',
  ],
  softwareVersion: '0.1.5',
  downloadUrl: 'https://github.com/sledheadspl/Screwed-score/releases/download/clippilot-v0.1.5/ClipPilot_0.1.5_x64-setup.exe',
  fileSize: '10MB',
}

export default function ClipPilotLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
