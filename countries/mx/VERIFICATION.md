# Verification — Mexico (mx)

**Promoted:** 2026-07-24 · **Model:** direct-cert (Strategy A per `scripts/monitors/PROMOTION.md`)

## Source

- **Authority:** Banco de México — Infraestructura Extendida de Seguridad (IES) /
  Agencia Registradora Central (ARC), national root; **SAT — Servicio de
  Administración Tributaria**, subordinate issuing CAs for e.firma / CSD.
- **Fetched** from the SAT official production certificate bundle:
  `http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Cert_Prod.zip`
  (HTTP 200, 37 863 bytes; ZIP `Cert_Prod/` containing `ARC*_IES` roots and
  `AC*_SAT` / `AC7` issuing CAs).
- **Transport note:** the SAT `omawww.sat.gob.mx` origin serves this bundle over
  **HTTP only** (no HTTPS listener). Trust therefore does not rest on transport
  TLS; instead each promoted certificate was independently validated by
  **cryptographic chain verification** (below), which is stronger than
  origin-HTTPS for a direct-cert source.

## Trust basis — cryptographic chain verification

Every promoted certificate was verified locally with `openssl verify`:

| Cert | Role | Result |
|---|---|---|
| ARC5 (`agencia-registradora-central-arc5.pem`) | root | self-signed OK |
| ARC6 (`agencia-registradora-central-arc6.pem`) | root | self-signed OK |
| AC5 (`ac-sat-ac5.pem`) | issuing CA | chains to ARC5 — OK |
| AC6 (`ac-sat-ac6.pem`) | issuing CA | chains to ARC6 — OK |
| AC7 (`ac-sat-ac7.pem`) | issuing CA | chains to ARC6 — OK |

## Root / CA anchors (independently cross-checkable SHA-256)

| Cert | SHA-256 | Key | Valid to |
|---|---|---|---|
| ARC5 — AGENCIA REGISTRADORA CENTRAL (BANCO DE MEXICO) | `cbf3e084a86cac5ef1060b9242196eec15e8786931ffff05466ba7becd43b15e` | RSA-4096 | 2034-12-03 |
| ARC6 — AGENCIA REGISTRADORA CENTRAL (BANCO DE MEXICO) | `a86baf49b2e91d0141722c4e7026ab246183a8072926e9983edbd4e5ba72515d` | RSA-4096 | 2039-03-17 |
| AC5 — AUTORIDAD CERTIFICADORA (SAT) | `1ac6325143920fc047b6506e42540944fa6590b44560807b564c5603d15add8e` | RSA-4096 | 2027-05-03 |
| AC6 — A.C. del Servicio de Administración Tributaria | `054e8f213ff2228254d8f87ec43d2e7c2eda628d927c270b9a77d1d09eef9418` | RSA-4096 | 2031-03-24 |
| AC7 — AC DEL SERVICIO DE ADMINISTRACION TRIBUTARIA | `6d1d1f871f0d69233fc94526fecf826bee67181782d6b7e5320b279c97e8dac7` | RSA-4096 | 2031-05-23 |

## Excluded from `current/`

The production bundle also ships items that are intentionally **not** promoted:

- **Expired roots/CAs:** ARC0/ARC1 (ARC Banxico, ≤2016), ARC2/ARC3/ARC4
  (expired 2026-07-20), and AC0–AC4 SAT (≤2023).
- **Duplicates:** `ARC7_IES.crt` is byte-identical to `ARC6_IES.crt` (same
  SHA-256 and serial) — only one copy (ARC6) is kept. `AC5_SAT.cer` /
  `AC5_SAT.crt` are the same cert in DER/PEM form.
- **OCSP responder certs:** `ocsp.ac*`, `OCSP.AC6_SAT`, `OCSP7` are end-entity
  responder certificates, not trust anchors.

## Upstream data quirk

The **AC6** certificate carries a **mis-encoded (double-UTF-8) common name** in
its issued bytes: the `UTF8STRING` subject `CN` decodes to
`A.C. del Servicio de AdministraciÃ³n Tributaria` (the accented "ó" was
double-encoded by the issuer). The `manifest.json` reproduces those exact bytes
faithfully rather than "correcting" them, preserving the tamper-evidence
contract (the SHA-256 is taken over the real DER of the `.pem` on disk).

## Notes

No machine-verified ETSI TS 119 612 signed list was reachable at promotion time
(`https://www.cloudb.sat.gob.mx/TSP_MX.xml` returned 302→503). A future pass may
cross-check the root fingerprints against that signed list once it is reachable.
