# Verification — United States (us)

**Promoted:** 2026-07-23 · **Staging snapshot:** `staging/2026-07-21/`
**Model:** direct-cert / federal-bridge (Strategy A per `scripts/monitors/PROMOTION.md`)

## Source

- **Authority:** US Federal PKI — Federal PKI Management Authority (GSA)
- **Fetched over HTTPS** from the official FPKI repository (`repo.fpki.gov`):
  - `https://repo.fpki.gov/fcpca/fcpcag2.crt` — the trust root
  - `https://repo.fpki.gov/fcpca/caCertsIssuedByfcpcag2.p7c` — the subordinate/cross set
- **Source TLS fingerprint (SHA-256):** `d4cf8b2e2b33643167e1537fd78bd37f60cfbaebed016d188321aa03c295191d`

## Trust basis

Direct-cert source. The trust anchor is **Federal Common Policy CA G2**, fetched
directly from the FPKI repository. The 12 subordinate/cross-certified CAs are
extracted from the `caCertsIssuedByfcpcag2.p7c` bundle the FPKI publishes
alongside the root; every one chains up to FCPCA G2 and validates at
verification time. Promotion trust rests on **HTTPS + the recorded TLS
fingerprint** of the `repo.fpki.gov` origin.

## Root anchor (independently cross-checkable)

| Cert | SHA-256 | Key | Valid to |
|---|---|---|---|
| Federal Common Policy CA G2 | `5f9aecc24616b2191372600dd80f6dd320c8ca5a0ceb7f09c985ebf0696934fc` | RSA-4096 | 2040-10-14 |

The FCPCA G2 SHA-256 above matches the fingerprint GSA publishes on
idmanagement.gov; verifiers can independently re-confirm it there.

## Notes

One extracted intermediate carries an unusual DN whose first CN is
"Configuration" (the U.S. Department of State AD Root CA, issued by FCPCA G2) —
it is a genuine FPKI cert; its filename reflects the CN-slug naming convention.
