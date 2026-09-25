import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { alternates: { canonical: `https://www.screwedscore.com/workers/${id}` } }
}

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
