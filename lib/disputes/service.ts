/**
 * Social Dispute Hub service
 * Manages consumer dispute threads and messages.
 * Server-side only.
 */
import { createServiceClient } from '@/lib/supabase'
import type {
  Dispute, DisputeMessage, DisputeWithMessages,
  CreateDisputeRequest, ReplyToDisputeRequest, ResolveDisputeRequest,
} from '@/lib/types/disputes'

export async function createDispute(
  data: CreateDisputeRequest,
  userId: string | null
): Promise<Dispute> {
  const supabase = createServiceClient()

  const { data: dispute, error } = await supabase
    .from('disputes')
    .insert({
      vendor_id: data.vendor_id ?? null,
      analysis_id: data.analysis_id ?? null,
      user_id: userId,
      category: data.category,
      status: 'open',
      title: data.title.trim(),
      description: data.description.trim(),
      amount_disputed: data.amount_disputed ?? null,
    })
    .select()
    .single()

  if (error || !dispute) throw new Error(error?.message ?? 'Failed to create dispute')
  return dispute as Dispute
}

export async function getDisputeById(id: string): Promise<DisputeWithMessages | null> {
  const supabase = createServiceClient()

  const { data: dispute, error: dErr } = await supabase
    .from('disputes')
    .select('*, vendors(name)')
    .eq('id', id)
    .single()

  if (dErr || !dispute) return null

  const { data: messages, error: mErr } = await supabase
    .from('dispute_messages')
    .select('*')
    .eq('dispute_id', id)
    .order('created_at', { ascending: true })

  if (mErr) throw new Error(mErr.message)

  const vendor = dispute.vendors as { name: string } | null

  return {
    ...(dispute as Dispute),
    vendor_name: vendor?.name ?? null,
    messages: (messages ?? []) as DisputeMessage[],
  }
}

export async function replyToDispute(
  disputeId: string,
  data: ReplyToDisputeRequest,
  authorId: string | null
): Promise<DisputeMessage> {
  const supabase = createServiceClient()

  // Verify dispute exists and is not resolved/closed
  const { data: dispute } = await supabase
    .from('disputes')
    .select('status')
    .eq('id', disputeId)
    .single()

  if (!dispute) throw new Error('Dispute not found')
  if (dispute.status === 'resolved' || dispute.status === 'closed') {
    throw new Error('Cannot reply to a resolved or closed dispute')
  }

  // Move to in_progress if still open
  if (dispute.status === 'open') {
    await supabase
      .from('disputes')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', disputeId)
  }

  const { data: message, error } = await supabase
    .from('dispute_messages')
    .insert({
      dispute_id: disputeId,
      author_id: authorId,
      is_vendor_rep: data.is_vendor_rep ?? false,
      body: data.body.trim(),
    })
    .select()
    .single()

  if (error || !message) throw new Error(error?.message ?? 'Failed to post reply')
  return message as DisputeMessage
}

export async function resolveDispute(
  disputeId: string,
  data: ResolveDisputeRequest,
  userId: string | null
): Promise<Dispute> {
  const supabase = createServiceClient()

  const { data: dispute, error } = await supabase
    .from('disputes')
    .update({
      status: 'resolved',
      resolution_notes: data.resolution_notes.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', disputeId)
    .select()
    .single()

  if (error || !dispute) throw new Error(error?.message ?? 'Failed to resolve dispute')
  return dispute as Dispute
}
