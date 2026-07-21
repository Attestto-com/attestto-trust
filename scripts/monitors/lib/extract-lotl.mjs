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
 * @param {string} xml - the LOTL XML document
 * @returns {Array<{territory: string, iso2: string, tslUrl: string}>}
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
    if (!byTerritory.has(territory)) byTerritory.set(territory, loc)
  }

  return [...byTerritory.entries()].map(([territory, tslUrl]) => ({
    territory,
    iso2: TERRITORY_TO_ISO2[territory] || territory.toLowerCase(),
    tslUrl,
  }))
}
