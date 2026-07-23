# TSL XAdES Verification Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify an ETSI TS 119 612 Trusted List's XAdES signature against the EC LOTL chain of trust, so a verified list's granted CA certs can be promoted wholesale (unlocking Italy's ~222 QTSP anchors + the EU LOTL).

**Architecture:** A pure security primitive (`verify-xades.mjs`) splits signature validity from signer authorization. LOTL/TSL metadata parsers feed it. A maintainer orchestrator (`verify-eu-tsl.mjs`) fetches, verifies against pinned EC anchors, filters granted CA services, reconciles `current/` (add/archive), and writes a per-list `VERIFICATION.md`. Promotion stays human-gated (review report + diff).

**Tech Stack:** Node ESM, `xadesjs@2.6.7`, `@xmldom/xmldom`, `@peculiar/x509`, Node `webcrypto`, `node:test`. Spec: `docs/superpowers/specs/2026-07-23-tsl-xades-verification-design.md`.

## Global Constraints

- ESM only (`import`), Node built-in test runner (`node --test tests/*.mjs`). No new runtime deps in the published package — `xadesjs`/`@xmldom/xmldom` are devDependencies (maintainer tooling only, like the monitors).
- `XAdES.Application.setEngine('NodeJS', webcrypto)` and `x509.cryptoProvider.set(webcrypto)` must be set once before verification; `import 'reflect-metadata'` at entry (as `refresh-manifest.mjs`).
- Signer authorization for a national TSL is an EXACT identity match (cert equality, or SKI equality, or SubjectName equality). `allowChain: true` is used ONLY for the pinned-EC-anchor case.
- A list past its `NextUpdate` is stale → not promoted. A verified list with zero granted CA services never wipes `current/`.
- No network in unit tests — use committed fixtures under `tests/fixtures/`.
- Commits: no `Co-Authored-By`; commit with `--no-gpg-sign` (repo signing key is passphrase-protected in this environment).
- Promotion is human-gated: scripts write + report; a human reviews and commits.

---

### Task 1: XAdES signature primitive (`verifyXadesSignature`)

**Files:**
- Create: `scripts/monitors/lib/verify-xades.mjs`
- Create: `tests/fixtures/eu-lotl.signed.xml` (captured live LOTL — small enough? if >1MB, use the IT TSL is 2.8MB; capture the LOTL 476KB)
- Create: `tests/verify-xades.test.mjs`

**Interfaces:**
- Produces: `verifyXadesSignature(xmlString) -> Promise<{ valid: boolean, signerCert: x509.X509Certificate|null, reason: string|null }>` — verifies enveloped XAdES (C14N + digests + signature value) using the cert in the signature's `KeyInfo/X509Data`. Does NOT decide trust.

- [ ] **Step 1: Capture the LOTL fixture**

```bash
curl -fsSL "https://ec.europa.eu/tools/lotl/eu-lotl.xml" -o tests/fixtures/eu-lotl.signed.xml
test -s tests/fixtures/eu-lotl.signed.xml && grep -c "</ds:Signature>" tests/fixtures/eu-lotl.signed.xml
# expect: 1
```

- [ ] **Step 2: Write the failing test**

`tests/verify-xades.test.mjs`:

```javascript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyXadesSignature } from '../scripts/monitors/lib/verify-xades.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOTL = readFileSync(join(__dirname, 'fixtures', 'eu-lotl.signed.xml'), 'utf8')

describe('verifyXadesSignature', () => {
  it('verifies the real EU LOTL signature', async () => {
    const r = await verifyXadesSignature(LOTL)
    assert.equal(r.valid, true, r.reason || '')
    assert.ok(r.signerCert)
    assert.match(r.signerCert.subject, /EUROPEAN COMMISSION/)
  })

  it('rejects a byte-tampered LOTL', async () => {
    // Flip a byte inside a signed element (a service name), not in the signature.
    const tampered = LOTL.replace('EUROPEAN COMMISSION', 'EUROPEAN C0MMISSION')
    const r = await verifyXadesSignature(tampered)
    assert.equal(r.valid, false)
  })

  it('returns a reason (not a throw) on non-signed XML', async () => {
    const r = await verifyXadesSignature('<x/>')
    assert.equal(r.valid, false)
    assert.ok(r.reason)
  })
})
```

- [ ] **Step 3: Run it, expect failure**

Run: `node --test tests/verify-xades.test.mjs`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `verify-xades.mjs` (primitive only)**

```javascript
import 'reflect-metadata'
import { webcrypto } from 'node:crypto'
import { DOMParser } from '@xmldom/xmldom'
import * as XAdES from 'xadesjs'
import * as x509 from '@peculiar/x509'

XAdES.Application.setEngine('NodeJS', webcrypto)
x509.cryptoProvider.set(webcrypto)

const XMLDSIG = 'http://www.w3.org/2000/09/xmldsig#'

export async function verifyXadesSignature(xmlString) {
  let doc, sigEl
  try {
    doc = new DOMParser().parseFromString(xmlString, 'application/xml')
    sigEl = doc.getElementsByTagNameNS(XMLDSIG, 'Signature')[0]
  } catch (e) {
    return { valid: false, signerCert: null, reason: `parse error: ${e.message}` }
  }
  if (!sigEl) return { valid: false, signerCert: null, reason: 'no ds:Signature element' }

  let signerCert = null
  const certEl = doc.getElementsByTagNameNS(XMLDSIG, 'X509Certificate')[0]
  if (certEl) {
    try {
      signerCert = new x509.X509Certificate(Buffer.from(certEl.textContent.replace(/\s+/g, ''), 'base64'))
    } catch { /* signerCert stays null; verification below still runs */ }
  }

  try {
    const signed = new XAdES.SignedXml(doc)
    signed.LoadXml(sigEl)
    const valid = await signed.Verify()
    return { valid, signerCert, reason: valid ? null : 'signature verification failed' }
  } catch (e) {
    return { valid: false, signerCert, reason: `verify error: ${e.message}` }
  }
}
```

- [ ] **Step 5: Run tests, expect pass**

Run: `node --test tests/verify-xades.test.mjs`
Expected: PASS (3/3).

- [ ] **Step 6: Commit**

```bash
git add scripts/monitors/lib/verify-xades.mjs tests/verify-xades.test.mjs tests/fixtures/eu-lotl.signed.xml
git commit --no-gpg-sign -m "feat(tsl): XAdES signature primitive verifyXadesSignature"
```

---

### Task 2: Signer authorization (`authorizeSigner`)

**Files:**
- Modify: `scripts/monitors/lib/verify-xades.mjs` (add `authorizeSigner`)
- Modify: `tests/verify-xades.test.mjs`

**Interfaces:**
- Consumes: `signerCert` (from Task 1), `allowedIdentities: Array<{type:'cert'|'ski'|'subject', value:string}>` (from Task 3).
- Produces: `authorizeSigner(signerCert, allowedIdentities, opts?) -> { authorized: boolean, reason: string|null }`. `opts.allowChain` default `false`. `type:'cert'` value is base64 DER; `ski` is hex lowercase; `subject` is an RFC-ish DN string compared normalized.

- [ ] **Step 1: Write failing tests**

Append to `tests/verify-xades.test.mjs`:

```javascript
import { authorizeSigner } from '../scripts/monitors/lib/verify-xades.mjs'
import * as x509b from '@peculiar/x509'

describe('authorizeSigner', () => {
  // Reuse the LOTL signer cert as the subject under test.
  let signer
  it('setup: extract signer', async () => {
    const r = await verifyXadesSignature(LOTL)
    signer = r.signerCert
    assert.ok(signer)
  })

  it('authorizes on exact cert match', () => {
    const id = { type: 'cert', value: Buffer.from(signer.rawData).toString('base64') }
    assert.equal(authorizeSigner(signer, [id]).authorized, true)
  })

  it('authorizes on SKI match', () => {
    const ext = signer.getExtension('2.5.29.14') // subjectKeyIdentifier
    const ski = ext ? Buffer.from(ext.value).toString('hex') : null
    if (!ski) return // some certs lack SKI; skip
    assert.equal(authorizeSigner(signer, [{ type: 'ski', value: ski }]).authorized, true)
  })

  it('rejects an unrelated identity', () => {
    assert.equal(authorizeSigner(signer, [{ type: 'ski', value: 'deadbeef' }]).authorized, false)
  })

  it('rejects a chaining cert when allowChain is false', () => {
    const issuerOnly = { type: 'subject', value: signer.issuer }
    assert.equal(authorizeSigner(signer, [issuerOnly], { allowChain: false }).authorized, false)
  })
})
```

- [ ] **Step 2: Run, expect fail**

Run: `node --test tests/verify-xades.test.mjs`
Expected: FAIL (`authorizeSigner` not exported).

- [ ] **Step 3: Implement `authorizeSigner`**

Append to `scripts/monitors/lib/verify-xades.mjs`:

```javascript
function normalizeDN(dn) {
  return (dn || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function certSki(cert) {
  const ext = cert.getExtension('2.5.29.14')
  if (!ext) return null
  // strip the OCTET STRING wrapper if present, compare on the raw key id bytes
  const bytes = new Uint8Array(ext.value)
  const body = bytes.length > 2 && bytes[0] === 0x04 ? bytes.slice(2) : bytes
  return Buffer.from(body).toString('hex')
}

export function authorizeSigner(signerCert, allowedIdentities, { allowChain = false } = {}) {
  if (!signerCert) return { authorized: false, reason: 'no signer cert' }
  const signerDer = Buffer.from(signerCert.rawData).toString('base64')
  const signerSubject = normalizeDN(signerCert.subject)
  const signerSkiHex = certSki(signerCert)

  for (const id of allowedIdentities || []) {
    if (id.type === 'cert' && id.value.replace(/\s+/g, '') === signerDer) {
      return { authorized: true, reason: null }
    }
    if (id.type === 'ski' && signerSkiHex && id.value.toLowerCase() === signerSkiHex) {
      return { authorized: true, reason: null }
    }
    if (id.type === 'subject' && normalizeDN(id.value) === signerSubject) {
      return { authorized: true, reason: null }
    }
  }

  if (allowChain) {
    // EC-anchor case only: authorize if the signer chains to a provided cert.
    for (const id of allowedIdentities || []) {
      if (id.type !== 'cert') continue
      try {
        const anchor = new x509.X509Certificate(Buffer.from(id.value.replace(/\s+/g, ''), 'base64'))
        if (normalizeDN(signerCert.issuer) === normalizeDN(anchor.subject)) {
          return { authorized: true, reason: null }
        }
      } catch { /* ignore malformed anchor */ }
    }
  }

  return { authorized: false, reason: 'signer matches no allowed identity' }
}
```

- [ ] **Step 4: Run, expect pass**

Run: `node --test tests/verify-xades.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitors/lib/verify-xades.mjs tests/verify-xades.test.mjs
git commit --no-gpg-sign -m "feat(tsl): exact-identity signer authorization (cert/ski/subject)"
```

---

### Task 3: LOTL signing-identity extraction

**Files:**
- Modify: `scripts/monitors/lib/extract-lotl.mjs`
- Modify: `tests/monitor-lotl.test.mjs`

**Interfaces:**
- Produces: `parseLotlPointers(xml)` entries gain `signingIdentities: Array<{type:'cert'|'ski'|'subject', value:string}>` drawn from each `OtherTSLPointer`'s `ServiceDigitalIdentity`. `cert` = base64 DER (whitespace-stripped), `ski` = hex, `subject` = DN string.

- [ ] **Step 1: Write failing test**

Append to `tests/monitor-lotl.test.mjs`:

```javascript
it('extracts at least one signing identity per pointer', () => {
  const pointers = parseLotlPointers(LOTL)
  for (const p of pointers) {
    assert.ok(Array.isArray(p.signingIdentities), `${p.iso2}: no signingIdentities`)
    assert.ok(p.signingIdentities.length >= 1, `${p.iso2}: empty signingIdentities`)
    for (const id of p.signingIdentities) {
      assert.ok(['cert', 'ski', 'subject'].includes(id.type))
      assert.ok(id.value)
    }
  }
})
```

- [ ] **Step 2: Run, expect fail**

Run: `node --test tests/monitor-lotl.test.mjs`
Expected: FAIL (`signingIdentities` undefined).

- [ ] **Step 3: Implement extraction**

In `scripts/monitors/lib/extract-lotl.mjs`, add a helper and populate the returned objects. The pointer block already isolates one `<OtherTSLPointer>`; read digital identities from it:

```javascript
function parseSigningIdentities(block) {
  const ids = []
  const certRe = /<[^>]*X509Certificate>\s*([A-Za-z0-9+/=\s]+?)\s*<\/[^>]*X509Certificate>/g
  let m
  while ((m = certRe.exec(block))) ids.push({ type: 'cert', value: m[1].replace(/\s+/g, '') })
  const skiRe = /<[^>]*X509SKI>\s*([A-Za-z0-9+/=\s]+?)\s*<\/[^>]*X509SKI>/g
  while ((m = skiRe.exec(block))) ids.push({ type: 'ski', value: Buffer.from(m[1].replace(/\s+/g, ''), 'base64').toString('hex') })
  const subjRe = /<[^>]*X509SubjectName>\s*([\s\S]*?)\s*<\/[^>]*X509SubjectName>/g
  while ((m = subjRe.exec(block))) ids.push({ type: 'subject', value: m[1].trim() })
  return ids
}
```

Then thread `signingIdentities` through: keep the full block per territory (change `byTerritory` to store `{ loc, block }`), and in the final `.map` add `signingIdentities: parseSigningIdentities(block)`.

- [ ] **Step 4: Run, expect pass**

Run: `node --test tests/monitor-lotl.test.mjs`
Expected: PASS (existing pointer tests + new one).

- [ ] **Step 5: Commit**

```bash
git add scripts/monitors/lib/extract-lotl.mjs tests/monitor-lotl.test.mjs
git commit --no-gpg-sign -m "feat(tsl): extract per-country signing identities from LOTL"
```

---

### Task 4: List freshness + granted-status tightening

**Files:**
- Create: `scripts/monitors/lib/tsl-meta.mjs`
- Modify: `scripts/monitors/lib/extract-tsl.mjs` (tighten `isActiveStatus` to a granted allowlist; already drops withdrawn/revoked/ceased)
- Create: `tests/tsl-meta.test.mjs`
- Modify: `tests/monitor-tsl-caonly.test.mjs` (add a granted-vs-withdrawn assertion)

**Interfaces:**
- Produces: `parseNextUpdate(xml) -> Date|null` (reads `<NextUpdate><dateTime>`), `isFresh(xml, now=new Date()) -> boolean`.

- [ ] **Step 1: Write failing test** for `tsl-meta.mjs`

`tests/tsl-meta.test.mjs`:

```javascript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseNextUpdate, isFresh } from '../scripts/monitors/lib/tsl-meta.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOTL = readFileSync(join(__dirname, 'fixtures', 'eu-lotl.signed.xml'), 'utf8')

describe('tsl-meta', () => {
  it('parses a NextUpdate date from the LOTL', () => {
    const d = parseNextUpdate(LOTL)
    assert.ok(d instanceof Date && !Number.isNaN(d.getTime()))
  })
  it('isFresh true before NextUpdate, false after', () => {
    const nu = parseNextUpdate(LOTL)
    assert.equal(isFresh(LOTL, new Date(nu.getTime() - 86400000)), true)
    assert.equal(isFresh(LOTL, new Date(nu.getTime() + 86400000)), false)
  })
})
```

- [ ] **Step 2: Run, expect fail** — `node --test tests/tsl-meta.test.mjs` → FAIL (module missing).

- [ ] **Step 3: Implement `tsl-meta.mjs`**

```javascript
// NextUpdate lives under <SchemeInformation><NextUpdate><dateTime>...</dateTime>.
const NEXT_UPDATE_RE = /<[^>]*NextUpdate>[\s\S]*?<[^>]*dateTime>\s*([^<]+?)\s*<\/[^>]*dateTime>/i

export function parseNextUpdate(xml) {
  const m = xml.match(NEXT_UPDATE_RE)
  if (!m) return null
  const d = new Date(m[1])
  return Number.isNaN(d.getTime()) ? null : d
}

export function isFresh(xml, now = new Date()) {
  const nu = parseNextUpdate(xml)
  if (!nu) return false // no NextUpdate → treat as not-current
  return now.getTime() <= nu.getTime()
}
```

- [ ] **Step 4: Run, expect pass** — `node --test tests/tsl-meta.test.mjs` → PASS.

- [ ] **Step 5: Tighten `extract-tsl.mjs` status to a granted allowlist**

Replace `isActiveStatus` with a positive allowlist (granted + legacy accredited/undersupervision), keeping the deny terms as a backstop:

```javascript
function isActiveStatus(status) {
  if (!status || !status.startsWith('http://uri.etsi.org/')) return false
  if (/withdrawn|revoked|ceased|deregistered|deprecated/i.test(status)) return false
  return /granted|accredited|undersupervision|supervisionincessation|setbynationallaw/i.test(status)
}
```

Add an assertion in `tests/monitor-tsl-caonly.test.mjs` that a withdrawn-status service in the Peru fixture is not among `certs` (find one via the existing `skipped` list) and a granted one is.

- [ ] **Step 6: Run full suite, expect pass** — `npm test` → all green.

- [ ] **Step 7: Commit**

```bash
git add scripts/monitors/lib/tsl-meta.mjs scripts/monitors/lib/extract-tsl.mjs tests/tsl-meta.test.mjs tests/monitor-tsl-caonly.test.mjs
git commit --no-gpg-sign -m "feat(tsl): NextUpdate freshness + granted-status allowlist"
```

---

### Task 5: Reconcile helper (add/archive)

**Files:**
- Create: `scripts/monitors/lib/reconcile-current.mjs`
- Create: `tests/reconcile-current.test.mjs`

**Interfaces:**
- Produces: `reconcile({ currentDir, archiveDir, desired }) -> { added: string[], archived: string[], unchanged: string[] }`. `desired` is `Array<{ filename, pem }>`. Adds/overwrites desired PEMs in `currentDir`; moves any existing `*.pem` (except `chain.pem`) not in `desired` into `archiveDir`. If `desired` is empty, throws (empty-set guard) — caller skips.

- [ ] **Step 1: Write failing test**

```javascript
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
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement `reconcile-current.mjs`**

```javascript
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
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git add scripts/monitors/lib/reconcile-current.mjs tests/reconcile-current.test.mjs
git commit --no-gpg-sign -m "feat(tsl): current/ reconcile with archive-on-removal + empty-set guard"
```

---

### Task 6: Pin EC LOTL trust anchor

**Files:**
- Create: `trust-anchors/eu-lotl/EC-LOTL-signer.pem`
- Create: `trust-anchors/eu-lotl/SOURCE.md`

**Interfaces:** none (data). Consumed by Task 7 as the `allowChain: true` anchor set.

- [ ] **Step 1: Extract the current LOTL signer cert from the captured fixture**

```bash
mkdir -p trust-anchors/eu-lotl
node -e '
import("@peculiar/x509").then(async x509=>{
  const {readFileSync,writeFileSync}=await import("node:fs")
  const xml=readFileSync("tests/fixtures/eu-lotl.signed.xml","utf8")
  const b64=xml.match(/<[^>]*X509Certificate>\s*([A-Za-z0-9+/=\s]+?)\s*<\/[^>]*X509Certificate>/)[1].replace(/\s+/g,"")
  const c=new x509.X509Certificate(Buffer.from(b64,"base64"))
  writeFileSync("trust-anchors/eu-lotl/EC-LOTL-signer.pem", c.toString("pem")+"\n")
  const {createHash}=await import("node:crypto")
  console.log("subject:",c.subject)
  console.log("sha256:",createHash("sha256").update(Buffer.from(c.rawData)).digest("hex"))
})'
```

- [ ] **Step 2: Write `SOURCE.md`** documenting: retrieval URL (`https://ec.europa.eu/tools/lotl/eu-lotl.xml`), retrieval date, the printed subject + SHA-256, and the manual cross-check instruction: *"Confirm this fingerprint against the EC's LOTL signing-certificate publication in the Official Journal (OJEU C-series) before trusting. Refresh when the Commission rotates the LOTL signing certificate (the run fails loudly if this anchor is stale)."*

- [ ] **Step 3: Commit**

```bash
git add trust-anchors/eu-lotl/
git commit --no-gpg-sign -m "chore(tsl): pin EC LOTL signing certificate as trust anchor"
```

---

### Task 7: Orchestrator `verify-eu-tsl.mjs`

**Files:**
- Create: `scripts/monitors/verify-eu-tsl.mjs`
- Create: `tests/verify-eu-tsl.test.mjs` (unit-tests the pure `selectDesiredCerts` helper; the fetch/write flow is run by hand)

**Interfaces:**
- Consumes: `verifyXadesSignature`, `authorizeSigner` (T1/T2), `parseLotlPointers` (T3), `parseNextUpdate`/`isFresh` (T4), `reconcile` (T5), `extractCertsFromTsl` (existing), `refresh-manifest` (existing, invoked via child process or import).
- Produces: CLI. `node scripts/monitors/verify-eu-tsl.mjs [iso2...] [--dry-run]`.

- [ ] **Step 1: Write failing test for the pure selection helper**

```javascript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { selectDesiredCerts } from '../scripts/monitors/verify-eu-tsl.mjs'

describe('selectDesiredCerts', () => {
  it('maps granted CA certs to {filename, pem} with unique slugged names', () => {
    const certs = [
      { subjectCN: 'Actalis EU Qualified Certificates CA G1', pem: '-A-', sha256: 'aa11' },
      { subjectCN: 'Actalis EU Qualified Certificates CA G1', pem: '-B-', sha256: 'bb22' },
    ]
    const out = selectDesiredCerts(certs)
    assert.equal(out.length, 2)
    assert.notEqual(out[0].filename, out[1].filename) // sha-disambiguated
    assert.ok(out.every((o) => o.filename.endsWith('.pem') && o.pem))
  })
})
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement the orchestrator**

Key pure helper (exported for test) + main flow. `selectDesiredCerts` slugifies `subjectCN`, disambiguating duplicates with a short sha256 prefix (mirrors `site/src/lib/trust.js` slug policy):

```javascript
import 'reflect-metadata'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { verifyXadesSignature, authorizeSigner } from './lib/verify-xades.mjs'
import { parseLotlPointers } from './lib/extract-lotl.mjs'
import { isFresh } from './lib/tsl-meta.mjs'
import { extractCertsFromTsl } from './lib/extract-tsl.mjs'
import { reconcile } from './lib/reconcile-current.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LOTL_URL = 'https://ec.europa.eu/tools/lotl/eu-lotl.xml'

function slug(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'cert'
}

export function selectDesiredCerts(certs) {
  const used = new Set(), out = []
  for (const c of certs) {
    let base = slug(c.subjectCN || 'cert'), name = base
    if (used.has(name)) name = `${base}-${(c.sha256 || '').slice(0, 8)}`
    used.add(name)
    out.push({ filename: `${name}.pem`, pem: c.pem })
  }
  return out
}

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const only = args.filter((a) => !a.startsWith('--'))

  const anchorPem = readFileSync(join(root, 'trust-anchors/eu-lotl/EC-LOTL-signer.pem'), 'utf8')
  const ecAnchor = [{ type: 'cert', value: anchorPem.replace(/-----[^-]+-----|\s+/g, '') }]

  const lotlXml = await fetchText(LOTL_URL)
  if (!isFresh(lotlXml)) throw new Error('LOTL is past NextUpdate — refresh or investigate')
  const lotlSig = await verifyXadesSignature(lotlXml)
  if (!lotlSig.valid) throw new Error(`LOTL signature invalid: ${lotlSig.reason}`)
  const lotlAuth = authorizeSigner(lotlSig.signerCert, ecAnchor, { allowChain: true })
  if (!lotlAuth.authorized) throw new Error('LOTL signer not the pinned EC anchor — refresh EC LOTL anchors from OJEU')

  let pointers = parseLotlPointers(lotlXml)
  if (only.length) pointers = pointers.filter((p) => only.includes(p.iso2))

  const summary = []
  for (const p of pointers) {
    try {
      const tslXml = await fetchText(p.tslUrl)
      if (!isFresh(tslXml)) { summary.push(`${p.iso2}: SKIP stale (past NextUpdate)`); continue }
      const sig = await verifyXadesSignature(tslXml)
      if (!sig.valid) { summary.push(`${p.iso2}: SKIP bad signature (${sig.reason})`); continue }
      const auth = authorizeSigner(sig.signerCert, p.signingIdentities, { allowChain: false })
      if (!auth.authorized) { summary.push(`${p.iso2}: SKIP signer not LOTL-declared`); continue }

      const { certs } = extractCertsFromTsl(Buffer.from(tslXml), { caOnly: true })
      const desired = selectDesiredCerts(certs)
      if (desired.length === 0) { summary.push(`${p.iso2}: SKIP zero granted CA certs`); continue }
      if (dryRun) { summary.push(`${p.iso2}: OK (dry-run) ${desired.length} certs`); continue }

      const currentDir = join(root, 'countries', p.iso2, 'current')
      const archiveDir = join(root, 'countries', p.iso2, 'archive', new Date().toISOString().slice(0, 10))
      const r = reconcile({ currentDir, archiveDir, desired })
      execFileSync('node', [join(root, 'scripts/refresh-manifest.mjs'), p.iso2], { cwd: root })
      writeVerificationReport(root, p, sig.signerCert, r, desired.length)
      summary.push(`${p.iso2}: PROMOTED +${r.added.length} -${r.archived.length} =${r.unchanged.length}`)
    } catch (e) {
      summary.push(`${p.iso2}: SKIP error ${e.message}`)
    }
  }
  console.log('\n=== run summary ===\n' + summary.join('\n'))
}

function writeVerificationReport(root, p, signerCert, r, total) {
  const { writeFileSync } = require ? {} : {} // ESM: use import at top instead
}

main().catch((e) => { console.error(e.message); process.exit(1) })
```

Replace the `writeVerificationReport` stub with a real implementation using `writeFileSync` (imported at top): write `countries/<iso2>/VERIFICATION.md` with signer subject + SHA-256, cert count, added/archived/unchanged, and timestamp (pass a fixed timestamp string from `main` since `new Date()` is fine in a maintainer script). Add `writeFileSync` to the `node:fs` import.

- [ ] **Step 4: Run the helper test, expect pass** — `node --test tests/verify-eu-tsl.test.mjs`.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitors/verify-eu-tsl.mjs tests/verify-eu-tsl.test.mjs
git commit --no-gpg-sign -m "feat(tsl): verify-eu-tsl orchestrator (verify -> filter -> reconcile -> report)"
```

---

### Task 8: `generate-exports.mjs` high-volume mode

**Files:**
- Modify: `scripts/generate-exports.mjs`
- Create: `tests/generate-exports.test.mjs`

**Interfaces:**
- Produces: for a country with `> 20` promoted certs, `index.js` exports only `ALL_CERTS` + `export function getBySha256(hex)`; no per-cert named consts. `≤ 20` keeps named consts (current behaviour). `ALL_CERTS` always present.

- [ ] **Step 1: Write failing test** — generate into a temp country dir with 21 fake certs, assert no `export const` per-cert lines but `ALL_CERTS` + `getBySha256` present; and with 2 certs, assert named consts present. (Test drives a small refactor extracting the per-country render into an exported `renderCountryIndex(cc, certs) -> string`.)

```javascript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderCountryIndex } from '../scripts/generate-exports.mjs'

const mk = (n) => Array.from({ length: n }, (_, i) => ({ file: `c${i}.pem`, pem: `-P${i}-`, sha256: `${i}`.padStart(4, '0') }))

describe('renderCountryIndex', () => {
  it('small country keeps named consts', () => {
    const js = renderCountryIndex('es', mk(2))
    assert.match(js, /export const C0/)
    assert.match(js, /ALL_CERTS/)
  })
  it('large country: ALL_CERTS + getBySha256, no per-cert consts', () => {
    const js = renderCountryIndex('it', mk(21))
    assert.doesNotMatch(js, /export const C\d+ =/)
    assert.match(js, /export function getBySha256/)
    assert.match(js, /export const ALL_CERTS/)
  })
})
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Refactor `generate-exports.mjs`** to export `renderCountryIndex(cc, certs)` (certs: `{file, pem, sha256}`) implementing the threshold. `ALL_CERTS` entries include `sha256`. `getBySha256` does a linear find over `ALL_CERTS`. The main loop reads the manifest for `sha256` (it already exists there) and calls the renderer. Update `.d.ts` generation accordingly (large countries: `ALL_CERTS` + `getBySha256` only).

- [ ] **Step 4: Run, expect pass. Then run `node scripts/generate-exports.mjs` and `npm test` — full suite green (existing small countries unchanged).**

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-exports.mjs tests/generate-exports.test.mjs countries/*/index.js countries/*/index.d.ts
git commit --no-gpg-sign -m "feat(exports): ALL_CERTS + getBySha256 for high-volume countries (>20)"
```

---

### Task 9: Promote Italy full QTSP set (first real rollout)

**Files:** (generated) `countries/it/current/*`, `countries/it/VERIFICATION.md`, `countries/it/index.js`, `countries/it/did.json`, site data.

**Interfaces:** none — this is the human-gated rollout run.

- [ ] **Step 1: Dry-run Italy**

Run: `node scripts/monitors/verify-eu-tsl.mjs it --dry-run`
Expected: `it: OK (dry-run) N certs` with N in the low hundreds (~150-222 granted CA certs).

- [ ] **Step 2: Real run for Italy**

Run: `node scripts/monitors/verify-eu-tsl.mjs it`
Expected: `it: PROMOTED +N -2 =0` (the 2 hand-added CIE roots are archived if not in the granted set, or retained if they are — review the diff).

- [ ] **Step 3: Regenerate exports, did:pki, and verify build**

```bash
node scripts/generate-exports.mjs
node scripts/refresh-did-pki.mjs it
node scripts/refresh-revocation.mjs it
cd site && npm run build && cd ..
npm test
```
Expected: build green; tests green (update the Italy count assertion in `tests/trust-store.test.mjs` and the cross-country total).

- [ ] **Step 4: Update `countries/it/meta.json`** to reflect the promoted scope (drop the "phase 1 = CIE only" framing; note the full AgID TSL set is now verified via the LOTL chain), and update the main `README.md` Italy row.

- [ ] **Step 5: Review + commit**

Review `countries/it/VERIFICATION.md` and `git diff --stat`. Then:

```bash
git add -A
git commit --no-gpg-sign -m "it: promote full AgID Trusted List via verified LOTL chain (~N QTSP anchors)"
```

- [ ] **Step 6: Push** (after human confirmation): `git push origin main`.

---

## Self-Review

**Spec coverage:** trust chain (T1/T2/T6/T7), signing identities incl. SKI/subject (T2/T3), granted-status filter (T4), freshness (T4), exact-match auth (T2), reconcile/archive + empty-set guard (T5), VERIFICATION.md + human gate (T7), export-model change (T8), phased rollout starting IT (T9). Scale note honored by per-country runs (T7/T9). All spec sections map to a task.

**Placeholder scan:** one deliberate stub called out for replacement (T7 `writeVerificationReport`) with explicit instructions; no other TBD/vague steps.

**Type consistency:** `signingIdentities: {type,value}` consistent across T2/T3/T7; `desired: {filename,pem}` across T5/T7. Verified: `extractCertsFromTsl` cert objects carry `pem`, `subjectCN`, `sha256`, `role`, `isCA` (`scripts/monitors/lib/extract-certs.mjs:49-60`), which is exactly what `selectDesiredCerts` reads — no adjustment needed.

**Note on `extract-tsl` field names:** `extractCertsFromTsl` returns `{ certs, skipped, error }`; each `cert` is the `extract-certs.mjs` shape above. `selectDesiredCerts` uses `c.subjectCN`, `c.pem`, `c.sha256` accordingly.
