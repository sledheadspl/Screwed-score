import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/app/api/verify-checkout/route'

const CREATOMATE_API = 'https://api.creatomate.com/v1/renders'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Pro gate
  const proToken = req.cookies.get('gss_pro')?.value
  if (!proToken || !verifyToken(proToken)) {
    return NextResponse.json({ error: 'PRO_REQUIRED' }, { status: 403 })
  }

  if (!process.env.CREATOMATE_API_KEY) {
    return NextResponse.json({ error: 'Video generation not configured' }, { status: 503 })
  }

  const renderId = params.id
  if (!renderId || !/^[a-zA-Z0-9_-]+$/.test(renderId)) {
    return NextResponse.json({ error: 'Invalid render ID' }, { status: 400 })
  }

  const response = await fetch(`${CREATOMATE_API}/${renderId}`, {
    headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Render not found' }, { status: response.status })
  }

  const render = await response.json()

  return NextResponse.json({
    status: render.status,         // "planned" | "rendering" | "succeeded" | "failed"
    progress: render.progress ?? 0,
    url: render.url ?? null,       // only present when succeeded
    error_message: render.error_message ?? null,
  })
}
