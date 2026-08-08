# Czech Republic — eIDAS qualified-trust mirror (DIA Trusted List)

Independent mirror of the currently-granted CA certificates in the Czech Republic's national eIDAS Trusted List, operated by the **Digitální a informační agentura (DIA)** — the **Digital and Information Agency**, the Czech Republic's supervisory body for qualified trust services and national Trusted List scheme operator.

Official sources:
- DIA Czech Trusted List (ETSI TS 119 612): <https://tsl.gov.cz/publ/TSL_CZ.xtsl>
- DIA — Digitální a informační agentura: <https://www.dia.gov.cz/>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**34 currently-granted CA certificates** from a federation of accredited QTSPs supervised by the DIA: První certifikační autorita, a.s. (I.CA), Česká pošta, s.p. / PostSignum, Software602 a.s. / ACAeID, eIdentity a.s., and the Komerční banka root, among others. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Czech TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for the Czech Republic — signer subject `G=Filip, SN=Bílek, CN=Filip Bílek, O=Digitální a informační agentura, 2.5.4.97=NTRCZ-17651921, C=CZ` (cert SHA-256 `553819860388eb5dc4836bf16897a58a0964cd04d1acddfc4b2e36d0908e10ae`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: 12 CAs use RSA-2048, 10 use RSA-4096, 6 use RSA-3072, 5 use EC P-521, and 1 uses EC P-384.
- Fourteen certificates in this set have passed their notAfter and are retained as archived-but-granted entries; they surface under the Expired status filter.
- The self-signed roots that issue these CAs are only partially reflected in the Trusted List, which lists issuing CAs rather than roots. A TSL-driven promotion therefore does not carry every root; any missing roots must be sourced and cross-checked separately if root-anchored path building is required.
