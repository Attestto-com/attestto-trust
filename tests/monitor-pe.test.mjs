/**
 * Tests for the Peru TSL extractor, against the real INDECOPI/IOFE TSL
 * captured as a fixture. No network access — same philosophy as
 * monitor-cl.test.mjs.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractCertsFromTsl } from '../scripts/monitors/lib/extract-tsl.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_TSL = readFileSync(join(__dirname, 'fixtures', 'tsl-pe.xml'))

describe('extract-tsl.extractCertsFromTsl', () => {
  const { certs, skipped, error } = extractCertsFromTsl(FIXTURE_TSL)

  it('parses without error', () => {
    assert.equal(error, null)
  })

  it('finds certs for known TSPs with correct org attribution', () => {
    const reniec = certs.find((c) => c.org === 'RENIEC')
    assert.ok(reniec, 'RENIEC not found')
    const comodo = certs.find((c) => c.org === 'COMODO CA')
    assert.ok(comodo, 'COMODO CA not found')
  })

  it('every cert has a valid sha256 and role', () => {
    assert.ok(certs.length > 0)
    for (const c of certs) {
      assert.match(c.sha256, /^[0-9a-f]{64}$/)
      assert.ok(c.role === 'root' || c.role === 'intermediate')
    }
  })

  it('skips services with a non-standard/non-active status instead of staging them', () => {
    const noAcredited = skipped.find((s) => s.status === 'No acredited')
    assert.ok(noAcredited, 'expected at least one "No acredited" service to be skipped')
    assert.equal(noAcredited.reason, 'not-under-supervision')
  })

  it('accounts for every X509Certificate in the document as either staged or skipped', () => {
    const totalCertsInDoc = (FIXTURE_TSL.toString('utf-8').match(/<tsl:X509Certificate>/g) || []).length
    assert.equal(certs.length + skipped.length, totalCertsInDoc)
  })
})

describe('extract-tsl.extractCertsFromTsl edge cases', () => {
  it('reports an error instead of throwing on non-TSL XML', () => {
    const { certs, error } = extractCertsFromTsl(Buffer.from('<not-a-tsl/>'))
    assert.deepEqual(certs, [])
    assert.ok(error)
  })

  it('never throws on garbage input', () => {
    assert.doesNotThrow(() => extractCertsFromTsl(Buffer.from('not xml at all')))
  })
})
