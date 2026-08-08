import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { webcrypto } from 'node:crypto'
import { verifyXadesSignature, authorizeSigner } from '../scripts/monitors/lib/verify-xades.mjs'
import * as x509b from '@peculiar/x509'

x509b.cryptoProvider.set(webcrypto)

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

  it('cert-type anchor for a non-matching cert returns false regardless of allowChain', () => {
    // Load a cert whose subject is unrelated to the LOTL signer's issuer.
    // CIE-National-Root-CA-2024 is an Italian eID root; it has nothing to do
    // with the DIGITALSIGN QUALIFIED CA G1 that issued the LOTL signer.
    // This exercises the allowChain branch reaching a cert anchor that does NOT
    // match the signer's issuer DN, confirming no accidental authorization.
    //
    // NOTE: The chain branch (allowChain=true, anchor.subject === signer.issuer)
    // is covered by construction — that path is tested via the unit below.
    const ciePem = readFileSync(
      join(__dirname, '../countries/it/current/CIE-National-Root-CA-2024.pem'),
      'utf8'
    )
    const cieB64 = ciePem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
    const cieAnchor = { type: 'cert', value: cieB64 }

    // false with allowChain:false — non-matching cert anchor is never authorized
    assert.equal(authorizeSigner(signer, [cieAnchor], { allowChain: false }).authorized, false)
    // false with allowChain:true — CIE root subject != LOTL signer's issuer DN
    assert.equal(authorizeSigner(signer, [cieAnchor], { allowChain: true }).authorized, false)
  })

  it('cert-type anchor whose subject equals signer issuer authorizes when allowChain is true', async () => {
    // Build a minimal self-signed CA cert whose SUBJECT is identical to the
    // LOTL signer's ISSUER. We cannot download DIGITALSIGN QCA G1, so we
    // fabricate a cert with that exact subject DN to exercise the chaining path.
    // The allowChain branch only checks name equality (not crypto), so this is
    // the correct unit-level exercise of that code path.
    const issuerDN = signer.issuer // e.g. "CN=DIGITALSIGN QUALIFIED CA G1, ..."

    // Generate a throwaway EC P-256 key to sign the synthetic CA cert.
    const { privateKey, publicKey } = await webcrypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    )
    // Build a self-signed cert whose subject equals the signer's issuer DN.
    const syntheticCACert = await x509b.X509CertificateGenerator.createSelfSigned({
      serialNumber: '01',
      name: issuerDN,
      notBefore: new Date('2020-01-01'),
      notAfter: new Date('2030-01-01'),
      signingAlgorithm: { name: 'ECDSA', hash: 'SHA-256' },
      keys: { privateKey, publicKey },
      extensions: [new x509b.BasicConstraintsExtension(true)],
    })
    const syntheticB64 = Buffer.from(syntheticCACert.rawData).toString('base64')
    const syntheticAnchor = { type: 'cert', value: syntheticB64 }

    // allowChain:false must NOT authorize (cert is not an exact match for the signer)
    assert.equal(authorizeSigner(signer, [syntheticAnchor], { allowChain: false }).authorized, false)
    // allowChain:true MUST authorize (anchor.subject === signer.issuer by construction)
    assert.equal(authorizeSigner(signer, [syntheticAnchor], { allowChain: true }).authorized, true)
  })
})
