# Root-cert monitors

Daily-cron-ready scripts that detect changes to a country's published
trust-anchor sources, download and extract candidate certs, and stage
them for manual review. They never write to `countries/<iso2>/current/`
— see the design spec for the full architecture and rationale:
[`docs/superpowers/specs/2026-07-20-cl-root-cert-monitor-design.md`](../../docs/superpowers/specs/2026-07-20-cl-root-cert-monitor-design.md).

```
node scripts/monitors/run.mjs <iso2>
```

## Country status

| Country | Adapter | Status | Shape |
|---|---|---|---|
| Chile | `sources/cl.mjs` | ✅ built | ~13 CAs, HTML page of zip/rar bundle links |
| Peru | `sources/pe.mjs` | ✅ built | Single ETSI TSL XML, ~30 TSPs inline |
| Uruguay | `sources/uy.mjs` | ✅ built | Single direct root `.cer` file |
| Panama | `sources/pa.mjs` | ✅ built | 3 direct cert files (root + 2 issuing CAs) |
| Ecuador | — | ❌ not viable | ARCOTEL's accredited-entity page is a compliance status table (17 CA names + approval columns) — zero downloadable cert links. No single aggregator; would need one adapter per CA's own site, same problem as Colombia. |
| Colombia | — | ❌ not viable | ONAC only accredits individual CAs (Certicámara, Camerfirma, GSE, etc.); no single national root or aggregator page. |
| Mexico | — | ❌ blocked (infra, not architecture) | SAT's root bundle ZIP (`Cert_Prod.zip`) is real and reachable, but only over plain HTTP — `omawww.sat.gob.mx` (the legacy SharePoint/IIS7.5 subdomain hosting it) doesn't accept TLS connections on port 443 at all (handshake never starts, connection times out). SAT's *main* domain (`www.sat.gob.mx`) has perfectly normal, GlobalSign-issued HTTPS — this is a dead legacy subdomain, not a PKI trust problem. Would need either an HTTPS-served copy of the same file elsewhere on SAT's modern infrastructure (not found yet) or a deliberate decision to accept HTTP for this one source, which this repo's HTTPS-only rule currently doesn't allow. |

## Why Costa Rica/Brazil/Argentina aren't live-monitored

`cr`/`br`/`ar` predate this monitor framework and were built by hand
(`scripts/extract-chain-from-pdf.mjs` for CR, direct download for br/ar).
Costa Rica specifically **can't** be added as a live monitor without
changing this repo's security posture: `firmadigital.go.cr` serves its
own HTTPS using a certificate issued by its own Firma Digital PKI (`CA
SINPE - PERSONA JURIDICA v2`) rather than a browser/OS-trusted commercial
CA. No default TLS trust store accepts that chain, so an automated
HTTPS-only fetch can't reach it — see `countries/cr/README.md` for the
confirmed details. This is likely the actual reason the official
repository is described there as "often broken."

## Known TLS-trust classes found while researching this

Two genuinely different failure modes look similar from the outside but
require different responses:

- **Self-issued/untrusted chain** (Costa Rica): TLS works, but the
  certificate presented isn't in any default trust store because it was
  issued by the very PKI being mirrored. A chicken-and-egg bootstrapping
  problem — no amount of retrying fixes it; you'd have to either hardcode
  trust for that one root (defeats the point of `curl`/Node validating
  anything) or use an out-of-band source (which is what CR's PDF
  extraction already does).
- **No TLS listener at all** (Mexico's `omawww.sat.gob.mx`): the specific
  subdomain hosting the file was simply never migrated to HTTPS while the
  rest of the organization's infrastructure has. Potentially fixable by
  finding the same file served from the modern domain, or by the
  organization eventually consolidating their legacy subdomain.
