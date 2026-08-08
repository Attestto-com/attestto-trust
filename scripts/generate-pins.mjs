#!/usr/bin/env node
/**
 * Generate trust-pins.json — the expected SHA-256 of every distributed certificate.
 *
 * Run ONLY when deliberately adding or rotating an anchor, and expect the diff to
 * be reviewed. See scripts/verify-pins.mjs for why this file exists.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export function collectPems(root) {
  const out = []
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const e of readdirSync(dir)) {
      const p = join(dir, e)
      if (statSync(p).isDirectory()) walk(p)
      else if (e.endsWith('.pem') && e !== 'chain.pem') out.push(p)
    }
  }
  walk(join(root, 'countries'))
  walk(join(root, 'anchors'))
  return out.sort()
}

export const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

if (import.meta.url === `file://${process.argv[1]}`) {
  const pins = {}
  for (const p of collectPems(root)) pins[relative(root, p)] = sha256(p)
  writeFileSync(
    join(root, 'trust-pins.json'),
    JSON.stringify({ _comment: 'Expected SHA-256 of every distributed certificate. Changes here are trust decisions — see scripts/verify-pins.mjs.', count: Object.keys(pins).length, pins }, null, 2) + '\n'
  )
  console.log(`trust-pins.json: ${Object.keys(pins).length} certificates pinned`)
}
