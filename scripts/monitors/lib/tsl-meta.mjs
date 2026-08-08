/**
 * Trusted List (TSL) metadata helpers.
 *
 * parseNextUpdate – reads the <NextUpdate><dateTime> element from a TSL XML
 * string and returns a Date (or null if absent/invalid).
 *
 * isFresh – returns true when `now` is at or before the NextUpdate date,
 * i.e. the list has not yet expired. Returns false if NextUpdate is missing.
 */

// NextUpdate lives under <SchemeInformation><NextUpdate><dateTime>...</dateTime>.
const NEXT_UPDATE_RE = /<[^>]*NextUpdate>[\s\S]*?<[^>]*dateTime>\s*([^<]+?)\s*<\/[^>]*dateTime>/i

export function parseNextUpdate(xml) {
  const m = xml.match(NEXT_UPDATE_RE)
  if (!m) return null
  const d = new Date(m[1])
  return Number.isNaN(d.getTime()) ? null : d
}

export function isFresh(xml, now = new Date()) {
  const nu = parseNextUpdate(xml)
  if (!nu) return false // no NextUpdate → treat as not-current
  return now.getTime() <= nu.getTime()
}
