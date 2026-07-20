#!/usr/bin/env node
/**
 * Entry point for the trust-anchor source monitors.
 *
 * Usage: node scripts/monitors/run.mjs <iso2>
 *   e.g. node scripts/monitors/run.mjs cl
 *
 * Detection (fetch/diff/download/extract) is fully automatic. Promotion
 * into countries/<iso2>/current/ is NOT — this script only ever writes to
 * raw/, staging/, .source-state.json, and .monitor.log, and only commits
 * those bookkeeping paths. Review staging/<date>/summary.json and follow
 * the "Updating an existing country" flow in the top-level README to
 * actually promote a cert. Never pushes.
 */
import { existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { syncCountry } from './lib/sync-country.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SCRIPT_DIR, '..', '..')

const iso2 = process.argv[2]
if (!iso2) {
  console.error('Usage: node scripts/monitors/run.mjs <iso2>')
  console.error('Available adapters: cl')
  process.exit(1)
}

const adapterPath = join(SCRIPT_DIR, 'sources', `${iso2}.mjs`)
if (!existsSync(adapterPath)) {
  console.error(`No source adapter for "${iso2}" (expected ${adapterPath})`)
  process.exit(1)
}

function printKnownGaps(gaps) {
  if (gaps.length === 0) return
  console.log(`\n=== KNOWN GAPS — ${gaps.length} source(s) not covered by this monitor ===`)
  for (const gap of gaps) {
    console.log(`  - ${gap.org}: ${gap.filename} (${gap.reason}) -- ${gap.url}`)
  }
  console.log("=== these CAs' roots are NOT in the trust set until handled manually ===\n")
}

const countryDir = join(ROOT, 'countries', iso2)
mkdirSync(countryDir, { recursive: true })

const adapter = await import(adapterPath)

let discovery
try {
  discovery = await adapter.discover()
} catch (err) {
  console.error(`FATAL: could not fetch/parse the source page for ${iso2}: ${err.message}`)
  process.exit(1)
}

const result = await syncCountry({
  iso2,
  countryDir,
  pageUrl: discovery.pageUrl,
  pageTlsFingerprintSha256: discovery.pageTlsFingerprintSha256,
  candidates: discovery.candidates,
})

printKnownGaps(result.knownGaps)

if (result.stagedCount > 0) {
  console.log(`Staged ${result.stagedCount} candidate cert(s) for review: ${result.stagingDir}`)
  console.log(`Review ${join(result.stagingDir, 'summary.json')} before promoting anything to countries/${iso2}/current/.`)
} else {
  console.log(`No changes detected for ${iso2}.`)
}

// Bookkeeping-only commit — never countries/<iso2>/current/, never a push.
try {
  const candidatePaths = [
    `countries/${iso2}/.source-state.json`,
    `countries/${iso2}/.monitor.log`,
    `countries/${iso2}/raw`,
    `countries/${iso2}/staging`,
  ].filter((p) => existsSync(join(ROOT, p)))

  execFileSync('git', ['add', ...candidatePaths], { cwd: ROOT, stdio: 'ignore' })
  const status = execFileSync('git', ['status', '--porcelain', ...candidatePaths], { cwd: ROOT }).toString()

  if (status.trim().length > 0) {
    const date = new Date().toISOString().slice(0, 10)
    const summary =
      result.stagedCount > 0
        ? `${iso2}: monitor run ${date} -- staged ${result.stagedCount} cert(s) for review`
        : `${iso2}: monitor run ${date} -- no changes`
    execFileSync('git', ['commit', '-m', summary], { cwd: ROOT, stdio: 'ignore' })
    console.log(`Committed bookkeeping: ${summary}`)
  }
} catch (err) {
  console.error(`WARNING: git commit failed: ${err.message}`)
}
