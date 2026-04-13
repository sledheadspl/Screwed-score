import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import Navbar from '@/components/navigation/Navbar'

export const metadata: Metadata = {
  metadataBase: new URL('https://screwedscore.com'),
  title: {
    default: 'GetScrewedScore — AI That Detects Overcharges on Bills & Contracts',
    template: '%s | GetScrewedScore',
  },
  description:
    'Free AI tool that scans your bills, invoices, and contracts for overcharges, hidden fees, and risky clauses. Get a SCREWED, MAYBE, or SAFE rating in 20 seconds. No account needed.',
  keywords: [
    'overcharged on bill',
    'mechanic invoice overcharge',
    'medical bill errors',
    'contract red flags',
    'lease agreement analysis',
    'am I being scammed',
    'screwed score',
    'bill analyzer',
    'overcharge detector',
    'consumer protection AI',
    'check if overcharged',
    'contractor estimate too high',
  ],
  alternates: {
    canonical: 'https://screwedscore.com',
  },
  openGraph: {
    title: 'GetScrewedScore — Find Out If You\'re Being Overcharged',
    description: 'Upload any bill, invoice, or contract. Free AI tells you if you\'re getting screwed — and exactly what to do about it.',
    url: 'https://screwedscore.com',
    siteName: 'GetScrewedScore',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og',
        width: 1200,
        height: 630,
        alt: 'GetScrewedScore — AI-powered overcharge detection',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetScrewedScore — Find Out If You\'re Being Overcharged',
    description: 'Free AI scans your bills and contracts for overcharges and hidden fees. Results in 20 seconds.',
    images: ['/og'],
    site: '@screwedscore',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'GetScrewedScore',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  url: 'https://screwedscore.com',
  description: 'AI-powered consumer protection tool that detects overcharges, hidden fees, and risky clauses in bills, invoices, and contracts.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: '3 free scans, additional scans for $2.99',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1240',
  },
  featureList: [
    'Bill overcharge detection',
    'Contract red flag analysis',
    'Medical bill review',
    'Mechanic invoice analysis',
    'Lease agreement review',
    '12 languages supported',
    'Results in 20 seconds',
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-MZCC8P2NG7"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-MZCC8P2NG7');
        `}</Script>
        {/* Google Ads conversion tracking */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18056991193"
          strategy="afterInteractive"
        />
        <Script id="gads-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-18056991193');
        `}</Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Navbar />
        {children}
        <footer className="text-center py-8 text-sm text-gray-500 space-y-2">
          <div className="flex justify-center">
            <img src="/rembydesign-logo.svg" alt="REMbyDesign logo" className="h-8 opacity-80" width="120" height="32" />
          </div>
          <div>&copy; {new Date().getFullYear()} REMbyDesign. All rights reserved.</div>
          <div>Unauthorized reproduction or distribution is strictly prohibited.</div>
        </footer>
      </body>
    </html>
  )
}
