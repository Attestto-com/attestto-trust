#!/usr/bin/env node
/**
 * Extract embedded PKCS#7 cert chain from a signed PDF.
 *
 * Usage:
 *   node scripts/extract-chain-from-pdf.mjs <signed.pdf> [out-dir]
 *
 * Default out-dir: /tmp
 *
 * Why this exists:
 *   PAdES signatures embed the full cert chain in the /Contents PKCS#7 blob.
 *   When our local trust store is missing intermediates for a country, the
 *   chain walker fails and the signature shows as "not trusted" even though
 *   it's mathematically valid. This script lifts those intermediates straight
 *   out of any signed PDF you have, so you can drop them into
 *   src/main/pki/trust-store/<country>/ and the validator goes green.
 *
 * How we discovered the gap (CR, 2026-04-08):
 *   Trust store had only PERSONA JURIDICA. A natural-person signature
 *   (Guillermo Chavarría Cruz) couldn't anchor because PERSONA FISICA
 *   intermediates were missing. Ran this on the signed PDF, dropped the two
 *   PEMs in src/main/pki/trust-store/bccr/, badge flipped to verified.
 *
 * Reusable for: any country whose CA hierarchy isn't published cleanly via
 * HTTPS but where you have at least one signed sample document.
 *
 * Requires: node-forge (already a dependency of attestto-desktop). Run from
 * the desktop repo root so node resolves it.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import forge from 'node-forge'

const pdfPath = process.argv[2]
const outDir = process.argv[3] || '/tmp'

if (!pdfPath) {
  console.error('usage: node scripts/extract-chain-from-pdf.mjs <signed.pdf> [out-dir]')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

const buf = readFileSync(pdfPath)
const txt = buf.toString('latin1')

const re = /\/Contents\s*<([0-9A-Fa-f\s]+)>/g
let m
let sigIdx = 0
let totalCerts = 0

while ((m = re.exec(txt))) {
  const hex = m[1].replace(/\s+/g, '').replace(/0+$/, '')
  let p7
  try {
    const der = Buffer.from(hex, 'hex')
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(der.toString('binary')))
    p7 = forge.pkcs7.messageFromAsn1(asn1)
  } catch (err) {
    console.warn(`signature ${sigIdx}: parse failed (${err.message})`)
    sigIdx++
    continue
  }
  console.log(`signature ${sigIdx}: ${p7.certificates.length} certs`)
  for (const cert of p7.certificates) {
    const cn = cert.subject.getField('CN')?.value || `cert-${totalCerts}`
    const safe = cn.replace(/[^A-Za-z0-9 ()-]/g, '_')
    const out = join(outDir, `${safe}.pem`)
    writeFileSync(out, forge.pki.certificateToPem(cert))
    console.log('  →', out)
    totalCerts++
  }
  sigIdx++
}

if (totalCerts === 0) {
  console.error('no PKCS#7 signatures found in', pdfPath)
  process.exit(2)
}
