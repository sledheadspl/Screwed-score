// Pack tracking exists so the bot can answer "how many packs so far?" from the
// real number. These checks cover the tally, the undo a mis-tap needs, and -
// most importantly - that the count actually reaches the model.

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { loadStream, addPack, undoPack, setContext, resetPacks, streamFacts, packBreakdown, stream } from './stream.js'

let failures = 0
const check = async (name, fn) => {
  try { await fn(); console.log(`  ok  ${name}`) }
  catch (err) { failures += 1; console.error(`FAIL  ${name}\n      ${err.message}`) }
}

const root = mkdtempSync(path.join(tmpdir(), 'modbot-stream-'))
delete process.env.MOD_BOT_STATE
await loadStream(root)

console.log('counting')
await check('a fresh stream has no packs', () => assert.equal(stream.total, 0))
await check('adding a pack counts it', async () => {
  const r = await addPack('Prismatic Evolutions')
  assert.equal(r.total, 1)
  assert.equal(stream.byName['Prismatic Evolutions'], 1)
})
await check('adding several at once', async () => {
  const r = await addPack('Prismatic Evolutions', 5)
  assert.equal(r.total, 6)
})
await check('a second pack name is tracked separately', async () => {
  await addPack('Surging Sparks', 2)
  assert.equal(stream.total, 8)
  assert.deepEqual(packBreakdown(), [['Prismatic Evolutions', 6], ['Surging Sparks', 2]])
})
await check('a blank name does not vanish silently', async () => {
  await addPack('   ')
  assert.equal(stream.byName.unnamed, 1)
})
await check('quantity is clamped to something sane', async () => {
  const r = await addPack('Bulk', 99999)
  assert.equal(r.qty, 100)
})

console.log('\nundo, because mis-taps happen live')
await check('undo removes the last entry', async () => {
  const before = stream.total
  const undone = await undoPack()
  assert.equal(undone.name, 'Bulk')
  assert.equal(stream.total, before - 100)
})
await check('a name drops off the breakdown at zero', async () => {
  await addPack('Oops', 1)
  await undoPack()
  assert.equal(stream.byName.Oops, undefined)
})
await check('undo on an empty log is harmless', async () => {
  await resetPacks()
  assert.equal(await undoPack(), null)
  assert.equal(stream.total, 0)
})

console.log('\nwhat the model is told')
await check('with nothing opened it says so plainly', () => {
  assert.match(streamFacts(), /No packs have been opened yet/)
})
await check('the real count and breakdown reach the prompt', async () => {
  await addPack('Prismatic Evolutions', 3)
  await addPack('Surging Sparks', 1)
  const facts = streamFacts()
  assert.match(facts, /Packs opened so far this stream: 4/)
  assert.match(facts, /Prismatic Evolutions x3/)
  assert.match(facts, /Surging Sparks x1/)
})
await check('host notes are included', async () => {
  await setContext('Opening a sealed booster box, going for the Umbreon alt art.')
  assert.match(streamFacts(), /Umbreon alt art/)
})
await check('notes are length-capped', async () => {
  await setContext('x'.repeat(5000))
  assert.equal(stream.context.length, 2000)
  await setContext('Opening a sealed booster box.')
})

console.log('\nrapid taps must not corrupt the file')
await check('a concurrent burst on a large state stays valid JSON', async () => {
  // A long stream fills the log, which pushes a single write past one syscall.
  // Overlapping saves used to let a short write land inside a longer one.
  const big = mkdtempSync(path.join(tmpdir(), 'modbot-burst-'))
  await loadStream(big)
  for (let i = 0; i < 400; i++) await addPack(`Pack-${i}-${'x'.repeat(120)}`)
  assert.ok(readFileSync(stream.file, 'utf8').length > 100_000, 'state should be large enough to matter')

  // No awaiting between taps - this is what holding +1 does.
  await Promise.all(Array.from({ length: 30 }, () => addPack('short')))

  const onDisk = JSON.parse(readFileSync(stream.file, 'utf8'))
  assert.equal(onDisk.total, stream.total, 'disk must agree with memory')
  assert.equal(onDisk.log.length, stream.log.length)
})
await check('no temp file is left behind', () => {
  assert.equal(existsSync(`${stream.file}.tmp`), false)
})

console.log('\npersistence across a restart')
await check('the tally survives a reload', async () => {
  await loadStream(root)
  await addPack('Prismatic Evolutions', 3)
  await setContext('Opening a sealed booster box.')
  const before = { total: stream.total, context: stream.context }
  stream.total = 0
  stream.byName = {}
  stream.context = ''
  await loadStream(root)
  assert.equal(stream.total, before.total)
  assert.equal(stream.context, before.context)
})
await check('a corrupt state file does not stop the bot, and says so', async () => {
  writeFileSync(path.join(root, 'stream-state.json'), '{ not json')
  const warnings = []
  await loadStream(root, w => warnings.push(w))
  assert.equal(warnings.length, 1, 'losing the tally in silence is the real failure')
  assert.match(warnings[0], /pack tally starts from zero/)
})

console.log(failures ? `\n${failures} failing` : '\nall passing')
process.exit(failures ? 1 : 0)
