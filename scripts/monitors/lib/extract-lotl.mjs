/**
 * Parse the EU LOTL (List of Trusted Lists) into the set of national
 * Trusted List locations to ingest.
 *
 * The LOTL (https://ec.europa.eu/tools/lotl/eu-lotl.xml) is a signed XML
 * whose <OtherTSLPointer> entries each point to one country's national
 * Trusted List — usually as both a machine-readable XML and a PDF twin.
 * We select the XML pointer by its declared MimeType
 * (application/vnd.etsi.tsl+xml), not by URL extension: national lists use
 * inconsistent extensions (Czechia's is `.xtsl`, Denmark's ends `...v6xml`
 * with no dot), so an extension heuristic silently drops them. We skip the
 * EU self-pointer (which points back at the LOTL itself).
 *
 * This is the ONLY new parsing step the EU adapter needs: once we have the
 * per-country TSL URLs, each national list is the same ETSI TS 119 612
 * format that scripts/monitors/lib/extract-tsl.mjs already parses (proven
 * against Peru's INDECOPI TSL).
 */

/**
 * eIDAS "scheme territory" codes diverge from ISO 3166-1 alpha-2 in two
 * cases; map them so repo directories stay ISO-consistent with the rest of
 * countries/ (es, fr, de, ...). Everything else is already ISO.
 */
const TERRITORY_TO_ISO2 = { EL: 'gr', UK: 'gb' }

function firstTag(block, localName) {
  const m = new RegExp(`<[^>]*${localName}>([\\s\\S]*?)</[^>]*${localName}>`).exec(block)
  return m ? m[1].trim() : null
}

/**
 * Extract signing identities from an OtherTSLPointer block's
 * ServiceDigitalIdentity elements. Returns an array of typed values:
 *   cert    — base64 DER (whitespace-stripped)
 *   ski     — hex-encoded Subject Key Identifier
 *   subject — X.509 DN string
 *
 * @param {string} block - one <OtherTSLPointer>…</OtherTSLPointer> fragment
 * @returns {Array<{type: 'cert'|'ski'|'subject', value: string}>}
 */
function parseSigningIdentities(block) {
  const ids = []
  const certRe = /<[^>]*X509Certificate>\s*([A-Za-z0-9+/=\s]+?)\s*<\/[^>]*X509Certificate>/g
  let m
  while ((m = certRe.exec(block))) ids.push({ type: 'cert', value: m[1].replace(/\s+/g, '') })
  const skiRe = /<[^>]*X509SKI>\s*([A-Za-z0-9+/=\s]+?)\s*<\/[^>]*X509SKI>/g
  while ((m = skiRe.exec(block))) ids.push({ type: 'ski', value: Buffer.from(m[1].replace(/\s+/g, ''), 'base64').toString('hex') })
  const subjRe = /<[^>]*X509SubjectName>\s*([\s\S]*?)\s*<\/[^>]*X509SubjectName>/g
  while ((m = subjRe.exec(block))) ids.push({ type: 'subject', value: m[1].trim() })
  return ids
}

/**
 * @param {string} xml - the LOTL XML document
 * @returns {Array<{territory: string, iso2: string, tslUrl: string, signingIdentities: Array<{type: string, value: string}>}>}
 *   one entry per national territory whose pointer has a machine-readable
 *   XML Trusted List. `territory` is the raw eIDAS code (e.g. "EL"),
 *   `iso2` the ISO-normalized repo directory name (e.g. "gr").
 */
export function parseLotlPointers(xml) {
  const blocks = xml.match(/<[^>]*OtherTSLPointer>[\s\S]*?<\/[^>]*OtherTSLPointer>/g) || []
  const byTerritory = new Map()

  for (const block of blocks) {
    const territory = firstTag(block, 'SchemeTerritory')
    if (!territory || territory === 'EU') continue // skip the LOTL self-pointer

    // Each pointer block is one location + one MimeType. Keep only the
    // machine-readable ETSI TSL pointer, skipping the PDF twin.
    if (firstTag(block, 'MimeType') !== 'application/vnd.etsi.tsl+xml') continue

    const loc = firstTag(block, 'TSLLocation')
    if (!loc) continue

    // First XML pointer for a territory wins (defensive against duplicates).
    // Store both the URL and the full block so we can extract signing identities.
    if (!byTerritory.has(territory)) byTerritory.set(territory, { loc, block })
  }

  return [...byTerritory.entries()].map(([territory, { loc: tslUrl, block }]) => ({
    territory,
    iso2: TERRITORY_TO_ISO2[territory] || territory.toLowerCase(),
    tslUrl,
    signingIdentities: parseSigningIdentities(block),
  }))
}
