import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import { Download } from 'lucide-react'

interface FAQ { q: string; a: string }

interface PageConfig {
  metaTitle:       string
  metaDescription: string
  h1:              string
  intro:           string[]
  stats:           { value: string; label: string }[]
  redFlags:        { flag: string; detail: string }[]
  howTo:           { step: string; detail: string }[]
  faq:             FAQ[]
  ctaText:         string
  ctaSubtext:      string
  checklistFile:   string
  checklistLabel:  string
}

const CONFIGS: Record<string, PageConfig> = {

  'medical-bill': {
    metaTitle:       'Medical Bill Overcharge Detector — Find Errors Before You Pay | ScrewedScore',
    metaDescription: 'Medical billing errors appear in up to 80% of bills. Upload yours free and our AI flags upcoding, duplicate charges, phantom services, and unbundled procedures in seconds.',
    h1:              'How to Find and Dispute Medical Bill Overcharges',
    intro: [
      'The average American hospital bill contains at least one significant error — and most people never catch it. Medical billing is intentionally complex: coded procedures, insurance adjustments, facility fees, and line items that mean nothing to anyone without a billing degree. Hospitals count on that confusion.',
      'ScrewedScore\'s AI was trained on thousands of medical bills to identify the exact patterns that inflate your total. Upload your bill and get a plain-English breakdown of every suspicious charge in about 20 seconds.',
    ],
    stats: [
      { value: '80%',   label: 'of hospital bills contain at least one error' },
      { value: '$1,300', label: 'average amount overcharged per incorrect bill' },
      { value: '70%',   label: 'of disputed medical bills result in a reduced amount' },
    ],
    redFlags: [
      { flag: 'Upcoding',               detail: 'Your 15-minute checkup gets billed as a 45-minute comprehensive exam. Hospitals assign billing codes to every service — upcoding means they use a higher-complexity code than what actually happened.' },
      { flag: 'Duplicate charges',      detail: '"Blood draw" and "venipuncture" on the same bill. "Consultation" and "evaluation and management" for the same visit. These are the same services billed under two names.' },
      { flag: 'Unbundling',             detail: 'A procedure that should be billed as one code (at one price) gets split into 3-4 components, each billed separately. Common with lab work and surgical procedures. The total can be 2-3x what it should be.' },
      { flag: 'Services not rendered',  detail: 'You were scheduled for physical therapy during your hospital stay. It never happened. It\'s still on your bill. This is surprisingly common and, technically, fraud.' },
      { flag: 'Surprise facility fees', detail: 'You went to what looked like a private doctor\'s office. It was technically on hospital property. You get hit with a $200-800 "facility fee" on top of the doctor\'s charge — often without any prior disclosure.' },
    ],
    howTo: [
      { step: 'Request the itemized bill',    detail: 'Always ask for a fully itemized bill — every single line item with CPT codes. Hospitals are legally required to provide one in most states. The summary bill you receive first hides most errors.' },
      { step: 'Look up the CPT codes',        detail: 'Every procedure has a standardized billing code. Look each one up at cms.gov or AMA\'s code lookup. If the description doesn\'t match what actually happened, you have grounds to dispute.' },
      { step: 'Flag and dispute in writing',  detail: 'Write a formal dispute letter identifying each suspicious charge by line item and CPT code. Request documentation showing the service was rendered. Send via certified mail — this creates a paper trail.' },
      { step: 'Negotiate the balance',        detail: 'After removing errors, the remaining balance is usually negotiable. Hospitals have financial assistance programs and will frequently accept 40-60% of the remaining amount, especially for uninsured patients.' },
      { step: 'Appeal through your insurer',  detail: 'If your insurance denied a claim you think should be covered, file a formal appeal. Insurers are required to respond within 30-60 days. External appeals (through your state) succeed about 40% of the time.' },
    ],
    faq: [
      { q: 'How common are medical billing errors?',
        a: 'Studies from the Medical Billing Advocates of America suggest up to 80% of medical bills contain at least one error. The most common are duplicate charges, upcoding, and charges for services not received.' },
      { q: 'Can I actually dispute a medical bill?',
        a: 'Yes. You have the right to dispute any charge you believe is incorrect. Start by requesting an itemized bill, then challenge specific line items in writing. Most hospitals have a formal appeals process, and many errors are corrected when flagged.' },
      { q: 'What if I already paid the bill?',
        a: 'You can still dispute it. If an error is confirmed, you\'re entitled to a refund. The statute of limitations on medical billing disputes varies by state but is typically 3-6 years.' },
      { q: 'Does disputing a medical bill affect my credit?',
        a: 'As of 2023, medical debt under $500 no longer appears on credit reports. Larger medical debts that go to collections do affect credit, but a bill under active dispute generally cannot be sent to collections.' },
      { q: 'What is a Explanation of Benefits (EOB) and how does it help?',
        a: 'Your EOB is a document from your insurer showing what they were billed, what they paid, and what you owe. Comparing your EOB against the hospital\'s bill is one of the fastest ways to spot overcharges and billing errors.' },
    ],
    ctaText:       'Scan my medical bill — free',
    ctaSubtext:    'Upload your bill. Get a full breakdown in ~20 seconds. No account needed.',
    checklistFile:  '/downloads/medical-bill-checklist.html',
    checklistLabel: 'Download the Medical Bill Dispute Checklist',
  },

  'mechanic-invoice': {
    metaTitle:       'Mechanic Overcharge Detector — Was Your Auto Repair Bill Too High? | ScrewedScore',
    metaDescription: 'Upload your mechanic invoice and our AI flags inflated labor rates, parts markups over 30%, duplicate charges, and services you never authorized. Free, instant results.',
    h1:              'How to Tell If Your Mechanic Overcharged You (And What to Do About It)',
    intro: [
      'Auto repair is one of the most common places consumers get overcharged — and one of the hardest to catch without industry knowledge. Labor rates, parts markups, and vague line items are standard practice, but there\'s a wide gap between what\'s acceptable and what\'s predatory.',
      'The good news: auto repair pricing is more transparent than most industries. Standard labor times are published, parts pricing is publicly available, and most states have consumer protection laws that require written estimates and authorization before work begins.',
    ],
    stats: [
      { value: '1 in 3', label: 'auto repair customers report feeling overcharged' },
      { value: '$200-800', label: 'typical overcharge on inflated parts + labor invoices' },
      { value: '48hrs',  label: 'typical window to dispute before you lose leverage' },
    ],
    redFlags: [
      { flag: 'Labor rates over $150/hr',       detail: 'National average shop labor rates run $75-125/hr for most repairs. Dealerships run higher ($150-200/hr) but should be clearly disclosed. Anything above $200/hr for a standard shop is a red flag.' },
      { flag: 'Parts marked up over 30%',       detail: 'Shops typically mark up parts 20-30% above their cost — that\'s normal. But some shops charge 100-200% markups. Look up the part number on any major retailer and compare.' },
      { flag: 'Diagnostic fee + full repair fee', detail: 'A diagnostic fee to identify the problem is reasonable. But if they also did the repair, many shops will waive or reduce the diagnostic fee. Charging full price for both is a common add-on.' },
      { flag: 'Vague "shop supplies" charges',   detail: '"Shop supplies," "hazmat disposal," or "misc. materials" with no itemization are padding. These should be trivial amounts ($5-15) — if they\'re $50-100, push back.' },
      { flag: 'Work done without written auth',  detail: 'Most states require shops to get written authorization before beginning work. If they performed repairs you didn\'t explicitly approve in writing, you may not be legally obligated to pay for them.' },
    ],
    howTo: [
      { step: 'Get the invoice in writing',      detail: 'Before you leave the shop, get a fully itemized invoice showing every part (with part numbers), every labor line item, and the rate charged. Verbal explanations at the counter don\'t hold up in disputes.' },
      { step: 'Look up the labor time',          detail: 'Industry-standard labor times are published by Mitchell, Chilton, and ALLDATA. A timing belt replacement on a 2018 Honda Accord, for example, has a published labor time — if your shop billed 4 hours and the book says 2, that\'s a dispute.' },
      { step: 'Check parts pricing',             detail: 'Take every part number from your invoice and look it up on RockAuto, AutoZone, or O\'Reilly. A 20-30% markup above those prices is normal. More than that is excessive.' },
      { step: 'Contact the shop in writing',     detail: 'Email or text (not just verbal) with the specific line items you\'re disputing and why. Keep it factual: "The invoice shows 4 labor hours for X — the published labor time for this repair is 2.0 hours at your quoted rate of $X/hr."' },
      { step: 'Escalate if needed',              detail: 'File a complaint with your state\'s Bureau of Automotive Repair (BAR) or equivalent. Many states have consumer protection offices specifically for auto repair disputes. A complaint filed often results in a resolution without further action.' },
    ],
    faq: [
      { q: 'What is a fair mechanic labor rate?',
        a: 'Independent shops typically charge $75-125/hr. Dealerships run $150-200/hr. Specialty shops (European cars, performance) can run higher. Rates above $200/hr for a general repair shop are worth questioning.' },
      { q: 'Can a mechanic charge me without my authorization?',
        a: 'In most states, no. Consumer protection laws require shops to provide a written estimate and get your authorization before beginning work. If they performed repairs without written approval, you have grounds to dispute.' },
      { q: 'What if I already picked up my car?',
        a: 'You can still dispute. If you paid by credit card, you can file a chargeback within 60-120 days. You can also file a small claims court case or a complaint with your state\'s consumer protection office.' },
      { q: 'Are parts markups legal?',
        a: 'Yes — shops are allowed to mark up parts. The question is how much. A 20-30% markup is industry standard. Markups of 100-200% are legal in most states but are a legitimate basis for negotiation.' },
      { q: 'What is "upcoding" in auto repair?',
        a: 'Similar to medical billing, upcoding in auto repair means billing for a more complex (expensive) version of a service than was actually performed. For example, billing for a full engine flush when only the oil was changed.' },
    ],
    ctaText:       'Scan my mechanic invoice — free',
    ctaSubtext:    'Upload your invoice. Our AI flags overcharges in seconds. No account needed.',
    checklistFile:  '/downloads/mechanic-invoice-checklist.html',
    checklistLabel: 'Download the Mechanic Invoice Dispute Checklist',
  },

  'contractor-estimate': {
    metaTitle:       'Contractor Estimate Analyzer — Find Red Flags Before You Sign | ScrewedScore',
    metaDescription: 'Upload your contractor estimate before you sign. Our AI flags inflated materials, vague scope, missing protections, and payment terms designed to favor the contractor.',
    h1:              'How to Read a Contractor Estimate and Spot Overcharges Before You Sign',
    intro: [
      'A contractor estimate is a negotiating document, not a final price. Most homeowners sign whatever the contractor puts in front of them without realizing that vague scope, padded material costs, and one-sided payment terms are standard first-draft tactics — not fixed facts.',
      'The best time to dispute a contractor estimate is before you sign, not after work starts. Upload your estimate and we\'ll flag every line item that doesn\'t pass the smell test.',
    ],
    stats: [
      { value: '35%',  label: 'of home renovation projects go over the original estimate' },
      { value: '$3,000', label: 'average cost overrun on a $20k renovation project' },
      { value: '60%',  label: 'of disputes resolved when raised before contract signing' },
    ],
    redFlags: [
      { flag: 'Materials priced above retail',   detail: 'Contractors typically mark up materials 10-20% — that\'s reasonable. If lumber, tile, or fixtures are priced 50-100% above what you can find at Home Depot or the manufacturer, push back.' },
      { flag: 'Vague scope description',         detail: '"Demo and remodel bathroom" with no square footage, no specified fixtures, no material grades. Vague scope is how contractors add $10,000 in "extras" that you thought were included.' },
      { flag: 'Front-loaded payment schedule',  detail: 'Requiring 50%+ upfront before work starts gives contractors no incentive to finish. Standard is 10-15% down, then payments tied to milestones, with 10-15% held until final completion.' },
      { flag: 'Unlimited change order language', detail: 'Language like "additional work billed at time and materials" or "changes subject to additional charges" with no cap or approval process means you\'ve signed a blank check.' },
      { flag: 'No workmanship warranty',         detail: 'Any reputable contractor should warranty their labor for at least 1 year. If the estimate has no warranty language, ask for it explicitly — and if they refuse, that tells you something.' },
    ],
    howTo: [
      { step: 'Get at least three estimates',   detail: 'Never sign the first estimate you receive. Three estimates gives you a real market rate. If two estimates are within 15% of each other and one is 40% higher, you know where the padding is.' },
      { step: 'Break out labor vs. materials',  detail: 'Ask for a separate line for labor and materials on every major item. This makes comparison shopping possible and prevents hidden markups in blended line items.' },
      { step: 'Tie payments to milestones',     detail: 'Negotiate a payment schedule that mirrors project completion: 10% to start, 25% after framing/demo, 25% after rough-ins, 25% after drywall/finishing, 15% on final walkthrough.' },
      { step: 'Define change order process',    detail: 'Add explicit language: "All change orders must be approved in writing by owner before work begins. Changes will be quoted at itemized material cost plus X% labor." This protects you from unlimited add-ons.' },
      { step: 'Verify licenses and insurance',  detail: 'Check your state\'s contractor license lookup before signing anything. Unlicensed contractors are a legal and financial liability — and they\'re more likely to disappear mid-project.' },
    ],
    faq: [
      { q: 'What is a reasonable contractor markup on materials?',
        a: 'Industry standard is 10-20% markup on materials. Some contractors mark up 25-30% on specialty items. Anything above that should be questioned and compared against retail pricing.' },
      { q: 'Can I negotiate a contractor estimate?',
        a: 'Yes, and you should. Almost every element of an estimate is negotiable before you sign — payment schedule, material choices, scope, and labor rates. Contractors expect negotiation on first estimates.' },
      { q: 'What should a contractor estimate include?',
        a: 'A thorough estimate should include: itemized labor and materials, project timeline with milestones, payment schedule tied to milestones, warranty terms, change order process, cleanup and disposal responsibilities, and contractor license number.' },
      { q: 'What is a time and materials contract?',
        a: 'A T&M contract bills you for actual hours worked plus actual materials used. It can benefit both parties for uncertain-scope work, but should always include a "not to exceed" cap to protect you from runaway costs.' },
      { q: 'What should I do if a contractor overcharges on a signed contract?',
        a: 'Document everything — photos, texts, emails. Compare actual work to contracted scope. Send a formal written dispute identifying specific variances. If unresolved, file with your state contractor licensing board and pursue in small claims court for amounts under your state\'s limit.' },
    ],
    ctaText:       'Scan my contractor estimate — free',
    ctaSubtext:    'Upload the estimate before you sign. Our AI finds problems in seconds.',
    checklistFile:  '/downloads/contractor-estimate-checklist.html',
    checklistLabel: 'Download the Contractor Estimate Review Checklist',
  },

  'lease-agreement': {
    metaTitle:       'Lease Agreement Red Flag Detector — Find Unfair Clauses Before You Sign | ScrewedScore',
    metaDescription: 'Upload your lease agreement and our AI flags broad entry rights, illegal fees, one-sided repair clauses, and automatic renewal traps before you sign.',
    h1:              'Lease Agreement Red Flags: What to Look For Before You Sign',
    intro: [
      'Most renters sign their lease without reading it. The ones who do read it often don\'t know which clauses are standard, which are negotiable, and which are illegal. Landlords know this — and some take advantage of it.',
      'A lease is a legal contract. Once you sign it, you\'re bound by its terms regardless of what you were told verbally. Upload your lease before you sign and we\'ll flag every clause that could cost you later.',
    ],
    stats: [
      { value: '40%',  label: 'of renters report being charged fees not disclosed before move-in' },
      { value: '$200-500', label: 'average in illegitimate fees charged at lease end' },
      { value: '1 in 4', label: 'leases contain at least one clause that is unenforceable in that state' },
    ],
    redFlags: [
      { flag: 'Broad entry rights',             detail: 'Landlord can enter "at any time" or "with reasonable notice" without defining what that means. Most states require 24-48 hours written notice except in emergencies.' },
      { flag: 'Automatic renewal trap',         detail: 'Lease automatically renews for another 12 months unless you give 60-90 days notice. The window is designed to be easy to miss — and missing it locks you in for another year.' },
      { flag: 'Tenant responsible for major repairs', detail: 'You\'re responsible for HVAC maintenance, appliance repairs, or structural issues that are legally the landlord\'s obligation in most states. This shifts costs worth hundreds of dollars per year.' },
      { flag: 'Excessive fees',                 detail: 'Late fees over 5-10% of rent are illegal in many states. "Administrative fees," "processing fees," and "renewal fees" with no explanation are common padding that you can challenge.' },
      { flag: 'Vague security deposit terms',   detail: 'No defined timeline for return, no itemization requirement, or language like "deposit forfeited for any damage" with no definition of normal wear and tear. These clauses enable illegal deposit withholding.' },
    ],
    howTo: [
      { step: 'Know your state\'s tenant rights', detail: 'Every state has a landlord-tenant law that sets minimums. Entry notice periods, security deposit limits, habitability requirements, and fee caps are all governed by state law — not by whatever the lease says.' },
      { step: 'Document the unit before move-in', detail: 'Photograph and video every room, every surface, every appliance — before you bring your stuff in. Date-stamp everything. This is your evidence against bogus damage claims at move-out.' },
      { step: 'Get verbal promises in writing',   detail: 'If the landlord said the broken dishwasher will be fixed before you move in, that needs to be in the lease or in a signed addendum. Verbal promises are unenforceable.' },
      { step: 'Challenge illegal clauses',        detail: 'Lease clauses that violate state law are generally unenforceable — but you still have to know they\'re there. Flag illegal clauses in writing before signing and ask for them to be removed or amended.' },
      { step: 'Track your maintenance requests', detail: 'Send all repair requests by email or text — never just verbal. If a habitability issue goes unaddressed for 14+ days after written notice, most states allow rent withholding or lease termination.' },
    ],
    faq: [
      { q: 'Can a landlord include any terms they want in a lease?',
        a: 'No. Lease terms that violate state or local law are unenforceable, even if you signed them. Common illegal clauses include waiving the right to sue, waiving habitability requirements, or charging fees above the legal cap.' },
      { q: 'What can a landlord legally deduct from my security deposit?',
        a: 'Landlords can deduct for damages beyond normal wear and tear, unpaid rent, and cleaning costs if the unit was left significantly dirtier than when you moved in. They cannot deduct for normal wear and tear (scuffs, minor nail holes, carpet wear from regular use).' },
      { q: 'What is normal wear and tear?',
        a: 'Normal wear and tear includes: small nail holes from hanging pictures, carpet wear from regular foot traffic, minor scuffs on walls, faded paint, and loose doorknobs or hinges. Significant holes, stains, burns, or broken fixtures are not normal wear and tear.' },
      { q: 'Can I negotiate lease terms?',
        a: 'Yes, especially in a renter\'s market. Common negotiable items include: rent price, lease length, pet fees, parking, entry notice requirements, and renewal terms. Everything is a starting point until you sign.' },
      { q: 'What should I do if my landlord keeps my security deposit unfairly?',
        a: 'Send a written demand letter with your documentation (move-in photos, move-out photos, receipts). If unresolved, file in small claims court. Most states require landlords to return deposits within 14-30 days with itemized deductions — missing that deadline often means they forfeit the right to make any deductions.' },
    ],
    ctaText:       'Scan my lease — free',
    ctaSubtext:    'Upload before you sign. Our AI finds problem clauses in seconds.',
    checklistFile:  '/downloads/lease-agreement-checklist.html',
    checklistLabel: 'Download the Lease Agreement Review Checklist',
  },

  'phone-bill': {
    metaTitle:       'Phone Bill Overcharge Detector — Find Hidden Fees on Your Phone or Internet Bill | ScrewedScore',
    metaDescription: 'Upload your phone or internet bill and our AI finds hidden fees, unauthorized charges, services you never requested, and rate increases buried in your statement.',
    h1:              'Hidden Fees on Your Phone Bill: How to Find and Remove Them',
    intro: [
      'Telecom companies are among the most prolific users of hidden fees in any industry. The advertised rate is almost never what you actually pay — and the gap between the two is filled with "administrative fees," "regulatory recovery charges," and "network access fees" that are largely invented.',
      'The FCC receives more complaints about phone and internet billing than almost any other industry. Upload your bill and see exactly what you\'re paying that you shouldn\'t be.',
    ],
    stats: [
      { value: '$300+',  label: 'average American overpays on telecom bills per year' },
      { value: '24%',    label: 'of consumers have been charged for a service they never requested' },
      { value: '2x',     label: 'average difference between advertised rate and actual bill' },
    ],
    redFlags: [
      { flag: 'Administrative and regulatory fees', detail: '"Administrative Recovery Fee," "Federal Universal Service Charge," "Network Access Fee" — these are not government taxes. They are carrier-invented fees dressed to look like taxes. They are negotiable and removable.' },
      { flag: 'Charges for cancelled services',     detail: 'You cancelled a line or service six months ago. It\'s still appearing on your bill under a slightly different name. Telecom billing systems are notoriously slow to process cancellations.' },
      { flag: 'Equipment rental fees',              detail: 'Paying $10-15/month to "rent" a router you\'ve had for four years? You\'ve paid for it two or three times over. Buy your own compatible equipment and eliminate this charge permanently.' },
      { flag: '"Unlimited" plan with overage fees', detail: 'Your plan is advertised as unlimited data. You\'re being charged overage fees after 15GB. Read the fine print — "unlimited" often means unlimited at reduced speed, not unlimited full-speed with no charges.' },
      { flag: 'Rate increases without notice',      detail: 'Your rate went up $5-15/month. You received "notice" in the form of an insert in your bill three months ago in 6-point font. These rate increases are legal but negotiable — call and ask for a promotional rate.' },
    ],
    howTo: [
      { step: 'Get a full itemized statement',      detail: 'Ask for a complete itemized bill showing every charge, fee, and tax separately. Most carriers provide this in your online account. Print or screenshot everything before calling.' },
      { step: 'Separate taxes from fees',           detail: 'Government taxes (state sales tax, federal excise tax) are non-negotiable. Carrier fees (administrative, network access, recovery charges) are invented by the carrier and fully negotiable. Learn to tell the difference.' },
      { step: 'Call retention, not customer service', detail: 'When you call to dispute, ask for the retention department. Front-line reps have limited authority. Retention agents can offer discounts, remove fees, and add credits that regular reps cannot.' },
      { step: 'Threaten to switch',                detail: 'The single most effective phrase in telecom is "I\'m considering switching to [competitor]." Carriers spend $300-500 acquiring a customer — they\'d rather give you a $10/month discount than lose you.' },
      { step: 'File an FCC complaint if needed',   detail: 'An FCC complaint isn\'t a lawsuit — it\'s an inquiry that the carrier must respond to within 30 days. Filing one frequently results in resolution of the underlying issue faster than any other escalation.' },
    ],
    faq: [
      { q: 'What fees on my phone bill are actually mandatory taxes?',
        a: 'True mandatory taxes include: Federal Excise Tax (3%), state and local sales taxes, and the federal USF contribution. Administrative fees, network access fees, and "regulatory recovery" charges are carrier-created and not government-mandated — they look like taxes but aren\'t.' },
      { q: 'Can I negotiate my phone or internet bill?',
        a: 'Yes — and you should at least once a year. Carriers routinely offer promotional rates to existing customers to prevent churn. Simply calling and asking for a better rate results in a discount more than 50% of the time.' },
      { q: 'What is "cramming" on a phone bill?',
        a: 'Cramming is the practice of adding unauthorized third-party charges to your phone bill. These appear as small charges ($2-15) for "premium services," ringtones, or subscriptions you never signed up for. They are illegal under FCC rules and fully refundable.' },
      { q: 'What do I do if I was charged for a service I cancelled?',
        a: 'Get the cancellation confirmation number from when you cancelled. Call back with it, ask to speak to a supervisor, and request a full refund for all charges from the cancellation date forward. If the carrier refuses, file a complaint with the FCC and your state AG\'s office.' },
      { q: 'How far back can I dispute phone bill charges?',
        a: 'Most carriers have a 60-180 day dispute window per their terms of service. However, for fraudulent charges (like cramming), the FCC takes complaints going further back. Credit card chargebacks typically allow 60-120 days.' },
    ],
    ctaText:       'Scan my phone bill — free',
    ctaSubtext:    'Upload your bill and find the hidden fees in seconds.',
    checklistFile:  '/downloads/phone-bill-checklist.html',
    checklistLabel: 'Download the Phone Bill Hidden Fees Checklist',
  },

  'brand-deal': {
    metaTitle:       'Creator Brand Deal Contract Analyzer — Find Unfair Terms Before You Sign | ScrewedScore',
    metaDescription: 'Upload your sponsorship or brand deal contract and our AI flags IP grabs, unlimited exclusivity, unfair revision clauses, and payment terms that favor the brand.',
    h1:              'Brand Deal Red Flags: What to Check in Every Sponsorship Contract',
    intro: [
      'Brand deals have become one of the most lucrative income streams for creators — and one of the easiest places to get taken advantage of. Most brands hire legal teams who write contracts that are thoroughly favorable to the brand. Most creators sign them without representation.',
      'You don\'t need a lawyer to spot the biggest red flags. Upload your contract and we\'ll flag the clauses that have cost creators the most — from IP rights that never expire to exclusivity that freezes your income for months.',
    ],
    stats: [
      { value: '3x',    label: 'average rate increase creators get after learning to negotiate contracts' },
      { value: '68%',   label: 'of first-draft brand contracts contain IP terms that are broader than needed' },
      { value: '$0',    label: 'what most creators get for content used in paid ads for years after the deal ends' },
    ],
    redFlags: [
      { flag: 'Perpetual IP assignment',        detail: 'The brand owns your content forever, across all media, for any use, without additional payment. This means they can run your video as a paid ad two years from now and owe you nothing. Push for a limited license instead.' },
      { flag: 'Broad exclusivity',              detail: '"You agree not to work with any competitive brand for 12 months." Without defining what "competitive" means or limiting the scope, this clause can lock you out of entire categories of income.' },
      { flag: 'Unlimited revisions',            detail: '"Creator will revise content as reasonably requested." Without a cap on revision rounds or a timeline, this is a blank check for the brand to demand endless changes. Push for "up to 2 revision rounds."' },
      { flag: 'Net-60 or worse payment terms',  detail: 'Net-60 means you get paid 60 days after delivery. Net-90 is 90 days. For a one-time deliverable, these terms are unreasonable. Push for Net-15 or Net-30, with a kill fee if the brand cancels.' },
      { flag: 'Morality clause without limits', detail: '"Brand may terminate this agreement at its sole discretion for any conduct deemed inconsistent with brand values." Without defining "brand values" or limiting this clause, you can be terminated without pay for anything.' },
    ],
    howTo: [
      { step: 'Define the license, not ownership', detail: 'Instead of assigning copyright, grant a limited license: "Creator grants Brand a non-exclusive, limited license to use the Content for [specific platforms] for [12 months] for [paid and organic social only]." Specificity protects you.' },
      { step: 'Scope the exclusivity tightly',    detail: '"Creator will not create sponsored content for direct competitors defined as [specific brand names]" is very different from "no competitive brands in the category." The first is reasonable. The second can eliminate half your income.' },
      { step: 'Cap the revisions',               detail: 'Add: "Brand is entitled to up to 2 rounds of revision requests. Additional revisions requested by Brand will be billed at $X/hour." This creates a natural limit on revision requests.' },
      { step: 'Negotiate payment timing',        detail: 'Push for 50% on signing, 50% on delivery. At minimum, Net-30. Include a kill fee of 25-50% of the deal value if the brand cancels after you\'ve created content.' },
      { step: 'Define approval and FTC terms',   detail: 'The contract should specify that the brand is responsible for FTC compliance review, not you. It should also define what "approval" means and set a timeline — "Brand will approve or reject content within 5 business days."' },
    ],
    faq: [
      { q: 'Do I need a lawyer to review a brand deal?',
        a: 'For deals over $5,000, yes. For smaller deals, you can often identify the biggest red flags yourself. The most important things to check are IP rights, exclusivity scope, payment terms, and revision limits.' },
      { q: 'What is a kill fee in a brand deal?',
        a: 'A kill fee is a payment owed to you if the brand cancels the deal after you\'ve started work. Standard kill fees are 25-50% of the total deal value. Without one, you can spend days creating content and receive nothing if the brand changes its mind.' },
      { q: 'Can I negotiate a brand deal contract?',
        a: 'Yes — and you should. Brands send first-draft contracts expecting negotiation. The most commonly negotiated items are: usage rights, exclusivity duration and scope, revision rounds, payment timeline, and kill fee terms.' },
      { q: 'What is a usage rights fee?',
        a: 'A usage rights fee is additional compensation for allowing the brand to use your content beyond the original scope — like running it as a paid advertisement. Brands routinely omit usage fees in first drafts. Always ask: "Will this content be used in paid ads? For how long? On what platforms?"' },
      { q: 'How long should brand deal exclusivity last?',
        a: 'For most deals, 30-90 days is reasonable. 6-12 months is aggressive and should command significantly higher compensation. Exclusivity that extends beyond the content delivery date with no additional payment is a one-sided term worth pushing back on.' },
    ],
    ctaText:       'Scan my brand deal — free',
    ctaSubtext:    'Upload your contract and find the red flags before you sign.',
    checklistFile:  '/downloads/brand-deal-checklist.html',
    checklistLabel: 'Download the Brand Deal Review Checklist',
  },

}

export async function generateStaticParams() {
  return Object.keys(CONFIGS).map(type => ({ type }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ type: string }> }
): Promise<Metadata> {
  const { type } = await params
  const c = CONFIGS[type]
  if (!c) return { title: 'Not found' }
  return {
    title:       c.metaTitle,
    description: c.metaDescription,
    alternates:  { canonical: `https://screwedscore.com/analyze/${type}` },
    openGraph: {
      title:       c.metaTitle,
      description: c.metaDescription,
      url:         `https://screwedscore.com/analyze/${type}`,
      siteName:    'ScrewedScore',
    },
  }
}

export default async function AnalyzeLandingPage(
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const c = CONFIGS[type]
  if (!c) notFound()

  const faqSchema = {
    '@context':   'https://schema.org',
    '@type':      'FAQPage',
    mainEntity: c.faq.map(({ q, a }) => ({
      '@type':          'Question',
      name:             q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  return (
    <>
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="min-h-screen bg-brand-bg">

        {/* Nav */}
        <nav className="sticky top-0 z-50 border-b border-brand-border bg-brand-bg/90 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-0 font-black text-base tracking-tight">
              <span className="text-brand-text">Get</span>
              <span style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Screwed</span>
              <span className="text-brand-text">Score</span>
            </Link>
            <Link href="/" className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
              style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', color: '#fff' }}>
              Scan free →
            </Link>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-5 py-12 space-y-14">

          {/* Hero */}
          <div className="space-y-5">
            <h1 className="text-4xl sm:text-5xl font-black text-brand-text leading-tight">{c.h1}</h1>
            {c.intro.map((p, i) => (
              <p key={i} className="text-base text-brand-sub leading-relaxed max-w-2xl">{p}</p>
            ))}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all"
                style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', color: '#fff' }}>
                {c.ctaText}
              </Link>
              <a href={c.checklistFile} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#f2f2f2' }}>
                <Download className="w-4 h-4" />
                Free Checklist
              </a>
            </div>
            <p className="text-xs text-brand-sub">{c.ctaSubtext}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {c.stats.map(({ value, label }) => (
              <div key={label} className="rounded-2xl p-5 text-center space-y-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-2xl font-black text-brand-text" style={{ color: '#ff3b30' }}>{value}</p>
                <p className="text-xs text-brand-sub leading-snug">{label}</p>
              </div>
            ))}
          </div>

          {/* Red Flags */}
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-brand-text">What to look for</h2>
            <div className="space-y-4">
              {c.redFlags.map(({ flag, detail }) => (
                <div key={flag} className="rounded-2xl p-5 space-y-2"
                  style={{ background: 'rgba(255,59,48,0.04)', border: '1px solid rgba(255,59,48,0.12)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black" style={{ color: '#ff3b30' }}>⚠</span>
                    <h3 className="text-sm font-black text-brand-text">{flag}</h3>
                  </div>
                  <p className="text-sm text-brand-sub leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How To */}
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-brand-text">How to dispute it — step by step</h2>
            <div className="space-y-4">
              {c.howTo.map(({ step, detail }, i) => (
                <div key={step} className="flex gap-4 rounded-2xl p-5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mt-0.5"
                    style={{ background: 'rgba(255,59,48,0.15)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.2)' }}>
                    {i + 1}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-brand-text">{step}</h3>
                    <p className="text-sm text-brand-sub leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mid CTA */}
          <div className="rounded-2xl p-8 text-center space-y-4"
            style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.15)' }}>
            <h2 className="text-xl font-black text-brand-text">Let the AI find it for you</h2>
            <p className="text-sm text-brand-sub max-w-md mx-auto">Upload your document and get a plain-English breakdown of every suspicious charge in about 20 seconds. Free. No account needed.</p>
            <Link href="/"
              className="inline-block px-8 py-3 rounded-xl font-black text-sm transition-all"
              style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', color: '#fff' }}>
              {c.ctaText}
            </Link>
          </div>

          {/* Download Checklist */}
          <div className="flex items-center justify-between rounded-2xl px-6 py-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <p className="text-sm font-black text-brand-text">{c.checklistLabel}</p>
              <p className="text-xs text-brand-sub mt-0.5">Printable PDF — all red flags + dispute steps on one page</p>
            </div>
            <a href={c.checklistFile} target="_blank" rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-2 ml-4 px-4 py-2.5 rounded-xl text-xs font-black transition-all"
              style={{ background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.25)', color: '#ff6b60' }}>
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>

          {/* FAQ */}
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-brand-text">Frequently asked questions</h2>
            <div className="space-y-4">
              {c.faq.map(({ q, a }) => (
                <div key={q} className="rounded-2xl p-5 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <h3 className="text-sm font-bold text-brand-text">{q}</h3>
                  <p className="text-sm text-brand-sub leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="rounded-2xl p-10 text-center space-y-5"
            style={{ background: '#0d0f18', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ff3b30' }}>ScrewedScore</p>
            <h2 className="text-3xl font-black text-brand-text">Get your Screwed Score — free</h2>
            <p className="text-sm text-brand-sub max-w-sm mx-auto">Upload any bill, invoice, or contract. Our AI returns a 0-100 score with every red flag explained in plain English.</p>
            <Link href="/"
              className="inline-block px-10 py-4 rounded-xl font-black text-base transition-all"
              style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', color: '#fff' }}>
              Scan mine free →
            </Link>
            <p className="text-xs text-brand-sub opacity-50">No account. No upload limit. Results in ~20 seconds.</p>
          </div>

        </main>
      </div>
    </>
  )
}
