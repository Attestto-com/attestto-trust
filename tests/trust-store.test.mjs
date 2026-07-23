/**
 * Tests for @attestto/trust — certificate trust store integrity
 *
 * Validates: exports structure, PEM format, manifest consistency,
 * SHA-256 hash verification, and cross-country completeness.
 *
 * Uses Node.js built-in test runner (node --test).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

/** Convert PEM string to raw DER bytes (strips headers + decodes base64) */
function pemToDer(pem) {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s/g, '')
  return Buffer.from(b64, 'base64')
}

// ── Import the package ─────────────────────────────────────────────

import * as trust from '../index.js'
import * as cr from '../countries/cr/index.js'
import * as br from '../countries/br/index.js'
import * as ar from '../countries/ar/index.js'
import * as es from '../countries/es/index.js'
import * as ee from '../countries/ee/index.js'
import * as fi from '../countries/fi/index.js'
import * as de from '../countries/de/index.js'
import * as fr from '../countries/fr/index.js'
import * as gr from '../countries/gr/index.js'
import * as hu from '../countries/hu/index.js'
import * as italy from '../countries/it/index.js'
import * as nl from '../countries/nl/index.js'
import * as no from '../countries/no/index.js'
import * as be from '../countries/be/index.js'
import * as at from '../countries/at/index.js'
import * as pe from '../countries/pe/index.js'
import * as pl from '../countries/pl/index.js'
import * as pt from '../countries/pt/index.js'
import * as cz from '../countries/cz/index.js'
import * as lt from '../countries/lt/index.js'

// ── Root exports ───────────────────────────────────────────────────

describe('root index.js exports', () => {
  it('exports cr, br, ar, es, ee, de, it, pe namespaces', () => {
    assert.ok(trust.cr, 'cr namespace missing')
    assert.ok(trust.br, 'br namespace missing')
    assert.ok(trust.ar, 'ar namespace missing')
    assert.ok(trust.es, 'es namespace missing')
    assert.ok(trust.ee, 'ee namespace missing')
    assert.ok(trust.de, 'de namespace missing')
    assert.ok(trust.it, 'it namespace missing')
    assert.ok(trust.pe, 'pe namespace missing')
  })

  it('each namespace has ALL_CERTS array', () => {
    assert.ok(Array.isArray(trust.cr.ALL_CERTS), 'cr.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.br.ALL_CERTS), 'br.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.ar.ALL_CERTS), 'ar.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.es.ALL_CERTS), 'es.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.ee.ALL_CERTS), 'ee.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.fi.ALL_CERTS), 'fi.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.de.ALL_CERTS), 'de.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.gr.ALL_CERTS), 'gr.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.hu.ALL_CERTS), 'hu.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.it.ALL_CERTS), 'it.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.nl.ALL_CERTS), 'nl.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.be.ALL_CERTS), 'be.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.at.ALL_CERTS), 'at.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.pe.ALL_CERTS), 'pe.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.pl.ALL_CERTS), 'pl.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.pt.ALL_CERTS), 'pt.ALL_CERTS not an array')
  })
})

// ── Country: Costa Rica ────────────────────────────────────────────

describe('Costa Rica (cr)', () => {
  it('exports at least 7 certificates', () => {
    assert.ok(cr.ALL_CERTS.length >= 7, `Expected ≥7, got ${cr.ALL_CERTS.length}`)
  })

  it('ALL_CERTS entries have required fields', () => {
    for (const cert of cr.ALL_CERTS) {
      assert.ok(cert.name, `Missing name`)
      assert.ok(cert.exportName, `Missing exportName for ${cert.name}`)
      assert.ok(cert.pem, `Missing pem for ${cert.name}`)
    }
  })

  it('every named export matches an ALL_CERTS entry', () => {
    for (const cert of cr.ALL_CERTS) {
      const exported = cr[cert.exportName]
      assert.ok(exported, `Named export ${cert.exportName} not found`)
      assert.equal(exported, cert.pem, `PEM mismatch for ${cert.exportName}`)
    }
  })

  it('all PEM strings are valid format', () => {
    for (const cert of cr.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest.json exists and count matches exports', () => {
    const manifestPath = join(ROOT, 'countries/cr/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'CR')
    assert.equal(manifest.count, manifest.certificates.length)
    assert.equal(manifest.count, cr.ALL_CERTS.length, 'manifest count ≠ ALL_CERTS length')
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/cr/current/manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/cr/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const pem = readFileSync(pemPath, 'utf-8')
      const der = pemToDer(pem)
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Brazil ────────────────────────────────────────────────

describe('Brazil (br)', () => {
  it('exports 4 ICP-Brasil root certificates', () => {
    assert.equal(br.ALL_CERTS.length, 4, `Expected 4, got ${br.ALL_CERTS.length}`)
  })

  it('includes v5, v10, v11, v12 roots', () => {
    const names = br.ALL_CERTS.map(c => c.exportName)
    assert.ok(names.includes('AC_RAIZ_ICP_BRASIL_V5'), 'Missing v5')
    assert.ok(names.includes('AC_RAIZ_ICP_BRASIL_V10'), 'Missing v10')
    assert.ok(names.includes('AC_RAIZ_ICP_BRASIL_V11'), 'Missing v11')
    assert.ok(names.includes('AC_RAIZ_ICP_BRASIL_V12'), 'Missing v12')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of br.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/br/current/manifest.json')
    if (!existsSync(manifestPath)) return // skip if no manifest yet
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/br/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const pem = readFileSync(pemPath, 'utf-8')
      const der = pemToDer(pem)
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Argentina ─────────────────────────────────────────────

describe('Argentina (ar)', () => {
  it('exports 2 certificates (root + ACFD)', () => {
    assert.equal(ar.ALL_CERTS.length, 2, `Expected 2, got ${ar.ALL_CERTS.length}`)
  })

  it('includes AC Raíz and ACFD', () => {
    const names = ar.ALL_CERTS.map(c => c.exportName)
    assert.ok(names.includes('AC_RAIZ_REPUBLICA_ARGENTINA'), 'Missing AC Raíz')
    assert.ok(names.includes('AUTORIDAD_CERTIFICANTE_FIRMA_DIGITAL'), 'Missing ACFD')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of ar.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })
})

// ── Country: Spain ──────────────────────────────────────────────────

describe('Spain (es)', () => {
  it('exports 2 certificates (root + users)', () => {
    assert.equal(es.ALL_CERTS.length, 2, `Expected 2, got ${es.ALL_CERTS.length}`)
  })

  it('includes AC Raiz and AC Usuarios', () => {
    const names = es.ALL_CERTS.map(c => c.exportName)
    assert.ok(names.includes('AC_RAIZ_FNMT_RCM'), 'Missing AC Raíz')
    assert.ok(names.includes('AC_FNMT_USUARIOS'), 'Missing AC Usuarios')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of es.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/es/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/es/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const pem = readFileSync(pemPath, 'utf-8')
      const der = pemToDer(pem)
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Estonia ───────────────────────────────────────────────

describe('Estonia (ee)', () => {
  it('exports 16 certificates (5 roots + 11 issuing CAs)', () => {
    assert.equal(ee.ALL_CERTS.length, 16, `Expected 16, got ${ee.ALL_CERTS.length}`)
  })

  it('includes all five roots (legacy, GovCA2018/2025, SK ROOT G1E/G1R)', () => {
    const names = ee.ALL_CERTS.map(c => c.exportName)
    assert.ok(names.includes('EE_CERTIFICATION_CENTRE_ROOT_CA'), 'Missing EE Certification Centre Root CA')
    assert.ok(names.includes('EE_GOVCA2018'), 'Missing EE-GovCA2018')
    assert.ok(names.includes('EEGOVCA2025'), 'Missing EEGovCA2025 (Zetes)')
    assert.ok(names.includes('SK_ID_SOLUTIONS_ROOT_G1E'), 'Missing SK ROOT G1E (EC)')
    assert.ok(names.includes('SK_ID_SOLUTIONS_ROOT_G1R'), 'Missing SK ROOT G1R')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of ee.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files (RSA + EC roots)', () => {
    const manifestPath = join(ROOT, 'countries/ee/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'EE')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/ee/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Italy ─────────────────────────────────────────────────

describe('Italy (it)', () => {
  it('exports the full AgID TSL set plus the CIE eID roots (>200 certs)', () => {
    // 229 QTSP CAs verified via the LOTL/XAdES chain + 2 CIE national eID roots.
    assert.ok(italy.ALL_CERTS.length >= 200, `Expected >=200, got ${italy.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof italy.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(italy.CIE_NATIONAL_ROOT_CA_2016, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('retains both CIE national eID roots (by SHA-256) alongside the QTSP set', () => {
    // These come from the CIE portal (separate eIDAS eID mechanism), not the QTSP TSL,
    // so they are preserved across the TSL reconcile rather than dropped.
    const cie2016 = '87364fb476e74962e7c495b9bbaf727813ee007cb56a0ada6ab9868123db267e'
    const cie2024 = '40f425927e8a1e6a297a15c2a9d79e2221bf4fe25b2f21e3bfad53a1ba58b0d7'
    assert.ok(italy.getBySha256(cie2016), 'CIE 2016 root missing from Italy set')
    assert.ok(italy.getBySha256(cie2024), 'CIE 2024 root missing from Italy set')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of italy.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/it/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'IT')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/it/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Germany ───────────────────────────────────────────────

describe('Germany (de)', () => {
  it('exports the granted BNetzA TSL CA set (>= 50 certs)', () => {
    // 101 currently-granted QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(de.ALL_CERTS.length >= 50, `Expected >=50, got ${de.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof de.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(de.ATOS_HBA_QCA1, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of de.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/de/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'DE')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/de/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: France ────────────────────────────────────────────────

describe('France (fr)', () => {
  it('exports the granted ANSSI TSL CA set (>= 40 certs)', () => {
    // 79 currently-granted QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(fr.ALL_CERTS.length >= 40, `Expected >=40, got ${fr.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof fr.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(fr.CERTIGNA_ENTITY_CA, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of fr.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/fr/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'FR')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/fr/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Greece ────────────────────────────────────────────────

describe('Greece (gr)', () => {
  it('exports the granted EETT TSL CA set (>= 60 certs)', () => {
    // 105 currently-granted QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(gr.ALL_CERTS.length >= 60, `Expected >=60, got ${gr.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof gr.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(gr.ADACOM_GLOBAL_QUALIFIED_CA, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of gr.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/gr/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'GR')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/gr/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Netherlands ───────────────────────────────────────────

describe('Netherlands (nl)', () => {
  it('exports the granted RDI TSL CA set (>= 20 certs)', () => {
    // 30 currently-granted QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(nl.ALL_CERTS.length >= 20, `Expected >=20, got ${nl.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof nl.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(nl.QUOVADIS_EU_ISSUING_CERTIFICATION_AUTHORITY_G4, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of nl.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/nl/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'NL')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/nl/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Belgium ───────────────────────────────────────────────

describe('Belgium (be)', () => {
  it('exports the granted FPS Economy TSL CA set (>= 40 certs)', () => {
    // 52 currently-granted QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(be.ALL_CERTS.length >= 40, `Expected >=40, got ${be.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof be.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(be.ZETES_TSP_QUALIFIED_CA_001, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of be.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/be/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'BE')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/be/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Austria ───────────────────────────────────────────────

describe('Austria (at)', () => {
  it('exports the granted RTR / TKK TSL CA set (>= 30 certs)', () => {
    // 39 currently-granted QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(at.ALL_CERTS.length >= 30, `Expected >=30, got ${at.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof at.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(at.A_SIGN_PREMIUM_SIG_05, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of at.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/at/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'AT')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/at/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Portugal ──────────────────────────────────────────────

describe('Portugal (pt)', () => {
  it('exports the granted GNS / SCEE TSL CA set (>= 25 certs)', () => {
    // 30 currently-granted QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(pt.ALL_CERTS.length >= 25, `Expected >=25, got ${pt.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof pt.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(pt.ECCEQ001, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of pt.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/pt/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'PT')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/pt/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Peru ──────────────────────────────────────────────────

describe('Peru (pe)', () => {
  it('exports 8 national-authority certificates', () => {
    assert.equal(pe.ALL_CERTS.length, 8, `Expected 8, got ${pe.ALL_CERTS.length}`)
  })

  it('includes RENIEC, ONPE and ECERNEP/PCM anchors', () => {
    const names = pe.ALL_CERTS.map(c => c.exportName)
    assert.ok(names.includes('RENIEC_CERTIFICATION_AUTHORITY'), 'Missing RENIEC CA')
    assert.ok(names.includes('ECEP_ONPE_CA_ROOT_5'), 'Missing ONPE root')
    assert.ok(names.includes('ECERNEP_PERU_CA_ROOT_6'), 'Missing ECERNEP ROOT 6 (EC)')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of pe.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files (incl. the EC root)', () => {
    const manifestPath = join(ROOT, 'countries/pe/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/pe/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Country: Poland ────────────────────────────────────────────────

describe('Poland (pl)', () => {
  it('exports the granted NCCert TSL CA set (>= 25 certs)', () => {
    // 29 currently-granted QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(pl.ALL_CERTS.length >= 25, `Expected >=25, got ${pl.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof pl.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(pl.ECCEQ001, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of pl.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/pl/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'PL')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/pl/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

describe('Hungary (hu)', () => {
  it('exports the granted NMHH TSL CA set (>= 55 certs)', () => {
    // 62 currently-granted QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(hu.ALL_CERTS.length >= 55, `Expected >=55, got ${hu.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof hu.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(hu.ECCEQ001, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of hu.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/hu/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'HU')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/hu/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

describe('Czech Republic (cz)', () => {
  it('exports the granted DIA TSL CA set (>= 30 certs)', () => {
    // 34 currently-granted QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(cz.ALL_CERTS.length >= 30, `Expected >=30, got ${cz.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof cz.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(cz.ECCEQ001, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of cz.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/cz/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'CZ')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/cz/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

describe('Norway (no)', () => {
  it('exports the granted Nkom TSL CA set (>= 20 certs)', () => {
    // 26 currently-granted QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(no.ALL_CERTS.length >= 20, `Expected >=20, got ${no.ALL_CERTS.length}`)
  })

  it('is a high-volume country: getBySha256 helper, no per-cert named consts', () => {
    assert.equal(typeof no.getBySha256, 'function', 'getBySha256 helper missing')
    assert.equal(no.ECCEQ001, undefined, 'should not emit per-cert named consts at this volume')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of no.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/no/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'NO')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/no/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

describe('Finland (fi)', () => {
  it('exports the granted Traficom TSL CA set (>= 10 certs)', () => {
    // 12 currently-granted DVV/VRK FINeID CAs verified via the LOTL/XAdES chain.
    assert.ok(fi.ALL_CERTS.length >= 10, `Expected >=10, got ${fi.ALL_CERTS.length}`)
  })

  it('is a low-volume country (<= 20 certs): per-cert named consts, no getBySha256 helper', () => {
    // At 12 certs the generator emits per-cert named consts + ALL_CERTS
    // rather than the getBySha256-only high-volume shape.
    assert.equal(typeof fi.getBySha256, 'undefined', 'should not emit getBySha256 helper at this volume')
    const names = fi.ALL_CERTS.map(c => c.exportName)
    assert.ok(names.includes('DVV_CITIZEN_CERTIFICATES_G4R'), 'Missing DVV Citizen Certificates - G4R')
    assert.ok(names.includes('VRK_GOV_CA_FOR_CITIZEN_CERTIFICATES_G3'), 'Missing VRK Gov. CA for Citizen Certificates - G3')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of fi.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/fi/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'FI')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/fi/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

describe('Lithuania (lt)', () => {
  it('exports the granted RRT TSL CA set (>= 10 certs)', () => {
    // 11 currently-granted accredited-QTSP CAs verified via the LOTL/XAdES chain.
    assert.ok(lt.ALL_CERTS.length >= 10, `Expected >=10, got ${lt.ALL_CERTS.length}`)
  })

  it('is a low-volume country (<= 20 certs): per-cert named consts, no getBySha256 helper', () => {
    // At 11 certs the generator emits per-cert named consts + ALL_CERTS
    // rather than the getBySha256-only high-volume shape.
    assert.equal(typeof lt.getBySha256, 'undefined', 'should not emit getBySha256 helper at this volume')
    const names = lt.ALL_CERTS.map(c => c.exportName)
    assert.ok(names.includes('ADIC_CA_ECC'), 'Missing ADIC CA ECC')
    assert.ok(names.includes('RCSC_ISSUINGCA'), 'Missing RCSC IssuingCA')
  })

  it('all PEM strings are valid format', () => {
    for (const cert of lt.ALL_CERTS) {
      assert.ok(cert.pem.startsWith('-----BEGIN CERTIFICATE-----'), `${cert.name}: bad PEM header`)
      assert.ok(cert.pem.trimEnd().endsWith('-----END CERTIFICATE-----'), `${cert.name}: bad PEM footer`)
    }
  })

  it('manifest SHA-256 hashes match DER content of PEM files', () => {
    const manifestPath = join(ROOT, 'countries/lt/current/manifest.json')
    assert.ok(existsSync(manifestPath), 'manifest.json missing')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifest.country, 'LT')
    for (const entry of manifest.certificates) {
      const pemPath = join(ROOT, 'countries/lt/current', entry.file)
      assert.ok(existsSync(pemPath), `PEM file missing: ${entry.file}`)
      const der = pemToDer(readFileSync(pemPath, 'utf-8'))
      const sha256 = createHash('sha256').update(der).digest('hex')
      assert.equal(sha256, entry.sha256, `SHA-256 mismatch for ${entry.file}`)
    }
  })
})

// ── Cross-country checks ───────────────────────────────────────────

describe('cross-country integrity', () => {
  it('total trust store carries the small-country anchors plus the TSL sets (>= 470)', () => {
    // CR 10 + BR 4 + AR 2 + ES 2 + EE 16 + PE 8 = 42 fixed, plus the
    // TSL-driven sets: Italy (~231), Germany (~101), Greece (~105),
    // France (~79), the Netherlands (~30), Belgium (~52), Austria (~39),
    // Portugal (~30), Poland (~29), Hungary (~62), the Czech Republic
    // (~34), Norway (~26), Finland (~12), and Lithuania (~11). The TSL
    // sets are dynamic (AgID / BNetzA / EETT / ANSSI / RDI / FPS Economy /
    // RTR / GNS / NCCert / NMHH / DIA / Nkom / Traficom / RRT lists), so
    // this is a floor tripwire rather than an exact count.
    const fixed =
      cr.ALL_CERTS.length +
      br.ALL_CERTS.length +
      ar.ALL_CERTS.length +
      es.ALL_CERTS.length +
      ee.ALL_CERTS.length +
      pe.ALL_CERTS.length
    assert.equal(fixed, 42, `small-country anchors changed: expected 42, got ${fixed}`)
    const total =
      fixed + italy.ALL_CERTS.length + de.ALL_CERTS.length + gr.ALL_CERTS.length + fr.ALL_CERTS.length + nl.ALL_CERTS.length + no.ALL_CERTS.length + be.ALL_CERTS.length + at.ALL_CERTS.length + pt.ALL_CERTS.length + pl.ALL_CERTS.length + hu.ALL_CERTS.length + cz.ALL_CERTS.length + fi.ALL_CERTS.length + lt.ALL_CERTS.length
    assert.ok(total >= 864, `Expected >= 864 total, got ${total}`)
  })

  it('no duplicate export names across countries', () => {
    const allNames = [
      ...cr.ALL_CERTS.map(c => c.exportName),
      ...br.ALL_CERTS.map(c => c.exportName),
      ...ar.ALL_CERTS.map(c => c.exportName),
      ...es.ALL_CERTS.map(c => c.exportName),
      ...ee.ALL_CERTS.map(c => c.exportName),
      ...fi.ALL_CERTS.map(c => c.exportName),
      ...de.ALL_CERTS.map(c => c.exportName),
      ...fr.ALL_CERTS.map(c => c.exportName),
      ...gr.ALL_CERTS.map(c => c.exportName),
      ...hu.ALL_CERTS.map(c => c.exportName),
      ...italy.ALL_CERTS.map(c => c.exportName),
      ...nl.ALL_CERTS.map(c => c.exportName),
      ...no.ALL_CERTS.map(c => c.exportName),
      ...be.ALL_CERTS.map(c => c.exportName),
      ...at.ALL_CERTS.map(c => c.exportName),
      ...pe.ALL_CERTS.map(c => c.exportName),
      ...pl.ALL_CERTS.map(c => c.exportName),
      ...pt.ALL_CERTS.map(c => c.exportName),
      ...cz.ALL_CERTS.map(c => c.exportName),
      ...lt.ALL_CERTS.map(c => c.exportName),
    ]
    const unique = new Set(allNames)
    assert.equal(unique.size, allNames.length, 'Duplicate export names found')
  })

  it('every PEM decodes to valid base64 content', () => {
    const all = [...cr.ALL_CERTS, ...br.ALL_CERTS, ...ar.ALL_CERTS, ...es.ALL_CERTS, ...ee.ALL_CERTS, ...fi.ALL_CERTS, ...de.ALL_CERTS, ...gr.ALL_CERTS, ...hu.ALL_CERTS, ...italy.ALL_CERTS, ...nl.ALL_CERTS, ...no.ALL_CERTS, ...be.ALL_CERTS, ...at.ALL_CERTS, ...pe.ALL_CERTS, ...pl.ALL_CERTS, ...pt.ALL_CERTS, ...cz.ALL_CERTS, ...lt.ALL_CERTS]
    for (const cert of all) {
      const b64 = cert.pem
        .replace('-----BEGIN CERTIFICATE-----', '')
        .replace('-----END CERTIFICATE-----', '')
        .replace(/\s/g, '')
      // Should be valid base64
      const decoded = Buffer.from(b64, 'base64')
      assert.ok(decoded.length > 100, `${cert.name}: decoded PEM too short (${decoded.length} bytes)`)
      // First byte should be 0x30 (ASN.1 SEQUENCE) for a valid X.509 cert
      assert.equal(decoded[0], 0x30, `${cert.name}: not a valid DER certificate (first byte: 0x${decoded[0].toString(16)})`)
    }
  })
})
