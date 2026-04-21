// seed-marketplace.js — seeds jobs + worker profiles + completions
const SUPABASE_URL  = 'https://yvlwrkskjnhlismuagyq.supabase.co'
const SERVICE_KEY   = process.env.SUPABASE_KEY

if (!SERVICE_KEY) { console.error('Set SUPABASE_KEY env var'); process.exit(1) }

const headers = {
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey':        SERVICE_KEY,
}

async function db(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path}: ${text}`)
  return text ? JSON.parse(text) : null
}

async function createAuthUser(email, name) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password:      'Marketplace2026!',
      email_confirm: true,
      user_metadata: { display_name: name },
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    // If user already exists, fetch them
    if (data.msg?.includes('already') || data.code === 'email_exists') {
      const list = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, { headers })
      const { users } = await list.json()
      return users.find(u => u.email === email)
    }
    throw new Error(`Auth user ${email}: ${JSON.stringify(data)}`)
  }
  return data
}

const WORKERS = [
  {
    email: 'marcus.reed@screwedworker.dev',
    display_name: 'Marcus Reed',
    bio: 'Freelance content strategist with 6 years writing for SaaS and fintech brands. I specialize in turning complex topics into content that actually converts.',
    skills: ['writing', 'SEO', 'content strategy', 'copywriting'],
    city: 'Austin', state: 'TX',
    jobs_completed: 11, jobs_abandoned: 0, avg_rating: 4.9, disputes_filed: 0, disputes_lost: 0,
    ratings: [5,5,5,4,5,5,5,4,5,5,5],
  },
  {
    email: 'priya.sharma@screwedworker.dev',
    display_name: 'Priya Sharma',
    bio: 'UI/UX designer and brand identity specialist. Former agency creative director, now taking select freelance clients. Figma-first workflow.',
    skills: ['design', 'Figma', 'branding', 'UI/UX'],
    city: 'Remote', state: null,
    jobs_completed: 8, jobs_abandoned: 0, avg_rating: 4.8, disputes_filed: 0, disputes_lost: 0,
    ratings: [5,5,4,5,5,5,4,5],
  },
  {
    email: 'darnell.okafor@screwedworker.dev',
    display_name: 'Darnell Okafor',
    bio: 'Community outreach and social media specialist. Built engaged audiences from scratch for 3 consumer brands. I know how to make people care.',
    skills: ['outreach', 'social media', 'community management', 'email marketing'],
    city: 'Atlanta', state: 'GA',
    jobs_completed: 6, jobs_abandoned: 1, avg_rating: 4.5, disputes_filed: 0, disputes_lost: 0,
    ratings: [5,4,5,4,5,4],
  },
  {
    email: 'tanya.brooks@screwedworker.dev',
    display_name: 'Tanya Brooks',
    bio: 'Research analyst and data journalist. I dig into public records, corporate filings, and billing data to find the story nobody else bothered to look for.',
    skills: ['research', 'data analysis', 'journalism', 'fact-checking'],
    city: 'Chicago', state: 'IL',
    jobs_completed: 5, jobs_abandoned: 0, avg_rating: 4.7, disputes_filed: 0, disputes_lost: 0,
    ratings: [5,4,5,5,5],
  },
  {
    email: 'carlos.vega@screwedworker.dev',
    display_name: 'Carlos Vega',
    bio: 'Full-stack developer focused on Next.js and Supabase. I build fast, clean, and ship on time.',
    skills: ['dev', 'Next.js', 'TypeScript', 'Supabase'],
    city: 'Miami', state: 'FL',
    jobs_completed: 9, jobs_abandoned: 0, avg_rating: 5.0, disputes_filed: 0, disputes_lost: 0,
    ratings: [5,5,5,5,5,5,5,5,5],
  },
  {
    email: 'jasmine.wu@screwedworker.dev',
    display_name: 'Jasmine Wu',
    bio: 'Video editor and motion graphics designer. Short-form content for YouTube and TikTok is my lane. Fast turnaround, great eye.',
    skills: ['video', 'editing', 'motion graphics', 'TikTok'],
    city: 'Los Angeles', state: 'CA',
    jobs_completed: 4, jobs_abandoned: 0, avg_rating: 4.8, disputes_filed: 0, disputes_lost: 0,
    ratings: [5,5,4,5],
  },
  {
    email: 'derek.hunt@screwedworker.dev',
    display_name: 'Derek Hunt',
    bio: 'New to the platform but not to the work. Healthcare billing specialist with 4 years at a hospital system. Ready to put that knowledge to use.',
    skills: ['research', 'medical billing', 'admin'],
    city: 'Nashville', state: 'TN',
    jobs_completed: 2, jobs_abandoned: 1, avg_rating: 3.5, disputes_filed: 1, disputes_lost: 0,
    ratings: [4,3],
  },
]

const JOBS = [
  {
    title: 'Medical Bill Auditor — Part Time',
    description: `We receive user-submitted medical bills and need someone to flag obvious overcharges, duplicate line items, and unbundled procedures. You will review 10-15 bills per week and write a short plain-English summary of findings for each one.\n\nIdeal for someone with medical billing experience or a background in healthcare administration. Training provided on our internal rubric.`,
    category: 'research',
    skills_required: ['medical billing', 'research', 'writing'],
    pay_description: '~$200/week',
    location_type: 'remote',
    status: 'open',
    min_reputation: 0,
  },
  {
    title: 'Weekly Newsletter Writer',
    description: `ScrewedScore publishes a weekly consumer protection newsletter covering billing scams, overcharges, and wins from our community. We need a writer to turn raw data and user stories into a 600-800 word email that is sharp, punchy, and actionable.\n\nYou will work directly with Ryan on angle and tone. First edition ships in two weeks.`,
    category: 'writing',
    skills_required: ['writing', 'copywriting', 'email marketing'],
    pay_description: '~$150/issue',
    location_type: 'remote',
    status: 'open',
    min_reputation: 40,
  },
  {
    title: 'Social Media Content — 3 Posts/Week',
    description: `We need someone to create 3 posts per week for our Twitter/X and Instagram accounts. Content should highlight real overcharge cases (anonymized), community wins, and tips for fighting back against bad billing.\n\nVoice: direct, a little edgy, pro-consumer. No corporate fluff. Think less Fortune 500 and more "I will help you fight City Hall."`,
    category: 'outreach',
    skills_required: ['social media', 'copywriting', 'content strategy'],
    pay_description: '~$75/week',
    location_type: 'remote',
    status: 'open',
    min_reputation: 0,
  },
  {
    title: 'Brand Refresh — Logo + Color System',
    description: `ScrewedScore is ready for a visual identity upgrade. We have the name, the voice, and the audience. We need a designer to build a cohesive brand system: updated logo, refined color palette, typography spec, and a style guide we can hand to contractors.\n\nCurrent brand: dark, high-contrast, red accents. We want to keep the energy but add credibility.`,
    category: 'design',
    skills_required: ['branding', 'logo design', 'Figma'],
    pay_description: 'Flat $400',
    location_type: 'remote',
    status: 'open',
    min_reputation: 50,
  },
  {
    title: 'Outreach to Consumer Protection Orgs',
    description: `We want to build relationships with 20-30 consumer protection nonprofits, legal aid societies, and patient advocacy groups. We need someone to identify targets, draft personalized outreach emails, and track responses.\n\nGoal: 5 warm partnerships within 60 days. You will be given access to our email tools and a simple CRM. Experience in nonprofit or advocacy outreach strongly preferred.`,
    category: 'outreach',
    skills_required: ['outreach', 'research', 'email marketing'],
    pay_description: '~$300 + bonus per partnership',
    location_type: 'remote',
    status: 'filled',
    min_reputation: 30,
  },
  {
    title: 'Explainer Video — How ScrewedScore Works',
    description: `We need a 90-second explainer video showing how to upload a bill, what the AI looks for, and what the score means. Script will be provided. You handle editing, motion graphics, and voiceover direction.\n\nDeliverable: finished MP4 optimized for web + social. Turnaround: 10 days.`,
    category: 'video',
    skills_required: ['video', 'editing', 'motion graphics'],
    pay_description: 'Flat $250',
    location_type: 'remote',
    status: 'open',
    min_reputation: 0,
  },
]

function computeScore({ jobs_completed, jobs_abandoned, avg_rating, disputes_filed, disputes_lost }) {
  const score = 50
    + Math.min(jobs_completed * 4, 40)
    + (avg_rating - 3) * 10
    - jobs_abandoned * 15
    - disputes_lost * 10
    - disputes_filed * 2
  return Math.max(0, Math.min(100, Math.round(score)))
}

async function seed() {
  console.log('Seeding marketplace...\n')

  // 1. Create jobs
  console.log('Creating jobs...')
  const jobRows = await db('POST', 'jobs', JOBS)
  console.log(`  ✓ ${jobRows.length} jobs created`)
  const openJobs = jobRows.filter(j => j.status === 'open')

  // 2. Create auth users + worker profiles
  console.log('\nCreating workers...')
  const workerIds = []
  for (const w of WORKERS) {
    try {
      const user = await createAuthUser(w.email, w.display_name)
      if (!user?.id) { console.log(`  ✗ Skipped ${w.display_name} (no user id)`); continue }

      // Upsert profile
      await db('POST', 'worker_profiles?on_conflict=id', [{
        id:           user.id,
        display_name: w.display_name,
        bio:          w.bio,
        skills:       w.skills,
        city:         w.city !== 'Remote' ? w.city : null,
        state:        w.state,
        is_verified:  w.jobs_completed >= 6,
        availability: 'available',
      }])

      const score = computeScore(w)

      // Upsert reputation
      await db('POST', 'worker_reputations?on_conflict=worker_id', [{
        worker_id:     user.id,
        jobs_completed: w.jobs_completed,
        jobs_abandoned: w.jobs_abandoned,
        avg_rating:     w.avg_rating,
        reputation_score: score,
        disputes_filed: w.disputes_filed,
        disputes_lost:  w.disputes_lost,
      }])

      workerIds.push({ ...w, id: user.id, score })
      console.log(`  ✓ ${w.display_name} — score ${score}`)
    } catch (err) {
      console.log(`  ✗ ${w.display_name}: ${err.message}`)
    }
  }

  // 3. Seed some job completions (for top workers)
  console.log('\nSeeding job completions...')
  const completionWorkers = workerIds.filter(w => w.jobs_completed >= 4)
  const ratingNotes = [
    'Delivered ahead of schedule. Exactly what we asked for.',
    'Great communication, clean work. Will hire again.',
    'Solid output, minor revisions needed but handled quickly.',
    'Exceeded expectations. Fast and professional.',
    'Good work. Took a little longer than expected but quality was there.',
    'Outstanding. Best freelancer we have worked with on this platform.',
    'Reliable and thorough. Highly recommend.',
  ]

  let completionCount = 0
  for (const worker of completionWorkers.slice(0, 4)) {
    const job = openJobs[completionCount % openJobs.length]
    if (!job) continue
    try {
      // Create application first
      const apps = await db('POST', 'job_applications', [{
        job_id:    job.id,
        worker_id: worker.id,
        status:    'approved',
        cover_note: 'I have relevant experience and can start immediately.',
      }])
      const app = Array.isArray(apps) ? apps[0] : apps

      // Create completion
      const rating = worker.ratings[0] ?? 5
      await db('POST', 'job_completions', [{
        job_id:         job.id,
        worker_id:      worker.id,
        application_id: app.id,
        rating,
        rating_note:    ratingNotes[completionCount % ratingNotes.length],
        was_on_time:    true,
      }])
      completionCount++
    } catch (err) {
      console.log(`  ✗ completion for ${worker.display_name}: ${err.message}`)
    }
  }
  console.log(`  ✓ ${completionCount} completions seeded`)

  console.log('\n✅ Marketplace seeded successfully!')
  console.log(`   ${JOBS.length} jobs | ${workerIds.length} workers | ${completionCount} completions`)
  console.log('\nTest it:')
  console.log('  GET /api/jobs              — job board')
  console.log('  GET /api/workers/leaderboard — top workers')
}

seed().catch(err => { console.error(err); process.exit(1) })
