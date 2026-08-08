# Netherlands — eIDAS qualified-trust mirror (RDI Trusted List)

Independent mirror of the currently-granted CA certificates in the Netherlands' national eIDAS Trusted List, operated by the **Rijksinspectie Digitale Infrastructuur (RDI)** — the Dutch supervisory body for qualified trust services (formerly Agentschap Telecom).

Official sources:
- RDI Dutch Trusted List (ETSI TS 119 612): <https://www.rdi.nl/site/binaries/content/assets/site-content/bestanden/current-tsl.xml>
- RDI qualified trust services (eIDAS): <https://www.rdi.nl/onderwerpen/vertrouwensdiensten>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**30 currently-granted CA certificates** from a federation of accredited QTSPs supervised by the RDI: the government PKIoverheid hierarchy (Staat der Nederlanden, operated by Logius), DigiCert QuoVadis, Digidentity, KPN, Cleverbase, and the UZI-register healthcare CAs (CIBG). These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Dutch TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for the Netherlands — signer subject `C=NL, O=Rijksinspectie Digitale Infrastructuur, CN=RDI NL TSL Signer 2`.
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- All 30 CAs in this set use RSA-4096, reflecting the uniform key policy of the Dutch PKIoverheid root program.
- One certificate (QuoVadis EU Issuing Certification Authority G4) has passed its notAfter and is retained as an archived-but-granted entry; it surfaces under the Expired status filter.
- The self-signed roots that issue these CAs (e.g. the Staat der Nederlanden and QuoVadis roots) are not part of the Trusted List, which lists issuing CAs rather than roots. A TSL-driven promotion therefore does not carry those roots; they must be sourced and cross-checked separately if root-anchored path building is required.
