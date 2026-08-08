# Chile (cl) — accredited-provider PKI trust anchors

Chile's **accredited-provider** electronic-signature ecosystem under Ley 19.799
(2002). The Entidad Acreditadora (Ministerio de Economía) accredits ~13
independent Prestadores de Servicios de Certificación, each with its own root
and intermediate CAs.

> Chile's separate **State PKI** is tracked under [`cl-estado`](../cl-estado/).

- **51 distinct certificates** — 17 self-signed roots + 34 intermediates —
  from E-CertChile, Acepta, E-Sign, CertiNet, E-Partners, IDok, Thomas Signe,
  Abancert, firmaDOX, e-Digital, Microsystem, Certificadora del Sur, and
  Trust Service Provider SpA (Firma.Digital).

## Provenance

Downloaded and extracted over HTTPS from the Entidad Acreditadora's official
"certificados raíz e intermedios" page
(`https://www.entidadacreditadora.gob.cl/certificados-raiz/`) by the `cl`
monitor (`scripts/monitors/sources/cl.mjs`), which is human-gated per
`docs/specs/2026-07-20-cl-root-cert-monitor-design.md`. Promoted from the
`staging/2026-07-20/` snapshot. See `VERIFICATION.md`.

**Known gaps:** two providers publish `.rar` bundles the monitor cannot extract
(E-Cert 2010, Paperless), tracked in the monitor's persistent known-gaps block.

## Usage

This is a high-volume country: no per-cert named consts.

```js
import { cl } from '@attestto/trust'
cl.ALL_CERTS                    // [{ name, exportName, pem, sha256 }]
cl.getBySha256('<hex>')         // lookup by fingerprint
```
