/**
 * Chile — State PKI (firma.gob / Gobierno Digital) source adapter.
 *
 * Distinct from sources/cl.mjs, which mirrors Chile's ACCREDITED PRIVATE
 * CAs (E-Cert, Acepta, Certinet, ...) from entidadacreditadora.gob.cl. This
 * adapter mirrors the Chilean STATE hierarchy published at
 * firma.digital.gob.cl/biblioteca/certificados/: the two "Autoridad
 * Certificadora del Estado de Chile" roots (G1, G2) plus ~713 sub-CAs — one
 * issuing CA per public entity (municipalities, ministries, courts,
 * universities).
 *
 * Every cert is an individual .pem on an S3-backed CDN. A handful of links
 * are http:// but serve fine over https, and sync-country upgrades every
 * download to https regardless — so the whole set satisfies the HTTPS-only
 * rule. Handled by the existing CERT_DIRECT_EXT path; role (root vs
 * intermediate) is decided at extraction, so the adapter just collects
 * every .pem link.
 */
import { fetchPageWithFingerprint } from '../lib/discover.mjs'

export const PAGE_URL = 'https://firma.digital.gob.cl/biblioteca/certificados/'

/** Extract every .pem cert link from the page, https-upgraded and deduped. */
export function parseCertLinks(html) {
  const seen = new Set()
  const candidates = []
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+\.pem)"/gi)) {
    const url = m[1].replace(/^http:\/\//i, 'https://')
    if (seen.has(url)) continue
    seen.add(url)
    candidates.push({ url, org: 'Estado de Chile', filename: decodeURIComponent(url.split('/').pop()) })
  }
  return candidates
}

export async function discover() {
  const { html, tlsFingerprintSha256 } = await fetchPageWithFingerprint(PAGE_URL)
  return {
    pageUrl: PAGE_URL,
    pageTlsFingerprintSha256: tlsFingerprintSha256,
    candidates: parseCertLinks(html),
  }
}
