import { createServiceClient } from '@/lib/supabase'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomGroup(): string {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

export function generateLicenseKey(): string {
  return `CLIP-${randomGroup()}-${randomGroup()}-${randomGroup()}-${randomGroup()}`
}

export type ClipPilotTier = 'pro' | 'unlimited'

const CLIPPILOT_PRODUCTS: Record<string, ClipPilotTier> = {
  'clippilot-pro':             'pro',
  'clippilot-pro-yearly':      'pro',
  'clippilot-unlimited':       'unlimited',
  'clippilot-unlimited-yearly':'unlimited',
}

export function getClipPilotTier(productId: string): ClipPilotTier | null {
  return CLIPPILOT_PRODUCTS[productId] ?? null
}

export async function createLicense(opts: {
  stripeSessionId: string
  customerEmail: string
  productId: string
  tier: ClipPilotTier
}): Promise<string> {
  const supabase = createServiceClient()

  // Check if license already exists for this session (idempotent)
  const { data: existing } = await supabase
    .from('clippilot_licenses')
    .select('license_key')
    .eq('stripe_session_id', opts.stripeSessionId)
    .maybeSingle()

  if (existing) return existing.license_key

  // Generate a unique key
  let key = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateLicenseKey()
    const { data: conflict } = await supabase
      .from('clippilot_licenses')
      .select('id')
      .eq('license_key', candidate)
      .maybeSingle()
    if (!conflict) { key = candidate; break }
  }

  if (!key) throw new Error('Failed to generate unique license key')

  const { error } = await supabase.from('clippilot_licenses').insert({
    license_key:       key,
    tier:              opts.tier,
    stripe_session_id: opts.stripeSessionId,
    customer_email:    opts.customerEmail,
    product_id:        opts.productId,
  })

  if (error) throw new Error(`Failed to store license: ${error.message}`)
  return key
}

export async function validateLicenseKey(key: string): Promise<{
  valid: boolean
  tier: ClipPilotTier | null
}> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('clippilot_licenses')
    .select('tier, is_active')
    .eq('license_key', key)
    .maybeSingle()

  if (!data || !data.is_active) return { valid: false, tier: null }
  return { valid: true, tier: data.tier as ClipPilotTier }
}
