#!/usr/bin/env node
/**
 * Refreshes countries/<iso2>/revocation.json — a snapshot of each country's
 * CRL/ARL freshness.
 *
 * Why this is separate from manifest.json: a CRL's nextUpdate is TIME-VARYING
 * (CAs reissue CRLs on a schedule). manifest.json must stay deterministic so the
 * CI drift check passes, so it only carries the static crlUrls. The live
 * thisUpdate/nextUpdate — and the derived snapshotExpiresAt (= earliest
 * nextUpdate) — live here, and this file is NOT drift-checked. Re-run it to
 * refresh; commit the result as a dated snapshot.
 *
 * Network: fetches each CRL over HTTP(S). Unreachable CRLs are recorded with
 * status "unreachable" and excluded from snapshotExpiresAt rather than failing
 * the whole run.
 *
 * Usage: node scripts/refresh-revocation.mjs [iso2]
 */
import 'reflect-metadata'
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as x509 from '@peculiar/x509'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const countriesDir = join(root, 'countries')
const TIMEOUT_MS = 20000

async function fetchCrl(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return { url, status: `http-${res.status}` }
    const crl = new x509.X509Crl(new Uint8Array(await res.arrayBuffer()))
    return {
      url,
      status: 'ok',
      thisUpdate: crl.thisUpdate?.toISOString() ?? null,
      nextUpdate: crl.nextUpdate?.toISOString() ?? null,
      revokedCount: crl.entries.length,
    }
  } catch (err) {
    return { url, status: 'unreachable', error: String(err.message || err) }
  }
}

async function refreshCountry(iso2) {
  const manifestPath = join(countriesDir, iso2, 'current', 'manifest.json')
  if (!existsSync(manifestPath)) return

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const urls = [...new Set(manifest.certificates.flatMap((c) => c.crlUrls || []))].sort()
  if (urls.length === 0) {
    console.log(`${iso2}: no CRL endpoints on promoted certs — skipping`)
    return
  }

  const crls = await Promise.all(urls.map(fetchCrl))
  const nextUpdates = crls
    .filter((c) => c.status === 'ok' && c.nextUpdate)
    .map((c) => c.nextUpdate)
    .sort()
  const snapshotExpiresAt = nextUpdates[0] ?? null

  const out = {
    country: iso2.toUpperCase(),
    generatedAt: new Date().toISOString(),
    snapshotExpiresAt,
    note: 'snapshotExpiresAt is the earliest CRL nextUpdate across the promoted CAs; refresh revocation data by this date. Roots carry no CRL (trust anchors are not CRL-revocable).',
    crls,
  }
  writeFileSync(join(countriesDir, iso2, 'revocation.json'), JSON.stringify(out, null, 2) + '\n')
  const ok = crls.filter((c) => c.status === 'ok').length
  console.log(`${iso2}: ${ok}/${crls.length} CRLs fetched → revocation.json (expires ${snapshotExpiresAt ?? 'n/a'})`)
}

const target = process.argv[2]
const countries = target
  ? [target]
  : readdirSync(countriesDir).filter((d) => statSync(join(countriesDir, d)).isDirectory())

for (const iso2 of countries) {
  await refreshCountry(iso2)
}
