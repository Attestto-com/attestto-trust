# TSL XAdES Signature-Verification Layer — Design

**Date:** 2026-07-23
**Repo:** attestto-trust
**Status:** Approved design, ready for implementation plan
**Tracking:** task #13

## Goal

Verify an ETSI TS 119 612 Trusted List's enveloped XAdES signature so that
**"the signature verifies → promote every certificate the list contains"**
(`scripts/monitors/PROMOTION.md`, Strategy B). This replaces the infeasible
per-certificate fingerprint cross-check at scale and unlocks:

- Italy's full ~222 active QTSP anchors (currently only the 2 CIE roots are live).
- The ~29 other EU/EEA national Trusted Lists reachable through the EU LOTL.
- cl-estado and any future signed-list source.

## Trust model (approved)

Everything chains to **one pinned anchor set** — the European Commission's LOTL
signing certificates, pinned from the Official Journal of the EU (OJEU):

```
[pinned] EC LOTL signing certs (OJEU)         ← sole manual trust root
   │
   ├─ fetch eu-lotl.xml → verify enveloped XAdES signature;
   │     signer MUST equal / chain to a pinned EC anchor
   │
   ├─ from the verified LOTL, per country pointer: read TSL location +
   │     the signing cert(s) the LOTL declares for that national list
   │     (the EC-signed LOTL vouches for them → no per-country pin)
   │
   ├─ fetch each national TSL → verify its XAdES signature;
   │     signer MUST match a cert the LOTL declared for that country
   │
   └─ PASS: extract CA certs (caOnly) → write to current/ + VERIFICATION.md
      FAIL: leave in staging/, log the reason
```

Security properties:

- National TSL signing-cert rotations are absorbed automatically: the EC-signed
  LOTL carries the new certs, so no manual pin update per country.
- The only manual maintenance is refreshing the EC anchors when the Commission
  rotates them (~yearly, announced in OJEU). A stale anchor **fails loudly** at
  LOTL verification; it never silently trusts an embedded/attacker cert.
- The verifier never trusts a cert embedded in the signature it is checking
  (that would be circular); trust always derives from the pinned EC anchors.

## Promotion gate (approved)

Verify → report → one-click human confirm:

- The orchestrator writes CA certs into `current/` **only** for lists that pass
  the full chain, and emits a `VERIFICATION.md` report + a git diff.
- The maintainer's gate becomes "review the verification report and the diff"
  **per list**, not per certificate — then commit + push.
- Lists that fail verification are never written to `current/`.

This preserves the repo's human-gated-promotion principle at a feasible
granularity (one review per list instead of per-cert), consistent with
PROMOTION.md.

## Components

Each is a small, independently testable unit.

### `trust-anchors/eu-lotl/*.pem` + `SOURCE.md` (NEW data)

The pinned EC LOTL signing certificates. `SOURCE.md` records the OJEU C-series
reference, retrieval URL, retrieval date, and each cert's SHA-256. This is the
sole manually-maintained trust root.

### `scripts/monitors/lib/verify-xades.mjs` (NEW — the security-critical primitive)

Pure function, no I/O:

```
verifyXades(xmlString, trustedAnchors) -> {
  valid: boolean,
  signerCert: X509Certificate | null,   // the cert that signed the list
  reason: string | null,                // failure reason when !valid
}
```

- `trustedAnchors`: array of PEM/X509Certificate the signer must equal or
  chain to.
- Verifies the enveloped XAdES signature end to end: XML canonicalization
  (C14N), every `SignedInfo` `Reference` digest, and the signature value
  against the signer's public key.
- Extracts the signing cert from the signature's `KeyInfo/X509Data`, then
  requires it to equal or chain to a `trustedAnchor`. A signature that is
  mathematically valid but signed by an untrusted cert returns
  `{ valid: false, reason: 'signer not trusted' }`.
- Library: `@peculiar/xadesjs` + `@peculiar/x509` (already a dep;
  `reflect-metadata` polyfill as elsewhere).
- No fetch, no fs — this is the unit tested hardest (real + tampered fixtures).

### `scripts/monitors/lib/extract-lotl.mjs` (EXTEND)

Already parses LOTL pointers (`{ territory, iso2, tslUrl }`). Extend the return
to include each country's declared national-TSL signing certs:
`{ territory, iso2, tslUrl, signingCerts: [pemString, ...] }`, read from each
pointer's `ServiceDigitalIdentity`/`X509Certificate`. Existing pointer parsing
and its tests are unchanged.

### `scripts/monitors/lib/extract-tsl.mjs` (REUSE, unchanged)

Existing `caOnly` CA-certificate extraction.

### `scripts/monitors/verify-eu-tsl.mjs` (NEW orchestrator — maintainer tool)

Not part of the published package; run by a maintainer where the network and
pinned anchors are available (like the other monitors). Flow:

1. Load pinned EC anchors from `trust-anchors/eu-lotl/`.
2. Fetch the LOTL (`https://ec.europa.eu/tools/lotl/eu-lotl.xml`); `verifyXades`
   against the pinned anchors. Abort the whole run on failure (stale anchors or
   compromise).
3. `extract-lotl` → per-country `{ iso2, tslUrl, signingCerts }`.
4. For each selected country: fetch its TSL; `verifyXades` against that
   country's LOTL-declared `signingCerts`. On pass, `extract-tsl` (caOnly) and
   write the CA certs to `countries/<iso2>/current/` + refresh manifest/chain;
   write `countries/<iso2>/VERIFICATION.md`. On fail, leave staging untouched
   and record the reason.
5. Print a run summary (passed / failed / skipped with reasons).

Flags: country filter (positional iso2 args), `--dry-run` (verify + report, no
writes).

### `countries/<cc>/VERIFICATION.md` (NEW output)

Per-list evidence: LOTL fetch time + digest, pinned EC anchor used, national
signer cert subject + SHA-256, digest/signature results, CA-cert count promoted,
run timestamp.

### `scripts/generate-exports.mjs` (MODIFY — the export-model blocker)

Documented gap: one `export const NAME = pem` per cert produces huge `index.js`
and name collisions at 222/1270 certs. Change:

- Always emit `ALL_CERTS` (array of `{ name, exportName, pem, sha256 }`) plus
  `manifest.json`/`chain.pem` — unchanged behaviour.
- Emit per-cert **named** consts only when a country has **≤ 20** certs. Above
  the threshold, `index.js` exports `ALL_CERTS` only, plus a
  `getBySha256(hex)` helper.
- `.d.ts` mirrors this. Safe for the published API: small countries keep
  ergonomic named exports; large countries never had usable ones. Existing
  consumers/tests already use `ALL_CERTS`.

## Data flow

```
trust-anchors/eu-lotl/*.pem (pinned)
  → verify-eu-tsl.mjs
      → fetch eu-lotl.xml → verifyXades(lotl, ecAnchors)         [abort run on fail]
      → extract-lotl → [{ iso2, tslUrl, signingCerts }]
      → per country:
          fetch tsl → verifyXades(tsl, country.signingCerts)     [skip country on fail]
          → extract-tsl(caOnly) → write current/*.pem
          → refresh-manifest + chain.pem
          → write VERIFICATION.md
  → maintainer reviews report + git diff → commit → push → (Pages rebuilds)
```

`did.json` regeneration for newly promoted countries is a separate, existing
step (`scripts/refresh-did-pki.mjs`), run after promotion; out of scope here.

## Error handling

- **Unreachable national TLS** (known: IE `eidas.gov.ie`, SK `tl.nbu.gov.sk`):
  skip, report, do not fail the run.
- **Signature invalid / signer not LOTL-declared:** never promote; leave
  `staging/` untouched; log the reason.
- **Pinned EC anchor stale/expired:** LOTL verification fails with an explicit
  "refresh EC LOTL anchors from OJEU" message; the run aborts before touching
  any country.
- **C14N / transform quirks in one national list:** caught per list; that list
  is reported failed and skipped, the rest proceed.

## Testing

No network in unit tests (matches existing monitor test philosophy — fixtures
under `tests/fixtures/`):

- `verify-xades`: a **captured real LOTL fixture** must verify against the
  pinned EC anchors; a **byte-tampered copy** must be rejected; a
  valid-signature-but-untrusted-signer case must be rejected. Same pass/tamper
  pair for one captured **national TSL** fixture (Italy).
- `extract-lotl`: signing-cert extraction against the existing
  `tests/fixtures/eu-lotl.xml` fixture (each pointer yields ≥1 signing cert
  where the source has one).
- `generate-exports`: a country over the threshold emits `ALL_CERTS` +
  `getBySha256` and no per-cert consts; a country under it keeps named consts;
  both still expose `ALL_CERTS`.
- End-to-end run against the live LOTL is performed by hand by the maintainer,
  committing verified output.

## Implementation risk — spike first

XAdES verification of real EU TSLs is notoriously finicky (canonicalization,
transform chains, the EC's specific signature profile). **Task 1 of the
implementation plan is a feasibility spike:** verify the real live LOTL with
`@peculiar/xadesjs` end to end and confirm it handles the EC profile. If it
cannot, surface that immediately (evaluate `xml-crypto` or a WebCrypto-based
path) before building the orchestrator on top.

## Out of scope

- did:pki regeneration (separate existing tool).
- cl-estado promotion (direct-cert Strategy A; benefits from the export-model
  change but not from XAdES).
- Full XAdES-BES qualifying-property validation beyond signer trust + digest +
  signature value (e.g. signing-time policy checks) — not required for the
  promotion trust decision.
- Automatic anchor rotation (EC anchor refresh stays a documented manual step).
