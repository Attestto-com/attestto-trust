/**
 * Parse an ETSI TS 119 612 Trusted List (TSL) XML document into candidate
 * certificates. Grounded against real national lists — Peru (INDECOPI/IOFE,
 * which uses a `tsl:` element prefix) and the EU/eIDAS national lists reached
 * via the LOTL (many of which use NO namespace prefix, e.g. Spain). All
 * element matching is therefore namespace-prefix-agnostic: `(?:\w+:)?` before
 * every tag matches both `<tsl:Foo>` and a bare `<Foo>`.
 *
 * A TSL is one XML document listing many Trust Service Providers (TSPs),
 * each with one or more services, each carrying an inline base64 DER
 * certificate — no separate download/extraction step, just XML parsing.
 */
import { certsFromFile } from './extract-certs.mjs'

/** Optional XML namespace prefix fragment for a tag (matches `tsl:` or bare). */
const NS = '(?:\\w+:)?'

/** Decode the standard XML entities (org/service names routinely contain "&"). */
function xmlUnescape(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, '&') // must run last so "&amp;lt;" etc. don't double-unescape
}

function firstMatch(re, text) {
  const m = re.exec(text)
  return m ? xmlUnescape(m[1].trim()) : null
}

/** Build a prefix-agnostic regex for an opening/closing tag pair capturing inner text. */
function tag(name, flags = '') {
  return new RegExp(`<${NS}${name}>([\\s\\S]*?)</${NS}${name}>`, flags)
}

function tspOrgName(tspBlock) {
  // Prefer an English trade/legal name; fall back to any language, then any name.
  return (
    firstMatch(new RegExp(`<${NS}TSPTradeName>\\s*<${NS}Name xml:lang="en">([\\s\\S]*?)</${NS}Name>`), tspBlock) ||
    firstMatch(new RegExp(`<${NS}TSPName>\\s*<${NS}Name xml:lang="en">([\\s\\S]*?)</${NS}Name>`), tspBlock) ||
    firstMatch(new RegExp(`<${NS}TSPTradeName>\\s*<${NS}Name[^>]*>([\\s\\S]*?)</${NS}Name>`), tspBlock) ||
    firstMatch(new RegExp(`<${NS}TSPName>\\s*<${NS}Name[^>]*>([\\s\\S]*?)</${NS}Name>`), tspBlock) ||
    'Unknown TSP'
  )
}

/**
 * A service is "active" only if its status is a proper ETSI status URI that
 * matches the granted-status positive allowlist (granted, accredited,
 * undersupervision, supervisionincessation, setbynationallaw). The deny-terms
 * backstop rejects any URI that somehow slips through with revocation wording.
 *
 * Peru's literal "No acredited" string isn't a URI so it fails the prefix
 * check and is correctly treated as inactive.
 */
function isActiveStatus(status) {
  if (!status || !status.startsWith('http://uri.etsi.org/')) return false
  if (/withdrawn|revoked|ceased|deregistered|deprecated/i.test(status)) return false
  return /granted|accredited|undersupervision|supervisionincessation|setbynationallaw/i.test(status)
}

/**
 * @param {Buffer} xmlBuffer
 * @param {{caOnly?: boolean}} [opts] - caOnly drops leaf/end-entity certs
 *   (TSA, OCSP, per-service signing certs), keeping only CA certificates
 *   (roots + intermediates). Used by the EU LOTL adapter, whose national
 *   lists carry hundreds of non-CA service certs per country.
 * @returns {{certs: Array, skipped: Array, error: string|null}}
 *   skipped entries: {org, serviceName, status, reason} — services with an
 *   inactive status or an unparseable cert. Surfaced by the caller as
 *   known-gaps warnings. caOnly-filtered leaf certs are NOT recorded as
 *   skips (they're an intentional scope exclusion, not a gap).
 */
export function extractCertsFromTsl(xmlBuffer, { caOnly = false } = {}) {
  const xml = xmlBuffer.toString('utf-8')
  const certs = []
  const skipped = []

  const tspBlocks = xml.match(tag('TrustServiceProvider', 'g')) || []
  if (tspBlocks.length === 0) {
    return { certs, skipped, error: 'no <TrustServiceProvider> entries found — TSL format may have changed' }
  }

  for (const tspBlock of tspBlocks) {
    const org = tspOrgName(tspBlock)
    const serviceBlocks = tspBlock.match(tag('TSPService', 'g')) || []

    for (const serviceBlock of serviceBlocks) {
      const status = firstMatch(tag('ServiceStatus'), serviceBlock)
      const serviceName =
        firstMatch(new RegExp(`<${NS}ServiceName>\\s*<${NS}Name xml:lang="en">([\\s\\S]*?)</${NS}Name>`), serviceBlock) ||
        firstMatch(new RegExp(`<${NS}ServiceName>\\s*<${NS}Name[^>]*>([\\s\\S]*?)</${NS}Name>`), serviceBlock) ||
        'unnamed service'
      const certB64 = firstMatch(tag('X509Certificate'), serviceBlock)

      if (!certB64) continue // e.g. RA services with no digital identity of their own

      if (!isActiveStatus(status)) {
        skipped.push({ org, serviceName, status: status || 'unknown', reason: 'not-under-supervision' })
        continue
      }

      const der = Buffer.from(certB64.replace(/\s+/g, ''), 'base64')
      const parsed = certsFromFile(der, serviceName)
      if (parsed.length === 0) {
        skipped.push({ org, serviceName, status, reason: 'unparseable-cert' })
        continue
      }

      for (const cert of parsed) {
        if (caOnly && !cert.isCA) continue // intentional scope exclusion (leaf/TSA/OCSP)
        certs.push({ ...cert, org })
      }
    }
  }

  return { certs, skipped, error: null }
}
