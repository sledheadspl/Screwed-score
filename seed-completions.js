// seed-completions.js — fills job history for all existing workers
const SUPABASE_URL = 'https://yvlwrkskjnhlismuagyq.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_KEY
if (!SERVICE_KEY) { console.error('Set SUPABASE_KEY'); process.exit(1) }

const headers = {
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey':        SERVICE_KEY,
  'Prefer':        'return=representation',
}

async function db(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path}: ${text}`)
  return text ? JSON.parse(text) : null
}

// Historical jobs to attach completions to (all filled/closed — they're done)
const HISTORICAL_JOBS = [
  { title: 'Audit 10 Medical Bills for Overcharges',       category: 'research',  pay_description: '$180',        skills_required: ['research','medical billing'],          location_type: 'remote', status: 'filled' },
  { title: 'Write 4 Consumer Protection Blog Posts',       category: 'writing',   pay_description: '$200',        skills_required: ['writing','SEO'],                      location_type: 'remote', status: 'filled' },
  { title: 'Design Landing Page Mockup',                   category: 'design',    pay_description: '$300',        skills_required: ['design','Figma','UI/UX'],             location_type: 'remote', status: 'filled' },
  { title: 'Outreach to 15 Patient Advocacy Groups',       category: 'outreach',  pay_description: '$250',        skills_required: ['outreach','email marketing'],          location_type: 'remote', status: 'filled' },
  { title: 'Build Bill Upload API Endpoint',               category: 'dev',       pay_description: '$350',        skills_required: ['dev','Next.js','TypeScript'],          location_type: 'remote', status: 'filled' },
  { title: 'Edit 60-Second Product Demo Video',            category: 'video',     pay_description: '$175',        skills_required: ['video','editing'],                    location_type: 'remote', status: 'filled' },
  { title: 'Research Top 20 Billing Scam Tactics',         category: 'research',  pay_description: '$120',        skills_required: ['research','writing'],                 location_type: 'remote', status: 'filled' },
  { title: 'Write Twitter Thread Series (8 threads)',      category: 'writing',   pay_description: '$160',        skills_required: ['writing','social media','copywriting'],location_type: 'remote', status: 'filled' },
  { title: 'Create Brand Icon Set (20 icons)',             category: 'design',    pay_description: '$220',        skills_required: ['design','branding'],                  location_type: 'remote', status: 'filled' },
  { title: 'Cold Outreach Campaign — 50 Contacts',        category: 'outreach',  pay_description: '$200',        skills_required: ['outreach','research'],                location_type: 'remote', status: 'filled' },
  { title: 'Set Up Analytics Dashboard',                   category: 'dev',       pay_description: '$280',        skills_required: ['dev','TypeScript'],                   location_type: 'remote', status: 'filled' },
  { title: 'Testimonial Video Editing (3 videos)',         category: 'video',     pay_description: '$210',        skills_required: ['video','editing','motion graphics'],  location_type: 'remote', status: 'filled' },
  { title: 'Fact-Check Billing Claims for Report',        category: 'research',  pay_description: '$95',         skills_required: ['research','fact-checking'],           location_type: 'remote', status: 'filled' },
  { title: 'Email Sequence — 5 Part Onboarding',          category: 'writing',   pay_description: '$185',        skills_required: ['writing','email marketing'],          location_type: 'remote', status: 'filled' },
  { title: 'Redesign Pricing Page',                        category: 'design',    pay_description: '$260',        skills_required: ['design','Figma'],                    location_type: 'remote', status: 'filled' },
  { title: 'Partner Outreach — Legal Aid Societies',      category: 'outreach',  pay_description: '$175',        skills_required: ['outreach','research'],                location_type: 'remote', status: 'filled' },
  { title: 'Fix Mobile Upload Bug',                        category: 'dev',       pay_description: '$150',        skills_required: ['dev','Next.js'],                     location_type: 'remote', status: 'filled' },
  { title: 'Explainer Animation — How Billing Works',     category: 'video',     pay_description: '$300',        skills_required: ['video','motion graphics'],            location_type: 'remote', status: 'filled' },
  { title: 'Investigate Hospital Chargemaster Prices',    category: 'research',  pay_description: '$140',        skills_required: ['research','data analysis'],           location_type: 'remote', status: 'filled' },
  { title: 'SEO Article — Medical Billing Rights',        category: 'writing',   pay_description: '$130',        skills_required: ['writing','SEO'],                     location_type: 'remote', status: 'filled' },
]

const RATING_NOTES = [
  'Delivered ahead of schedule. Exactly what we needed.',
  'Clean work, great communication throughout.',
  'Thorough and professional. Will hire again.',
  'Exceeded expectations on both quality and speed.',
  'Solid output. Minor revisions handled quickly.',
  'Outstanding. Best contractor we have used on this platform.',
  'Reliable, detail-oriented, no hand-holding required.',
  'Fast turnaround and the quality held up.',
  'Went above and beyond on the research. Impressive.',
  'Professional from start to finish.',
  'Great instincts, delivered exactly what I had in mind.',
  'On time, on brief, no drama.',
]

// How many completions to create per worker (based on their jobs_completed count)
// We already have 1 each for the top 4 — subtract what exists
const WORKER_PLAN = [
  { email: 'marcus.reed@screwedworker.dev',   jobs_completed: 11, existing: 1, avg_rating: 4.9 },
  { email: 'priya.sharma@screwedworker.dev',  jobs_completed: 8,  existing: 1, avg_rating: 4.8 },
  { email: 'darnell.okafor@screwedworker.dev',jobs_completed: 6,  existing: 1, avg_rating: 4.5 },
  { email: 'tanya.brooks@screwedworker.dev',  jobs_completed: 5,  existing: 1, avg_rating: 4.7 },
  { email: 'carlos.vega@screwedworker.dev',   jobs_completed: 9,  existing: 0, avg_rating: 5.0 },
  { email: 'jasmine.wu@screwedworker.dev',    jobs_completed: 4,  existing: 0, avg_rating: 4.8 },
  { email: 'derek.hunt@screwedworker.dev',    jobs_completed: 2,  existing: 0, avg_rating: 3.5 },
]

function pickRating(avg) {
  // Generate a rating close to the average with slight variance
  const base = Math.round(avg)
  const variance = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0
  return Math.max(1, Math.min(5, base + variance))
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

async function seed() {
  console.log('Fetching existing workers...')
  const workers = await db('GET', 'worker_profiles?select=id,display_name,skills')
  const workerMap = {}
  workers.forEach(w => { workerMap[w.id] = w })

  // Fetch auth users to map email -> id
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  })
  const { users } = await authRes.json()
  const emailToId = {}
  users.forEach(u => { emailToId[u.email] = u.id })

  // Create historical jobs
  console.log('\nCreating historical jobs...')
  const histJobs = await db('POST', 'jobs', HISTORICAL_JOBS.map((j, i) => ({
    ...j,
    description: `Completed project — ${j.title}. This gig has been filled and completed by a community member.`,
    min_reputation: 0,
    max_applicants: 5,
    created_at: daysAgo(90 - i * 3),
    updated_at: daysAgo(75 - i * 3),
  })))
  console.log(`  ✓ ${histJobs.length} historical jobs created`)

  // For each worker, create the missing completions
  console.log('\nFilling job history...')
  let totalCompletions = 0
  let jobIndex = 0

  for (const plan of WORKER_PLAN) {
    const workerId = emailToId[plan.email]
    if (!workerId) { console.log(`  ✗ No user found for ${plan.email}`); continue }

    const needed = plan.jobs_completed - plan.existing
    if (needed <= 0) { console.log(`  — ${plan.email.split('@')[0]}: already complete`); continue }

    let created = 0
    for (let i = 0; i < needed; i++) {
      const job = histJobs[jobIndex % histJobs.length]
      jobIndex++

      try {
        // Create application (approved)
        const apps = await db('POST', 'job_applications', [{
          job_id:     job.id,
          worker_id:  workerId,
          status:     'approved',
          cover_note: 'I can handle this. Available to start immediately.',
          created_at: daysAgo(80 - i * 5 - Math.floor(Math.random() * 3)),
          updated_at: daysAgo(75 - i * 5),
        }])
        const app = Array.isArray(apps) ? apps[0] : apps

        // Create completion
        const rating = pickRating(plan.avg_rating)
        await db('POST', 'job_completions', [{
          job_id:         job.id,
          worker_id:      workerId,
          application_id: app.id,
          rating,
          rating_note:    RATING_NOTES[Math.floor(Math.random() * RATING_NOTES.length)],
          was_on_time:    Math.random() > 0.15,
          completed_at:   daysAgo(70 - i * 5 - Math.floor(Math.random() * 4)),
        }])
        created++
        totalCompletions++
      } catch (err) {
        // Skip duplicate or conflict errors silently
        if (!err.message.includes('duplicate') && !err.message.includes('23505')) {
          console.log(`    ✗ ${err.message.slice(0, 80)}`)
        }
      }
    }
    const workerName = plan.email.split('@')[0].replace('.', ' ')
    console.log(`  ✓ ${workerName}: +${created} completions`)
  }

  console.log(`\n✅ Done — ${totalCompletions} completions added`)
  console.log('   Leaderboard and worker profiles are now fully populated.')
}

seed().catch(err => { console.error(err); process.exit(1) })
