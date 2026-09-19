// The extension's escalation helper, exercised directly. Section 6 says repeat
// standing offenders go delete -> timeout -> ban; this pins that the counting is
// per-person and that judgment calls are never fed through it.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const sandbox = {}
new Function('self', readFileSync(path.resolve(HERE, '..', '..', 'src', 'engine', 'engine.js'), 'utf8'))(sandbox)
const { escalate } = sandbox.ModBot

let failures = 0
const check = (name, fn) => {
  try { fn(); console.log(`  ok  ${name}`) }
  catch (err) { failures += 1; console.error(`FAIL  ${name}\n      ${err.message}`) }
}

const cfg = { enabled: true, timeoutAt: 2, banAt: 3 }

console.log('escalation')
check('first hit keeps the base action', () => {
  const s = new Map()
  assert.equal(escalate(s, 'Repeat', 'delete', cfg).action, 'delete')
})
check('second hit times out', () => {
  const s = new Map()
  escalate(s, 'Repeat', 'delete', cfg)
  assert.equal(escalate(s, 'Repeat', 'delete', cfg).action, 'timeout')
})
check('third hit bans', () => {
  const s = new Map()
  for (let i = 0; i < 2; i++) escalate(s, 'Repeat', 'delete', cfg)
  assert.equal(escalate(s, 'Repeat', 'delete', cfg).action, 'ban')
})
check('past the ban threshold it stays banned', () => {
  const s = new Map()
  for (let i = 0; i < 4; i++) escalate(s, 'Repeat', 'delete', cfg)
  assert.equal(escalate(s, 'Repeat', 'delete', cfg).action, 'ban')
})
check('a different person starts clean', () => {
  const s = new Map()
  for (let i = 0; i < 3; i++) escalate(s, 'Repeat', 'delete', cfg)
  assert.equal(escalate(s, 'Someone Else', 'delete', cfg).action, 'delete')
})
check('a category action stronger than the step is respected', () => {
  const s = new Map()
  // hate ships as 'ban'; a first offence should not be softened to delete.
  assert.equal(escalate(s, 'A', 'ban', cfg).action, 'ban')
})
check('disabled escalation never climbs', () => {
  const s = new Map()
  const off = { enabled: false }
  for (let i = 0; i < 5; i++) assert.equal(escalate(s, 'A', 'delete', off).action, 'delete')
})
check('custom thresholds are honoured', () => {
  const s = new Map()
  const strict = { enabled: true, timeoutAt: 2, banAt: 2 }
  escalate(s, 'A', 'delete', strict)
  assert.equal(escalate(s, 'A', 'delete', strict).action, 'ban')
})

console.log(failures ? `\n${failures} failing` : '\nall passing')
process.exit(failures ? 1 : 0)
