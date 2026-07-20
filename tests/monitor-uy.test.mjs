/**
 * Tests for the Uruguay adapter's static shape — no network access.
 * Uruguay has no HTML/XML parsing (a single direct .cer file already
 * handled by the generic CERT_DIRECT_EXT path in sync-country.mjs, which
 * monitor-cl.test.mjs already exercises against real cert bytes), so
 * there's little country-specific logic beyond this shape.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { CERT_URL } from '../scripts/monitors/sources/uy.mjs'

describe('uy source adapter', () => {
  it('points at an HTTPS URL', () => {
    assert.match(CERT_URL, /^https:\/\//)
  })

  it('points at a direct cert file recognized by CERT_DIRECT_EXT', () => {
    assert.match(CERT_URL, /\.cer$/i)
  })

  it('points at the AGESIC domain (the primary of the two mirrored copies)', () => {
    assert.match(CERT_URL, /agesic\.gub\.uy/)
  })
})
