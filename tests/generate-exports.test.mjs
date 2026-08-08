import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderCountryIndex } from '../scripts/generate-exports.mjs'

const mk = (n) =>
  Array.from({ length: n }, (_, i) => ({
    file: `c${i}.pem`,
    pem: `-P${i}-`,
    sha256: `${i}`.padStart(4, '0'),
  }))

describe('renderCountryIndex', () => {
  it('small country keeps named consts', () => {
    const js = renderCountryIndex('es', mk(2))
    assert.match(js, /export const C0/)
    assert.match(js, /ALL_CERTS/)
  })
  it('large country: ALL_CERTS + getBySha256, no per-cert consts', () => {
    const js = renderCountryIndex('it', mk(21))
    assert.doesNotMatch(js, /export const C\d+ =/)
    assert.match(js, /export function getBySha256/)
    assert.match(js, /export const ALL_CERTS/)
  })
})
