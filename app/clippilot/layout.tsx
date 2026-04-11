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

export default function ClipPilotLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
