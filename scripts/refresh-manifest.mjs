#!/usr/bin/env node
/**
 * Regenerate manifest.json (and chain.pem) for one or all countries.
 *
 * Usage:
 *   node scripts/refresh-manifest.mjs            # all countries
 *   node scripts/refresh-manifest.mjs cr         # just CR
 *   node scripts/refresh-manifest.mjs cr mx      # CR and MX
 *
 * For each country, walks countries/<iso2>/current/*.pem and emits:
 *   - manifest.json — sha256, subject, issuer, serialNumber, validFrom/To, role
 *   - chain.pem     — concatenated bundle of all PEMs in current/
 *
 * Run after every cert add/rotate. CI fails the build if manifest.json drifts.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import forge from 'node-forge'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const countriesDir = join(root, 'countries')

const cn = (name) => name.getField('CN')?.value || null

function refreshCountry(iso2) {
  const currentDir = join(countriesDir, iso2, 'current')
  if (!existsSync(currentDir)) {
    console.error(`skip ${iso2}: no current/ directory`)
    return
  }
  const pems = readdirSync(currentDir)
    .filter((f) => f.endsWith('.pem') && f !== 'chain.pem')
    .sort()

  const entries = pems.map((file) => {
    const pem = readFileSync(join(currentDir, file), 'utf8')
    const cert = forge.pki.certificateFromPem(pem)
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()
    const sha256 = createHash('sha256').update(Buffer.from(der, 'binary')).digest('hex')
    const subjectCN = cn(cert.subject)
    const issuerCN = cn(cert.issuer)
    return {
      file,
      sha256,
      subject: subjectCN,
      issuer: issuerCN,
      serialNumber: cert.serialNumber,
      validFrom: cert.validity.notBefore.toISOString(),
      validTo: cert.validity.notAfter.toISOString(),
      role: subjectCN === issuerCN ? 'root' : 'intermediate',
    }
  })

  const manifest = {
    country: iso2.toUpperCase(),
    generatedAt: new Date().toISOString(),
    count: entries.length,
    certificates: entries,
  }

  writeFileSync(join(currentDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

  // Concatenated bundle
  const bundle = pems.map((f) => readFileSync(join(currentDir, f), 'utf8').trim()).join('\n') + '\n'
  writeFileSync(join(currentDir, 'chain.pem'), bundle)

  console.log(`${iso2}: ${entries.length} certs → manifest.json + chain.pem`)
}

const args = process.argv.slice(2)
const countries = args.length > 0
  ? args
  : readdirSync(countriesDir).filter((d) => statSync(join(countriesDir, d)).isDirectory())

for (const iso2 of countries) refreshCountry(iso2)
