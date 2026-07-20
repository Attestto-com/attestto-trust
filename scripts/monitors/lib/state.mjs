/**
 * Read/write countries/<iso2>/.source-state.json — the per-URL tracking
 * state that makes daily monitor runs idempotent (only re-download what
 * actually changed).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export function statePath(countryDir) {
  return join(countryDir, '.source-state.json')
}

export function loadState(countryDir, pageUrl) {
  const path = statePath(countryDir)
  if (!existsSync(path)) {
    return {
      pageUrl,
      pageTlsFingerprintSha256: null,
      lastRun: null,
      sources: {},
      knownGaps: [],
    }
  }
  return JSON.parse(readFileSync(path, 'utf-8'))
}

export function saveState(countryDir, state) {
  mkdirSync(countryDir, { recursive: true })
  writeFileSync(statePath(countryDir), JSON.stringify(state, null, 2) + '\n')
}
