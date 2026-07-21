/**
 * Tests for the Chilean State PKI adapter's link parsing, against the real
 * captured firma.gob certificates page. No network access.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseCertLinks } from '../scripts/monitors/sources/cl-estado.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HTML = readFileSync(join(__dirname, 'fixtures', 'cl-estado-page.html'), 'utf8')

describe('cl-estado.parseCertLinks', () => {
  const candidates = parseCertLinks(HTML)

  it('finds the full set of State PKI cert links (roots + sub-CAs)', () => {
    assert.ok(candidates.length > 700, `expected >700, got ${candidates.length}`)
  })

  it('https-upgrades every link (some are http:// on the page)', () => {
    for (const c of candidates) assert.match(c.url, /^https:\/\//)
  })

  it('includes both State roots (G1 and G2)', () => {
    assert.ok(candidates.some((c) => /autoridadcertificadoradelestadodechile\.pem$/i.test(c.url)), 'G1 root missing')
    assert.ok(candidates.some((c) => /estadodechileg2cacert\.pem$/i.test(c.url)), 'G2 root missing')
  })

  it('deduplicates and labels every candidate with the Estado de Chile org', () => {
    assert.equal(candidates.length, new Set(candidates.map((c) => c.url)).size)
    for (const c of candidates) assert.equal(c.org, 'Estado de Chile')
  })
})
