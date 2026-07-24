# Chile — State PKI (cl-estado)

Chile's **State PKI** (distinct from the accredited-provider model tracked under
[`cl`](../cl/)). A single national hierarchy operated for the Estado de Chile.

- **712 distinct certificates** — 2 self-signed roots
  (Autoridad Certificadora del Estado de Chile G1 + G2) anchoring 710
  per-organismo intermediate CAs (one or more Firma Electrónica Avanzada CAs
  per ministry, state university, regional government, and public service).

## Provenance

Downloaded and extracted over HTTPS by the `cl-estado` monitor
(`scripts/monitors/sources/cl-estado.mjs`, human-gated). Promoted from the
`staging/2026-07-21/` snapshot. See `VERIFICATION.md`.

## did:pki note

No `did.json` is published for this directory. `did:pki` requires a two-letter
country segment (`did:pki:<cc>:...`), which the `cl-estado` pseudo-code does not
satisfy, so no syntactically valid DID can be derived. The certificates remain
fully usable via `ALL_CERTS` / `getBySha256`.

## Usage

High-volume country: no per-cert named consts.

```js
import * as clEstado from '@attestto/trust/cl-estado'
clEstado.ALL_CERTS              // [{ name, exportName, pem, sha256 }]
clEstado.getBySha256('<hex>')   // lookup by fingerprint
```
