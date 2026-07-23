# Poland — eIDAS qualified-trust mirror (NCCert Trusted List)

Independent mirror of the currently-granted CA certificates in Poland's national eIDAS Trusted List, operated by **Narodowe Centrum Certyfikacji (NCCert)** — the national certification root run by **Narodowy Bank Polski (NBP)** — under the supervision of the **minister właściwy do spraw informatyzacji** (the minister competent for computerisation), Poland's supervisory body for qualified trust services.

Official sources:
- NCCert Polish Trusted List (ETSI TS 119 612): <https://www.nccert.pl/tsl/PL_TSL.xml>
- NCCert — Narodowe Centrum Certyfikacji: <https://www.nccert.pl/>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**29 currently-granted CA certificates** from a federation of accredited QTSPs supervised by the minister competent for computerisation: Asseco Data Systems / CERTUM, Krajowa Izba Rozliczeniowa (KIR) / COPE SZAFIR, EuroCert, CenCert / Enigma Systemy Ochrony Informacji, and Polska Wytwórnia Papierów Wartościowych (PWPW) / Sigillum, among others. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Polish TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Poland — signer subject `C=PL, O=Narodowy Bank Polski, CN=Polish TSL Operator 2024` (cert SHA-256 `446a041a550bc51b92525ef7e540090b2df67f0852e5c7addb96661cce330596`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: 21 CAs use RSA-4096, 7 use RSA-2048, and 1 uses EC P-384.
- Eight certificates in this set have passed their notAfter and are retained as archived-but-granted entries; they surface under the Expired status filter.
- The self-signed roots that issue these CAs are only partially reflected in the Trusted List, which lists issuing CAs rather than roots. A TSL-driven promotion therefore does not carry every root; any missing roots must be sourced and cross-checked separately if root-anchored path building is required.
