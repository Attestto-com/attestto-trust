# Italy — CIE national eID trust mirror

Independent mirror of the two national root CAs behind Italy's electronic identity card, the **Carta d'Identità Elettronica (CIE)**, operated by the **Ministero dell'Interno** (Direzione Centrale per i Servizi Demografici — CNSD).

Official sources:
- CIE Certification Authority: <https://www.cartaidentita.interno.gov.it/en/public-and-business-administration/certification-autority/>
- AgID Italian Trusted List (ETSI TS 119 612): <https://eidas.agid.gov.it/TL/TSL-IT.xml>

## Hierarchy (2026-07)

```
National root CA for the Italian Electronic Identity Card (2016)   ← root, RSA-4096, → 2036-06-06
└── Issuing sub CA … SUBCA1 / SUBCA002                             ← chains automatically

National root CA for the Italian Electronic Identity Card (2024)   ← root, RSA-4096, → 2044-05-16
└── Issuing sub CA … SUBCA003                                      ← chains automatically
```

The two issuing sub-CAs are **not** promoted individually: at verification time a signer's chain validates against a root in `current/`, so the sub-CAs validate themselves (see [`../../scripts/monitors/PROMOTION.md`](../../scripts/monitors/PROMOTION.md), Strategy A — promote the roots only).

See [`current/manifest.json`](current/manifest.json) for SHA-256, subject, key algorithm, CRL/OCSP, and validity, and [`revocation.json`](revocation.json) for the CRL freshness snapshot.

## Scope

**Phase 1 = CIE national eID only.** This entry covers the two national root CAs behind the Italian identity card. It does **not** yet cover Italy's wider qualified-signature ecosystem — a federation of ~25 accredited QTSPs (Actalis, ArubaPEC, InfoCert, Namirial, Poste Italiane, Intesa, TI Trust Technologies, Uanataca, and others), ~222 active anchors in the AgID Trusted List. Those are staged in [`staging/`](staging/) and deferred to a later phase pending **TSL XAdES-signature verification** — the right control at that scale (PROMOTION.md, Strategy B) rather than eyeballing 222 fingerprints by hand.

## Notes

- **Both roots cross-checked against two independent sources.** The 2016 (→2036) and 2024 (→2044) roots were downloaded from the Ministero dell'Interno CIE CA portal and their SHA-256 confirmed to match the AgID national Trusted List (`TSL-IT.xml`) exactly.
- Both roots share the same Subject CN; they are distinguished by validity window and fingerprint. The 2024 root is the current anchor (it signs SUBCA003, issued 2024); the 2016 root remains valid to 2036 for cards issued under it.
- See [`PROMOTION-READINESS-2026-07-23.md`](PROMOTION-READINESS-2026-07-23.md) for the full provenance and the rationale for deferring the QTSP set.
