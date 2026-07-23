# France — eIDAS qualified-trust mirror (ANSSI Trusted List)

Independent mirror of the currently-granted CA certificates in France's national eIDAS Trusted List, supervised by **ANSSI (Agence nationale de la sécurité des systèmes d'information)** — the French supervisory body for qualified trust services — and published on the national scheme-operator portal.

Official sources:
- French Trusted List (ETSI TS 119 612): <https://messervices.cyber.gouv.fr/visas/tl-fr_v6.xml>
- ANSSI qualified trust services (eIDAS): <https://cyber.gouv.fr/produits-services-qualifies>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**79 currently-granted CA certificates** from a federation of accredited QTSPs supervised by ANSSI: Certigna/Dhimyotis, CertEurope/Oodrive, Certinomis/Docaposte, ChamberSign France, Universign/Cryptolog, Cegedim, Arkhineo, Imprimerie Nationale, Contralia, and others. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The French TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for France — signer subject `C=FR, O=ANTS, CN=Mathieu JORRY 3310003898jm` (Agence Nationale des Titres Sécurisés, the French scheme operator that seals the list).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms observed span RSA-2048/3072/4096. (France's qualified CAs in this list are RSA-only; no EC roots were present in the granted set.)
- **One certificate (Certigna Identity Plus CA) has passed its notAfter** and is retained as an archived-but-granted entry; it surfaces under the Expired status filter rather than the current view.
- The national eID roots behind French identity documents (CNIe / France Identité) belong to the eID-notification mechanism rather than the QTSP Trusted List, so a TSL-driven promotion does not carry them; if needed for eID document verification they must be sourced separately and cross-checked, in the same way Italy retains its CIE roots outside the AgID QTSP list.
