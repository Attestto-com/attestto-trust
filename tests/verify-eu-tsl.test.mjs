import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { selectDesiredCerts } from '../scripts/monitors/verify-eu-tsl.mjs'

describe('selectDesiredCerts', () => {
  it('maps certs to {filename, pem} with slugged subjectCN', () => {
    const certs = [
      { subjectCN: 'Actalis EU Qualified Certificates CA G1', pem: '-A-', sha256: 'aa11bb22' },
    ]
    const out = selectDesiredCerts(certs)
    assert.equal(out.length, 1)
    assert.equal(out[0].filename, 'actalis-eu-qualified-certificates-ca-g1.pem')
    assert.equal(out[0].pem, '-A-')
  })

  it('disambiguates duplicate slugs with short sha256 prefix', () => {
    const certs = [
      { subjectCN: 'Actalis EU Qualified Certificates CA G1', pem: '-A-', sha256: 'aa11bb22cc33' },
      { subjectCN: 'Actalis EU Qualified Certificates CA G1', pem: '-B-', sha256: 'bb22cc33dd44' },
    ]
    const out = selectDesiredCerts(certs)
    assert.equal(out.length, 2)
    assert.notEqual(out[0].filename, out[1].filename)
    assert.ok(out.every((o) => o.filename.endsWith('.pem') && o.pem))
    assert.equal(out[0].filename, 'actalis-eu-qualified-certificates-ca-g1.pem')
    assert.equal(out[1].filename, 'actalis-eu-qualified-certificates-ca-g1-bb22cc33.pem')
  })

  it('handles missing subjectCN gracefully', () => {
    const certs = [
      { subjectCN: '', pem: '-C-', sha256: 'cc00' },
    ]
    const out = selectDesiredCerts(certs)
    assert.equal(out.length, 1)
    assert.equal(out[0].filename, 'cert.pem')
  })

  it('returns empty array for empty input', () => {
    assert.deepEqual(selectDesiredCerts([]), [])
  })
})
