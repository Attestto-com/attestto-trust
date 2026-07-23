# Hungary — eIDAS qualified-trust mirror (NMHH Trusted List)

Independent mirror of the currently-granted CA certificates in Hungary's national eIDAS Trusted List, operated by the **Nemzeti Média- és Hírközlési Hatóság (NMHH)** — the **National Media and Infocommunications Authority**, Hungary's supervisory body for qualified trust services and national Trusted List scheme operator.

Official sources:
- NMHH Hungarian Trusted List (ETSI TS 119 612): <https://www.nmhh.hu/tl/pub/HU_TL.xml>
- NMHH — National Media and Infocommunications Authority: <https://english.nmhh.hu/>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**62 currently-granted CA certificates** from a federation of accredited QTSPs supervised by the NMHH: Microsec zrt. / e-Szignó, NETLOCK Kft., and the Government CA / Kormányzati Hitelesítés Szolgáltató operated by NISZ Nemzeti Infokommunikációs Szolgáltató Zrt., among others. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Hungarian TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Hungary — signer subject `C=HU, L=Budapest, O=National Media and Infocommunications Authority, Hungary, CN=Hungarian Trusted List Scheme Operator` (cert SHA-256 `264c843f8ef85a822cf9612c680609a0fce3171a7496ec4ca6b810411274f34d`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: 23 CAs use RSA-2048, 16 use EC P-384, 11 use RSA-4096, 11 use EC P-256, and 1 uses RSA-3072.
- Six certificates in this set have passed their notAfter and are retained as archived-but-granted entries; they surface under the Expired status filter.
- The self-signed roots that issue these CAs are only partially reflected in the Trusted List, which lists issuing CAs rather than roots. A TSL-driven promotion therefore does not carry every root; any missing roots must be sourced and cross-checked separately if root-anchored path building is required.
