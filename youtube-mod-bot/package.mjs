#!/usr/bin/env node
// Builds the extension-only download: just the files Chrome loads, nothing
// else. The full repo folder also loads fine, but it carries headless/ and
// extest/ alongside, and picking the wrong folder in Load unpacked is a real
// way to lose ten minutes to "Manifest file is missing or unreadable".
//
//   node package.mjs            -> dist/pokebank-mod-bot/ and the .zip
//
// The file list is checked against what the code actually references rather
// than trusted: a hand-assembled zip is how a file goes missing.

import { mkdir, rm, copyFile, readFile, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const NAME = 'pokebank-mod-bot'
const OUT = join(HERE, 'dist', NAME)

const FILES = [
  'manifest.json',
  'popup.html', 'popup.js',
  'options.html', 'options.js',
  'src/content.js', 'src/background.js', 'src/defaults.js',
  'src/engine/engine.js',
  'LOAD-ME.txt',
  // The launcher: one Windows executable, statically linked, with the icon
  // compiled in. Chrome ignores files it does not know about, so it sits
  // happily beside the extension it loads.
  'Pokebank Mod Bot.exe',
]

// Rebuild the launcher from source when Go is available, so the shipped
// executable cannot drift from launcher/*.go. Without Go, the committed one is
// used as-is and said so, rather than silently shipping something stale.
const goBuild = spawnSync('go', [
  'build', '-ldflags=-s -w', '-o', join(HERE, 'Pokebank Mod Bot.exe'), '.',
], {
  cwd: join(HERE, 'launcher'),
  env: { ...process.env, GOOS: 'windows', GOARCH: 'amd64', CGO_ENABLED: '0' },
  encoding: 'utf8',
})
if (goBuild.status === 0) console.log('Rebuilt the launcher from launcher/*.go')
else console.log('Go not available — shipping the committed Pokebank Mod Bot.exe')

await rm(join(HERE, 'dist'), { recursive: true, force: true })
for (const file of FILES) {
  const from = join(HERE, file)
  if (!existsSync(from)) {
    console.error(`missing source file: ${file}`)
    process.exit(1)
  }
  await mkdir(dirname(join(OUT, file)), { recursive: true })
  await copyFile(from, join(OUT, file))
}

// ── verify, rather than trust, the list above ──────────────────────────────

const problems = []
const manifest = JSON.parse(await readFile(join(OUT, 'manifest.json'), 'utf8'))

const declared = [
  ...(manifest.content_scripts ?? []).flatMap(c => c.js ?? []),
  manifest.background?.service_worker,
  manifest.options_page,
  manifest.action?.default_popup,
].filter(Boolean)

for (const ref of declared) {
  if (!existsSync(join(OUT, ref))) problems.push(`manifest references ${ref}, which is not in the package`)
}

// Anything the packaged files themselves pull in, relatively: a new import in
// popup.js would otherwise ship broken and only show up as a blank page.
async function walk (dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await walk(full))
    else out.push(full)
  }
  return out
}

for (const file of await walk(OUT)) {
  if (!/\.(js|html)$/.test(file)) continue
  const body = await readFile(file, 'utf8')
  const refs = [
    ...body.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g),
    ...body.matchAll(/<script[^>]+src=['"]([^'"]+)['"]/g),
    ...body.matchAll(/<link[^>]+href=['"]([^'"]+)['"]/g),
  ].map(m => m[1]).filter(r => !/^(https?:)?\/\//.test(r))

  for (const ref of refs) {
    const target = join(dirname(file), ref)
    if (!existsSync(target)) {
      problems.push(`${relative(OUT, file)} references ${ref}, which is not in the package`)
    }
  }
}

if (problems.length) {
  console.error('Package is incomplete:')
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}

// Zipped with the files at the archive ROOT, not inside a folder of their own.
// Windows Explorer's "Extract All" already creates a folder named after the
// zip, so a zip that also contains one leaves everything two levels down -
// and picking the outer folder in Load unpacked gives exactly "Manifest file
// is missing or unreadable", with no hint that the answer is one level in.
const zip = join(HERE, 'dist', `${NAME}.zip`)
const res = spawnSync('zip', ['-rq', zip, '.'], { cwd: OUT, stdio: 'inherit' })
if (res.status !== 0) {
  console.log(`\nBuilt dist/${NAME}/ — no "zip" command here, so compress that folder yourself.`)
  process.exit(0)
}

// Guard the thing that just went wrong. manifest.json has to be AT the archive
// root: if it is inside a folder, Explorer's own extraction folder puts it two
// levels down and Load unpacked fails on the obvious choice. Subdirectories
// like src/ are fine - it is specifically the manifest's depth that matters.
const listed = spawnSync('zip', ['-sf', zip], { encoding: 'utf8' }).stdout ?? ''
const entries = listed.split('\n').map(l => l.trim().replace(/^\.\//, ''))
if (!entries.includes('manifest.json')) {
  console.error('manifest.json is not at the root of the archive; extraction would nest twice.')
  console.error(entries.filter(Boolean).slice(0, 12).map(e => `  ${e}`).join('\n'))
  process.exit(1)
}

console.log(`Built dist/${NAME}.zip — ${FILES.length} files at the archive root, everything they reference resolves.`)
