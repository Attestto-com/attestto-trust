# United States (us) — Federal PKI trust anchors

The **US Federal PKI**, governed by the FPKI Common Policy Framework and
operated by the Federal PKI Management Authority (GSA).

- **Trust root:** Federal Common Policy CA G2 (FCPCA G2, self-signed, RSA-4096, valid to 2040)
- **Subordinate / cross-certified set (12):** Federal Bridge CA G4, Entrust
  Managed PKI Federal Root CA G2, DigiCert Federal SSP Intermediate CA G5/G6,
  WidePoint/ORC SSP intermediates, Department of the Treasury, and the
  U.S. Department of State AD Root CA.

All certificates chain up to FCPCA G2 and validate themselves at verification
time.

## Provenance

FCPCA G2 fetched directly over HTTPS from the official FPKI repository
(`https://repo.fpki.gov/fcpca/fcpcag2.crt`); the subordinate set is extracted
from the `caCertsIssuedByfcpcag2.p7c` bundle published alongside it. Sourced by
the `us` monitor (`scripts/monitors/sources/us.mjs`), promoted from
`staging/2026-07-21/`. See `VERIFICATION.md`.

## Usage

```js
import { us } from '@attestto/trust'
us.ALL_CERTS
```
