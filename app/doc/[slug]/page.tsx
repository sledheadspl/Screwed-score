import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import SharedDocViewer from './SharedDocViewer'

async function getDoc(slug: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('generated_documents')
    .select('id, doc_label, html, created_at')
    .eq('share_slug', slug)
    .single()
  return data
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const doc = await getDoc(slug)
  if (!doc) return {}
  return {
    title: `${doc.doc_label} — GetScrewedScore`,
    description: `View this ${doc.doc_label} created with GetScrewedScore Document Creator.`,
    robots: { index: false },
  }
}

export default async function SharedDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = await getDoc(slug)
  if (!doc) notFound()
  return <SharedDocViewer doc={doc} />
}
