# GLEIF vLEI Anchor — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GLEIF vLEI as a mirrored, hash-pinned, version-controlled global/organizational trust anchor in the directory, displayed on the home page and a `/gleif` detail page — no KERI verification (that is phase 2, ATT-1069).

**Architecture:** A new top-level `anchors/gleif-vlei/` category (sibling to `countries/`) holds five pinned artifacts. A `refresh-anchors-manifest.mjs` script hashes them (tamper-evidence, mirroring the country manifest model). The Astro site gains a `loadGlobalAnchors()` loader, a `GlobalAnchorCard.astro` component, a new home-page section, and a `/gleif` detail page (EN + ES).

**Tech Stack:** Node ≥ 20 (ESM `.mjs` scripts), Astro static site, `node:test`, `node:crypto` (SHA-256), EN/ES i18n via `site/src/lib/i18n.js`, token-driven CSS.

## Global Constraints

- Repo: `/Users/eduardochongkan/Attestto/attestto-trust`. All paths relative to it.
- vLEI is KERI/ACDC, NOT X.509 — pin the AID key-state, never a PEM. The anchor lives under `anchors/`, NOT `countries/`.
- Phase 1 is mirror + display ONLY: no KERI KEL verification, no ACDC chain walking, no `did:keri` resolution (all deferred to ATT-1069).
- Stance (copy verbatim into UI + notes): "Global organizational identity rooted at GLEIF, not a national CA. Attestto mirrors GLEIF's published vLEI root of trust; it does not issue, vouch for, or act as a QVI. Verify against GLEIF as the source of truth."
- Real data only — no invented AIDs/LEIs. All pinned values come from GLEIF's published artifacts and are documented in `SOURCE.md`. If a value cannot be authoritatively sourced, STOP and report (do not fabricate).
- Attestto is spelled with double-t. Do not use the term "self-sovereign".
- Public copy: no em-dashes in prose sentences (em-dashes remain acceptable only as the established label separator inside `meta.json` authority fields, matching the country metas).
- Commits: `git commit --no-gpg-sign`, no `Co-Authored-By`, no Claude footer. `git add` explicit paths only, never `-A` (other agents may be working in this repo).
- Do NOT run `npm run dev`. Verify site changes with `cd site && npm run build`.
- Human-gated: local commits only; do NOT push or deploy.

---

### Task 1: Source and pin the GLEIF root-of-trust artifacts

This is a research + data-capture task (like extracting a chain from a signed PDF). You will fetch real values from GLEIF's published sources, write them into pinned JSON, and document provenance. **If you cannot authoritatively source the GLEIF Root AID, STOP and report — do not invent it.**

**Files:**
- Create: `anchors/gleif-vlei/root-aid.json`
- Create: `anchors/gleif-vlei/qvis.json`
- Create: `anchors/gleif-vlei/SOURCE.md`

**Interfaces:**
- Produces: `anchors/gleif-vlei/root-aid.json` shape `{ name, aid, keyStateDigest, witnesses[], capturedAt }`; `anchors/gleif-vlei/qvis.json` shape `{ generatedAt, source, qvis: [{ name, lei, aid, status }] }`. Later tasks (manifest, loader) read these exact shapes.

**Sources (confirmed to exist as of 2026-07):**
- QVI list: `https://www.gleif.org/en/organizational-identity/get-a-vlei-list-of-qualified-vlei-issuing-organizations` (each QVI's legal name, LEI, and qualification date).
- Root of trust AIDs: the `WebOfTrust/vLEI` GitHub repo (open vLEI specifications) and the GLEIF vLEI Ecosystem Governance Framework documents linked from `https://www.gleif.org/en/vlei/introducing-the-vlei-ecosystem-governance-framework/`. Use `gh api`/`gh repo view` or `WebFetch` to locate the production GLEIF Root / GEDA (GLEIF External Delegated AID) prefix and its key-state. QVI AID prefixes, where published alongside the QVI list, should be captured; where a QVI's AID is not published, set its `aid` to `null` (the LEI is the stable identifier).

- [ ] **Step 1: Locate the GLEIF Root AID + key state**

Use `gh api repos/WebOfTrust/vLEI/git/trees/main?recursive=1` (and `gh api -H "Accept: application/vnd.github.raw" repos/WebOfTrust/vLEI/contents/<path>`) and/or `WebFetch` on the EGF pages to find the production GLEIF Root/GEDA AID prefix (a 44-character CESR string) and its current key-state SAID. Record the exact source URL(s) and commit/tag you read.

Expected: you can state the GLEIF Root AID prefix and the source it came from. If not, STOP and report `BLOCKED: could not authoritatively source GLEIF Root AID`.

- [ ] **Step 2: Write `anchors/gleif-vlei/root-aid.json`**

```json
{
  "name": "GLEIF Root of Trust (vLEI)",
  "aid": "<44-char GLEIF Root/GEDA AID prefix, captured in Step 1>",
  "keyStateDigest": "<SAID of the current key-state / latest KEL event, or null if not published>",
  "witnesses": ["<witness AID or OOBI URL the state was captured from, if published>"],
  "capturedAt": "2026-07-23"
}
```
Use the real captured values. `witnesses` may be an empty array if none are published; `keyStateDigest` may be `null` if the KEL digest is not published — but `aid` MUST be a real value.

- [ ] **Step 3: Write `anchors/gleif-vlei/qvis.json`**

Capture the authorized QVI organizations from the GLEIF QVI list page. Example shape (fill with the real, complete list):
```json
{
  "generatedAt": "2026-07-23",
  "source": "https://www.gleif.org/en/organizational-identity/get-a-vlei-list-of-qualified-vlei-issuing-organizations",
  "qvis": [
    { "name": "<QVI legal name>", "lei": "<20-char LEI>", "aid": "<QVI AID prefix or null>", "status": "authorized" }
  ]
}
```

- [ ] **Step 4: Write `anchors/gleif-vlei/SOURCE.md`**

Mirror `trust-anchors/eu-lotl/SOURCE.md`: for each artifact, the exact source URL (and GitHub repo + commit/tag for the Root AID), the capture date (2026-07-23), and a "How to re-verify" section telling a third party how to confirm the pinned Root AID and QVI list against GLEIF directly. State plainly that this is a mirror, not an issuance, and that GLEIF is the source of truth.

- [ ] **Step 5: Validate the captured JSON**

Run:
```bash
node -e "const r=require('./anchors/gleif-vlei/root-aid.json'); const q=require('./anchors/gleif-vlei/qvis.json'); if(!/^[A-Za-z0-9_-]{44}$/.test(r.aid)) throw new Error('root aid not a 44-char CESR prefix: '+r.aid); if(!Array.isArray(q.qvis)||q.qvis.length<1) throw new Error('qvis empty'); for(const v of q.qvis){ if(!/^[A-Z0-9]{18}[0-9]{2}$/.test(v.lei)) throw new Error('bad LEI: '+v.lei); } console.log('OK: root aid '+r.aid+', '+q.qvis.length+' QVIs');"
```
Expected: `OK: root aid <prefix>, N QVIs`. If the Root AID is not 44 chars or any LEI is malformed, fix the captured data (or STOP if unsourceable).

- [ ] **Step 6: Commit**

```bash
git add anchors/gleif-vlei/root-aid.json anchors/gleif-vlei/qvis.json anchors/gleif-vlei/SOURCE.md
git commit --no-gpg-sign -m "gleif-vlei: pin GLEIF root of trust + QVI list (ATT-1068)"
```

---

### Task 2: Anchor manifest + hash-integrity script

**Files:**
- Create: `scripts/refresh-anchors-manifest.mjs`
- Create: `anchors/gleif-vlei/manifest.json` (generated by the script)
- Create: `tests/anchors.test.mjs`

**Interfaces:**
- Consumes: `anchors/gleif-vlei/{root-aid.json,qvis.json}` from Task 1.
- Produces: `anchors/gleif-vlei/manifest.json` shape `{ generatedAt, artifacts: [{ filename, sha256 }] }`; and a reusable `computeAnchorManifest(anchorDir)` export used by the test.

- [ ] **Step 1: Write the failing test**

Create `tests/anchors.test.mjs`:
```js
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/anchors.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/refresh-anchors-manifest.mjs'`.

- [ ] **Step 3: Implement `scripts/refresh-anchors-manifest.mjs`**

```js
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
```

- [ ] **Step 4: Generate the manifest and run the test**

Run:
```bash
node scripts/refresh-anchors-manifest.mjs
node --test tests/anchors.test.mjs
```
Expected: script prints `gleif-vlei: 2 artifacts hashed`; both tests PASS.

- [ ] **Step 5: Write `anchors/gleif-vlei/meta.json`**

```json
{
  "id": "gleif-vlei",
  "name": "GLEIF vLEI",
  "kind": "global-anchor",
  "model": "vlei-keri",
  "authority": {
    "name": "GLEIF — Global Legal Entity Identifier Foundation",
    "url": "https://www.gleif.org/"
  },
  "governingLaw": "GLEIF vLEI Ecosystem Governance Framework",
  "identifierSpace": ["did:keri", "did:webs"],
  "technology": {
    "keyModel": "KERI (self-certifying AIDs, KEL-anchored)",
    "credentialFormat": "ACDC",
    "chain": "GLEIF Root AID -> GEDA -> QVI -> Legal Entity"
  },
  "capabilities": ["Organizational identity (LEI)", "Legal-entity vLEI", "OOR / ECR role credentials"],
  "relatedLinks": [
    { "label": "GLEIF vLEI — introducing the ecosystem", "url": "https://www.gleif.org/en/vlei/introducing-the-vlei-ecosystem-governance-framework/" },
    { "label": "GLEIF — Qualified vLEI Issuers", "url": "https://www.gleif.org/en/organizational-identity/get-a-vlei-list-of-qualified-vlei-issuing-organizations" }
  ],
  "notes": "Global organizational identity rooted at GLEIF, not a national CA. Attestto mirrors GLEIF's published vLEI root of trust (Root AID key state and the authorized QVI list), hash-pinned and version-controlled; it does not issue, vouch for, or act as a QVI. Verify against GLEIF as the source of truth. vLEI is KERI/ACDC, not X.509, so it is pinned as an AID key-state rather than a CA certificate. Cryptographic verification of presented vLEI credentials is a separate phase (ATT-1069)."
}
```

- [ ] **Step 6: Commit**

```bash
git add scripts/refresh-anchors-manifest.mjs anchors/gleif-vlei/manifest.json anchors/gleif-vlei/meta.json tests/anchors.test.mjs
git commit --no-gpg-sign -m "gleif-vlei: anchor manifest + hash-integrity script + meta (ATT-1068)"
```

---

### Task 3: Site loader `loadGlobalAnchors()`

**Files:**
- Create: `site/src/lib/anchors.js`
- Test: `tests/anchors-loader.test.mjs`

**Interfaces:**
- Consumes: `anchors/gleif-vlei/{meta.json,root-aid.json,qvis.json}`.
- Produces: `loadGlobalAnchors()` returning an array of `{ id, name, kind, model, authority, governingLaw, identifierSpace, technology, capabilities, relatedLinks, notes, rootAid: {aid, keyStateDigest, witnesses, capturedAt}, qvis: [{name,lei,aid,status}], qviCount }`.

- [ ] **Step 1: Write the failing test**

Create `tests/anchors-loader.test.mjs`:
```js
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/anchors-loader.test.mjs`
Expected: FAIL — `Cannot find module '../site/src/lib/anchors.js'`.

- [ ] **Step 3: Implement `site/src/lib/anchors.js`**

```js
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
      const qvis = qviDoc.qvis || []
      return { ...meta, rootAid, qvis, qviCount: qvis.length }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/anchors-loader.test.mjs`
Expected: PASS (both assertions).

- [ ] **Step 5: Commit**

```bash
git add site/src/lib/anchors.js tests/anchors-loader.test.mjs
git commit --no-gpg-sign -m "gleif-vlei: site loader for global anchors (ATT-1068)"
```

---

### Task 4: `GlobalAnchorCard.astro` + home-page section + i18n

**Files:**
- Create: `site/src/components/GlobalAnchorCard.astro`
- Modify: `site/src/pages/index.astro` (add a section after `#countries`)
- Modify: `site/src/pages/es/index.astro` (same, Spanish)
- Modify: `site/src/lib/i18n.js` (add keys)

**Interfaces:**
- Consumes: `loadGlobalAnchors()` from Task 3; i18n keys added here.

- [ ] **Step 1: Add i18n keys**

In `site/src/lib/i18n.js`, add these keys to BOTH the `en` and `es` translation objects (English values shown; use the Spanish equivalents for `es`, with no em-dashes in the prose):
```js
// EN
homeGlobalH2: 'Global / Organizational identity',
globalAnchorTag: 'Global root',
globalAnchorRootAid: 'Root AID',
globalAnchorQvis: 'Qualified issuers',
globalAnchorFraming: 'Not a national CA. Organizational identity (vLEI / LEI) that we mirror; verify against GLEIF as the source of truth.',
globalAnchorView: 'View anchor',
globalAnchorSource: 'GLEIF root of trust',
```
```js
// ES
homeGlobalH2: 'Identidad global / organizacional',
globalAnchorTag: 'Raíz global',
globalAnchorRootAid: 'AID raíz',
globalAnchorQvis: 'Emisores cualificados',
globalAnchorFraming: 'No es una CA nacional. Identidad organizacional (vLEI / LEI) que reflejamos; verifique con GLEIF como fuente de verdad.',
globalAnchorView: 'Ver ancla',
globalAnchorSource: 'Raíz de confianza de GLEIF',
```

- [ ] **Step 2: Create `site/src/components/GlobalAnchorCard.astro`**

```astro
---
const { anchor, lang, base, t } = Astro.props;
const shortAid = anchor.rootAid.aid.length > 16
  ? `${anchor.rootAid.aid.slice(0, 8)}…${anchor.rootAid.aid.slice(-4)}`
  : anchor.rootAid.aid;
const detailHref = `${base}${lang === 'es' ? '/es' : ''}/gleif`;
const sourceLink = (anchor.relatedLinks || []).find((l) => /gleif\.org/.test(l.url));
---
<article class="ga-card">
  <header class="ga-card__head">
    <span class="ga-card__glyph" aria-hidden="true">🌐</span>
    <h3 class="ga-card__title">{anchor.name}</h3>
    <span class="ga-card__tag">{t.globalAnchorTag}</span>
  </header>
  <dl class="ga-card__facts">
    <div><dt>{t.globalAnchorRootAid}</dt><dd><code>{shortAid}</code></dd></div>
    <div><dt>{t.globalAnchorQvis}</dt><dd>{anchor.qviCount}</dd></div>
    <div><dt>KERI / ACDC</dt><dd>{anchor.identifierSpace?.join(' · ')}</dd></div>
  </dl>
  <p class="ga-card__framing">{t.globalAnchorFraming}</p>
  <div class="ga-card__actions">
    <a class="btn" href={detailHref}>{t.globalAnchorView}</a>
    {sourceLink && (
      <a class="btn btn--ghost" href={sourceLink.url} rel="noopener noreferrer" target="_blank"
         title={`${t.globalAnchorSource} (opens in a new tab)`}>{t.globalAnchorSource} ↗</a>
    )}
  </div>
</article>

<style>
  .ga-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-5); max-width: 46rem; }
  .ga-card__head { display: flex; align-items: center; gap: var(--space-3); }
  .ga-card__glyph { font-size: 1.75rem; line-height: 1; }
  .ga-card__title { margin: 0; }
  .ga-card__tag { margin-left: auto; font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; padding: 2px 10px; border-radius: 999px; background: var(--color-highlight-soft); color: var(--color-highlight); }
  .ga-card__facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: var(--space-3); margin: var(--space-4) 0; }
  .ga-card__facts dt { font-size: var(--text-xs); color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 0.03em; }
  .ga-card__facts dd { margin: 2px 0 0; font-weight: 600; font-size: var(--text-sm); }
  .ga-card__framing { color: var(--color-text-muted); font-size: var(--text-sm); line-height: 1.5; margin: 0 0 var(--space-4); }
  .ga-card__actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }
  .btn--ghost { background: transparent; }
</style>
```

- [ ] **Step 3: Add the section to `site/src/pages/index.astro`**

Add the import at the top (with the other imports):
```js
import GlobalAnchorCard from '../components/GlobalAnchorCard.astro';
import { loadGlobalAnchors } from '../lib/anchors.js';
```
Add after `const countries = loadAllCountries();`:
```js
const anchors = loadGlobalAnchors();
```
Insert this section immediately AFTER the closing `</section>` of the `#countries` section and BEFORE the `#developers` section:
```astro
  {anchors.length > 0 && (
    <section id="global" aria-labelledby="global-h">
      <h2 id="global-h">{t.homeGlobalH2}</h2>
      {anchors.map((anchor) => <GlobalAnchorCard anchor={anchor} lang={lang} base={base} t={t} />)}
    </section>
  )}
```

- [ ] **Step 4: Mirror the section in `site/src/pages/es/index.astro`**

Apply the SAME three edits to the Spanish home page (import, `const anchors = loadGlobalAnchors();`, and the section block), placing the section in the same position relative to its `#countries` and `#developers` sections. The `lang` there is `'es'`.

- [ ] **Step 5: Build to verify**

Run: `cd site && npm run build`
Expected: build succeeds; grep the output confirms the card rendered:
```bash
grep -l "Global / Organizational" dist/index.html && grep -l "Identidad global" dist/es/index.html
```
Expected: both files listed.

- [ ] **Step 6: Commit**

```bash
cd /Users/eduardochongkan/Attestto/attestto-trust
git add site/src/components/GlobalAnchorCard.astro site/src/pages/index.astro site/src/pages/es/index.astro site/src/lib/i18n.js
git commit --no-gpg-sign -m "gleif-vlei: home-page global anchor card + i18n (ATT-1068)"
```

---

### Task 5: `/gleif` detail page (EN + ES)

**Files:**
- Create: `site/src/pages/gleif.astro`
- Create: `site/src/pages/es/gleif.astro`

**Interfaces:**
- Consumes: `loadGlobalAnchors()`; the `BaseLayout` and i18n already used by country pages.

- [ ] **Step 1: Create `site/src/pages/gleif.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { loadGlobalAnchors } from '../lib/anchors.js';
import { TRANSLATIONS } from '../lib/i18n.js';

const lang = 'en';
const t = TRANSLATIONS[lang];
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const anchor = loadGlobalAnchors().find((a) => a.id === 'gleif-vlei');
---
<BaseLayout title={`${anchor.name} — ${t.homeGlobalH2}`} description={anchor.notes}>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li><a href={`${base}/`}>{t.countryNavHome}</a></li>
      <li aria-current="page">{anchor.name}</li>
    </ol>
  </nav>
  <header class="anchor-head">
    <span aria-hidden="true" style="font-size:2.5rem">🌐</span>
    <div>
      <h1>{anchor.name}</h1>
      <p class="anchor-head__authority">{t.countryPublishedBy} <a href={anchor.authority.url} rel="noopener noreferrer" target="_blank">{anchor.authority.name}</a></p>
    </div>
  </header>

  <section class="pki-about" aria-label="About this anchor">
    <dl class="pki-about__grid">
      <div><dt>{t.globalAnchorRootAid}</dt><dd><code>{anchor.rootAid.aid}</code></dd></div>
      {anchor.rootAid.keyStateDigest && <div><dt>Key state</dt><dd><code>{anchor.rootAid.keyStateDigest}</code></dd></div>}
      <div><dt>{t.globalAnchorQvis}</dt><dd>{anchor.qviCount}</dd></div>
      <div><dt>Model</dt><dd>{anchor.technology.keyModel}</dd></div>
      <div><dt>Credential</dt><dd>{anchor.technology.credentialFormat}</dd></div>
      <div><dt>Chain</dt><dd>{anchor.technology.chain}</dd></div>
    </dl>
    <p class="pki-about__notes">{anchor.notes}</p>
    <ul class="pki-about__links">
      {anchor.relatedLinks.map((l) => <li><a href={l.url} rel="noopener noreferrer" target="_blank">{l.label} ↗</a></li>)}
    </ul>
  </section>

  <section aria-label="Qualified vLEI Issuers">
    <h2>{t.globalAnchorQvis} ({anchor.qviCount})</h2>
    <table class="qvi-table">
      <thead><tr><th>Name</th><th>LEI</th><th>AID</th><th>Status</th></tr></thead>
      <tbody>
        {anchor.qvis.map((q) => (
          <tr><td>{q.name}</td><td><code>{q.lei}</code></td><td>{q.aid ? <code>{q.aid}</code> : '—'}</td><td>{q.status}</td></tr>
        ))}
      </tbody>
    </table>
  </section>
</BaseLayout>

<style>
  .anchor-head { display: flex; gap: var(--space-4); align-items: center; margin-bottom: var(--space-6); padding-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); }
  .anchor-head h1 { margin: 0; }
  .anchor-head__authority { margin: var(--space-1) 0 0; color: var(--color-text-muted); font-size: var(--text-sm); }
  .qvi-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
  .qvi-table th, .qvi-table td { text-align: left; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); }
  .qvi-table code { font-size: var(--text-xs); word-break: break-all; }
</style>
```

- [ ] **Step 2: Create `site/src/pages/es/gleif.astro`**

Same as Step 1 but `const lang = 'es'`, `base` unchanged (the `/es` prefix is in the file location), breadcrumb home `href={`${base}/es/`}`, and the two hardcoded table/section English labels ("Key state", "Model", "Credential", "Chain", "About this anchor", "Name", "LEI", "AID", "Status", "Qualified vLEI Issuers") translated to Spanish ("Estado de clave", "Modelo", "Credencial", "Cadena", "Acerca de esta ancla", "Nombre", "LEI", "AID", "Estado", "Emisores vLEI cualificados"). All GLEIF proper nouns and the AID/LEI values stay as-is.

- [ ] **Step 3: Build to verify**

Run: `cd site && npm run build`
Expected: build succeeds and both pages exist:
```bash
test -f dist/gleif/index.html && test -f dist/es/gleif/index.html && echo "both pages built"
```
Expected: `both pages built`.

- [ ] **Step 4: Commit**

```bash
cd /Users/eduardochongkan/Attestto/attestto-trust
git add site/src/pages/gleif.astro site/src/pages/es/gleif.astro
git commit --no-gpg-sign -m "gleif-vlei: /gleif detail page EN+ES (ATT-1068)"
```

---

### Task 6: README docs + CI hash-integrity for anchors

**Files:**
- Modify: `README.md` (document the `anchors/` category)
- Modify: `.github/workflows/verify.yml` (extend the manifest-drift check to `anchors/`)

**Interfaces:**
- Consumes: `scripts/refresh-anchors-manifest.mjs` from Task 2.

- [ ] **Step 1: Document `anchors/` in `README.md`**

After the "Countries" table section, add a short subsection:
```markdown
## Global / organizational anchors

Beyond national PKI, the directory mirrors global organizational-identity roots under `anchors/`.
The first is **GLEIF vLEI** (`anchors/gleif-vlei/`) — the GLEIF root of trust and its authorized
Qualified vLEI Issuers, hash-pinned and version-controlled. vLEI is KERI/ACDC (not X.509), so it is
pinned as an AID key-state rather than a CA certificate. We mirror what GLEIF publishes and do not
issue or vouch for any credential. See [trust.attestto.org/gleif](https://trust.attestto.org/gleif).
```

- [ ] **Step 2: Extend the CI hash-integrity check**

In `.github/workflows/verify.yml`, after the existing "Regenerate manifest" / "Fail if manifest drifted" steps, add two steps:
```yaml
      - name: Regenerate anchor manifests
        run: node scripts/refresh-anchors-manifest.mjs
      - name: Fail if anchor manifest drifted
        run: |
          if ! git diff --quiet -- 'anchors/*/manifest.json'; then
            echo "::error::An anchors/*/manifest.json is out of date — run 'node scripts/refresh-anchors-manifest.mjs' and commit"
            git diff -- 'anchors/*/manifest.json'
            exit 1
          fi
```

- [ ] **Step 3: Verify the drift check is clean locally**

Run:
```bash
node scripts/refresh-anchors-manifest.mjs
git diff --quiet -- 'anchors/*/manifest.json' && echo "no drift" || echo "DRIFT"
```
Expected: `no drift` (the manifest committed in Task 2 already matches).

- [ ] **Step 4: Run the full anchor test suite**

Run: `node --test tests/anchors.test.mjs tests/anchors-loader.test.mjs`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md .github/workflows/verify.yml
git commit --no-gpg-sign -m "gleif-vlei: document anchors/ category + CI hash-integrity (ATT-1068)"
```

---

## Notes for the executor

- Task 1 is the only non-mechanical task: it requires real GLEIF data. Do it carefully, cite every source in `SOURCE.md`, and STOP if the Root AID cannot be authoritatively sourced rather than inventing one.
- The `generatedAt`/`capturedAt` dates are `2026-07-23`.
- After all tasks: run `node --test tests/anchors.test.mjs tests/anchors-loader.test.mjs` and `cd site && npm run build` once more; confirm `/gleif` + `/es/gleif` render and the home page shows the Global / Organizational identity card. Local commits only — human-gated, do NOT push or deploy.
