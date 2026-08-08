/**
 * did:pki coverage integrity — every certificate must resolve to a DID.
 *
 * For every countries/<cc>/ that has BOTH current/manifest.json and did.json,
 * assert that:
 *   (1) every cert file listed in the manifest has an entry in did.json.dids
 *       (full did:pki coverage — no cert is unresolvable), and
 *   (2) did.json has no entries for files absent from the manifest (no stale
 *       mappings left behind after a promotion/reconcile).
 *
 * did.json is precomputed by scripts/refresh-did-pki.mjs, which skips certs
 * whose DID can't derive. So "did.json entry count == cert count" means every
 * cert is resolvable; a shortfall is a real coverage gap.
 *
 * Uses Node.js built-in test runner (node --test).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const COUNTRIES_DIR = join(ROOT, 'countries')

/** Every country dir that has both a promoted manifest and a did.json. */
function coveredCountries() {
  return readdirSync(COUNTRIES_DIR).filter((code) => {
    const dir = join(COUNTRIES_DIR, code)
    return (
      statSync(dir).isDirectory() &&
      existsSync(join(dir, 'current', 'manifest.json')) &&
      existsSync(join(dir, 'did.json'))
    )
  })
}

function readManifestFiles(code) {
  const manifest = JSON.parse(
    readFileSync(join(COUNTRIES_DIR, code, 'current', 'manifest.json'), 'utf-8'),
  )
  return manifest.certificates.map((c) => c.file)
}

function readDidFiles(code) {
  const did = JSON.parse(readFileSync(join(COUNTRIES_DIR, code, 'did.json'), 'utf-8'))
  return Object.keys(did.dids || {})
}

describe('did:pki coverage', () => {
  const countries = coveredCountries()

  it('discovers the covered countries', () => {
    assert.ok(countries.length > 0, 'no countries with both manifest.json and did.json found')
  })

  it('every manifest cert has a did:pki mapping (no coverage gaps)', () => {
    const missing = []
    for (const code of countries) {
      const dids = new Set(readDidFiles(code))
      for (const file of readManifestFiles(code)) {
        if (!dids.has(file)) missing.push(`${code}/${file}`)
      }
    }
    assert.equal(
      missing.length,
      0,
      `certs missing a did:pki mapping:\n  ${missing.join('\n  ')}`,
    )
  })

  it('did.json has no stale entries (no mappings for files absent from the manifest)', () => {
    const stale = []
    for (const code of countries) {
      const files = new Set(readManifestFiles(code))
      for (const file of readDidFiles(code)) {
        if (!files.has(file)) stale.push(`${code}/${file}`)
      }
    }
    assert.equal(
      stale.length,
      0,
      `did.json entries with no matching manifest file:\n  ${stale.join('\n  ')}`,
    )
  })
})
