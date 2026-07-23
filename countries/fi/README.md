# Finland — eIDAS qualified-trust mirror (Traficom Trusted List)

Independent mirror of the currently-granted CA certificates in Finland's national eIDAS Trusted List, operated by **Liikenne- ja viestintävirasto (Traficom)** — the **Finnish Transport and Communications Agency**, Finland's supervisory body for qualified trust services and national Trusted List scheme operator. As an EU / eIDAS participant, Finland is referenced from the EU LOTL.

Official sources:
- Traficom Finnish Trusted List (ETSI TS 119 612): <https://dp.trustedlist.fi/fi-tl-v6.xml>
- Traficom — Liikenne- ja viestintävirasto: <https://www.traficom.fi/>
- DVV — FINeID public-sector PKI: <https://www.fineid.fi/>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**12 currently-granted CA certificates** from the FINeID public-sector PKI operated by **Digi- ja väestötietovirasto (DVV)** — the Digital and Population Data Services Agency (formerly Väestörekisterikeskus, VRK) — and supervised by Traficom: the DVV/VRK citizen, organisational, service-provider, and social-welfare & healthcare issuing CAs under the DVV Gov. Root CA - G3 and VRK Gov. Root CA - G2. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Finnish TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Finland — signer subject `C=FI, O=Liikenne- ja viestintävirasto, CN=SchemeOperator II` (cert SHA-256 `ba5cc469d6212114800e63ad770f0aa58a1ba0db54c76d32fdab33061153fd7d`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: 8 CAs use RSA-4096 and 4 use EC P-384.
- All 12 entries are DVV/VRK issuing CAs; none in this set have passed their notAfter.
- The self-signed roots that issue these CAs (DVV Gov. Root CA - G3 ECC/RSA and VRK Gov. Root CA - G2) are not reflected in the Trusted List, which lists issuing CAs rather than roots. A TSL-driven promotion therefore does not carry these roots; they must be sourced and cross-checked separately if root-anchored path building is required.
