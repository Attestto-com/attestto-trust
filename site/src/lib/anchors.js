// Build-time loader for global / organizational trust anchors (anchors/<id>/).
// Separate from the national-PKI loader (trust.js) so a malformed or absent
// anchors/ directory can never break the country pages.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

function findRepoDir(start, marker) {
  let dir = start
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, marker))) return join(dir, marker)
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const anchorsDir = findRepoDir(__dirname, 'anchors')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

export function loadGlobalAnchors() {
  if (!anchorsDir || !existsSync(anchorsDir)) return []
  return readdirSync(anchorsDir)
    .filter((id) => {
      const dir = join(anchorsDir, id)
      return (
        statSync(dir).isDirectory() &&
        existsSync(join(dir, 'meta.json')) &&
        existsSync(join(dir, 'root-aid.json'))
      )
    })
    .map((id) => {
      const dir = join(anchorsDir, id)
      const meta = readJson(join(dir, 'meta.json'))
      const rootAid = readJson(join(dir, 'root-aid.json'))
      const qviDoc = existsSync(join(dir, 'qvis.json')) ? readJson(join(dir, 'qvis.json')) : { qvis: [] }
      let qvis = qviDoc.qvis || []
      // Merge editable link overlay (absent-safe — never throws)
      try {
        const linksPath = join(dir, 'qvi-links.json')
        if (existsSync(linksPath)) {
          const linksDoc = readJson(linksPath)
          const links = linksDoc.links || {}
          qvis = qvis.map((q) => {
            const entry = links[q.lei]
            const url = entry && entry.url ? entry.url : null
            return url ? { ...q, url } : q
          })
        }
      } catch (_) { /* ignore — overlay is best-effort */ }
      return { ...meta, rootAid, qvis, qviCount: qvis.length }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
