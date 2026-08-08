import { readdirSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'

export function reconcile({ currentDir, archiveDir, desired }) {
  if (!desired || desired.length === 0) throw new Error('refusing to reconcile against an empty desired set')
  mkdirSync(currentDir, { recursive: true })
  const desiredNames = new Set(desired.map((d) => d.filename))
  const existing = existsSync(currentDir)
    ? readdirSync(currentDir).filter((f) => f.endsWith('.pem') && f !== 'chain.pem')
    : []

  const archived = []
  for (const f of existing) {
    if (!desiredNames.has(f)) {
      mkdirSync(archiveDir, { recursive: true })
      renameSync(join(currentDir, f), join(archiveDir, f))
      archived.push(f)
    }
  }
  const added = [], unchanged = []
  const existingSet = new Set(existing)
  for (const d of desired) {
    writeFileSync(join(currentDir, d.filename), d.pem.endsWith('\n') ? d.pem : d.pem + '\n')
    ;(existingSet.has(d.filename) ? unchanged : added).push(d.filename)
  }
  return { added: added.sort(), archived: archived.sort(), unchanged: unchanged.sort() }
}
