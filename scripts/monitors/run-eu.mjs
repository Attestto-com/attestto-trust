#!/usr/bin/env node
/**
 * EU LOTL monitor — the eIDAS equivalent of a single-country run, fanned
 * out across every national Trusted List the EU List of Trusted Lists
 * points to.
 *
 * Flow:
 *   1. Fetch the LOTL (https://ec.europa.eu/tools/lotl/eu-lotl.xml) and
 *      extract its national-list pointers (~31 territories: 27 EU + IS/LI/NO
 *      + UK). See lib/extract-lotl.mjs.
 *   2. For each territory, fetch its national Trusted List and stage the CA
 *      certificates it lists (roots + intermediates; leaf/TSA/OCSP certs are
 *      filtered out) into countries/<iso2>/staging/, reusing the same
 *      per-country machinery as every other adapter (lib/sync-country.mjs
 *      with caOnly=true).
 *   3. One bookkeeping commit for everything staged. Never writes to
 *      current/, never pushes — same human-gated model as the rest.
 *
 * What this mirrors: exactly what each national Trusted List authoritatively
 * publishes. Under eIDAS the list itself is the trust decision, and it lists
 * the *accredited* CAs — predominantly issuing/intermediate CAs, plus
 * whatever roots are embedded. It does NOT chase self-signed roots up each
 * chain via AIA (e.g. Spain's list carries "AC FNMT Usuarios" but not the
 * self-signed "AC RAIZ FNMT-RCM" root above it). That's correct for an
 * eIDAS mirror: promote what the signed list asserts.
 *
 * Not yet implemented (documented future work): verifying the LOTL's and
 * each national list's XAdES signature. v1 relies on HTTPS-only transport +
 * human cross-check at promotion time, same as every other adapter. Because
 * the national lists are large (multi-MB) and numerous, per-territory TLS
 * fingerprint tracking is skipped here to avoid double-fetching each list.
 *
 * Known persistent failures (confirmed source-side TLS, not transient):
 *  - Ireland (eidas.gov.ie): serves an incomplete chain (leaf only, no
 *    intermediate) → Node's fetch can't build a trust path.
 *  - Slovakia (tl.nbu.gov.sk): HTTPS cert hostname mismatch, list otherwise
 *    HTTP-only → rejected by the HTTPS-only rule.
 * Both are logged and skipped; they'll ingest once their operators fix TLS.
 *
 * Usage:
 *   node scripts/monitors/run-eu.mjs            # all territories in the LOTL
 *   node scripts/monitors/run-eu.mjs es fr de   # only these iso2 dirs
 */
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { fetchPageWithFingerprint, downloadSource } from './lib/discover.mjs'
import { parseLotlPointers } from './lib/extract-lotl.mjs'
import { syncCountry } from './lib/sync-country.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SCRIPT_DIR, '..', '..')
const LOTL_URL = 'https://ec.europa.eu/tools/lotl/eu-lotl.xml'

const only = new Set(process.argv.slice(2).map((s) => s.toLowerCase()))

let lotlXml
try {
  lotlXml = (await fetchPageWithFingerprint(LOTL_URL)).html
} catch (err) {
  console.error(`FATAL: could not fetch the EU LOTL: ${err.message}`)
  process.exit(1)
}

let pointers = parseLotlPointers(lotlXml)
if (only.size > 0) pointers = pointers.filter((p) => only.has(p.iso2))
console.log(`LOTL: ${pointers.length} national list(s) to process${only.size ? ` (filtered to ${[...only].join(', ')})` : ''}\n`)

const summary = []
const touchedDirs = []

for (const { territory, iso2, tslUrl } of pointers) {
  const countryDir = join(ROOT, 'countries', iso2)
  try {
    // Cheap reachability probe first so a dead national server logs cleanly
    // and moves on rather than surfacing as an opaque sync failure.
    await downloadSource(tslUrl.replace(/^http:\/\//i, 'https://'))
    const result = await syncCountry({
      iso2,
      countryDir,
      pageUrl: tslUrl,
      pageTlsFingerprintSha256: null,
      candidates: [{ url: tslUrl, org: `${territory} Trusted List`, filename: `${iso2}-tsl.xml` }],
      caOnly: true,
    })
    touchedDirs.push(iso2)
    summary.push({ iso2, territory, staged: result.stagedCount, status: 'ok' })
    console.log(`  ${iso2} (${territory}): staged ${result.stagedCount} CA cert(s)`)
  } catch (err) {
    summary.push({ iso2, territory, staged: 0, status: 'failed', reason: err.message })
    console.log(`  ${iso2} (${territory}): FAILED — ${err.message}`)
  }
}

const okCount = summary.filter((s) => s.status === 'ok').length
const failed = summary.filter((s) => s.status === 'failed')
const totalStaged = summary.reduce((n, s) => n + s.staged, 0)
console.log(`\n=== ${okCount}/${pointers.length} lists processed, ${totalStaged} CA cert(s) staged total ===`)
if (failed.length) {
  console.log(`Unreachable/failed (${failed.length}): ${failed.map((s) => s.iso2).join(', ')}`)
}

// One bookkeeping commit for every territory dir touched. Never current/, never push.
try {
  const paths = touchedDirs.flatMap((iso2) =>
    ['.source-state.json', '.monitor.log', 'raw', 'staging']
      .map((p) => `countries/${iso2}/${p}`)
      .filter((p) => existsSync(join(ROOT, p))),
  )
  if (paths.length) {
    execFileSync('git', ['add', ...paths], { cwd: ROOT, stdio: 'ignore' })
    const status = execFileSync('git', ['status', '--porcelain', ...paths], { cwd: ROOT }).toString()
    if (status.trim().length > 0) {
      const date = new Date().toISOString().slice(0, 10)
      const msg = `eu: LOTL monitor run ${date} -- ${okCount} lists, ${totalStaged} CA certs staged for review`
      execFileSync('git', ['commit', '-m', msg], { cwd: ROOT, stdio: 'ignore' })
      console.log(`Committed bookkeeping: ${msg}`)
    }
  }
} catch (err) {
  console.error(`WARNING: git commit failed: ${err.message}`)
}
