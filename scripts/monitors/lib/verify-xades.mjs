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

function normalizeDN(dn) {
  return (dn || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function certSki(cert) {
  const ext = cert.getExtension('2.5.29.14')
  if (!ext) return null
  // DER OCTET STRING wrapper is: 04 <len> <payload>. Only unwrap a genuine
  // envelope (second byte equals the remaining length); a bare key id whose
  // first byte is coincidentally 0x04 must be left intact.
  const bytes = new Uint8Array(ext.value)
  const body = (bytes[0] === 0x04 && bytes[1] === bytes.length - 2) ? bytes.slice(2) : bytes
  return Buffer.from(body).toString('hex')
}

export function authorizeSigner(signerCert, allowedIdentities, { allowChain = false } = {}) {
  if (!signerCert) return { authorized: false, reason: 'no signer cert' }
  const signerDer = Buffer.from(signerCert.rawData).toString('base64')
  const signerSubject = normalizeDN(signerCert.subject)
  const signerSkiHex = certSki(signerCert)

  for (const id of allowedIdentities || []) {
    if (id.type === 'cert' && id.value.replace(/\s+/g, '') === signerDer) {
      return { authorized: true, reason: null }
    }
    if (id.type === 'ski' && signerSkiHex) {
      // normalize: strip DER OCTET STRING wrapper (04 <len>) only when genuine
      // (second byte equals remaining length); bare ids whose first byte is 0x04
      // must be left intact to avoid false-reject.
      const raw = Buffer.from(id.value.toLowerCase().replace(/\s+/g, ''), 'hex')
      const normalized = (raw[0] === 0x04 && raw[1] === raw.length - 2)
        ? raw.slice(2).toString('hex')
        : raw.toString('hex')
      if (normalized === signerSkiHex) {
        return { authorized: true, reason: null }
      }
    }
    if (id.type === 'subject' && normalizeDN(id.value) === signerSubject) {
      return { authorized: true, reason: null }
    }
  }

  if (allowChain) {
    // Chain-authorization: authorize when the signer's ISSUER DN equals the
    // anchor cert's SUBJECT DN (name-only equality). This does NOT cryptographically
    // verify that the anchor actually signed the signer cert — the anchor is merely
    // a pinned trust root whose name we trust. Exact identity match (above) is the
    // real security control; allowChain is a deliberate relaxation for the
    // pinned-EC-anchor case where we hold the CA cert but not the leaf cert.
    for (const id of allowedIdentities || []) {
      if (id.type !== 'cert') continue
      try {
        const anchor = new x509.X509Certificate(Buffer.from(id.value.replace(/\s+/g, ''), 'base64'))
        if (normalizeDN(signerCert.issuer) === normalizeDN(anchor.subject)) {
          return { authorized: true, reason: null }
        }
      } catch { /* ignore malformed anchor */ }
    }
  }

  return { authorized: false, reason: 'signer matches no allowed identity' }
}
