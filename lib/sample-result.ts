import type { AnalysisResult } from '@/lib/types'

// Demo payload for the "See a live example first" button. Imported dynamically
// so it stays out of the landing-page chunk — it is only needed once a visitor
// asks for the sample.
export const SAMPLE_RESULT: AnalysisResult = {
  id: 'sample',
  document_type: 'mechanic_invoice',
  language: 'en',
  screwed_score: 'SCREWED',
  screwed_score_reason: 'This invoice has 2 critical overcharges, 3 high-severity red flags, and $847 in suspicious charges.',
  screwed_score_percent: 82,
  plain_summary: 'This mechanic invoice bills labor at roughly 3× the standard book rate, marks up parts by 180%, and charges a "diagnostic fee" that appears twice. The total amount is significantly higher than industry norms for the services listed.',
  what_they_tried: [
    'Labor billed at $210/hr — industry average for this region is $65–$95/hr',
    'OEM brake pads listed at $340 — same part retails for $55–$90 at any auto parts store',
    '"Diagnostic fee" of $89 charged twice under different line items',
  ],
  what_to_do_next: [
    'Ask for an itemized breakdown of the $847 in flagged charges before paying',
    'Request the shop\'s posted labor rate — they\'re required to display it',
    'Do not pay until the duplicate diagnostic fee is removed in writing',
    'Get a second opinion from another shop on the parts pricing',
  ],
  top_findings: [
    { severity: 'high', category: 'overcharge', title: 'Suspicious charge: Labor — Engine diagnostic & repair', description: 'Labor billed at $210/hr — industry average for this region is $65–$95/hr', original_text: 'Charged: $420', suggested_fix: 'Typical labor for this job runs $130–$190 total at standard rates', dollar_impact: 420 },
    { severity: 'high', category: 'overcharge', title: 'Suspicious charge: OEM Brake Pads (set of 4)', description: 'Parts marked up 180% over retail — same SKU available for $55–$90', original_text: 'Charged: $340', suggested_fix: 'Industry markup on parts is typically 20–40% over cost', dollar_impact: 340 },
    { severity: 'high', category: 'duplicate_charge', title: 'Duplicate: Diagnostic fee charged twice', description: '"Diagnostic fee" appears as both a line item ($89) and embedded in the labor total — same service billed under two names', original_text: 'Charged: $89', dollar_impact: 89 },
    { severity: 'medium', category: 'risky_clause', title: 'No written estimate authorization', description: 'Invoice lacks a signed authorization line — work was performed without documented customer approval of this cost', suggested_fix: 'Any repair over a threshold (usually $100) requires written authorization under most state consumer protection laws' },
    { severity: 'medium', category: 'missing_protection', title: 'Missing: Parts return policy', description: 'Invoice does not state whether removed parts were returned or are available for inspection — standard practice is to return old parts on request' },
  ],
  overcharge: {
    document_type: 'mechanic_invoice',
    line_items: [
      { description: 'Labor — Engine diagnostic & repair (2.0 hrs)', charged_amount: 420, flagged: true, flag_reason: 'Billed at $210/hr — regional average is $65–$95/hr', industry_context: 'Typical labor for this repair: $130–$190', benchmark_confidence: 'benchmarked', severity: 'high' },
      { description: 'OEM Brake Pads (set of 4)', charged_amount: 340, flagged: true, flag_reason: 'Parts marked up 180% over retail price', industry_context: 'Same part available for $55–$90', benchmark_confidence: 'benchmarked', severity: 'high' },
      { description: 'Diagnostic Fee', charged_amount: 89, flagged: true, flag_reason: 'Duplicate — also embedded in labor total', industry_context: 'Standard diagnostic fee: $50–$80, billed once', benchmark_confidence: 'benchmarked', severity: 'high' },
      { description: 'Shop Supplies & Disposal', charged_amount: 45, flagged: false, flag_reason: null, industry_context: null, severity: null },
      { description: 'Oil & Filter Change', charged_amount: 79, flagged: false, flag_reason: null, industry_context: null, severity: null },
    ],
    total_flagged_amount: 847,
    total_charged_amount: 973,
    industry_range_note: 'Total invoice is $847 above what this repair should reasonably cost at a licensed shop in most US markets.',
    top_concerns: [
      'Labor rate is 2–3× above market rate for this region',
      'Parts marked up significantly above retail — shop may be sourcing at cost and billing at MSRP+',
      'Duplicate diagnostic fee inflates the total by $89',
    ],
    summary: 'This invoice has $847 in flagged charges across three line items. The labor rate and parts markup are both significantly above industry norms, and the diagnostic fee appears to be charged twice.',
  },
  contract_guard: {
    contract_type: 'mechanic_invoice',
    detected_language: 'en',
    plain_english_summary: 'This mechanic invoice bills labor at roughly 3× the standard book rate, marks up parts by 180%, and charges a diagnostic fee twice.',
    key_terms: [],
    red_flags: [
      { title: 'No written estimate authorization', clause_text: 'Invoice lacks customer signature line for estimate approval', severity: 'high', issue: 'Work was performed without documented customer approval — this may violate your state\'s auto repair consumer protection laws', alternative_language: 'Customer authorizes repairs not to exceed $____. Additional work requires written approval.' },
      { title: 'No parts inspection clause', clause_text: 'Replaced parts not mentioned as available for return', severity: 'medium', issue: 'You have a right to inspect removed parts in most states. Not offering this is a red flag.', alternative_language: 'All replaced parts will be returned to customer upon request.' },
      { title: 'Vague labor description', clause_text: 'Labor — Engine diagnostic & repair (2.0 hrs)', severity: 'medium', issue: 'Labor line does not specify what was actually repaired — leaves room for billing disputes' },
    ],
    green_flags: [],
    missing_protections: [
      { protection_name: 'Written estimate authorization', why_important: 'Most states require shops to get written approval before exceeding an estimate', risk_without_it: 'You may have limited recourse if the final bill is higher than verbally quoted', suggested_language: 'All repairs require written authorization. No work will exceed the authorized amount without customer approval.' },
    ],
    overall_grade: 'D',
    questions_to_ask: [
      'Can you show me your posted labor rate? (Shops are required to display this.)',
      'Why does the diagnostic fee appear twice on this invoice?',
      'Can I see the old parts that were replaced?',
    ],
    pro_tips: [
      'Always get a written estimate before authorizing any repair over $100',
      'You can dispute inflated charges with your state\'s Bureau of Automotive Repair',
    ],
  },
  is_public: false,
  created_at: new Date().toISOString(),
}

export default SAMPLE_RESULT
