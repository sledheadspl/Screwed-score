import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const runtime = 'nodejs'
export const maxDuration = 60

type DocType =
  | 'invoice'
  | 'estimate'
  | 'service_contract'
  | 'lease_agreement'
  | 'rental_agreement'
  | 'demand_letter'
  | 'nda'
  | 'court_paperwork'
  | 'bill_of_sale'
  | 'promissory_note'
  | 'receipt'

const SYSTEM_PROMPT = `You are a professional legal document and business form generator. You create clean, complete, legally-sound documents in HTML format.

Rules:
- Output ONLY the inner body HTML — no <html>, <head>, or <body> tags
- Use inline styles only — no external CSS or class-based styling
- Typography: font-family: Georgia, serif; color: #111; line-height: 1.6
- Max width: 720px, margin: auto, padding: 40px
- Headings: bold, 18px for title, 14px for sections
- Tables: full width, border-collapse: collapse, thin 1px #ccc borders, cell padding 8px
- Signature blocks: two-column flex layout with underline lines
- Extract and use ANY names, amounts, dates, addresses, or details mentioned in the user's description
- Include all standard clauses appropriate to the document type
- Dates shown as blanks (___________) when not provided
- Dollar amounts formatted as $0.00
- Always include a "This document was prepared using GetScrewedScore.com" footer in small gray text
- Make documents look professional enough to print and use immediately`

const TYPE_PROMPTS: Record<DocType, string> = {
  invoice: `Generate a professional invoice document. Include:
- Header with FROM business info and "INVOICE" title
- Invoice number, invoice date, due date
- Bill TO section
- Itemized line items table (Description, Qty, Unit Price, Total)
- Subtotal, tax, and grand total rows
- Payment terms and accepted payment methods
- Late fee notice if applicable
- Thank you message`,

  estimate: `Generate a professional job estimate/quote document. Include:
- Header with estimating company info and "ESTIMATE / QUOTE" title
- Estimate number, date, valid-until date
- Prepared FOR section (customer info)
- Project description / scope of work
- Itemized breakdown table (Labor, Materials, Equipment)
- Subtotal, tax, and total
- Exclusions / what is NOT included
- Acceptance signature block with "Estimate approved by" line
- Note that final invoice may vary based on actual materials used`,

  service_contract: `Generate a professional service agreement / contract. Include:
- Title "SERVICE AGREEMENT"
- Parties section (Service Provider and Client)
- Effective date
- Services to be provided (detailed scope)
- Compensation and payment schedule
- Term and termination clause
- Ownership of work product / intellectual property
- Confidentiality clause
- Limitation of liability
- Governing law clause
- Complete signature blocks for both parties with date lines`,

  lease_agreement: `Generate a residential lease agreement. Include:
- Title "RESIDENTIAL LEASE AGREEMENT"
- Parties: Landlord and Tenant(s)
- Property address
- Lease term (start and end date)
- Monthly rent amount and due date
- Security deposit amount and conditions
- Late fee policy
- Utilities and services (who pays what)
- Occupancy rules (pets, guests, subletting)
- Maintenance responsibilities
- Entry notice requirements (24-48 hours)
- Move-out / cleaning requirements
- Renewal terms
- Complete signature blocks`,

  rental_agreement: `Generate a short-term rental agreement. Include:
- Title "RENTAL AGREEMENT"
- Parties: Owner and Renter
- Item(s) or property being rented with condition description
- Rental period (start and end date/time)
- Rental rate and total amount
- Security/damage deposit
- Renter responsibilities and prohibited uses
- Damage and liability clause
- Return condition requirements
- Late return fees
- Signature blocks`,

  demand_letter: `Generate a professional demand letter. Include:
- Date and recipient address block (formal letter format)
- Subject line: RE: DEMAND FOR PAYMENT / DEMAND FOR [ACTION]
- Opening: identification of sender and relationship
- Clear description of the dispute or unpaid debt
- Itemized breakdown of amounts owed (if applicable)
- Legal basis for the demand (contract, statute, etc.)
- Specific demand (payment, action, or remedy requested)
- Deadline (e.g., "within 14 days of this letter")
- Consequences of non-compliance (legal action, collections, etc.)
- Professional closing
- Signature block`,

  nda: `Generate a non-disclosure agreement (NDA). Include:
- Title "NON-DISCLOSURE AGREEMENT"
- Parties (Disclosing Party and Receiving Party)
- Effective date
- Definition of Confidential Information
- Obligations of Receiving Party
- Exclusions from confidentiality (publicly known, independently developed, etc.)
- Permitted disclosures (employees, legal requirements)
- Term of agreement (duration of confidentiality obligation)
- Return or destruction of materials
- No license granted clause
- Remedies (injunctive relief language)
- Governing law
- Complete signature blocks`,

  court_paperwork: `Generate a small claims court demand / complaint document. Include:
- Title "SMALL CLAIMS COURT COMPLAINT / STATEMENT OF CLAIM"
- Court name (leave as "[COURT NAME]" placeholder)
- Case number (leave blank)
- Plaintiff information
- Defendant information
- Amount claimed
- Basis of claim (breach of contract, property damage, unpaid debt, etc.)
- Chronological statement of facts (numbered paragraphs)
- Relief requested (specific dollar amount + any other remedy)
- Certification / declaration under penalty of perjury
- Plaintiff signature block and date`,

  bill_of_sale: `Generate a bill of sale document. Include:
- Title "BILL OF SALE"
- Seller information (name, address, contact)
- Buyer information (name, address, contact)
- Description of item(s) being sold (make, model, year, serial/VIN if applicable)
- Condition of item ("as-is" language or condition description)
- Sale price and payment method
- Date of sale
- Warranties (none / "as-is" disclaimer OR specific warranty terms)
- Both parties' acknowledgment of the transaction
- Signature blocks for Seller and Buyer with date lines
- Notary block (optional)`,

  promissory_note: `Generate a promissory note / loan agreement. Include:
- Title "PROMISSORY NOTE"
- Borrower information (name, address)
- Lender information (name, address)
- Principal loan amount
- Interest rate (or "0% / interest-free" if applicable)
- Repayment schedule (lump sum / installments / on demand)
- Due date or payment schedule table
- Late payment penalty clause
- Default clause (what happens if borrower doesn't pay)
- Prepayment clause (borrower may pay early without penalty)
- Governing law
- Signature blocks for both parties with date lines`,

  receipt: `Generate a professional payment receipt. Include:
- Title "RECEIPT" or "PAYMENT RECEIPT"
- Receipt number and date
- Received FROM (payer name and address)
- Received BY (payee/business name and address)
- Itemized description of what was paid for
- Amount received and payment method (cash/check/card/transfer)
- Balance remaining (if partial payment) or "PAID IN FULL"
- Thank you line
- Authorized signature line`,
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.type) {
    return NextResponse.json({ error: 'Missing type' }, { status: 400 })
  }

  const docType = body.type as DocType
  const typePrompt = TYPE_PROMPTS[docType]
  if (!typePrompt) {
    return NextResponse.json({ error: 'Unknown document type' }, { status: 400 })
  }

  const fields: Record<string, string> = body.fields ?? {}
  const userPrompt: string = body.userPrompt ?? ''

  const fieldsText = Object.entries(fields)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const promptSection = userPrompt.trim()
    ? `\nUser's description (extract any names, amounts, dates, or details from this):\n"${userPrompt.trim()}"\n`
    : ''

  const userMessage = `${typePrompt}
${promptSection}
Structured fields provided:
${fieldsText || '(none — rely on the description above, or use placeholder values)'}

Generate the complete document HTML now.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const html = message.content[0].type === 'text' ? message.content[0].text : ''

  return NextResponse.json({ html })
}
