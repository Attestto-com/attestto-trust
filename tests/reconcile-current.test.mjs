import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { reconcile } from '../scripts/monitors/lib/reconcile-current.mjs'

describe('reconcile', () => {
  it('adds new, archives removed, keeps unchanged', () => {
    const base = mkdtempSync(join(tmpdir(), 'rec-'))
    const cur = join(base, 'current'); const arc = join(base, 'archive', '2026-07-23')
    mkdirSync(cur, { recursive: true })
    writeFileSync(join(cur, 'keep.pem'), 'K'); writeFileSync(join(cur, 'gone.pem'), 'G')
    const r = reconcile({ currentDir: cur, archiveDir: arc, desired: [
      { filename: 'keep.pem', pem: 'K' }, { filename: 'new.pem', pem: 'N' },
    ] })
    assert.deepEqual(r.added.sort(), ['new.pem'])
    assert.deepEqual(r.archived, ['gone.pem'])
    assert.ok(existsSync(join(cur, 'new.pem')))
    assert.ok(!existsSync(join(cur, 'gone.pem')))
    assert.ok(existsSync(join(arc, 'gone.pem')))
    rmSync(base, { recursive: true, force: true })
  })

  it('throws on empty desired (guard)', () => {
    const base = mkdtempSync(join(tmpdir(), 'rec-'))
    assert.throws(() => reconcile({ currentDir: base, archiveDir: base, desired: [] }))
    rmSync(base, { recursive: true, force: true })
  })
})
