# Testers log — design spec

**Date:** 2026-07-20
**Status:** approved, pending implementation plan
**Repo:** `attestto-trust`

## Problem

Every time a contributor adds and tests a new country's root-cert monitor
(`scripts/monitors/sources/<iso2>.mjs`), that work is invisible after the
fact beyond a commit message. There's no cumulative, growing, publicly
verifiable record of who has actually run and verified each country's
monitor against its live source — and no natural, on-brand ritual for a
contributor to mark "I tested this" in a way that fits a repo whose entire
purpose is digital signatures.

## Non-goals

- Not a legally meaningful signature. The testers' keys are self-signed
  demo identities scoped to this log only — explicitly not Firma Digital,
  not any real legal/notarial signing, and not affiliated with any of the
  trust anchors this repo mirrors.
- Not a security control. `countries/*/current/` remains the actual trust
  boundary (see the CL monitor design spec); this log has zero bearing on
  what's trusted there. It's a contribution/testing record, not a gate.
- Not, initially, a public `trust.attestto.org` page — that's an adoption
  follow-on (see "Future: public site page" below), not part of this build.

## Architecture

**Rejected approach:** one continuously-growing PDF, incrementally signed
by each contributor in turn (PDF's real "approval signature" mechanism —
the same one that lets five people sign one contract PDF in sequence
without invalidating earlier signatures). Rejected because the JS tooling
needed to add each new page's *content* (`pdf-lib`) doesn't do true
incremental updates — it fully re-serializes the file on save, which
would silently invalidate every prior signature. Getting genuine
incremental updates right would need shelling out to a narrower tool
(`qpdf`) built specifically for that, adding real risk for a feature
that isn't security-critical.

**Chosen approach:** the source of truth is a plain, append-only,
hash-chained, per-entry-signed JSON Lines log — the same "committed data +
regenerated view" pattern this repo already uses for
`manifest.json → chain.pem`/`index.js`. A PDF-look-and-feel is achieved by
*rendering* that log to HTML (styled like an official certificate), not by
manipulating PDF bytes directly. This sidesteps the incremental-signing
problem entirely: there is nothing to "keep valid while editing," because
nothing is ever edited — only appended.

## Data model — `testers-log/log.jsonl`

One JSON object per line, append-only, never rewritten:

```json
{"seq":2,"country":"pe","tester":"Eduardo Chongkan","testerSlug":"eduardo-chongkan","date":"2026-07-20","staged":70,"knownGaps":2,"prevHash":"sha256:8b2c...","signature":"MEQCIB..."}
```

- `seq` — 1-indexed, strictly increasing.
- `country` — ISO2 code matching `countries/<iso2>/`.
- `tester` / `testerSlug` — display name and its filesystem-safe slug
  (lowercased, non-alphanumeric collapsed to `-`), used to locate
  `testers-log/certs/<testerSlug>.pem`.
- `staged` / `knownGaps` — pulled automatically from that country's most
  recent `countries/<iso2>/staging/<date>/summary.json` (array length) and
  `.source-state.json`'s `knownGaps` (array length) at the moment the
  entry is created. Never hand-typed, so the log can't drift from what the
  monitor actually reported.
- `prevHash` — `sha256` of the **entire previous entry as a JSON line,
  signature included** (i.e. hash the fully-signed prior object, not just
  its content) — the same recursive-chaining trick a git commit or a
  blockchain uses. `null` for `seq:1`.
- `signature` — base64, over a **fixed deterministic template string**
  (not a JSON re-serialization — JSON has no single canonical byte form,
  which would make independent verification ambiguous):

  ```
  attestto-trust-testers-log-entry-v1
  seq: 2
  country: pe
  tester: Eduardo Chongkan
  date: 2026-07-20
  staged: 70
  knownGaps: 2
  prevHash: sha256:8b2c...
  ```

  Signed with `crypto.sign('sha256', Buffer.from(template), privateKey)` —
  Node's built-in crypto, the same API already central to this repo (used
  for cert parsing in `extract-certs.mjs`), no new signing library.

## Signer identity

- **Algorithm:** EC P-256 (`prime256v1`) — modern, small, and consistent
  with this repo's recent move to properly support EC certs (the
  node:crypto migration in the monitor work was specifically about fixing
  EC support that node-forge lacked).
- **Enrollment (first signature only):** `add-entry.mjs` checks for a
  local private key at `~/.attestto-trust/testers-log/<slug>.key.pem`
  (outside any repo — never committed, survives re-clones). If absent, it
  shells out to `openssl req -x509 -newkey ec -pkeyopt
  ec_paramgen_curve:P-256 -nodes -days 36500 -subj "/CN=<Name>
  (attestto-trust tester)"` to mint a self-signed keypair — shelling out
  to `openssl` for cert *creation* matches this repo's established pattern
  of using mature system tools instead of adding dependencies (same
  reasoning as shelling out to `unzip` in the monitor work), and avoids
  relying on node-forge's cert-creation path after finding real bugs in
  its cert-*parsing* path this session.
- **Public half:** the self-signed cert is committed to
  `testers-log/certs/<slug>.pem` — this is what `verify.mjs` (and anyone
  with `openssl`) checks signatures against. Reused for every future entry
  by the same person, so all of one contributor's signatures trace to the
  same identity over time, same as real PKI.
- **Slug collision:** if a slug already has a committed cert whose public
  key doesn't match the caller's local private key, `add-entry.mjs` stops
  and asks for a disambiguating slug rather than silently overwriting
  someone else's identity.

## Verification — `scripts/testers-log/verify.mjs`

Walks `log.jsonl` start to finish; for every entry, independently checks:

1. **Chain:** `sha256(entries[i-1] as committed, including its signature)`
   equals `entries[i].prevHash`. (Skipped for `seq:1`, which must have
   `prevHash: null`.)
2. **Signature:** rebuild the fixed template string from `entries[i]`'s
   own fields, load `testers-log/certs/<testerSlug>.pem`, and
   `crypto.verify()` the stored signature against that string and that
   public key.

Reports pass/fail **per entry**, naming exactly which check failed where
— never a bare "chain broken somewhere." Exit code 0 only if every entry
passes both checks. Nothing here is proprietary: the template string, the
hash, and the signature are all standard/reproducible with five lines of
`openssl` by anyone who doesn't trust this script.

## Rendering — `scripts/testers-log/render.mjs`

Regenerates `testers-log/index.html` from `log.jsonl` (a fully
deterministic derived artifact — same relationship as
`manifest.json → chain.pem`). Runs the same verification as `verify.mjs`
at render time and shows a "chain intact ✓ / N signatures verified"
status. Visual style: the "Official Certificate" look approved during
design (parchment background, wax-seal badge, serif type, cursive
signature name per entry) — this is a **standalone repo artifact**, not
part of the `trust.attestto.org` Astro site, so it isn't bound by that
site's "one style per site" design-token rule.

## Adding an entry — `scripts/testers-log/add-entry.mjs <iso2>`

1. Find the latest `countries/<iso2>/staging/<date>/` — error clearly if
   none exists ("run `node scripts/monitors/run.mjs <iso2>` first").
2. Pull `staged` (summary.json length) and `knownGaps` (source-state
   length) from it.
3. Resolve/enroll the signer identity (see above).
4. Read the last line of `log.jsonl` (if any) for `seq`/`prevHash`.
5. Build the entry, sign it, append it as a new line.
6. Run the render step to regenerate `testers-log/index.html`.
7. `git add` the new/changed files (log, cert if newly enrolled, rendered
   HTML) but **does not commit** — unlike the country monitors'
   bookkeeping auto-commit, this touches a newly-minted personal identity
   artifact, so a human reviews and commits it themselves.

## Repo layout

```
attestto-trust/
├── testers-log/
│   ├── log.jsonl              append-only, git-committed
│   ├── index.html             generated, git-committed
│   └── certs/
│       └── <slug>.pem         one public cert per contributor
└── scripts/testers-log/
    ├── add-entry.mjs
    ├── render.mjs
    └── verify.mjs
```

## Future: public site page (adoption follow-on, not part of this build)

If/when this is surfaced on `trust.attestto.org/testers`, that page **must**
reuse the site's actual existing design tokens (`site/src/styles/tokens.css`)
and component patterns (`CertCard`, `RoleBadge`, the `mirror-banner`
disclaimer pattern already used elsewhere on the site) rather than import
the certificate look — confirmed against the real token file and
components during design, not assumed. This is a distinct, separate
rendering target from `testers-log/index.html`, which keeps its own
certificate styling since it isn't part of that site.

## Testing

- Unit tests for `verify.mjs`'s two checks (chain hash, signature) against
  a small fixture log with a known-good chain and deliberately-broken
  variants (bad signature, wrong prevHash, tampered field) — each must be
  caught and named specifically, not just "verification failed."
- An integration test that runs `add-entry.mjs` twice in a temp dir
  (simulating two different testers) and confirms `verify.mjs` reports
  both signatures and the chain link between them as valid.
