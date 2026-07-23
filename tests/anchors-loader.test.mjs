import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadGlobalAnchors } from '../site/src/lib/anchors.js'

test('loadGlobalAnchors returns the GLEIF vLEI anchor with merged data', () => {
  const anchors = loadGlobalAnchors()
  const gleif = anchors.find((a) => a.id === 'gleif-vlei')
  assert.ok(gleif, 'gleif-vlei anchor present')
  assert.equal(gleif.model, 'vlei-keri')
  assert.match(gleif.rootAid.aid, /^[A-Za-z0-9_-]{44}$/)
  assert.ok(gleif.qviCount >= 1)
  assert.equal(gleif.qviCount, gleif.qvis.length)
})
