import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyXadesSignature, authorizeSigner } from '../scripts/monitors/lib/verify-xades.mjs'
import * as x509b from '@peculiar/x509'

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

describe('authorizeSigner', () => {
  // Reuse the LOTL signer cert as the subject under test.
  let signer
  it('setup: extract signer', async () => {
    const r = await verifyXadesSignature(LOTL)
    signer = r.signerCert
    assert.ok(signer)
  })

  it('authorizes on exact cert match', () => {
    const id = { type: 'cert', value: Buffer.from(signer.rawData).toString('base64') }
    assert.equal(authorizeSigner(signer, [id]).authorized, true)
  })

  it('authorizes on SKI match', () => {
    const ext = signer.getExtension('2.5.29.14') // subjectKeyIdentifier
    const ski = ext ? Buffer.from(ext.value).toString('hex') : null
    if (!ski) return // some certs lack SKI; skip
    assert.equal(authorizeSigner(signer, [{ type: 'ski', value: ski }]).authorized, true)
  })

  it('rejects an unrelated identity', () => {
    assert.equal(authorizeSigner(signer, [{ type: 'ski', value: 'deadbeef' }]).authorized, false)
  })

  it('rejects a chaining cert when allowChain is false', () => {
    const issuerOnly = { type: 'subject', value: signer.issuer }
    assert.equal(authorizeSigner(signer, [issuerOnly], { allowChain: false }).authorized, false)
  })
})
