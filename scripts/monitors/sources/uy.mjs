/**
 * Uruguay source adapter — AGESIC Autoridad Certificadora Raíz Nacional (ACRN).
 *
 * Single national root cert, mirrored identically at agesic.gub.uy and
 * uce.gub.uy (confirmed: same Content-Length/ETag/Last-Modified). Tracking
 * the AGESIC copy as primary. No page to scrape, no bundle to extract —
 * one direct .cer file, handled by the existing CERT_DIRECT_EXT path in
 * sync-country.mjs with zero new extraction logic.
 */
import { fetchPageWithFingerprint } from '../lib/discover.mjs'

export const CERT_URL = 'https://www.agesic.gub.uy/acrn/acrn.cer'

export async function discover() {
  const { tlsFingerprintSha256 } = await fetchPageWithFingerprint(CERT_URL)
  return {
    pageUrl: CERT_URL,
    pageTlsFingerprintSha256: tlsFingerprintSha256,
    candidates: [{ url: CERT_URL, org: 'AGESIC', filename: 'acrn.cer' }],
  }
}
