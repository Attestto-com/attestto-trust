/**
 * Tests for the EU LOTL pointer parser, against the real captured LOTL.
 * No network access — same philosophy as monitor-pe.test.mjs.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseLotlPointers } from '../scripts/monitors/lib/extract-lotl.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOTL = readFileSync(join(__dirname, 'fixtures', 'eu-lotl.xml'), 'utf8')

describe('extract-lotl.parseLotlPointers', () => {
  const pointers = parseLotlPointers(LOTL)

  it('parses every national territory (27 EU + IS/LI/NO + UK = 31)', () => {
    assert.equal(pointers.length, 31)
  })

  it('skips the EU self-pointer', () => {
    assert.ok(!pointers.some((p) => p.territory === 'EU'))
  })

  it('selects the machine-readable XML pointer even when the URL extension is unusual', () => {
    // Czechia uses .xtsl, Denmark ends in "...v6xml" (no dot) — an
    // extension heuristic would drop both; MimeType selection keeps them.
    assert.equal(pointers.find((p) => p.territory === 'CZ')?.tslUrl, 'https://tsl.gov.cz/publ/TSL_CZ.xtsl')
    assert.equal(pointers.find((p) => p.territory === 'DK')?.tslUrl, 'https://www.digst.dk/TSLDK_v6xml')
  })

  it('normalizes the two eIDAS/ISO divergences (EL→gr, UK→gb)', () => {
    assert.equal(pointers.find((p) => p.territory === 'EL')?.iso2, 'gr')
    assert.equal(pointers.find((p) => p.territory === 'UK')?.iso2, 'gb')
  })

  it('gives every territory an XML TSL location and an iso2 dir name', () => {
    for (const p of pointers) {
      assert.match(p.tslUrl, /^https?:\/\//)
      assert.match(p.iso2, /^[a-z]{2}$/)
    }
  })

  it('returns an empty list for non-LOTL XML instead of throwing', () => {
    assert.deepEqual(parseLotlPointers('<nope/>'), [])
  })

  it('extracts at least one signing identity per pointer', () => {
    const pointers = parseLotlPointers(LOTL)
    for (const p of pointers) {
      assert.ok(Array.isArray(p.signingIdentities), `${p.iso2}: no signingIdentities`)
      assert.ok(p.signingIdentities.length >= 1, `${p.iso2}: empty signingIdentities`)
      for (const id of p.signingIdentities) {
        assert.ok(['cert', 'ski', 'subject'].includes(id.type))
        assert.ok(id.value)
      }
    }
  })
})
