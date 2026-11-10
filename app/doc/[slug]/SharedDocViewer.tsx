'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { Download, FileText } from 'lucide-react'

interface Props {
  doc: { id: string; doc_label: string; html: string; created_at: string }
}

export default function SharedDocViewer({ doc }: Props) {
  // The document is user-supplied HTML, so it renders inside a sandboxed
  // iframe with scripts disabled. allow-same-origin lets this page size and
  // print the frame; without allow-scripts nothing inside it can run.
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(800)
  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body { margin: 0; padding: 32px; background: #f5f5f0; font-family: Georgia, serif; }
      .doc { max-width: 720px; margin: 0 auto; }
      @media print { body { background: #fff; padding: 0; } @page { margin: 0.75in; } }
    </style></head><body><div class="doc">${doc.html}</div></body></html>`

  const handleLoad = () => {
    const body = frameRef.current?.contentDocument?.body
    if (body) setHeight(Math.max(600, body.scrollHeight + 64))
  }

  const handlePrint = () => {
    frameRef.current?.contentWindow?.print()
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      <div className="border-b border-brand-border/40 bg-brand-surface/40">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-black text-brand-text truncate">{doc.doc_label}</h1>
              <p className="text-xs text-brand-sub">
                Created {new Date(doc.created_at).toLocaleDateString()} · via{' '}
                <Link href="/create" className="text-brand-red hover:underline">GetScrewedScore</Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/create" className="text-xs text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors">
              Create your own →
            </Link>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-red hover:bg-red-500 rounded-lg px-4 py-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="rounded-2xl border border-brand-border overflow-hidden shadow-2xl">
          <iframe
            ref={frameRef}
            title={doc.doc_label}
            sandbox="allow-same-origin allow-modals"
            srcDoc={srcDoc}
            onLoad={handleLoad}
            style={{ height }}
            className="w-full bg-[#f5f5f0] block border-0"
          />
        </div>
      </div>
    </main>
  )
}
