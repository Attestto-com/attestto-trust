import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseNextUpdate, isFresh } from '../scripts/monitors/lib/tsl-meta.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOTL = readFileSync(join(__dirname, 'fixtures', 'eu-lotl.signed.xml'), 'utf8')

describe('tsl-meta', () => {
  it('parses a NextUpdate date from the LOTL', () => {
    const d = parseNextUpdate(LOTL)
    assert.ok(d instanceof Date && !Number.isNaN(d.getTime()))
  })
  it('isFresh true before NextUpdate, false after', () => {
    const nu = parseNextUpdate(LOTL)
    assert.equal(isFresh(LOTL, new Date(nu.getTime() - 86400000)), true)
    assert.equal(isFresh(LOTL, new Date(nu.getTime() + 86400000)), false)
  })
})
