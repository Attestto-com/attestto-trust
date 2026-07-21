/**
 * Turn arbitrary downloaded bytes into candidate X.509 certificates.
 *
 * This is an INTEGRITY filter, not a trust decision: it only decides
 * "does this parse as a well-formed certificate?" Malicious-but-valid
 * certificates pass through unchanged — rejecting those is the human
 * reviewer's job at promotion time, not this file's.
 *
 * Parsing uses Node's built-in `crypto.X509Certificate` (OpenSSL-backed),
 * not node-forge: forge can't parse EC/ECDSA certificates at all (found via
 * a real cert in Peru's TSL — ECERNEP PERU CA ROOT 6 — that forge silently
 * failed on with zero visibility) and mangles UTF-8 subject/issuer names
 * with accented characters. node-forge is kept only for unwrapping PKCS7
 * containers, which Node's crypto module doesn't expose; every cert that
 * comes out of a PKCS7 bundle is re-parsed through X509Certificate so its
 * fields are correct.
 *
 * Zip extraction shells out to the system `unzip` (execFile with an argv
 * array, never a shell string) instead of adding a zip-parsing dependency.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, statSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { X509Certificate } from 'node:crypto'
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

/** Pull the CN out of an X509Certificate `subject`/`issuer` string ("C=PE\nO=...\nCN=Foo"). */
function extractCN(dn) {
  if (!dn) return null
  const line = dn.split('\n').find((l) => l.startsWith('CN='))
  return line ? line.slice(3) : null
}

function certFields(x509, sourceEntry) {
  const subjectCN = extractCN(x509.subject)
  const issuerCN = extractCN(x509.issuer)
  return {
    pem: x509.toString(),
    subjectCN,
    issuerCN,
    serialNumber: x509.serialNumber.toLowerCase(),
    validFrom: new Date(x509.validFrom).toISOString(),
    validTo: new Date(x509.validTo).toISOString(),
    sha256: x509.fingerprint256.replace(/:/g, '').toLowerCase(),
    role: subjectCN && subjectCN === issuerCN ? 'root' : 'intermediate',
    // basicConstraints CA bit — lets callers keep roots + intermediate CAs
    // and drop leaf/end-entity certs (TSA, OCSP, per-service certs).
    isCA: x509.ca === true,
    sourceEntry,
  }
}

/** Unwrap a forge PKCS7 message's certificates into DER Buffers for re-parsing by X509Certificate. */
function derBuffersFromForgePkcs7(p7) {
  return (p7.certificates || []).map((cert) =>
    Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(), 'binary'),
  )
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
      results.push(certFields(new X509Certificate(block), sourceEntry))
    } catch {
      // not actually a valid cert block — skip
    }
  }
  if (results.length > 0) return results

  if (text.includes('-----BEGIN PKCS7-----')) {
    try {
      const p7 = forge.pkcs7.messageFromPem(text)
      for (const der of derBuffersFromForgePkcs7(p7)) {
        try {
          results.push(certFields(new X509Certificate(der), sourceEntry))
        } catch {
          // a member cert forge extracted didn't re-parse — skip just that one
        }
      }
      if (results.length > 0) return results
    } catch {
      // fall through to binary DER attempts below
    }
  }

  try {
    results.push(certFields(new X509Certificate(buffer), sourceEntry))
    return results
  } catch {
    // not a bare DER certificate
  }

  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(buffer.toString('binary')))
    const p7 = forge.pkcs7.messageFromAsn1(asn1)
    for (const der of derBuffersFromForgePkcs7(p7)) {
      try {
        results.push(certFields(new X509Certificate(der), sourceEntry))
      } catch {
        // a member cert forge extracted didn't re-parse — skip just that one
      }
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
