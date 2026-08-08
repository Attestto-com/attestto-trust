# Denmark — eIDAS qualified-trust mirror (Digitaliseringsstyrelsen Trusted List)

Independent mirror of the currently-granted CA certificates in Denmark's national eIDAS Trusted List, operated by **Digitaliseringsstyrelsen** — the **Danish Agency for Digital Government** (Agency for Digitisation), Denmark's supervisory body for qualified trust services and national Trusted List scheme operator. As an EU / eIDAS participant, Denmark is referenced from the EU LOTL.

Official sources:
- Digitaliseringsstyrelsen Danish Trusted List (ETSI TS 119 612): <https://www.digst.dk/TSLDK_v6xml>
- Digitaliseringsstyrelsen — Danish Agency for Digital Government: <https://www.digst.dk/>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**5 currently-granted CA certificates** from the accredited QTSPs supervised by Digitaliseringsstyrelsen: the Danish State PKI (the self-signed **Den Danske Stat kvalificeret rod-CA** plus its qualified **udstedende-CA 1**) operated by **Den Danske Stat**, the self-signed **Penneo Qualified Root CA 06/22/RSA** operated by **Penneo A/S**, and the **IN Groupe Denmark Qualified issuing CA I** operated by **IN Groupe Denmark A/S**. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Danish TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Denmark — signer subject `C=DK, O=Digitaliseringsstyrelsen, CN=Jesper Egelund Siig` (cert SHA-256 `ebd5d5e16adb24be7553cde77f98d4b105bb5c5be46f51348e342c23dc3f10ef`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Key algorithms across the set are mixed: the Den Danske Stat kvalificeret rod-CA and the Penneo Qualified Root CA 06/22/RSA use RSA-4096, the Den Danske Stat kvalificeret udstedende-CA 1 uses RSA-3072, and the IN Groupe Denmark Qualified issuing CA I uses EC P-384.
- The 5 entries span three QTSP PKIs: the Danish State PKI (self-signed rod-CA plus its udstedende-CA 1), the self-signed Penneo Qualified Root CA 06/22/RSA, and the IN Groupe Denmark Qualified issuing CA I.
- The IN Groupe Denmark Qualified issuing CA I is issued by the IN Groupe Denmark Root CA, which is not reflected in the Trusted List. A TSL-driven promotion therefore does not carry that root; it must be sourced and cross-checked separately if root-anchored path building is required.
