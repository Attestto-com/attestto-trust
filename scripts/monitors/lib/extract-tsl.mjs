/**
 * Parse an ETSI TS 119 612 Trusted List (TSL) XML document into candidate
 * certificates. Grounded against the real Peru (INDECOPI/IOFE) TSL, but the
 * schema is standard enough (the same one the EU LOTL and UK list use) that
 * any future ETSI-TSL country adapter can reuse this unchanged.
 *
 * Unlike a zip bundle, a TSL is one XML document listing many Trust Service
 * Providers (TSPs), each with one or more services and an inline base64 DER
 * certificate — no separate download/extraction step, just XML parsing.
 */
import { certsFromFile } from './extract-certs.mjs'

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

function tspOrgName(tspBlock) {
  return (
    firstMatch(/<tsl:TSPTradeName>\s*<tsl:Name xml:lang="en">([\s\S]*?)<\/tsl:Name>/, tspBlock) ||
    firstMatch(/<tsl:TSPName>\s*<tsl:Name xml:lang="en">([\s\S]*?)<\/tsl:Name>/, tspBlock) ||
    firstMatch(/<tsl:TSPTradeName>\s*<tsl:Name xml:lang="es">([\s\S]*?)<\/tsl:Name>/, tspBlock) ||
    firstMatch(/<tsl:TSPName>\s*<tsl:Name xml:lang="es">([\s\S]*?)<\/tsl:Name>/, tspBlock) ||
    'Unknown TSP'
  )
}

/**
 * A service is "active" only if its status is a proper ETSI status URI
 * that isn't withdrawn/revoked/ceased. Peru's TSL also uses the literal
 * string "No acredited" for a couple of services — not a URI, so it fails
 * the prefix check and is correctly treated as inactive.
 */
function isActiveStatus(status) {
  if (!status || !status.startsWith('http://uri.etsi.org/')) return false
  return !/withdrawn|revoked|ceased|deregistered/i.test(status)
}

/**
 * @param {Buffer} xmlBuffer
 * @returns {{certs: Array, skipped: Array, error: string|null}}
 *   skipped entries: {org, serviceName, status, reason} — services with no
 *   digital identity, an inactive status, or an unparseable cert. Surfaced
 *   by the caller as known-gaps warnings, not silently dropped.
 */
export function extractCertsFromTsl(xmlBuffer) {
  const xml = xmlBuffer.toString('utf-8')
  const certs = []
  const skipped = []

  const tspBlocks = xml.match(/<tsl:TrustServiceProvider>[\s\S]*?<\/tsl:TrustServiceProvider>/g) || []
  if (tspBlocks.length === 0) {
    return { certs, skipped, error: 'no <tsl:TrustServiceProvider> entries found — TSL format may have changed' }
  }

  for (const tspBlock of tspBlocks) {
    const org = tspOrgName(tspBlock)
    const serviceBlocks = tspBlock.match(/<tsl:TSPService>[\s\S]*?<\/tsl:TSPService>/g) || []

    for (const serviceBlock of serviceBlocks) {
      const status = firstMatch(/<tsl:ServiceStatus>([\s\S]*?)<\/tsl:ServiceStatus>/, serviceBlock)
      const serviceName =
        firstMatch(/<tsl:ServiceName>\s*<tsl:Name xml:lang="en">([\s\S]*?)<\/tsl:Name>/, serviceBlock) ||
        firstMatch(/<tsl:ServiceName>\s*<tsl:Name xml:lang="es">([\s\S]*?)<\/tsl:Name>/, serviceBlock) ||
        'unnamed service'
      const certB64 = firstMatch(/<tsl:X509Certificate>([\s\S]*?)<\/tsl:X509Certificate>/, serviceBlock)

      if (!certB64) continue // e.g. RA services with no digital identity of their own

      if (!isActiveStatus(status)) {
        skipped.push({ org, serviceName, status: status || 'unknown', reason: 'not-under-supervision' })
        continue
      }

      let der
      try {
        der = Buffer.from(certB64.replace(/\s+/g, ''), 'base64')
      } catch {
        skipped.push({ org, serviceName, status, reason: 'invalid-base64' })
        continue
      }

      const parsed = certsFromFile(der, serviceName)
      if (parsed.length === 0) {
        skipped.push({ org, serviceName, status, reason: 'unparseable-cert' })
        continue
      }
      for (const cert of parsed) certs.push({ ...cert, org })
    }
  }

  return { certs, skipped, error: null }
}
