'use client'

import { Download, FileText } from 'lucide-react'

interface Props {
  doc: { id: string; doc_label: string; html: string; created_at: string }
}

export default function SharedDocViewer({ doc }: Props) {
  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>${doc.doc_label}</title><style>
      body { margin: 0; padding: 0; font-family: Georgia, serif; }
      @media print { @page { margin: 0.75in; } }
    </style></head><body>${doc.html}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
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
                <a href="/create" className="text-brand-red hover:underline">GetScrewedScore</a>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="/create" className="text-xs text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors">
              Create your own →
            </a>
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
          <div className="bg-[#f5f5f0] min-h-[600px] p-8">
            <div dangerouslySetInnerHTML={{ __html: doc.html }} className="max-w-[720px] mx-auto" />
          </div>
        </div>
      </div>
    </main>
  )
}
