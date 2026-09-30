#!/usr/bin/env node
/**
 * One-time setup script: creates the 5 ScrewedScore Academy products + prices
 * in Stripe (live mode, using your existing STRIPE_SECRET_KEY), then patches
 * pages/api/product-checkout/index.ts in place, replacing the placeholder
 * price_REPLACE_ACADEMY_* strings with the real price IDs Stripe returns.
 *
 * Run from the repo root:
 *   node scripts/create-academy-stripe-prices.js
 *
 * Safe to re-run: each Product/Price creation call carries an idempotency key
 * derived from the product slug, so running this twice will not create
 * duplicates in Stripe — it will just return the same IDs again. If the
 * placeholders in product-checkout/index.ts have already been replaced with
 * real IDs, the file patch step for that product is skipped automatically.
 */

const fs = require('fs')
const path = require('path')

const ENV_LOCAL_PATH = path.join(__dirname, '..', '.env.local')
const CHECKOUT_FILE = path.join(__dirname, '..', 'pages', 'api', 'product-checkout', 'index.ts')

function loadStripeKeyFromEnvLocal() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    throw new Error(`STRIPE_SECRET_KEY not set and ${ENV_LOCAL_PATH} not found.`)
  }
  const content = fs.readFileSync(ENV_LOCAL_PATH, 'utf8')
  const match = content.split('\n').find(l => l.startsWith('STRIPE_SECRET_KEY='))
  if (!match) throw new Error('STRIPE_SECRET_KEY not found in .env.local')
  return match.slice('STRIPE_SECRET_KEY='.length).trim()
}

const PRODUCTS = [
  {
    slug: 'academy-estimate-mastery',
    placeholder: 'price_REPLACE_ACADEMY_ESTIMATE_MASTERY',
    name: 'Repair Estimate Mastery — ScrewedScore Academy',
    description: 'A complete 7-module course in reading, questioning, and negotiating any auto repair estimate.',
    amountCents: 3900,
  },
  {
    slug: 'academy-check-engine',
    placeholder: 'price_REPLACE_ACADEMY_CHECK_ENGINE',
    name: 'Check Engine Light: Complete Diagnostic Course — ScrewedScore Academy',
    description: 'A complete 7-module course to diagnose your own check engine light with the same systematic process a shop uses.',
    amountCents: 3900,
  },
  {
    slug: 'academy-noise-diagnosis',
    placeholder: 'price_REPLACE_ACADEMY_NOISE_DIAGNOSIS',
    name: 'Car Noise Diagnosis: Complete Course — ScrewedScore Academy',
    description: "A complete 7-module course to train your ear system by system and stop guessing at what's making that sound.",
    amountCents: 2900,
  },
  {
    slug: 'academy-fight-back',
    placeholder: 'price_REPLACE_ACADEMY_FIGHT_BACK',
    name: 'Fight Back: Complete Dispute & Consumer Protection Course — ScrewedScore Academy',
    description: 'A complete 7-module system for disputing bad bills, bad charges, and bad service — with the letters and scripts already written.',
    amountCents: 3900,
  },
  {
    slug: 'academy-bundle',
    placeholder: 'price_REPLACE_ACADEMY_BUNDLE',
    name: 'ScrewedScore Academy — Complete Bundle',
    description: 'All four ScrewedScore Academy courses, 28 modules total, at a bundled price.',
    amountCents: 10600,
  },
]

async function main() {
  const secretKey = loadStripeKeyFromEnvLocal()
  const Stripe = require('stripe')
  const stripe = new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' })

  if (!fs.existsSync(CHECKOUT_FILE)) {
    throw new Error(`Could not find ${CHECKOUT_FILE} — run this from the repo root.`)
  }
  let checkoutSource = fs.readFileSync(CHECKOUT_FILE, 'utf8')

  const results = []

  for (const p of PRODUCTS) {
    if (!checkoutSource.includes(p.placeholder)) {
      console.log(`[skip] ${p.slug}: placeholder already replaced in product-checkout/index.ts`)
      continue
    }

    console.log(`[stripe] Creating product: ${p.name}`)
    const product = await stripe.products.create(
      { name: p.name, description: p.description, metadata: { academy_slug: p.slug } },
      { idempotencyKey: `academy-product-${p.slug}` }
    )

    console.log(`[stripe] Creating price: $${(p.amountCents / 100).toFixed(2)} for ${p.slug}`)
    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: p.amountCents,
        currency: 'usd',
        metadata: { academy_slug: p.slug },
      },
      { idempotencyKey: `academy-price-${p.slug}` }
    )

    console.log(`[stripe] ${p.slug} -> ${price.id}`)
    checkoutSource = checkoutSource.split(p.placeholder).join(price.id)
    results.push({ slug: p.slug, product_id: product.id, price_id: price.id })
  }

  if (results.length > 0) {
    fs.writeFileSync(CHECKOUT_FILE, checkoutSource, 'utf8')
    console.log(`\nPatched ${CHECKOUT_FILE} with ${results.length} real price ID(s).`)
  } else {
    console.log('\nNothing to patch — all placeholders were already replaced.')
  }

  console.log('\nSummary:')
  for (const r of results) {
    console.log(`  ${r.slug}: product=${r.product_id} price=${r.price_id}`)
  }
  console.log('\nDone. Review the diff in pages/api/product-checkout/index.ts, commit it, and redeploy.')
}

main().catch(err => {
  console.error('\n[error]', err.message || err)
  process.exit(1)
})
