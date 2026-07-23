import 'reflect-metadata'
import { webcrypto } from 'node:crypto'
import { DOMParser } from '@xmldom/xmldom'
import * as XAdES from 'xadesjs'
import * as x509 from '@peculiar/x509'

XAdES.Application.setEngine('NodeJS', webcrypto)
x509.cryptoProvider.set(webcrypto)

const XMLDSIG = 'http://www.w3.org/2000/09/xmldsig#'

export async function verifyXadesSignature(xmlString) {
  let doc, sigEl
  try {
    doc = new DOMParser().parseFromString(xmlString, 'application/xml')
    sigEl = doc.getElementsByTagNameNS(XMLDSIG, 'Signature')[0]
  } catch (e) {
    return { valid: false, signerCert: null, reason: `parse error: ${e.message}` }
  }
  if (!sigEl) return { valid: false, signerCert: null, reason: 'no ds:Signature element' }

  let signerCert = null
  const certEl = doc.getElementsByTagNameNS(XMLDSIG, 'X509Certificate')[0]
  if (certEl) {
    try {
      signerCert = new x509.X509Certificate(Buffer.from(certEl.textContent.replace(/\s+/g, ''), 'base64'))
    } catch { /* signerCert stays null; verification below still runs */ }
  }

  try {
    const signed = new XAdES.SignedXml(doc)
    signed.LoadXml(sigEl)
    const valid = await signed.Verify()
    return { valid, signerCert, reason: valid ? null : 'signature verification failed' }
  } catch (e) {
    return { valid: false, signerCert, reason: `verify error: ${e.message}` }
  }
}
