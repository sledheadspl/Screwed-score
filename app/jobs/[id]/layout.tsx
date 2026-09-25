import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { alternates: { canonical: `https://www.screwedscore.com/jobs/${id}` } }
}

export default function JobLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
