// The four ScrewedScore Academy courses: one source of truth for the /academy
// catalog and each course's own page (/academy/[slug]).
// Client-safe: no server imports. Checkout prices live in
// pages/api/product-checkout; the course files in private/downloads/.

import { FileSearch, Gauge, Ear, Scale, type LucideIcon } from 'lucide-react'

export interface CourseModule {
  title: string
  summary: string
}

export interface Course {
  /** Stripe/checkout product id. */
  id: string
  /** URL segment: /academy/<slug>. */
  slug: string
  icon: LucideIcon
  title: string
  subtitle: string
  price: string
  priceUsd: number
  badge: string | null
  metaDescription: string
  whoFor: string[]
  outcomes: string[]
  modules: CourseModule[]
}

export const COURSES: Course[] = [
  {
    id: 'academy-estimate-mastery',
    slug: 'repair-estimate-mastery',
    icon: FileSearch,
    title: 'Repair Estimate Mastery',
    subtitle: 'Read, question, and negotiate any auto repair estimate like a service advisor would.',
    price: '$39',
    priceUsd: 39,
    badge: 'Best Seller',
    metaDescription: 'A 7-module course in reading, questioning and negotiating any auto repair estimate: parts, labor guides, diagnosis fees, your rights, and a full real-estimate walkthrough.',
    whoFor: [
      'You just got a repair quote and have no idea if it is fair.',
      'Two shops gave you wildly different prices for the same job.',
      'You want to ask the right questions without sounding like you are accusing anyone.',
    ],
    outcomes: [
      'Break any estimate into its five parts and spot the lines that need a question.',
      'Check quoted labor hours against the guides shops actually use.',
      'Tell a real diagnosis from a trouble code someone read off a scanner.',
      'Negotiate, or get a second opinion, without burning the relationship.',
    ],
    modules: [
      { title: 'How a Shop Actually Builds a Price', summary: 'Why two shops quote different numbers for the same job: parts, labor, overhead and margin, stacked together.' },
      { title: 'Reading Any Estimate Line by Line', summary: 'The five parts of every legitimate estimate, what proper documentation looks like, and the wording that should make you ask.' },
      { title: "What 'Diagnosed' Actually Means", summary: 'The most important idea in the course: a trouble code is the computer\'s story, not a diagnosis, and what to ask for instead.' },
      { title: 'Labor Time Guides Decoded', summary: 'How Mitchell1 and ALLDATA hours work, and how to check whether the time on your quote is reasonable.' },
      { title: 'Negotiating and Getting a Second Opinion', summary: 'Being the well-informed customer shops respect: what to say, when to push, and how to get a second quote.' },
      { title: 'Your Consumer Protection Rights', summary: 'Written estimates, authorizations and returned parts: what to look up for your state before real money is on the line.' },
      { title: 'Full Walkthrough of a Real Estimate', summary: 'One complete, realistic estimate taken through every lens from the course, the way you\'ll read your next one.' },
    ],
  },
  {
    id: 'academy-check-engine',
    slug: 'check-engine-light-course',
    icon: Gauge,
    title: 'Check Engine Light: Complete Diagnostic Course',
    subtitle: 'Read OBD2 codes like a technician and follow a real diagnostic tree instead of guessing at parts.',
    price: '$39',
    priceUsd: 39,
    badge: null,
    metaDescription: 'A 7-module course to diagnose your own check engine light: how the system works, reading OBD2 codes, a system-by-system diagnostic tree, common codes, tools, and when to call a pro.',
    whoFor: [
      'Your check engine light is on and you want to know what it means before a shop tells you.',
      'You bought a code reader but the code alone did not tell you what to fix.',
      'You are tired of replacing parts that were never the problem.',
    ],
    outcomes: [
      'Read every part of a code like P0301 and know what it does and does not say.',
      'Follow a cheapest-and-likeliest-first diagnostic tree instead of guessing.',
      'Know which tools are worth buying for how deep you want to go.',
      'Decide with confidence when to DIY and when a pro is cheaper.',
    ],
    modules: [
      { title: 'How the System Actually Works', summary: 'What the engine computer monitors, why the light comes on, and what it is actually telling you.' },
      { title: 'Reading Codes Like a Technician', summary: 'The four parts of every code, and why reading all four is the difference between a diagnosis and a guess.' },
      { title: 'The Diagnostic Tree — A System-by-System Method', summary: 'An order of operations: check the cheap, likely causes first and only then move to the expensive ones.' },
      { title: 'Common Codes, Deep Dive', summary: 'The codes you are most likely to see, the diagnostic path for each, and what usually causes them in practice.' },
      { title: 'Tools of the Trade', summary: 'Scan tools and testers by tier, so you spend for the depth you actually want.' },
      { title: 'When to DIY and When to Call a Pro', summary: 'Where DIY diagnosis saves the most, and the codes where it can cost you more than a shop would.' },
      { title: 'A Full Diagnose-Along Case Study', summary: 'A 95,000-mile sedan with a rough idle, taken from light-on to fixed, step by step.' },
    ],
  },
  {
    id: 'academy-noise-diagnosis',
    slug: 'car-noise-diagnosis-course',
    icon: Ear,
    title: 'Car Noise Diagnosis: Complete Course',
    subtitle: "Train your ear system by system and stop guessing at what's making that sound.",
    price: '$29',
    priceUsd: 29,
    badge: null,
    metaDescription: 'A 7-module course to identify car noises: a listening method, engine, suspension, brake and drivetrain noises, how to describe them to a shop, and ten real case studies.',
    whoFor: [
      'Your car is making a noise and "a weird sound" is all you can tell the shop.',
      'You want to know whether a noise is urgent or can wait.',
      'You want a faster, cheaper shop visit because you can describe the problem precisely.',
    ],
    outcomes: [
      'Use a mechanic\'s method: isolate one variable at a time until one cause is left.',
      'Recognize the classic engine, suspension, brake and drivetrain sounds.',
      'Know which noises mean stop driving now.',
      'Hand a shop a clear write-up that gets you a faster, cheaper diagnosis.',
    ],
    modules: [
      { title: 'How to Listen Like a Mechanic', summary: 'The method behind a trained ear: speed, load, temperature and steering, changed one at a time.' },
      { title: 'Engine and Accessory Noises, Deep Dive', summary: 'Ticks, knocks, whines and squeals from the engine bay, and the oil check to do first.' },
      { title: 'Suspension and Steering Noises, Deep Dive', summary: 'Clunks over bumps and creaks when turning: end links, strut mounts, bushings and joints.' },
      { title: 'Brake Noises, Deep Dive', summary: 'Wear-indicator squeal versus grinding, and what each one means for how soon you need brakes.' },
      { title: 'Drivetrain and Wheel Noises, Deep Dive', summary: 'Clicking on sharp turns, humming that grows with speed: CV joints, wheel bearings and more.' },
      { title: 'Documenting and Communicating with a Shop', summary: 'Turning what you heard into a write-up that gets a faster, cheaper, more accurate visit.' },
      { title: 'Ten Real Case Studies', summary: 'Ten real complaints with the same limited information a customer has, reasoned through with the method.' },
    ],
  },
  {
    id: 'academy-fight-back',
    slug: 'fight-back-dispute-course',
    icon: Scale,
    title: 'Fight Back: Complete Dispute & Consumer Protection Course',
    subtitle: 'Win almost any dispute — bad bill, bad charge, bad service — with the letters already written.',
    price: '$39',
    priceUsd: 39,
    badge: null,
    metaDescription: 'A 7-module system for disputing bad bills, bad charges and bad service: credit card and bank disputes, medical bills, auto repair, online purchases, regulators, small claims, and a full letter library.',
    whoFor: [
      'You were overcharged, double-billed or charged for something you never got.',
      'A business stopped answering and you do not know where to escalate.',
      'You want the letters and scripts written for you, not a blank page.',
    ],
    outcomes: [
      'Build the paper trail that wins disputes before you send a single letter.',
      'Use your credit card dispute rights inside the deadlines that apply.',
      'Challenge medical bills, auto repairs and online purchases with the right approach for each.',
      'Know which regulator or court to take it to when the business will not budge.',
    ],
    modules: [
      { title: 'The Mindset and the Paper Trail', summary: 'How to document a dispute so it holds up, and the calm, written approach that gets results.' },
      { title: 'Credit Card and Bank Disputes, Deep Dive', summary: 'Your billing-error dispute rights, the deadlines that apply, and how to word a dispute that sticks.' },
      { title: 'Medical Billing Disputes, Deep Dive', summary: 'Codes, insurance adjudication and network status: where medical billing errors hide and how to challenge them.' },
      { title: 'Auto Repair and Contractor Disputes, Deep Dive', summary: 'What to do when a repair or contractor job still goes wrong after you did everything right.' },
      { title: 'Online Purchase and Marketplace Disputes', summary: 'Packages that never arrived, items not as described, sellers who vanish: working the platform and the payment.' },
      { title: 'Regulators, Agencies, and Small Claims Court', summary: 'A routing guide that matches your situation to the regulator or venue most likely to move it.' },
      { title: 'Your Complete Letter and Script Library', summary: 'Every template from the course in one place, ready to copy, fill in and send.' },
    ],
  },
]

export const COURSE_BY_SLUG: Record<string, Course> = Object.fromEntries(COURSES.map(c => [c.slug, c]))

export const BUNDLE = {
  id: 'academy-bundle',
  price: '$106',
  priceUsd: 106,
  fullPriceUsd: COURSES.reduce((sum, c) => sum + c.priceUsd, 0),
}
