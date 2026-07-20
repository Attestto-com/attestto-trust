/**
 * Chile source adapter — entidadacreditadora.gob.cl/certificados-raiz/.
 *
 * The page lists ~13 accredited CAs, each under its own <h1>-<h4> heading,
 * with one or more bundle links (mostly .zip, a couple of legacy .rar)
 * per CA. This adapter's only job is turning that HTML into a flat list
 * of {url, org, filename} candidates — everything else (diffing,
 * downloading, extracting, staging) is shared code in ../lib/.
 *
 * Known limitation: org attribution is heading-proximity based. A link
 * that happens to fall between two headings with no CA content between
 * them (e.g. the page's own title heading, or a sidebar widget heading
 * inlined earlier in the HTML than expected) could be mis-labeled. This
 * is caught at manual review time (staged summaries are reviewed before
 * anything is promoted), not treated as a hard failure here.
 */
import { fetchPageWithFingerprint } from '../lib/discover.mjs'

export const PAGE_URL = 'https://www.entidadacreditadora.gob.cl/certificados-raiz/'

const HEADING_SRC = '<h[1-4][^>]*>([\\s\\S]*?)<\\/h[1-4]>'
const LINK_SRC = 'href="([^"]+\\.(?:zip|rar|cer|crt|pem|der|p7b|p7c))"'

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function resolveUrl(href) {
  if (/^https?:\/\//i.test(href)) return href
  return new URL(href, PAGE_URL).toString()
}

/**
 * Parse page HTML into {url, org, filename} candidates by walking
 * headings and cert-bundle links in document order, binding each link to
 * the nearest preceding heading.
 */
export function parseCandidates(html) {
  const combined = new RegExp(`${HEADING_SRC}|${LINK_SRC}`, 'gi')
  let currentOrg = 'Unknown'
  const candidates = []
  let match
  while ((match = combined.exec(html))) {
    const [, headingText, href] = match
    if (headingText !== undefined) {
      currentOrg = stripTags(headingText)
    } else if (href !== undefined) {
      const url = resolveUrl(href)
      const filename = decodeURIComponent(href.split('/').pop())
      candidates.push({ url, org: currentOrg, filename })
    }
  }
  return candidates
}

export async function discover() {
  const { html, tlsFingerprintSha256 } = await fetchPageWithFingerprint(PAGE_URL)
  return {
    pageUrl: PAGE_URL,
    pageTlsFingerprintSha256: tlsFingerprintSha256,
    candidates: parseCandidates(html),
  }
}
