# Costa Rica — Firma Digital trust mirror

Independent mirror of the X.509 hierarchy that anchors Costa Rica's national Firma Digital, operated by **MICITT** (root) and **BCCR/SINPE** (issuing CAs).

Official source (often broken): <https://www.firmadigital.go.cr/Repositorio/>

## Hierarchy (2026-04)

```
CA RAIZ NACIONAL - COSTA RICA v2                    ← root (MICITT)
├── CA POLITICA PERSONA FISICA - COSTA RICA v2      ← natural persons branch
│   └── CA SINPE - PERSONA FISICA v2                ← issuing CA
│       └── (cédula-bound natural-person certs)
└── CA POLITICA PERSONA JURIDICA - COSTA RICA v2    ← legal persons branch
    └── CA SINPE - PERSONA JURIDICA v2              ← issuing CA
        └── BANCO CENTRAL DE COSTA RICA (AGENTE ELECTRONICO)
            └── (legal-person certs)
```

See [`current/manifest.json`](current/manifest.json) for SHA-256, subject, issuer, and validity for each file.

## Notes

- The official MICITT/BCCR repository serves the JURIDICA branch but **404s** the PERSONA FÍSICA `.crt` URLs at the time of writing — that's the gap this mirror fills.
- **Why this country isn't a live monitor (unlike cl/pe/uy/pa):** the official verification portal (`firmadigital.go.cr`) serves its own HTTPS using a certificate issued by `CA SINPE - PERSONA JURIDICA v2` — Costa Rica's own Firma Digital PKI, the very hierarchy being mirrored here — instead of a browser-trusted commercial CA. No default TLS trust store (browsers, curl, Node) accepts that chain, so an automated HTTPS-only fetch (per this repo's security model — see `scripts/monitors/README.md`) can't reach it. Confirmed 2026-07-20: `openssl s_client` shows `issuer=...CN=CA SINPE - PERSONA JURIDICA v2`; `curl` fails with "unable to get local issuer certificate". This is almost certainly why the repository is "often broken" for anyone fetching it programmatically — it's a bootstrapping problem, not a flaky server.
- Certificates here were extracted from real signed PDFs using `scripts/extract-chain-from-pdf.mjs` (PAdES sigs embed the full chain) — this sidesteps the TLS trust problem entirely since it never needs to fetch from the untrusted portal.
- The root and both policy CAs expire **2031-02-25**. The SINPE issuing CAs and the BCCR Agente Electrónico cert rotate more frequently — when they do, follow the [Updating](../../README.md#updating-an-existing-country) flow in the top-level README.
