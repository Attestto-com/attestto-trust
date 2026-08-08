# Verification — Uruguay (uy)

**Promoted:** 2026-07-23 · **Staging snapshot:** `staging/2026-07-20/`
**Model:** direct-cert (Strategy A per `scripts/monitors/PROMOTION.md`)

## Source

- **Authority:** AGESIC — Unidad de Certificación Electrónica
- **Fetched over HTTPS** from AGESIC's official ACRN endpoint:
  `https://www.agesic.gub.uy/acrn/acrn.cer`
- **Source TLS fingerprint (SHA-256):** `50e2c393a2d1813b527c52fe8f75591d68f18ba41537c4bc8572411961e6320a`

## Trust basis

Direct-cert source: AGESIC publishes the actual self-signed national root
(Autoridad Certificadora Raíz Nacional de Uruguay). Promotion trust rests on
**HTTPS + the recorded TLS fingerprint** of the AGESIC origin. Accredited
subordinate CAs chain to this root and validate at verification time; only the
national root is promoted.

## Root anchor (independently cross-checkable)

| Cert | SHA-256 | Key | Valid to |
|---|---|---|---|
| Autoridad Certificadora Raíz Nacional de Uruguay | `5533a0401f612c688ebce5bf53f2ec14a734eb178bfae00e50e85dae6723078a` | RSA-4096 | 2031-10-29 |

## Notes

No machine-verified signed list for this source; trust is origin-HTTPS-based. A
future pass may cross-check the root fingerprint against a second published
AGESIC source.
