# GLEIF vLEI Root of Trust — Source Provenance

This is a **mirror**. Attestto is not a Qualified vLEI Issuer (QVI) and does not issue or endorse vLEI credentials. GLEIF is the authoritative source of truth for all values in this directory.

## Capture date

2026-07-23

---

## Root AID (`root-aid.json`)

| Field | Value |
|---|---|
| GLEIF Root AID | `EDP1vHcw_wc4M__Fj53-cJaBnZZASd-aMTaSyWEQ-PC2` |
| Source — primary | `https://gleif-it.github.io/.well-known/index.json` (GLEIF-IT GitHub Pages, `aids["GLEIF RoOT"]`, updated 2025-11-14) |
| Source — secondary | `WebOfTrust/vLEI` repo, `samples/oobis/.well-known/index.json`, commit `743622abc9a3b3684552e439efc5c8b6fda2f645` |
| GitHub org | `GLEIF-IT` (https://github.com/GLEIF-IT) |
| Witnesses | 10 witness AIDs from `GLEIF-IT/GLEIF-IT.github.io/.well-known/index.json` `witnesses` map, commit `d4e4a95a6d93bcc0efdf60f3b4f8a20ea3d5a46b` |
| `keyStateDigest` | `null` — GLEIF does not publish a KEL digest in their public well-known resources |

The Root AID appears under the key `"GLEIF RoOT"` in GLEIF-IT's own GitHub Pages well-known file. The same AID appears in `WebOfTrust/vLEI` (a repo maintained under GLEIF's technical umbrella), confirming cross-source consistency. An older AID (`EC1m0ZF6ez1xoM8-jQsIbT5I3GpYnX4Zzh4om8_V1bnU`) appears in an earlier `vlei-server/templates/configmap.yaml` in the same repo; the well-known file (updated 2025-11-14) supersedes it.

---

## QVI List (`qvis.json`)

| Field | Value |
|---|---|
| Source URL | https://www.gleif.org/en/organizational-identity/get-a-vlei-list-of-qualified-vlei-issuing-organizations |
| Capture date | 2026-07-23 |
| QVI count | 8 |

GLEIF does not publish QVI operational AIDs (KERI prefixes) alongside the public QVI list page. All `aid` fields are therefore `null`. The LEI is the stable public identifier for each QVI. QVI AIDs are established during the GLEIF vLEI issuance ceremony and are resolvable via GLEIF's witness network once a QVI begins issuing credentials.

---

## How to re-verify

### Root AID

1. Fetch `https://gleif-it.github.io/.well-known/index.json` directly from GLEIF-IT's GitHub Pages.
2. Confirm the value at `aids["GLEIF RoOT"]` matches `EDP1vHcw_wc4M__Fj53-cJaBnZZASd-aMTaSyWEQ-PC2`.
3. Cross-check via the `WebOfTrust/vLEI` repo: `gh api -H "Accept: application/vnd.github.raw" repos/WebOfTrust/vLEI/contents/samples/oobis/.well-known/index.json` and confirm `aids["GLEIF RoOT"]`.
4. Optionally resolve the AID against GLEIF's witness OOBIs (e.g. `http://5.161.69.25:5623/oobi/EDP1vHcw_wc4M__Fj53-cJaBnZZASd-aMTaSyWEQ-PC2/witness`) using a KERI-compatible client (keripy, signify-ts).

### QVI list

1. Visit https://www.gleif.org/en/organizational-identity/get-a-vlei-list-of-qualified-vlei-issuing-organizations.
2. Compare each QVI's legal name and LEI against the entries in `qvis.json`.
3. LEI format is `^[A-Z0-9]{18}[0-9]{2}$` per ISO 17442.

---

## Disclaimer

Attestto operates as a verifier and trust-anchor mirror. We are not affiliated with GLEIF, are not a QVI, and do not modify the published data. Re-run this capture periodically (GLEIF adds new QVIs as they qualify) and on any GLEIF announcement of a Root AID rotation.
