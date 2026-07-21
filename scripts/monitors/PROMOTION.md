# Promotion & the trust model — why staging is not trusting

This document explains **what promotion means, why it is deliberately
gated, and how to do it responsibly at scale.** It is the rationale behind
the monitor design; read it before moving anything into a `current/`
directory.

## `staging/` vs `current/` — downloaded is not trusted

The monitors (`run.mjs <iso2>`, `run-eu.mjs`) only ever write to
`countries/<iso2>/staging/`, `raw/`, `.source-state.json`, and
`.monitor.log`. Landing in `staging/` means exactly one thing: *we fetched
this certificate from an official-looking source over HTTPS.* It asserts
nothing about whether the cert is genuine.

`current/` is the **trust store** — the set of certificates downstream
consumers (`@attestto/verify`, `attestto-desktop`, the `did:pki` resolver)
treat as authoritative. Once a certificate is in `current/`, **any digital
signature that chains up to it is accepted as valid.** A bad certificate in
`current/` therefore means we would accept forged signatures as real.

**Promotion** = moving a cert from `staging/` to `current/` = the moment we
assert "this is genuinely the issuing authority's certificate; trust
anything that chains to it." That assertion is why promotion is never
automatic. A compromised or MITM'd source page can, at worst, land a bad
file in `staging/` for a human to reject; it can never reach `current/` on
its own.

## Why we cannot just bulk-promote

The specific risk promotion guards against: between the authority's real
certificate and our download, a cert could have been swapped — a
compromised page, a hijacked connection. The defense is to compare the
cert's fingerprint against a **second, independent source** (the CA's own
site, a public CT log / cert database). If both match, it is genuine; the
monitor already records each cert's SHA-256 in `staging/<date>/summary.json`
precisely so this cross-check is a lookup, not a re-derivation.

For 2 root certs, a human eyeballs 2 fingerprints. For the ~1,270 European
certs and ~712 Chilean State certs the monitors have staged, no human is
checking ~2,000 fingerprints by hand. **This is the real constraint — not a
tooling gap, but how to make the trust decision at scale.**

## The tree: roots vs intermediates

Certificates form a tree. At the top sit a handful of self-signed **roots**.
Below them, **intermediate** CAs signed by a root. Below those, end-entity
certs. The governing rule of PKI: *you trust something lower in the tree
only because it chains up to a root you already trust — and that chain is
mathematically verifiable.*

This is what makes trust scalable, and it yields two strategies that apply
to different source types.

### Strategy A — direct-cert sources: promote the roots only

Applies to: **US FPKI, Chile State (`cl-estado`), Uruguay, Panama** — and any
future direct-download source where we obtain the actual self-signed roots.

We have the roots for these (US 1, Chile State 2 [G1/G2], Uruguay 1,
Panama 1). Promote *only the roots* — a dozen certs total, cross-checkable
by hand in minutes against each authority's published fingerprint. The
hundreds of intermediates below them do **not** need individual promotion:
at verification time the consumer follows the chain ("this intermediate is
signed by a root in `current/` → valid"), so the intermediates validate
themselves. A dozen root checks covers the whole hierarchy.

### Strategy B — signed-list sources: verify the list's signature

Applies to: **the EU LOTL national lists and Peru's INDECOPI TSL** — every
ETSI TS 119 612 Trusted List.

Two facts make Strategy A a poor fit here:

1. **The lists mostly do not contain the self-signed roots.** They list the
   *accredited* CAs, which are predominantly issuing/intermediate CAs.
   Spain's list carries "AC FNMT Usuarios" (an issuing CA) but not the
   self-signed "AC RAIZ FNMT-RCM" root above it. Promoting "roots only"
   would promote almost nothing while leaving out exactly the CAs needed to
   validate real signatures.
2. **The entire list is itself digitally signed** by the EU / member state.

So the right model is: **verify the list's signature once, and trust every
certificate it contains.** Rather than inspecting 139 Spanish certs
individually, verify one seal — the list's XAdES signature — and that single
signature vouches for all 139 at once. Under eIDAS this is not a shortcut:
being *on* the signed list *is* the legal trust decision (the list's
"constitutive effect", Art. 22). Verify the seal → promote the list.

This collapses "eyeball 1,270 EU fingerprints" into "verify ~31 list
signatures" (or one LOTL signature chain that vouches for them all).

## Concrete promotion paths

### Direct-cert countries (available today, no new code)

1. Review `countries/<iso2>/staging/<date>/summary.json`; identify the
   `role: root` entries.
2. Cross-check each root's SHA-256 against the authority's own published
   fingerprint (see the per-source URLs in the monitor notes).
3. Move the accepted root PEM(s) into `countries/<iso2>/current/`.
4. `node scripts/refresh-manifest.mjs <iso2>` (rebuilds `manifest.json` +
   `chain.pem`) and `node scripts/generate-exports.mjs`.
5. For a new country dir: add its `"./<iso2>"` entry to `package.json`
   exports and an `index.d.ts`.
6. Commit, push.

### Signed-list countries (needs the verification layer first)

Blocked on building **XAdES signature verification** of the LOTL and each
national list against the EU's published signing certificate (tracked as
future work). Once it exists, promoting a country becomes: "the list's
signature verifies → promote everything it lists," with no per-cert review.

## Known mechanical gap

`generate-exports.mjs` currently emits one named JS export per certificate.
For high-volume countries (Chile State ~712, Italy ~388) that produces
hundreds of named constants in a single `index.js`. The export model needs
adjusting (e.g. do not export every intermediate as its own named const)
before those countries are promoted; the `manifest.json` / `chain.pem`
outputs are unaffected.
