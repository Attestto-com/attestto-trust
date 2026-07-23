# Portugal — eIDAS qualified-trust mirror (GNS / SCEE Trusted List)

Independent mirror of the currently-granted CA certificates in Portugal's national eIDAS Trusted List, operated by the **Gabinete Nacional de Segurança (GNS)** — the **Autoridade Credenciadora**, Portugal's supervisory body for qualified trust services and operator of the SCEE (Sistema de Certificação Eletrónica do Estado).

Official sources:
- GNS Portuguese Trusted List (ETSI TS 119 612): <https://www.gns.gov.pt/media/TSLPT.xml>
- GNS Autoridade Credenciadora / SCEE (trust services): <https://www.gns.gov.pt/scee.aspx>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**30 currently-granted CA certificates** from a federation of accredited QTSPs supervised by GNS: DigitalSign — Certificadora Digital, MULTICERT — Serviços de Certificação Electrónica, Global Trusted Sign, and the state Cartão de Cidadão / Chave Móvel Digital certification entities operated by AMA — Agência para a Modernização Administrativa, among others. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Portuguese TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Portugal — signer subject `C=PT, O=Gabinete Nacional de Segurança, CN=PORTUGUESE TRUST LIST SCHEME OPERATOR` (cert SHA-256 `13b31474c9d6e1b5d0edff4b1963051ff2ffe91deedd1bc51652a4dbfc8cf7f0`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: 19 CAs use RSA-4096, 7 use RSA-2048, and 4 use EC P-384.
- No certificate in this set has passed its notAfter at time of promotion.
- The self-signed roots that issue these CAs are only partially reflected in the Trusted List, which lists issuing CAs rather than roots. A TSL-driven promotion therefore does not carry every root; any missing roots must be sourced and cross-checked separately if root-anchored path building is required.
