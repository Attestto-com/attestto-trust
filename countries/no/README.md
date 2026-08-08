# Norway — eIDAS qualified-trust mirror (Nkom Trusted List)

Independent mirror of the currently-granted CA certificates in Norway's national eIDAS Trusted List, operated by **Nasjonal kommunikasjonsmyndighet (Nkom)** — the **Norwegian Communications Authority**, Norway's supervisory body for qualified trust services and national Trusted List scheme operator. As an EEA / eIDAS participant, Norway is referenced from the EU LOTL.

Official sources:
- Nkom Norwegian Trusted List (ETSI TS 119 612): <https://nkom.no/files/TL/NO_TL.xml>
- Nkom — Nasjonal kommunikasjonsmyndighet: <https://nkom.no/>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**26 currently-granted CA certificates** from a federation of accredited QTSPs supervised by Nkom: BankID / Bankenes ID-tjeneste AS, Buypass AS, Commfides Norge AS, and Scrive AS, among others. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Norwegian TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Norway — signer subject `C=NO, O=NASJONAL KOMMUNIKASJONSMYNDIGHET, OU=IT, CN=NASJONAL KOMMUNIKASJONSMYNDIGHET, 2.5.4.97=NTRNO-974446871` (cert SHA-256 `818582f37c3cc9cc17443868d488aede65901d0e9a6d6c3a2124ca70c23cd40e`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services (time-stamping-only, OCSP, validation) were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: 20 CAs use RSA-4096, 4 use RSA-2048, and 2 use EC P-384.
- Eight certificates in this set have passed their notAfter and are retained as archived-but-granted entries; they surface under the Expired status filter.
- The self-signed roots that issue these CAs are only partially reflected in the Trusted List, which lists issuing CAs rather than roots. A TSL-driven promotion therefore does not carry every root; any missing roots must be sourced and cross-checked separately if root-anchored path building is required.
