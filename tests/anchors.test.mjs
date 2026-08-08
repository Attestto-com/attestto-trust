import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { computeAnchorManifest } from '../scripts/refresh-anchors-manifest.mjs'

const root = dirname(fileURLToPath(new URL('.', import.meta.url)))
const anchorDir = join(root, 'anchors', 'gleif-vlei')

test('anchor manifest sha256 matches the pinned artifacts on disk', () => {
  const manifest = JSON.parse(readFileSync(join(anchorDir, 'manifest.json'), 'utf-8'))
  const byName = Object.fromEntries(manifest.artifacts.map((a) => [a.filename, a.sha256]))
  for (const filename of ['root-aid.json', 'qvis.json']) {
    const bytes = readFileSync(join(anchorDir, filename))
    const sha = createHash('sha256').update(bytes).digest('hex')
    assert.equal(byName[filename], sha, `manifest sha256 drift for ${filename}`)
  }
})

test('computeAnchorManifest lists both pinned artifacts', () => {
  const m = computeAnchorManifest(anchorDir)
  const names = m.artifacts.map((a) => a.filename).sort()
  assert.deepEqual(names, ['qvis.json', 'root-aid.json'])
})
