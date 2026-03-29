import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://getscrewedscore.com'
  ),
  title: 'Get Screwed Score — Find Out If You\'re Being Overcharged',
  description:
    'Upload any bill, invoice, or contract. Our AI tells you if you\'re being screwed — and exactly what to do about it.',
  keywords: [
    'overcharged',
    'mechanic invoice overcharge',
    'medical bill too high',
    'contract red flags',
    'lease agreement analysis',
    'am I being scammed',
    'screwed score',
  ],
  openGraph: {
    title: 'Get Screwed Score',
    description: 'Upload any document. Find out if you\'re getting screwed.',
    url: 'https://getscrewedscore.com',
    siteName: 'GetScrewedScore',
    type: 'website',
    images: [
      {
        url: '/og',
        width: 1200,
        height: 630,
        alt: 'Get Screwed Score — AI-powered overcharge detection',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Get Screwed Score',
    description: 'Upload any bill or contract. Find out if you\'re getting overcharged.',
    images: ['/og'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="text-center py-8 text-sm text-gray-500 space-y-1">
          <div className="font-semibold tracking-wide text-gray-400">REMbyDesign</div>
          <div>&copy; {new Date().getFullYear()} REMbyDesign. All rights reserved.</div>
          <div>Unauthorized reproduction or distribution is strictly prohibited.</div>
        </footer>
      </body>
    </html>
  )
}
