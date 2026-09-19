// Finds the channel's current live broadcast by reading the public /live page.
// YouTube redirects that URL to the watch page while live, so the canonical
// link is the signal — no API key and no quota involved.

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

// Accepts a channel id (UC...), an @handle, or a full channel URL.
export function liveUrlFor (channel) {
  const trimmed = channel.trim()
  if (/^https?:\/\//i.test(trimmed)) return `${trimmed.replace(/\/+$/, '')}/live`
  if (trimmed.startsWith('@')) return `https://www.youtube.com/${trimmed}/live`
  if (/^UC[\w-]{20,}$/.test(trimmed)) return `https://www.youtube.com/channel/${trimmed}/live`
  return `https://www.youtube.com/@${trimmed}/live`
}

export async function findLiveVideoId (channel) {
  const url = liveUrlFor(channel)
  const res = await fetch(url, {
    headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
  })

  // A failed request must not read as "not live". Returning null for both
  // would let the bot poll in silence through an entire broadcast.
  if (res.status === 404) {
    throw new Error(`channel not found: ${url} returned 404 - check the "channel" setting`)
  }
  if (!res.ok) {
    throw new Error(`${url} returned ${res.status} - could not tell whether the channel is live`)
  }

  const html = await res.text()

  // While live, canonical points at the watch page for the broadcast.
  const canonical = /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/.exec(html)
  if (canonical) {
    // A premiere or an ended stream still resolves; isLive tells them apart.
    if (/"isLiveNow":true|"isLive":true/.test(html)) return canonical[1]
    return null
  }
  return null
}
