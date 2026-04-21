import { NextRequest, NextResponse } from 'next/server'
import { createJob, listJobs, JOB_CATEGORIES } from '@/lib/jobs/service'

export const runtime = 'nodejs'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const category      = searchParams.get('category') ?? undefined
    const location_type = searchParams.get('location_type') ?? undefined
    const status        = searchParams.get('status') ?? 'open'
    const limit         = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20'), 1), 50)
    const offset        = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0)

    const jobs = await listJobs({ category, location_type, status, limit, offset })
    return NextResponse.json(jobs)
  } catch (err) {
    console.error('[api/jobs GET]', err)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-operator-secret')
  if (!secret || secret !== process.env.OWNER_ACCESS_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { title, description, category, skills_required, pay_description, location_type, city, state, min_reputation, max_applicants } = body as Record<string, unknown>

    if (typeof title !== 'string' || !title.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })
    if (typeof description !== 'string' || !description.trim()) return NextResponse.json({ error: 'description is required' }, { status: 400 })
    if (typeof category !== 'string' || !JOB_CATEGORIES.has(category)) return NextResponse.json({ error: `category must be one of: ${[...JOB_CATEGORIES].join(', ')}` }, { status: 400 })

    const job = await createJob({
      title:           String(title),
      description:     String(description),
      category,
      skills_required: Array.isArray(skills_required) ? skills_required.map(String) : [],
      pay_description: typeof pay_description === 'string' ? pay_description : undefined,
      location_type:   typeof location_type === 'string' ? location_type : 'remote',
      city:            typeof city === 'string' ? city : undefined,
      state:           typeof state === 'string' ? state : undefined,
      min_reputation:  typeof min_reputation === 'number' ? min_reputation : 0,
      max_applicants:  typeof max_applicants === 'number' ? max_applicants : 20,
    })

    return NextResponse.json({ job }, { status: 201 })
  } catch (err: unknown) {
    console.error('[api/jobs POST]', err)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
