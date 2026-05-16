/**
 * Blog post loader. Reads markdown from content/blog/*.md, parses frontmatter,
 * renders to HTML. Results cached per-build via module-level memoization.
 */
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkHtml from 'remark-html'
import remarkGfm from 'remark-gfm'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export type PostFrontmatter = {
  title: string
  slug: string
  description: string
  keyword?: string
  category?: string
  date: string
}

export type PostMeta = PostFrontmatter & {
  filePath: string
}

export type Post = {
  frontmatter: PostFrontmatter
  html: string
  raw: string
}

let _allPostsCache: PostMeta[] | null = null
const _postCache = new Map<string, Post>()

function ensureDir(): void {
  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true })
  }
}

export function getAllPosts(): PostMeta[] {
  if (_allPostsCache) return _allPostsCache
  ensureDir()

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))
  const posts: PostMeta[] = []

  for (const file of files) {
    const filePath = path.join(BLOG_DIR, file)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data } = matter(raw)
    const fm = data as Partial<PostFrontmatter>

    const slug = fm.slug ?? file.replace(/\.md$/, '')
    if (!fm.title || !fm.date) continue

    posts.push({
      title: fm.title,
      slug,
      description: fm.description ?? '',
      keyword: fm.keyword,
      category: fm.category,
      date: fm.date,
      filePath,
    })
  }

  posts.sort((a, b) => (a.date < b.date ? 1 : -1))
  _allPostsCache = posts
  return posts
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (_postCache.has(slug)) return _postCache.get(slug)!

  const meta = getAllPosts().find(p => p.slug === slug)
  if (!meta) return null

  const raw = fs.readFileSync(meta.filePath, 'utf-8')
  const { data, content } = matter(raw)
  const fm = data as PostFrontmatter

  const processed = await remark().use(remarkGfm).use(remarkHtml).process(content)
  const html = String(processed)

  const post: Post = { frontmatter: { ...fm, slug }, html, raw: content }
  _postCache.set(slug, post)
  return post
}
