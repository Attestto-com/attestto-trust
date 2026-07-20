/**
 * Panama source adapter — DNFE (Dirección Nacional de Firma Electrónica),
 * a department of the Public Registry that is itself Panama's root CA.
 *
 * Three direct cert files confirmed via the DNFE configuration page
 * (firmaelectronica.gob.pa/configuracion-firma-electronica.html): the
 * national root plus two issuing CAs. No page-scraping or extraction
 * needed — same CERT_DIRECT_EXT path as Uruguay.
 */
import { fetchPageWithFingerprint } from '../lib/discover.mjs'

export const BASE = 'https://www.firmaelectronica.gob.pa/cacerts/'

export const FILES = [
  { filename: 'caraiz.crt', label: 'Autoridad de Certificacion Raiz de Panama' },
  { filename: 'cagob.crt', label: 'Autoridad de Certificacion de Gobierno' },
  { filename: 'capc2.crt', label: 'Autoridad de Certificacion de Panama Clase 2' },
]

export async function discover() {
  const configPageUrl = 'https://www.firmaelectronica.gob.pa/configuracion-firma-electronica.html'
  const { tlsFingerprintSha256 } = await fetchPageWithFingerprint(configPageUrl)
  return {
    pageUrl: configPageUrl,
    pageTlsFingerprintSha256: tlsFingerprintSha256,
    candidates: FILES.map((f) => ({ url: BASE + f.filename, org: 'DNFE', filename: f.filename })),
  }
}
