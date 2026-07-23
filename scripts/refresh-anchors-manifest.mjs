// Regenerate anchors/<id>/manifest.json — SHA-256 of each pinned artifact.
// Tamper-evidence for the global/organizational anchors, mirroring the country
// manifest model. Hashes the exact bytes on disk.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const ARTIFACTS = ['root-aid.json', 'qvis.json']

export function computeAnchorManifest(anchorDir) {
  const artifacts = ARTIFACTS
    .filter((f) => existsSync(join(anchorDir, f)))
    .map((filename) => ({
      filename,
      sha256: createHash('sha256').update(readFileSync(join(anchorDir, filename))).digest('hex'),
    }))
  return { artifacts }
}

export function refreshAnchor(anchorDir) {
  const { artifacts } = computeAnchorManifest(anchorDir)
  // generatedAt is intentionally stable-per-run; callers may override.
  const manifest = { generatedAt: new Date().toISOString().slice(0, 10), artifacts }
  writeFileSync(join(anchorDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  return manifest
}

// CLI: refresh every anchors/<id>/ that has the pinned artifacts.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
  const anchorsDir = join(repoRoot, 'anchors')
  if (!existsSync(anchorsDir)) { console.log('no anchors/ dir'); process.exit(0) }
  for (const id of readdirSync(anchorsDir)) {
    const dir = join(anchorsDir, id)
    if (!statSync(dir).isDirectory()) continue
    if (!existsSync(join(dir, 'root-aid.json'))) continue
    const m = refreshAnchor(dir)
    console.log(`${id}: ${m.artifacts.length} artifacts hashed`)
  }
}
