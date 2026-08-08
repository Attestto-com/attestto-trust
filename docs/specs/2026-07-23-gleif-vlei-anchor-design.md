# GLEIF vLEI Anchor — Phase 1 Design (Mirror + Display)

**Date:** 2026-07-23
**Ticket:** ATT-1068 (implementation) · ATT-1061 (design) · ATT-1069 (phase 2, verification — out of scope here)
**Repo:** attestto-trust

## Problem

attestto-trust mirrors national digital-signature trust roots as X.509 certificates under
`countries/<cc>/current/` (each cert hash-pinned, discoverable as `did:pki`). GLEIF's vLEI is a
different trust model entirely and does not fit that structure:

| | National PKI (existing) | GLEIF vLEI (this work) |
|---|---|---|
| Crypto | X.509 certificates (CA-signed PEM) | KERI AIDs + ACDC credentials (self-certifying, KEL-anchored) |
| Root of trust | A national CA root per country | The single global GLEIF Root AID |
| Authenticates | Persons (qualified e-signatures, eIDAS) | Legal entities (organizations, via the LEI) |
| Scope | Per-nation | Global |
| Identifier | `did:pki` | `did:keri` / `did:webs` |
| Chain | Root CA → intermediate → leaf | GLEIF Root → GEDA → QVI → Legal Entity |

There is no CA-signed PEM to pin. The trust root is an AID whose authority is its key state (KEL),
and the authorized issuers are the Qualified vLEI Issuers (QVIs) GLEIF designates.

## Goal

Represent GLEIF vLEI as a **first-class, global/organizational trust anchor** in the directory —
hash-pinned, version-controlled, displayed alongside the national PKI — using the same stance the
directory already takes: *we mirror what the authority publishes, we are not an issuer, verify
against the authority as the source of truth.*

## Non-Goals (deferred to ATT-1069, phase 2)

- No KERI KEL cryptographic verification.
- No ACDC credential-chain walking (GLEIF Root → QVI → Legal Entity).
- No `did:keri` / `did:webs` resolution in the resolver.
- No live OOBI / witness resolution.

Phase 1 is deliberately mirror-and-display only. It is a prerequisite for phase 2: the pinned
GLEIF root is what a future verification layer verifies against. This mirrors the sequence that
worked for the national PKI — mirror the roots first (countries), then build the XAdES
verification layer (ATT-1059) on top.

## Architecture

A new top-level category `anchors/` (sibling to `countries/` and the existing `trust-anchors/`),
holding non-national, organizational/global trust anchors. Its first member is `anchors/gleif-vlei/`.

```
attestto-trust/
├── countries/            ← national X.509 PKI (unchanged)
├── trust-anchors/        ← pinned verification anchors (EU LOTL signer) (unchanged)
└── anchors/              ← NEW: global / organizational anchors
    └── gleif-vlei/
        ├── root-aid.json     ← GLEIF Root AID prefix + current key-state (KEL) digest
        ├── qvis.json         ← authorized QVI list (name, LEI, AID prefix, status)
        ├── meta.json         ← presentation + authority metadata (vlei-keri model)
        ├── manifest.json     ← SHA-256 of each pinned artifact (tamper-evidence)
        └── SOURCE.md         ← provenance: source publication, capture date, re-verify steps
```

Why a new `anchors/` category rather than extending `countries/`: vLEI is not a country and has no
flag, region, or national CA hierarchy. Forcing it into `countries/` would corrupt the national-PKI
data model (the site enumerates `countries/` by two-letter code + flag + region). A sibling
category keeps each model clean and leaves room for future global anchors.

## Data Model

### `root-aid.json`
```json
{
  "name": "GLEIF Root of Trust (vLEI)",
  "aid": "<GLEIF Root AID prefix>",
  "keyStateDigest": "<SAID of the current key-state / latest KEL event>",
  "witnesses": ["<witness AID / OOBI reference the state was captured from>"],
  "capturedAt": "2026-07-23"
}
```
The `aid` and `keyStateDigest` are the pinned trust root: they are what a phase-2 verifier checks a
presented credential's chain against. Exact field values are captured during implementation from
GLEIF's published root-of-trust artifacts and recorded in `SOURCE.md`.

### `qvis.json`
```json
{
  "generatedAt": "2026-07-23",
  "source": "<GLEIF authorized-QVI publication URL>",
  "qvis": [
    { "name": "<QVI legal name>", "lei": "<QVI LEI>", "aid": "<QVI AID prefix>", "status": "authorized" }
  ]
}
```

### `meta.json` (adapted from the country `meta.json` shape)
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
    { "label": "GLEIF vLEI — root of trust", "url": "<GLEIF root-of-trust publication>" },
    { "label": "GLEIF — Qualified vLEI Issuers", "url": "<GLEIF QVI list>" }
  ],
  "notes": "Global organizational identity rooted at GLEIF, not a national CA. Attestto mirrors GLEIF's published vLEI root of trust (Root AID key state and the authorized QVI list), hash-pinned and version-controlled; it does not issue, vouch for, or act as a QVI. Verify against GLEIF as the source of truth. vLEI is KERI/ACDC, not X.509, so it is pinned as an AID key-state digest rather than a CA certificate. Cryptographic verification of presented vLEI credentials is a separate phase (ATT-1069)."
}
```

### `manifest.json`
An array of `{ filename, sha256 }` for `root-aid.json` and `qvis.json`, computed the same way the
country manifests are, so tamper-evidence and the CI hash check extend to this anchor with no new
mechanism.

### `SOURCE.md`
Provenance doc mirroring `trust-anchors/eu-lotl/SOURCE.md`: exactly which GLEIF publication each
artifact came from, the capture date, and how a third party re-verifies the pinned values against
GLEIF directly.

## Site

The build-time loader gains a small parallel path: alongside `loadAllCountries()`, a
`loadGlobalAnchors()` reads `anchors/*/meta.json` (+ `root-aid.json`, `qvis.json`). The home page
renders a **new "Global / Organizational identity" section** above the country table (after the hero,
before the countries section), since GLEIF is a global root that sits atop the national roots — a
distinct card (`GlobalAnchorCard.astro`), not a row in the country table (no
flag, no region grouping). The card shows: the anchor name, a "Global root" tag, the Root AID
(truncated + copyable), the QVI count, the KERI/ACDC tech tag, the explicit "not a national CA — we
mirror, verify at GLEIF" framing, and two actions (an internal `/gleif` detail page and an external
link to GLEIF's root of trust).

A `/gleif` detail page expands the card the way a country page expands a table row: full Root AID,
the QVI list with LEIs and AID prefixes, artifact SHA-256 fingerprints, and the provenance from
`SOURCE.md`. EN + ES, following the existing i18n pattern.

## Error Handling / Robustness

- The country loader must be untouched in behavior: `anchors/` is read by a separate function, so a
  malformed or absent `anchors/` directory never breaks the national-PKI pages. If
  `anchors/gleif-vlei/` is missing, the global section simply does not render.
- Manifest SHA-256 mismatch is surfaced by the existing CI hash check (extended to `anchors/`),
  exactly as for countries.

## Testing

- The pinned artifacts (`root-aid.json`, `qvis.json`, `meta.json`) parse and carry the required
  fields.
- `manifest.json` SHA-256 values match the artifacts (extend the existing manifest/CI check to
  `anchors/`).
- The site builds and renders the global-anchor card on the home page and the `/gleif` detail page
  (EN + ES), with the Root AID and QVI count present.
- No network in tests — the pinned files ARE the fixtures.

## Acceptance

- `anchors/gleif-vlei/` exists with the five artifacts, sourced and documented in `SOURCE.md` from
  GLEIF's published root of trust.
- The manifest hash check covers the anchor.
- The home page shows the Global / Organizational identity card and `/gleif` renders the detail
  page, both EN + ES, with the correct framing (organizational identity, not a national CA; mirror
  and verify at GLEIF).
- README updated to describe the new `anchors/` category.
- Reviewed by Eduardo.
