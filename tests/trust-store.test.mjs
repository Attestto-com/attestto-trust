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

// ── Root exports ───────────────────────────────────────────────────

describe('root index.js exports', () => {
  it('exports cr, br, ar namespaces', () => {
    assert.ok(trust.cr, 'cr namespace missing')
    assert.ok(trust.br, 'br namespace missing')
    assert.ok(trust.ar, 'ar namespace missing')
  })

  it('each namespace has ALL_CERTS array', () => {
    assert.ok(Array.isArray(trust.cr.ALL_CERTS), 'cr.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.br.ALL_CERTS), 'br.ALL_CERTS not an array')
    assert.ok(Array.isArray(trust.ar.ALL_CERTS), 'ar.ALL_CERTS not an array')
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

// ── Cross-country checks ───────────────────────────────────────────

describe('cross-country integrity', () => {
  it('total trust store has 14 certificates (CR 8 + BR 4 + AR 2)', () => {
    const total = cr.ALL_CERTS.length + br.ALL_CERTS.length + ar.ALL_CERTS.length
    assert.equal(total, 14, `Expected 14 total, got ${total}`)
  })

  it('no duplicate export names across countries', () => {
    const allNames = [
      ...cr.ALL_CERTS.map(c => c.exportName),
      ...br.ALL_CERTS.map(c => c.exportName),
      ...ar.ALL_CERTS.map(c => c.exportName),
    ]
    const unique = new Set(allNames)
    assert.equal(unique.size, allNames.length, 'Duplicate export names found')
  })

  it('every PEM decodes to valid base64 content', () => {
    const all = [...cr.ALL_CERTS, ...br.ALL_CERTS, ...ar.ALL_CERTS]
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
