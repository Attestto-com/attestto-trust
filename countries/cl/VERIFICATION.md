# Verification — Chile (cl), accredited-provider PKI

**Promoted:** 2026-07-23 · **Staging snapshot:** `staging/2026-07-20/`
**Model:** direct-cert (Strategy A per `scripts/monitors/PROMOTION.md`)

## Source

- **Authority:** Entidad Acreditadora — Ministerio de Economía, Fomento y Turismo
- **Fetched over HTTPS** from the official "certificados raíz e intermedios" page:
  `https://www.entidadacreditadora.gob.cl/certificados-raiz/` (per-provider ZIP bundles)
- **Source page TLS fingerprint (SHA-256):** `b108bb2b4267e2488e3ebe2d214fb072abad5551899061e1748644b32f9d5047`
- **Monitor:** `scripts/monitors/sources/cl.mjs`, human-gated, designed in
  `docs/specs/2026-07-20-cl-root-cert-monitor-design.md`

## Trust basis

Direct-cert source. The Entidad Acreditadora publishes the actual root and
intermediate certificates of the ~13 accredited providers. Promotion trust rests
on **HTTPS + the recorded TLS fingerprint** of the entidadacreditadora.gob.cl
origin and the human-gated monitor design.

## Inventory

- **51 distinct certificates** (deduped by SHA-256): **17 self-signed roots** +
  **34 intermediates**. RSA-2048 / RSA-4096.

### Roots (independently cross-checkable against each provider's own site)

| Provider root | SHA-256 | Key | Valid to |
|---|---|---|---|
| ABANCERT CA ROOT - G2 | `2e5be0412fbe2f8f448b2d17da2f3d14eda0a1abd2bd9b3b26889e66cd203f49` | RSA-4096 | 2041-09-09 |
| Acepta.com Raiz G3 | `f5be1abaf8a220b91acbeec029ebd5bb682bf39320283ceea7f6405fd1a4c30d` | RSA-2048 | 2034-06-19 |
| Acepta.com Raiz G4 | `17712bcdb91d85581cb9df15bbb33dd08b4144de35ddc8b24bb0fc1920ab1720` | RSA-2048 | 2036-06-21 |
| Acepta.com Raiz V2 | `2125b4e5eace9b6d0c599e1bf798a5bb78dc3509eb0999ca089d201967f1deaa` | RSA-2048 | 2030-08-09 |
| Signapis Raiz | `d4a1b2d80fc9446e38e0888a0c0cd999b2fbb8e2dba29621d3e795fe64ebc0a7` | RSA-2048 | 2032-06-20 |
| BPO IDOK ROOT CA | `80de81e6e592f8bf2d864703b1c1c09f009ae0c9d47599ee18920b796a38e73a` | RSA-2048 | 2037-08-16 |
| Certificadora del Sur Root CA-C3 | `0de5188f6c02be6834075cc907be9e0cbc918d6f7889bb4a0955a6476b3e987e` | RSA-2048 | 2043-10-25 |
| E-CERTCHILE CA ROOT 02 | `6a7eae4df235e3260f9b6ac1fa42dbcacfd29f08522a2d3aac552f1fd0be8120` | RSA-4096 | 2030-11-15 |
| E-CERTCHILE ROOT CA | `d37f97b91297afc92213963aed3976aa1f7a56229187ddd28d1d824dadc24c2f` | RSA-2048 | 2030-05-27 |
| Esign CA Class 3 Root CA | `9f8966470cf4e26796a0e309963fcf937d3660155f2239c18d8e1e737d49ba22` | RSA-2048 | 2033-09-12 |
| Firma.Digital Raiz G2 (TSP SpA) | `8b619c1bf220ddd009b8a869cebf42d9fa2b8a9666637a5a4f70cd66f902273c` | RSA-4096 | 2051-03-11 |
| firmaDOX FEA ROOT | `cef5633b43651e2a52aa5fd7792c545250d1d748dff3922bb003e3b69b2fc82a` | RSA-2048 | 2037-12-15 |
| Microsystem Root CA - P1 | `34d9aaeb29f7ac428da39aebb21fc30dcbb550d7cf305cec123aa5a050aa369c` | RSA-4096 | 2042-12-31 |
| PAPERLESS ROOT CA | `33a0be2b3f6aabc8c107f5f0d4eb9ae8d33dff13fedefff53a1166e04bd0f3f2` | RSA-2048 | 2047-04-12 |
| Thomas Signe Chile Root | `e32607c478f9a4e53bc30a876394363040491a29d9bdf74b47b363fb0c322b5e` | RSA-4096 | 2044-10-12 |
| Thomas Signe Root | `2afd2192f866377330985c52aaa7eba4817a73a13782b2ac4188a65e311158bc` | RSA-4096 | 2038-03-14 |
| VeriSign Class 2 Public Primary CA - G3 | `92a9d9833fe1944db366e8bfae7a95b6480c2d6c6c2a1be65d4236b608fca1bb` | RSA-2048 | 2036-07-16 |

## Notes

- **Known gaps:** two providers publish `.rar` bundles the monitor cannot
  extract (E-Cert 2010, Paperless); tracked in the monitor's known-gaps block.
- No machine-verified signed list for this source (Chile's accredited model is
  not an ETSI TS 119 612 signed list); trust is origin-HTTPS-based.
