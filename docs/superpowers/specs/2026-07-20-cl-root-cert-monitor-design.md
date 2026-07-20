# Chile root-cert monitor — design spec

**Date:** 2026-07-20
**Status:** approved, pending implementation plan
**Repo:** `attestto-trust`

## Problem

`entidadacreditadora.gob.cl/certificados-raiz/` publishes root/intermediate certificate
bundles for ~13 Chilean accredited certification authorities (E-CertChile, Acepta.com,
E-Sign, CertiNet, E-Partners, TOC, IDok, Thomas Signe, Abancert, firmaDOX, e-Digital,
Microsystem, Certificadora del Sur, Trust Service Provider SpA), as ~23 links —
mostly `.zip`, two `.rar` — with no feed, no versioning, no notification when a CA
rotates a cert. `attestto-trust` needs a `countries/cl/` mirror matching the existing
`cr`/`ar`/`br` convention (hash-pinned `current/`, `archive/<year>/`, `manifest.json`,
`chain.pem`, JS/TS exports), but nobody is going to remember to check this page by hand.

## Non-goals

- Not building a general-purpose LatAm PKI scraper. This spec covers Chile only. The
  architecture is deliberately split so Peru/Uruguay/etc. can be added later as thin
  adapters, but their adapters are out of scope here.
- Not automating the *review* of a new/rotated cert — only automating detection,
  download, and extraction. A human always decides what enters `current/`.
- Not handling `.rar` extraction (no `unrar`/`unar`/`7z` available locally). `.rar`
  sources are tracked and flagged, never auto-extracted.

## Architecture

Five-stage pipeline. Stages 1–2 are Chile-specific; stages 3–5 are shared and reusable
by future country adapters.

```
1. FETCH      entidadacreditadora.gob.cl page (HTTPS only)
                 │
2. DIFF        compare against countries/cl/.source-state.json
              (per-URL: sha256, content-length, last-modified/etag, org)
                 │  (only new/changed links continue)
                 ▼
3. DOWNLOAD    countries/cl/raw/<filename>          (as-published bytes, kept forever)
   + EXTRACT   unzip → walk entries → parse each as X.509/PKCS7 via node-forge
                 │
4. VALIDATE    does it parse as a well-formed cert with plausible validity dates?
   + STAGE     countries/cl/staging/<run-date>/<ORG> - <CN>.pem  + summary.json
              (never writes to current/)
                 │
5. BOOKKEEP    write countries/cl/.source-state.json, countries/cl/.monitor.log
   + COMMIT    git commit state/log/raw/staging files only (never current/, never push)
```

Promotion (staging → `current/`) is **manual** and reuses the flow already documented
in the repo's top-level README ("Updating an existing country" / "Adding a country"):
review `staging/<date>/summary.json`, cross-check fingerprints against each CA's own
site, move accepted PEMs into `current/` (archiving superseded ones first), run
`scripts/refresh-manifest.mjs cl` and `scripts/generate-exports.mjs`, commit, push.
No new tooling is built for promotion — it's the same manual process every other
country already follows.

### Repo layout

```
attestto-trust/
├── scripts/
│   ├── extract-chain-from-pdf.mjs        (existing, untouched)
│   ├── generate-exports.mjs              (existing, untouched)
│   ├── refresh-manifest.mjs              (existing, untouched)
│   └── monitors/                         NEW
│       ├── lib/
│       │   ├── sync-country.mjs          shared stages 3–5
│       │   ├── extract-certs.mjs         unzip + node-forge parse helper
│       │   └── state.mjs                 read/write .source-state.json
│       ├── sources/
│       │   └── cl.mjs                    Chile adapter: fetch, parse headings→links, diff
│       ├── run.mjs                       entrypoint: `node run.mjs cl`
│       └── run-monitor.sh                cron wrapper (PATH, cd, logging)
│
├── countries/
│   └── cl/                               NEW, created on first run
│       ├── current/                      empty until first manual promotion
│       ├── archive/<year>/
│       ├── raw/                          as-published zip/rar originals
│       ├── staging/<run-date>/           candidate PEMs awaiting review
│       ├── .source-state.json
│       ├── .monitor.log
│       └── README.md
│
└── package.json                          gets a new "./cl" exports entry (post-first-promotion)
```

## Stage detail

### 1. Fetch
- GET the page over HTTPS. If the URL on file is `http://`, upgrade before requesting;
  if HTTPS fails, log a **critical** line and abort the run (no plaintext fallback for
  a trust-anchor source).
- Record the page's own TLS leaf cert fingerprint (SHA-256) in `.source-state.json`
  each run — a change here (MITM, cert reissue, domain compromise) is itself a signal
  worth surfacing, even though it's not a hard failure.

### 2. Discovery & diff
- Split the HTML by `<h1>`–`<h4>` headings to bind each link to its CA org name.
- Collect links matching `.zip/.rar/.cer/.crt/.pem/.der/.p7b`.
- `.rar` links: recorded in state, download skipped, extraction skipped. Every run
  re-prints a **persistent "known gaps" block** at the top of stdout/log listing which
  CAs' roots are missing from the trust set because of this (currently: the 2010
  E-cert `.rar` and Paperless `.rar`) — not a one-time log line, so it can't quietly
  age out of visibility.
- For each remaining URL: HEAD request first; if `Content-Length`/`Last-Modified`/`ETag`
  match the stored state, skip. Otherwise download and compare sha256. New URL or
  changed hash → "changed," continue to stage 3.

### 3. Download & extract
- Save the raw bundle unmodified to `countries/cl/raw/<filename>`.
- Unzip to a temp dir, walk all entries recursively.
- For each entry, attempt to parse as an X.509 cert (DER or PEM, via `node-forge`) or
  as a PKCS7 bundle (`.p7b`/`.p7c` → extract member certs). Non-cert entries (readmes,
  Word docs, images) are skipped silently.

### 4. Validate & stage
- A parsed cert must have well-formed subject/issuer and validity dates within a sane
  range to be staged; anything that fails to parse is discarded and logged. (This is
  an **integrity check**, not a trust decision — it filters garbage, not malice.)
- Staged filename: `<ORG> - <Subject CN>.pem`, written to
  `countries/cl/staging/<run-date>/`. Dedup by sha256 within an org's accumulated
  cert set across all its known bundle URLs (a CA's older and newer zips both stay
  "active" sources per the site; union their certs).
- `countries/cl/staging/<run-date>/summary.json` lists every staged cert with:
  org, filename, subject, issuer, serialNumber, sha256, validFrom/To, source URL,
  and a `crossCheckReminder` string pointing at where to verify the fingerprint
  independently (the CA's own site) before promoting.
- If a staged cert's `<ORG> - <CN>` name matches an existing file already in
  `current/` but with a different sha256, the summary flags it explicitly as
  **"rotation candidate"** (vs. **"new"**) so the human reviewer knows to archive the
  old one on promotion rather than just adding a duplicate name.

### 5. Bookkeeping & commit
- Write/update `.source-state.json` and append to `.monitor.log`.
- `git add countries/cl/.source-state.json countries/cl/.monitor.log countries/cl/raw countries/cl/staging && git commit` with a message summarizing what was staged this
  run (e.g. `cl: monitor run 2026-07-20 — staged 2 new certs (Acepta.com), 1 rotation candidate (E-Sign)`).
- **Never** touches or commits `countries/cl/current/`, `package.json`, `index.js`, or
  the manifest/export files — those only change via the manual promotion flow.
- Never pushes.

## State file schema (`countries/cl/.source-state.json`)

```json
{
  "pageUrl": "https://www.entidadacreditadora.gob.cl/certificados-raiz/",
  "pageTlsFingerprintSha256": "...",
  "lastRun": "2026-07-20T09:00:00.000Z",
  "sources": {
    "https://www.entidadacreditadora.gob.cl/wp-content/uploads/2025/06/E-SIGN-S.A.zip": {
      "org": "E-Sign",
      "filename": "E-SIGN-S.A.zip",
      "sha256": "...",
      "contentLength": 12345,
      "lastModifiedHeader": "...",
      "etag": null,
      "firstSeen": "2026-07-20T09:00:00.000Z",
      "lastChanged": "2026-07-20T09:00:00.000Z",
      "extension": "zip"
    }
  },
  "knownGaps": [
    { "org": "E-Cert", "url": ".../Certificado-Raiz-E-cert.rar", "reason": "rar-unsupported" },
    { "org": "Paperless", "url": ".../Paperless-Certificados-Raiz.rar", "reason": "rar-unsupported" }
  ]
}
```

## Cron

- `scripts/monitors/run-monitor.sh` sets a full `PATH` (cron's environment is minimal),
  `cd`s into the repo, runs `node scripts/monitors/run.mjs cl`, redirects output to
  `countries/cl/.monitor.log` (append), and exits non-zero on hard failures so cron's
  mail-on-error (if configured) fires.
- The crontab line is handed to the user to add themselves via `crontab -e`; this
  script does not modify the system crontab.

## Error handling

- Page unreachable / non-200: log, exit non-zero, no state changes.
- HTTPS unavailable for the page itself: log critical, exit non-zero, no state changes.
- Individual bundle download fails: log warning for that URL only, continue with the
  rest of the run (site is known to be flaky — don't let one dead link abort everything).
- Zip that fails to open / is corrupt: log warning, skip extraction for that bundle,
  keep the raw download.
- No certs found in an otherwise-successful zip: log warning (likely a format we don't
  handle yet, e.g. a nested archive or a non-standard container) — surfaced in the
  known-gaps-style summary so it doesn't silently vanish.

## Future countries (out of scope here, noted for the adapter split)

Priority order established during design: Peru (`sources/pe.mjs` — INDECOPI publishes
a structured TSL, PDF/XML, likely cleaner than HTML scraping) → Uruguay
(`sources/uy.mjs` — single national root via AGESIC/ACRN, matches the CR/AR shape
already in the repo) → Ecuador/Panama (possible, need closer look at their publication
pages) → Colombia/Mexico (harder — no single aggregator page; would need one adapter
per accredited CA or a different approach entirely).

## Open items for the implementation plan

- Exact `node-forge` API calls for zip-entry parsing (DER vs PEM detection, PKCS7
  member extraction).
- Minimum Node version assumption for built-in `fetch` (repo's existing `engines`
  field, if any, should govern).
- Whether `.monitor.log` grows unbounded or rotates — recommend simple append with a
  manual truncate note in the country README, matching the low-frequency, low-volume
  nature of this script (one run/day, most days no-op).
