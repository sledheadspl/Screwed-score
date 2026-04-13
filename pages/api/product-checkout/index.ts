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
    name: 'AI Prompt Vault for Creators',
    description: '500+ battle-tested AI prompts organized by creator use case. Content, email, ads, scripts, and strategy. Copy, paste, ship.',
    unit_amount: 4700,
  },
  'youtube-accelerator': {
    name: 'YouTube Growth Accelerator',
    description: 'Channel audit framework, click-worthy title formula, thumbnail psychology, 48-hour algorithm playbook, and full SEO system.',
    unit_amount: 9700,
  },
  'email-list-builder': {
    name: 'Email List Builder System',
    description: '10 lead magnet blueprints, opt-in page copy framework, and a fully-written 14-day welcome sequence that turns subscribers into buyers.',
    unit_amount: 7900,
  },
  'viral-content-formula': {
    name: 'Viral Content Formula',
    description: 'The repeatable framework behind viral content. 90 hook templates, platform-specific formats, and a repurposing matrix to multiply reach.',
    unit_amount: 6700,
  },
  'freelance-rate-kit': {
    name: 'Freelance Rate Masterclass Kit',
    description: 'Rate calculation worksheets, 15 client pitch scripts, negotiation playbook, scope creep prevention, and annual raise templates.',
    unit_amount: 5700,
  },
  'personal-brand-kit': {
    name: 'Personal Brand Positioning Kit',
    description: 'Niche clarity framework, unique value proposition builder, 20 bio templates per platform, and a complete content pillars architecture.',
    unit_amount: 4700,
  },
  'creator-legal-toolkit': {
    name: 'Creator Legal Toolkit',
    description: '7 plug-and-play contract templates: influencer agreements, brand deals, collabs, NDA, freelance contracts, and licensing rights.',
    unit_amount: 8900,
  },
  'passive-income-blueprint': {
    name: 'Passive Income Blueprint',
    description: '7 proven passive income streams for creators — each with a step-by-step implementation roadmap and income projection worksheet.',
    unit_amount: 9700,
  },
  'video-script-formula': {
    name: 'Video Script & Hook Formula',
    description: '50 proven hook templates, the 4-part high-retention script structure, pattern interrupt techniques, and platform adaptation guides.',
    unit_amount: 6700,
  },
  'course-creator-kit': {
    name: 'Digital Course Creator Kit',
    description: 'Complete system to build and sell a $500+ course: curriculum planner, full sales page copy template, and a 7-email launch sequence.',
    unit_amount: 12700,
  },
  'clippilot-pro': {
    name: 'ClipPilot Pro — Monthly',
    description: '100 clips/month, no watermark, auto-publish to TikTok, YouTube Shorts & Twitter/X. License key delivered by email.',
    unit_amount: 1900,
  },
  'clippilot-pro-yearly': {
    name: 'ClipPilot Pro — Annual',
    description: '100 clips/month, no watermark, auto-publish to all platforms. Annual billing — save $79/yr. License key delivered by email.',
    unit_amount: 14900,
  },
  'clippilot-unlimited': {
    name: 'ClipPilot Unlimited — Monthly',
    description: 'Unlimited clips, white-label, API access, priority support. License key delivered by email.',
    unit_amount: 4900,
  },
  'clippilot-unlimited-yearly': {
    name: 'ClipPilot Unlimited — Annual',
    description: 'Unlimited clips, white-label, API access, priority support. Annual billing — save $189/yr. License key delivered by email.',
    unit_amount: 39900,
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
      success_url: product_id.startsWith('clippilot')
        ? `${origin}/clippilot/success?product=${product_id}&session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/productivity/success?product=${product_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: product_id.startsWith('clippilot') ? `${origin}/clippilot#pricing` : `${origin}/productivity`,
      allow_promotion_codes: true,
      customer_creation: 'always',
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[product-checkout]', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
