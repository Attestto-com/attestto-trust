# Mexico (mx) — national e.firma / CSD trust anchors

National hierarchy for Mexico's **e.firma (FIEL)** and **Certificado de Sello
Digital (CSD)** infrastructure.

- **Root:** AGENCIA REGISTRADORA CENTRAL (ARC), `O=BANCO DE MEXICO` — operated by
  Banco de México's *Infraestructura Extendida de Seguridad (IES)*. Two
  currently-valid self-signed generations are mirrored:
  - ARC5 — RSA-4096, valid to 2034
  - ARC6 — RSA-4096, valid to 2039
- **Issuing CAs (SAT):** the *Servicio de Administración Tributaria* operates the
  subordinate CAs that grant e.firma / CSD to taxpayers:
  - AC5 — valid to 2027 (chains to ARC5)
  - AC6 — valid to 2031 (chains to ARC6)
  - AC7 — valid to 2031 (chains to ARC6)

## Provenance

Certificates were promoted from the SAT's official production bundle
`Cert_Prod.zip`
(`http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Cert_Prod.zip`).
Chains were cross-verified locally with `openssl verify` (AC5→ARC5;
AC6, AC7→ARC6; roots self-signed). Expired generations (ARC0–ARC4 / AC0–AC4)
and OCSP-responder certs in the bundle are intentionally excluded from
`current/`. See `VERIFICATION.md`.

## Usage

```js
import { mx } from '@attestto/trust'
mx.ALL_CERTS            // [{ name, exportName, pem }]
```
