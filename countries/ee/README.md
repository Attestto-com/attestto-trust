# Estonia — eID / eIDAS trust mirror

Independent mirror of the X.509 anchors behind Estonia's national eID, one of the most mature digital-identity systems in the world. The state authority **RIA** (Riigi Infosüsteemi Amet / Information System Authority) contracts trust service providers to operate the PKI under eIDAS: **SK ID Solutions AS** historically, with the 2025 government root now operated by **Zetes Estonia OÜ**.

Official sources:
- SK ID Solutions repository: <https://www.skidsolutions.eu/resources/certificates/>
- eID PKI repository: <https://repository.eidpki.ee/crt/>
- Estonian Trusted List (ETSI TS 119 612): <https://sr.riik.ee/tsl/estonian-tsl.xml>

## Hierarchy (2026-07)

```
EE Certification Centre Root CA        ← root, RSA-2048, → 2030-12-17 (legacy, no longer issuing)
├── ESTEID-SK 2015                     ← ID-card qualified signatures
├── EID-SK 2016                        ← Mobiil-ID / Smart-ID qualified signatures
└── KLASS3-SK 2016                     ← qualified e-seal

EE-GovCA2018                           ← root, EC P-521, → 2033-09-05
└── ESTEID2018                         ← ID-card qualified signatures

EEGovCA2025 (Zetes Estonia OÜ)         ← root, EC P-384, → 2040-05-05
└── ESTEID2025                         ← ID-card qualified signatures

SK ID Solutions ROOT G1E               ← root, EC P-521, → 2041-10-04
├── SK ID Solutions EID-Q 2021E / 2024E
└── SK ID Solutions ORG 2021E

SK ID Solutions ROOT G1R               ← root, RSA-4096, → 2041-10-04
├── SK ID Solutions EID-Q 2021R / 2024R
└── SK ID Solutions ORG 2021R
```

See [`current/manifest.json`](current/manifest.json) for SHA-256, subject, issuer, key algorithm, CRL/OCSP, and validity for each file, and [`revocation.json`](revocation.json) for the CRL freshness snapshot.

## Notes

- **Five roots, not one hierarchy.** Estonia's eID has evolved across TSPs and generations; each root anchors a distinct set of issuing CAs. Every one of the eleven issuing CAs in this mirror cryptographically verifies against one of the five roots (`openssl verify`).
- **First mixed RSA/EC entry in this directory.** Roots span RSA-2048, RSA-4096, EC P-384, and EC P-521.
- **The legacy `EE Certification Centre Root CA` (RSA-2048) is being retired** and no longer issues new CAs, but remains a valid anchor for certificates already issued under it (valid to 2030-12-17).
- **The 2025 government root moved to Zetes Estonia OÜ** — the Estonian eID card contract changed hands in 2025, so `EEGovCA2025` / `ESTEID2025` carry a different operator than the SK-operated roots.
- Root fingerprints were sourced from the SK ID Solutions repository and `crt.eidpki.ee`, and cross-checked against SK's published SHA-1 fingerprints. See [`PROMOTION-READINESS-2026-07-23.md`](PROMOTION-READINESS-2026-07-23.md).
