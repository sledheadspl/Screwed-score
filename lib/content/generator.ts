/**
 * Content Generation Engine
 * Generates contextual content based on risk level derived from screwedScorePercent.
 * Server-side only.
 */
import type { RiskLevel } from '@/lib/types/automation'

interface GenerateContentOptions {
  prompt: string
  screwedScorePercent: number
  documentType?: string
  maxTokens?: number
}

export function getRiskLevel(screwedScorePercent: number): RiskLevel {
  if (screwedScorePercent > 75) return 'High'
  if (screwedScorePercent >= 40) return 'Moderate'
  return 'Low'
}

const RISK_SYSTEM_PROMPTS: Record<RiskLevel, string> = {
  High: `You are a consumer defense advocate. The document analyzed has a HIGH risk score (>75%).
Be direct, urgent, and action-oriented. Use clear language that motivates immediate action.
Highlight the severity of findings and provide concrete steps to protect the consumer.`,

  Moderate: `You are a consumer advisor. The document analyzed has a MODERATE risk score (40-75%).
Be balanced but informative. Acknowledge concerns while providing practical guidance.
Help the consumer understand what to watch for and how to negotiate.`,

  Low: `You are a consumer information assistant. The document analyzed has a LOW risk score (<40%).
Be reassuring but thorough. Confirm what looks good and note any minor items to be aware of.
Keep tone positive while ensuring the consumer stays informed.`,
}

export async function generateContent(options: GenerateContentOptions): Promise<string> {
  const { prompt, screwedScorePercent, documentType = 'document', maxTokens = 800 } = options

  const riskLevel = getRiskLevel(screwedScorePercent)
  const systemPrompt = RISK_SYSTEM_PROMPTS[riskLevel]

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000 })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Document type: ${documentType}\nRisk level: ${riskLevel} (${screwedScorePercent}%)\n\n${prompt}`,
    }],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') throw new Error('Content generation returned no text')
  return block.text.trim()
}

export async function generateVendorReputationSummary(params: {
  vendorName: string
  category: string
  totalAnalyses: number
  screwedCount: number
  maybeCount: number
  safeCount: number
  avgScrewedPercent: number
  totalFlaggedAmount: number
}): Promise<string> {
  const {
    vendorName, category, totalAnalyses, screwedCount,
    maybeCount, safeCount, avgScrewedPercent, totalFlaggedAmount,
  } = params

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000 })

  const prompt = `Generate a 2-3 sentence consumer reputation summary for this vendor:

Name: ${vendorName}
Category: ${category}
Total documents analyzed: ${totalAnalyses}
SCREWED verdicts: ${screwedCount} (${totalAnalyses > 0 ? Math.round((screwedCount / totalAnalyses) * 100) : 0}%)
MAYBE verdicts: ${maybeCount}
SAFE verdicts: ${safeCount}
Average risk score: ${Math.round(avgScrewedPercent)}%
Total amount flagged across all documents: $${Math.round(totalFlaggedAmount).toLocaleString()}

Write a factual, data-driven summary a consumer would find helpful. Do not editorialize excessively.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') throw new Error('Reputation summary generation failed')
  return block.text.trim()
}
