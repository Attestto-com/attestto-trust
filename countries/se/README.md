# Sweden — eIDAS qualified-trust mirror (PTS Trusted List)

Independent mirror of the currently-granted CA certificates in Sweden's national eIDAS Trusted List, operated by **Post- och telestyrelsen (PTS)** — the **Swedish Post and Telecom Authority**, Sweden's supervisory body for qualified trust services and national Trusted List scheme operator. As an EU / eIDAS participant, Sweden is referenced from the EU LOTL.

Official sources:
- PTS Swedish Trusted List (ETSI TS 119 612): <https://trustedlist.pts.se/tlv6/SE-TL.xml>
- PTS — Post- och telestyrelsen: <https://www.pts.se/>
- EU LOTL (List of the Lists): <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Scope

**8 currently-granted CA certificates** from the accredited QTSPs supervised by PTS: the IDnow Trust Services PKI (IDnow TS Root CA 01 plus its qualified-signature, qualified-seal, timestamp, and OCSP issuing CAs) operated by **IDnow Trust Services AB**, the ZealiD issuing and timestamp CAs operated by **ZealiD AB**, and the self-signed **TrustWeaver CA** operated by **TrustWeaver AB / Pagero**. These cover qualified e-signature, qualified e-seal, qualified timestamping, and qualified website authentication (QWAC / PSD2).

## How it was promoted

The set was promoted wholesale after verifying the Trusted List's enveloped XAdES signature through the EU LOTL chain of trust (`scripts/monitors/verify-eu-tsl.mjs`, PROMOTION.md Strategy B):

1. The EU LOTL signature was verified against the pinned European Commission signing anchor.
2. The Swedish TSL's signature was verified, and its signer authorized against the exact identity the LOTL declares for Sweden — signer subject `C=SE, O=Swedish Post and Telecom Agency (PTS), CN=Swedish Post and Telecom Agency (PTS)` (cert SHA-256 `2fa65e20bc76a7dc3a128b63926d51704c4934e533fd712df119825370d42948`).
3. Only services with a currently-granted status and a CA / qualified-certificate service type were selected. Withdrawn, deprecated, and non-CA services were dropped.

Because the list carries a single authority seal that vouches for every certificate it contains (eIDAS Art. 22), the maintainer review is per-list, not per-certificate. Verification evidence is in [`VERIFICATION.md`](VERIFICATION.md).

See [`current/manifest.json`](current/manifest.json) for the SHA-256, subject, key algorithm, CRL/OCSP endpoints, and validity of each certificate.

## Notes

- Every certificate in the set uses RSA-4096.
- The 8 entries span three QTSP PKIs: IDnow Trust Services (5 CAs including its self-signed IDnow TS Root CA 01), ZealiD (2 issuing/timestamp CAs), and the self-signed TrustWeaver CA.
- The ZealiD Issuing CA 2020 and ZealiD TSA CA 2022 are issued by the ZealiD Root CA 2020, which is not reflected in the Trusted List. A TSL-driven promotion therefore does not carry that root; it must be sourced and cross-checked separately if root-anchored path building is required.
