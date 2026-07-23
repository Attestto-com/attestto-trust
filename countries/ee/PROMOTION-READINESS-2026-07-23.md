# Estonia (EE) — promotion readiness report

**Date:** 2026-07-23
**Staging snapshot:** `countries/ee/staging/2026-07-21/`
**Source (intermediates):** Estonian national Trusted List (ETSI TS 119 612) — `https://sr.riik.ee/tsl/estonian-tsl.xml`
**Source (roots):** SK ID Solutions repository (`skidsolutions.eu` / `c.sk.ee`) and the eID PKI repository (`crt.eidpki.ee`)

## Provenance

- The eleven issuing CAs were extracted from Estonia's national Trusted List, published by RIA (Information System Authority). This is the authoritative national source.
- The five roots were **not** in the TSL snapshot (the staged entries are all intermediates), so they were sourced independently from the SK ID Solutions certificate repository and `crt.eidpki.ee`, then hash-pinned into `current/`.
- Root fingerprints were **cross-checked against SK ID Solutions' published SHA-1 values** (four of five). `EEGovCA2025` is very new and not yet listed on SK's certificates page; it was taken from the official Estonian eID PKI repository (`crt.eidpki.ee`) and is self-signed. An independent second-source fingerprint cross-check for `EEGovCA2025` remains advisable.

### Root fingerprints (SHA-256, as pinned)

| Root | Key | SHA-1 cross-check | SHA-256 |
|---|---|---|---|
| EE Certification Centre Root CA | RSA-2048 | ✅ SK published | `3e84ba4342908516e77573c0992f0979ca084e4685681ff195ccba8a229b8a76` |
| EE-GovCA2018 | EC P-521 | ✅ SK published | `f164abe507407408292af1fa368842b7482dd0d346d79ee8ecb94467d57579a0` |
| EEGovCA2025 (Zetes) | EC P-384 | ⚠️ from crt.eidpki.ee (not yet on SK page) | `d482be019730144fe90527a987f4f24e165c9aa75c93f35245549a7c4748198e` |
| SK ID Solutions ROOT G1E | EC P-521 | ✅ SK published | `a272de102a8038f7e100eacfb6db1c930d3cb9f51d76b218de3a4a433bcfd182` |
| SK ID Solutions ROOT G1R | RSA-4096 | ✅ SK published | `d012da1a62193928c5b4d89d2a72495b1f77ea5d54f23956bc1df2f75528fefb` |

## Inventory

- **16 certs promoted:** 5 roots + 11 intermediates. All active (valid at 2026-07-23); none expired.
- Every intermediate cryptographically verifies against one of the five roots (`openssl verify -CAfile` of the five-root bundle — 11/11 OK).
- CRL freshness: 5/5 CRLs fetched OK (`revocation.json`); earliest `nextUpdate` 2027-01-28 (refresh by then).

### Certificate set

| Subject | Role | Key | Validity |
|---|---|---|---|
| EE Certification Centre Root CA | root | RSA-2048 | 2010-10-30 → 2030-12-17 |
| EE-GovCA2018 | root | EC P-521 | 2018-09-05 → 2033-09-05 |
| EEGovCA2025 | root | EC P-384 | 2025-05-06 → 2040-05-05 |
| SK ID Solutions ROOT G1E | root | EC P-521 | 2021-10-04 → 2041-10-04 |
| SK ID Solutions ROOT G1R | root | RSA-4096 | 2021-10-04 → 2041-10-04 |
| ESTEID-SK 2015 | intermediate | RSA-4096 | 2015-12-17 → 2030-12-17 |
| EID-SK 2016 | intermediate | RSA-4096 | 2016-08-30 → 2030-12-17 |
| KLASS3-SK 2016 | intermediate | RSA-4096 | 2016-12-08 → 2030-12-17 |
| ESTEID2018 | intermediate | EC P-521 | 2018-09-20 → 2033-09-05 |
| ESTEID2025 | intermediate | EC P-384 | 2025-05-07 → 2040-05-03 |
| SK ID Solutions EID-Q 2021E / 2021R | intermediate | EC P-384 / RSA-4096 | 2021-10-04 → 2036-10-04 |
| SK ID Solutions EID-Q 2024E / 2024R | intermediate | EC P-384 / RSA-4096 | 2024-07-02 → 2039-06-29 |
| SK ID Solutions ORG 2021E / 2021R | intermediate | EC P-384 / RSA-4096 | 2021-10-04 → 2036-10-04 |

## Findings / flags

1. **Legacy root retiring.** `EE Certification Centre Root CA` (RSA-2048) no longer issues new CAs per SK's public notice, but still anchors three active intermediates (ESTEID-SK 2015, EID-SK 2016, KLASS3-SK 2016) valid to 2030-12-17. Keep as an active anchor; plan to move to `archive/` after 2030.
2. **Operator change on the 2025 root.** `EEGovCA2025` is operated by **Zetes Estonia OÜ**, not SK ID Solutions — the Estonian ID-card contract changed hands in 2025. Provenance recorded in `meta.json`.
3. **`EEGovCA2025` second-source cross-check pending.** Sourced from `crt.eidpki.ee` (official) but not yet mirrored on SK's certificates page; re-verify its SHA-256 against SK once it is published there.
4. **No TSL XML-signature verification.** As with Peru, trust in the intermediate set rests on HTTPS + the national TSL, not an independent XAdES check of the list itself. Root fingerprints are independently cross-checked, which is the material control.

## Promotion scope (phase 1)

Promote **all 16** — the five national roots plus the eleven active qualified issuing CAs. Unlike Peru, Estonia's national set is small and entirely state-operated (no long tail of accredited commercial CAs to defer), so phase 1 is complete coverage of the current national eID trust surface.
