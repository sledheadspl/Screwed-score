// After every successful production deploy, tell IndexNow-enabled search
// engines (Bing, Yandex, Seznam, Naver; Bing powers DuckDuckGo and Yahoo) that
// the URLs in the live sitemap may have changed, so new and updated pages get
// crawled in hours instead of weeks. Google does not use IndexNow; it reads
// the sitemap via Search Console.
//
// The key is not a secret: IndexNow verifies ownership by fetching
// https://www.screwedscore.com/<key>.txt, which lives in public/.
//
// This plugin never fails a build or a deploy. Any error is logged and ignored.

const HOST = 'www.screwedscore.com'
const KEY = '3e0a53071d4291002e7c55bb5d9c3f50'
const ENDPOINT = 'https://api.indexnow.org/indexnow'
const MAX_URLS = 10000 // IndexNow's per-request limit

async function liveSitemapUrls() {
  const res = await fetch(`https://${HOST}/sitemap.xml`, { headers: { 'user-agent': 'screwedscore-indexnow' } })
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`)
  const xml = await res.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(m => m[1].trim())
    .filter(u => u.startsWith(`https://${HOST}/`) || u === `https://${HOST}`)
    .slice(0, MAX_URLS)
}

module.exports = {
  async onSuccess({ utils }) {
    if (process.env.CONTEXT !== 'production') {
      console.log('[indexnow] skipped: not a production deploy')
      return
    }
    try {
      const urlList = await liveSitemapUrls()
      if (urlList.length === 0) {
        console.log('[indexnow] skipped: sitemap had no URLs')
        return
      }
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: HOST,
          key: KEY,
          keyLocation: `https://${HOST}/${KEY}.txt`,
          urlList,
        }),
      })
      console.log(`[indexnow] submitted ${urlList.length} URLs, response ${res.status}`)
    } catch (err) {
      console.log(`[indexnow] skipped: ${err && err.message ? err.message : err}`)
      if (utils && utils.status) utils.status.show({ summary: 'IndexNow ping skipped (non-fatal)' })
    }
  },
}
