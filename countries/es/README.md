# Spain — TSL trust mirror

Independent mirror of Spain's eIDAS qualified-trust PKI, sourced from the Spanish national Trusted List (Lista de Servicios de Confianza), verified via XAdES signature chain from the EU List of Trusted Lists (LOTL).

Official source: <https://tsl.digital.gob.es/TSL.xml>  
LOTL entry: <https://ec.europa.eu/tools/lotl/eu-lotl.xml>

## Coverage (2026-07)

139 production eIDAS qualified-trust CA certificates from Spain's national Trusted List, spanning multiple qualified trust service providers including FNMT-RCM, Camerfirma, AC Notariado, and others.

See [`current/manifest.json`](current/manifest.json) for SHA-256, subject, issuer, and validity for each file.

## Verification

TSL XAdES signature verified against LOTL-declared signer identity:
- **Signer:** C=ES, O=MINISTRY OF ECONOMIC AFFAIRS AND DIGITAL TRANSFORMATION, CN=SPANISH TRUST SCHEME OPERATOR
- **SHA-256:** `180cd536dad2b5ac933236d9dcd55d17afcd9949fed08189b8ae86fe7c2bc3a7`

See [`VERIFICATION.md`](VERIFICATION.md) for the full verification report.

## Notes

- Certificates here are **production** eIDAS qualified-signature trust anchors, not test certificates. They are the authoritative CAs used to validate real legally-binding electronic signatures in Spain.
- Spain's national infrastructure supports qualified electronic signatures through multiple trust service providers regulated under eIDAS (EU 910/2014) and Ley 6/2020. FNMT-RCM (Fábrica Nacional de Moneda y Timbre) is the primary public-sector provider.
- Being listed on the signed Trusted List carries constitutive legal effect under eIDAS Art. 22 — inclusion on the list IS the legal trust decision.
