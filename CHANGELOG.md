# Changelog

All notable changes to `@attestto/trust` will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-17

### Added
- **Argentina** trust anchors: AC Raiz Republica Argentina + Autoridad Certificante Firma Digital (ONTI). Extracted via AIA chain walk from Boletin Oficial signed PDF.
- **Brazil** trust anchors: ICP-Brasil root CAs v5, v10, v11, v12 from ITI official repository. v2 excluded (expired 2023).
- **Costa Rica** Sellado de Tiempo: CA POLITICA SELLADO DE TIEMPO - COSTA RICA v2 for timestamp authority validation.
- **Costa Rica** 2023 reissue: CA SINPE - PERSONA FISICA v2 (2023 reissue).
- Test suite: 18 tests covering exports structure, PEM format validation, manifest SHA-256 integrity, and cross-country completeness.
- ESM package with PEM string exports and `ALL_CERTS` metadata arrays per country.
- `generate-exports.mjs` and `refresh-manifest.mjs` scripts for automated cert lifecycle.
- `extract-chain-from-pdf.mjs` for extracting certificate chains from signed PDFs.

### Trust store
- 14 certificates across 3 countries:
  - **CR**: 8 certs (Root, PF policy, PJ policy, TSA policy, SINPE PF, SINPE PF 2023, SINPE PJ, Agente Electronico)
  - **BR**: 4 certs (ICP-Brasil v5, v10, v11, v12)
  - **AR**: 2 certs (AC Raiz + ACFD)

## [0.1.0] - 2026-04-07

### Added
- Initial release: Costa Rica BCCR trust anchors (Persona Fisica + Persona Juridica branches, 6 certs).
- Multi-country directory structure (`countries/<iso2>/current/`).
- Manifest format with SHA-256 hashes, subject, issuer, validity dates.
- Chain.pem concatenated bundles per country.
- README with architecture diagram, usage examples, and contribution guide.
