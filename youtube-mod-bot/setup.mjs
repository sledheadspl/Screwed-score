#!/usr/bin/env node
// Setup and preflight for the YouTube live chat mod bot.
//
//   node setup.mjs              check the machine, prove the engine works
//   node setup.mjs --headless   also set up the browserless service
//   node setup.mjs --browser    also run the extension against a real Chromium
//
// Node rather than a shell script: Node is required for the tests anyway, and
// this then behaves the same on Windows, macOS and Linux instead of needing a
// .sh and a .ps1 that drift apart.

import { spawnSync } from 'node:child_process'
import { existsSync, copyFileSync, readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const args = new Set(process.argv.slice(2))
const wantHeadless = args.has('--headless')
const wantBrowser = args.has('--browser')

let failed = 0
const ok = (label, detail = '') => console.log(`  ok    ${label}${detail ? ` — ${detail}` : ''}`)
const warn = (label, detail = '') => console.log(`  note  ${label}${detail ? ` — ${detail}` : ''}`)
const bad = (label, detail = '') => { failed += 1; console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`) }
const head = title => console.log(`\n${title}\n${'-'.repeat(title.length)}`)

// Inherit stdio so npm's own progress and any test output is visible: a setup
// script that swallows the reason something failed is worse than none.
function run (cmd, cmdArgs, cwd) {
  const res = spawnSync(cmd, cmdArgs, {
    cwd, stdio: 'inherit', shell: process.platform === 'win32',
  })
  return res.status === 0
}

function quiet (cmd, cmdArgs, cwd) {
  const res = spawnSync(cmd, cmdArgs, {
    cwd, encoding: 'utf8', shell: process.platform === 'win32',
  })
  return { okay: res.status === 0, out: `${res.stdout ?? ''}${res.stderr ?? ''}` }
}

console.log('YouTube Live Chat Mod Bot — setup')

// ── the machine ────────────────────────────────────────────────────────────
head('This machine')

const major = Number(process.versions.node.split('.')[0])
if (major >= 20) ok('Node', `v${process.versions.node}`)
else bad('Node', `v${process.versions.node}; this needs 20 or newer (nodejs.org)`)

if (failed) {
  console.log('\nStop here and install a newer Node. Nothing below will work without it.')
  process.exit(1)
}

// ── the extension ──────────────────────────────────────────────────────────
head('Browser extension')

const manifestPath = join(HERE, 'manifest.json')
if (!existsSync(manifestPath)) {
  bad('manifest.json', `not found in ${HERE} — run this from inside the extension folder`)
} else {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    ok('manifest.json', `version ${manifest.version}`)
  } catch (err) {
    bad('manifest.json', `will not parse: ${err.message}`)
  }
}

console.log(`
  Load unpacked wants this exact folder:

      ${resolve(HERE)}

  1. Open  chrome://extensions   (Edge: edge://extensions)
  2. Turn on Developer mode, top right
  3. Load unpacked, and pick the folder above
  4. Open your stream's chat, then pop it out into its own window
     (chat panel -> three dots -> Pop out chat) and leave it visible

  Nothing else is needed for the extension. No terminal, no API key:
  answering questions is off by default, and moderation never calls Claude.`)

// ── the engine ─────────────────────────────────────────────────────────────
head('Proving the engine works')

const headlessDir = join(HERE, 'headless')
if (!existsSync(join(headlessDir, 'node_modules'))) {
  console.log('  installing test dependencies (once)...\n')
  if (!run('npm', ['install'], headlessDir)) bad('npm install', 'see the output above')
}

if (!failed) {
  const res = quiet('npm', ['run', 'selftest'], headlessDir)
  const passed = (res.out.match(/^\s*ok\s/gm) ?? []).length
  if (res.okay) ok('Self-tests', `${passed} assertions`)
  else {
    bad('Self-tests', 'something is broken — full output follows')
    console.log(res.out)
  }
}

// ── optional: the headless service ─────────────────────────────────────────
if (wantHeadless) {
  head('Headless service')

  for (const [example, real] of [['config.example.json', 'config.json'], ['.env.example', '.env']]) {
    const from = join(headlessDir, example)
    const to = join(headlessDir, real)
    if (existsSync(to)) warn(real, 'already there, left alone')
    else if (!existsSync(from)) bad(example, 'missing from the download')
    else { copyFileSync(from, to); ok(real, 'created from the example') }
  }

  console.log(`
  Now edit these two, in ${headlessDir}:

      config.json   set "channel" to your handle, e.g. "@pokebank"
      .env          your five YouTube cookies

  Those cookies are live credentials for whichever account you take them
  from. Use a moderator account, not your main one, and sign that account
  out of YouTube everywhere to revoke them.

  Then:  npm run doctor      (checks it before you go live)
         npm start`)

  console.log('')
  const doctor = quiet('npm', ['run', 'doctor'], headlessDir)
  if (doctor.okay) ok('Doctor', 'passes already')
  else warn('Doctor', 'reports work to do, which is expected before you fill in the two files')
}

// ── optional: the browser suite ────────────────────────────────────────────
if (wantBrowser) {
  head('Extension tests in a real browser')

  const extestDir = join(HERE, 'extest')

  // An MV3 extension will not load in a headless browser, so this opens a real
  // window. Fine on a desktop; on a server it needs a virtual display.
  if (process.platform === 'linux' && !process.env.DISPLAY) {
    warn('No display', 'an extension needs a real browser window — try: xvfb-run -a node setup.mjs --browser')
  }

  if (!existsSync(join(extestDir, 'node_modules'))) {
    console.log('  installing Playwright (once, a few hundred MB)...\n')
    if (!run('npm', ['install'], extestDir)) bad('npm install', 'see the output above')
  }
  if (!failed && !run('npx', ['playwright', 'install', 'chromium'], extestDir)) {
    bad('playwright install', 'could not fetch Chromium')
  }
  if (!failed) {
    const res = quiet('npm', ['test'], extestDir)
    const line = (res.out.match(/^\d+ passed, \d+ failed$/m) ?? [])[0]
    if (res.okay) ok('Browser suite', line ?? 'passed')
    else {
      bad('Browser suite', line ?? 'failed — full output follows')
      console.log(res.out)
    }
  }
}

// ── what to do next ────────────────────────────────────────────────────────
head(failed ? 'Not ready' : 'Next')

if (failed) {
  console.log(`  ${failed} check${failed === 1 ? '' : 's'} failed above. Fix those before loading it.`)
  process.exit(1)
}

console.log(`  Start in dry run. It logs what it WOULD remove and touches nothing.
  Watch one stream that way and read the popup's activity list.

  Dry run does not prove the removal works on your account: it never opens
  a message menu. Once the log looks right, switch to "Ask me", trip a word
  from a second account, and tap Delete. That exercises the real thing once,
  on a message nobody cares about.

  If the log says "no message menu - is this account a moderator of the
  chat?", that is a permissions problem on YouTube, not a bug here.

  Order: dry run -> ask me -> auto. A deletion cannot be undone.`)
