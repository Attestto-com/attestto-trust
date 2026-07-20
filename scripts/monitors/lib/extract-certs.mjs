/**
 * Turn arbitrary downloaded bytes into candidate X.509 certificates.
 *
 * This is an INTEGRITY filter, not a trust decision: it only decides
 * "does this parse as a well-formed certificate?" Malicious-but-valid
 * certificates pass through unchanged — rejecting those is the human
 * reviewer's job at promotion time, not this file's.
 *
 * Zip extraction shells out to the system `unzip` (execFile with an argv
 * array, never a shell string) instead of adding a zip-parsing dependency —
 * this repo only depends on node-forge today.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, statSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import forge from 'node-forge'

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

/**
 * node-forge decodes ASN.1 UTF8String fields as a raw byte-per-char
 * "binary" string instead of real UTF-8 text (e.g. "AC Raíz" comes back
 * as "AC RaÃ­z") — reverse that so subject/issuer names with accented
 * characters (common in Chilean CA names) come out correctly.
 */
function fixMojibake(str) {
  if (str == null) return str
  return Buffer.from(str, 'binary').toString('utf8')
}

function cn(name) {
  const value = name.getField('CN')?.value
  return value ? fixMojibake(value) : null
}

function certFields(cert, sourceEntry) {
  const subjectCN = cn(cert.subject)
  const issuerCN = cn(cert.issuer)
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()
  const sha256 = createHash('sha256').update(Buffer.from(der, 'binary')).digest('hex')
  return {
    pem: forge.pki.certificateToPem(cert),
    subjectCN,
    issuerCN,
    serialNumber: cert.serialNumber,
    validFrom: cert.validity.notBefore.toISOString(),
    validTo: cert.validity.notAfter.toISOString(),
    sha256,
    role: subjectCN && subjectCN === issuerCN ? 'root' : 'intermediate',
    sourceEntry,
  }
}

/**
 * Try every certificate-shaped interpretation of a single file's bytes.
 * Never throws — files that aren't certs (readmes, Word docs, images)
 * just yield an empty array.
 */
export function certsFromFile(buffer, sourceEntry) {
  const results = []
  const text = buffer.toString('latin1')

  const pemBlocks = text.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || []
  for (const block of pemBlocks) {
    try {
      results.push(certFields(forge.pki.certificateFromPem(block), sourceEntry))
    } catch {
      // not actually a valid cert block — skip
    }
  }
  if (results.length > 0) return results

  if (text.includes('-----BEGIN PKCS7-----')) {
    try {
      const p7 = forge.pkcs7.messageFromPem(text)
      for (const cert of p7.certificates || []) {
        results.push(certFields(cert, sourceEntry))
      }
      if (results.length > 0) return results
    } catch {
      // fall through to binary DER attempts below
    }
  }

  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(buffer.toString('binary')))
    results.push(certFields(forge.pki.certificateFromAsn1(asn1), sourceEntry))
    return results
  } catch {
    // not a bare DER certificate
  }

  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(buffer.toString('binary')))
    const p7 = forge.pkcs7.messageFromAsn1(asn1)
    for (const cert of p7.certificates || []) {
      results.push(certFields(cert, sourceEntry))
    }
  } catch {
    // not a cert-shaped file at all — expected for the vast majority of
    // entries in a real-world zip (readmes, install guides, logos...)
  }

  return results
}

/**
 * Extract every certificate found inside a zip buffer.
 * Returns { certs, error } — error is set (and certs is []) if the zip
 * itself couldn't be opened; a valid zip with zero recognizable certs
 * returns { certs: [], error: null } so the caller can distinguish
 * "corrupt archive" from "nothing cert-shaped in here."
 */
export function extractCertsFromZip(zipBuffer) {
  const tmp = mkdtempSync(join(tmpdir(), 'attestto-trust-monitor-'))
  const zipPath = join(tmp, 'bundle.zip')
  const outDir = join(tmp, 'out')
  try {
    writeFileSync(zipPath, zipBuffer)
    execFileSync('unzip', ['-o', '-q', zipPath, '-d', outDir], { stdio: 'ignore' })
    const certs = []
    for (const file of walk(outDir)) {
      certs.push(...certsFromFile(readFileSync(file), file.slice(outDir.length + 1)))
    }
    return { certs, error: null }
  } catch (err) {
    return { certs: [], error: err.message }
  } finally {
    // Some published bundles were zipped with read-only directory modes
    // (e.g. dr-xr-xr-x), which unzip preserves — that blocks deleting their
    // contents even as the owner. Restore write permission before cleanup.
    try {
      execFileSync('chmod', ['-R', 'u+w', tmp], { stdio: 'ignore' })
    } catch {
      // best effort — rmSync below will surface any real problem
    }
    rmSync(tmp, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  }
}
