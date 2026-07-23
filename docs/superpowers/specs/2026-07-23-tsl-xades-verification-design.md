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
   ├─ fetch eu-lotl.xml → check NextUpdate freshness → verify enveloped XAdES
   │     signature; signer MUST equal / chain to a pinned EC anchor
   │
   ├─ from the verified LOTL, per country pointer: read TSL location +
   │     the signing IDENTITIES the LOTL declares for that national list
   │     (X509Certificate | X509SKI | X509SubjectName). The EC-signed LOTL
   │     vouches for them → no per-country pin
   │
   ├─ fetch each national TSL → check NextUpdate freshness → verify its XAdES
   │     signature; the signer MUST be an EXACT identity match to one the LOTL
   │     declared for that country (not merely a cert chaining to the same CA)
   │
   ├─ from the verified TSL, select only currently-GRANTED CA/QC services
   │     (drop withdrawn/deprecated statuses and non-CA service types)
   │
   └─ PASS: reconcile current/ to the selected set (add new, archive removed)
            + VERIFICATION.md
      FAIL: leave current/ untouched, log the reason
```

Security properties:

- National TSL signing-cert rotations are absorbed automatically: the EC-signed
  LOTL carries the new identities, so no manual pin update per country.
- The only manual maintenance is refreshing the EC anchors when the Commission
  rotates them (~yearly, announced in OJEU). A stale anchor **fails loudly** at
  LOTL verification; it never silently trusts an embedded/attacker cert.
- The verifier never trusts a cert embedded in the signature it is checking
  (that would be circular); trust always derives from the pinned EC anchors.
- **Signer authorization is an exact identity match for national TSLs.** A
  mathematically valid signature signed by a cert that merely chains to the same
  CA as the declared identity is REJECTED — eIDAS lists a specific digital
  identity, and only that identity (its full cert, or its SKI / SubjectName when
  that is what the LOTL declares) is accepted. "Chain to" is permitted only for
  the pinned-EC-anchor case (the EC may sign the LOTL with a cert issued under a
  pinned root).
- **A list past its `NextUpdate` is stale and is not trusted as current.** The
  XAdES signature stays mathematically valid forever, but an out-of-date list no
  longer reflects the authority's current position, so it is rejected/flagged
  rather than promoted.

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

Two separated concerns — signature validity (crypto) and signer authorization
(trust) — so each is tested independently. Pure functions, no I/O:

```
verifyXadesSignature(xmlString) -> {
  valid: boolean,                       // C14N + digests + signature value
  signerCert: X509Certificate | null,   // the cert taken from the signature's KeyInfo
  reason: string | null,
}

authorizeSigner(signerCert, allowedIdentities, { allowChain=false }) -> {
  authorized: boolean,
  reason: string | null,
}
```

- `verifyXadesSignature` verifies the enveloped XAdES signature end to end: XML
  canonicalization (C14N), every `SignedInfo` `Reference` digest, and the
  signature value against the public key of the cert in the signature's
  `KeyInfo/X509Data`. It proves the document is intact and self-consistent — it
  does **not** decide trust.
- `authorizeSigner` decides trust. `allowedIdentities` is a list of eIDAS
  digital identities, each one of: a full `X509Certificate`, an `X509SKI`
  (subject key identifier), or an `X509SubjectName`. The signer is authorized
  only on an **exact** identity match (same cert; or SKI equal; or subject name
  equal). `allowChain` (default **false**) permits chaining and is used **only**
  for the pinned-EC-anchor step, never for national TSLs.
- Why split: the LOTL frequently declares a national TSL's signer as an SKI or
  SubjectName rather than a full cert, so the verifying public key must come from
  the signature's own `KeyInfo`, while the LOTL entry only authorizes that
  signer. A single "verify against a list of certs" function cannot express this.
- Library: `@peculiar/xadesjs` + `@peculiar/x509` (already a dep;
  `reflect-metadata` polyfill as elsewhere).
- No fetch, no fs — the unit tested hardest (real + tampered fixtures, plus
  valid-signature-but-unauthorized-signer and SKI-only-identity cases).

### `scripts/monitors/lib/extract-lotl.mjs` (EXTEND)

Already parses LOTL pointers (`{ territory, iso2, tslUrl }`). Extend the return
to include each country's declared signing **identities** (not just full certs):
`{ territory, iso2, tslUrl, signingIdentities: [{ type: 'cert'|'ski'|'subject', value }, ...] }`,
read from each pointer's `ServiceDigitalIdentity` — which may carry an
`X509Certificate`, an `X509SKI`, and/or an `X509SubjectName`. These feed
`authorizeSigner` directly. Existing pointer parsing and its tests are unchanged.

### `scripts/monitors/lib/extract-tsl.mjs` (EXTEND)

Existing `caOnly` CA-certificate extraction, plus **status/service-type
filtering**: return only services whose status is currently **granted**
(`.../granted`, and — for legacy pre-eIDAS entries — the accredited/undersupervision
equivalents) and whose service type is a CA / qualified-certificate issuer. Drop
`withdrawn`, `deprecatedatnationallevel`, `recognisedatnationallevel` where not
granted, and non-CA service types (time-stamping, OCSP, validation, etc.). This
is a hard filter: a withdrawn CA must never reach `current/`. The existing
Peru "No acredited → skip" behaviour is the same gate, made explicit and applied
to every list.

### `scripts/monitors/verify-eu-tsl.mjs` (NEW orchestrator — maintainer tool)

Not part of the published package; run by a maintainer where the network and
pinned anchors are available (like the other monitors). Flow:

1. Load pinned EC anchors from `trust-anchors/eu-lotl/`.
2. Fetch the LOTL (`https://ec.europa.eu/tools/lotl/eu-lotl.xml`); check its
   `NextUpdate` freshness; `verifyXadesSignature` then `authorizeSigner` against
   the pinned anchors with `allowChain: true`. Abort the whole run on failure
   (stale anchors, stale list, or compromise).
3. `extract-lotl` → per-country `{ iso2, tslUrl, signingIdentities }`.
4. For each selected country: fetch its TSL; check `NextUpdate` freshness;
   `verifyXadesSignature`, then `authorizeSigner(signer, country.signingIdentities)`
   with `allowChain: false` (exact identity match). On pass, `extract-tsl`
   (caOnly + granted-status filter), then **reconcile** `countries/<iso2>/current/`
   to that exact set — add new PEMs, and move certs no longer listed into
   `countries/<iso2>/archive/<date>/` — then refresh manifest/chain and write
   `countries/<iso2>/VERIFICATION.md`. On any failure, leave `current/`
   untouched and record the reason.
5. Print a run summary (passed / failed / skipped with reasons, and per country:
   added / archived / unchanged counts).

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
      → fetch eu-lotl.xml → freshness(NextUpdate)
          → verifyXadesSignature(lotl) → authorizeSigner(signer, ecAnchors, {allowChain:true})
          [abort whole run on any fail]
      → extract-lotl → [{ iso2, tslUrl, signingIdentities }]
      → per country:
          fetch tsl → freshness(NextUpdate)
          → verifyXadesSignature(tsl) → authorizeSigner(signer, country.signingIdentities, {allowChain:false})
          [skip country on any fail]
          → extract-tsl(caOnly + granted-status filter)
          → reconcile current/  (add new; archive removed → archive/<date>/)
          → refresh-manifest + chain.pem
          → write VERIFICATION.md
  → maintainer reviews report + git diff → commit → push → (Pages rebuilds)
```

`did.json` regeneration for newly promoted countries is a separate, existing
step (`scripts/refresh-did-pki.mjs`), run after promotion; out of scope here.

## Error handling

- **Unreachable national TLS** (known: IE `eidas.gov.ie`, SK `tl.nbu.gov.sk`):
  skip, report, do not fail the run.
- **Signature invalid / signer not an exact LOTL-declared identity:** never
  promote; leave `current/` untouched; log the reason.
- **Stale list (past `NextUpdate`):** treat as not-current; do not promote;
  report so a maintainer can chase the authority or re-run later. Applies to
  both the LOTL (aborts the run) and any national list (skips that country).
- **Pinned EC anchor stale/expired:** LOTL verification fails with an explicit
  "refresh EC LOTL anchors from OJEU" message; the run aborts before touching
  any country.
- **C14N / transform quirks in one national list:** caught per list; that list
  is reported failed and skipped, the rest proceed.
- **Empty granted set after filtering:** if a verified list yields zero granted
  CA services, do not wipe `current/`; report and skip (guards against a parser
  regression silently archiving a whole country).

## Testing

No network in unit tests (matches existing monitor test philosophy — fixtures
under `tests/fixtures/`):

- `verifyXadesSignature`: a **captured real LOTL fixture** must verify; a
  **byte-tampered copy** must be rejected. Same pass/tamper pair for one captured
  **national TSL** fixture (Italy).
- `authorizeSigner`: exact cert match authorizes; SKI-only identity authorizes a
  signer whose SKI matches; SubjectName-only identity likewise; a signer that
  merely **chains** to the declared CA is rejected when `allowChain:false`, and
  authorized when `allowChain:true` (the EC-anchor case).
- **Freshness:** a fixture with a past `NextUpdate` is rejected as stale.
- `extract-lotl`: signing-identity extraction against the existing
  `tests/fixtures/eu-lotl.xml` (each pointer yields ≥1 identity; identity type is
  correctly classified as cert/ski/subject).
- `extract-tsl` status filter: a fixture list containing withdrawn + granted
  services yields only the granted CA services; non-CA service types are dropped.
- Reconcile: given a prior `current/` and a new granted set, the correct certs
  are added and the removed ones land in `archive/`; an empty granted set leaves
  `current/` untouched.
- `generate-exports`: a country over the threshold emits `ALL_CERTS` +
  `getBySha256` and no per-cert consts; a country under it keeps named consts;
  both still expose `ALL_CERTS`.
- End-to-end run against the live LOTL is performed by hand by the maintainer,
  committing verified output.

## Scale and phased rollout

Promoting all reachable EU lists at once is ~1270 CA certs across ~29 countries,
which turns the Astro build from ~100 pages into a few thousand and produces
large manifests, `copy-pems` output, and `did.json` fan-out. This is
operational, not a correctness issue, but the first run should not attempt all
29 blind. Rollout order:

1. **Spike** — the live LOTL + Italy end to end (proves the chain and the EC
   profile).
2. **LOTL + Italy full QTSP set** promoted and reviewed (the task-#13 headline:
   Italy's ~222 anchors).
3. **A small batch** (e.g. DE, FR, one more) to confirm cross-country parsing.
4. **Fan out** the remainder, reviewing each list's report + diff.

The orchestrator's country filter makes each of these an explicit, reviewable
run rather than one giant commit. Per-country page/manifest volume is monitored
as countries are added; if the static build becomes a bottleneck it is addressed
separately (out of scope here).

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
