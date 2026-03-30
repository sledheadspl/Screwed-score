'use client'

import { ExternalLink, ShieldCheck, ChevronRight } from 'lucide-react'
import type { DocumentType, ScrewedScore } from '@/lib/types'

interface Resource {
  name: string
  desc: string
  url: string
  badge: string
  badgeColor: 'green' | 'blue' | 'yellow'
}

interface ProviderConfig {
  headline: string
  subtext: string
  cta: string
  resources: Resource[]
}

const PROVIDERS: Partial<Record<DocumentType | 'default', ProviderConfig>> = {
  mechanic_invoice: {
    headline: "Don't go back to the same shop.",
    subtext: 'These networks have certified mechanics with transparent, upfront pricing.',
    cta: 'Find a trusted mechanic',
    resources: [
      {
        name: 'RepairPal',
        desc: 'Certified shops with a fair price guarantee. See exact cost estimates before you approve anything.',
        url: 'https://repairpal.com/repair-shops',
        badge: 'Fair Price Guarantee',
        badgeColor: 'green',
      },
      {
        name: 'AAA Approved Auto Repair',
        desc: 'AAA-inspected shops that meet strict quality standards. Members get added protections.',
        url: 'https://www.aaa.com/autorepair',
        badge: 'AAA Certified',
        badgeColor: 'blue',
      },
      {
        name: 'NAPA AutoCare',
        desc: '2-year/24,000-mile nationwide warranty on qualifying repairs. Over 14,000 locations.',
        url: 'https://www.napaonline.com/en/auto-care-center',
        badge: 'Nationwide Warranty',
        badgeColor: 'yellow',
      },
    ],
  },

  medical_bill: {
    headline: 'You have the right to fight this bill.',
    subtext: 'Medical billing errors are extremely common. These tools help you negotiate and find fair prices.',
    cta: 'Fight your medical bill',
    resources: [
      {
        name: 'FAIR Health Consumer',
        desc: 'Free tool to look up fair prices for any medical procedure in your zip code. Know what\'s reasonable.',
        url: 'https://www.fairhealthconsumer.org',
        badge: 'Free Tool',
        badgeColor: 'green',
      },
      {
        name: 'Healthcare Bluebook',
        desc: 'Find fair prices and top-quality providers near you. Used by major employers nationwide.',
        url: 'https://www.healthcarebluebook.com',
        badge: 'Price Database',
        badgeColor: 'blue',
      },
      {
        name: 'Patient Advocate Foundation',
        desc: 'Free case managers who negotiate medical bills and insurance denials on your behalf.',
        url: 'https://www.patientadvocate.org',
        badge: 'Free Advocacy',
        badgeColor: 'green',
      },
    ],
  },

  dental_bill: {
    headline: "Dental billing is one of the most overcharged categories.",
    subtext: 'Unbundled procedures and inflated fees are rampant. Here\'s how to find fair dental care.',
    cta: 'Find a fair dentist',
    resources: [
      {
        name: '1Dental',
        desc: 'Compare dental pricing and find dentists with transparent fee schedules in your area.',
        url: 'https://www.1dental.com',
        badge: 'Price Comparison',
        badgeColor: 'blue',
      },
      {
        name: 'FAIR Health Consumer',
        desc: 'Look up fair prices for dental procedures to know if you were billed correctly.',
        url: 'https://www.fairhealthconsumer.org',
        badge: 'Free Tool',
        badgeColor: 'green',
      },
      {
        name: 'Dental Lifeline Network',
        desc: 'For those who need help affording dental care — connects you to volunteer dentists.',
        url: 'https://dentallifeline.org',
        badge: 'Nonprofit',
        badgeColor: 'yellow',
      },
    ],
  },

  contractor_estimate: {
    headline: 'Get a second opinion before you sign anything.',
    subtext: 'Always get 3 estimates. These platforms show fair market pricing and vet contractors for you.',
    cta: 'Find a vetted contractor',
    resources: [
      {
        name: 'Angi (formerly Angie\'s List)',
        desc: 'Verified reviews, background-checked pros, and upfront pricing on common projects.',
        url: 'https://www.angi.com',
        badge: 'Background Checked',
        badgeColor: 'blue',
      },
      {
        name: 'HomeAdvisor',
        desc: 'Get matched with top-rated local contractors. See true cost data for your specific project.',
        url: 'https://www.homeadvisor.com',
        badge: 'True Cost Data',
        badgeColor: 'green',
      },
      {
        name: 'BBB Accredited Contractors',
        desc: 'Search BBB-accredited contractors in your area with complaint history and ratings.',
        url: 'https://www.bbb.org/find-trusted-businesses',
        badge: 'BBB Accredited',
        badgeColor: 'yellow',
      },
    ],
  },

  phone_bill: {
    headline: 'Switch to a carrier that won\'t pad your bill.',
    subtext: 'Phantom fees and hidden charges are baked into most carrier contracts. These options are cleaner.',
    cta: 'Compare honest carriers',
    resources: [
      {
        name: 'BillFixers',
        desc: 'Professional bill negotiators who fight to lower your phone, cable, and internet bills for you.',
        url: 'https://billfixers.com',
        badge: 'No Win No Fee',
        badgeColor: 'green',
      },
      {
        name: 'Mint Mobile',
        desc: 'All-in pricing — no mystery fees. What you see is what you pay. Starts at $15/month.',
        url: 'https://www.mintmobile.com',
        badge: 'No Hidden Fees',
        badgeColor: 'blue',
      },
      {
        name: 'Consumer Reports Phone Tool',
        desc: 'Unbiased comparison of carriers, plans, and true cost breakdowns.',
        url: 'https://www.consumerreports.org/electronics-computers/cell-phones-services/',
        badge: 'Unbiased Reviews',
        badgeColor: 'yellow',
      },
    ],
  },

  internet_bill: {
    headline: 'Your ISP is probably overcharging you.',
    subtext: 'Equipment rental fees, price creep, and hidden charges are standard at big providers. Here\'s how to fight back.',
    cta: 'Lower your internet bill',
    resources: [
      {
        name: 'BillFixers',
        desc: 'They negotiate your cable and internet bills. If they can\'t save you money, you pay nothing.',
        url: 'https://billfixers.com',
        badge: 'No Win No Fee',
        badgeColor: 'green',
      },
      {
        name: 'AllConnect',
        desc: 'Compare internet providers available at your address — real pricing, no bait and switch.',
        url: 'https://www.allconnect.com',
        badge: 'Price Comparison',
        badgeColor: 'blue',
      },
      {
        name: 'FCC Broadband Map',
        desc: 'See every provider legally required to serve your address and their official pricing.',
        url: 'https://broadbandmap.fcc.gov',
        badge: 'Government Tool',
        badgeColor: 'yellow',
      },
    ],
  },

  lease_agreement: {
    headline: 'Get a real lawyer to review before you sign.',
    subtext: 'One-sided lease clauses can cost you thousands. These resources help you understand your rights.',
    cta: 'Get lease help',
    resources: [
      {
        name: 'LegalZoom',
        desc: 'Affordable attorney consultations for lease reviews. Flat fee, no surprise billing.',
        url: 'https://www.legalzoom.com',
        badge: 'Flat Fee',
        badgeColor: 'blue',
      },
      {
        name: 'Rocket Lawyer',
        desc: 'Ask a real lawyer about any lease clause. First consultation often free.',
        url: 'https://www.rocketlawyer.com',
        badge: 'Free Consult',
        badgeColor: 'green',
      },
      {
        name: 'Tenant Rights (HUD)',
        desc: 'Know your tenant rights before signing anything. Official HUD resource by state.',
        url: 'https://www.hud.gov/topics/rental_assistance/tenantrights',
        badge: 'Free Resource',
        badgeColor: 'yellow',
      },
    ],
  },

  employment_contract: {
    headline: 'Know what you\'re signing before it costs you.',
    subtext: 'Non-competes, IP grabs, and one-sided termination clauses can follow you for years.',
    cta: 'Get employment law help',
    resources: [
      {
        name: 'Avvo',
        desc: 'Find employment attorneys for free Q&A or paid consultations. Rated by clients and peers.',
        url: 'https://www.avvo.com/employment-lawyer.html',
        badge: 'Free Q&A',
        badgeColor: 'green',
      },
      {
        name: 'LegalZoom',
        desc: 'Employment contract review by a licensed attorney. Know exactly what you\'re agreeing to.',
        url: 'https://www.legalzoom.com/attorney-advice/employment-law',
        badge: 'Attorney Review',
        badgeColor: 'blue',
      },
      {
        name: 'NLRB (Workers\' Rights)',
        desc: 'The National Labor Relations Board — free resource for understanding your workplace rights.',
        url: 'https://www.nlrb.gov/about-nlrb/rights-we-protect/your-rights',
        badge: 'Free',
        badgeColor: 'yellow',
      },
    ],
  },

  insurance_quote: {
    headline: 'Insurance pricing varies wildly. Shop around.',
    subtext: 'The same coverage can cost 2-3× more at one company vs another. Independent agents work for you, not the insurer.',
    cta: 'Find honest insurance',
    resources: [
      {
        name: 'Policygenius',
        desc: 'Independent broker that compares dozens of insurers. No pressure, real quotes.',
        url: 'https://www.policygenius.com',
        badge: 'Independent Broker',
        badgeColor: 'green',
      },
      {
        name: 'NAIC Consumer',
        desc: 'The National Association of Insurance Commissioners — look up complaints and ratings on any insurer.',
        url: 'https://content.naic.org/consumer',
        badge: 'Complaint Database',
        badgeColor: 'blue',
      },
      {
        name: 'Jerry',
        desc: 'AI-powered auto insurance comparison. Average user saves $800/year.',
        url: 'https://getjerry.com',
        badge: 'Avg $800 Saved',
        badgeColor: 'yellow',
      },
    ],
  },

  default: {
    headline: 'Get a second opinion.',
    subtext: 'Don\'t let one bad experience cost you twice. These resources help you find fair service providers.',
    cta: 'Find trusted help',
    resources: [
      {
        name: 'Better Business Bureau',
        desc: 'Look up any business\'s complaint history, accreditation, and ratings before you hire.',
        url: 'https://www.bbb.org',
        badge: 'Complaint Database',
        badgeColor: 'blue',
      },
      {
        name: 'Consumer Reports',
        desc: 'Unbiased reviews and ratings for products, services, and companies across every category.',
        url: 'https://www.consumerreports.org',
        badge: 'Unbiased Reviews',
        badgeColor: 'green',
      },
      {
        name: 'FTC Consumer Help',
        desc: 'Report fraud, unfair charges, and deceptive business practices to the FTC.',
        url: 'https://reportfraud.ftc.gov',
        badge: 'Free',
        badgeColor: 'yellow',
      },
    ],
  },
}

const BADGE_STYLES: Record<string, string> = {
  green:  'bg-green-500/10 border-green-500/20 text-green-400',
  blue:   'bg-blue-500/10 border-blue-500/20 text-blue-400',
  yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
}

interface Props {
  documentType: DocumentType | null
  score: ScrewedScore
}

export function TrustedProviders({ documentType, score }: Props) {
  // Only show for SCREWED or MAYBE
  if (score === 'SAFE') return null

  const config =
    PROVIDERS[documentType as keyof typeof PROVIDERS] ??
    PROVIDERS.default!

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: 'rgba(255,59,48,0.2)',
        background: 'linear-gradient(135deg, rgba(255,59,48,0.06) 0%, rgba(13,13,15,0.8) 100%)',
        boxShadow: '0 0 40px rgba(255,59,48,0.06)',
      }}>

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-start gap-3" style={{ borderColor: 'rgba(255,59,48,0.15)' }}>
        <ShieldCheck className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-black text-brand-text leading-snug">{config.headline}</p>
          <p className="text-xs text-brand-sub mt-0.5">{config.subtext}</p>
        </div>
      </div>

      {/* Resources */}
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {config.resources.map((r) => (
          <a
            key={r.name}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-brand-text group-hover:text-white transition-colors">
                  {r.name}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${BADGE_STYLES[r.badgeColor]}`}>
                  {r.badge}
                </span>
              </div>
              <p className="text-xs text-brand-sub leading-relaxed">{r.desc}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-brand-sub/50 group-hover:text-red-400 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <p className="text-[10px] text-brand-sub/40">
          Resources are independently curated. GetScrewedScore has no financial relationship with these providers.
        </p>
        <a href="mailto:partners@rembydesign.com"
          className="text-[10px] text-brand-sub/40 hover:text-red-400 transition-colors whitespace-nowrap ml-4 shrink-0">
          List your business →
        </a>
      </div>
    </div>
  )
}
