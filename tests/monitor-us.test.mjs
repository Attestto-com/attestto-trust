/**
 * Tests for the US (FPKI) adapter's static shape — no network access.
 * The US mirrors the Federal Common Policy root plus the PKCS7 bundle of
 * subordinate CAs it cross-certifies; both are direct downloads handled by
 * the generic CERT_DIRECT_EXT path (exercised against real cert/PKCS7 bytes
 * in monitor-cl.test.mjs).
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { BASE, CERT_URL, FILES } from '../scripts/monitors/sources/us.mjs'

describe('us source adapter', () => {
  it('serves from an HTTPS base at the official FPKI repository', () => {
    assert.match(BASE, /^https:\/\/repo\.fpki\.gov\//)
  })

  it('anchors on the Federal Common Policy root (.crt)', () => {
    assert.equal(CERT_URL, BASE + 'fcpcag2.crt')
    assert.match(CERT_URL, /\.crt$/)
  })

  it('mirrors the root plus the subordinate-CA PKCS7 bundle (roots + intermediates)', () => {
    const filenames = FILES.map((f) => f.filename)
    assert.deepEqual(filenames, ['fcpcag2.crt', 'caCertsIssuedByfcpcag2.p7c'])
  })

  it('every file resolves to a full HTTPS URL recognized by CERT_DIRECT_EXT', () => {
    for (const f of FILES) {
      assert.match(BASE + f.filename, /^https:\/\/.+\.(crt|p7c)$/)
    }
  })
})
