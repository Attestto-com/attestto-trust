#!/usr/bin/env node
/**
 * Regenerate manifest.json (and chain.pem) for one or all countries.
 *
 * Usage:
 *   node scripts/refresh-manifest.mjs            # all countries
 *   node scripts/refresh-manifest.mjs cr         # just CR
 *   node scripts/refresh-manifest.mjs cr mx      # CR and MX
 *
 * For each country, walks countries/<iso2>/current/*.pem and emits:
 *   - manifest.json — sha256, subject, issuer, serialNumber, validFrom/To, role
 *   - chain.pem     — concatenated bundle of all PEMs in current/
 *
 * Run after every cert add/rotate. CI fails the build if manifest.json drifts.
 */
import 'reflect-metadata'
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { createHash, X509Certificate } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import forge from 'node-forge'
import * as x509 from '@peculiar/x509'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const countriesDir = join(root, 'countries')

// node-forge decodes ASN.1 UTF8String fields as a raw byte-per-char "binary"
// string ("AC Raíz" comes back as "AC RaÃ­z"), so re-decode as UTF-8 to get
// accented CA names right. Same fix already applied in
// scripts/monitors/lib/extract-certs.mjs.
const decodeUtf8 = (s) => (s == null ? s : Buffer.from(s, 'binary').toString('utf8'))
// Prefer CN, but some roots (e.g. AC RAIZ FNMT-RCM) carry no CN and put the
// identifying name in OU, with O as a last resort. Falling back keeps those CA
// names populated instead of null.
const cn = (name) =>
  decodeUtf8(name.getField('CN')?.value) ||
  decodeUtf8(name.getField('OU')?.value) ||
  decodeUtf8(name.getField('O')?.value) ||
  null

// node-forge cannot read non-RSA (e.g. EC) public keys and throws on such
// certs. The platform X.509 parser handles EC, so we fall back to it. It reads
// proper UTF-8 (no binary re-decode needed) and returns the same fields.
const nativeRdn = (dn, key) => {
  for (const part of dn.split(/\r?\n|,(?=\s*[A-Za-z]+=)/)) {
    const m = part.trim().match(/^([A-Za-z.]+)=(.*)$/)
    if (m && m[1] === key) return m[2].trim()
  }
  return null
}
const nativeName = (dn) => nativeRdn(dn, 'CN') || nativeRdn(dn, 'OU') || nativeRdn(dn, 'O') || null

// Static, cert-embedded metadata used for display: key algorithm, and the CRL
// and OCSP endpoints (present on intermediates/leaves; roots are self-signed and
// carry none). @peculiar/x509 parses RSA and EC uniformly. These fields are
// deterministic (fixed in the cert) so they are safe in the CI-checked manifest —
// unlike CRL freshness (nextUpdate), which is time-varying and lives elsewhere.
function extractExtras(pem) {
  const cert = new x509.X509Certificate(pem)
  const a = cert.publicKey.algorithm
  let keyAlgorithm = a.name
  if (a.name?.startsWith('RSA')) keyAlgorithm = `RSA-${a.modulusLength}`
  else if (a.name === 'ECDSA') keyAlgorithm = `EC ${a.namedCurve}`

  const crlExt = cert.getExtension(x509.CRLDistributionPointsExtension)
  const crlUrls = crlExt
    ? crlExt.distributionPoints.flatMap((d) =>
        (d.distributionPoint?.fullName || [])
          .filter((n) => n.uniformResourceIdentifier)
          .map((n) => n.uniformResourceIdentifier),
      )
    : []

  const aiaExt = cert.getExtension(x509.AuthorityInfoAccessExtension)
  const ocspUrls = (aiaExt?.ocsp || []).map((o) => o.value || o).filter(Boolean)

  return { keyAlgorithm, crlUrls, ocspUrls }
}

function parseCertNative(pem, file) {
  const x = new X509Certificate(pem)
  const subject = nativeName(x.subject)
  const issuer = nativeName(x.issuer)
  return {
    file,
    sha256: createHash('sha256').update(x.raw).digest('hex'),
    subject,
    issuer,
    serialNumber: x.serialNumber.toLowerCase(),
    validFrom: new Date(x.validFrom).toISOString(),
    validTo: new Date(x.validTo).toISOString(),
    role: subject === issuer ? 'root' : 'intermediate',
  }
}

function refreshCountry(iso2) {
  const currentDir = join(countriesDir, iso2, 'current')
  if (!existsSync(currentDir)) {
    console.error(`skip ${iso2}: no current/ directory`)
    return
  }
  const pems = readdirSync(currentDir)
    .filter((f) => f.endsWith('.pem') && f !== 'chain.pem')
    .sort()

  const entries = pems.map((file) => {
    const pem = readFileSync(join(currentDir, file), 'utf8')
    // SHA-256 over the certificate's ACTUAL DER (the base64 body of the PEM),
    // never a parser re-encode. node-forge's certificateToAsn1 -> toDer can
    // produce bytes that differ from the original DER for some certs, which
    // would publish a fingerprint that does not match the .pem a verifier
    // downloads and rehashes. This is the tamper-evidence contract, so it must
    // match the file byte-for-byte.
    const der = Buffer.from(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''), 'base64')
    const sha256 = createHash('sha256').update(der).digest('hex')
    let base
    try {
      const cert = forge.pki.certificateFromPem(pem)
      const subjectCN = cn(cert.subject)
      const issuerCN = cn(cert.issuer)
      base = {
        file,
        sha256,
        subject: subjectCN,
        issuer: issuerCN,
        serialNumber: cert.serialNumber,
        validFrom: cert.validity.notBefore.toISOString(),
        validTo: cert.validity.notAfter.toISOString(),
        role: subjectCN === issuerCN ? 'root' : 'intermediate',
      }
    } catch {
      // Non-RSA key (e.g. EC): node-forge can't read it. Use the platform parser.
      base = parseCertNative(pem, file)
    }
    // Guarantee the file-derived fingerprint wins regardless of parser path.
    return { ...base, sha256, ...extractExtras(pem) }
  })

  // Content-bearing fields only. generatedAt is intentionally excluded so we
  // can compare against the committed manifest and keep regeneration idempotent.
  const content = {
    country: iso2.toUpperCase(),
    count: entries.length,
    certificates: entries,
  }

  // Preserve generatedAt when the certificates are unchanged; bump it only when
  // content actually changes. Without this, new Date() drifts on every run and
  // the CI drift check can never pass (SOC-90 / SECURITY-AUDIT-2026-07-19 SEV-1).
  const manifestPath = join(currentDir, 'manifest.json')
  let generatedAt = new Date().toISOString()
  if (existsSync(manifestPath)) {
    try {
      const prev = JSON.parse(readFileSync(manifestPath, 'utf8'))
      const { generatedAt: prevGeneratedAt, ...prevContent } = prev
      if (prevGeneratedAt && JSON.stringify(prevContent) === JSON.stringify(content)) {
        generatedAt = prevGeneratedAt
      }
    } catch {
      // Unparseable prior manifest: fall through to a fresh timestamp.
    }
  }

  const manifest = {
    country: content.country,
    generatedAt,
    count: content.count,
    certificates: content.certificates,
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

  // Concatenated bundle
  const bundle = pems.map((f) => readFileSync(join(currentDir, f), 'utf8').trim()).join('\n') + '\n'
  writeFileSync(join(currentDir, 'chain.pem'), bundle)

  console.log(`${iso2}: ${entries.length} certs → manifest.json + chain.pem`)
}

const args = process.argv.slice(2)
const countries = args.length > 0
  ? args
  : readdirSync(countriesDir).filter((d) => statSync(join(countriesDir, d)).isDirectory())

for (const iso2 of countries) refreshCountry(iso2)
