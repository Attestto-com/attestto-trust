# Italy (IT) — promotion readiness report

**Date:** 2026-07-23
**Staging snapshot:** `countries/it/staging/2026-07-21/`
**Source (list):** AgID national Trusted List (ETSI TS 119 612) — `https://eidas.agid.gov.it/TL/TSL-IT.xml`
**Source (promoted roots):** Ministero dell'Interno CIE Certification Authority portal — `https://www.cartaidentita.interno.gov.it/downloads/2024/05/NationalrootCAfortheItalianElectronicIdentityCard.zip`

## Decision: phase 1 = CIE national eID roots only

Italy's Trusted List is a **federation of ~25 accredited QTSPs + public bodies** (388 staged entries; 222 active), not a single national hierarchy. Almost every entry is a self-signed CA published directly in the TSL. Two facts drove the phase-1 scope:

1. **The correct control for a signed list is verifying the list's XAdES signature once** (PROMOTION.md, Strategy B), not cross-checking 222 fingerprints by hand. That verification layer is not yet built (documented future work). Bulk-promoting 222 anchors without it would assert authoritative trust with none of the required verification.
2. **The export model** (`generate-exports.mjs`, one named const per cert) is documented as needing adjustment before high-volume countries are promoted.

So phase 1 promotes only what is defensible under Strategy A today: **the two CIE national root CAs**, each hand-cross-checked against two independent sources. The full ~222-anchor QTSP set stays staged behind the XAdES work.

## Promoted anchors (2)

| Subject | Role | Key | Validity | SHA-256 |
|---|---|---|---|---|
| National root CA for the Italian Electronic Identity Card (2016) | root | RSA-4096 | 2016-06-06 → 2036-06-06 | `87364fb476e74962e7c495b9bbaf727813ee007cb56a0ada6ab9868123db267e` |
| National root CA for the Italian Electronic Identity Card (2024) | root | RSA-4096 | 2024-05-16 → 2044-05-16 | `40f425927e8a1e6a297a15c2a9d79e2221bf4fe25b2f21e3bfad53a1ba58b0d7` |

## Cross-check (both roots, two independent sources)

- **Source 1 — AgID national Trusted List** (`TSL-IT.xml`): both fingerprints recorded in `staging/2026-07-21/summary.json`.
- **Source 2 — CIE CA portal**: the official `.../2024/05/NationalrootCA….zip` contains both roots; extracted DER SHA-256 matches source 1 exactly for both.

The two roots share an identical Subject CN, so the monitor's staging step (filename derived from CN) kept only one file on disk; sourcing both directly from the CIE portal both recovered the second file and served as the independent cross-check.

## Not promoted (chain automatically)

The three active CIE issuing sub-CAs (SUBCA1 → 2031, SUBCA002 → 2035, SUBCA003 → 2039) are intermediates that validate by chaining to the roots above; `openssl verify` of SUBCA003 against the 2024 root passes. Per Strategy A they do not need individual promotion.

## Deferred (phase 2, pending XAdES verification)

The ~222 active QTSP anchors in the AgID TSL — Actalis, ArubaPEC, InfoCert, Namirial, Poste Italiane, Intesa, Intesi Group, TI Trust Technologies, Uanataca, Zucchetti, and public bodies (Banca d'Italia, Ministero della Difesa, Consiglio Nazionale del Notariato, InfoCamere, CNDCEC, etc.), plus 95 regional "CA Cittadini" and 37 time-stamp CAs. Promote once TSL XAdES-signature verification exists, per PROMOTION.md Strategy B.
