/**
 * Dominican Republic source adapter — INDOTEL Trusted List (TSL).
 *
 * INDOTEL (Instituto Dominicano de las Telecomunicaciones) publishes one
 * ETSI TS 119 612 TSL XML — "LISTA ELECTRONICA DE CONFIANZA REP. DOMINICANA"
 * (SchemeTerritory DO), XAdES-signed, with every accredited TSP's certificate
 * embedded inline. Same shape as Peru: exactly one candidate — the TSL
 * document itself. Diffing, downloading, XML parsing into per-TSP certs, and
 * staging are shared code in ../lib/. Per-service Granted/Withdrawn status is
 * honored by the TSL extractor.
 */
import { fetchPageWithFingerprint } from '../lib/discover.mjs'

export const TSL_URL = 'https://applin.indotel.gob.do/tsl/tsl.xml'

export async function discover() {
  const { tlsFingerprintSha256 } = await fetchPageWithFingerprint(TSL_URL)
  return {
    pageUrl: TSL_URL,
    pageTlsFingerprintSha256: tlsFingerprintSha256,
    candidates: [{ url: TSL_URL, org: 'INDOTEL TSL', filename: 'tsl-do.xml' }],
  }
}
