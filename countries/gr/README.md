# Greece — eIDAS qualified-trust mirror (EETT Trusted List)

Independent mirror of the currently-granted CA certificates in Greece's national eIDAS Trusted List, operated by **EETT — the Hellenic Telecommunications and Post Commission** (Εθνική Επιτροπή Τηλεπικοινωνιών και Ταχυδρομείων) — the Greek supervisory body for qualified trust services.

Official sources:
- EETT Greek Trusted List (ETSI TS 119 612): <https://www.eett.gr/tsl/tl-el.xml>
- EETT trust services (eIDAS): <https://www.eett.gr/en/electronic-signatures/>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**105 currently-granted CA certificates** from a federation of accredited QTSPs supervised by EETT: HARICA (the Hellenic Academic and Research Institutions Certification Authority, operated by the Aristotle University of Thessaloniki), ADACOM, BYTE Computer, and the Hellenic Public Administration Certification Authority (APED), among others. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Greek TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Greece — signer subject `C=EL, L=Athens, O=Hellenic Telecommunications and Post Commission, EETT, CN=Hellenic Trusted List Scheme Operator-1` (cert SHA-256 `d57cf92cd96b39e352bf37e3d6f1bcfbd64db9f0c488f1daa4333410aa190175`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: 87 CAs use RSA-4096, 13 use EC P-384, 4 use RSA-2048, and 1 uses RSA-3072.
- Twenty-nine certificates in this set have passed their notAfter and are retained as archived-but-granted entries; they surface under the Expired status filter.
- The self-signed roots that issue these CAs (e.g. the HARICA RootCA 2015 / 2011, HARICA Qualified RSA/ECC Root CA 2021, BYTE Root CA, ADACOM Global Qualified CA, and APED Global Root CA) are not part of the Trusted List, which lists issuing CAs rather than roots. A TSL-driven promotion therefore does not carry those roots; they must be sourced and cross-checked separately if root-anchored path building is required.
