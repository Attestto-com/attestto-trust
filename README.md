# attestto-trust

**Independent public mirror of national digital signature trust roots and intermediates.**

This repo exists because most national PKI repositories are partially broken — wrong content-types, half-deployed HTTPS, mixed-case URL quirks, missing branches, dead links. Developers integrating any country's signature stack keep hitting the same wall.

We host the bytes as-is, hash-pinned, version-controlled, with the full git history as the audit trail.

> ⚠️ **We are not a Certificate Authority.** We do not issue, reissue, sign, or vouch for these certificates. We mirror the binary bytes published by official issuers. The legal source of truth remains the issuing authority in each country. **Always verify the SHA-256 against the official source when you can reach it.**

---

## Countries

| Country | Code | Status | Branches covered |
|---|---|---|---|
| Costa Rica | [`cr/`](countries/cr) | ✅ live | Persona Física + Persona Jurídica |

More to come (MX, SV, PA, ...). To add a country, see [Adding a country](#adding-a-country).

## Layout

```
attestto-trust/
├── README.md                   ← you are here
├── scripts/                    ← shared tooling, country-agnostic
│   ├── extract-chain-from-pdf.mjs
│   └── refresh-manifest.mjs
├── countries/
│   └── <iso2>/
│       ├── README.md           ← country-specific notes + hierarchy diagram
│       ├── current/            ← certs currently active
│       │   ├── *.pem
│       │   ├── chain.pem       ← all-in-one bundle
│       │   └── manifest.json   ← sha256, subject, issuer, validFrom/To, role
│       ├── archive/            ← superseded certs, kept forever
│       └── samples/            ← signed docs we extracted from (when redistributable)
└── .github/workflows/verify.yml
```

The full audit trail is **the git history**. Every cert added, rotated, or retired is a commit with a message describing what changed and why.

## Using the certs

### Drop into your trust store

```bash
git clone https://github.com/Attestto-com/attestto-trust.git
cp attestto-trust/countries/cr/current/*.pem your-app/trust-store/cr/
```

### As a single bundle

```bash
openssl verify -CAfile attestto-trust/countries/cr/current/chain.pem some-signer.pem
```

### Verify a file's hash

```bash
sha256sum "countries/cr/current/CA RAIZ NACIONAL - COSTA RICA v2.pem"
# compare against countries/cr/current/manifest.json
```

## Updating an existing country

When the issuing authority rotates a cert (root or intermediate):

1. Move the old PEM from `countries/<iso2>/current/` into `countries/<iso2>/archive/<year>-<old-version>/`
2. Drop the new PEM into `countries/<iso2>/current/`
3. Run `node scripts/refresh-manifest.mjs <iso2>`
4. Commit with a clear message: *"cr: rotate CA SINPE PERSONA FISICA v2 → v3, expires 2032"*
5. Push

## Adding a country

```bash
mkdir -p countries/<iso2>/{current,archive,samples}
# extract intermediates from any signed sample document for that country
node scripts/extract-chain-from-pdf.mjs ~/Downloads/some-signed.pdf /tmp/out
# inspect, then move the relevant intermediates into countries/<iso2>/current/
cp /tmp/out/*.pem countries/<iso2>/current/
cat countries/<iso2>/current/*.pem > countries/<iso2>/current/chain.pem
node scripts/refresh-manifest.mjs <iso2>
# write countries/<iso2>/README.md with the hierarchy diagram and notes
git add countries/<iso2>
git commit -m "<iso2>: initial trust mirror — N certs"
```

Then update the country table at the top of this README.

## What this repo is NOT

- **Not a CA.** We don't sign anything.
- **Not an OCSP/CRL responder.** Revocation is time-sensitive — get it from the official source. We deliberately don't mirror CRLs because a stale CRL is worse than none.
- **Not legal advice.** For binding trust opinions, talk to the issuing authority in the relevant jurisdiction.
- **Not authoritative.** If our mirror disagrees with the official source, the official source wins. Open an issue and we'll fix it.

## License

The certificates are public-key X.509 published by official institutions; freely redistributable. Scripts and documentation are MIT.

## Provenance

Maintained by [Attestto](https://attestto.org) as part of public-good work on national digital identity infrastructure. See <https://attestto.org/ark>.

If you find a cert that's missing, expired, or mishashed, **open an issue with a sample signed document we can extract from**, and we'll get it in.
