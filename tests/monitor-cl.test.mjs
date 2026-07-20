/**
 * Tests for the root-cert monitor's network-free logic:
 * - Chile page HTML parsing (fixture captured from the live site)
 * - certificate extraction from PEM/DER bytes and from a real zip
 *
 * Deliberately does NOT hit the network or write into countries/cl/ —
 * those paths are exercised by running the script for real, by hand.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { parseCandidates } from '../scripts/monitors/sources/cl.mjs'
import { certsFromFile, extractCertsFromZip } from '../scripts/monitors/lib/extract-certs.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_HTML = readFileSync(join(__dirname, 'fixtures', 'cl-page.html'), 'utf-8')

// Reuse a real, already-trusted PEM from this repo as test fixture material
// instead of committing a synthetic cert.
const SAMPLE_PEM = readFileSync(
  join(__dirname, '..', 'countries', 'ar', 'current', 'AC-RAIZ-REPUBLICA-ARGENTINA.pem'),
  'utf-8',
)

describe('cl.parseCandidates', () => {
  const candidates = parseCandidates(FIXTURE_HTML)

  it('finds every cert-bundle link on the page', () => {
    assert.ok(candidates.length >= 20, `expected >=20 candidates, got ${candidates.length}`)
  })

  it('resolves relative hrefs to absolute https URLs', () => {
    for (const c of candidates) {
      assert.match(c.url, /^https?:\/\//)
    }
  })

  it('attributes a known link to its correct CA heading', () => {
    const eSign = candidates.find((c) => c.filename === 'E-SIGN-S.A.zip')
    assert.ok(eSign, 'E-SIGN-S.A.zip not found')
    assert.equal(eSign.org, 'E-Sign')
  })

  it('flags .rar links with the rar extension so the caller can skip them', () => {
    const rars = candidates.filter((c) => c.filename.toLowerCase().endsWith('.rar'))
    assert.ok(rars.length >= 2, `expected >=2 .rar links, got ${rars.length}`)
  })

  it('decodes URL-encoded filenames', () => {
    for (const c of candidates) {
      assert.doesNotMatch(c.filename, /%[0-9A-Fa-f]{2}/)
    }
  })
})

describe('extract-certs.certsFromFile', () => {
  it('parses a real PEM certificate', () => {
    const results = certsFromFile(Buffer.from(SAMPLE_PEM), 'sample.pem')
    assert.equal(results.length, 1)
    assert.equal(results[0].subjectCN, 'AC Raíz')
    assert.match(results[0].sha256, /^[0-9a-f]{64}$/)
  })

  it('returns an empty array for a non-cert file', () => {
    const results = certsFromFile(Buffer.from('this is a readme, not a cert'), 'README.txt')
    assert.deepEqual(results, [])
  })
})

describe('extract-certs.extractCertsFromZip', () => {
  it('finds a PEM cert nested inside a real zip archive', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'attestto-trust-test-'))
    try {
      const pemPath = join(tmp, 'root.pem')
      writeFileSync(pemPath, SAMPLE_PEM)
      const zipPath = join(tmp, 'bundle.zip')
      execFileSync('zip', ['-j', '-q', zipPath, pemPath], { cwd: tmp })

      const { certs, error } = extractCertsFromZip(readFileSync(zipPath))
      assert.equal(error, null)
      assert.equal(certs.length, 1)
      assert.equal(certs[0].sourceEntry, 'root.pem')
      assert.equal(certs[0].role, 'root')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('reports an error for a corrupt zip instead of throwing', () => {
    const { certs, error } = extractCertsFromZip(Buffer.from('not a zip file at all'))
    assert.deepEqual(certs, [])
    assert.ok(error)
  })
})
