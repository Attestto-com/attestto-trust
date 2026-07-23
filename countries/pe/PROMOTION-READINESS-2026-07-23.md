# Peru (PE) — promotion readiness report

**Date:** 2026-07-23
**Staging snapshot:** `countries/pe/staging/2026-07-20/`
**Source:** INDECOPI/IOFE official Trusted List (ETSI TS 119 612) — `https://iofe.indecopi.gob.pe/TSL/tsl-pe.xml`
**TSL content SHA-256:** `53ee38f2d47bc7ac37322881f7b37f812a93532785ee797e566c9fa72f407bc8` (338,302 bytes, Last-Modified 2026-06-30)
**Page TLS fingerprint:** `3e529da46134cc1e99f98567ee730a047f94548bb90f254d990884e20bc0913d`

## Provenance

- Fetched over HTTPS from Peru's national accreditation authority (INDECOPI), the government body that supervises IOFE (Infraestructura Oficial de Firma Electrónica). This is the authoritative national trusted list.
- **The monitor does NOT verify the TSL's XML (XAdES) signature** — trust currently rests on HTTPS + recorded TLS fingerprint only. Per `scripts/monitors/PROMOTION.md`, independent cross-check of national root fingerprints is REQUIRED before promotion. Each staged cert carries a `crossCheckReminder` to that effect.

## Inventory

- **70 certs staged total** → **54 active** (valid at 2026-07-23), **16 expired**.
- ~31 distinct roots; the rest intermediates.
- Sourced from RENIEC, ONPE, PCM/ECERNEP (state) plus ~25 INDECOPI-accredited commercial CAs (Camerfirma Peru, ANF, WISeKey, Firmaprofesional, Acepta, BIT4ID/UANATACA, etc.).

### National authorities (the strategic core)

| Authority | Cert | Role | Status |
|---|---|---|---|
| **RENIEC** | RENIEC Certification Authority | root | ✅ active → 2030-07-16 |
| **RENIEC** | RENIEC High Grade Certification Authority | root | ✅ active → 2030-07-16 |
| RENIEC | Class I/II/III (+High Grade) CAs (×6) | intermediate | ⛔ **all expired 2020-07-18** |
| **RENIEC/state** | ECERNEP PERU CA ROOT 3 | root | ✅ active → 2042-08-10 |
| **RENIEC/state** | ECEP-RENIEC | intermediate | ✅ active → 2033-08-10 |
| RENIEC | RENIEC EREP Persona Natural DNIe | root | ⛔ expired 2023-03-19 (flagged not-under-supervision) |
| **ONPE** (electoral) | ECEP-ONPE-ELECTORAL CA ROOT 5 | intermediate | ✅ active → 2038-08-06 |
| **ONPE** | ECEP-ONPE CA ROOT 5 | intermediate | ✅ active → 2038-08-06 |
| **PCM/state** | ECERNEP PERU CA ROOT 5 | root | ✅ active → 2047-07-01 |
| **PCM/state** | ECERNEP PERU CA ROOT 6 | root | ✅ active → 2047-09-03 |

## Findings / flags

1. **RENIEC's own Class I/II/III intermediates are all expired (2020).** They validate only historical signatures. Current RENIEC-issued certs appear to chain through the **ECERNEP PERU / ECEP-RENIEC** state path (active), not the legacy RENIEC Class intermediates.
2. **The active DNIe (citizen national-ID) root is gone** — `RENIEC EREP Persona Natural DNIe` expired 2023-03-19 and the TSL marks the DNIe entry "not under supervision." So the citizen-DNIe verification path is NOT currently covered by an active anchor in this snapshot. Worth confirming what replaced it.
3. **2 orphan intermediates** (active but their root is absent from the TSL): `WISeKey CertifyID Advanced GB CA 2` and `Camerfirma TSA II - 2014`. Non-national; low priority.
4. **No XML-signature verification** on the TSL — independent fingerprint cross-check is mandatory for anything promoted.

## Recommended promotion scope (phase 1)

Promote **only the active national trust anchors**, after independent fingerprint cross-check:

- ECERNEP PERU CA ROOT 3, ROOT 5, ROOT 6 (state roots — anchor RENIEC + ONPE current chains)
- RENIEC Certification Authority, RENIEC High Grade Certification Authority (RENIEC roots)
- ECEP-RENIEC, ECEP-ONPE-ELECTORAL CA ROOT 5, ECEP-ONPE CA ROOT 5 (active state intermediates)

Explicitly **defer**: all expired certs (candidate for a future `archive/` for LTV, not `current/`), and the ~25 commercial accredited CAs (phase 2 — larger trust surface, promote deliberately).

## Required before promotion (the gate)

Independently verify the SHA-256 of each national root above against a source **other than** the INDECOPI TSL (RENIEC's / PCM's own published certificates), since the TSL signature isn't machine-verified here. Only fingerprints that match an independent authoritative source get promoted.

---

## Promotion executed — 2026-07-23

**Decision (maintainer):** scope = national anchors only; trust basis = INDECOPI IOFE TSL provenance (HTTPS + recorded TLS fingerprint), **no independent external cross-check performed** this round. This is auditable here for a future re-verification pass.

**Promoted to `countries/pe/current/` (8 certs):**

| Cert | Role | Key | Valid to |
|---|---|---|---|
| ECERNEP PERU CA ROOT 3 | root | RSA-4096 | 2042-08-10 |
| ECERNEP PERU CA ROOT 5 | root | RSA-4096 | 2047-07-01 |
| ECERNEP PERU CA ROOT 6 | root | **EC P-521** | 2047-09-03 |
| RENIEC Certification Authority | root | RSA-4096 | 2030-07-16 |
| RENIEC High Grade Certification Authority | root | RSA-4096 | 2030-07-16 |
| ECEP-RENIEC | intermediate | RSA-4096 | 2033-08-10 |
| ECEP-ONPE-ELECTORAL CA ROOT 5 | intermediate | RSA-4096 | 2038-08-06 |
| ECEP-ONPE CA ROOT 5 | intermediate | RSA-4096 | 2038-08-06 |

**Tooling change:** `scripts/refresh-manifest.mjs` gained an EC fallback — node-forge (RSA path, unchanged, so existing manifests stay byte-identical) with a `node:crypto` X509Certificate fallback for non-RSA keys. Needed because ECERNEP ROOT 6 is EC P-521; node-forge threw `OID is not RSA`.

**Not promoted (deferred):** ~25 accredited commercial CAs (phase 2), all expired certs (candidate for a future `archive/` for long-term validation), and the expired citizen-DNIe root. **Follow-up:** confirm the current active anchor for the natural-person DNIe path, which this TSL snapshot leaves uncovered.
