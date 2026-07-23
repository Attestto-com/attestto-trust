#!/usr/bin/env node
/**
 * Regenerate countries/<cc>/did.json — the did:pki identifier for each
 * promoted certificate.
 *
 * Usage:
 *   node scripts/refresh-did-pki.mjs            # all promoted countries
 *   node scripts/refresh-did-pki.mjs ee it      # just these
 *
 * WORKSPACE MAINTAINER TOOL — not part of the published @attestto/trust
 * package and not run in the trust.attestto.org (Pages) CI build. Like the
 * monitors, it runs where the sibling `attestto-did-resolver` repo is
 * checked out and built, imports that repo's canonical did:pki derivation
 * (do NOT reimplement the algorithm — did:pki-spec §7 lives there), and
 * commits its output (`did.json`) so the site can read the DIDs at build
 * time with no resolver dependency.
 *
 * Each did.json maps a current/ PEM filename to its did:pki string, e.g.
 *   { "generatedAt": "...", "method": "did:pki",
 *     "dids": { "AC-RAIZ-FNMT-RCM.pem": "did:pki:es:fnmt:raiz", ... } }
 */
import 'reflect-metadata'
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as x509 from '@peculiar/x509'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const countriesDir = join(root, 'countries')

// Canonical did:pki derivation lives in the sibling resolver repo. Import it
// rather than duplicate the algorithm. Its dist/ is a build artifact, so the
// resolver must be built (npm run build) before running this tool.
const resolverNormalize = join(root, '..', 'attestto-did-resolver', 'dist', 'normalize.js')
if (!existsSync(resolverNormalize)) {
  console.error(
    `[did-pki] cannot find the resolver's derivation at:\n  ${resolverNormalize}\n` +
      `Check out and build ../attestto-did-resolver (npm install && npm run build), then re-run.`,
  )
  process.exit(1)
}
const { deriveDid } = await import(pathToFileURL(resolverNormalize).href)

// @peculiar/x509 reads proper UTF-8 (unlike node-forge's binary strings), so
// accented O/CN values feed clean segments into the DID.
function subjectFields(pem) {
  const cert = new x509.X509Certificate(pem)
  const field = (k) => cert.subjectName.getField(k)?.[0] || null
  return {
    cn: field('CN') || field('OU') || field('O'),
    o: field('O') || undefined,
    c: field('C') || undefined,
  }
}

function refreshCountry(cc) {
  const currentDir = join(countriesDir, cc, 'current')
  if (!existsSync(join(currentDir, 'manifest.json'))) {
    console.error(`skip ${cc}: not promoted (no current/manifest.json)`)
    return
  }
  const pems = readdirSync(currentDir)
    .filter((f) => f.endsWith('.pem') && f !== 'chain.pem')
    .sort()

  // A did:pki must be syntactically valid — segments limited to the DID
  // idchar set (ALPHA / DIGIT / "." / "-" / "_"). The resolver's org/CN
  // normalization can currently leave stray punctuation (e.g. the apostrophe
  // in "Ministero dell'Interno" → "…dell'interno"), which is not a legal DID.
  // We never publish an invalid identifier: skip it and warn so it can be
  // fixed upstream in the resolver, not worked around here.
  const VALID_DID = /^did:pki:[a-z]{2}(:[a-z0-9._-]+)+$/

  const dids = {}
  const skipped = []
  for (const file of pems) {
    const { cn, o } = subjectFields(readFileSync(join(currentDir, file), 'utf8'))
    const did = deriveDid(cc, cn, o)
    if (VALID_DID.test(did)) dids[file] = did
    else skipped.push({ file, did })
  }
  for (const s of skipped) {
    console.warn(`  ${cc}: skipped invalid DID for ${s.file} → ${s.did}`)
  }

  const outPath = join(countriesDir, cc, 'did.json')
  // Preserve generatedAt when the DIDs are unchanged, so regeneration is
  // idempotent (same policy as refresh-manifest.mjs).
  let generatedAt = new Date().toISOString()
  if (existsSync(outPath)) {
    try {
      const prev = JSON.parse(readFileSync(outPath, 'utf8'))
      if (prev.generatedAt && JSON.stringify(prev.dids) === JSON.stringify(dids)) {
        generatedAt = prev.generatedAt
      }
    } catch {
      /* fall through to a fresh timestamp */
    }
  }

  writeFileSync(outPath, JSON.stringify({ method: 'did:pki', generatedAt, dids }, null, 2) + '\n')
  console.log(`${cc}: ${Object.keys(dids).length} did:pki identifiers → did.json`)
}

const args = process.argv.slice(2)
const countries = args.length > 0
  ? args
  : readdirSync(countriesDir).filter((d) => statSync(join(countriesDir, d)).isDirectory())

for (const cc of countries) refreshCountry(cc)
