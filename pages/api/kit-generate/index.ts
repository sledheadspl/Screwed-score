import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'
import type { DocumentType } from '@/lib/types'

const stripe    = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
const anthropic = new Anthropic()

export interface KitContent {
  demand_letter:    string
  phone_script:     string
  chargeback_guide: string
  escalation_steps: string[]
  followup_emails:  { day3: string; day7: string; day14: string }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { session_id, analysis_id } = req.body as { session_id?: string; analysis_id?: string }
  if (!session_id || !analysis_id) {
    return res.status(400).json({ error: 'session_id and analysis_id required' })
  }

  // Verify payment
  let stripeSession
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(session_id)
  } catch {
    return res.status(400).json({ error: 'Invalid session' })
  }

  if (stripeSession.payment_status !== 'paid') {
    return res.status(402).json({ error: 'Payment not completed' })
  }

  if (stripeSession.metadata?.analysis_id !== analysis_id) {
    return res.status(403).json({ error: 'Session does not match analysis' })
  }

  // Fetch analysis
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysis_id)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Analysis not found' })

  const docLabel  = DOCUMENT_TYPE_LABELS[data.document_type as DocumentType] ?? 'Document'
  const overcharge    = data.overcharge_output    ?? {}
  const contractGuard = data.contract_guard_output ?? {}

  const flaggedItems = ((overcharge.line_items ?? []) as Array<{
    flagged: boolean; description: string; charged_amount?: number | null; flag_reason?: string | null
  }>).filter(i => i.flagged)

  const totalFlagged: number = overcharge.total_flagged_amount ?? 0
  const redFlags = (contractGuard.red_flags ?? []) as Array<{ title: string; severity: string; issue: string }>

  const issueContext = [
    flaggedItems.length > 0
      ? `BILLING ISSUES:\n${flaggedItems.map(i =>
          `- ${i.description}${i.charged_amount != null ? `: $${i.charged_amount.toFixed(2)}` : ''}${i.flag_reason ? ` — ${i.flag_reason}` : ''}`
        ).join('\n')}`
      : null,
    redFlags.length > 0
      ? `CONTRACT ISSUES:\n${redFlags.map(f => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.issue}`).join('\n')}`
      : null,
    `OVERALL VERDICT: ${data.screwed_score_reason ?? ''}`,
    totalFlagged > 0 ? `TOTAL AMOUNT FLAGGED: $${totalFlagged.toFixed(2)}` : null,
  ].filter(Boolean).join('\n\n')

  const prompt = `You are a consumer rights expert generating a complete Fight Back Kit for someone whose ${docLabel} was rated "${data.screwed_score}" by AI analysis.

ANALYSIS CONTEXT:
${issueContext}

Generate a complete Fight Back Kit as valid JSON with this exact structure. Be specific, actionable, and personalized to the issues above.

{
  "demand_letter": "Full formal demand letter. Use [YOUR NAME], [DATE], [YOUR ADDRESS], [YOUR PHONE], [YOUR EMAIL] as placeholders. Open with the specific ${docLabel} date/vendor. Reference each specific issue with exact dollar amounts. Demand specific resolution (refund/correction/clause removal). Set a firm 14-day deadline for written response. Cite relevant consumer protection law (e.g., FCBA for billing disputes, state consumer protection statutes). Close with a clear escalation warning (state AG complaint, BBB, small claims court). Use proper letter formatting.",
  "phone_script": "Complete word-for-word phone script. Include: exact opening line using [YOUR NAME], how to state the problem clearly and specifically, exact amounts and charge names to cite, the precise ask ('I am requesting...'), three specific responses to common pushbacks ('We can't do that' / 'That's our policy' / 'Let me transfer you'), and how to end the call with next steps documented. Format with labeled sections like OPENING:, STATING THE PROBLEM:, THE ASK:, IF THEY PUSHBACK:, CLOSING:.",
  "chargeback_guide": "Step-by-step credit card chargeback instructions. Cover: (1) When chargebacks apply and when they don't, (2) Exact phrase to use when calling the number on back of your card, (3) What dispute reason code to select, (4) What documentation to gather from this analysis to support the claim, (5) Timeline — how long it takes and what to expect, (6) What to do if the chargeback is denied. Be specific and practical.",
  "escalation_steps": [
    "Step 1: [specific action]",
    "Step 2: [specific action]",
    "Step 3: [specific action]",
    "Step 4: [specific action]",
    "Step 5: [specific action]"
  ],
  "followup_emails": {
    "day3": "Subject: [subject line]\\n\\n[Full email body — professional, references the original dispute, notes it has been 3 days with no response, re-states the demand, mentions next steps if unresolved by a new deadline]",
    "day7": "Subject: [subject line]\\n\\n[Full email body — firmer tone, references prior communications, states a hard deadline, mentions specific escalation actions that will be taken]",
    "day14": "Subject: [subject line — FINAL NOTICE]\\n\\n[Full email body — final notice tone, confirms escalation steps are being initiated today, lists exactly which agencies/platforms will be notified, gives one last chance to resolve]"
  }
}

Return ONLY valid JSON. No markdown fences, no explanation outside the JSON.`

  try {
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      messages:   [{ role: 'user', content: prompt }],
    })

    const block = message.content[0]
    if (!block || block.type !== 'text') {
      return res.status(500).json({ error: 'Generation failed' })
    }

    let kit: KitContent
    try {
      kit = JSON.parse(block.text)
    } catch {
      // Strip any accidental markdown fences and retry
      const cleaned = block.text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
      try {
        kit = JSON.parse(cleaned)
      } catch {
        return res.status(500).json({ error: 'Failed to parse kit content' })
      }
    }

    return res.status(200).json({ kit })
  } catch (err) {
    console.error('[kit-generate]', err)
    return res.status(500).json({ error: 'Failed to generate kit' })
  }
}
