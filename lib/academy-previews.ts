// Public lesson pages for the Quick-Fix guides: /academy/quick-fix/[slug].
//
// Each page shows the free preview of a guide (about 20%: intro, what you'll
// learn, the step outline and Step 1 in full), built by
// scripts/academy/build_previews.py into lib/academy-previews.generated.ts.
// Import this only from server components: the previews are page content, not
// something the client bundle needs.

import { QF_LESSONS, QF_BUNDLES, QF_SERIES, QF_EVERYTHING, type QuickFixLesson, type QuickFixBundle } from './quick-fix'
import { LESSON_PREVIEWS } from './academy-previews.generated'

export interface LessonPreview {
  file: string
  subtitle: string
  time: string
  level: string
  intro: string
  save: { label: string; value: string }[]
  learn: string[]
  outline: { label: string; title: string }[]
  firstStep: {
    label: string
    title: string
    items: string[]
    notes: { kind: 'tip' | 'warn' | string; text: string }[]
  }
}

export interface LessonPage {
  slug: string
  lesson: QuickFixLesson
  preview: LessonPreview
  /** e.g. "Car Care" or "Series 1 · Car". */
  seriesLabel: string
  /** Anchor on /academy where the lesson's series is listed. */
  seriesHref: string
}

const BASE_PATH = '/academy/quick-fix'

/** "qf-oil-change" -> "oil-change". */
export const lessonSlug = (lesson: QuickFixLesson) => lesson.id.replace(/^qf-/, '')
export const lessonPath = (lesson: QuickFixLesson) => `${BASE_PATH}/${lessonSlug(lesson)}`

const SERIES1_LABEL: Record<string, string> = { car: 'Car Repair', home: 'Home Repair' }

function toPage(lesson: QuickFixLesson): LessonPage | null {
  const preview = LESSON_PREVIEWS[lesson.file]
  if (!preview) return null
  const series = lesson.series ? QF_SERIES.find(s => s.id === lesson.series) : undefined
  return {
    slug: lessonSlug(lesson),
    lesson,
    preview,
    seriesLabel: series ? series.label : SERIES1_LABEL[lesson.category] ?? 'Quick-Fix',
    seriesHref: series ? `/academy#qf-${series.id}` : '/academy#quick-fix',
  }
}

/** Every Quick-Fix lesson that has a preview, in catalog order. */
export const LESSON_PAGES: LessonPage[] = QF_LESSONS.map(toPage).filter((p): p is LessonPage => p !== null)

export const LESSON_PAGE_BY_SLUG: Record<string, LessonPage> =
  Object.fromEntries(LESSON_PAGES.map(p => [p.slug, p]))

/** The smallest pack that contains this lesson (a series pack, or the Series 1 car/home pack). */
export function packFor(lesson: QuickFixLesson): QuickFixBundle | null {
  const packs = QF_BUNDLES
    .filter(b => b.id !== QF_EVERYTHING.id && b.priceId && b.includes.includes(lesson.id))
    .sort((a, b) => a.includes.length - b.includes.length)
  return packs[0] ?? null
}

/** Other lessons in the same series (or the same Series 1 category). */
export function relatedLessons(page: LessonPage, limit = 6): LessonPage[] {
  const { lesson } = page
  return LESSON_PAGES
    .filter(p => p.slug !== page.slug &&
      (lesson.series ? p.lesson.series === lesson.series : !p.lesson.series && p.lesson.category === lesson.category))
    .slice(0, limit)
}

/** Groups for the /academy/quick-fix index: Series 1 car, Series 1 home, then Series 2–6. */
export function lessonGroups(): { id: string; title: string; blurb: string; pages: LessonPage[] }[] {
  const s1 = LESSON_PAGES.filter(p => !p.lesson.series)
  return [
    { id: 'car-repair', title: 'Car Repair', blurb: 'Diagnose and fix the jobs shops charge the most for.', pages: s1.filter(p => p.lesson.category === 'car') },
    { id: 'home-repair', title: 'Home Repair', blurb: 'The plumbing, electrical and drywall fixes you can do yourself.', pages: s1.filter(p => p.lesson.category === 'home') },
    ...QF_SERIES.map(s => ({ id: s.id, title: s.label, blurb: s.blurb, pages: LESSON_PAGES.filter(p => p.lesson.series === s.id) })),
  ].filter(g => g.pages.length > 0)
}
