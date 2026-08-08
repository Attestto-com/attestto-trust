# Lithuania — eIDAS qualified-trust mirror (RRT Trusted List)

Independent mirror of the currently-granted CA certificates in Lithuania's national eIDAS Trusted List, operated by **Ryšių reguliavimo tarnyba (RRT)** — the **Communications Regulatory Authority of the Republic of Lithuania**, Lithuania's supervisory body for qualified trust services and national Trusted List scheme operator. As an EU / eIDAS participant, Lithuania is referenced from the EU LOTL.

Official sources:
- RRT Lithuanian Trusted List (ETSI TS 119 612): <https://elektroninisparasas.lt/LT-TSL.xml>
- RRT — Ryšių reguliavimo tarnyba: <https://www.rrt.lt/>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**11 currently-granted CA certificates** from the accredited QTSPs supervised by RRT: the ADIC issuing CAs (ADIC CA-A, ADIC CA-B, ADIC CA ECC) operated by **Asmens dokumentų išrašymo centras prie LR VRM (ADIC)**, the RCSC issuing CAs (RCSC IssuingCA, RCSC IssuingCA-2) operated by **VĮ Registrų centras (RCSC)**, and the MD CA operated by **Migracijos departamentas prie LR VRM (MD)**. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Lithuanian TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Lithuania — signer subject `C=LT, O=Communications Regulatory Authority of the Republic of Lithuania, CN=Tomas Lavrinavičius` (cert SHA-256 `cfaa26cd8a4837d90a89216d7f7e15cdf00cbbcd9edb0711705cfe0420859978`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (OCSP, qualified-certificate issuance profiles) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: RSA-2048, RSA-4096, and EC P-384.
- All 11 entries are QTSP issuing CAs; several older issuing-CA generations have passed their notAfter and are retained as archived-but-granted entries, surfacing under the Expired status filter.
- The self-signed roots that issue these CAs (ADIC Root CA, ADIC Root CA ECC, RCSC RootCA, and MD Root CA) are not reflected in the Trusted List, which lists issuing CAs rather than roots. A TSL-driven promotion therefore does not carry these roots; they must be sourced and cross-checked separately if root-anchored path building is required.
