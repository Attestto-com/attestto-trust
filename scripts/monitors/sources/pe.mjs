/**
 * Peru source adapter — INDECOPI/IOFE Trusted List (TSL).
 *
 * Unlike Chile's page of many separate bundle links, Peru publishes one
 * ETSI TS 119 612 TSL XML document (`tsl-pe.xml`) with every accredited
 * CA's certificate embedded inline. There is exactly one "candidate" here:
 * the TSL document itself. Everything else — diffing, downloading, XML
 * parsing into per-TSP certs, staging — is shared code in ../lib/.
 */
import { fetchPageWithFingerprint } from '../lib/discover.mjs'

export const TSL_URL = 'https://iofe.indecopi.gob.pe/TSL/tsl-pe.xml'

export async function discover() {
  const { tlsFingerprintSha256 } = await fetchPageWithFingerprint(TSL_URL)
  return {
    pageUrl: TSL_URL,
    pageTlsFingerprintSha256: tlsFingerprintSha256,
    candidates: [{ url: TSL_URL, org: 'INDECOPI TSL', filename: 'tsl-pe.xml' }],
  }
}
