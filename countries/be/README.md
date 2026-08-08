# Belgium — eIDAS qualified-trust mirror (FPS Economy Trusted List)

Independent mirror of the currently-granted CA certificates in Belgium's national eIDAS Trusted List, operated by the **FPS Economy — the Federal Public Service Economy, S.M.E.s, Self-employed and Energy** (Federale Overheidsdienst Economie, K.M.O., Middenstand en Energie / SPF Économie, P.M.E., Classes moyennes et Énergie) — the Belgian supervisory body for qualified trust services.

Official sources:
- FPS Economy Belgian Trusted List (ETSI TS 119 612): <https://tsl.belgium.be/tsl-be-v6.xml>
- FPS Economy trust services (eIDAS): <https://economie.fgov.be/en/themes/online/electronic-signatures-time>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**52 currently-granted CA certificates** from a federation of accredited QTSPs supervised by the FPS Economy: Belgian Mobile ID (itsme), Zetes and ZetesConfidens, GMO GlobalSign nv/sa, DigiCert QuoVadis Belgium, Certipost's Belgium Root CA hierarchy behind the Belgian eID, Banqup, and Docbyte, among others. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Belgian TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Belgium — signer subject `C=BE, ST=Brussels Hoofdstedelijk Gewest, L=Sint-Joost-ten-Node, O=Federale Overheidsdienst Economie, K.M.O, Middenstand en Energie, CN=Federale Overheidsdienst Economie, K.M.O, Middenstand en Energie, 2.5.4.97=NTRBE-0314.595.348` (cert SHA-256 `fbec3a3b1bb26cd02e7737b9e3ea289caa7d45adf608265122ea0db3d1de66ce`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: 31 CAs use RSA-4096, 17 use EC P-384, 3 use EC P-521, and 1 uses EC P-256.
- Two certificates in this set (QuoVadis Belgium Issuing CA G2 and ZETES TSP QUALIFIED CA 001) have passed their notAfter and are retained as archived-but-granted entries; they surface under the Expired status filter.
- The self-signed roots that issue these CAs (e.g. Belgium Root CA3 / CA4 / CA6, the GlobalSign roots, and the QuoVadis / DigiCert roots) are only partially reflected in the Trusted List, which lists issuing CAs rather than roots. A TSL-driven promotion therefore does not carry every root; any missing roots must be sourced and cross-checked separately if root-anchored path building is required.
