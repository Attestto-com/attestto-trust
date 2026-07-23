# Latvia — eIDAS qualified-trust mirror (DDUK Trusted List)

Independent mirror of the currently-granted CA certificates in Latvia's national eIDAS Trusted List, operated by **Digitālās drošības uzraudzības komiteja (DDUK)** — the **Digital Security Supervisory Committee**, Latvia's supervisory body for qualified trust services and national Trusted List scheme operator. As an EU / eIDAS participant, Latvia is referenced from the EU LOTL.

Official sources:
- DDUK Latvian Trusted List (ETSI TS 119 612): <https://trustlist.gov.lv/tsl/latvian-tsl.xml>
- eParaksts — LVRTC qualified trust services: <https://www.eparaksts.lv/>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**5 currently-granted CA certificates** from the accredited QTSP supervised by DDUK: **VAS Latvijas Valsts radio un televīzijas centrs** (LVRTC / NTRLV-40003011203), which operates the **eParaksts** and **LV eID** qualified certificate services — the **eParaksts ICA 2017**, **eParaksts ICA 2021**, **LV eID ICA 2017**, **LV eID ICA 2021**, and **LV eID ICA 2025** issuing CAs. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Latvian TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Latvia — signer subject `C=LV, O=Digitālās drošības uzraudzības komiteja, CN=Latvian Trust List Scheme Operator` (cert SHA-256 `8b044cf46b90f954f44383fc8ef252d66f1f7a6a1da8ca4f9b5ed9aff024dae2`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: the eParaksts and LV eID issuing CAs of the 2017 and 2021 generations use RSA-4096, and the LV eID ICA 2025 uses EC P-521.
- All 5 entries are LVRTC issuing CAs (eParaksts ICA 2017 / 2021 and LV eID ICA 2017 / 2021 / 2025).
- All 5 are issued by the self-signed **eParaksts Root CA**, which is not reflected in the Trusted List. A TSL-driven promotion therefore does not carry that root; it must be sourced and cross-checked separately if root-anchored path building is required.
- The eParaksts ICA 2017 and LV eID ICA 2017 have passed their notAfter and are retained as archived-but-granted entries; they surface under the Expired status filter.
- The legacy **E-ME SSI (RCA) / E-ME PSI (PCA)** PKI present in earlier list history is not under supervision and was excluded.
