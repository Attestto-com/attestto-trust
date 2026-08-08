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

## Known upstream quirk — do not "fix" this

The SAT subordinate CA certificates (`ac-sat-ac6.pem`, `ac-sat-ac7.pem`) carry
**double-encoded UTF-8 in their own subject fields**. This is baked into the DER by
the issuer; it is not a defect in this repository's tooling.

```
$ openssl x509 -in current/ac-sat-ac6.pem -noout -subject -nameopt utf8
subject=CN=A.C. del Servicio de AdministraciÃ³n Tributaria,
        O=Servicio de AdministraciÃ³n Tributaria,
        ST=Ciudad de MÃ©xico, L=CuauhtÃ©moc, ...

$ openssl asn1parse -in current/ac-sat-ac6.pem | grep Administraci
368:d=5 hl=2 l=49 prim: UTF8STRING :A.C. del Servicio de AdministraciÃ³n Tributaria
```

The raw bytes are `Administraci\C3\83\C2\B3n` — the UTF-8 encoding of `Ã³`, which is
itself `ó` already encoded once. openssl, node-forge (after the single
binary-string re-decode in `scripts/refresh-manifest.mjs`) and @peculiar/x509 all
independently produce the same string.

`manifest.json` therefore reports `AdministraciÃ³n`, and that is **correct**: this
directory's purpose is to state what a certificate actually contains. Normalising
the subject to `Administración` would publish a name that does not match the DER,
in the one artefact whose value is fidelity to it. The `sha256` is authoritative
and is unaffected either way.

Verified 2026-08-07 while checking issue #9. It looks exactly like an encoding bug
in our parsers, and the "fix" is a one-line change — which is why it is documented
here rather than left to be rediscovered.
