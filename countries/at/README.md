# Austria — eIDAS qualified-trust mirror (RTR / TKK Trusted List)

Independent mirror of the currently-granted CA certificates in Austria's national eIDAS Trusted List, operated by **Rundfunk und Telekom Regulierungs-GmbH (RTR)** — the supervisory authority acting for the **Telekom-Control-Kommission (TKK)**, the Austrian supervisory body for qualified trust services.

Official sources:
- RTR Austrian Trusted List (ETSI TS 119 612): <https://www.signatur.rtr.at/vertrauensliste.xml>
- RTR trust services (eIDAS): <https://www.rtr.at/TKP/was_wir_tun/vertrauensdienste/Start.en.html>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**39 currently-granted CA certificates** from a federation of accredited QTSPs supervised by RTR / TKK: A-Trust GmbH and A-Trust Ges. f. Sicherheitssysteme im elektr. Datenverkehr GmbH, e-commerce monitoring GmbH (GlobalTrust), PrimeSign GmbH, Swisscom IT Services Finance S.E., and SwissSign GmbH, among others. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Austrian TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Austria — signer subject `C=AT, O=Rundfunk und Telekom Regulierungs-GmbH, OU=Fachbereich Telekommunikation und Post, CN=Trusted List 9` (cert SHA-256 `5a05d58ab2bcede1affb73024de8796c8c299fb37f2e79036c7e09f45712abe6`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: 38 CAs use RSA-4096 and 1 uses RSA-2048.
- Three certificates in this set (a-sign-premium-mobile-05, a-sign-Premium-Sig-05, and EU-Identity-mobile-05) have passed their notAfter and are retained as archived-but-granted entries; they surface under the Expired status filter.
- The self-signed roots that issue these CAs are only partially reflected in the Trusted List, which lists issuing CAs rather than roots. A TSL-driven promotion therefore does not carry every root; any missing roots must be sourced and cross-checked separately if root-anchored path building is required.
