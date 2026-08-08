# Germany — eIDAS qualified-trust mirror (BNetzA Trusted List)

Independent mirror of the currently-granted CA certificates in Germany's national eIDAS Trusted List, operated by the **Bundesnetzagentur (BNetzA)** — the German supervisory body for qualified trust services.

Official sources:
- Bundesnetzagentur German Trusted List (ETSI TS 119 612): <https://tl.bundesnetzagentur.de/TL-DE.XML>
- Bundesnetzagentur qualified trust services (eIDAS): <https://www.bundesnetzagentur.de/EN/Areas/QES/start.html>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**101 currently-granted CA certificates** from a federation of accredited QTSPs supervised by the Bundesnetzagentur: Bundesdruckerei/D-Trust, Deutsche Telekom / Telekom Security / Telesec, Bundesnotarkammer (BNotK), Atos, dgnservice, Bank-Verlag (BVtrust), medisign (MESIG), GD Netcetera, SIGN8, Utimaco, Deutsche Post, Governikus, exceet, and others. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The German TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Germany — signer subject `CN=German Trusted List Signer 14, O=Federal Network Agency, C=DE`.
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms observed span RSA-2048/3072/4096 and EC on P-256/P-384/P-521 as well as brainpoolP256r1 (a German curve preference).
- **The national eID root behind the German identity card (Personalausweis) is not included.** That root is operated by the BSI as part of the eID-notification mechanism, not the QTSP Trusted List, so a TSL-driven promotion does not carry it. If it is needed for eID document verification it must be sourced separately and cross-checked against the BSI, in the same way Italy retains its CIE roots outside the AgID QTSP list.
