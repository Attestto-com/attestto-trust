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

  // Preserve generatedAt when the artifacts are unchanged; bump it only when
  // content actually changes. Without this, new Date() drifts on every run and
  // the CI drift check can never pass (SOC-90 SEV-1, same fix as country manifests).
  const manifestPath = join(anchorDir, 'manifest.json')
  let generatedAt = new Date().toISOString().slice(0, 10)
  if (existsSync(manifestPath)) {
    try {
      const prev = JSON.parse(readFileSync(manifestPath, 'utf8'))
      if (prev.generatedAt && JSON.stringify(prev.artifacts) === JSON.stringify(artifacts)) {
        generatedAt = prev.generatedAt
      }
    } catch {
      // Unparseable prior manifest: fall through to a fresh timestamp.
    }
  }

  const manifest = { generatedAt, artifacts }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
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
