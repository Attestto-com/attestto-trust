# Verification — Panama (pa)

**Promoted:** 2026-07-23 · **Staging snapshot:** `staging/2026-07-20/`
**Model:** direct-cert (Strategy A per `scripts/monitors/PROMOTION.md`)

## Source

- **Authority:** DNFE — Dirección Nacional de Firma Electrónica (Registro Público de Panamá)
- **Fetched over HTTPS** from the DNFE official cacerts repository:
  `https://www.firmaelectronica.gob.pa/cacerts/` (`caraiz.crt`, `cagob.crt`, `capc2.crt`)
- **Source page TLS fingerprint (SHA-256):** `e1bad0f205ce5387a08f08e878396a661ed20ef968ea37d7a2fd0c29f7269b1d`

## Trust basis

Direct-cert source: the DNFE publishes the actual self-signed national root and
its two subordinate CAs. Promotion trust rests on **HTTPS + the recorded TLS
fingerprint** of the DNFE origin. Per Strategy A, verifying the single root
covers the hierarchy — the two intermediates chain to it and validate at
verification time.

## Root anchor (independently cross-checkable)

| Cert | SHA-256 | Key | Valid to |
|---|---|---|---|
| AUTORIDAD CERTIFICADORA DE PANAMA | `4fa727e3ce87f28f05ae388c4ebe21d4a31136efd4983f6ac49a36b4882703d1` | RSA-4096 | 2053-05-08 |

## Notes

No machine-verified list signature exists for this source (Panama does not
publish an ETSI TS 119 612 signed list); trust is origin-HTTPS-based. A future
pass may cross-check the root fingerprint against a second published DNFE source.
