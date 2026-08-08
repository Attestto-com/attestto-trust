# Uruguay (uy) — national PKI trust anchor

Single national root operated by **AGESIC**'s Unidad de Certificación
Electrónica, under Ley 18.600 (2009).

- **Root:** Autoridad Certificadora Raíz Nacional de Uruguay (self-signed, RSA-4096, valid to 2031)

Accredited subordinate CAs chain to this root and validate themselves at
verification time; only the national root is promoted here.

## Provenance

Fetched directly over HTTPS from AGESIC's official ACRN endpoint
(`https://www.agesic.gub.uy/acrn/acrn.cer`) by the `uy` monitor
(`scripts/monitors/sources/uy.mjs`). Promoted from the `staging/2026-07-20/`
snapshot. See `VERIFICATION.md`.

## Usage

```js
import { uy } from '@attestto/trust'
uy.ALL_CERTS
```
