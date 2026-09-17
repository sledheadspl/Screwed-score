// Per-stream facts the operator keeps up to date: what packs have been opened,
// and a free-text note for anything else worth knowing.
//
// This exists mostly so the bot can answer viewers accurately. "How many packs
// so far?" is the most asked question in a pack-opening stream, and a model
// with no running tally will invent a number rather than admit it does not
// know. Feeding it the real count is the difference between a useful bot and a
// confidently wrong one.

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const LOG_LIMIT = 500

export const stream = {
  file: null,
  // Free text the operator edits mid-stream: what is being opened today, the
  // goal, house rules - whatever viewers keep asking about.
  context: '',
  total: 0,
  byName: {},        // pack name -> count
  log: [],           // newest first: { at, name, qty }
}

export async function loadStream (root) {
  stream.file = process.env.MOD_BOT_STATE ?? path.join(root, 'stream-state.json')
  if (!existsSync(stream.file)) return stream

  try {
    const saved = JSON.parse(await readFile(stream.file, 'utf8'))
    stream.context = saved.context ?? ''
    stream.total = saved.total ?? 0
    stream.byName = saved.byName ?? {}
    stream.log = saved.log ?? []
  } catch {
    // A corrupt state file must not stop the bot from moderating.
  }
  return stream
}

export async function saveStream () {
  if (!stream.file) return
  const { context, total, byName, log } = stream
  await writeFile(stream.file, `${JSON.stringify({ context, total, byName, log }, null, 2)}\n`, 'utf8')
}

export async function addPack (name, qty = 1) {
  const clean = String(name ?? '').trim() || 'unnamed'
  const count = Math.max(1, Math.min(100, Number(qty) || 1))

  stream.byName[clean] = (stream.byName[clean] ?? 0) + count
  stream.total += count
  stream.log.unshift({ at: Date.now(), name: clean, qty: count })
  if (stream.log.length > LOG_LIMIT) stream.log.length = LOG_LIMIT

  await saveStream()
  return { name: clean, qty: count, total: stream.total }
}

// Undo, because a mis-tap during a stream should not need a text editor.
export async function undoPack () {
  const last = stream.log.shift()
  if (!last) return null

  stream.total = Math.max(0, stream.total - last.qty)
  stream.byName[last.name] = Math.max(0, (stream.byName[last.name] ?? 0) - last.qty)
  if (!stream.byName[last.name]) delete stream.byName[last.name]

  await saveStream()
  return last
}

export async function setContext (text) {
  stream.context = String(text ?? '').trim().slice(0, 2000)
  await saveStream()
  return stream.context
}

export async function resetPacks () {
  stream.total = 0
  stream.byName = {}
  stream.log = []
  await saveStream()
}

export function packBreakdown () {
  return Object.entries(stream.byName).sort((a, b) => b[1] - a[1])
}

// The block handed to Claude. Kept plain and short: it rides on every question,
// and an empty section is worse than no section because it invites guessing.
export function streamFacts () {
  const parts = []
  if (stream.context) parts.push(`Stream notes from the host: ${stream.context}`)

  if (stream.total > 0) {
    const detail = packBreakdown().map(([name, n]) => `${name} x${n}`).join(', ')
    parts.push(`Packs opened so far this stream: ${stream.total} (${detail}).`)
  } else {
    parts.push('No packs have been opened yet this stream.')
  }

  return parts.join(' ')
}
