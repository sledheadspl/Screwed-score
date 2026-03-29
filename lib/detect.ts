/**
 * Keyword-based document type detection.
 * Moved out of the route handler so it can be unit-tested independently.
 */

import type { DocumentType } from './types'

/** Ordered by specificity — more specific patterns checked first. */
const DETECTION_RULES: Array<{ type: DocumentType; pattern: RegExp }> = [
  { type: 'dental_bill',          pattern: /dental|dentist|\btooth\b|crown|filling|extraction|orthodont/i },
  { type: 'medical_bill',         pattern: /\bmedical\b|hospital|physician|diagnosis|procedure|cpt.?code|\bicd\b/i },
  { type: 'mechanic_invoice',     pattern: /mechanic|auto.?repair|\blabor\b.*parts|oil.?change|\bbrake|tire|transmission/i },
  { type: 'insurance_quote',      pattern: /\binsurance\b|premium|deductible|coverage|policy|claim/i },
  { type: 'contractor_estimate',  pattern: /\bcontractor\b|estimate|construction|materials.*labor|project.?cost/i },
  { type: 'brand_deal',           pattern: /brand.?deal|sponsorship|influencer|content.?creator|deliverable.*post/i },
  { type: 'lease_agreement',      pattern: /\blease\b|tenant|landlord|\brent\b|security.?deposit|premises|eviction/i },
  { type: 'employment_contract',  pattern: /employment|\bsalary\b|compensation|\bbenefits\b|termination|non.?compete|at.?will/i },
  { type: 'service_agreement',    pattern: /service.?agreement|scope.?of.?work|milestone|\bretainer\b/i },
  { type: 'phone_bill',           pattern: /monthly.?plan|\bdata\b.*\bplan\b|wireless|carrier|telecom|broadband|\bmbps\b/i },
  { type: 'internet_bill',        pattern: /internet.?service|isp|fiber|cable.*internet/i },
]

export function detectDocumentType(text: string, filename: string): DocumentType {
  // Limit input size to avoid excessive regex on huge text blobs
  const combined = (filename + ' ' + text.slice(0, 3000)).toLowerCase()

  for (const { type, pattern } of DETECTION_RULES) {
    if (pattern.test(combined)) return type
  }

  return 'unknown'
}
