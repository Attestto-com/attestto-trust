#!/usr/bin/env node
/**
 * Verify every distributed certificate against trust-pins.json.
 *
 * WHY THIS EXISTS (SOC-7)
 *
 * `refresh-manifest.mjs` derives manifest.json FROM the .pem files on disk, and CI
 * then checks the regenerated manifest against the committed one. Both sides come
 * from the same commit, so that check proves only internal consistency — never
 * authenticity. Demonstrated 2026-08-07: replacing the BCCR intermediate with a
 * self-signed impostor and regenerating produced a fully green pipeline, including
 * 271 passing tests.
 *
 * WHAT THIS DOES AND DOES NOT GIVE YOU
 *
 * It does NOT make a swap impossible — an author who edits a .pem can edit its pin
 * in the same commit. What it removes is the ability to do it SILENTLY: the swap
 * stops being an auto-derived side effect and becomes an explicit, reviewable line
 * in trust-pins.json.
 *
 * That property only pays off when combined with CODEOWNERS on countries/**,
 * anchors/** and trust-pins.json, plus branch protection requiring review.
 * Without those, this file is theatre. They are one control, not two.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectPems, sha256 } from './generate-pins.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pinFile = join(root, 'trust-pins.json')

if (!existsSync(pinFile)) {
  console.error('::error::trust-pins.json is missing. Certificates are unverifiable.')
  process.exit(1)
}

const { pins } = JSON.parse(readFileSync(pinFile, 'utf8'))
const found = collectPems(root)

// A pin file that pins nothing must not report success.
if (!pins || Object.keys(pins).length === 0) {
  console.error('::error::trust-pins.json contains no pins.')
  process.exit(1)
}
if (found.length === 0) {
  console.error('::error::No certificates found. Expected countries/** and anchors/** to contain .pem files.')
  process.exit(1)
}

let mismatched = 0
let unpinned = 0

for (const p of found) {
  const rel = relative(root, p)
  const expected = pins[rel]
  if (!expected) {
    console.error(`::error file=${rel}::Certificate is not pinned. Add it deliberately via 'node scripts/generate-pins.mjs'.`)
    unpinned++
    continue
  }
  const actual = sha256(p)
  if (actual !== expected) {
    console.error(`::error file=${rel}::PIN MISMATCH — this certificate is not the one that was reviewed.`)
    console.error(`  expected sha256: ${expected}`)
    console.error(`  actual   sha256: ${actual}`)
    mismatched++
  }
}

// A pin with no corresponding file means a certificate was removed without review.
const foundRel = new Set(found.map((p) => relative(root, p)))
const removed = Object.keys(pins).filter((k) => !foundRel.has(k))
for (const r of removed) {
  console.error(`::error file=${r}::Pinned certificate is missing from the distribution.`)
}

console.log(`\nChecked ${found.length} certificates against ${Object.keys(pins).length} pins.`)

if (mismatched || unpinned || removed.length) {
  console.error(`\nFAILED: ${mismatched} mismatched, ${unpinned} unpinned, ${removed.length} removed.`)
  console.error('If this change is intended, run `node scripts/generate-pins.mjs` and have the')
  console.error('trust-pins.json diff reviewed by a CODEOWNER. Do not regenerate to make CI pass.')
  process.exit(1)
}

console.log('PASSED: every distributed certificate matches its reviewed pin.')
