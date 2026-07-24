# Verification — Chile State PKI (cl-estado)

**Promoted:** 2026-07-23 · **Staging snapshot:** `staging/2026-07-21/`
**Model:** direct-cert / national-hierarchy (Strategy A per `scripts/monitors/PROMOTION.md`)

## Source

- **Authority:** Autoridad Certificadora del Estado de Chile (SEGPRES)
- **Fetched over HTTPS** from the state Firma Digital certificate library:
  `https://firma.digital.gob.cl/biblioteca/certificados/`
- **Source page TLS fingerprint (SHA-256):** `849e2f5ae7fd876e5d565e9ae5b2c46ef152f9f23beb748cbe58a64dc239bfa0`
- **Monitor:** `scripts/monitors/sources/cl-estado.mjs`, human-gated

## Trust basis

Direct-cert source publishing the actual state root(s) and per-organismo
intermediate CAs. Promotion trust rests on **HTTPS + the recorded TLS
fingerprint** of the firma.digital.gob.cl origin and the human-gated monitor.
The two self-signed state roots anchor the whole hierarchy; the 710
per-organismo intermediates chain to them and validate at verification time.

## Inventory

- **712 distinct certificates** (deduped by SHA-256): **2 self-signed roots** +
  **710 intermediates**. RSA-2048 / RSA-4096.

### Roots (independently cross-checkable)

| Cert | SHA-256 | Key | Valid to |
|---|---|---|---|
| Autoridad Certificadora del Estado de Chile (G1) | `3fa7c79e31f2107c689fd4bbba110721501e54db2e73a497ac8d25a7a35095ae` | RSA-4096 | 2026-01-18 |
| Autoridad Certificadora del Estado de Chile G2 | `e3c940378e3d275cc737b6ae921f3e00069398ce01976c816f04120d9a365236` | RSA-4096 | 2034-11-20 |

> **Flag:** the G1 root expired **2026-01-18**. It is retained for validating
> historical signatures; current chains anchor on **G2** (valid to 2034). A
> future pass may move G1 to an `archive/` for long-term validation.

## did:pki

No `did.json` is published: `did:pki` requires a two-letter country segment, and
the `cl-estado` pseudo-code cannot produce a syntactically valid DID
(`refresh-did-pki.mjs` skips them all). Certificates remain usable via
`ALL_CERTS` / `getBySha256`.

## Notes

No machine-verified signed list for this source; trust is origin-HTTPS-based.
