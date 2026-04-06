import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

const PRODUCTS: Record<string, { name: string; description: string; unit_amount: number }> = {
  'creator-os': {
    name: 'Creator OS Bundle',
    description: 'Complete operating system for digital creators. Notion templates, automation playbooks, and workflow architecture to run your business like a machine.',
    unit_amount: 9700,
  },
  'content-pipeline': {
    name: 'Content Pipeline Pro',
    description: 'End-to-end content automation system. Ideation → production → distribution → repurposing. Built in Make/Zapier.',
    unit_amount: 14700,
  },
  'brand-deal': {
    name: 'Brand Deal Negotiation Pack',
    description: '12 proven email scripts and contract templates for brand partnerships. Stop leaving money on the table in negotiations.',
    unit_amount: 4900,
  },
  'revenue-dashboard': {
    name: 'Revenue Dashboard Kit',
    description: 'Custom Google Sheets + Notion dashboard that consolidates your income streams, tracks growth, and surfaces opportunities.',
    unit_amount: 6700,
  },
  'social-assets': {
    name: 'Social Media Asset Pack',
    description: '200+ Canva templates designed for premium positioning. Covers YouTube, Instagram, LinkedIn, TikTok, and Twitter/X.',
    unit_amount: 3700,
  },
  'launch-sequence': {
    name: 'Launch Sequence Playbook',
    description: 'Step-by-step digital product launch system. Email sequences, pre-launch content plan, and post-launch optimization framework.',
    unit_amount: 8900,
  },
  'ai-prompt-vault': {
    name: 'AI Prompt Vault',
    description: '500+ battle-tested prompts for content creation, copywriting, strategy, and ideation. Plug directly into ChatGPT or Claude and produce elite output instantly.',
    unit_amount: 7900,
  },
  'newsletter-engine': {
    name: 'Newsletter Growth Engine',
    description: 'Proven email templates, monetization sequences, and a 90-day growth playbook to turn your newsletter into a revenue-generating asset.',
    unit_amount: 5900,
  },
  'video-repurpose-kit': {
    name: 'Video Repurposing Masterkit',
    description: 'Turn one long-form video into 15+ pieces of content. Includes SOP, cut templates, caption workflows, and a full distribution checklist.',
    unit_amount: 4400,
  },
  'seo-content-matrix': {
    name: 'SEO Content Matrix',
    description: 'Research-to-publish content system engineered for organic traffic. Keyword clustering, content briefs, internal linking strategy, and a Notion tracker.',
    unit_amount: 6900,
  },
  'affiliate-stack': {
    name: 'Affiliate Revenue Stack',
    description: 'Build passive affiliate income with plug-and-play systems. Includes link tracking setup, disclosure templates, content formats, and a monthly review SOP.',
    unit_amount: 5400,
  },
  'podcast-launch-kit': {
    name: 'Podcast Launch Kit',
    description: 'Everything you need to launch and monetize a podcast in 30 days. Cover art brief, episode structure templates, sponsor pitch deck, and a distribution checklist.',
    unit_amount: 7900,
  },
  'creator-legal-pack': {
    name: 'Creator Legal Pack',
    description: 'Professional contracts, disclaimers, and TOS templates written for online creators. Covers brand deals, coaching, digital products, and UGC agreements.',
    unit_amount: 12900,
  },
  'email-monetization': {
    name: 'Email Monetization Playbook',
    description: 'Proven sequences, offer frameworks, and segmentation strategies to convert your email list into predictable recurring revenue — without burning out your audience.',
    unit_amount: 8400,
  },
  'course-blueprint': {
    name: 'Digital Course Blueprint',
    description: 'End-to-end system to outline, build, and sell an online course. Includes curriculum framework, sales page template, pricing strategy, and launch timeline.',
    unit_amount: 11900,
  },
  'time-blocking-system': {
    name: 'Elite Time Blocking System',
    description: 'Calendar architecture and Google Calendar templates built for creators who need to protect deep work. Includes weekly rhythm guide and energy audit worksheet.',
    unit_amount: 3900,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://screwedscore.com'

  const requestOrigin = req.headers.origin as string | undefined
  const allowedOrigins = [
    origin,
    origin.replace('https://', 'https://www.'),
    origin.replace('https://www.', 'https://'),
  ]
  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { product_id } = req.body as { product_id?: string }
  if (!product_id || !PRODUCTS[product_id]) {
    return res.status(400).json({ error: 'Invalid product_id' })
  }

  const product = PRODUCTS[product_id]

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: product.unit_amount,
          product_data: {
            name: product.name,
            description: product.description,
          },
        },
        quantity: 1,
      }],
      metadata: { product_id },
      success_url: `${origin}/productivity/success?product=${product_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/productivity`,
      allow_promotion_codes: true,
      customer_creation: 'always',
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[product-checkout]', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
