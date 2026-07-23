/**
 * Guards for the did:pki data (countries/<cc>/did.json), produced by
 * scripts/refresh-did-pki.mjs from the resolver's canonical derivation.
 *
 * We never publish an invalid DID, and every DID must map to a real
 * promoted certificate. No network access.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const countriesDir = join(__dirname, '..', 'countries')

// did:pki:<cc>:<segment>[:<segment>...], each segment limited to the DID
// idchar set (ALPHA / DIGIT / "." / "-" / "_"). Lowercased by derivation.
const VALID_DID = /^did:pki:[a-z]{2}(:[a-z0-9._-]+)+$/

const countries = readdirSync(countriesDir).filter(
  (d) =>
    statSync(join(countriesDir, d)).isDirectory() &&
    existsSync(join(countriesDir, d, 'did.json')),
)

describe('did:pki (did.json)', () => {
  for (const cc of countries) {
    const doc = JSON.parse(readFileSync(join(countriesDir, cc, 'did.json'), 'utf-8'))

    it(`${cc}: method is did:pki and dids is an object`, () => {
      assert.equal(doc.method, 'did:pki')
      assert.equal(typeof doc.dids, 'object')
    })

    it(`${cc}: every DID is syntactically valid and country-prefixed`, () => {
      for (const [file, did] of Object.entries(doc.dids)) {
        assert.match(did, VALID_DID, `${file}: invalid DID ${did}`)
        assert.ok(did.startsWith(`did:pki:${cc}:`), `${file}: wrong country prefix ${did}`)
      }
    })

    it(`${cc}: every keyed PEM exists in current/`, () => {
      for (const file of Object.keys(doc.dids)) {
        assert.ok(
          existsSync(join(countriesDir, cc, 'current', file)),
          `${file} referenced in did.json but missing from current/`,
        )
      }
    })
  }
})
