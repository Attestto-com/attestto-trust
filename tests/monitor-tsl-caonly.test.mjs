/**
 * Tests the caOnly filter added for the EU LOTL flow: extractCertsFromTsl
 * should drop leaf/end-entity certs (TSA, OCSP, per-service) and keep only
 * CA certificates (roots + intermediates), driven by each cert's
 * basicConstraints CA bit (surfaced as isCA in extract-certs.mjs).
 *
 * Uses the real Peru TSL fixture, which contains a mix.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractCertsFromTsl } from '../scripts/monitors/lib/extract-tsl.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TSL = readFileSync(join(__dirname, 'fixtures', 'tsl-pe.xml'))

describe('extract-tsl caOnly filter', () => {
  const all = extractCertsFromTsl(TSL)
  const caOnly = extractCertsFromTsl(TSL, { caOnly: true })

  it('every parsed cert carries an isCA boolean', () => {
    assert.ok(all.certs.length > 0)
    for (const c of all.certs) assert.equal(typeof c.isCA, 'boolean')
  })

  it('caOnly keeps strictly fewer certs (some non-CA certs are filtered)', () => {
    assert.ok(caOnly.certs.length < all.certs.length)
    assert.ok(caOnly.certs.length > 0)
  })

  it('every cert surviving caOnly is a CA', () => {
    for (const c of caOnly.certs) assert.equal(c.isCA, true)
  })

  it('the filtered-out certs are exactly the non-CA ones', () => {
    const expectedKept = all.certs.filter((c) => c.isCA).length
    assert.equal(caOnly.certs.length, expectedKept)
  })
})
