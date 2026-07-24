# Panama (pa) — national PKI trust anchors

Single national hierarchy operated by the **DNFE (Dirección Nacional de Firma
Electrónica)** at the Registro Público de Panamá, under Ley 51 de 2008.

- **Root:** AUTORIDAD CERTIFICADORA DE PANAMA (self-signed, RSA-4096, valid to 2053)
- **Subordinate CAs:** CA DE GOBIERNO DE PANAMA, CA PANAMA CLASE 2

## Provenance

Certificates fetched directly over HTTPS from the DNFE's official cacerts
repository (`https://www.firmaelectronica.gob.pa/cacerts/`) by the `pa` monitor
(`scripts/monitors/sources/pa.mjs`). Promoted from the `staging/2026-07-20/`
snapshot. See `VERIFICATION.md`.

## Usage

```js
import { pa } from '@attestto/trust'
pa.ALL_CERTS            // [{ name, exportName, pem }]
```
