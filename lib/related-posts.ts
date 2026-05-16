import { getAllPosts, type PostMeta } from './blog'

export function getRelatedPosts(
  currentSlug: string,
  currentCategory: string | undefined,
  limit = 3
): PostMeta[] {
  const all = getAllPosts()
  const sameCategory = currentCategory
    ? all.filter(p => p.slug !== currentSlug && p.category === currentCategory)
    : []

  if (sameCategory.length >= limit) return sameCategory.slice(0, limit)

  const others = all.filter(p => p.slug !== currentSlug && !sameCategory.includes(p))
  return [...sameCategory, ...others].slice(0, limit)
}
