// Where to find a real Chromium. Shared by the harness and by setup.mjs so the
// two cannot disagree about whether a browser exists - they did, and setup
// reported a failed install on a machine whose harness ran perfectly.
//
// An MV3 extension will not load in a headless browser, so this has to be a
// real binary. Playwright's own copy is the right answer on a normal machine;
// the /opt path is only right inside the container this was developed in.

import { existsSync } from 'node:fs'

export function chromeCandidates (chromium) {
  const out = []
  if (process.env.CHROME_PATH) out.push(process.env.CHROME_PATH)
  try {
    const bundled = chromium?.executablePath?.()
    if (bundled) out.push(bundled)
  } catch { /* playwright has no browser registered */ }
  out.push('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
  return out
}

// The path, or null. Never throws: callers decide whether absence is fatal.
export function findChrome (chromium) {
  for (const candidate of chromeCandidates(chromium)) {
    if (candidate && existsSync(candidate)) return candidate
  }
  return null
}

export function describeSearch (chromium) {
  return chromeCandidates(chromium).filter(Boolean).join('\n  ')
}
