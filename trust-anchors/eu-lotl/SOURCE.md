# EC LOTL Signing Certificate — Trust Anchor

## Provenance

| Field | Value |
|---|---|
| Source URL | https://ec.europa.eu/tools/lotl/eu-lotl.xml |
| Retrieval date | 2026-07-23 |
| Extracted from | `tests/fixtures/eu-lotl.signed.xml` (committed fixture, captured 2026-07-23) |

## Certificate identity

| Field | Value |
|---|---|
| Subject | `C=LU, OU=Certificate Profile - Qualified Certificate - Organization, OU=Directorate-General for Digital Services (DIGIT), 2.5.4.97=LEIXG-254900ZNYA1FLUQ9U393, O=EUROPEAN COMMISSION, E=digit-dmo@ec.europa.eu, CN=EUROPEAN COMMISSION` |
| SHA-256 fingerprint | `e0a620fbb6747362bb933ac44169d676a553444716cf5f31605f12a22b8396b1` |

## Manual cross-check instruction

Confirm this fingerprint against the EC's LOTL signing-certificate publication in the Official Journal (OJEU C-series) before trusting. Refresh when the Commission rotates the LOTL signing certificate (the run fails loudly if this anchor is stale).

## Extraction note

The LOTL XML embeds multiple `<X509Certificate>` elements. The first element in the fixture is a personal signatory cert (Patrick Kremer / DIGIT). The LOTL machine-signing cert is the second element (`index 1`), identified by `CN=EUROPEAN COMMISSION, O=EUROPEAN COMMISSION, OU=Directorate-General for Digital Services (DIGIT)`. The extraction script in `.superpowers/sdd/task-6-brief.md` was adjusted to select index 1 accordingly.
