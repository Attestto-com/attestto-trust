# GLEIF vLEI Root of Trust — Source Provenance

This is a **mirror**. Attestto is not a Qualified vLEI Issuer (QVI) and does not issue or endorse vLEI credentials. GLEIF is the authoritative source of truth for all values in this directory.

## Capture date

2026-07-23

---

## Trust chain (`root-aid.json`)

The vLEI trust chain is: **GLEIF Root of Trust -> GEDA (GLEIF External Delegated AID) -> QVI -> Legal Entity**. Two distinct GLEIF AIDs sit at the top; phase-1 captured only the Root. Both are now pinned distinctly.

### GLEIF Root of Trust

| Field | Value |
|---|---|
| GLEIF Root AID (`rootAid` / `aid`) | `EDP1vHcw_wc4M__Fj53-cJaBnZZASd-aMTaSyWEQ-PC2` |
| Role | Top of the vLEI chain — the GLEIF Root of Trust (GAR-controlled). Self-certifying inception (`icp`, `s:0`, no delegator). |
| Source — primary | `https://gleif-it.github.io/.well-known/index.json` (GLEIF-IT GitHub Pages, `aids["GLEIF RoOT"]`, updated 2025-11-14) |
| Source — secondary | `WebOfTrust/vLEI` repo, `samples/oobis/.well-known/index.json`, commit `743622abc9a3b3684552e439efc5c8b6fda2f645` |
| Cryptographic confirmation | In `GLEIF-IT/vlei-verifier` `src/root_of_trust_oobis/gleif_external.json` (commit `1abdc5c74af9c0523acf705c6c6fe0587d38981a`, 2024-12-16) the embedded KEL shows `EDP1vHcw…-PC2` as an `icp` event (`t:"icp"`, `s:"0"`), i.e. the self-certifying root with no `di` (delegator). |

### GEDA — GLEIF External Delegated AID

| Field | Value |
|---|---|
| GEDA AID (`geda`) | `EINmHd5g7iV-UldkkkKyBIH052bIyxZNBn9pq-zNrYoS` |
| Role | The GLEIF External Delegated AID — delegated by the Root, issues Qualified vLEI Issuer (QVI) credentials. Second link in the chain. |
| Source — primary | `https://gleif-it.github.io/.well-known/index.json` (`aids["GLEIF External"]`, updated 2025-11-14) |
| Cryptographic confirmation | Same KEL in `GLEIF-IT/vlei-verifier` `src/root_of_trust_oobis/gleif_external.json` (commit `1abdc5c74af9c0523acf705c6c6fe0587d38981a`): `EINmHd5g…-zNrYoS` is a delegated inception (`t:"dip"`, `s:"0"`) whose `di` field = `EDP1vHcw…-PC2` (the Root). The Root's `s:1` rotation anchors the delegation seal `{"i":"EINmHd5g…","s":"0","d":"EINmHd5g…"}`. |
| Semantic confirmation | `GLEIF-IT/qvi-software` `qvi-workflow/sig_ts_wallets/src/qars/qars-resolve-geda-and-le-oobis.ts` documents GEDA = "GLEIF External Delegated AID" as the delegator the QARs resolve before LE credential issuance. |

**Confirmation of the phase-1 question:** `EDP1vHcw…-PC2` **is** the Root of Trust (the `icp`), and `EINmHd5g…-zNrYoS` **is** the GEDA (the `dip` delegated by the Root) — NOT vice versa. Phase-1 pinned the Root correctly under `aid`; it was simply missing the GEDA.

The label `"GLEIF External"` in the well-known file corresponds to the GEDA. A third AID `"GLEIF Internal"` (`EFcrtYzHx11TElxDmEDx355zm7nJhbmdcIluw7UMbUIL`) is the GLEIF Internal Delegated AID (GIDA), also delegated by the Root (`di` = Root in its `dip`); it is not part of the external QVI-issuance chain and is not pinned here. An older Root AID (`EC1m0ZF6ez1xoM8-jQsIbT5I3GpYnX4Zzh4om8_V1bnU`) appears in an earlier `vlei-server/templates/configmap.yaml`; the well-known file (updated 2025-11-14) supersedes it.

### Witnesses & key state

| Field | Value |
|---|---|
| Witnesses | 10 witness AIDs from `gleif-it.github.io/.well-known/index.json` `witnesses` map (updated 2025-11-14) |
| `keyStateDigest` | `null` — GLEIF does not publish a KEL digest in their public well-known resources |

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
2. Confirm `aids["GLEIF RoOT"]` matches `EDP1vHcw_wc4M__Fj53-cJaBnZZASd-aMTaSyWEQ-PC2` (the Root) and `aids["GLEIF External"]` matches `EINmHd5g7iV-UldkkkKyBIH052bIyxZNBn9pq-zNrYoS` (the GEDA).
3. Cross-check via the `WebOfTrust/vLEI` repo: `gh api -H "Accept: application/vnd.github.raw" repos/WebOfTrust/vLEI/contents/samples/oobis/.well-known/index.json`.
4. Confirm the delegation cryptographically: `gh api -H "Accept: application/vnd.github.raw" repos/GLEIF-IT/vlei-verifier/contents/src/root_of_trust_oobis/gleif_external.json` — the embedded KEL shows `EDP1vHcw…-PC2` as `icp` (root) and `EINmHd5g…-zNrYoS` as `dip` with `di` = `EDP1vHcw…-PC2`.
5. Optionally resolve the AIDs against GLEIF's witness OOBIs using a KERI-compatible client (keripy, signify-ts).

### QVI list

1. Visit https://www.gleif.org/en/organizational-identity/get-a-vlei-list-of-qualified-vlei-issuing-organizations.
2. Compare each QVI's legal name and LEI against the entries in `qvis.json`.
3. LEI format is `^[A-Z0-9]{18}[0-9]{2}$` per ISO 17442.

---

## Disclaimer

Attestto operates as a verifier and trust-anchor mirror. We are not affiliated with GLEIF, are not a QVI, and do not modify the published data. Re-run this capture periodically (GLEIF adds new QVIs as they qualify) and on any GLEIF announcement of a Root AID rotation.
