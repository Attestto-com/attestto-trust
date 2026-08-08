# Changelog

All notable changes to `@attestto/trust` will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Mexico** sourced: AC del Servicio de Administracion Tributaria (SAT) and Agencia Registradora Central, 5 anchors.
- **Dominican Republic** sourced through the INDOTEL ETSI Trusted List, 16 anchors staged for review.
- Monitor status documentation extended to the Dominican Republic, Guatemala, Honduras and El Salvador, with links to the per-country sourcing issues.

### Fixed
- Country pages rendered the raw ISO code instead of the display name for countries added without a display-name entry.
- README described Mexico, Chile, Uruguay and Panama as "staged" when all four are promoted and live, and listed Ecuador as staged when it has never been sourced. A directory's own statement of which national roots it carries has to be accurate.

### Notes
- **Mexico**: the SAT subordinate CAs (`ac-sat-ac6`, `ac-sat-ac7`) carry double-encoded UTF-8 in their own subject fields (`AdministraciÃ³n`, `Ciudad de MÃ©xico`, `CuauhtÃ©moc`), placed there by the issuer and confirmed in the DER with `openssl asn1parse`. `manifest.json` reports it verbatim and that is correct: this directory states what a certificate contains. Normalising it would publish a subject that does not match the DER. Documented in `countries/mx/README.md` so it is not "fixed" later. The `sha256` is authoritative and unaffected.

### Notes
- Not published. `package.json` is still at 1.3.0. These entries move under a version heading when the next release is cut.

## [1.3.0] - 2026-07-23

### Trust store
- **Chile**: 51 national PKI CAs promoted to `current/`.
- **United States**: 13 FPKI CAs promoted to `current/`.
- **Panama**: 3 national PKI CAs promoted to `current/`.
- **Uruguay**: 1 national PKI CA promoted to `current/`.
- Package description now reads 27 countries across Latin America, North America and the EU/EEA (was 23).

### Added
- `cl`, `pa`, `uy` and `us` wired into the root barrel, the `exports` map and the test suite.

### Changed
- Site documentation now steers browser and client developers to the resolver instead of bundling this package. Bundling the certificate store into a front end is the roughly 1 MB gzipped regression the resolver exists to avoid.

### Fixed
- Hyphenated country codes are aliased to valid JavaScript identifiers in the root barrel, so a code such as `cl-estado` no longer produces an unusable export name.
- **Estonia**: 11 certificate filenames lowercased to match the manifest (was failing the CI drift check).
- **Spain**: the FNMT Usuarios certificate filename lowercased to match the manifest (was failing the CI drift check).

### Notes
- **Chile State PKI (`cl-estado`) is deliberately excluded from this publish.** 712 certificates were staged and promoted in the repository but left out of the npm `exports` map. That hierarchy is served through `did:pki:cl:estado` rather than shipped in the tarball, which keeps the published package from growing by a factor no consumer asked for.

## [1.2.0] - 2026-07-23

### Trust store
- **Spain**: full Trusted List promoted, 139 CAs, sourced through the EU LOTL chain with the national Trusted List's XAdES signature verified.
- **Latvia**: initial trust mirror via the EU LOTL chain, 5 accredited-QTSP CAs.
- Package description now reads 23 countries (was 22).

### Added
- Site: schema.org JSON-LD (`Organization`, `WebSite`, `BreadcrumbList`, `Dataset`), and a total `did:pki` count in the home hero (EN and ES).

### Changed
- Spain tests updated to Trusted List reality. They were written against the earlier FNMT-only snapshot and had gone stale once the full TSL was promoted.
- Country pages list About-panel facts one per line, with notes below, and link the signature standards.

## [1.1.0] - 2026-07-23

The release that turned this from a three-country Latin American bundle into a 22-country directory with a checkable provenance chain. EU and EEA anchors are no longer taken on trust from a download page: they arrive through the European Commission List of Trusted Lists, and each national Trusted List's XAdES signature is verified against a pinned Commission signing certificate before any certificate is promoted.

### Trust store
- **EU and EEA** mirrors promoted through the verified LOTL and XAdES chain: Italy (2 CIE national eID roots, then the full AgID Trusted List of 231 CAs), Greece (105), Germany (101), France (79), Hungary (62), Belgium (52), Austria (39), Czechia (34), Netherlands (30), Portugal (30), Poland (29), Norway (26), Estonia (5 roots plus 11 qualified issuing CAs), Finland (12), Lithuania (11), Sweden (8), Denmark (5).
- **Spain**: FNMT trust anchors.
- **Peru**: promoted, with a Peru Trusted List adapter.
- **Costa Rica**: February 2026 CA generation, SINPE Persona Fisica and Persona Juridica v2, valid 2026 to 2034.
- **GLEIF vLEI** organizational-identity root of trust (ATT-1068): the GLEIF root and GEDA pinned distinctly, plus the QVI list, under a new `anchors/` category.
- Package description now reads 22 countries across Latin America and the EU/EEA.

### Added
- **EU LOTL adapter**: fans out across all of the roughly 31 national Trusted Lists reachable from the Commission List of Trusted Lists.
- **TSL XAdES verification layer**: a `verifyXadesSignature` primitive, exact-identity signer authorization (certificate, SKI or subject), `NextUpdate` freshness enforcement, a granted-status allowlist, and a `current/` reconcile step that archives removals and refuses an empty result set. The Commission LOTL signing certificate is pinned as a trust anchor. `verify-eu-tsl` orchestrates verify, filter, reconcile and report.
- **Root-certificate monitors** for Chile, Chile State PKI (`cl-estado`), Panama, Uruguay and the US FPKI. Monitors detect and stage candidates only; promotion stays human-gated, and the trust model for why staging is not trusting is documented.
- **Live directory at trust.attestto.org**: human-readable PKI directory, EN and ES routing with full Spanish localization (ATT-809), region-grouped country table with a status filter, per-country About panel, certificate endpoints, and a `did:pki` identifier plus resolver link on each certificate page. Consent-gated analytics, sitemap and robots.
- Per-country `meta.json`, `did.json` and revocation snapshots. `ALL_CERTS` and `getBySha256` exports for countries with more than 20 certificates.
- npm packaging: `meta.json`, `did.json` and `anchors/` are now shipped, and all 22 country exports are declared.
- CI: stub-guard step on push and pull request (ATT-504), a `did:pki` coverage test, an `anchors/*/manifest.json` hash-integrity check, and a resolver `/admin/refresh` notification on any `countries/**` change (ATT-1063).

### Changed
- Certificate parsing moved to `node:crypto`, which closes a blind spot on EC certificates the previous parser could not read.
- npm hardening: license unified to Apache-2.0, `types` corrected, `prepublishOnly` added.

### Fixed
- UTF-8 decoding in `refresh-manifest.mjs`, and a broken `npm test` script.
- Manifest regeneration is idempotent, with an OU or O name fallback when a CN is absent (SOC-90).
- The CI drift check reads the per-country `countries/*/current` manifests rather than a single root manifest (SOC-90).
- `did:pki` mappings regenerated with period-free normalization, which made 8 countries fully resolvable.
- Certificate filenames are guaranteed unique when several certificates share a subject CN.
- Estonia and Spain manifest filename casing.
- `node-forge` added as a missing devDependency (CI could not run without it).

### Notes
- These three entries were backfilled from git history on 2026-08-06, after the changelog was found to have stopped at 1.0.0 while the package shipped 1.3.0. Counts are the CA counts stated in each promotion commit; per-release certificate totals were never recorded, so the country counts above come from the `package.json` description at each release commit and are the reliable figure.
- The `v1.1.0` git tag sits on the Latvia commit (`8bcc94d`), which landed after the 1.1.0 version bump (`74ca9fe`) and actually shipped in 1.2.0. The tag therefore does not mark the published 1.1.0 tree. Recorded here rather than rewritten.
- Two commits in this range could not be attributed to a user-visible change from the diff and the commit message alone, and are deliberately not described: `898f2c2` ("ci: nudge verify run") and `5329724`, a site toolchain bump (esbuild, Astro 7, Node 22 CI) whose only consumer-facing effect is on the directory site, not the package.

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
