import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyXadesSignature } from '../scripts/monitors/lib/verify-xades.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOTL = readFileSync(join(__dirname, 'fixtures', 'eu-lotl.signed.xml'), 'utf8')

describe('verifyXadesSignature', () => {
  it('verifies the real EU LOTL signature', async () => {
    const r = await verifyXadesSignature(LOTL)
    assert.equal(r.valid, true, r.reason || '')
    assert.ok(r.signerCert)
    assert.match(r.signerCert.subject, /EUROPEAN COMMISSION/)
  })

  it('rejects a byte-tampered LOTL', async () => {
    // Flip a byte inside a signed element (TSLLocation URL), not in the signature block.
    const tampered = LOTL.replace(
      'https://ec.europa.eu/tools/lotl/eu-lotl.xml',
      'https://ec.europa.eu/tools/lotl/eu-l0tl.xml'
    )
    const r = await verifyXadesSignature(tampered)
    assert.equal(r.valid, false)
  })

  it('returns a reason (not a throw) on non-signed XML', async () => {
    const r = await verifyXadesSignature('<x/>')
    assert.equal(r.valid, false)
    assert.ok(r.reason)
  })
})
