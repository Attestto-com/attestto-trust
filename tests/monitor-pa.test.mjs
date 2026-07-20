/**
 * Tests for the Panama adapter's static shape — no network access.
 * Same rationale as monitor-uy.test.mjs: no country-specific parsing
 * logic here, just 3 direct cert files already handled generically.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { BASE, FILES } from '../scripts/monitors/sources/pa.mjs'

describe('pa source adapter', () => {
  it('serves from an HTTPS base URL', () => {
    assert.match(BASE, /^https:\/\//)
  })

  it('lists exactly the 3 confirmed cert files (root + 2 issuing CAs)', () => {
    assert.equal(FILES.length, 3)
    const filenames = FILES.map((f) => f.filename)
    assert.deepEqual(filenames, ['caraiz.crt', 'cagob.crt', 'capc2.crt'])
  })

  it('every file resolves to a full HTTPS URL recognized by CERT_DIRECT_EXT', () => {
    for (const f of FILES) {
      assert.match(BASE + f.filename, /^https:\/\/.+\.crt$/)
    }
  })
})
