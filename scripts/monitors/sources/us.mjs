/**
 * United States source adapter — Federal PKI (FPKI), the North American
 * equivalent of the EU LOTL: a federated PKI graph anchored by one root.
 *
 * Mirrors two artifacts from repo.fpki.gov (both HTTPS, properly-trusted):
 *  1. fcpcag2.crt — the Federal Common Policy CA G2, the self-signed US
 *     federal trust anchor (valid to 2040).
 *  2. caCertsIssuedByfcpcag2.p7c — the PKCS7 bundle of subordinate CA
 *     certificates the Common Policy root has cross-certified (agency and
 *     SSP intermediate CAs: DigiCert Federal SSP, Entrust Managed PKI
 *     Federal, Federal Bridge CA G4, State Dept, WidePoint ORC, etc.).
 *     This is the "roots + intermediates" scope — the federal graph one
 *     level down from the anchor.
 *
 * Both are handled by the existing CERT_DIRECT_EXT path in
 * sync-country.mjs (.p7c is unwrapped as PKCS7 by extract-certs.mjs).
 *
 * Deliberately NOT mirrored:
 *  - caCertsIssuedTofcpcag2.p7c — the AIA cross-cert into Common Policy
 *    from Federal Bridge G4. Its subject CN is identical to the root's, so
 *    it would collide on the staged filename; it's a path-building
 *    cross-cert, not an anchor or a distinct CA.
 *  - the weekly FPKI Graph P7B — the entire federal cross-cert mesh
 *    (hundreds of certs), beyond a trust-anchor mirror's scope.
 * Both are documented in scripts/monitors/README.md.
 *
 * Canada has no public equivalent: the GC "Canada Root CA" is on the
 * internal government network only and the recognized-CA page is
 * WAF-blocked — documented as not-mirrorable in scripts/monitors/README.md.
 */
import { fetchPageWithFingerprint } from '../lib/discover.mjs'

export const BASE = 'https://repo.fpki.gov/fcpca/'
export const CERT_URL = BASE + 'fcpcag2.crt'

export const FILES = [
  { filename: 'fcpcag2.crt', label: 'Federal Common Policy CA G2 (root)' },
  { filename: 'caCertsIssuedByfcpcag2.p7c', label: 'subordinate CAs cross-certified by Common Policy' },
]

export async function discover() {
  const { tlsFingerprintSha256 } = await fetchPageWithFingerprint(CERT_URL)
  return {
    pageUrl: CERT_URL,
    pageTlsFingerprintSha256: tlsFingerprintSha256,
    candidates: FILES.map((f) => ({ url: BASE + f.filename, org: 'US Federal PKI', filename: f.filename })),
  }
}
