/**
 * Automation Engine — dispatches jobs by type, runs them synchronously.
 * All jobs are logged to the automation_jobs table.
 * Server-side only.
 */
import { createServiceClient } from '@/lib/supabase'
import type { AutomationJobType, AutomationJobStatus, RunAutomationResponse } from '@/lib/types/automation'
import { generateContent } from '@/lib/content/generator'

export async function runAutomationJob(
  type: AutomationJobType,
  input: Record<string, unknown>
): Promise<RunAutomationResponse> {
  const supabase = createServiceClient()

  // Insert job record
  const { data: job, error: insertErr } = await supabase
    .from('automation_jobs')
    .insert({ type, status: 'running' as AutomationJobStatus, input })
    .select('id')
    .single()

  if (insertErr || !job) {
    return { job_id: 'unknown', status: 'failed', output: null, error: 'Failed to create job record' }
  }

  const jobId: string = job.id
  let output: Record<string, unknown> | null = null
  let jobError: string | null = null
  let status: AutomationJobStatus = 'completed'

  try {
    switch (type) {
      case 'text_generation':
        output = await handleTextGeneration(input)
        break
      case 'invoice_analysis':
        output = await handleInvoiceAnalysis(input)
        break
      case 'summary':
        output = await handleSummary(input)
        break
      case 'generic':
        output = await handleGeneric(input)
        break
    }
  } catch (err: unknown) {
    status = 'failed'
    jobError = err instanceof Error ? err.message : String(err)
  }

  // Update job record
  await supabase
    .from('automation_jobs')
    .update({ status, output, error: jobError, completed_at: new Date().toISOString() })
    .eq('id', jobId)

  return { job_id: jobId, status, output, error: jobError }
}

async function handleTextGeneration(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const prompt = typeof input.prompt === 'string' ? input.prompt : ''
  const screwedScorePercent = typeof input.screwed_score_percent === 'number' ? input.screwed_score_percent : 0
  const documentType = typeof input.document_type === 'string' ? input.document_type : 'unknown'

  if (!prompt) throw new Error('text_generation requires input.prompt')

  const text = await generateContent({ prompt, screwedScorePercent, documentType })
  return { text }
}

async function handleInvoiceAnalysis(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Delegate to the existing overcharge module if analysis_id provided
  const analysisId = typeof input.analysis_id === 'string' ? input.analysis_id : null
  if (!analysisId) throw new Error('invoice_analysis requires input.analysis_id')

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('overcharge_output, screwed_score, screwed_score_percent')
    .eq('id', analysisId)
    .single()

  if (error || !data) throw new Error('Analysis not found')

  return {
    analysis_id: analysisId,
    overcharge_output: data.overcharge_output,
    screwed_score: data.screwed_score,
    screwed_score_percent: data.screwed_score_percent,
  }
}

async function handleSummary(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const text = typeof input.text === 'string' ? input.text : ''
  if (!text) throw new Error('summary requires input.text')

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000 })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Summarize the following in 2-3 sentences, plain language:\n\n${text}`,
    }],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') throw new Error('No summary returned')
  return { summary: block.text.trim() }
}

async function handleGeneric(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const prompt = typeof input.prompt === 'string' ? input.prompt : ''
  if (!prompt) throw new Error('generic requires input.prompt')

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000 })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') throw new Error('No output returned')
  return { result: block.text.trim() }
}
