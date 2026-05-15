/**
 * Operator-only endpoint: takes uploaded vendor bills, returns a structured
 * audit-report draft (matching docs/business-audit-report-template.md).
 *
 * Auth: header `x-audit-admin-key` must equal env BUSINESS_AUDIT_ADMIN_KEY.
 * Not exposed in any UI — call via curl/Postman from operator's machine.
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { extractTextFromBuffer, checkMagicBytes } from '@/lib/extract'
import { logError } from '@/lib/log'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_FILES = 12
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_TEXT = 80_000

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 120_000,
})

const SYSTEM_PROMPT = `You are a senior SMB bill auditor. You read vendor bills (card processing, telecom, waste, linen, pest, SaaS, insurance, utilities) for independent restaurants and small businesses and find money that is being silently overpaid.

You will receive the extracted text of multiple bills from one business. Identify every fixable overcharge: junk fees, above-market rates, redundant line items, auto-escalated rates, unused services, contract auto-renewals that should be renegotiated.

Return ONLY valid JSON (no markdown, no commentary) matching this exact structure:
{
  "business_summary": {
    "total_annual_leak_usd": number,
    "bills_reviewed": number,
    "issue_count": number,
    "quickest_win": "one line",
    "biggest_win": "one line",
    "estimated_fix_time": "one line",
    "owner_takeaway": "2-3 sentence plain-English summary the owner reads first"
  },
  "bills": [
    {
      "vendor": "string",
      "bill_type": "string (e.g. Credit Card Processing, Internet, Waste, Linen)",
      "current_monthly_spend_usd": number,
      "annualized_spend_usd": number,
      "effective_rate_pct": number or null,
      "industry_benchmark_pct": number or null,
      "identified_annual_savings_usd": number,
      "issues": [
        {
          "title": "short label",
          "monthly_cost_usd": number,
          "explanation": "1-2 sentence plain English",
          "fix": "what to ask for / what it should look like"
        }
      ],
      "recommended_action": "RENEGOTIATE|SWITCH|CANCEL",
      "phone_script": {
        "goal": "one line",
        "best_time_to_call": "one line",
        "opening": "the actual words to say, in quotes-style first person",
        "if_pushback": "one line response",
        "if_no": "one line response"
      },
      "alternative_vendor": { "name": "string or null", "why": "one line", "switch_effort": "1 day|1 week|1 month" }
    }
  ],
  "action_order": [
    { "bill": "vendor name", "effort": "string", "annual_win_usd": number, "why_this_order": "one line" }
  ]
}

Rules:
- Be conservative and defensible on dollar figures. If the bill text doesn't show enough info, set numeric fields to 0 and note the gap in the issue explanation.
- Use real industry benchmarks for the vertical when known (e.g. card processing effective rate for restaurants ~2.2-2.6%).
- Order action_order by (dollar value × ease) — biggest fastest win first.
- If a bill has no identifiable issues, still include it with issues:[] and identified_annual_savings_usd:0.
- Never invent line items that aren't in the bill text. Flag missing info instead of fabricating.`

type AnalyzerOutput = {
  business_summary: {
    total_annual_leak_usd: number
    bills_reviewed: number
    issue_count: number
    quickest_win: string
    biggest_win: string
    estimated_fix_time: string
    owner_takeaway: string
  }
  bills: Array<Record<string, unknown>>
  action_order: Array<Record<string, unknown>>
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const adminKey = process.env.BUSINESS_AUDIT_ADMIN_KEY
  if (!adminKey) {
    return NextResponse.json({ error: 'Analyzer not configured.' }, { status: 503 })
  }
  if (req.headers.get('x-audit-admin-key') !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const form = await req.formData()
    const businessName = String(form.get('business_name') ?? '').trim().slice(0, 200)
    const industry = String(form.get('industry') ?? '').trim().slice(0, 80)
    const period = String(form.get('period') ?? '').trim().slice(0, 80)

    if (!businessName) {
      return NextResponse.json({ error: 'business_name required' }, { status: 400 })
    }

    const files = form.getAll('files').filter((f): f is File => f instanceof File)
    if (files.length === 0) {
      return NextResponse.json({ error: 'At least one bill file required' }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Max ${MAX_FILES} files` }, { status: 400 })
    }

    const extracted: Array<{ filename: string; text: string }> = []
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: `${file.name} exceeds 10MB` }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      try {
        checkMagicBytes(buffer, file.type)
      } catch (err) {
        return NextResponse.json(
          { error: `${file.name}: ${(err as Error).message}` },
          { status: 400 }
        )
      }
      const text = await extractTextFromBuffer(buffer, file.type)
      extracted.push({ filename: file.name, text })
    }

    const combined = extracted
      .map(e => `=== FILE: ${e.filename} ===\n${e.text}`)
      .join('\n\n')
    const truncated =
      combined.length > MAX_TOTAL_TEXT
        ? combined.slice(0, MAX_TOTAL_TEXT) + '\n[truncated]'
        : combined

    const userPrompt = `Business: ${businessName}
Industry: ${industry || 'unspecified'}
Period covered: ${period || 'unspecified'}
Files submitted: ${files.length}

--- BILL TEXTS ---
${truncated}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const block = response.content[0]
    if (!block || block.type !== 'text') {
      throw new Error('Analyzer returned no text content')
    }
    const jsonMatch = block.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Analyzer did not return JSON')

    const parsed = JSON.parse(jsonMatch[0]) as AnalyzerOutput

    const report_markdown = renderReportMarkdown(parsed, businessName, period, files.length)

    return NextResponse.json({
      ok: true,
      analysis: parsed,
      report_markdown,
      files_processed: extracted.map(e => ({ filename: e.filename, chars: e.text.length })),
    })
  } catch (err) {
    await logError('business-audit-analyze', err)
    return NextResponse.json(
      { error: (err as Error).message || 'Analysis failed' },
      { status: 500 }
    )
  }
}

function renderReportMarkdown(
  a: AnalyzerOutput,
  businessName: string,
  period: string,
  fileCount: number
): string {
  const today = new Date().toISOString().slice(0, 10)
  const s = a.business_summary
  const bills = a.bills ?? []
  const actions = a.action_order ?? []

  const billSections = bills
    .map((b, i) => {
      const issues = (b.issues as Array<Record<string, unknown>> | undefined) ?? []
      const script = (b.phone_script as Record<string, unknown> | undefined) ?? {}
      return `### ${i + 1} · ${b.vendor ?? 'Unknown'}  ·  ${b.bill_type ?? ''}

| | |
|---|---|
| Current monthly spend | $${fmt(b.current_monthly_spend_usd)} |
| Annualized | $${fmt(b.annualized_spend_usd)} |
| Effective rate | ${b.effective_rate_pct ?? '—'}% |
| Industry benchmark | ${b.industry_benchmark_pct ?? '—'}% |
| **Identified annual savings** | **$${fmt(b.identified_annual_savings_usd)}** |

**Issues found:**
${issues.length === 0 ? '_None identified._' : issues
  .map((iss, n) => `${n + 1}. **${iss.title}** — $${fmt(iss.monthly_cost_usd)}/mo. ${iss.explanation}\n   *Fix:* ${iss.fix}`)
  .join('\n')}

**Recommended action:** **${b.recommended_action ?? '—'}**

**Phone script — ${script.goal ?? ''}**
_Best time to call: ${script.best_time_to_call ?? '—'}_

> ${script.opening ?? ''}

- If pushback: ${script.if_pushback ?? '—'}
- If no: ${script.if_no ?? '—'}
`
    })
    .join('\n---\n\n')

  const actionTable = actions
    .map((act, i) => `| ${i + 1} | ${act.bill} | ${act.effort} | $${fmt(act.annual_win_usd)} | ${act.why_this_order} |`)
    .join('\n')

  return `# Bill Audit Report

**For:** ${businessName}
**Prepared:** ${today}
**Auditor:** ScrewedScore — screwedscore.com
**Bills reviewed:** ${fileCount} bills · ${period || 'period unspecified'}
**Confidential** — prepared exclusively for ${businessName}

---

## Executive Summary

| | |
|---|---|
| **Total annual leak identified** | **$${fmt(s.total_annual_leak_usd)}** |
| Bills reviewed | ${s.bills_reviewed} |
| Issues found | ${s.issue_count} |
| Quickest win | ${s.quickest_win} |
| Biggest win | ${s.biggest_win} |
| Estimated total fix time | ${s.estimated_fix_time} |

> **One-line takeaway for the owner:**
> ${s.owner_takeaway}

---

## Bill-by-Bill Findings

${billSections}

---

## Recommended Action Order

| # | Bill | Effort | Annual Win | Why this order |
|---|------|--------|-----------:|---------------|
${actionTable}

---

## Methodology & Disclaimers

- Findings are based on bills submitted by ${businessName} on ${today}. We did not contact vendors directly during this audit.
- Savings projections assume successful renegotiation or vendor switch. Real outcomes depend on conversation and vendor flexibility.
- Industry benchmarks sourced from public rate cards, vendor websites, and our internal database.
- This report is confidential and intended only for ${businessName}.

**Money-back guarantee:** if total identified annual savings is less than $1,500, ScrewedScore will refund the audit fee in full.

---

*Prepared by ScrewedScore · screwedscore.com · sledheadspl@gmail.com*
`
}

function fmt(n: unknown): string {
  const num = typeof n === 'number' ? n : 0
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
